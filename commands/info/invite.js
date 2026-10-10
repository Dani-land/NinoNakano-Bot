import { getBotSettings } from '../../lib/system/initDB.js'

function msToTime(duration) {
  const milliseconds = parseInt((duration % 1000) / 100)
  let seconds = Math.floor((duration / 1000) % 60)
  let minutes = Math.floor((duration / (1000 * 60)) % 60)
  let hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
  hours = hours < 10 ? '0' + hours : hours
  minutes = minutes < 10 ? '0' + minutes : minutes
  seconds = seconds < 10 ? '0' + seconds : seconds
  return `${minutes} Minuto(s) ${seconds} Segundo(s)`
}

const linkRegex = /chat\.whatsapp\.com\/([0-9A-Za-z]{20,24})(?:\s+[0-9]{1,3})?/i

async function getGroupName(client, chatId) {
  try {
    const metadata = await client.groupMetadata(chatId)
    return metadata.subject || 'Grupo desconocido'
  } catch {
    return 'Chat privado'
  }
}

export default {
  command: ['invite', 'invitar'],
  category: 'info',
  run: async ({client, m, args}) => {
    const user = global.db.data.chats[m.chat].users[m.sender]
    const grupo = m.isGroup ? await getGroupName(client, m.chat) : 'Chat privado'

    const botSettings = getBotSettings(client)
    const botname = botSettings.namebot2
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'

    const cooldown = 600000
    const nextTime = user.jointime + cooldown
    if (new Date() - user.jointime < cooldown) {
      return m.reply(
        `ꕥ Espera *${msToTime(nextTime - new Date())}* para volver a enviar otra invitacion.`,
      )
    }

    const link = args.join(' ')
    const match = link.match(linkRegex)
    if (!match || !match[1]) {
      return m.reply('《✧》 El enlace ingresado no es válido o está incompleto.')
    }

    if (!args || !args.length) {
      return m.reply('《✧》 Ingresa el enlace para invitar al bot a tu grupo.')
    }

    const isOficialBot = botId === global.client.user.id.split(':')[0] + '@s.whatsapp.net'
    const isPremiumBot = botSettings?.botprem === true
    const isModBot = botSettings?.botmod === true

    const botType = isOficialBot
      ? 'Principal/Owner'
      : isPremiumBot
        ? 'Premium'
        : isModBot
          ? 'Principal/Mod'
          : 'Sub Bot'

    const sugg = `❀ 𝗦𝗢𝗟𝗜𝗖𝗜𝗧𝗨𝗗 𝗥𝗘𝗖𝗜𝗕𝗜𝗗𝗔

✩ *Usuario ›* ${global.db.data.users[m.sender].name}
✿ *Enlace ›* ${args.join(' ')}
✿ *Chat ›* ${grupo}

➤ 𝗜𝗡𝗙𝗢 𝗕𝗢𝗧
♡ *Socket ›* ${botType}
★ *Nombre ›* ${botname}
❐ *Versión ›* ${version}`

    if (typeof sugg !== 'string' || !sugg.trim()) return

    for (const num of global.mods) {
      const jid = `${num}@s.whatsapp.net`
      try {
        await client.sendMessage(jid, { text: sugg })
      } catch (e) {
        m.reply(`No se pudo enviar a ${jid}.`)
      }
    }

    await client.reply(
      m.chat,
      'ꕥ Enlace de invitación enviado con éxito a los Desarrolladores.',
      m,
    )

    user.jointime = new Date() * 1
  },
};
