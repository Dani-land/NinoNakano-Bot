import { isSocketOwner } from '../../lib/utils.js'
import { getBotSettings } from '../../lib/system/initDB.js'

export default {
  command: ['setchannel', 'setbotchannel'],
  category: 'socket',

  run: async ({client, m, args}) => {
    const config = getBotSettings(client)

    if (!isSocketOwner(client, m, config)) {
      return m.reply(mess.socket)
    }

    const value = args.join(' ').trim()

    if (!value) {
      return m.reply(
`✦ Debes ingresar un enlace o ID de canal.

✧ Ejemplo:
> ${prefa}setchannel https://whatsapp.com/channel/xxxxx`
      )
    }

    let info, channelLink = ''

    if (/@newsletter$/i.test(value)) {
      info = await client.newsletterMetadata("jid", value.trim())
      const invite = info?.invite || info?.thread_metadata?.invite || info?.thread_metadata?.invite_code
      channelLink = invite
        ? /^https?:\/\//i.test(String(invite))
          ? String(invite)
          : `https://whatsapp.com/channel/${invite}`
        : ''

    } else {
      const channelUrl = value.match(
        /(?:https:\/\/)?(?:www\.)?(?:chat\.|wa\.)?whatsapp\.com\/(?:channel\/|joinchat\/)?([0-9A-Za-z]{22,24})/i
      )?.[1]

      if (!channelUrl) {
        return m.reply(
`✦ El enlace o ID del canal no es válido.

✧ Verifica que esté bien escrito.`
        )
      }

      info = await client.newsletterMetadata("invite", channelUrl)
      channelLink = /^https?:\/\//i.test(value)
        ? value
        : `https://${value.replace(/^\/+/, '')}`
    }

    if (!info) {
      return m.reply(
`✦ No se pudo obtener la información del canal.

✧ Intenta nuevamente más tarde.`
      )
    }

    if (!info.id) {
      return m.reply('✦ WhatsApp no devolvió el ID del canal; no se guardaron los cambios.')
    }
    config.id = info.id
    config.nameid = info.thread_metadata?.name?.text || "Canal sin nombre"
    config.link = channelLink

    return m.reply(
`✐ Canal actualizado correctamente.

❍ Canal › *${config.nameid}*
❍ ID › ${config.id}`
    )
  },
};