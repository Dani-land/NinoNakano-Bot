import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const assetsDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../attached_assets'
)

const iconFiles = {
  square: '43651c8090e93849843c0d42bc4e4763_1790720761554.jpg',
  portrait: 'd40a8dd6d169ba7e57741deeac51ddd1_1790720761500.jpg',
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