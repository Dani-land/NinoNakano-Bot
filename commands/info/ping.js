import { getBotSettings } from '../../lib/system/initDB.js'

export default {
  command: ['ping', 'p'],
  category: 'info',
  run: async ({client, m}) => {
    const botSettings = getBotSettings(client)
    const start = Date.now()
    const sent = await client.sendMessage(m.chat, { text: '`🌾 Calculando`' + `\n> *${botSettings.namebot}*`}, { quoted: m })
    const latency = Date.now() - start

    await client.sendMessage(m.chat, {
      text: `🏓 *Pong!*\n> Tiempo » ${latency}ms`,
      edit: sent.key
    }, { quoted: m })
  },
};