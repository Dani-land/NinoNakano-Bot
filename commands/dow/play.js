import yts from 'yt-search'
import fetch from 'node-fetch'
import sharp from 'sharp'

const limit = 300
const NYXDL_API_KEY = 'nyx_NVRMcX8rP-YsEmGl-lyaLtks680B_ccH'
const NYXDL_BASE = 'https://nyxdlapi.vercel.app'
const NYXDL_AUDIO = `${NYXDL_BASE}/api/downloads/youtube`
const NYXDL_VIDEO = `${NYXDL_BASE}/api/downloads/youtube/mp4`

const NEWSLETTER_JID = '120363420575743790@newsletter'
const NEWSLETTER_NAME = 'ミ★ 𝙉𝙞𝙣𝙤 𝙐𝙥𝙙𝙖𝙩𝙚𝙨 ★彡'

const HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
}

const isYTUrl = (u) =>
  /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/|live\/)|youtu\.be\/)/i.test(u || '')

function abs(u) {
  if (!u || typeof u !== 'string') return null
  const s = u.trim()
  if (!s) return null
  if (/^https?:\/\//i.test(s)) return s
  if (s.startsWith('//')) return 'https:' + s
  if (s.startsWith('/')) return NYXDL_BASE + s
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
    const u = new URL(url.startsWith('http') ? url : 'https://' + url)
    if (u.hostname.includes('youtu.be')) return u.pathname.replace('/', '').split('/')[0]
    return u.searchParams.get('v') || null
  } catch {
    return null
  }
}

async function callNyxDL(endpoint, ytUrl) {
  const clean = abs(ytUrl) || (ytUrl?.startsWith('http') ? ytUrl : `https://${ytUrl}`)
  if (!clean || !/^https?:\/\//i.test(clean)) {
    throw new Error(`URL de YouTube inválida: ${ytUrl}`)
  }

  const apiUrl = `\( {endpoint}?url= \){encodeURIComponent(clean)}&apikey=${encodeURIComponent(NYXDL_API_KEY)}`
  console.log('[NyxDL] GET', apiUrl)

  const res = await fetch(apiUrl, {
    headers: { accept: 'application/json', ...HEADERS },
  })
  const text = await res.text()

  if (!res.ok) throw new Error(`NyxDL HTTP ${res.status}: ${text.slice(0, 180)}`)

  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(`NyxDL no devolvió JSON: ${text.slice(0, 180)}`)
  }

  const r = data?.result || {}
  const dl =
    abs(r.download_url) ||
    abs(r.download) ||
    abs(r.url) ||
    abs(r.datos?.url) ||
    abs(r.datos?.download)

  if (!data?.status || !dl) {
    throw new Error(data?.message || 'NyxDL no devolvió link de descarga.')
  }

  return {
    dl,
    title: r.title || r.titulo || 'Sin título',
    duration: r.duration || r.duracion || null,
    channel: r.channel || r.canal || null,
    quality: r.quality || r.datos?.calidad || null,
    size: r.size || r.datos?.tamaño || null,
    thumbnail: abs(r.thumbnail) || null,
  }
}

