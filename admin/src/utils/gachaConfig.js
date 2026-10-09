export const GACHA_RARITIES = ['common', 'rare', 'epic', 'legendary']
export const DEFAULT_RARITY_WEIGHTS = { common: 70, rare: 22, epic: 7, legendary: 1 }
const integer = (value, min = 0) => value !== '' && value !== null && value !== undefined && Number.isInteger(Number(value)) && Number(value) >= min && Number(value) <= 1000000

// Draft previews follow the server's two-stage selection: choose an eligible
// rarity, then a card within that rarity. Only the server decides a real roll.
export function previewGachaRates(rarityWeights, members, catalog) {
  const byId = new Map(catalog.map(card => [Number(card.id), card]))
  const groups = Object.fromEntries(GACHA_RARITIES.map(rarity => [rarity, []]))
  for (const member of members) {
    const card = byId.get(Number(member.item_id))
    if (card?.item_type === 'card' && card.is_available && groups[card.rarity] && integer(member.weight, 1)) groups[card.rarity].push({ ...card, weight: Number(member.weight) })
  }
  const eligibleTotal = GACHA_RARITIES.reduce((total, rarity) => total + (groups[rarity].length && integer(rarityWeights[rarity]) ? Number(rarityWeights[rarity]) : 0), 0)
  const rarityRates = GACHA_RARITIES.map(rarity => ({
    rarity,
    weight: Number(rarityWeights[rarity]) || 0,
    eligible_count: groups[rarity].length,
    probability_percent: eligibleTotal && groups[rarity].length && integer(rarityWeights[rarity]) ? Number(rarityWeights[rarity]) / eligibleTotal * 100 : 0
  }))
  const cardRates = []
  for (const tier of rarityRates) {
    const total = groups[tier.rarity].reduce((sum, card) => sum + card.weight, 0)
    for (const card of groups[tier.rarity]) cardRates.push({ ...card, probability_percent: total ? tier.probability_percent * card.weight / total : 0 })
  }
  return { ready: eligibleTotal > 0, rarityRates, cardRates }
}

export function gachaDraftError(form, catalog) {
  if (!form.title?.trim() || form.title.trim().length > 100) return 'invalidTitle'
  if (!integer(form.cost_coins, 1)) return 'invalidCost'
  if (GACHA_RARITIES.some(rarity => !integer(form.rarity_weights?.[rarity]))) return 'invalidTierWeight'
  if (form.cards.length > 500 || new Set(form.cards.map(card => Number(card.item_id))).size !== form.cards.length || form.cards.some(card => !integer(card.weight, 1))) return 'invalidCardWeight'
  if (form.is_active && !previewGachaRates(form.rarity_weights, form.cards, catalog).ready) return 'notReady'
  return ''
}

export function gachaWritePayload(form, version) {
  return {
    title: form.title.trim(), description: form.description.trim() || null,
    cost_coins: Number(form.cost_coins), is_active: Boolean(form.is_active),
    rarity_weights: Object.fromEntries(GACHA_RARITIES.map(rarity => [rarity, Number(form.rarity_weights[rarity])])),
    cards: form.cards.map(card => ({ item_id: Number(card.item_id), weight: Number(card.weight) })),
    ...(version === undefined ? {} : { expected_version: version })
  }
}
