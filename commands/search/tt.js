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
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json'
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

      const medias = top.map((v, i) => ({
        type: 'video',
        data: { url: v.url },
        caption:
          `*ꕥ TikTok Búsqueda*\n` +
          `⌗» ${i + 1}. ${v.title}\n` +
          `♡ @${v.author}\n` +
          `♡ ${formatCount(v.likes)} Likes  •  ▶ ${formatCount(v.views)} Views`
      }))

      await client.sendAlbumMessage(m.chat, medias, { quoted: m })

      const extra = usable.slice(7, 9)
      if (extra.length) {
        const listText = extra.map((v, i) => {
          return (
            `*${i + 8}.* ${v.title}\n` +
            `@${v.author}\n` +
            `♡ ${formatCount(v.likes)} Likes  •  ▶ ${formatCount(v.views)} Views\n` +
            `${v.url}`
          )
        }).join('\n\n')

        await client.sendMessage(
          m.chat,
          { text: `✦ Más resultados\n\n${listText}` },
          { quoted: m }
        )
      }

    } catch (e) {
      console.log(e)
      m.reply(
        `❌ Error al buscar videos.\n\n${e.message || e}`
      )
    }
  }
}