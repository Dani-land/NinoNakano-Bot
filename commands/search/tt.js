import axios from 'axios'

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

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

function getCover(v) {
  return (
    v?.cover ||
    v?.origin_cover ||
    v?.video?.cover?.url_list?.[0] ||
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
            cover: getCover(v),
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

      const top = usable.slice(0, 5)

      const cards = top.map((v, i) => ({
        header: {
          title: `${i + 1}. ${v.title}`,
          hasMediaAttachment: true,
          imageMessage: v.cover ? { url: v.cover } : undefined,
          videoMessage: !v.cover ? { url: v.url } : undefined
        },
        body: {
          text: `♡ @${v.author}\n♡ ${formatCount(v.likes)} Likes  •  ▶ ${formatCount(v.views)} Views`
        },
        nativeFlowMessage: {
          buttons: [
            {
              name: 'cta_url',
              buttonParamsJson: JSON.stringify({
                display_text: 'Ver / Descargar',
                url: v.url
              })
            }
          ]
        }
      }))

      try {
        await client.sendMessage(
          m.chat,
          {
            interactiveMessage: {
              body: { text: `*✿ Resultados de TikTok*\n✧ Búsqueda › ${query}` },
              footer: { text: 'ꕥ Toca una tarjeta para ver el video' },
              carouselMessage: { cards }
            }
          },
          { quoted: m }
        )
      } catch (carouselError) {
        console.log('Carrusel falló, usando envío normal:', carouselError)

        const header = `
*✿ Resultados de TikTok*
✧ Búsqueda › ${query}
✧ Enviando ${top.length} videos...
`.trim()

        await client.sendMessage(m.chat, { text: header }, { quoted: m })

        for (let i = 0; i < top.length; i++) {
          const v = top[i]

          const caption = `
*ꕥ TikTok Búsqueda*
⌗» ${i + 1}. ${v.title}
♡ @${v.author}
♡ ${formatCount(v.likes)} Likes  •  ▶ ${formatCount(v.views)} Views
`.trim()

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

          await sleep(1200)
        }
      }

      const extra = usable.slice(5, 7)
      if (extra.length) {
        const listText = extra.map((v, i) => {
          return (
            `*${i + 6}.* ${v.title}\n` +
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