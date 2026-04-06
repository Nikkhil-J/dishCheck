export function getCuisineEmoji(cuisine?: string): string {
  if (!cuisine) return '🍽️'
  const map: Record<string, string> = {
    'North Indian': '🍛',
    'South Indian': '🥘',
    'Chinese': '🥡',
    'Japanese': '🍱',
    'Italian': '🍝',
    'Pizza': '🍕',
    'Burgers': '🍔',
    'Continental': '🥗',
    'Biryani': '🍚',
    'Mughlai': '🍖',
    'Thai': '🍜',
    'Mexican': '🌮',
    'Cafe': '☕',
    'Bakery': '🥐',
    'Desserts': '🍰',
    'American': '🍟',
    'Korean': '🍣',
    'Asian': '🥢',
    'Punjabi': '🧆',
    'Andhra': '🌶️',
    'Karnataka': '🍃',
  }
  return map[cuisine] ?? '🍽️'
}

export function getCuisineGradient(cuisine?: string): string {
  if (!cuisine) return 'bg-gradient-to-br from-muted to-muted/60'
  const map: Record<string, string> = {
    'North Indian': 'bg-gradient-to-br from-orange-500/20 to-red-500/20',
    'South Indian': 'bg-gradient-to-br from-green-500/20 to-emerald-500/20',
    'Chinese': 'bg-gradient-to-br from-red-500/20 to-orange-400/20',
    'Japanese': 'bg-gradient-to-br from-pink-400/20 to-red-400/20',
    'Italian': 'bg-gradient-to-br from-green-400/20 to-red-400/20',
    'Pizza': 'bg-gradient-to-br from-orange-400/20 to-yellow-400/20',
    'Burgers': 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20',
    'Continental': 'bg-gradient-to-br from-blue-400/20 to-indigo-400/20',
    'Biryani': 'bg-gradient-to-br from-yellow-500/20 to-amber-500/20',
    'Mughlai': 'bg-gradient-to-br from-amber-500/20 to-orange-500/20',
    'Thai': 'bg-gradient-to-br from-green-400/20 to-teal-400/20',
    'Mexican': 'bg-gradient-to-br from-red-400/20 to-yellow-400/20',
    'Cafe': 'bg-gradient-to-br from-amber-700/20 to-yellow-600/20',
    'Bakery': 'bg-gradient-to-br from-yellow-300/20 to-orange-300/20',
    'Desserts': 'bg-gradient-to-br from-pink-400/20 to-purple-400/20',
    'American': 'bg-gradient-to-br from-blue-500/20 to-red-500/20',
    'Korean': 'bg-gradient-to-br from-red-400/20 to-pink-400/20',
    'Asian': 'bg-gradient-to-br from-teal-400/20 to-green-400/20',
    'Punjabi': 'bg-gradient-to-br from-orange-400/20 to-amber-400/20',
    'Andhra': 'bg-gradient-to-br from-red-600/20 to-orange-600/20',
    'Karnataka': 'bg-gradient-to-br from-green-600/20 to-teal-600/20',
  }
  return map[cuisine] ?? 'bg-gradient-to-br from-muted to-muted/60'
}
