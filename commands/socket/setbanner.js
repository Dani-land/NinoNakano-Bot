import fetch from 'node-fetch'
import FormData from 'form-data'
import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { isSocketOwner } from '../../lib/utils.js'
import { getBotSettings } from '../../lib/system/initDB.js'

const NYXDL_UPLOAD =
  'https://nyxdlapi.vercel.app/api/tools/tourl?apikey=nyx_NVRMcX8rP-YsEmGl-lyaLtks680B_ccH'
const execFileAsync = promisify(execFile)
const MAX_BANNER_BYTES = 25 * 1024 * 1024

async function uploadToNyxDL(buffer, mime) {
  const ext = (mime && mime.split('/')[1]) || 'bin'
  const form = new FormData()

  form.append('file', buffer, {
    filename: 'banner.' + ext,
    contentType: mime || 'application/octet-stream',
  })

  const res = await fetch(NYXDL_UPLOAD, {
    method: 'POST',
    body: form,
    headers: form.getHeaders(),
  })

  const text = await res.text()

  if (!res.ok) {
    throw new Error('NyxDL HTTP ' + res.status + ': ' + text.slice(0, 180))
  }

  let data
  try {
    data = JSON.parse(text)
  } catch (e) {
    throw new Error('NyxDL no devolvió JSON: ' + text.slice(0, 180))
  }

  if (!data || !data.status) {
    throw new Error((data && data.message) || 'Falló la subida a NyxDL')
  }

  const file =
    data.result && data.result.files && data.result.files[0]
      ? data.result.files[0]
      : null

  const url =
    (file && (file.url || file.shortUrl)) ||
    (data.result && (data.result.url || data.result.shortUrl)) ||
    null

  if (!url || !String(url).startsWith('http')) {
    throw new Error('NyxDL no devolvió una URL válida')
  }

  return url
}

async function convertGifToMp4(buffer) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'bot-banner-'))
  const inputPath = path.join(tempDir, 'banner.gif')
  const outputPath = path.join(tempDir, 'banner.mp4')

  try {
    await writeFile(inputPath, buffer)
    await execFileAsync(
      'ffmpeg',
      [
        '-y',
        '-v',
        'error',
        '-i',
        inputPath,
        '-an',
        '-vf',
        'fps=15,scale=trunc(iw/2)*2:trunc(ih/2)*2',
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        '28',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        outputPath,
      ],
      { timeout: 30000, maxBuffer: 2 * 1024 * 1024 }
    )
    const converted = await readFile(outputPath)
    if (!converted.length) throw new Error('La conversión del GIF quedó vacía.')
    if (converted.length > MAX_BANNER_BYTES) {
      throw new Error('El GIF convertido supera el límite de 25 MB.')
    }
    return converted
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

function getDirectLinkType(value) {
  let extension = ''
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null
    extension = url.pathname.split('.').pop().toLowerCase()
  } catch {
    return null
  }

  if (['jpg', 'jpeg', 'png', 'webp'].includes(extension)) return 'image'
  if (['mp4', 'm4v'].includes(extension)) return 'video'
  return null
}

export default {
  command: ['setbanner', 'setmenubanner'],
  category: 'socket',

  run: async function (ctx) {
    var client = ctx.client
    var m = ctx.m
    var args = ctx.args || []

    const config = getBotSettings(client)

    if (!isSocketOwner(client, m, config)) {
      return m.reply(mess.socket)
    }

    const value = args.join(' ').trim()

    if (!value && !m.quoted && !m.message.imageMessage && !m.message.videoMessage) {
      return m.reply(
        '⌗ 𝗦𝗘𝗧 • 𝗕𝗔𝗡𝗡𝗘𝗥\n\n' +
          '✦ Envía o responde una imagen, GIF o video MP4.\n' +
          '✧ También puedes pegar un link directo a JPG, PNG, WEBP, MP4 o M4V.\n\n' +
          '❍ Ejemplo:\n> setbanner https://ejemplo.com/banner.jpg'
      )
    }

    if (/^https?:\/\//i.test(value)) {
      const linkType = getDirectLinkType(value)
      if (!linkType) {
        return m.reply(
          '✦ El link debe terminar en JPG, PNG, WEBP, MP4 o M4V. ' +
          'Para un GIF animado, envíalo como archivo para convertirlo a video compatible.'
        )
      }
      config.banner = value
      config.bannerType = linkType
      return m.reply(
        '⌗ 𝗕𝗔𝗡𝗡𝗘𝗥 • 𝗔𝗖𝗧𝗨𝗔𝗟𝗜𝗭𝗔𝗗𝗢\n\n' +
          '✦ Banner de *' +
          (config.namebot2 || 'el bot') +
          '* guardado.'
      )
    }

    const q = m.quoted
      ? m.quoted
      : m.message.imageMessage || m.message.videoMessage
        ? m
        : null

    if (!q) return m.reply('✦ Responde a una imagen/video o envía un link.')

    const mime = (q.msg || q).mimetype || q.mediaType || ''

    if (!/^(image\/(png|jpe?g|gif|webp)|video\/mp4)$/i.test(mime)) {
      return m.reply('✦ Usa JPG, PNG, GIF, WEBP o MP4.')
    }

    try {
      const media = await q.download()
      if (!media) return m.reply('✦ No se pudo descargar el archivo.')
      if (media.length > MAX_BANNER_BYTES) {
        return m.reply('✦ El archivo supera el límite de 25 MB.')
      }

      await m.reply('⏳ Subiendo banner...')

      const isGif = mime.toLowerCase() === 'image/gif'
      const uploadBuffer = isGif ? await convertGifToMp4(media) : media
      const uploadMime = isGif ? 'video/mp4' : mime
      const link = await uploadToNyxDL(uploadBuffer, uploadMime)
      config.banner = link
      config.bannerType = isGif ? 'gif' : mime.toLowerCase() === 'video/mp4' ? 'video' : 'image'

      return m.reply(
        '⌗ 𝗕𝗔𝗡𝗡𝗘𝗥 • 𝗔𝗖𝗧𝗨𝗔𝗟𝗜𝗭𝗔𝗗𝗢\n\n' +
          '✦ Banner de *' +
          (config.namebot2 || 'el bot') +
          '* listo.\n' +
          (isGif ? '✧ GIF convertido a video animado compatible.\n' : '') +
          '✧ Subido con NyxDL.\n\n' +
          link
      )
    } catch (e) {
      console.error('[setbanner]', e)
      return m.reply('✘ Error al subir el banner.\n\n> ' + e.message)
    }
  },
}