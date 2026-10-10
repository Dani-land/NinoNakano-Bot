import { getBotSettings } from '../lib/system/initDB.js'

export async function before(m, { client }) {
const bot = getBotSettings(client)

    m.rcanal = {
        contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: bot.id,
                newsletterName: bot.nameid,
                serverMessageId: -1,
            }
        }
    }
}