async function sendResult({ client, m, url, title, videoInfo, isAudio, asDocument }) {
  const result = isAudio
    ? await callNyxDL(NYXDL_AUDIO, url)
    : await callNyxDL(NYXDL_VIDEO, url)

  const finalTitle = result.title || title || 'archivo'
  const dl = abs(result.dl)
  if (!dl) throw new Error('Link de descarga vacío o inválido')

  console.log('[NyxDL] download =', dl)

  let thumbBuffer = null
  const thumbSrc = result.thumbnail || abs(videoInfo?.thumbnail)
  if (thumbSrc) {
    try {
      const tr = await fetch(thumbSrc, { headers: HEADERS })
      if (tr.ok) {
        const buf = Buffer.from(await tr.arrayBuffer())
        thumbBuffer = await sharp(buf).resize(500, 281).jpeg({ quality: 85 }).toBuffer()
      }
    } catch (e) {
      console.log('thumb fail:', e.message)
    }
  }

  const lines = [`✿ *${finalTitle}*`, '']
  if (result.duration || videoInfo?.timestamp || videoInfo?.duration) {
    lines.push(`⌗» Duración › ${result.duration || videoInfo.timestamp || videoInfo.duration}`)
  }
  if (videoInfo?.views != null) lines.push(`⌗» Vistas › ${Number(videoInfo.views).toLocaleString()}`)
  if (result.channel || videoInfo?.author?.name) {
    lines.push(`⌗» Canal › ${result.channel || videoInfo.author.name}`)
  }
  if (videoInfo?.ago) lines.push(`⌗» Publicado › ${videoInfo.ago}`)
  if (result.quality) lines.push(`⌗» Calidad › ${result.quality}`)
  if (result.size) lines.push(`⌗» Tamaño › ${result.size}`)
  lines.push('', isAudio ? '✐ Enviando audio...' : '✐ Enviando video...')

  const infoText = lines.join('\n')
  const ctx = newsletterContext()

  if (thumbBuffer) {
    await client.sendMessage(m.chat, { image: thumbBuffer, caption: infoText, contextInfo: ctx }, { quoted: m })
  } else {
    await client.sendMessage(m.chat, { text: infoText, contextInfo: ctx }, { quoted: m })
  }

  if (isAudio) {
    await client.sendMessage(
      m.chat,
      {
        [asDocument ? 'document' : 'audio']: { url: dl },
        mimetype: 'audio/mpeg',
        fileName: `${finalTitle}.mp3`,
        contextInfo: ctx,
      },
      { quoted: m }
    )
    return
  }

  // video
  let asDoc = asDocument
  if (!asDoc) {
    try {
      const head = await fetch(dl, { method: 'HEAD', headers: HEADERS })
      const len = head.headers.get('content-length')
      const mb = len ? parseInt(len, 10) / (1024 * 1024) : 0
      if (mb >= limit) asDoc = true
    } catch {
      asDoc = true
    }
  }

  if (asDoc) {
    await client.sendMessage(
      m.chat,
      {
        document: { url: dl },
        fileName: `${finalTitle}.mp4`,
        mimetype: 'video/mp4',
        contextInfo: ctx,
      },
      { quoted: m }
    )
    return
  }

  try {
    const res = await fetch(dl, { headers: HEADERS, redirect: 'follow' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.length < 10000) throw new Error('archivo muy pequeño')

    await client.sendMessage(
      m.chat,
      {
        video: buffer,
        mimetype: 'video/mp4',
        fileName: `${finalTitle}.mp4`,
        ptv: false,
        jpegThumbnail: thumbBuffer || undefined,
        contextInfo: ctx,
      },
      { quoted: m }
    )
  } catch (e) {
    console.log('video buffer fail, URL directa:', e.message)
    await client.sendMessage(
      m.chat,
      {
        video: { url: dl },
        mimetype: 'video/mp4',
        fileName: `${finalTitle}.mp4`,
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

  run: async ({ client, m, command, text }) => {
    try {
      if (!text?.trim()) {
        return client.reply(m.chat, '✐ Ingresa un nombre o URL de YouTube.', m)
      }

      const isAudio = ['play', 'mp3', 'playaudio', 'ytmp3', 'playdoc', 'play2'].includes(command)
      const asDocument = ['playdoc', 'mp4doc'].includes(command)

      let url, title, videoInfo

      if (isYTUrl(text)) {
        url = text.startsWith('http') ? text.trim() : `https://${text.trim()}`
        const id = extractVideoId(url)
        try {
          videoInfo = id ? await yts({ videoId: id }) : null
          title = videoInfo?.title || 'Video'
        } catch {
          title = 'Video'
        }
      } else {
        const search = await yts(text.trim())
        if (!search?.all?.length) return m.reply('ꕥ No encontré resultados.')
        videoInfo = search.all[0]
        title = videoInfo.title
        url = videoInfo.url
      }

      url = abs(url) || url
      if (!url || !/^https?:\/\//i.test(url)) {
        return m.reply('✘ No pude obtener una URL válida de YouTube.')
      }

      await sendResult({ client, m, url, title, videoInfo, isAudio, asDocument })
    } catch (e) {
      console.error('[play]', e)
      m.reply(`✘ Error detectado.\n\n⌗» ${e.message}`)
    }
  },
}