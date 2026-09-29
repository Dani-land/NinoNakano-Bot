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

export async function getCommandPreview({ icon = 'square', title, body }) {
  const thumbnail = await getThumbnail(icon)
  if (!thumbnail) return null

  return {
    title,
    body,
    mediaType: 1,
    renderLargerThumbnail: false,
    previewType: 'PHOTO',
    showAdAttribution: false,
    thumbnail,
  }
}