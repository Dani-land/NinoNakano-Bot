import axios from 'axios'

const NYXDL_API_KEY = 'nyx_NVRMcX8rP-YsEmGl-lyaLtks680B_ccH'
const NYXDL_TT_SEARCH = 'https://nyxdlapi.vercel.app/api/search/tiktoksearch'
const NYXDL_TT_DL = 'https://nyxdlapi.vercel.app/api/downloads/tiktok'

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

function getAuthor(v) {
  if (!v) return 'desconocido'
  if (v.author && typeof v.author === 'object') {
    return v.author.username || v.author.name || 'desconocido'
  }
  return v.username || v.author || 'desconocido'
}

function getStats(v) {
  var s = (v && v.statistics) || {}
  return {
    likes: s.likes || v.likes || 0,
    views: s.vistas || s.views || v.views || 0,
  }
}

async function downloadTikTok(tiktokUrl) {
  var apiUrl =
    NYXDL_TT_DL +
    '?url=' +
    encodeURIComponent(tiktokUrl) +
    '&apikey=' +
    encodeURIComponent(NYXDL_API_KEY)

  var res = await axios.get(apiUrl, {
    timeout: 45000,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'application/json',
    },
  })

  var data = res.data
  var r = (data && data.result) || data || {}

  var videoUrl =
    r.download ||
    r.downloadNoWatermark ||
    r.video ||
    r.url ||
    (r.data && (r.data.play || r.data.hdplay || r.data.wmplay)) ||
    null

  if (!videoUrl || typeof videoUrl !== 'string') {
    throw new Error('Sin link de video')
  }

  if (videoUrl.indexOf('//') === 0) videoUrl = 'https:' + videoUrl
  return videoUrl
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
        NYXDL_TT_SEARCH +
        '?q=' +
        encodeURIComponent(query) +
        '&apikey=' +
        encodeURIComponent(NYXDL_API_KEY)

      var res = await axios.get(searchUrl, {
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

      var top = results.slice(0, 5)
      await m.reply('✐ Encontré *' + results.length + '* resultados. Descargando *' + top.length + '* videos...')

      var usable = []

      for (var i = 0; i < top.length; i++) {
        var item = top[i]
        var tiktokPage = item.url || item.link || null
        if (!tiktokPage) continue

        try {
          var videoUrl = await downloadTikTok(tiktokPage)
          var stats = getStats(item)
          usable.push({
            url: videoUrl,
            title: getTitle(item),
            author: getAuthor(item),
            likes: stats.likes,
            views: stats.views,
            link: tiktokPage,
          })
        } catch (e) {
          console.log('[tiktoksearch] no se pudo descargar', tiktokPage, e.message)
        }
      }

      if (!usable.length) {
        return m.reply(
          '✘ Encontré resultados, pero no pude descargar los videos para *' + query + '*'
        )
      }

      var album = usable.map(function (v, idx) {
        var caption =
          '*ꕥ TikTok Búsqueda*\n' +
          '⌗» ' +
          (idx + 1) +
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