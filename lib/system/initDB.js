import { getGlobalEconomyUser } from '../economy.js'

let isNumber = (x) => typeof x === 'number' && !isNaN(x)

export const BOT_SETTINGS_DEFAULTS = Object.freeze({
  id: '120363420575743790@newsletter',
  nameid: '⋆｡°✩ ՏTᗩᖇՏᕼᗩᗪᗴ Tᗴᗩᗰ ✩°｡⋆',
  type: 'Owner',
  link: 'https://whatsapp.com/channel/0029VbBUzJ6DzgT8o9NiMq2b',
  banner: 'https://d0mwa043ankuvadx.public.blob.vercel-storage.com/nyx/ibj1lMk.jpg',
  icon: 'https://d0mwa043ankuvadx.public.blob.vercel-storage.com/nyx/xRIs-WI.jpg',
  currency: 'Coins',
  namebot: '☆ﾟ.･｡ﾟ ՏTᗩᖇՏᕼᗩᗪᗴ Tᗴᗩᗰ ﾟ｡･.ﾟ☆',
  namebot2: '☆ﾟ.･｡ﾟ ՏTᗩᖇՏᕼᗩᗪᗴ ﾟ｡･.ﾟ☆',
  owner: '⍴᥆ᥕᥱrᥱძ ᑲᥡ ᗪᥲᥒіᥱᥣᖇ᙭乙♡',
})

export function getBotId(client) {
  const userId = client?.user?.id?.split(':')[0]
  return userId ? `${userId}@s.whatsapp.net` : ''
}

export function getBotSettings(client) {
  const jid = getBotId(client)
  if (!jid || !global.db?.data) return { ...BOT_SETTINGS_DEFAULTS }

  global.db.data.settings ||= {}
  const settings = global.db.data.settings[jid] ||= {}
  for (const [key, value] of Object.entries(BOT_SETTINGS_DEFAULTS)) {
    settings[key] ??= value
  }
  settings.bannerType ??= getBannerMediaType(settings)
  return settings
}

export function getBannerMediaType(settings) {
  if (['image', 'gif', 'video'].includes(settings?.bannerType)) {
    return settings.bannerType
  }

  let extension = ''
  try {
    extension = new URL(settings?.banner || '').pathname.split('.').pop().toLowerCase()
  } catch {}

  if (extension === 'gif') return 'image'
  if (['mp4', 'm4v', 'mov', 'webm'].includes(extension)) return 'video'
  return 'image'
}

export function getBannerMimeType(settings) {
  const type = getBannerMediaType(settings)
  if (type === 'gif') return 'video/mp4'

  let extension = ''
  try {
    extension = new URL(settings?.banner || '').pathname.split('.').pop().toLowerCase()
  } catch {}

  const knownTypes = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    mp4: 'video/mp4',
    m4v: 'video/mp4',
    mov: 'video/quicktime',
    webm: 'video/webm',
  }
  return knownTypes[extension] || (type === 'video' ? 'video/mp4' : 'image/jpeg')
}

function initDB(m, client) {
  const settings = getBotSettings(client)
  settings.self ??= false
  settings.prefijo ??= ['/', '#', '.']

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
  chat.intercambios ||= []

  chat.users[m.sender] ||= {}
  chat.users[m.sender].coins = isNumber(chat.users[m.sender].coins) ? chat.users[m.sender].coins : 0
  chat.users[m.sender].bank = isNumber(chat.users[m.sender].bank) ? chat.users[m.sender].bank : 0
  chat.users[m.sender].characters = Array.isArray(chat.users[m.sender].characters) ? chat.users[m.sender].characters : []
  chat.users[m.sender].characterCount = isNumber(chat.users[m.sender].characterCount)
    ? chat.users[m.sender].characterCount
    : chat.users[m.sender].characters.length
  chat.users[m.sender].totalRwcoins = isNumber(chat.users[m.sender].totalRwcoins)
    ? chat.users[m.sender].totalRwcoins
    : chat.users[m.sender].characters.reduce((total, character) => total + (Number(character.value) || 0), 0)

  // Initialize/migrate the account without removing the old per-chat data.
  getGlobalEconomyUser(m.sender)
}

export default initDB;