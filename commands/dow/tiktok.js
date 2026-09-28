import fetch from 'node-fetch'

const DLAPIXY_TT_URL = 'https://dlapixy.vercel.app/api/downloads/tiktok'

export default {
  command: ['tiktok', 'tt'],
  category: 'downloader',

  run: async ({ client, m, args }) => {
    if (!args.length || !args[0].includes('tiktok.com')) {
      return m.reply(
        `✎ Ingresa algún *URL* válido de TikTok.\n\nEjemplo: *#tiktok* https://vt.tiktok.com/...`
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

      if (!videoUrl) {
        return m.reply('ꕥ No se pudo obtener el video. Verifica que el enlace sea público.')
      }

      const caption = `TIKTOK ᗪOᗯᑎᒪOᗩᗪᗴᖇ

> *⌫ 𝙳𝚎𝚜𝚌𝚛𝚒𝚙𝚌𝚒𝚘𝚗:* ${json.title || 'Sin descripción'}
> *⏱ 𝙳𝚞𝚛𝚊𝚌𝚒𝚘𝚗:* ${json.durationSeconds ? `${json.durationSeconds}s` : 'Desconocida'}

⌗» ᑭᖇO᙭Y: Dlapixy`

      await client.sendMessage(
        m.chat,
        {
          video: { url: videoUrl },
          caption,
        },
        { quoted: m }
      )
    } catch (e) {
      console.log('[tiktok]', e.message)
      await m.reply('ꕥ El servicio no está disponible en este momento.')
    }
  },
}
