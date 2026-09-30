import fetch from 'node-fetch'
import { replyWithCommandIcon } from '../../lib/commandPreview.js'

const DLAPIXY_TT_URL = 'https://dlapixy.vercel.app/api/downloads/tiktok'

export default {
  command: ['tiktok', 'tt'],
  category: 'downloader',

  run: async ({ client, m, args }) => {
    if (!args.length || !args[0].includes('tiktok.com')) {
      return replyWithCommandIcon(
        client,
        m,
        `✎ Ingresa algún *URL* válido de TikTok.\n\nEjemplo: *#tiktok* https://vt.tiktok.com/...`,
        { icon: 'square' }
      )
    }

    const url = args[0]

    try {
      const apiUrl = `${DLAPIXY_TT_URL}?url=${encodeURIComponent(url)}`
      const res = await fetch(apiUrl)
      const text = await res.text()

      if (!res.ok) {
        throw new Error(`Dlapixy HTTP ${res.status}: ${text.slice(0, 200)}`)
      }

      let json
      try {
        json = JSON.parse(text)
      } catch {
        throw new Error(`Respuesta inválida de Dlapixy: ${text.slice(0, 200)}`)
      }

      if (!json?.ok) {
        throw new Error(json?.message || 'La API no devolvió un resultado válido.')
      }

      const files = Array.isArray(json?.files) ? json.files : []
      const videoFile = files.find((f) => f.kind === 'video')
      const videoUrl = videoFile?.url

      const caption = `TIKTOK ᗪOᗯᑎᒪOᗩᗪᗴᖇ

> *⌫ 𝙳𝚎𝚜𝚌𝚛𝚒𝚙𝚌𝚒𝚘𝚗:* ${json.title || 'Sin descripción'}
> *⏱ 𝙳𝚞𝚛𝚊𝚌𝚒𝚘𝚗:* ${json.durationSeconds ? `${json.durationSeconds}s` : 'Desconocida'}

⌗» ᑭᖇO᙭Y: https://dlapixy.vercel.app`

      // ── Video normal ──────────────────────────────────────────────────────
      if (videoUrl) {
        await client.sendMessage(
          m.chat,
          {
            video: { url: videoUrl },
            caption,
          },
          { quoted: m }
        )
        return
      }

      // ── Post de imágenes (mediaType: "image") ───────────────────────────────
      const imageUrls = Array.isArray(json?.imageUrls) && json.imageUrls.length
        ? json.imageUrls
        : (json?.imageUrl ? [json.imageUrl] : [])

      if (imageUrls.length) {
        if (imageUrls.length === 1) {
          await client.sendMessage(
            m.chat,
            {
              image: { url: imageUrls[0] },
              caption,
            },
            { quoted: m }
          )
        } else {
          const albumItems = imageUrls.map((u, i) => ({
            image: { url: u },
            caption: i === 0 ? caption : undefined,
          }))

          await client.sendMessage(
            m.chat,
            { album: albumItems },
            { quoted: m }
          )
        }
        return
      }

      return m.reply('ꕥ No se pudo obtener el video ni las imágenes. Verifica que el enlace sea público.')
    } catch (e) {
      console.log('[tiktok]', e.message)
      await m.reply('ꕥ El servicio no está disponible en este momento.')
    }
  },
}
