import fetch from 'node-fetch';

const DLAPIXY_SPOTIFY = 'https://dlapixy.vercel.app/api/downloads/spotify'

const NEWSLETTER_JID = '120363420575743790@newsletter'
const NEWSLETTER_NAME = 'Nιησ Pʀσʝєᴄтѕ'

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

export default {
  command: ['spotify'],
  category: 'downloader',
  run: async ({client, m, text, }) => {

  if (!text) return m.reply(`✎ Ingresa algún término de búsqueda para buscar tu canción.`);

  try {
    const res = await fetch(DLAPIXY_SPOTIFY, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ url: text }),
    })

    const raw = await res.text()

    // DEBUG: mira en tu consola la forma real de la respuesta si algo falla
    console.log('[spotify] HTTP', res.status, '| respuesta cruda:', raw.slice(0, 1000))

    let data
    try {
      data = JSON.parse(raw)
    } catch (e) {
      return m.reply('✦ La API no devolvió una respuesta válida.')
    }

    if (!data?.ok || !Array.isArray(data.files) || !data.files.length) {
      return m.reply(`✦ ${data?.message || 'No se pudo obtener resultados.'}`)
    }

    const file = data.files[0]
    const downloadUrl = file?.url
    if (!downloadUrl) return m.reply('No se pudo obtener el enlace de descarga.');

    const info = `Descargando... *${data.title}*\n\n` +
                 `> ꕥ Duración › *${data.durationSeconds ? Math.floor(data.durationSeconds / 60) + ':' + String(data.durationSeconds % 60).padStart(2, '0') : 'Desconocida'}*\n` +
                 `> ✧ Calidad › *${file.quality || 'Desconocida'}*\n` +
                 `> ❀︎ Fuente › *${text}*\n\n` +
                 `${dev}`;

    const ctx = newsletterContext()

    if (data.thumbnail) {
      await client.sendMessage(m.chat, { image: { url: data.thumbnail }, caption: info, contextInfo: ctx }, { quoted: m });
    } else {
      await client.sendMessage(m.chat, { text: info, contextInfo: ctx }, { quoted: m });
    }

    // Audio normal (no nota de voz): ptt:true esperaba formato OGG/Opus y
    // rompía la reproducción de los mp3 que da esta API.
    await client.sendMessage(m.chat, {
      audio: { url: downloadUrl },
      ptt: false,
      fileName: `${data.title}.mp3`,
      mimetype: file.mimeType || 'audio/mpeg',
      contextInfo: ctx,
    }, { quoted: m });

  } catch (e) {
    console.log('[spotify] ERROR:', e.message)
    await m.reply(`${msgglobal}`);
  }
}}
