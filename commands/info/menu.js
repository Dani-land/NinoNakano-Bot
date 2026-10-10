import moment from 'moment-timezone'
import { commands } from '../../lib/commands.js'
import { sendCommandIcon } from '../../lib/commandPreview.js'
import { getBotSettings, getBannerMediaType, getBannerMimeType } from '../../lib/system/initDB.js'

function titleCase(text) {
  text = text || ''
  return String(text)
    .toLowerCase()
    .replace(/(^|\s)\S/g, function (s) {
      return s.toUpperCase()
    })
}

function cleanAlias(a) {
  return String(a || '')
    .split(/[\/#!+.\-]+/)
    .pop()
    .toLowerCase()
}

export default {
  command: ['menu', 'help', 'comandos', 'menucompleto'],
  category: 'info',

  run: async function (ctx) {
    var client = ctx.client
    var m = ctx.m
    var args = ctx.args || []
    var usedPrefix = ctx.usedPrefix || '.'

    try {
      var cmdsList = Array.isArray(commands) ? commands : []
      var users = (global.db && global.db.data && global.db.data.users) || {}
      var botSettings = getBotSettings(client)

      var owner = botSettings.owner || ''
      var canalId = botSettings.id
      var canalName = botSettings.nameid
      var link = botSettings.link
      var banner = botSettings.banner

      var desar = 'Oculto'
      if (owner && !isNaN(owner.replace(/@s\.whatsapp\.net$/, ''))) {
        var userData = users[owner]
        desar = (userData && userData.genre) || 'Oculto'
      }

      var tiempo = moment.tz('America/Bogota').format('DD MMM YYYY')
      var hora = moment.tz('America/Bogota').format('hh:mm A')
      var jam = moment.tz('America/Bogota').format('HH:mm:ss')
      var commandsCount = global.comandos instanceof Map ? global.comandos.size : cmdsList.length

      var saludo =
        jam < '12:00:00' ? 'Buenos días' : jam < '19:00:00' ? 'Buenas tardes' : 'Buenas noches'

      var ownerDisplay = owner
        ? !isNaN(owner.replace(/@s\.whatsapp\.net$/, ''))
          ? '@' + owner.split('@')[0]
          : owner
        : 'Privado'

      var ownerLabel =
        desar === 'Hombre' ? 'Creador' : desar === 'Mujer' ? 'Creadora' : 'Creador(a)'

      var prefix =
        typeof usedPrefix === 'string' && usedPrefix.length ? usedPrefix : '.'

      var name = m.pushName || 'Usuario'
      var botDisplayName = botSettings.namebot2 || botSettings.namebot

      var menu = ''
      menu += '☁︎  ' + botDisplayName + '  ☁︎\n\n'
      menu += saludo + ', *' + name + '*\n'
      menu += '᪥ 𝓐𝓺𝓾𝓲 𝓽𝓲𝓮𝓷𝓮𝓼 𝓮𝓵 𝓶𝓮𝓷𝓾 𝓬𝓸𝓶𝓹𝓵𝓮𝓽𝓸 ᪥\n\n'

      menu += '‧₊˚ ɪɴғᴏ ᴅᴇʟ ʙᴏᴛ\n'
      menu += '  ⟡  ' + ownerLabel + '  ·  ' + ownerDisplay + '\n'
      menu += '  ⟡  Comandos  ·  ' + commandsCount + '\n'
      menu += '  ⟡  Versión  ·  3.1.9\n'
      menu += '  ⟡  Fecha  ·  ' + tiempo + ' · ' + hora + '\n'
      menu += '  ⟡  Users  ·  ' + Object.keys(users).length.toLocaleString() + '\n'
      if (canalName) menu += '  ⟡  Canal  ·  ' + canalName + '\n'
      if (link) menu += '  ⟡  Link  ·  ' + link + '\n'
      menu += '\n'

      var categories = {}
      for (var i = 0; i < cmdsList.length; i++) {
        var command = cmdsList[i]
        var category = command.category || 'otros'
        if (!categories[category]) categories[category] = []
        categories[category].push(command)
      }

      var categoryArg = args[0] ? String(args[0]).toLowerCase() : ''

      if (categoryArg && !categories[categoryArg]) {
        return m.reply(
          '✘ Categoría *' +
            categoryArg +
            '* no encontrada.\n\nDisponibles:\n' +
            Object.keys(categories)
              .map(function (c) {
                return '• ' + c
              })
              .join('\n')
        )
      }

      var catKeys = Object.keys(categories).sort()
      var marks = ['𖧷', '❁', '✶', '✧', '⋆']

      for (var c = 0; c < catKeys.length; c++) {
        var cat = catKeys[c]
        if (categoryArg && cat.toLowerCase() !== categoryArg) continue

        var cmds = categories[cat]
        var mark = marks[c % marks.length]

        menu += '———————— 🝮︎︎︎︎︎︎︎ ————————\n\n'
        menu += mark + '  *' + titleCase(cat) + '*\n'
        menu += '   comandos de esta sección\n\n'

        for (var j = 0; j < cmds.length; j++) {
          var cmd = cmds[j]
          var rawAliases = Array.isArray(cmd.alias)
            ? cmd.alias
            : Array.isArray(cmd.command)
              ? cmd.command
              : []

          var aliases = rawAliases
            .map(function (a) {
              return cleanAlias(a)
            })
            .filter(function (alias) {
              return Boolean(alias) && (!(global.comandos instanceof Map) || global.comandos.has(alias))
            })

          if (!aliases.length) continue

          var shown = aliases.slice(0, 3).map(function (a) {
            return '`' + prefix + a + '`'
          })

          menu += '  ◈  ' + shown.join('  ·  ')
          if (cmd.uso) menu += '  _' + cmd.uso + '_'
          menu += '\n'

          if (cmd.desc) {
            menu += '      ╰ ' + cmd.desc + '\n'
          }
          menu += '\n'
        }
      }

      menu += '———————— 🝮︎︎︎︎︎︎︎ ————————\n\n'
      menu += 'Filtra › *' + prefix + 'menu <categoría>*\n'
      menu += 'Ejemplo › *' + prefix + 'menu downloader*\n\n'
      menu += 'Listo para usar シ︎'

      var ctxInfo = {
        mentionedJid: owner ? [owner] : [],
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: canalId,
          newsletterName: canalName,
          serverMessageId: -1,
        },
      }
      await sendCommandIcon(client, m, { icon: 'square' })

      if (banner) {
        const mediaType = getBannerMediaType(botSettings)
        const media = mediaType === 'image'
          ? { image: { url: banner } }
          : {
              video: { url: banner },
              mimetype: getBannerMimeType(botSettings),
              ...(mediaType === 'gif' ? { gifPlayback: true } : {}),
            }
        try {
          await client.sendMessage(
            m.chat,
            { ...media, caption: menu.trim(), contextInfo: ctxInfo },
            { quoted: m }
          )
        } catch (mediaError) {
          console.error('[menu] No se pudo enviar el banner configurado:', mediaError)
          await client.sendMessage(
            m.chat,
            { text: menu.trim(), contextInfo: ctxInfo },
            { quoted: m }
          )
        }
      } else {
        await client.sendMessage(
          m.chat,
          {
            text: menu.trim(),
            contextInfo: ctxInfo,
          },
          { quoted: m }
        )
      }
    } catch (e) {
      console.log(e)
      return m.reply('✘ Error al generar el menú.\n> ' + e.message)
    }
  },
}