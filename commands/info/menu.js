import moment from 'moment-timezone'
import { commands } from '../../lib/commands.js'

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
      var settings = (global.db && global.db.data && global.db.data.settings) || {}

      var botId = ((client.user && client.user.id) || '').split(':')[0] || ''
      botId = botId + '@s.whatsapp.net'
      var botSettings = settings[botId] || {}

      var owner = botSettings.owner || ''
      var canalId = botSettings.id || '120363420575743790@newsletter'
      var canalName = botSettings.nameid || 'ミ★ 𝙉𝙞𝙣𝙤 𝙐𝙥𝙙𝙖𝙩𝙚𝙨 ★彡'
      var link = botSettings.link || ''
      var banner = botSettings.banner || null

      var desar = 'Oculto'
      if (owner && !isNaN(owner.replace(/@s\.whatsapp\.net$/, ''))) {
        var userData = users[owner]
        desar = (userData && userData.genre) || 'Oculto'
      }

      var tiempo = moment.tz('America/Bogota').format('DD MMM YYYY')
      var hora = moment.tz('America/Bogota').format('hh:mm A')
      var jam = moment.tz('America/Bogota').format('HH:mm:ss')
      var plugins = cmdsList.length

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

      var menu = ''
      menu += '𓆩ꨄ︎𓆪  *Nino Nakano Wabot*  𓆩ꨄ︎𓆪\n\n'
      menu += saludo + ', *' + name + '*\n'
      menu += 'Aquí tienes el menú completo 🐢\n\n'

      menu += '‧₊˚ ɪɴғᴏ ᴅᴇʟ ʙᴏᴛ\n'
      menu += '  ⟡  ' + ownerLabel + '  ·  ' + ownerDisplay + '\n'
      menu += '  ⟡  Plugins  ·  ' + plugins + '\n'
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
      var marks = ['✦', '✧', '✶', '✧', '⋆']

      for (var c = 0; c < catKeys.length; c++) {
        var cat = catKeys[c]
        if (categoryArg && cat.toLowerCase() !== categoryArg) continue

        var cmds = categories[cat]
        var mark = marks[c % marks.length]

        menu += '———————— ✦ ————————\n\n'
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
            .filter(Boolean)

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

      menu += '———————— ✦ ————————\n\n'
      menu += 'Filtra › *' + prefix + 'menu <categoría>*\n'
      menu += 'Ejemplo › *' + prefix + 'menu downloader*\n\n'
      menu += 'Listo para usar 🐢'

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

      if (banner) {
        await client.sendMessage(
          m.chat,
          {
            image: { url: banner },
            caption: menu.trim(),
            contextInfo: ctxInfo,
          },
          { quoted: m }
        )
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