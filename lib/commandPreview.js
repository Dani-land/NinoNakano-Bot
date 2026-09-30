import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const assetsDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../icons'
)

const iconFiles = {
  square: '12b3ba3b46efd85136816a6ff200371c.jpg',
  portrait: 'f2fc705e9ec3d60f315d082f279fdcc7.jpg',
}

const thumbnails = new Map()

async function getThumbnail(icon) {
  const filename = iconFiles[icon] ? iconFiles[icon] : iconFiles.square
  if (!thumbnails.has(filename)) {
    const thumbnailPromise = fs
      .readFile(path.join(assetsDirectory, filename))
      .then((image) =>
        sharp(image)
          .resize(96, 96, { fit: 'cover', position: 'attention' })
          .jpeg({ quality: 72 })
          .toBuffer()
      )
    thumbnails.set(filename, thumbnailPromise)
  }

  try {
    return await thumbnails.get(filename)
  } catch (error) {
    thumbnails.delete(filename)
    console.error(`[command-preview] No se pudo cargar la miniatura ${filename}:`, error.message)
    return null
  }
}

async function sendCommandImage(client, m, { icon = 'square', caption } = {}) {
  const image = await getThumbnail(icon)
  if (!image) return null

  try {
    return await client.sendMessage(
      m.chat,
      {
        image,
        ...(caption ? { caption } : {}),
      },
      { quoted: m }
    )
  } catch (error) {
    console.error('[command-preview] No se pudo enviar la imagen:', error.message)
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