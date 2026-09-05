import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import yts from 'yt-search'
import fetch from 'node-fetch'

const execFileAsync = promisify(execFile)

const MAX_VIDEO_SECONDS = 120
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024

const NEWSLETTER_JID = '120363420575743790@newsletter'
const NEWSLETTER_NAME = 'ミ★ 𝙉𝙞𝙣𝙤 𝙐𝙥𝙙𝙖𝙩𝙚𝙨 ★彡'

const NYXDL_API_KEY = 'nyx_NVRMcX8rP-YsEmGl-lyaLtks680B_ccH'
const NYXDL_BASE = 'https://nyxdlapi.vercel.app'
const NYXDL_AUDIO = 'https://nyxdlapi.vercel.app/api/downloads/youtube'

let shazamApi

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

function cleanFileName(value) {
  return (
    String(value || 'audio encontrado')
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80) || 'audio encontrado'
  )
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

async function getShazamApi() {
  if (shazamApi) return shazamApi
  try {
    shazamApi = await import('shazam-api')
    return shazamApi
  } catch (e) {
    throw new Error('Falta instalar el reconocedor. Ejecuta: npm i shazam-api@0.3.0')
  }
}

async function extractAudio(mediaBuffer, workDir) {
  const inputPath = path.join(workDir, 'input-media')
  const outputPath = path.join(workDir, 'audio.pcm')

  await fs.writeFile(inputPath, mediaBuffer)
  await execFileAsync(
    process.env.FFMPEG_PATH || 'ffmpeg',
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-i',
      inputPath,
      '-vn',
      '-ac',
      '1',
      '-ar',
      '16000',
      '-f',
      's16le',
      '-acodec',
      'pcm_s16le',
      outputPath,
    ],
    { timeout: 90_000, maxBuffer: 2 * 1024 * 1024 }
  )

  const { s16LEToSamplesArray } = await getShazamApi()
  return s16LEToSamplesArray(Uint8Array.from(await fs.readFile(outputPath)))
}

async function identifySong(samples) {
  const { Shazam } = await getShazamApi()
  const result = await new Shazam('America/Mexico_City').recognizeSong(samples)
  if (!result) throw new Error('No pude reconocer la canción en el audio enviado.')
  return result
}

function getSongSearchText(song) {
  return [song.artist, song.title].filter(Boolean).join(' ').trim()
}

async function downloadAudioFromYt(ytUrl) {
  // Intentar import del play si existe
  try {
    const playMod = await import('../dow/play.js')
    if (typeof playMod.resolveAudioDownload === 'function') {
      return await playMod.resolveAudioDownload(ytUrl)
    }
  } catch (e) {
    console.log('[whatmusic] play.js no exporta resolveAudioDownload, uso NyxDL directo')
  }

  const apiUrl =
    NYXDL_AUDIO +
    '?url=' +
    encodeURIComponent(ytUrl) +
    '&apikey=' +
    encodeURIComponent(NYXDL_API_KEY)

  const res = await fetch(apiUrl, {
    headers: {
      accept: 'application/json',
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
    },
    timeout: 90000,
  })

  const text = await res.text()
  if (!res.ok) throw new Error('API audio HTTP ' + res.status)

  let data
  try {
    data = JSON.parse(text)
  } catch (e) {
    throw new Error('API no devolvió JSON válido')
  }

  const r = data && data.result ? data.result : {}
  const dl =
    abs(r.download_url) ||
    abs(r.download) ||
    abs(r.url) ||
    abs(r.datos && r.datos.url) ||
    abs(r.datos && r.datos.download)

  if (!data || !data.status || !dl) {
    throw new Error((data && data.message) || 'No se obtuvo link de descarga del audio.')
  }

  return { dl: dl, title: r.title || r.titulo || null }
}

