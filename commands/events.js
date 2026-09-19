import chalk from 'chalk'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import {
    resolveLidToRealJid,
    normalizeJid,
    sameJid,
} from '../lib/utils.js'

const groupMetadataCache = new Map()
const groupMetadataRequests = new Map()

const CHANNEL_JID = '120363420575743790@newsletter'
const CHANNEL_NAME = '❁ N͜͡i͜͡n͜͡o͜͡ N͜͡a͜͡k͜͡a͜͡n͜͡o͜͡ w͜͡a͜͡b͜͡o͜͡t͜͡'
const MEDIA_DIR = path.join(process.cwd(), 'lib', 'media')
const EVENT_TEMPLATES = {
    welcome: {
        file: path.join(MEDIA_DIR, 'welcome.png'),
        // Posición del círculo de avatar en la plantilla de bienvenida.
        avatar: { left: 963, top: 394, size: 194 },
    },
    goodbye: {
        file: path.join(MEDIA_DIR, 'goodbye.png'),
        // Posición del círculo de avatar en la plantilla de despedida.
        avatar: { left: 963, top: 423, size: 194 },
    },
}

function cleanDisplayName(value) {
    return String(value || '')
        .replace(/^@+/, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 80)
}

async function getParticipantName(client, participant, jid, phone) {
    const contact = client.contacts?.[jid] || {}
    const knownName = [
        participant.notify,
        participant.name,
        participant.pushName,
        contact.name,
        contact.notify,
        contact.verifiedName,
    ]
        .map(cleanDisplayName)
        .find((name) => name && name !== phone && !/^\+?[\d\s()-]+$/.test(name))

    if (knownName) return knownName

    if (typeof client.getName === 'function') {
        try {
            const name = cleanDisplayName(await client.getName(jid, true))
            if (name && name !== phone) return name
        } catch {}
    }

    return phone || 'usuario'
}

async function downloadProfilePicture(client, jid) {
    try {
        const url = await client.profilePictureUrl(jid, 'image')
        if (!url) return null
        const response = await fetch(url)
        if (!response.ok) return null
        return Buffer.from(await response.arrayBuffer())
    } catch {
        return null
    }
}

