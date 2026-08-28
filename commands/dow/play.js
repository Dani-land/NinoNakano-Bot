import yts from 'yt-search'
import fetch from 'node-fetch'
import sharp from 'sharp'

const limit = 300
const DVYER_API_KEY = 'dvyer2008'
const DVYER_AUDIO = 'https://dv-yer-api.online/ytmp3'
const DVYER_VIDEO = 'https://dv-yer-api.online/ytmp4'

const NEWSLETTER_JID = '120363420575743790@newsletter'
const NEWSLETTER_NAME = 'ミ★ 𝙎𝙝𝙖𝙙𝙤𝙬 𝙐𝙥𝙙𝙖𝙩𝙚𝙨 ★彡'

const HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
}

function isYTUrl(u) {
  return /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/|live\/)|youtu\.be\/)/i.test(u || '')
}

function abs(u) {
  if (!u || typeof u !== 'string') return null
  var s = u.trim()
  if (!s) return null
  if (/^https?:\/\//i.test(s)) return s
  if (s.indexOf('//') === 0) return 'https:' + s
  return null
}

function newsletterContext() {
  return {
    forwardingScore: 999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: NEWSLETTER_JID,
      newsletterName: NEWSLETTER_NAME,
      serverMessageId: -1,
    },
  }
}

function extractVideoId(url) {
  try {
    var full = url.indexOf('http') === 0 ? url : 'https://' + url
    var u = new URL(full)
    if (u.hostname.indexOf('youtu.be') !== -1) {
      return u.pathname.replace('/', '').split('/')[0]
    }
    return u.searchParams.get('v') || null
  } catch (e) {
    return null
  }
}

function formatDuration(sec) {
  if (sec == null || sec === '') return null
  if (typeof sec === 'string' && sec.indexOf(':') !== -1) return sec
  var n = Number(sec)
  if (Number.isNaN(n)) return String(sec)
  var m = Math.floor(n / 60)
  var s = Math.floor(n % 60)
  return m + ':' + (s < 10 ? '0' : '') + s
}

async function callDvYer(endpoint, ytUrl, quality) {
  var clean = abs(ytUrl)
  if (!clean) {
    if (ytUrl && String(ytUrl).indexOf('http') === 0) clean = String(ytUrl).trim()
    else if (ytUrl) clean = 'https://' + String(ytUrl).trim()
  }
  if (!clean || !/^https?:\/\//i.test(clean)) {
    throw new Error('URL de YouTube inválida: ' + ytUrl)
  }

  var apiUrl =
    endpoint +
    '?url=' +
    encodeURIComponent(clean) +
    (quality ? '&quality=' + encodeURIComponent(quality) : '') +
    '&apikey=' +
    DVYER_API_KEY

  console.log('[DVYER] GET', apiUrl)

  var lastErr = null
  for (var i = 1; i <= 2; i++) {
    try {
      var controller = typeof AbortController !== 'undefined' ? new AbortController() : null
      var timer = null
      if (controller) {
        timer = setTimeout(function () {
          controller.abort()
        }, 90000)
      }

      var res = await fetch(apiUrl, {
        headers: { accept: 'application/json', 'user-agent': HEADERS['user-agent'] },
        timeout: 90000,
        signal: controller ? controller.signal : undefined,
      })
      if (timer) clearTimeout(timer)

      var text = await res.text()
      if (!res.ok) throw new Error('DVYER HTTP ' + res.status + ': ' + text.slice(0, 180))

      var data = JSON.parse(text)
      var dl = abs(data.download_url) || abs(data.url) || abs(data.stream_url)

      if (!data || !data.ok || !dl) {
        throw new Error((data && data.message) || 'DVYER no devolvió link de descarga.')
      }

      return {
        dl: dl,
        title: data.title || 'Sin título',
        duration: data.duration_seconds || null,
        quality: data.quality || null,
        size: data.size_mb ? data.size_mb + ' MB' : null,
        filename: data.filename || null,
      }
    } catch (e) {
      lastErr = e
      console.log('[DVYER] intento ' + i + ' falló:', e.message)
      if (i < 2) await new Promise(function (r) { setTimeout(r, 2000) })
    }
  }

  throw new Error('No se pudo conectar con la API.\nDetalle: ' + ((lastErr && lastErr.message) || 'error'))
}

async function getThumbBuffer(videoInfo) {
  var thumbSrc = abs(videoInfo && videoInfo.thumbnail)
  if (!thumbSrc) return null
  try {
    var tr = await fetch(thumbSrc, { headers: HEADERS })
    if (!tr.ok) return null
    var buf = Buffer.from(await tr.arrayBuffer())
    return await sharp(buf).resize(500, 281).jpeg({ quality: 85 }).toBuffer()
  } catch (e) {
    return null
  }
}

function buildInfoText(title, videoInfo, isAudio, asDocument) {
  var lines = ['✿ *' + (title || 'YouTube') + '*', '']
  var dur = videoInfo && (videoInfo.timestamp || videoInfo.duration)
  if (dur) lines.push('⌗» Duración › ' + formatDuration(dur))
  if (videoInfo && videoInfo.views != null) {
    lines.push('⌗» Vistas › ' + Number(videoInfo.views).toLocaleString())
  }
  if (videoInfo && videoInfo.author && videoInfo.author.name) {
    lines.push('⌗» Canal › ' + videoInfo.author.name)
  }
  if (videoInfo && videoInfo.ago) lines.push('⌗» Publicado › ' + videoInfo.ago)
  lines.push('')
  lines.push(
    isAudio
      ? asDocument
        ? '✐ Enviando audio (documento)...'
        : '✐ Enviando audio...'
      : asDocument
        ? '✐ Enviando video (documento)...'
        : '✐ Enviando video...'
  )
  return lines.join('\n')
}

