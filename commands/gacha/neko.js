import fetch from 'node-fetch'

const NYXDL_API_KEY = 'nyx_NVRMcX8rP-YsEmGl-lyaLtks680B_ccH'
const NYXDL_NEKO = 'https://nyxdlapi.vercel.app/api/anime/neko?apikey=' + NYXDL_API_KEY

export default {
  command: ['neko', 'nekoaleatoria'],
  category: 'anime',

  run: async function (ctx) {
    var client = ctx.client
    var m = ctx.m
    var text = ctx.text

    try {
      await m.reply('*𖧷* 𝐁𝐮𝐬𝐜𝐚𝐧𝐝𝐨 𝐭𝐮 𝐧𝐞𝐤𝐨 𝐚𝐥𝐞𝐚𝐭𝐨𝐫𝐢𝐚...')

      var res = await fetch(NYXDL_NEKO, {
        headers: {
          accept: 'application/json',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })

      var data = await res.json()

      if (!data || !data.status || !data.result || !data.result.image) {
        return m.reply('✘ No pude encontrar una neko ahora mismo.')
      }

      var imagePath = data.result.image
      var fullImageUrl = 'https://nyxdlapi.vercel.app' + imagePath

      await client.sendMessage(m.chat, {
        image: { url: fullImageUrl },
        caption: '᯽ 𝙰𝚚𝚞𝚒 𝚝𝚒𝚎𝚗𝚎𝚜 𝚝𝚞 𝚗𝚎𝚔𝚘 𝚊𝚕𝚎𝚊𝚝𝚘𝚛𝚒𝚊 ⊂⁠(⁠(⁠・⁠▽⁠・⁠)⁠)⁠⊃'
      }, { quoted: m })

    } catch (e) {
      console.log(e)
      m.reply('✘ Error al obtener la neko. Inténtalo de nuevo.')
    }
  },
}