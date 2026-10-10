import { getBotSettings } from '../../lib/system/initDB.js'

export default {
  command: ['bot'],
  category: 'grupo',
  isAdmin: true,
  run: async ({client, m, args}) => {
    const botname = getBotSettings(client).namebot2
    const chat = global.db.data.chats[m.chat]
    const estado = chat.bannedGrupo ?? false

    if (args[0] === 'off' || args[0] === 'banchat') {
      if (estado) return m.reply('《✧》 El *Bot* ya estaba *desactivado* en este grupo.')
      chat.bannedGrupo = true
      return m.reply(`『✐』 Has *Desactivado* a *${botname}* en este grupo.`)
    }

    if (args[0] === 'on') {
      if (!estado) return m.reply(`《✧》 *${botname}* ya estaba *activado* en este grupo.`)
      chat.bannedGrupo = false
      return m.reply(`『✐』 Has *Activado* a *${botname}* en este grupo.`)
    }

    return m.reply(
      `*✿ Estado de ${botname} (⁠•⁠‿⁠•⁠)*\nꕥ *Actual ›* ${estado ? '✗ Desactivado' : '✓ Activado'}\n\n✎ Puedes cambiarlo con:\n> ● _Activar ›_ *bot on*\n> ● _Desactivar ›_ *bot off* o *bot banchat*`,
    )
  },
};
