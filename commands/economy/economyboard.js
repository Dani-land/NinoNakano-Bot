import { resolveLidToRealJid } from '../../lib/utils.js'

export default {
  command: ['economyboard', 'eboard', 'baltop'],
  category: 'rpg',

  run: async ({ client, m, args }) => {
    const db = global.db.data
    const chatId = m.chat
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const botSettings = db.settings[botId]
    const monedas = botSettings.currency

    const chatData = db.chats[chatId]

    if (chatData.adminonly || !chatData.rpg)
      return m.reply(`✦ Los comandos de economía están desactivados en este grupo.`)

    try {
      const users = Object.entries(chatData.users || {})
        .filter(([_, data]) => {
          const total = (data.coins || 0) + (data.bank || 0)
          return total >= 1000
        })
        .map(([key, data]) => ({
          jid: key,
          coins: data.coins || 0,
          bank: data.bank || 0
        }))

      if (users.length === 0)
        return m.reply(`✧ Aún no hay usuarios con al menos *1,000 ${monedas}*.`)

      const sorted = users.sort(
        (a, b) => (b.coins + b.bank) - (a.coins + a.bank)
      )

      const page = parseInt(args[0]) || 1
      const pageSize = 10
      const totalPages = Math.ceil(sorted.length / pageSize)

      if (page < 1 || page > totalPages)
        return m.reply(
          `❀ La página *${page}* no existe.\n` +
          `✦ Páginas disponibles › *${totalPages}*`
        )

      const start = (page - 1) * pageSize
      const end = start + pageSize

      let text = `✦ Ranking de Economía\n\n`

      const mentions = []

      const topUsers = await Promise.all(
        sorted.slice(start, end).map(async (user, i) => {
          const realJid = await resolveLidToRealJid(user.jid, client, chatId)
          const total = user.coins + user.bank

          const globalUser = db.users?.[realJid] || {}
          const name = globalUser.name || realJid.split('@')[0]

          return (
            `❀ ${start + i + 1} › *${name}*\n` +
            `✧ Total › *¥${total.toLocaleString()} ${monedas}*`
          )
        })
      )

      text += topUsers.join('\n\n')

      text += `\n\n✦ Página › *${page}/${totalPages}*`

      if (page < totalPages) {
        text += `\n❀ Siguiente › *${prefa || '/'}economyboard ${page + 1}*`
      }

      await client.sendMessage(
        chatId,
        { text, mentions },
        { quoted: m }
      )
    } catch (e) {
      console.log(e)
      await m.reply(`✧ Ocurrió un error al obtener el ranking.`)
    }
  }
}