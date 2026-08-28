import fetch from 'node-fetch'

const DVYER_API_KEY = 'dvyer2008'
const DVYER_PIN_SEARCH = 'https://dv-yer-api.online/pinterest/search'

async function searchPinterest(query, limit) {
  const url =
    DVYER_PIN_SEARCH +
    '?q=' +
    encodeURIComponent(query) +
    '&limit=' +
    encodeURIComponent(limit) +
    '&apikey=' +
    encodeURIComponent(DVYER_API_KEY)

  const res = await fetch(url)
  const text = await res.text()

  if (!res.ok) {
    throw new Error('dv-yer HTTP ' + res.status + ': ' + text.slice(0, 200))
  }

  let json
  try {
    json = JSON.parse(text)
  } catch (e) {
    throw new Error('Respuesta inválida de dv-yer: ' + text.slice(0, 200))
  }

  const results = (json && json.results) || []
  if (!json || (json.ok !== true && !results.length)) {
    throw new Error((json && json.message) || 'No se encontraron resultados.')
  }
  if (!results.length) {
    throw new Error('No se encontraron resultados.')
  }

  return results
}

async function downloadImage(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
      Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    },
  })
  if (!res.ok) throw new Error('No se pudo descargar la imagen (HTTP ' + res.status + ')')
  const buffer = await res.buffer()
  if (!buffer || buffer.length < 500) throw new Error('Imagen vacía o inválida')
  return buffer
}

function pickImage(v) {
  return (
    (v && (v.download_url_full || v.download_url || v.url || v.direct_url)) ||
    null
  )
}

export default {
  command: ['pinterest', 'pin'],
  category: 'search',

  run: async function (ctx) {
    const client = ctx.client
    const m = ctx.m
    const args = ctx.args || []
    const text = args.join(' ')

    if (!text) {
      return m.reply(
        '✐ Ingresa un término de búsqueda.\n\n' +
          '✰ Ejemplo:\n' +
          '.pin anime icons\n' +
          '.pinterest Hatsune Miku\n' +
          '.pin nino nakano 10'
      )
    }

    let limit = 10
    let query = text
    const lastArg = args[args.length - 1]

    if (lastArg && !isNaN(lastArg) && String(lastArg).trim() !== '') {
      limit = parseInt(lastArg, 10)
      if (limit > 15) limit = 15
      if (limit < 1) limit = 1
      query = args.slice(0, -1).join(' ')
    }

    if (!query.trim()) {
      return m.reply('✐ Ingresa un término de búsqueda antes del número.')
    }

    try {
      await m.reply('*꒰୨୧꒱* Buscando tus imágenes en *Pinterest*...')

      const results = await searchPinterest(query, limit)
      const slice = results.slice(0, limit)

      const albumItems = []
      let omitidos = 0

      for (let i = 0; i < slice.length; i++) {
        const v = slice[i]
        const imgUrl = pickImage(v)
        if (!imgUrl) {
          omitidos++
          continue
        }

        try {
          const buffer = await downloadImage(imgUrl)
          const caption =
            '✿ Pinterest Search\n\n' +
            '⌗» ' +
            (i + 1) +
            '. ' +
            (v.title || 'Sin título') +
            '\n' +
            '☕︎ Búsqueda › ' +
            query

          albumItems.push({
            image: buffer,
            caption: caption,
          })
        } catch (e) {
          console.log('[pinterest] omitida:', e.message)
          omitidos++
        }
      }

      if (!albumItems.length) {
        return m.reply(
          '✘ No se pudo descargar ninguna imagen. Revisa la API o las URLs.'
        )
      }

      try {
        await client.sendMessage(
          m.chat,
          {
            album: albumItems,
          },
          { quoted: m }
        )
      } catch (albumErr) {
        console.log('[pinterest] album falló, enviando una por una:', albumErr.message)

        for (let i = 0; i < albumItems.length; i++) {
          try {
            await client.sendMessage(
              m.chat,
              {
                image: albumItems[i].image,
                caption: albumItems[i].caption,
              },
              { quoted: m }
            )
            await new Promise(function (r) {
              setTimeout(r, 500)
            })
          } catch (e) {
            console.log('[pinterest] fallo individual:', e.message)
          }
        }
      }

      if (omitidos > 0) {
        await m.reply(
          '✓ Enviadas *' +
            albumItems.length +
            '* imágenes' +
            (omitidos ? ' (' + omitidos + ' omitidas)' : '') +
            '.'
        )
      }
    } catch (e) {
      console.log('[pinterest]', e.message)
      m.reply('✘ Error al buscar en Pinterest.\n\n⌗» ' + e.message)
    }
  },
}