export default {
  command: [
    'whatmusic',
    'shazam',
    'findmusic',
    'quecancion',
    'queesesto',
    'reconocer',
    'whatmusic2',
  ],
  category: 'utils',

  run: async function (ctx) {
    const client = ctx.client
    const m = ctx.m
    const prefa = globalThis.prefa || '.'

    const q = m.quoted ? m.quoted : m
    const message = q.msg || q.message || q
    const mime =
      (q.mimetype ||
        (message && message.mimetype) ||
        (q.mediaType ? String(q.mediaType) : '') ||
        '') + ''
    const duration = Number(q.seconds || message.seconds || 0)

    const isVideo = /video\//i.test(mime) || /video/i.test(mime)
    const isAudio = /audio\//i.test(mime) || /audio/i.test(mime) || /ptt/i.test(mime)

    if (!isVideo && !isAudio) {
      return m.reply(
        '✐ Responde a un *vídeo* o *audio* con música.\n\n' +
          '✰ Ejemplo:\n' +
          prefa +
          'whatmusic  ← respondiendo a un video\n' +
          prefa +
          'shazam'
      )
    }

    if (isVideo && duration > MAX_VIDEO_SECONDS) {
      return m.reply('✘ El vídeo es muy largo. Máximo: *' + MAX_VIDEO_SECONDS + '* segundos.')
    }

    let workDir

    try {
      await client.sendMessage(
        m.chat,
        {
          text: '🎧 Escuchando y buscando la canción...',
          contextInfo: newsletterContext(),
        },
        { quoted: m }
      )

      const mediaBuffer = await q.download()
      if (!mediaBuffer || !mediaBuffer.length) {
        throw new Error('No pude descargar el archivo enviado.')
      }
      if (mediaBuffer.length > MAX_UPLOAD_BYTES) {
        throw new Error('El archivo supera el límite de 50 MB.')
      }

      workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nino-whatmusic-'))
      const samples = await extractAudio(mediaBuffer, workDir)
      const song = await identifySong(samples)

      const artist = song.artist || 'Artista desconocido'
      const title = song.title || 'Canción desconocida'
      const album = song.album || 'No disponible'

      const info =
        '✅ *Canción encontrada*\n\n' +
        '🎵 *' +
        title +
        '*\n' +
        '👤 Artista › ' +
        artist +
        '\n' +
        '💿 Álbum › ' +
        album +
        (song.year ? '\n📅 Año › ' + song.year : '') +
        '\n\n' +
        '⏳ Preparando el MP3...'

      await client.sendMessage(
        m.chat,
        { text: info, contextInfo: newsletterContext() },
        { quoted: m }
      )

      const searchText = getSongSearchText(song)
      if (!searchText) {
        throw new Error('Reconocí la canción, pero faltan datos para buscar el audio.')
      }

      const search = await yts(searchText + ' official audio')
      const video = search.all && search.all[0]
      if (!video || !video.url) {
        throw new Error('Reconocí la canción, pero no hallé fuente de audio.')
      }

      const downloaded = await downloadAudioFromYt(video.url)
      const finalTitle = cleanFileName(artist + ' - ' + title)
      const dl = abs(downloaded.dl) || downloaded.dl

      if (!dl) throw new Error('Link de descarga vacío.')

      await client.sendMessage(
        m.chat,
        {
          audio: { url: dl },
          mimetype: 'audio/mpeg',
          fileName: finalTitle + '.mp3',
          ptt: false,
          contextInfo: newsletterContext(),
        },
        { quoted: m }
      )

      await client.sendMessage(
        m.chat,
        {
          text: '🎶 *' + title + '* de *' + artist + '* enviado.',
          contextInfo: newsletterContext(),
        },
        { quoted: m }
      )
    } catch (error) {
      console.error('[whatmusic]', error)
      await m.reply('✘ No pude completar la búsqueda.\n\n> ' + (error.message || error))
    } finally {
      if (workDir) {
        await fs.rm(workDir, { recursive: true, force: true }).catch(function () {})
      }
    }
  },
}