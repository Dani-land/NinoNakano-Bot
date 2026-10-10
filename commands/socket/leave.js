import { isSocketOwner } from '../../lib/utils.js'
import { getBotSettings } from '../../lib/system/initDB.js'

export default {
  command: ['leave'],
  category: 'socket',
  run: async ({ client, m, args }) => {
    const settings = getBotSettings(client)
    if (!isSocketOwner(client, m, settings))
      return m.reply(mess.socket)

    const groupId = args[0] || m.chat
    if (!groupId.endsWith('@g.us')) {
      return m.reply('✦ Usa este comando en un grupo o indica el ID de un grupo.')
    }

    try {
      await client.groupLeave(groupId)
    } catch (e) {
      return m.reply(msgglobal)
    }
  },
};
