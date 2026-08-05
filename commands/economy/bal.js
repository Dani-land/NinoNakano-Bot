import { resolveLidToRealJid } from "../../lib/utils.js"

export default {
  command: ['balance', 'bal'],
  category: 'rpg',
  run: async ({ client, m, args }) => {
    const db = global.db.data
    const chatId = m.chat
    const chatData = db.chats[chatId]
    const botId = client.user.id.split(':')[0] + "@s.whatsapp.net"
    const botSettings = db.settings[botId]
    const monedas = botSettings.currency

    if (chatData.adminonly || !chatData.rpg)
      return m.reply(`✎ Estos comandos estan desactivados en este chat.`)

    const mentioned = m.mentionedJid
    const who2 = mentioned.length > 0 ? mentioned[0] : (m.quoted ? m.quoted.sender : m.sender)
    const who = await resolveLidToRealJid(who2, client, m.chat)

    if (!chatData.users?.[who2])
      return m.reply(`ꕥ El usuario mencionado no está registrado en mi base de datos.`)

    const user = chatData.users[who]
    const total = (user.coins || 0) + (user.bank || 0)

    const bal = `✦ Balance

꒰୨୧꒱ Usuario › <${global.db.data.users[who].name}>
꒰୨୧꒱ Coins › ¥${user.coins?.toLocaleString() || 0} ${monedas}
꒰୨୧꒱ Banco › ¥${user.bank?.toLocaleString() || 0} ${monedas}
꒰୨୧꒱ Total › ¥${total.toLocaleString()} ${monedas}

꒰୨୧꒱ Consejo › Deposita usando ${prefa}deposit`

    await client.sendMessage(chatId, { text: bal }, { quoted: m })
  }
}