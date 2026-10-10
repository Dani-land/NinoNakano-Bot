import fs from 'fs';
import path from 'path';
import {jidDecode} from '@whiskeysockets/baileys';
import { isSocketOwner } from '../../lib/utils.js'
import { getBotSettings } from '../../lib/system/initDB.js'

export default {
  command: ['logout'],
  category: 'socket',
  run: async ({ client, m, usedPrefix }) => {
    if (!isSocketOwner(client, m, getBotSettings(client))) {
      return m.reply(mess.socket)
    }

    const rawId = client.user?.id || ''
    const decoded = jidDecode(rawId)
    const cleanId = decoded?.user || rawId.split('@')[0]

    const sessionTypes = ['Subs']
    const basePath = 'Sessions'
    const sessionPath = sessionTypes
      .map((type) => path.join(basePath, type, cleanId))
      .find((p) => fs.existsSync(p))

    if (!sessionPath) {
      return m.reply('『✐』 Este comando solo puede usarse desde un socket secundario del bot.')
    }

    try {
      await m.reply('☕︎ Cerrando sesión del Socket...')
      await client.logout()

      setTimeout(() => {
        if (fs.existsSync(sessionPath)) {
          fs.rmSync(sessionPath, { recursive: true, force: true })
          console.log(`『✐』 Sesión de ${cleanId} eliminada de ${sessionPath}`)
        }
      }, 2000)

      setTimeout(() => {
         m.reply(`ꕥ Sesión finalizada correctamente.\nPuedes reconectarte usando *${usedPrefix || prefa}code*`)
      }, 3000)
    } catch (err) {
      await m.reply(msgglobal)
    }
  },
};
