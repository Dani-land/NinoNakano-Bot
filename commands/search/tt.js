import axios from 'axios'

const DVYER_API_KEY = 'dvyer2008'
const DVYER_TT_SEARCH = 'https://dv-yer-api.online/tiktok/search'
const DVYER_TT_DL = 'https://dv-yer-api.online/ttdlmp4'
const MAX_VIDEOS = 5

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

function getTikTokPage(v) {
  return (
    (v && (v.share_url || v.video_url)) ||
    (v && v.links && v.links.tiktok) ||
    null
  )
}

async function resolveVideoUrl(tiktokPage) {
  if (!tiktokPage) return null

  var apiUrl =
    DVYER_TT_DL +
    '?url=' +
    encodeURIComponent(tiktokPage) +
    '&mode=link&apikey=' +
    encodeURIComponent(DVYER_API_KEY)

  var res = await axios.get(apiUrl, {
    timeout: 45000,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'application/json',
    },
  })

  var d = res.data || {}
  var videoUrl =
    d.url ||
    d.download_url ||
    d.stream_url ||
    d.download_url_full ||
    d.stream_url_full ||
    null

  if (!videoUrl || typeof videoUrl !== 'string') return null
  if (videoUrl.indexOf('//') === 0) videoUrl = 'https:' + videoUrl
  return videoUrl
}

async function downloadBuffer(url) {
  var res = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 90000,
    maxContentLength: 80 * 1024 * 1024,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: '*/*',
    },
  })
  var buf = Buffer.from(res.data)
  if (!buf || buf.length < 5000) throw new Error('archivo muy pequeño')
  return buf
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
        encodeURIComponent(query) +
        '&limit=' +
        MAX_VIDEOS

      var res = await axios.get(searchUrl, {
        timeout: 35000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
      })

      var data = res.data
      var results = (data && data.results) || []

      if (!Array.isArray(results) || !results.length) {
        return m.reply('✘ No encontré resultados para *' + query + '*')
      }

      var top = results.slice(0, MAX_VIDEOS)

      await m.reply(
        '✐ Encontré resultados. Resolviendo y enviando hasta *' + top.length + '* videos...'
      )

      var usable = []

      for (var i = 0; i < top.length; i++) {
        var item = top[i]
        var page = getTikTokPage(item)
        if (!page) continue

        try {
          var videoUrl = await resolveVideoUrl(page)
          if (!videoUrl) {
            console.log('[tts] sin url de video para', page)
            continue
          }
          usable.push({
            url: videoUrl,
            title: getTitle(item),
            author: getAuthor(item),
            likes: item.likes,
            views: item.views,
            link: page,
          })
        } catch (e) {
          console.log('[tts] resolve falló', page, e.message)
        }
      }

      if (!usable.length) {
        return m.reply(
          '✘ Encontré resultados, pero no pude obtener los MP4. La API de descarga falló.'
        )
      }

      var sent = 0

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

        var ok = false

        // 1) Buffer (más fiable)
        try {
          var buffer = await downloadBuffer(v.url)
          await client.sendMessage(
            m.chat,
            {
              video: buffer,
              mimetype: 'video/mp4',
              caption: caption,
            },
            { quoted: m }
          )
          ok = true
          sent++
        } catch (e1) {
          console.log('[tts] buffer falló', j + 1, e1.message)
        }

        // 2) URL directa
        if (!ok) {
          try {
            await client.sendMessage(
              m.chat,
              {
                video: { url: v.url },
                mimetype: 'video/mp4',
                caption: caption,
              },
              { quoted: m }
            )
            ok = true
            sent++
          } catch (e2) {
            console.log('[tts] url falló', j + 1, e2.message)
          }
        }

        // 3) Solo texto
        if (!ok) {
          await client.sendMessage(
            m.chat,
            { text: caption + '\n\n' + (v.link || v.url) },
            { quoted: m }
          )
        }

        await new Promise(function (r) {
          setTimeout(r, 800)
        })
      }

      if (sent === 0) {
        await m.reply('✘ No pude enviar ningún video (solo links).')
      } else {
        await m.reply('✓ Enviados *' + sent + '* de *' + usable.length + '* videos.')
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