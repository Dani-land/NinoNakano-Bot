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

        const btnId =
          msg.message?.buttonsResponseMessage?.selectedButtonId ||
          msg.message?.templateButtonReplyMessage?.selectedId ||
          msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
          null

        if (btnId && btnId.startsWith('apk_')) {
          const idx = Number(btnId.replace('apk_', ''))
          if (!Number.isNaN(idx) && idx >= 0 && idx < total) return finish(idx)
        }

        const text =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          ''
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
        return sendApk(client, m, results[0])
      }

      const preview = results
        .map((app, i) => `*${i + 1}.* \( {app.name}\n   _ \){app.version} · ${app.size}_`)
        .join('\n\n')

      const sections = [
        {
          title: 'Elige una app',
          rows: results.map((app, i) => ({
            title: `${i + 1}. ${app.name}`.slice(0, 24),
            description: `${app.version} · ${app.size}`.slice(0, 72),
            rowId: `apk_${i}`,
          })),
        },
      ]

      await client.sendMessage(
        m.chat,
        {
          text: [
            `╭─❑ *📦 RESULTADOS PARA "${query.toUpperCase()}"* ❑─╮`,
            '',
            preview,
            '',
            '╰──────────────────╯',
            '_Toca el menú o responde con el número._',
          ].join('\n'),
          footer: '----- APK Downloader -----',
          title: 'Resultados APK',
          buttonText: 'Ver apps',
          sections,
        },
        { quoted: m }
      )

      const chosen = await waitForChoice(client, m, results.length)

      if (chosen === null) {
        return m.reply('⌛ Se acabó el tiempo para elegir. Vuelve a intentarlo con el comando.')
      }

      await sendApk(client, m, results[chosen])
    } catch (e) {
      console.error('[APK] Error:', e?.response?.status, e?.response?.data || e?.message || e)
      m.reply('❌ Error al procesar la solicitud. Intenta de nuevo.')
    }
  },
}