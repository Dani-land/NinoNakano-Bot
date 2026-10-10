import fetch from 'node-fetch';
import { format } from 'util';
import { lookup } from 'node:dns';
import { isIP } from 'node:net';
import http from 'node:http';
import https from 'node:https';

const MAX_DOWNLOAD_BYTES = 100 * 1024 * 1024
const httpAgent = new http.Agent({ lookup: safeLookup })
const httpsAgent = new https.Agent({ lookup: safeLookup })

function isPublicIp(address) {
  const family = isIP(address)
  if (family === 4) {
    const [a, b, c] = address.split('.').map(Number)
    return !(
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 192 && b === 0 && c === 0) ||
      (a === 192 && b === 0 && c === 2) ||
      (a === 198 && (b === 18 || b === 19 || b === 51 && c === 100)) ||
      (a === 203 && b === 0 && c === 113)
    )
  }

  if (family === 6) {
    const normalized = address.toLowerCase()
    const firstSegment = Number.parseInt(normalized.split(':')[0] || '0', 16)
    return (firstSegment & 0xe000) === 0x2000 && !normalized.startsWith('2001:db8:')
  }

  return false
}

function safeLookup(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options
    options = {}
  }
  const normalized = String(hostname).replace(/^\[|\]$/g, '').toLowerCase()
  const family = isIP(normalized)
  if (family) {
    if (!isPublicIp(normalized)) return callback(new Error('Las direcciones privadas no están permitidas.'))
    return callback(null, normalized, family)
  }

  if (normalized === 'localhost' || normalized.endsWith('.localhost') || normalized.endsWith('.local')) {
    return callback(new Error('Los hosts locales no están permitidos.'))
  }

  lookup(normalized, { all: true, verbatim: true }, (error, addresses) => {
    if (error) return callback(error)
    const compatibleAddresses = addresses.filter(({ family }) => !options?.family || options.family === family)
    if (!compatibleAddresses.length || compatibleAddresses.some(({ address }) => !isPublicIp(address))) {
      return callback(new Error('El host resuelve a una dirección no pública.'))
    }
    if (options?.all) return callback(null, compatibleAddresses)
    return callback(null, compatibleAddresses[0].address, compatibleAddresses[0].family)
  })
}

function validatePublicUrl(value) {
  const url = new URL(value)
  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Solo se permiten enlaces HTTP o HTTPS públicos.')
  }
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    (isIP(hostname) && !isPublicIp(hostname))
  ) {
    throw new Error('No se permiten direcciones locales o privadas.')
  }
  return url
}

async function fetchPublicUrl(value) {
  let url = validatePublicUrl(value)
  for (let redirectCount = 0; redirectCount <= 3; redirectCount++) {
    const response = await fetch(url.href, {
      redirect: 'manual',
      agent: url.protocol === 'https:' ? httpsAgent : httpAgent,
      timeout: 30000,
      size: MAX_DOWNLOAD_BYTES,
    })

    if (![301, 302, 303, 307, 308].includes(response.status)) {
      if (!response.ok) {
        response.body?.destroy()
        throw new Error(`El servidor respondió con HTTP ${response.status}.`)
      }
      return response
    }

    const location = response.headers.get('location')
    response.body?.destroy()
    if (!location || redirectCount === 3) throw new Error('El enlace tiene demasiadas redirecciones.')
    url = validatePublicUrl(new URL(location, url).href)
  }

  throw new Error('No se pudo seguir el enlace.')
}

export default {
  command: ['get'],
  category: 'utils',

  run: async ({client, m, args}) => {
    const text = args[0];

    if (!text) {
      return m.reply(
`✦ Ingresa un enlace para realizar la solicitud.

✐ Ejemplo:
> ${prefa}get https://example.com/image.jpg`
      );
    }

    if (!/^https?:\/\//i.test(text)) {
      return m.reply(
`✦ Ingresa un enlace válido.

✎ El enlace debe comenzar con:
> https:// o http://`
      );
    }

    try {
      const response = await fetchPublicUrl(text);

      const contentType = response.headers.get('content-type') || '';
      const contentLength = parseInt(response.headers.get('content-length') || '0');

      const responseUrl = response.url || text
      const ext = new URL(responseUrl).pathname.split('.').pop().toLowerCase();

      if (contentLength > MAX_DOWNLOAD_BYTES) {
        throw new Error(`Archivo demasiado grande: ${contentLength} bytes`);
      }

      const buffer = await response.buffer();

      if (
        /image\/(jpeg|png|gif|webp)/.test(contentType) ||
        ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)
      ) {
        return await client.sendMessage(
          m.chat,
          {
            image: buffer,
            caption: `✦ Imagen obtenida correctamente.`
          },
          { quoted: m }
        );
      }

      if (
        /video\/(mp4|webm|ogg)/.test(contentType) ||
        ['mp4', 'webm', 'ogg'].includes(ext)
      ) {
        return await client.sendMessage(
          m.chat,
          {
            video: buffer,
            caption: `✦ Video obtenido correctamente.`
          },
          { quoted: m }
        );
      }

      if (
        /audio\/(mpeg|ogg|mp3|wav)/.test(contentType) ||
        ['mp3', 'wav', 'ogg'].includes(ext)
      ) {
        const mime = contentType.startsWith('audio/') ? contentType : 'audio/mpeg';

        return await client.sendMessage(
          m.chat,
          {
            audio: buffer,
            mimetype: mime
          },
          { quoted: m }
        );
      }

      let content = buffer.toString();

      try {
        content = format(JSON.parse(content));
      } catch (e) {}

      return await m.reply(content);

    } catch (e) {
      console.error('[get] No se pudo descargar el enlace:', e.message || e)
      await m.reply(
`✦ Ocurrió un error al obtener el contenido del enlace.

✎ Verifica que el enlace sea válido y accesible.`
      );
    }
  }
};