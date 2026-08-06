import chalk from 'chalk'
import {
    resolveLidToRealJid,
    normalizeJid,
    sameJid,
} from '../lib/utils.js'

const groupMetadataCache = new Map()
const groupMetadataRequests = new Map()

const CHANNEL_JID = '120363420575743790@newsletter'
const CHANNEL_NAME = 'ミ★ 𝙉𝙞𝙣𝙤 𝙐𝙥𝙙𝙖𝙩𝙚𝙨 ★彡'

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
            const pp = await client.profilePictureUrl(jid, 'image').catch(_ => 'https://d0mwa043ankuvadx.public.blob.vercel-storage.com/nyx/33UYPOQ.jpg')

            if (anu.action === 'add' && chat?.welcome && isPrimary) {
                const caption = `✦ Bienvenido

❀ Usuario › @${phone}
✧ Grupo › ${metadata.subject}
✿ Miembros › ${memberCount}

ꕤ Esperamos que disfrutes tu estancia.

> Usa *#menu* para descubrir todas las funciones disponibles.`
                await client.sendMessage(anu.id, {
                    image: { url: pp },
                    caption: caption,
                    mentions: [mentionJid],
                    ...buildChannelForwardContext(mentionJid, anu.author),
                })
            }

            if ((anu.action === 'remove' || anu.action === 'leave') && chat?.welcome && isPrimary) {
                const caption = `✦ Un miembro se ha despedido

❀ Usuario › @${phone}
✧ Integrantes › ${memberCount}

꒰୨୧꒱ Te deseamos lo mejor.

> Las puertas siempre estarán abiertas para tu regreso.`
                await client.sendMessage(anu.id, {
                    image: { url: pp },
                    caption: caption,
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