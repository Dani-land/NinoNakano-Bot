import axios from 'axios'

const APTOIDE_API_URL = 'https://nyxdlapi.vercel.app/api/search/aptoide'
const APTOIDE_API_KEY = 'nyx_NVRMcX8rP-YsEmGl-lyaLtks680B_ccH'

const pendingSelections = new Map()

async function searchApk(query, limit = 10) {
  const res = await axios.get(APTOIDE_API_URL, {
    timeout: 15000,
    params: {
      q: query,
      limit,
      apikey: APTOIDE_API_KEY,
    },
  })

  const data = res.data
  if (!data?.status) throw new Error(data?.message || 'La API no devolvió resultados')

  const results = data.result?.results
  if (!Array.isArray(results) || !results.length) return []

  return results
}

function limpiarSelecciones() {
  const ahora = Date.now()
  for (const [key, val] of pendingSelections) {
    if (ahora - val.timestamp > 60000) pendingSelections.delete(key)
  }
}

export default {
  command: ['aptoide', 'apk', 'apkdl'],
  category: 'search',

  run: async ({ client, m, args }) => {
    if (!args.length) {
      return m.reply('✧ Ingresa el nombre de una aplicación o juego.')
    }

    const query = args.join(' ').trim()

    let results
    try {
      results = await searchApk(query, 10)
    } catch (e) {
      console.error('[APK] Error búsqueda:', e?.response?.status, e?.response?.data || e?.message || e)
      return m.reply('❌ Error al buscar. Intenta de nuevo.')
    }

    if (!results.length) {
      return m.reply('✘ No encontré ninguna aplicación con ese nombre.')
    }

    const top = results.slice(0, 5)

    const rows = top.map((app, i) => ({
      title: app.packageName || `Resultado ${i + 1}`,
      description: `v${app.version || '?'} · ${app.size || '—'} · ${app.malware || 'SIN VERIFICAR'}`,
      rowId: `apk_select_${i}`,
    }))

    const listMessage = {
      text: `𐙚 Encontré *${top.length}* resultado(s) para "*${query}*".\nElige cuál quieres que te envíe:`,
      footer: 'NyxDLaPI',
      title: 'Resultados de búsqueda',
      buttonText: 'Ver lista',
      sections: [
        {
          title: 'Aplicaciones encontradas',
          rows,
        },
      ],
    }

    await client.sendMessage(m.chat, listMessage, { quoted: m })

    limpiarSelecciones()
    const selectionKey = `${m.chat}_${m.sender}`
    pendingSelections.set(selectionKey, { results: top, query, timestamp: Date.now() })
  },

  // Esto asume que tu bot dispara un evento/handler para
  // listResponseMessage y te pasa 'm' con esa estructura. Si tu framework
  // maneja las respuestas de listas distinto, dime cómo y lo adapto.
  onListResponse: async ({ client, m }) => {
    const selectionKey = `${m.chat}_${m.sender}`
    const pending = pendingSelections.get(selectionKey)
    if (!pending) return

    const rowId = m.message?.listResponseMessage?.singleSelectReply?.selectedRowId
    if (!rowId || !rowId.startsWith('apk_select_')) return

    const index = parseInt(rowId.replace('apk_select_', ''), 10)
    const data = pending.results[index]
    pendingSelections.delete(selectionKey)

    if (!data) return m.reply('❌ Selección inválida.')

    if (data.malware === 'MALWARE') {
      return m.reply('✘ Aptoide marcó esta app directamente como *MALWARE*. No la voy a enviar por seguridad.')
    }

    const caption = [
      `𐙚 *${data.packageName}*`,
      `⛁ Versión  › *${data.version}*`,
      `⎘ Tamaño   › *${data.size}*`,
      `⚠ Estado   › *${data.malware || 'SIN VERIFICAR'}*`,
      `✐ Enviando APK...`,
    ].join('\n')

    try {
      if (data.icon) {
        await client.sendMessage(m.chat, { image: { url: data.icon }, caption }, { quoted: m })
      } else {
        await client.sendMessage(m.chat, { text: caption }, { quoted: m })
      }

      const safeName = data.packageName.replace(/[^\w.-]/gi, '') || 'app'

      await client.sendMessage(
        m.chat,
        {
          document: { url: data.download },
          fileName: `${safeName}.apk`,
          mimetype: 'application/vnd.android.package-archive',
        },
        { quoted: m }
      )
    } catch (e) {
      console.error('[APK] Error al enviar:', e?.message || e)
      m.reply('❌ Error al enviar el archivo. Intenta de nuevo.')
    }
  },
}
