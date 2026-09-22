import { sameJid } from '../../lib/utils.js'

const CREATOR_JID = '12602764655@s.whatsapp.net'

export default {
  command: ['restirarsub'],
  category: 'owner',
  isOwner: true,

  run: async ({ client, m }) => {
    if (!sameJid(m.sender, CREATOR_JID)) {
      return m.reply('ꕥ Este comando solo puede ser utilizado por el creador principal.')
    }

    if (!m.isGroup) {
      return m.reply('ꕥ Este comando solo puede utilizarse dentro de un grupo.')
    }

    try {
      await m.reply('He recibido órdenes del creador. Me retiraré de este grupo.')
      await client.groupLeave(m.chat)
    } catch (error) {
      console.error('Error al ejecutar restirarsub:', error)
      await m.reply('❌ No pude retirarme del grupo. Verifica que la sesión siga conectada.')
    }
  },
}