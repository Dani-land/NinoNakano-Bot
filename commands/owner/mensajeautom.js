const OWNER_NUMBER = '12602764655'

function isOwner(jid = '') {
  const number = jid.split('@')[0].split(':')[0]
  return number === OWNER_NUMBER
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function sendToAllGroupsOf(sock, text, label) {
  let groups
  try {
    groups = await sock.groupFetchAllParticipating()
  } catch (e) {
    console.log(`[infoatodos] error obteniendo grupos de ${label}:`, e.message)
    return { sent: 0, failed: 0, total: 0 }
  }

  const groupIds = Object.keys(groups)
  let sent = 0
  let failed = 0

  for (const groupId of groupIds) {
    try {
      const group = groups[groupId]
      const participants = (group.participants || []).map((p) => p.id)

      const caption = `߷ ᗰᗴᑎՏᗩᒍᗴ ᗩᑌTOᗰᗩTIᑕO ᗪᗴᒪ ᑕᖇᗴᗩᗪOᖇ ߷\n\n${text}`

      await sock.sendMessage(groupId, {
        text: caption,
        mentions: participants,
      })

      sent++
    } catch (e) {
      console.log(`[infoatodos] falló en ${groupId} (${label}):`, e.message)
      failed++
    }

    // Pausa entre envíos para no saturar / evitar baneo por spam
    await sleep(2000)
  }

  return { sent, failed, total: groupIds.length }
}

export default {
  command: ['infoatodos'],
  category: 'owner',

  run: async ({ client, m, text }) => {
    if (!isOwner(m.sender)) {
      return m.reply('✘ Este comando solo puede usarlo el creador del bot.')
    }

    if (!text?.trim()) {
      return m.reply('✐ Escribe el mensaje que quieres enviar a todos los grupos.\n\n› Ejemplo: *#infoatodos Hola, ¿cómo están?*')
    }

    const subBots = Array.isArray(global.conns) ? global.conns : []

    await m.reply(
      `✐ Enviando mensaje al bot principal${subBots.length ? ` y a *${subBots.length}* sub-bot(s)` : ''}, espera...`
    )

    let totalSent = 0
    let totalFailed = 0
    let totalGroups = 0

    const principal = await sendToAllGroupsOf(client, text, 'principal')
    totalSent += principal.sent
    totalFailed += principal.failed
    totalGroups += principal.total

    for (const sock of subBots) {
      const label = sock.userId || 'sub-bot'
      const res = await sendToAllGroupsOf(sock, text, label)
      totalSent += res.sent
      totalFailed += res.failed
      totalGroups += res.total
    }

    await m.reply(
      `✔ Mensaje enviado a *${totalSent}* de *${totalGroups}* grupos` +
      ` (bot principal + ${subBots.length} sub-bot(s)).` +
      (totalFailed ? `\n✘ Falló en *${totalFailed}* grupos.` : '')
    )
  },
}
