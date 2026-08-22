import yts from 'yt-search'
import fetch from 'node-fetch'
import sharp from 'sharp'

const limit = 300
const NYXDL_API_KEY = 'nyx_NVRMcX8rP-YsEmGl-lyaLtks680B_ccH'
const NYXDL_BASE = 'https://nyxdlapi.vercel.app'
const NYXDL_AUDIO = 'https://nyxdlapi.vercel.app/api/downloads/youtube'
const NYXDL_VIDEO = 'https://nyxdlapi.vercel.app/api/downloads/youtube/mp4'

const NEWSLETTER_JID = '120363420575743790@newsletter'
const NEWSLETTER_NAME = 'ミ★ 𝙉𝙞𝙣𝙤 𝙐𝙥𝙙𝙖𝙩𝙚𝙨 ★彡'

const HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
}

if (!global.__playSessions) global.__playSessions = {}
if (!global.__playListenerBound) global.__playListenerBound = false

function isYTUrl(u) {
  return /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/|live\/)|youtu\.be\/)/i.test(u || '')
}

function abs(u) {
  if (!u || typeof u !== 'string') return null
  var s = u.trim()
  if (!s) return null
  if (/^https?:\/\//i.test(s)) return s
  if (s.indexOf('//') === 0) return 'https:' + s
  if (s.charAt(0) === '/') return NYXDL_BASE + s
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

function phoneOf(jid) {
  if (!jid) return ''
  return String(jid).split('@')[0].replace(/\D/g, '')
}

function sameUser(a, b) {
  if (!a || !b) return false
  if (a === b) return true
  var pa = phoneOf(a)
  var pb = phoneOf(b)
  if (!pa || !pb) return false
  return pa === pb || pa.endsWith(pb) || pb.endsWith(pa)
}

function sessionKey(chat, sender) {
  return String(chat) + '|' + phoneOf(sender)
}

async function callNyxDL(endpoint, ytUrl) {
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
    '&apikey=' +
    encodeURIComponent(NYXDL_API_KEY)

  console.log('[NyxDL] GET', apiUrl)

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
      if (!res.ok) throw new Error('NyxDL HTTP ' + res.status + ': ' + text.slice(0, 180))

      var data = JSON.parse(text)
      var r = data && data.result ? data.result : {}
      var dl =
        abs(r.download_url) ||
        abs(r.download) ||
        abs(r.url) ||
        abs(r.datos && r.datos.url) ||
        abs(r.datos && r.datos.download)

      if (!data || !data.status || !dl) {
        throw new Error((data && data.message) || 'NyxDL no devolvió link de descarga.')
      }

      return {
        dl: dl,
        title: r.title || r.titulo || 'Sin título',
        duration: r.duration || r.duracion || null,
        channel: r.channel || r.canal || null,
        quality: r.quality || (r.datos && r.datos.calidad) || null,
        size: r.size || (r.datos && r.datos['tamaño']) || null,
        thumbnail: abs(r.thumbnail) || null,
      }
    } catch (e) {
      lastErr = e
      console.log('[NyxDL] intento ' + i + ' falló:', e.message)
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

function buildInfoText(title, videoInfo) {
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
  if (videoInfo && videoInfo.url) lines.push('⌗» Link › ' + videoInfo.url)
  lines.push('')
  lines.push('Elige el formato:')
  lines.push('1. 🎵 Audio')
  lines.push('2. 📄 Audio (documento)')
  lines.push('3. 🎬 Video')
  lines.push('4. 📁 Video (documento)')
  lines.push('')
  lines.push('_Toca un botón o responde 1-4_')
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
    ? await callNyxDL(NYXDL_AUDIO, url)
    : await callNyxDL(NYXDL_VIDEO, url)

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

function mapId(id) {
  id = String(id || '').trim()
  if (id === 'play_audio') return { isAudio: true, asDocument: false }
  if (id === 'play_adoc') return { isAudio: true, asDocument: true }
  if (id === 'play_video') return { isAudio: false, asDocument: false }
  if (id === 'play_vdoc') return { isAudio: false, asDocument: true }
  return null
}

function parseChoice(msg) {
  try {
    var ir = msg.message && msg.message.interactiveResponseMessage
    if (ir && ir.nativeFlowResponseMessage && ir.nativeFlowResponseMessage.paramsJson) {
      var raw = ir.nativeFlowResponseMessage.paramsJson
      var parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
      if (parsed && parsed.id) {
        var c = mapId(parsed.id)
        if (c) return c
      }
    }
  } catch (e) {}

  try {
    var br = msg.message && msg.message.buttonsResponseMessage
    if (br && br.selectedButtonId) {
      var c2 = mapId(br.selectedButtonId)
      if (c2) return c2
    }
  } catch (e) {}

  try {
    var tpl = msg.message && msg.message.templateButtonReplyMessage
    if (tpl && tpl.selectedId) {
      var c3 = mapId(tpl.selectedId)
      if (c3) return c3
    }
  } catch (e) {}

  try {
    var lr = msg.message && msg.message.listResponseMessage
    if (lr && lr.singleSelectReply && lr.singleSelectReply.selectedRowId) {
      var c4 = mapId(lr.singleSelectReply.selectedRowId)
      if (c4) return c4
    }
  } catch (e) {}

  var text =
    (msg.message &&
      (msg.message.conversation ||
        (msg.message.extendedTextMessage && msg.message.extendedTextMessage.text))) ||
    ''
  text = String(text).trim()

  if (text === '1' || /audio$/i.test(text) && !/doc/i.test(text)) {
    if (text === '1' || text.indexOf('🎵') !== -1 || /^audio$/i.test(text)) {
      return { isAudio: true, asDocument: false }
    }
  }
  if (text === '2' || /audio\s*doc/i.test(text) || text.indexOf('📄') !== -1) {
    return { isAudio: true, asDocument: true }
  }
  if (text === '3' || (/video/i.test(text) && !/doc/i.test(text)) || text.indexOf('🎬') !== -1) {
    if (text === '3' || /^🎬?\s*video$/i.test(text)) {
      return { isAudio: false, asDocument: false }
    }
  }
  if (text === '4' || /video\s*doc/i.test(text) || text.indexOf('📁') !== -1) {
    return { isAudio: false, asDocument: true }
  }

  if (text === '1') return { isAudio: true, asDocument: false }
  if (text === '2') return { isAudio: true, asDocument: true }
  if (text === '3') return { isAudio: false, asDocument: false }
  if (text === '4') return { isAudio: false, asDocument: true }

  return null
}

function bindPlayListener(client) {
  if (global.__playListenerBound) return
  global.__playListenerBound = true

  client.ev.on('messages.upsert', async function (ev) {
    try {
      var messages = ev.messages || []
      for (var i = 0; i < messages.length; i++) {
        var msg = messages[i]
        if (!msg || !msg.message) continue
        if (msg.key && msg.key.fromMe) continue

        var chat = msg.key && msg.key.remoteJid
        var sender = (msg.key && (msg.key.participant || msg.key.remoteJid)) || ''
        if (!chat) continue

        var choice = parseChoice(msg)
        if (!choice) continue

        var key = sessionKey(chat, sender)
        var session = global.__playSessions[key]
        if (!session) {
          // buscar por chat si el sender no coincide exacto (LID)
          var keys = Object.keys(global.__playSessions)
          for (var k = 0; k < keys.length; k++) {
            if (keys[k].indexOf(String(chat) + '|') === 0) {
              var cand = global.__playSessions[keys[k]]
              if (cand && sameUser(cand.sender, sender)) {
                session = cand
                key = keys[k]
                break
              }
            }
          }
        }

        if (!session || session.busy) continue

        session.busy = true
        delete global.__playSessions[key]

        var mFake = session.m
        var clientRef = session.client

        try {
          await clientRef.sendMessage(
            chat,
            {
              text: choice.isAudio
                ? choice.asDocument
                  ? '✐ Descargando audio (documento)...'
                  : '✐ Descargando audio...'
                : choice.asDocument
                  ? '✐ Descargando video (documento)...'
                  : '✐ Descargando video...',
              contextInfo: newsletterContext(),
            },
            { quoted: mFake }
          )

          await sendMediaOnly({
            client: clientRef,
            m: mFake,
            url: session.url,
            title: session.title,
            isAudio: choice.isAudio,
            asDocument: choice.asDocument,
            thumbBuffer: session.thumbBuffer,
          })
        } catch (err) {
          console.error('[play] session error:', err)
          try {
            await clientRef.sendMessage(chat, { text: '✘ Error: ' + err.message }, { quoted: mFake })
          } catch (e2) {}
        }
      }
    } catch (e) {
      console.error('[play] listener:', e)
    }
  })
}

async function sendPreviewWithButtons(client, m, title, videoInfo, thumbBuffer) {
  var infoText = buildInfoText(title, videoInfo)
  var ctx = newsletterContext()

  if (thumbBuffer) {
    await client.sendMessage(
      m.chat,
      { image: thumbBuffer, caption: infoText, contextInfo: ctx },
      { quoted: m }
    )
  } else {
    await client.sendMessage(m.chat, { text: infoText, contextInfo: ctx }, { quoted: m })
  }

  var buttons = [
    { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🎵 Audio', id: 'play_audio' }) },
    { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '📄 Audio Doc', id: 'play_adoc' }) },
    { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🎬 Video', id: 'play_video' }) },
    { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '📁 Video Doc', id: 'play_vdoc' }) },
  ]

  try {
    await client.relayMessage(
      m.chat,
      {
        interactiveMessage: {
          body: { text: 'Elige formato para:\n*' + (title || 'YouTube') + '*' },
          footer: { text: NEWSLETTER_NAME },
          nativeFlowMessage: { buttons: buttons },
          contextInfo: ctx,
        },
      },
      {}
    )
  } catch (e) {
    console.log('[play] botones fallaron:', e.message)
    await client.sendMessage(
      m.chat,
      { text: 'Responde con:\n1 = Audio\n2 = Audio Doc\n3 = Video\n4 = Video Doc', contextInfo: ctx },
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

    bindPlayListener(client)

    try {
      if (!text || !String(text).trim()) {
        return client.reply(m.chat, '✐ Ingresa un nombre o URL de YouTube.', m)
      }

      var directAudio = ['mp3', 'playaudio', 'ytmp3'].indexOf(command) !== -1
      var directVideo = ['mp4', 'playvideo', 'ytmp4'].indexOf(command) !== -1
      var directAudioDoc = command === 'playdoc'
      var directVideoDoc = command === 'mp4doc'
      var needsChoice = ['play', 'play2'].indexOf(command) !== -1

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

      if (needsChoice) {
        var key = sessionKey(m.chat, m.sender)
        global.__playSessions[key] = {
          client: client,
          m: m,
          sender: m.sender,
          chat: m.chat,
          url: url,
          title: title,
          thumbBuffer: thumbBuffer,
          busy: false,
          at: Date.now(),
        }

        await sendPreviewWithButtons(client, m, title, videoInfo, thumbBuffer)
        return
      }

      var isAudio = directAudio || directAudioDoc
      var asDocument = directAudioDoc || directVideoDoc

      await client.sendMessage(
        m.chat,
        {
          text: isAudio
            ? asDocument
              ? '✐ Descargando audio (documento)...'
              : '✐ Descargando audio...'
            : asDocument
              ? '✐ Descargando video (documento)...'
              : '✐ Descargando video...',
          contextInfo: newsletterContext(),
        },
        { quoted: m }
      )

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