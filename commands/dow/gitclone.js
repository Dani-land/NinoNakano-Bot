import fetch from 'node-fetch'
import { getBotSettings } from '../../lib/system/initDB.js'

let regex = /(?:https|git)(?::\/\/|@)github\.com[\/:]([^\/:]+)\/(.+)/i
export default {
  command: ['gitclone'],
  category: 'downloader',
  run: async ({client, m, usedPrefix, command, args}) => {
const botSettings = getBotSettings(client)

const botname = botSettings.namebot
const icon = botSettings.icon || botSettings.banner
const channelContext = {
  contextInfo: {
    forwardingScore: 1,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: botSettings.id,
      newsletterName: botSettings.nameid,
      serverMessageId: -1,
    },
  },
}
  if (!args[0]) {
    return client.reply(m.chat, `✐ Escribe el URL de algún repositorio de GitHub que quieras descargar.`, m, channelContext)
  }
  if (!regex.test(args[0])) {
    return client.reply(m.chat, `ꕥ Verifica que el *URL* sea realmente de GitHub`, m, channelContext)
  }
  let [_, user, repo] = args[0].match(regex) || []
  let sanitizedRepo = repo.replace(/.git$/, '')
  let repoUrl = `https://api.github.com/repos/${user}/${sanitizedRepo}`
  let zipUrl = `https://api.github.com/repos/${user}/${sanitizedRepo}/zipball`
      await client.sendMessage(m.chat, { react: { text: '💥', key: m.key } })
  try {
  await client.reply(m.chat, "Espera un momento se está procesando...", m, {
  contextInfo: { externalAdReply :{ mediaUrl: null, mediaType: 1, showAdAttribution: true,
  title: botname,
  body: botSettings.namebot2,
  previewType: 0, thumbnailUrl: icon,
  sourceUrl: botSettings.link }}})
    let [repoResponse, zipResponse] = await Promise.all([
      fetch(repoUrl),
      fetch(zipUrl),
    ])
    let repoData = await repoResponse.json()
    let filename = zipResponse.headers.get('content-disposition')?.match(/filename="?([^"]+)"?/i)?.[1] || `${sanitizedRepo}.zip`
    let img = botSettings.icon || botSettings.banner
    let txt = `*乂 G I T H U B - D O W N L O A D 乂*\n\n`
       txt += `✩  *Nombre* : ${sanitizedRepo}\n`
       txt += `✩  *Repositorio* : ${user}/${sanitizedRepo}\n`
       txt += `✩  *Creador* : ${repoData.owner.login}\n`
       txt += `✩  *Descripción* : ${repoData.description || 'Sin descripción disponible'}\n`
       txt += `✩  *Url* : ${args[0]}\n\n`
        txt += `*${botSettings.namebot2}*`

await client.sendFile(m.chat, img, 'thumbnail.jpg', txt, m, null, channelContext)
await client.sendFile(m.chat, await zipResponse.buffer(), filename, null, m)
  } catch {
m.reply('Error.')
  }
}}