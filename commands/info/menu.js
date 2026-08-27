import moment from 'moment-timezone'
import { commands } from '../../lib/commands.js'

function titleCase(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/(^|\s)\S/g, s => s.toUpperCase())
}

export default {
  command: ['menu', 'help'],
  category: 'info',

  run: async ({ client, m, args = [], usedPrefix = '.' }) => {
    try {
      const cmdsList = Array.isArray(commands) ? commands : []
      const users = global.db?.data?.users || {}
      const settings = global.db?.data?.settings || {}

      const botId =
        ((client.user?.id || '').split(':')[0] || '') +
        '@s.whatsapp.net'

      const botSettings = settings[botId] || {}

      const owner = botSettings.owner || ''
      const canalId = botSettings.id || ''
      const canalName = botSettings.nameid || ''
      const link = botSettings.link || 'Sin enlace'
      const banner = botSettings.banner || null

      let desar = 'Oculto'

      if (owner && !isNaN(owner.replace(/@s\.whatsapp\.net$/, ''))) {
        const userData = users[owner]
        desar = userData?.genre || 'Oculto'
      }

      const now = new Date()

      const colombianTime = new Date(
        now.toLocaleString('en-US', {
          timeZone: 'America/Bogota',
        })
      )

      const tiempo = colombianTime
        .toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
        .replace(/,/g, '')

      const tiempo2 = moment
        .tz('America/Bogota')
        .format('hh:mm A')

      const jam = moment
        .tz('America/Bogota')
        .format('HH:mm:ss')

      const plugins = cmdsList.length

      const ucapan =
        jam < '05:00:00'
          ? 'Buen día'
          : jam < '11:00:00'
          ? 'Buen día'
          : jam < '15:00:00'
          ? 'Buenas tardes'
          : jam < '18:00:00'
          ? 'Buenas tardes'
          : 'Buenas noches'

      const ownerDisplay = owner
        ? (
            !isNaN(owner.replace(/@s\.whatsapp\.net$/, ''))
              ? `@${owner.split('@')[0]}`
              : owner
          )
        : 'Oculto por privacidad'

      const ownerLabel =
        desar === 'Hombre'
          ? 'Creador'
          : desar === 'Mujer'
          ? 'Creadora'
          : 'Creador(a)'

      let menu = `\n`

      // ───────────── PRESENTACIÓN
      menu += `꒰ 𝙉𝙞𝙣𝙤 𝙒𝙖𝙗𝙤𝙩 ꒱\n`
      menu += `૮꒰˶• ༝ •˶꒱ა  ${ucapan}, ${m.pushName || 'Sin nombre'}\n\n`

      // ───────────── INFORMACIÓN
      menu += `୨୧﹒𝙄𝙣𝙛𝙤\n`

      menu += `⌁ Creador › ${ownerDisplay}\n`
      menu += `⌁ Plugins › ${plugins}\n`
      menu += `⌁ Versión › 3.1.9\n`
      menu += `⌁ Link › ${link}\n`
      menu += `⌁ Fecha › ${tiempo}, ${tiempo2}\n`
      menu += `⌁ Usuarios › ${Object.keys(users).length.toLocaleString()}\n\n`

      const categoryArg = args[0]?.toLowerCase()
      const categories = {}

      for (const command of cmdsList) {
        const category = command.category || 'otros'

        if (!categories[category]) {
          categories[category] = []
        }

        categories[category].push(command)
      }

      if (categoryArg && !categories[categoryArg]) {
        return m.reply(
          `୨୧﹒La categoría *${categoryArg}* no fue encontrada.\n\n` +
          `꒰ঌ Categorías disponibles ໒꒱\n` +
          `${Object.keys(categories)
            .map(c => `⌁ ${c}`)
            .join('\n')}`
        )
      }

      const prefix =
        typeof usedPrefix === 'string' && usedPrefix.length
          ? usedPrefix
          : '.'

      for (const [category, cmds] of Object.entries(categories)) {
        if (
          categoryArg &&
          category.toLowerCase() !== categoryArg
        ) {
          continue
        }

        const catName = titleCase(category)

        menu += `꒰୨୧꒱ 𝙎𝙚𝙘𝙘𝙞𝙤́𝙣 ${catName}\n`

        cmds.forEach(cmd => {
          const aliases = (
            Array.isArray(cmd.alias)
              ? cmd.alias
              : cmd.command || []
          )
            .map(a => {
              const aliasClean = String(a)
                .split(/[\/#!+.\-]+/)
                .pop()
                .toLowerCase()

              return `${prefix}${aliasClean}`
            })
            .join(' ୨୧ ')

          menu += `⌁ ${aliases}`

          if (cmd.uso) {
            menu += ` 〔${cmd.uso}〕`
          }

          menu += `\n`

          if (cmd.desc) {
            menu += `> ${cmd.desc}\n`
          }

          menu += `\n`
        })
      }

      const finalMenu = menu.trim()

      if (banner) {
        await client.sendMessage(
          m.chat,
          {
            image: { url: banner },
            caption: finalMenu,
            contextInfo: {
              mentionedJid: owner ? [owner] : [],
              forwardingScore: 999,
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                newsletterJid: canalId,
                newsletterName: canalName,
                serverMessageId: -1,
              }
            }
          },
          { quoted: m }
        )
      } else {
        await client.sendMessage(
          m.chat,
          {
            text: finalMenu
          },
          { quoted: m }
        )
      }

    } catch (e) {
      console.log(e)
      return m.reply(
        `꒰ঌ Ocurrió un error al generar el menú ໒꒱\n> ${e.message}`
      )
    }
  }
}