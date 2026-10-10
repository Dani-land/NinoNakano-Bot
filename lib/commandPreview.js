import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const assetsDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../icons'
)

const iconFiles = {
  square: '9b50ec593b762c3743926af8897be117.jpg',
  portrait: 'f2fc705e9ec3d60f315d082f279fdcc7.jpg',
}

const commandMedia = new Map()

async function getCommandMedia(icon) {
  const variant = iconFiles[icon] ? icon : 'square'
  const filename = iconFiles[variant]
  if (!commandMedia.has(filename)) {
    const mediaPromise = fs.readFile(path.join(assetsDirectory, filename)).then(async (image) => ({
      image,
      thumbnail: await sharp(image)
        .resize(320, 320, { fit: 'cover', position: 'attention' })
        .jpeg({ quality: 90 })
        .toBuffer(),
      fileName: variant === 'portrait' ? 'NinoNakano-vertical.jpg' : 'NinoNakano-icon.jpg',
    }))
    commandMedia.set(filename, mediaPromise)
  }

  try {
    return await commandMedia.get(filename)
  } catch (error) {
    commandMedia.delete(filename)
    console.error(`[command-preview] No se pudo preparar el icono ${filename}:`, error.message)
    return null
  }
}

async function sendCommandImage(client, m, { icon = 'square', caption } = {}) {
  const media = await getCommandMedia(icon)
  if (!media) return null

  try {
    return await client.sendMessage(
      m.chat,
      {
        document: media.image,
        mimetype: 'image/jpeg',
        fileName: media.fileName,
        jpegThumbnail: media.thumbnail,
        ...(caption ? { caption } : {}),
      },
      { quoted: m }
    )
  } catch (error) {
    console.error('[command-preview] No se pudo enviar el icono como archivo:', error.message)
    return null
  }
}

export async function sendCommandIcon(client, m, options = {}) {
  return sendCommandImage(client, m, options)
}

export async function replyWithCommandIcon(client, m, text, options = {}) {
  const sentImage = await sendCommandImage(client, m, { ...options, caption: text })
  return sentImage || m.reply(text)
}