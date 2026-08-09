import fs from 'fs';
import path from 'path';
import ws from 'ws';
import { fileURLToPath } from 'url';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default {
  command: ['bots', 'sockets'],
  category: 'socket',

  run: async ({client, m}) => {
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const bot = global.db.data.settings[botId]

    const botname2 = bot.namebot2

    const from = m.key.remoteJid

    const groupMetadata = m.isGroup
      ? await client.groupMetadata(from).catch(() => {})
      : ''

    const groupParticipants =
      groupMetadata?.participants?.map(
        (p) => p.id
      ) || []

    const mainBotJid =
      global.client.user.id.split(':')[0] + '@s.whatsapp.net'

    const isMainBotInGroup =
      groupParticipants.includes(mainBotJid)

    const basePath = path.join(dirname, '../../Sessions')

    const folders = {
      Subs: 'Subs',
    }

    const getBotsFromFolder = (folderName) => {
      const folderPath = path.join(basePath, folderName)

      if (!fs.existsSync(folderPath)) return []

      return fs
        .readdirSync(folderPath)
        .filter((dir) => {
          const credsPath = path.join(folderPath, dir, 'creds.json')
          return fs.existsSync(credsPath)
        })
        .map((id) => id.replace(/\D/g, ''))
    }

    const subs = getBotsFromFolder(folders.Subs)

    const categorizedBots = {
      Owner: [],
      Sub: [],
    }

    const mentionedJid = []

    const formatBot = (number) => {
      const jid = number + '@s.whatsapp.net'

      if (!groupParticipants.includes(jid)) return null

      mentionedJid.push(jid)

      const data = global.db.data.settings[jid]
      const name = data?.namebot2 || 'Bot'
      const handle = `@${number}`

      return `✧ *${name}* — ${handle}`
    }

    if (global.db.data.settings[mainBotJid]) {
      const name = global.db.data.settings[mainBotJid].namebot2
      const handle = `@${mainBotJid.split('@')[0]}`

      if (isMainBotInGroup) {
        mentionedJid.push(mainBotJid)
        categorizedBots.Owner.push(`✧ *${name}* — ${handle}`)
      }
    }

    subs.forEach((num) => {
      const line = formatBot(num)
      if (line) categorizedBots.Sub.push(line)
    })

    const totalCounts = {
      Owner: global.db.data.settings[mainBotJid] ? 1 : 0,
      Sub: subs.length,
    }

    const totalBots = totalCounts.Owner + totalCounts.Sub
    const totalInGroup = categorizedBots.Owner.length + categorizedBots.Sub.length

    let message = `❀ · · ─── · · ❀\n`
    message += `   *${botname2}*\n`
    message += `   𝗦𝗼𝗰𝗸𝗲𝘁𝘀 𝗔𝗰𝘁𝗶𝘃𝗼𝘀\n`
    message += `❀ · · ─── · · ❀\n\n`

    message += `Total de bots ﹕*${totalBots}*\n`
    message += `En este grupo ﹕*${totalInGroup}*\n`
    message += `Principales ﹕*${totalCounts.Owner}*\n`
    message += `Sub bots ﹕*${totalCounts.Sub}*\n\n`

    if (categorizedBots.Owner.length) {
      message += `*── 𝐎𝐖𝐍𝐄𝐑 𝐁𝐎𝐓𝐒 ──*\n`
      message += categorizedBots.Owner.join('\n')
      message += `\n\n`
    }

    if (categorizedBots.Sub.length) {
      message += `*── 𝐒𝐔𝐁 𝐁𝐎𝐓𝐒 ──*\n`
      message += categorizedBots.Sub.join('\n')
    }

    await client.sendContextInfoIndex(
      m.chat,
      message,
      {},
      m,
      true,
      mentionedJid
    )
  },
};