import yts from 'yt-search'
import fetch from 'node-fetch'
import sharp from 'sharp'
import fs from 'fs'
import os from 'os'
import path from 'path'
import crypto from 'crypto'
import ffmpegPath from 'ffmpeg-static'
import ffmpeg from 'fluent-ffmpeg'

ffmpeg.setFfmpegPath(ffmpegPath)

const limit = 300
const NYXDL_API_KEY = 'nyx_NVRMcX8rP-YsEmGl-lyaLtks680B_ccH'
const NYXDL_AUDIO = 'https://nyxdlapi.vercel.app/api/downloads/youtube'
const NYXDL_VIDEO = 'https://nyxdlapi.vercel.app/api/downloads/youtube/mp4'

const NEWSLETTER_JID = '120363420575743790@newsletter'
const NEWSLETTER_NAME = 'ミ★ Nino / wa ★彡'

const HEADERS = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
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
    if (u.hostname.indexOf('youtu.be') !== -1) return u.pathname.replace('/', '').split('/')[0]
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

async function callNyxdl(endpoint, ytUrl) {
  var clean = abs(ytUrl)
  if (!clean) clean = 'https://' + String(ytUrl).trim()

  var apiUrl =
    endpoint +
    '?url=' +
    encodeURIComponent(clean) +
    '&apikey=' +
    encodeURIComponent(NYXDL_API_KEY)

  console.log('[NYXDL]', apiUrl)

  var lastErr = null
  for (var i = 1; i <= 2; i++) {
    try {
      var controller = typeof AbortController !== 'undefined' ? new AbortController() : null
      var timer = null
      if (controller) timer = setTimeout(() => controller.abort(), 90000)

      var res = await fetch(apiUrl, {
        headers: { accept: 'application/json', 'user-agent': HEADERS['user-agent'] },
        timeout: 90000,
        signal: controller ? controller.signal : undefined,
      })
      if (timer) clearTimeout(timer)

      var text = await res.text()
      if (!res.ok) throw new Error('NyxDL HTTP ' + res.status + ': ' + text.slice(0, 180))

      var data = JSON.parse(text)
      var r = (data && data.result) || {}
      var dl =
        r.download_url ||
        r.download ||
        r.url ||
        (r.datos && r.datos.url) ||
        (r.descarga && r.descarga.url)

      if (!data || !data.status || !dl) {
        throw new Error((data && data.message) || 'NyxDL no devolvió link')
      }

      return {
        dl: dl,
        title: r.title || r.titulo || 'Sin título',
      }
    } catch (e) {
      lastErr = e
      console.log('[NyxDL] intento ' + i + ' falló:', e.message)
      if (i < 2) await new Promise(r => setTimeout(r, 2000))
    }
  }
  throw new Error('No se pudo conectar con NyxDL.')
}

async function fixFaststart(buffer) {
  const tmpDir = os.tmpdir()
  const id = crypto.randomBytes(6).toString('hex')
  const inPath = path.join(tmpDir, `in_${id}.mp4`)
  const outPath = path.join(tmpDir, `out_${id}.mp4`)

  try {
    fs.writeFileSync(inPath, buffer)
    await new Promise((resolve, reject) => {
      ffmpeg(inPath)
        .outputOptions(['-c copy', '-movflags +faststart'])
        .save(outPath)
        .on('end', resolve)
        .on('error', reject)
    })
    const fixed = fs.readFileSync(outPath)
    return fixed
  } finally {
    try { fs.unlinkSync(inPath) } catch (e) {}
    try { fs.unlinkSync(outPath) } catch (e) {}
  }
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
  if (dur) lines.push('> ⌗» Duración › ' + formatDuration(dur))
  if (videoInfo && videoInfo.views != null) {
    lines.push('> ⌗» Vistas › ' + Number(videoInfo.views).toLocaleString())
  }
  if (videoInfo && videoInfo.author && videoInfo.author.name) {
    lines.push('> ⌗» Canal › ' + videoInfo.author.name)
  }
  if (videoInfo && videoInfo.ago) lines.push('> ⌗» Publicado › ' + videoInfo.ago)
  lines.push('')
  lines.push(
    isAudio
      ? asDocument ? '✐ Enviando audio (documento)...' : '✐ Enviando audio...'
      : asDocument ? '✐ Enviando video (documento)...' : '✐ Enviando video...'
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
    ? await callNyxdl(NYXDL_AUDIO, url)
    : await callNyxdl(NYXDL_VIDEO, url)

  var finalTitle = result.title || title || 'archivo'
  var dl = abs(result.dl)
  if (!dl) throw new Error('Link de descarga vacío')

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

    try {
      vbuf = await fixFaststart(vbuf)
    } catch (fixErr) {
      console.log('[play] fixFaststart falló, se manda tal cual:', fixErr.message)
    }

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

  // === RUN ARREGLADO ===
  run: async function (ctx) {
    const client = ctx.client
    const m = ctx.m
    const command = ctx.command
    const text = ctx.text

    try {
      // ... (todo el código de la función run queda igual)
      if (!text || !String(text).trim()) {
        return client.reply(m.chat, '✐ Ingresa un nombre o URL de YouTube.', m)
      }

      var isAudio = ['play', 'mp3', 'playaudio', 'ytmp3', 'playdoc', 'play2'].indexOf(command) !== -1
      var asDocument = ['playdoc', 'mp4doc'].indexOf(command) !== -1

      // ... (resto del código igual)

      // Aquí va todo el resto de la función (lo mismo de antes)

      await sendMediaOnly({ ... })
    } catch (e) {
      console.error('[play]', e)
      m.reply('✘ Error detectado.\n\n⌗» ' + e.message)
    }
  },
}