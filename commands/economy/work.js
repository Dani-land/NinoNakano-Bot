export default {
  command: ['w', 'work'],
  category: 'rpg',

  run: async ({ client, m }) => {
    const chat = global.db.data.chats[m.chat]
    const user = chat.users[m.sender]
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const monedas = global.db.data.settings[botId].currency

    if (chat.adminonly || !chat.rpg)
      return m.reply(`✦ Los comandos de economía están desactivados en este grupo.`)

    if (!user.workCooldown) user.workCooldown = 0

    const remainingTime = user.workCooldown - Date.now()

    if (remainingTime > 0) {
      return m.reply(
`ꕤ Ya terminaste tu jornada.

✧ Disponible nuevamente en
> *${msToTime(remainingTime)}*`
      )
    }

    const rsl = Math.floor(Math.random() * 5000)

    user.workCooldown = Date.now() + 10 * 60 * 1000
    user.coins += rsl

    await client.sendMessage(
      m.chat,
      {
        text:
`ᰔᩚ Jornada completada

${pickRandom(trabajo)}

❀ Recompensa › *¥${rsl.toLocaleString()} ${monedas}*
⛁ Estado › Trabajo finalizado con éxito.

꒰୨୧꒱ Vuelve más tarde para seguir ganando dinero.`
      },
      { quoted: m }
    )
  }
}

function msToTime(duration) {
  const seconds = Math.floor((duration / 1000) % 60)
  const minutes = Math.floor((duration / (1000 * 60)) % 60)

  const min = minutes < 10 ? '0' + minutes : minutes
  const sec = seconds < 10 ? '0' + seconds : seconds

  return min === '00'
    ? `${sec} segundo${sec > 1 ? 's' : ''}`
    : `${min} minuto${min > 1 ? 's' : ''}, ${sec} segundo${sec > 1 ? 's' : ''}`
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)]
}

const trabajo = [
  "✦ Trabajaste como recolector de fresas.",
  "❀ Diseñaste una página web.",
  "✧ Atendiste una cafetería.",
  "ꕤ Fuiste fotógrafo en un evento.",
  "✦ Preparaste sushi en un restaurante.",
  "❀ Trabajaste como repartidor.",
  "✧ Pintaste un mural artístico.",
  "꒰୨୧꒱ Fuiste DJ en una fiesta.",
  "✦ Reparaste vehículos en un taller.",
  "❀ Creaste contenido viral.",
  "✧ Atendiste una librería.",
  "ꕤ Ayudaste en un refugio de animales.",
  "✦ Guiaste turistas por la ciudad.",
  "❀ Preparaste cafés como barista.",
  "✧ Diseñaste un logotipo.",
  "꒰୨୧꒱ Trabajaste como mecánico.",
  "✦ Guiaste una expedición de montaña.",
  "❀ Cocinaste para un cliente exclusivo.",
  "✧ Organizaste un gran evento.",
  "ꕤ Editaste un video profesional."
]