async function renderEventImage(client, template, jid) {
    let templateBuffer
    try {
        templateBuffer = await fs.promises.readFile(template.file)
    } catch (error) {
        console.error(`[ EVENT IMAGE ERROR ] No se encontró ${template.file}:`, error.message)
        return null
    }

    const profilePicture = await downloadProfilePicture(client, jid)
    if (!profilePicture) return templateBuffer

    try {
        const { left, top, size } = template.avatar
        const circleMask = Buffer.from(
            `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
            `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/>` +
            `</svg>`,
        )
        const avatar = await sharp(profilePicture)
            .resize(size, size, { fit: 'cover' })
            .composite([{ input: circleMask, blend: 'dest-in' }])
            .png()
            .toBuffer()

        return await sharp(templateBuffer)
            .composite([{ input: avatar, left, top }])
            .png()
            .toBuffer()
    } catch (error) {
        console.error('[ EVENT IMAGE ERROR ] No se pudo colocar el avatar:', error.message)
        return templateBuffer
    }
}

function buildChannelForwardContext(mentionJid, authorJid) {
    return {
        contextInfo: {
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: CHANNEL_JID,
                serverMessageId: '0',
                newsletterName: CHANNEL_NAME,
            },
            mentionedJid: [mentionJid, authorJid].filter(Boolean),
        },
    }
}

async function getGroupMetadata(client, groupId) {
    const cached = groupMetadataCache.get(groupId)
    if (cached && Date.now() - cached.timestamp < 60 * 1000) {
        return cached.metadata
    }

    if (groupMetadataRequests.has(groupId)) {
        return groupMetadataRequests.get(groupId)
    }

    const request = Promise.race([
        client.groupMetadata(groupId).catch(() => null),
        new Promise((resolve) => setTimeout(() => resolve(null), 8000)),
    ]).then((metadata) => {
        if (metadata) {
            groupMetadataCache.set(groupId, {
                metadata,
                timestamp: Date.now(),
            })
        }
        return metadata || (cached && cached.metadata) || null
    }).finally(() => {
        groupMetadataRequests.delete(groupId)
    })

    groupMetadataRequests.set(groupId, request)
    return request
}

export const participantsUpdate = async (client, anu) => {
    try {
        if (!anu?.id || !anu.id.endsWith('@g.us')) return

        // group-participants.update puede llegar antes que el primer mensaje
        // del grupo. En ese caso initDB aún no creó esta entrada.
        if (!global.db.data.chats[anu.id]) {
            global.db.data.chats[anu.id] = {}
        }
        const chat = global.db.data.chats[anu.id]
        if (typeof chat.welcome !== 'boolean') chat.welcome = true
        if (typeof chat.alerts !== 'boolean') chat.alerts = true

        // En grupos grandes groupMetadata puede tardar o fallar. El caché
        // deduplica las consultas y permite continuar con datos mínimos.
        const metadata = await getGroupMetadata(client, anu.id) || {
            subject: 'este grupo',
            participants: [],
        }
        const botId = normalizeJid(client.user.id)
        const primaryBotId = chat?.primaryBot
        const isPrimary = !primaryBotId || sameJid(primaryBotId, botId)

        // Baileys antiguo entrega strings; las versiones nuevas pueden
        // entregar objetos con id/lid/phoneNumber.
        const entries = Array.isArray(anu.participants) ? anu.participants : []
        const metadataCount = metadata.participants.length
        const memberCount = metadataCount > 0 ? metadataCount : entries.length

        for (const entry of entries) {
            const participant = typeof entry === 'string' ? { id: entry } : (entry || {})
            const originalJid = participant.id || participant.lid || participant.phoneNumber
            if (!originalJid) continue

            let jid = await resolveLidToRealJid(originalJid, client, anu.id)
            if (jid?.endsWith('@lid') && participant.phoneNumber) {
                jid = participant.phoneNumber
            }

            const mentionJid = jid || originalJid
            const phone = mentionJid.split('@')[0]
            const displayName = await getParticipantName(client, participant, mentionJid, phone)

            if (anu.action === 'add' && chat?.welcome && isPrimary) {
                const image = await renderEventImage(client, EVENT_TEMPLATES.welcome, mentionJid)
                const caption = `ᰔᩚ Bienvenido

❀ Usuario › @${displayName}
ꕤ Grupo › ${metadata.subject}
𖨆 Miembros › ${memberCount}

❤︎ Esᴘᴇʀᴇᴍᴏs ᴅɪsғʀᴜᴛᴇs ᴛᴜ ᴇsᴛᴀɴᴄɪᴀ.

> Usa *#menu* para descubrir todas las funciones disponibles.`
                await client.sendMessage(anu.id, {
                    ...(image ? { image, caption } : { text: caption }),
                    mentions: [mentionJid],
                    ...buildChannelForwardContext(mentionJid, anu.author),
                })
            }

            if ((anu.action === 'remove' || anu.action === 'leave') && chat?.welcome && isPrimary) {
                const image = await renderEventImage(client, EVENT_TEMPLATES.goodbye, mentionJid)
                const caption = `(ᗒᗣᗕ)՞ Un miembro se ha despedido

❀ Usuario › @${displayName}
ꕤ Integrantes › ${memberCount}

☁︎ ᴛᴇ ᴅᴇsᴇᴀᴍᴏs ʟᴏ ᴍᴇᴊᴏʀ.

> ☹︎ 𝙴𝚜𝚙𝚎𝚛𝚎𝚖𝚘𝚜 𝚢 𝚟𝚞𝚎𝚕𝚟𝚊𝚜.`
                await client.sendMessage(anu.id, {
                    ...(image ? { image, caption } : { text: caption }),
                    mentions: [mentionJid],
                    ...buildChannelForwardContext(mentionJid, anu.author),
                })
            }

            if (anu.action === 'promote' && chat?.alerts && isPrimary) {
                const usuario = anu.author
                await client.sendMessage(anu.id, {
                    text: `✧ @${phone} ha sido promovido a *Administrador* por @${usuario?.split('@')[0] || 'Sistema'}.`,
                    mentions: [jid, usuario].filter(Boolean)
                })
            }

            if (anu.action === 'demote' && chat?.alerts && isPrimary) {
                const usuario = anu.author
                await client.sendMessage(anu.id, {
                    text: `✧ @${phone} ha sido degradado de *Administrador* por @${usuario?.split('@')[0] || 'Sistema'}.`,
                    mentions: [jid, usuario].filter(Boolean)
                })
            }
        }
    } catch (err) {
        console.log(chalk.gray(`[ EVENT ERROR ]  → ${err}`))
    }
}