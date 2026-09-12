import fs from 'fs'

export default {
  command: ['sticker', 's'],
  category: 'utils',

  run: async ({ client, m }) => {
    try {
      const user = global.db.data.users[m.sender]
      const user2 = global.db.data.chats[m.chat].users[m.sender]

      const text1 = user.metadatos || '☾︎❤︎☽︎ 𝐍𝐈𝐍𝐎 𝐍𝐀𝐊𝐀𝐍𝐎 𝐖𝐀𝐁𝐎𝐓'
      const text2 = user.metadatos2 || `𝚂𝚝𝚒𝚌𝚔𝚎𝚛 𝚙𝚎𝚍𝚒𝚍𝚘 𝚙𝚘𝚛: @${user.name}`

      const q = m.quoted || m
      const mime = (q.msg || q).mimetype || ''

      if (!/image|video/.test(mime)) {
        return m.reply(
          '✐ Responde o envía una imagen o video para crear un sticker.'
        )
      }

      const media = await q.download()
      let enc

      if (/image/.test(mime)) {
        enc = await client.sendImageAsSticker(
          m.chat,
          media,
          m,
          {
            packname: text1,
            author: text2
          }
        )
      } else if (/video/.test(mime)) {

        if ((q.msg || q).seconds > 20) {
          return m.reply(
            '✘ El video es demasiado largo.\n> Máximo permitido: 20 segundos.'
          )
        }

        enc = await client.sendVideoAsSticker(
          m.chat,
          media,
          m,
          {
            packname: text1,
            author: text2
          }
        )
      }

      await fs.unlinkSync(enc)

      await client.sendMessage(m.chat, {
        react: {
          text: '✓',
          key: m.key
        }
      })

    } catch (e) {
      m.reply(`✘ Ocurrió un error.\n\n> ${e}`)
    }
  }
}
