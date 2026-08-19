import axios from 'axios'

const NYXDL_API_KEY = 'nyx_NVRMcX8rP-YsEmGl-lyaLtks680B_ccH'
const NYXDL_SEARCH_URL = 'https://nyxdlapi.vercel.app/api/search/aptoide'

function formatSize(size) {
  return size || '—'
}

function prettifyPackageName(pkg) {
  if (!pkg) return 'App desconocida'
  const parts = pkg.split('.')
  const last = parts[parts.length - 1] || pkg
  return last
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

async function searchApk(query, limit = 6) {
  const res = await axios.get(NYXDL_SEARCH_URL, {
    timeout: 15000,
    params: {
      query,
      limit,
      apikey: NYXDL_API_KEY,
    },
  })

  const results = res.data?.result?.results
  if (!res.data?.status || !Array.isArray(results) || !results.length) return []

  return results
    .filter((a) => a?.download)
    .map((a) => ({
      name: a.name || prettifyPackageName(a.packageName),
      packageName: a.packageName,
      version: a.version || 'Desconocida',
      size: formatSize(a.size),
      icon: a.icon || null,
      download: a.download,
      malware: a.malware || null,
    }))
}

async function sendApk(client, m, app) {
  const caption = [
    `✦ *${app.name}*`,
    `✧ Paquete  › \`${app.packageName}\``,
    `✧ Versión  › *${app.version}*`,
    `✧ Tamaño   › *${app.size}*`,
    `✐ Enviando APK...`,
  ].join('\n')

  if (app.icon) {
    await client.sendMessage(m.chat, { image: { url: app.icon }, caption }, { quoted: m })
  } else {
    await client.sendMessage(m.chat, { text: caption }, { quoted: m })
  }

  const safeName = (app.name || 'app').replace(/[^\w\s-]/gi, '').trim() || 'app'

  await client.sendMessage(
    m.chat,
    {
      document: { url: app.download },
      fileName: `${safeName}.apk`,
      mimetype: 'application/vnd.android.package-archive',
    },
    { quoted: m }
  )
}

function waitForChoice(client, m, total, timeoutMs = 60000) {
  return new Promise((resolve) => {
    let done = false

    const finish = (value) => {
      if (done) return
      done = true
      clearTimeout(timer)
      client.ev.off('messages.upsert', onUpsert)
      resolve(value)
    }

    const timer = setTimeout(() => finish(null), timeoutMs)

    const onUpsert = ({ messages }) => {
      for (const msg of messages || []) {
        if (!msg.message) continue
        if (msg.key?.remoteJid !== m.chat) continue
        const sender = msg.key.participant || msg.key.remoteJid
        if (m.sender && sender !== m.sender) continue

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ''
        const num = Number(text.trim())
        if (!Number.isNaN(num) && num >= 1 && num <= total) return finish(num - 1)
      }
    }

    client.ev.on('messages.upsert', onUpsert)
  })
}

export default {
  command: ['aptoide', 'apk', 'apkdl'],
  category: 'search',

  run: async ({ client, m, args }) => {
    if (!args.length) {
      return m.reply('✧ Ingresa el nombre de una aplicación o juego.')
    }

    const query = args.join(' ').trim()

    try {
      const results = await searchApk(query, 6)

      if (!results.length) {
        return m.reply('✘ No encontré ninguna aplicación con ese nombre.')
      }

      if (results.length === 1) {
        const app = results[0]
        if (app.malware && app.malware !== 'TRUSTED' && app.malware !== 'WARNING') {
          return m.reply('✘ Esa app fue marcada como insegura, no la voy a enviar.')
        }
        return sendApk(client, m, app)
      }

      const NUM_EMOJI = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣']

      const preview = results
        .map((app, i) => {
          const flag = app.malware === 'WARNING' ? ' ⚠️' : ''
          return `${NUM_EMOJI[i] || `${i + 1}.`} *${app.name}*${flag}\n     _${app.version} · ${app.size}_`
        })
        .join('\n\n')

      await client.sendMessage(
        m.chat,
        {
          text: [
            `╭─❑ *📦 RESULTADOS PARA "${query.toUpperCase()}"* ❑─╮`,
            '',
            preview,
            '',
            '╰──────────────────╯',
            `_Responde con el número del juego que quieras (1-${results.length})._`,
          ].join('\n'),
        },
        { quoted: m }
      )

      const chosen = await waitForChoice(client, m, results.length)

      if (chosen === null) {
        return m.reply('⌛ Se acabó el tiempo para elegir. Vuelve a intentarlo con el comando.')
      }

      const app = results[chosen]
      if (app.malware && app.malware !== 'TRUSTED' && app.malware !== 'WARNING') {
        return m.reply('✘ Esa app fue marcada como insegura, no la voy a enviar.')
      }

      await sendApk(client, m, app)
    } catch (e) {
      console.error('[APK] Error:', e?.response?.status, e?.response?.data || e?.message || e)
      m.reply('❌ Error al procesar la solicitud. Intenta de nuevo.')
    }
  },
}
