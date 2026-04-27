import { create } from 'zustand'
import type { ReviewFormData } from '@/lib/types'

interface ReviewFormState {
  data: ReviewFormData
  updateField: <K extends keyof ReviewFormData>(key: K, value: ReviewFormData[K]) => void
  reset: () => void
}

const defaultData: ReviewFormData = {
  dishId: '',
  restaurantId: '',
  photoFile: null,
  photoPreviewUrl: null,
  billFile: null,
  billPreviewUrl: null,
  tasteRating: null,
  portionRating: null,
  valueRating: null,
  tags: [],
  text: '',
}

export const useReviewFormStore = create<ReviewFormState>((set) => ({
  data: defaultData,
  updateField: (key, value) =>
    set((s) => ({ data: { ...s.data, [key]: value } })),
  reset: () => set({ data: defaultData }),
}))
