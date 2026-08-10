import axios from 'axios'

function pickResults(data) {
  return (
    data?.data?.videos ||
    data?.data?.aweme_list ||
    data?.data?.items ||
    data?.videos ||
    []
  )
}

function getVideoUrl(v) {
  return (
    v?.play ||
    v?.play_url ||
    v?.video?.play_addr?.url_list?.[0] ||
    v?.video?.download_addr?.url_list?.[0] ||
    v?.play_addr?.url_list?.[0] ||
    v?.download_addr?.url_list?.[0] ||
    v?.video?.play ||
    null
  )
}

function getAuthor(v) {
  return (
    v?.author?.unique_id ||
    v?.author?.nickname ||
    v?.author?.name ||
    v?.author?.uid ||
    'desconocido'
  )
}

function getTitle(v) {
  const t =
    v?.title ||
    v?.desc ||
    v?.description ||
    'Sin descripción'

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
      const url = `https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(query)}&count=10&cursor=0`

      const { data } = await axios.get(url, {
        timeout: 25000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
          'Referer': 'https://www.tikwm.com/',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      })

      const results = pickResults(data)

      if (!Array.isArray(results) || !results.length) {
        return m.reply(`✘ No encontré resultados para *${query}*`)
      }

      const usable = results
        .map((v) => {
          const videoUrl = getVideoUrl(v)
          return {
            url: videoUrl,
            title: getTitle(v),
            author: getAuthor(v),
            likes: v?.digg_count || v?.like_count || 0,
            views: v?.play_count || v?.view_count || 0
          }
        })
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
      console.log(e)
      m.reply(
        `❌ Error al buscar videos.\n\n${e.message || e}`
      )
    }
  }
}