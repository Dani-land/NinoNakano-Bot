import axios from 'axios'

const NYXDL_API_KEY = 'nyx_NVRMcX8rP-YsEmGl-lyaLtks680B_ccH'
const NYXDL_TT_SEARCH = 'https://nyxdlapi.vercel.app/api/search/tiktoksearch'

function formatCount(n) {
  var num = Number(n || 0)
  if (Number.isNaN(num)) return '0'
  return num.toLocaleString()
}

function getTitle(v) {
  var t = (v && v.title) || 'Sin descripción'
  if (t.length > 80) return t.slice(0, 80) + '...'
  return t
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
      var apiUrl =
        NYXDL_TT_SEARCH +
        '?q=' +
        encodeURIComponent(query) +
        '&apikey=' +
        encodeURIComponent(NYXDL_API_KEY)

      var res = await axios.get(apiUrl, {
        timeout: 30000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
      })

      var data = res.data
      var results =
        (data && data.result && data.result.results) ||
        (data && data.result && data.result.resultados) ||
        (data && data.results) ||
        []

      if (!Array.isArray(results) || !results.length) {
        return m.reply('✘ No encontré resultados para *' + query + '*')
      }

      var usable = results
        .map(function (v) {
          return {
            url: v.video || v.videoWatermarked || null,
            title: getTitle(v),
            author: v.username || v.author || 'desconocido',
            likes: v.likes || 0,
            views: v.views || 0,
            duration: v.duration || 0,
            link: v.url || null,
          }
        })
        .filter(function (v) {
          return !!v.url
        })

      if (!usable.length) {
        return m.reply(
          '✘ Encontré resultados, pero no pude obtener los enlaces de video para *' + query + '*'
        )
      }

      var top = usable.slice(0, 6)

      var album = top.map(function (v, i) {
        var caption =
          '*ꕥ TikTok Búsqueda*\n' +
          '⌗» ' +
          (i + 1) +
          '. ' +
          v.title +
          '\n' +
          '♡ @' +
          v.author +
          '\n' +
          '♡ ' +
          formatCount(v.likes) +
          ' Likes  •  ▶ ' +
          formatCount(v.views) +
          ' Views'

        return {
          video: { url: v.url },
          caption: caption,
        }
      })

      try {
        await client.sendMessage(
          m.chat,
          {
            album: album,
          },
          { quoted: m }
        )
      } catch (albumErr) {
        console.log('[tiktoksearch] album falló, enviando uno por uno:', albumErr.message)
        for (var i = 0; i < top.length; i++) {
          var v = top[i]
          var caption =
            '*ꕥ TikTok Búsqueda*\n' +
            '⌗» ' +
            (i + 1) +
            '. ' +
            v.title +
            '\n' +
            '♡ @' +
            v.author +
            '\n' +
            '♡ ' +
            formatCount(v.likes) +
            ' Likes  •  ▶ ' +
            formatCount(v.views) +
            ' Views'

          try {
            await client.sendMessage(
              m.chat,
              { video: { url: v.url }, caption: caption },
              { quoted: m }
            )
          } catch (e) {
            await client.sendMessage(
              m.chat,
              { text: caption + '\n\n' + v.url },
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