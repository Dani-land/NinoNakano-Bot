const isValidAmount = (value) =>
  typeof value === 'number' && Number.isFinite(value)

const amountFrom = (value) => (isValidAmount(value) ? value : 0)

/**
 * Returns the user's single global economy account.
 *
 * Existing balances are migrated lazily the first time the user is seen:
 * the old wallet and bank values from every chat are added once and the
 * legacy chat records are left untouched as a safety copy.
 */
export function getGlobalEconomyUser(jid) {
  const data = global.db.data
  const profile = (data.users[jid] ||= {})
  const current = profile.economy

  if (!current?.global) {
    let coins = amountFrom(profile.coins) + amountFrom(current?.coins)
    let bank = amountFrom(profile.bank) + amountFrom(current?.bank)

    for (const chat of Object.values(data.chats || {})) {
      const legacy = chat?.users?.[jid]
      if (!legacy) continue

      coins += amountFrom(legacy.coins)
      bank += amountFrom(legacy.bank)
    }

    profile.economy = {
      ...(current || {}),
      global: true,
      coins,
      bank,
    }
  }

  profile.economy.coins = amountFrom(profile.economy.coins)
  profile.economy.bank = amountFrom(profile.economy.bank)

  return profile.economy
}