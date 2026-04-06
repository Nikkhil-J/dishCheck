import { create } from 'zustand'
import type { WishlistItem } from '@/lib/types'

interface WishlistState {
  savedIds: Set<string>
  items: WishlistItem[]
  addId: (id: string) => void
  removeId: (id: string) => void
  setAll: (items: WishlistItem[]) => void
}

export const useWishlistStore = create<WishlistState>((set) => ({
  savedIds: new Set(),
  items: [],
  addId: (id) => set((s) => ({ savedIds: new Set([...s.savedIds, id]) })),
  removeId: (id) =>
    set((s) => {
      const next = new Set(s.savedIds)
      next.delete(id)
      return { savedIds: next, items: s.items.filter((i) => i.dishId !== id) }
    }),
  setAll: (items) =>
    set({ items, savedIds: new Set(items.map((i) => i.dishId)) }),
}))
