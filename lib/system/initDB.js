let isNumber = (x) => typeof x === 'number' && !isNaN(x)

function initDB(m, client) {
  const jid = client.user.id.split(':')[0] + '@s.whatsapp.net'

  const settings = global.db.data.settings[jid] ||= {}
  settings.self ??= false
  settings.prefijo ??= ['/', '#', '.']
  settings.id ??= '120363420575743790@newsletter'
  settings.nameid ??= 'ミ★ 𝙉𝙞𝙣𝙤 𝙐𝙥𝙙𝙖𝙩𝙚𝙨 ★彡'
  settings.type ??= 'Owner'
  settings.link ??= 'https://whatsapp.com/channel/0029VbBUzJ6DzgT8o9NiMq2b'
  settings.banner ??= 'https://d0mwa043ankuvadx.public.blob.vercel-storage.com/nyx/2vasthw.jpg'
  settings.icon ??= 'https://d0mwa043ankuvadx.public.blob.vercel-storage.com/nyx/xRIs-WI.jpg'
  settings.currency ??= 'Coins'
  settings.namebot ??= '꒰୨୧꒱ 𝙉𝙞𝙣𝙤 𝙉𝙖𝙠𝙖𝙣𝙤 𝘽𝙤𝙩'
  settings.namebot2 ??= 'ミ★ 𝙉𝙞𝙣𝙤 AI ★彡'
  settings.owner ??= '⍴᥆ᥕᥱrᥱძ ᑲᥡ ᗪᥲᥒіᥱᥣᖇ᙭乙♡'

  const user = global.db.data.users[m.sender] ||= {}
  user.name ??= ''
  user.exp = isNumber(user.exp) ? user.exp : 0
  user.level = isNumber(user.level) ? user.level : 0
  user.usedcommands = isNumber(user.usedcommands) ? user.usedcommands : 0
  user.pasatiempo ??= ''
  user.description ??= ''
  user.marry ??= ''
  user.genre ??= ''
  user.birth ??= ''
  user.metadatos ??= null
  user.metadatos2 ??= null

  const chat = global.db.data.chats[m.chat] ||= {}
  chat.users ||= {}
  chat.bannedGrupo ??= false
  chat.welcome ??= true
  chat.nsfw ??= false
  chat.antistatus ??= false
  chat.alerts ??= true
  chat.gacha ??= true
  chat.rpg ??= true
  chat.adminonly ??= false
  chat.primaryBot ??= null
  chat.antilinks ??= true
  chat.personajesReservados ||= []

  chat.users[m.sender] ||= {}
  chat.users[m.sender].coins = isNumber(chat.users[m.sender].coins) ? chat.users[m.sender].coins : 0
  chat.users[m.sender].bank = isNumber(chat.users[m.sender].bank) ? chat.users[m.sender].bank : 0
  chat.users[m.sender].characters = Array.isArray(chat.users[m.sender].characters) ? chat.users[m.sender].characters : []
}

export default initDB;