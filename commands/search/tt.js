import axios from 'axios'

function pickResults(data) {
  return data?.data?.videos || []
}

function getVideoUrl(v) {
  return v?.play || v?.wmplay || v?.hdplay || null
}

function getAuthor(v) {
  return v?.author?.unique_id || v?.author?.nickname || 'desconocido'
}

function getTitle(v) {
  const t = v?.title || 'Sin descripción'
  return t.length > 80 ? t.slice(0, 80) + '...' : t
}

function formatCount(n) {
  const num = Number(n || 0)
  if (Number.isNaN(num)) return '0'
  return num.toLocaleString()
}

export default {
  command: ['tiktoksearch', 'ttsearch', 'tts'],
  category: 'search',

  run: async ({ client, m, args }) => {
    if (!args.length) {
      return m.reply('✧ Ingresa algo para buscar en TikTok.')
    }

    const query = args.join(' ').trim()

    try {
      const url = `https://www.tikwm.com/api/feed/search`

      const { data, status } = await axios.get(url, {
        params: {
          keywords: query,
          count: 10,
          cursor: 0,
          hd: 1
        },
        timeout: 25000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Referer': 'https://www.tikwm.com/',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      })

      console.log('[tiktoksearch] HTTP status:', status, '| code:', data?.code)
      console.log('[tiktoksearch] respuesta cruda:', JSON.stringify(data).slice(0, 1500))

      const results = pickResults(data)

      if (!Array.isArray(results) || !results.length) {
        return m.reply(
          `✘ No encontré resultados para *${query}*\n\n(revisa la consola de tu bot: busca "[tiktoksearch] respuesta cruda" para ver qué devolvió la API)`
        )
      }

      const usable = results
        .map((v) => ({
          url: getVideoUrl(v),
          title: getTitle(v),
          author: getAuthor(v),
          likes: v?.digg_count || 0,
          views: v?.play_count || 0
        }))
        .filter(v => v.url)

      if (!usable.length) {
        return m.reply(`✘ Encontré resultados, pero no pude obtener los enlaces de video para *${query}*`)
      }

      const top = usable.slice(0, 7)

      for (let i = 0; i < top.length; i++) {
        const v = top[i]

        const caption =
          `*ꕥ TikTok Búsqueda*\n` +
          `⌗» ${i + 1}. ${v.title}\n` +
          `♡ @${v.author}\n` +
          `♡ ${formatCount(v.likes)} Likes  •  ▶ ${formatCount(v.views)} Views`

        try {
          await client.sendMessage(
            m.chat,
            { video: { url: v.url }, caption },
            { quoted: m }
          )
        } catch {
          await client.sendMessage(
            m.chat,
            { text: `${caption}\n\n${v.url}` },
            { quoted: m }
          )
        }
      }

    } catch (e) {
      console.log('[tiktoksearch] ERROR:', e?.response?.status, e?.response?.data || e.message)
      m.reply(`❌ Error al buscar videos.\n\n${e.message || e}`)
    }
  }
}
