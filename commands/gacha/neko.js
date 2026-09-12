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
      await m.reply('⏳ Buscando tu neko aleatoria...')

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
        caption: 'Aquí tienes tu neko aleatoria ⊂⁠(⁠(⁠・⁠▽⁠・⁠)⁠)⁠⊃'
      }, { quoted: m })

    } catch (e) {
      console.log(e)
      m.reply('✘ Error al obtener la neko. Inténtalo de nuevo.')
    }
  },
}