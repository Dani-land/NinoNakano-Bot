import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import yts from 'yt-search'
import { resolveAudioDownload } from '../dow/play.js'

const execFileAsync = promisify(execFile)
const MAX_VIDEO_SECONDS = 120
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024
let shazamApi

function cleanFileName(value) {
  return String(value || 'audio encontrado')
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'audio encontrado'
}

async function extractAudio(videoBuffer, workDir) {
  const inputPath = path.join(workDir, 'input-video')
  const outputPath = path.join(workDir, 'audio.pcm')

  await fs.writeFile(inputPath, videoBuffer)
  await execFileAsync(
    process.env.FFMPEG_PATH || 'ffmpeg',
    [
      '-hide_banner',
      '-loglevel', 'error',
      '-y',
      '-i', inputPath,
      '-vn',
      '-ac', '1',
      '-ar', '16000',
      '-f', 's16le',
      '-acodec', 'pcm_s16le',
      outputPath
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

async function getShazamApi() {
  if (shazamApi) return shazamApi
  try {
    shazamApi = await import('shazam-api')
    return shazamApi
  } catch {
    throw new Error('Falta instalar el reconocedor público. Ejecuta: npm install shazam-api@0.3.0')
  }
}

function getSongSearchText(song) {
  return [song.artist, song.title].filter(Boolean).join(' ').trim()
}

export default {
  command: ['whatmusic'],
  category: 'utils',

  run: async ({ client, m }) => {
    const q = m.quoted || m
    const message = q.msg || q
    const mime = message.mimetype || ''
    const duration = Number(message.seconds || 0)

    if (!/^video\//i.test(mime)) {
      return m.reply(
        `✐ Envía o responde a un vídeo con una canción usando *${globalThis.prefa || '/'}whatmusic*.`
      )
    }

    if (duration > MAX_VIDEO_SECONDS) {
      return m.reply(`✘ El vídeo es demasiado largo. Máximo permitido: ${MAX_VIDEO_SECONDS} segundos.`)
    }

    let workDir
    try {
      await m.reply('⏳ Escuchando el vídeo y buscando la canción...')
      const videoBuffer = await q.download()

      if (!videoBuffer?.length) {
        throw new Error('No pude descargar el vídeo enviado.')
      }
      if (videoBuffer.length > MAX_UPLOAD_BYTES) {
        throw new Error('El vídeo supera el límite de 50 MB.')
      }

      workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nino-whatmusic-'))
      const samples = await extractAudio(videoBuffer, workDir)
      const song = await identifySong(samples)
      const artist = song.artist || 'Artista desconocido'
      const title = song.title || 'Canción desconocida'
      const album = song.album || 'No disponible'

      await client.sendMessage(
        m.chat,
        {
          text: [
            '✅ *Audio encontrado*',
            '',
            `🎵 *${title}*`,
            `👤 Artista: ${artist}`,
            `💿 Álbum: ${album}`,
            song.year ? `📅 Lanzamiento: ${song.year}` : null,
            '',
            '⏳ Buscando y preparando el MP3...'
          ].filter(Boolean).join('\n')
        },
        { quoted: m }
      )

      const searchText = getSongSearchText(song)
      if (!searchText) {
        throw new Error('La canción fue reconocida, pero no devolvió datos para buscar el audio.')
      }

      const search = await yts(`${searchText} official audio`)
      const video = search.all?.[0]
      if (!video?.url) {
        throw new Error('Reconocí la canción, pero no encontré una fuente de audio para descargar.')
      }

      const downloaded = await resolveAudioDownload(video.url)
      const finalTitle = cleanFileName(`${artist} - ${title}`)

      await client.sendMessage(
        m.chat,
        {
          audio: { url: downloaded.dl },
          mimetype: 'audio/mpeg',
          fileName: `${finalTitle}.mp3`,
          ptt: false
        },
        { quoted: m }
      )

      await m.reply(`🎶 *${title}* de *${artist}* enviado como MP3.`)
    } catch (error) {
      console.error('[whatmusic]', error)
      await m.reply(`✘ No pude completar la búsqueda.\n\n> ${error.message}`)
    } finally {
      if (workDir) await fs.rm(workDir, { recursive: true, force: true }).catch(() => {})
    }
  }
}