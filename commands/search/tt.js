import axios from 'axios'

const DVYER_API_KEY = 'dvyer2008'
const DVYER_TT_SEARCH = 'https://dv-yer-api.online/tiktok/search'

function formatCount(n) {
  var num = Number(n || 0)
  if (Number.isNaN(num) || n == null) return '0'
  return num.toLocaleString()
}

function getTitle(v) {
  var t = (v && (v.title || v.description)) || 'Sin descripción'
  if (t.length > 80) return t.slice(0, 80) + '...'
  return t
}

function getAuthor(v) {
  if (!v) return 'desconocido'
  return v.username || v.author || 'desconocido'
}

function getVideoUrl(v) {
  if (!v) return null
  return (
    v.download_url ||
    v.stream_url ||
    (v.links && (v.links.download || v.links.stream)) ||
    null
  )
}

export default {
  command: ['tiktoksearch', 'ttsearch', 'tts'],
  category: 'search',

  run: async function (ctx) {
    var client = ctx.client
    var m = ctx.m
    var args = ctx.args || []

    if (!args.length) {
      return m.reply('✧ Ingresa algo para buscar en TikTok.')
    }

    var query = args.join(' ').trim()

    try {
      var searchUrl =
        DVYER_TT_SEARCH +
        '?apikey=' +
        encodeURIComponent(DVYER_API_KEY) +
        '&q=' +
        encodeURIComponent(query)

      var res = await axios.get(searchUrl, {
        timeout: 35000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
      })

      var data = res.data
      var results =
        (data && data.results) ||
        (data && data.result && data.result.results) ||
        []

      if (!data || (data.ok !== true && data.status !== true)) {
        if (!Array.isArray(results) || !results.length) {
          return m.reply('✘ No encontré resultados para *' + query + '*')
        }
      }

      if (!Array.isArray(results) || !results.length) {
        return m.reply('✘ No encontré resultados para *' + query + '*')
      }

      var usable = results
        .map(function (v) {
          return {
            url: getVideoUrl(v),
            title: getTitle(v),
            author: getAuthor(v),
            likes: v.likes,
            views: v.views,
            link: v.share_url || v.video_url || (v.links && v.links.tiktok) || null,
          }
        })
        .filter(function (v) {
          return !!v.url
        })

      if (!usable.length) {
        return m.reply(
          '✘ Encontré resultados, pero no pude obtener los videos para *' + query + '*'
        )
      }

      await m.reply(
        '✐ Encontré *' + results.length + '* resultados. Enviando *' + usable.length + '* videos...'
      )

      var album = usable.map(function (v, idx) {
        var caption =
          '*ꕥ TikTok Búsqueda*\n' +
          '⌗» ' +
          (idx + 1) +
          '. ' +
          v.title +
          '\n' +
          '♡ @' +
          v.author

        if (v.likes != null || v.views != null) {
          caption +=
            '\n♡ ' +
            formatCount(v.likes) +
            ' Likes  •  ▶ ' +
            formatCount(v.views) +
            ' Views'
        }

        return {
          video: { url: v.url },
          caption: caption,
        }
      })

      try {
        await client.sendMessage(m.chat, { album: album }, { quoted: m })
      } catch (albumErr) {
        console.log('[tiktoksearch] album falló, enviando uno por uno:', albumErr.message)
        for (var j = 0; j < usable.length; j++) {
          var v = usable[j]
          var caption =
            '*ꕥ TikTok Búsqueda*\n' +
            '⌗» ' +
            (j + 1) +
            '. ' +
            v.title +
            '\n' +
            '♡ @' +
            v.author

          if (v.likes != null || v.views != null) {
            caption +=
              '\n♡ ' +
              formatCount(v.likes) +
              ' Likes  •  ▶ ' +
              formatCount(v.views) +
              ' Views'
          }

          try {
            await client.sendMessage(
              m.chat,
              { video: { url: v.url }, caption: caption },
              { quoted: m }
            )
          } catch (e) {
            await client.sendMessage(
              m.chat,
              { text: caption + '\n\n' + (v.link || v.url) },
              { quoted: m }
            )
          }
        }
      }
    } catch (e) {
      console.log(
        '[tiktoksearch] ERROR:',
        e && e.response && e.response.status,
        (e && e.response && e.response.data) || e.message
      )
      m.reply('❌ Error al buscar videos.\n\n' + (e.message || e))
    }
  },
}