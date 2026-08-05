export default {
  command: ['dep', 'deposit', 'd'],
  category: 'rpg',

  run: async ({ client, m, args }) => {
    const chatData = global.db.data.chats[m.chat]
    const user = chatData.users[m.sender]
    const idBot = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const settings = global.db.data.settings[idBot]
    const monedas = settings.currency

    if (chatData.adminonly || !chatData.rpg)
      return m.reply(`✦ Los comandos de economía están desactivados en este grupo.`)

    if (!args[0]) {
      return m.reply(
        `✦ Indica la cantidad de *${monedas}* que deseas depositar.\n\n` +
        `> También puedes usar *${prefa}deposit all* para guardar todo tu dinero.`
      )
    }

    if (args[0].toLowerCase() === 'all') {
      if (user.coins <= 0)
        return m.reply(`✧ No tienes *${monedas}* disponibles para depositar.`)

      const count = user.coins
      user.coins = 0
      user.bank += count

      return m.reply(
        `✦ Depósito realizado.\n\n` +
        `❀ Cantidad › *¥${count.toLocaleString()} ${monedas}*\n` +
        `✧ Estado › Tu dinero ahora está protegido en el banco.`
      )
    }

    if (!Number(args[0]) || parseInt(args[0]) < 1) {
      return m.reply(`❀ Ingresa una cantidad válida para depositar.`)
    }

    const count = parseInt(args[0])

    if (user.coins < count) {
      return m.reply(
        `✧ No tienes suficientes *${monedas}* disponibles para realizar ese depósito.`
      )
    }

    user.coins -= count
    user.bank += count

    await m.reply(
      `✦ Depósito realizado.\n\n` +
      `❀ Cantidad › *¥${count.toLocaleString()} ${monedas}*\n` +
      `✧ Banco › El dinero fue guardado correctamente.`
    )
  },
}