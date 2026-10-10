export default {
  command: ['accepttrade', 'aceptarintercambio'],
  category: 'gacha',
  run: async ({client, m}) => {
    const db = global.db.data
    const chatId = m.chat
    const userId = m.sender
    const chatData = db.chats[chatId] ||= {}
    chatData.users ||= {}
    chatData.intercambios ||= []
    const intercambio = chatData.intercambios?.find(
      (i) => i.expiracion > Date.now() && i.destinatario === userId,
    )

    if (!chatData.gacha)
      return m.reply(`✎ Estos comandos estan desactivados en este grupo.`)

    if (!intercambio) {
      chatData.intercambios = chatData.intercambios.filter((i) => i.expiracion > Date.now())
      if (!chatData.intercambios.length) chatData.timeTrade = 0
      return m.reply('✎ No tienes ninguna solicitud de intercambio activa.')
    }

    if (intercambio.solicitante === intercambio.destinatario) {
      chatData.intercambios = chatData.intercambios.filter((i) => i !== intercambio)
      if (!chatData.intercambios.some((i) => i.expiracion > Date.now())) chatData.timeTrade = 0
      return m.reply('✎ El intercambio no es válido porque ambos usuarios son la misma persona.')
    }

    const solicitante = chatData.users[intercambio.solicitante]
    const destinatario = chatData.users[intercambio.destinatario]
    const personaje1Nombre = intercambio.personaje1Nombre || intercambio.personaje1?.name
    const personaje2Nombre = intercambio.personaje2Nombre || intercambio.personaje2?.name
    const solicitanteChars = solicitante?.characters || []
    const destinatarioChars = destinatario?.characters || []
    const solicitanteIndex = solicitanteChars.findIndex(
      (character) => character.name?.toLowerCase() === personaje1Nombre?.toLowerCase(),
    )
    const destinatarioIndex = destinatarioChars.findIndex(
      (character) => character.name?.toLowerCase() === personaje2Nombre?.toLowerCase(),
    )

    if (!solicitante || !destinatario || solicitanteIndex < 0 || destinatarioIndex < 0) {
      chatData.intercambios = chatData.intercambios.filter((i) => i !== intercambio)
      if (!chatData.intercambios.some((i) => i.expiracion > Date.now())) chatData.timeTrade = 0
      return m.reply('✎ El intercambio expiró o alguno de los personajes ya no está disponible.')
    }

    const [personaje1] = solicitanteChars.splice(solicitanteIndex, 1)
    const [personaje2] = destinatarioChars.splice(destinatarioIndex, 1)
    solicitanteChars.push(personaje2)
    destinatarioChars.push(personaje1)

    solicitante.characterCount = solicitanteChars.length
    solicitante.totalRwcoins = solicitanteChars.reduce(
      (total, character) => total + (Number(character.value) || 0),
      0,
    )
    destinatario.characterCount = destinatarioChars.length
    destinatario.totalRwcoins = destinatarioChars.reduce(
      (total, character) => total + (Number(character.value) || 0),
      0,
    )

    chatData.intercambios = chatData.intercambios.filter(
      (trade) => trade !== intercambio && trade.expiracion > Date.now(),
    )
    chatData.timeTrade = chatData.intercambios.reduce(
      (latest, trade) => Math.max(latest, trade.expiracion),
      0,
    )

    const mensajeConfirmacion = `ꕥ *Intercambio realizado exitosamente (✿❛◡❛)*\n\n✎ *${personaje1.name}* ahora pertenece a *${db.users[userId]?.name || userId.split('@')[0]}*\n✎ *${personaje2.name}* ahora pertenece a *${db.users[intercambio.solicitante]?.name || intercambio.solicitante.split('@')[0]}*

${dev}`

    await client.sendMessage(chatId, { text: mensajeConfirmacion }, { quoted: m })
  },
};