async function sendMediaOnly(opts) {
  var client = opts.client
  var m = opts.m
  var url = opts.url
  var title = opts.title
  var isAudio = opts.isAudio
  var asDocument = opts.asDocument
  var thumbBuffer = opts.thumbBuffer

  var result = isAudio
    ? await callDvYer(DVYER_AUDIO, url, null)
    : await callDvYer(DVYER_VIDEO, url, '360p')

  var finalTitle = result.title || title || 'archivo'
  var dl = abs(result.dl)
  if (!dl) throw new Error('Link de descarga vacío o inválido')

  var ctx = newsletterContext()

  if (isAudio) {
    var audioMsg = {
      mimetype: 'audio/mpeg',
      fileName: finalTitle + '.mp3',
      contextInfo: ctx,
    }
    if (asDocument) audioMsg.document = { url: dl }
    else audioMsg.audio = { url: dl }
    await client.sendMessage(m.chat, audioMsg, { quoted: m })
    return
  }

  var asDoc = asDocument
  if (!asDoc) {
    try {
      var head = await fetch(dl, { method: 'HEAD', headers: HEADERS })
      var len = head.headers.get('content-length')
      var mb = len ? parseInt(len, 10) / (1024 * 1024) : 0
      if (mb >= limit) asDoc = true
    } catch (e) {
      asDoc = true
    }
  }

  if (asDoc) {
    await client.sendMessage(
      m.chat,
      {
        document: { url: dl },
        fileName: finalTitle + '.mp4',
        mimetype: 'video/mp4',
        contextInfo: ctx,
      },
      { quoted: m }
    )
    return
  }

  try {
    var vres = await fetch(dl, { headers: HEADERS, redirect: 'follow' })
    if (!vres.ok) throw new Error('HTTP ' + vres.status)
    var vbuf = Buffer.from(await vres.arrayBuffer())
    if (vbuf.length < 10000) throw new Error('archivo muy pequeño')
    await client.sendMessage(
      m.chat,
      {
        video: vbuf,
        mimetype: 'video/mp4',
        fileName: finalTitle + '.mp4',
        ptv: false,
        jpegThumbnail: thumbBuffer || undefined,
        contextInfo: ctx,
      },
      { quoted: m }
    )
  } catch (e) {
    await client.sendMessage(
      m.chat,
      {
        video: { url: dl },
        mimetype: 'video/mp4',
        fileName: finalTitle + '.mp4',
        ptv: false,
        jpegThumbnail: thumbBuffer || undefined,
        contextInfo: ctx,
      },
      { quoted: m }
    )
  }
}

export default {
  command: [
    'play', 'mp3', 'playaudio', 'playdoc', 'ytmp3', 'play2',
    'mp4', 'mp4doc', 'playvideo', 'ytmp4',
  ],
  category: 'downloader',

  run: async function (ctx) {
    var client = ctx.client
    var m = ctx.m
    var command = ctx.command
    var text = ctx.text

    try {
      if (!text || !String(text).trim()) {
        return client.reply(m.chat, '✐ Ingresa un nombre o URL de YouTube.', m)
      }

      var isAudio = ['play', 'mp3', 'playaudio', 'ytmp3', 'playdoc', 'play2'].indexOf(command) !== -1
      var asDocument = ['playdoc', 'mp4doc'].indexOf(command) !== -1

      var url
      var title
      var videoInfo

      if (isYTUrl(text)) {
        url = String(text).trim()
        if (url.indexOf('http') !== 0) url = 'https://' + url
        var id = extractVideoId(url)
        try {
          videoInfo = id ? await yts({ videoId: id }) : null
          title = (videoInfo && videoInfo.title) || 'Video'
        } catch (e) {
          title = 'Video'
        }
      } else {
        var search = await yts(String(text).trim())
        if (!search || !search.all || !search.all.length) {
          return m.reply('ꕥ No encontré resultados.')
        }
        videoInfo = search.all[0]
        title = videoInfo.title
        url = videoInfo.url
      }

      url = abs(url) || url
      if (!url || !/^https?:\/\//i.test(url)) {
        return m.reply('✘ No pude obtener una URL válida de YouTube.')
      }

      var thumbBuffer = await getThumbBuffer(videoInfo)
      var infoText = buildInfoText(title, videoInfo, isAudio, asDocument)
      var ctx2 = newsletterContext()

      if (thumbBuffer) {
        await client.sendMessage(
          m.chat,
          { image: thumbBuffer, caption: infoText, contextInfo: ctx2 },
          { quoted: m }
        )
      } else {
        await client.sendMessage(m.chat, { text: infoText, contextInfo: ctx2 }, { quoted: m })
      }

      await sendMediaOnly({
        client: client,
        m: m,
        url: url,
        title: title,
        isAudio: isAudio,
        asDocument: asDocument,
        thumbBuffer: thumbBuffer,
      })
    } catch (e) {
      console.error('[play]', e)
      m.reply('✘ Error detectado.\n\n⌗» ' + e.message)
    }
  },
}