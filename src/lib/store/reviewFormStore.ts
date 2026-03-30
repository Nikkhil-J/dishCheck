import { create } from 'zustand'
import type { ReviewFormData } from '@/lib/types'

interface ReviewFormState {
  data: ReviewFormData
  currentStep: 1 | 2 | 3
  setStep: (s: 1 | 2 | 3) => void
  updateField: <K extends keyof ReviewFormData>(key: K, value: ReviewFormData[K]) => void
  reset: () => void
}

const defaultData: ReviewFormData = {
  dishId: '',
  restaurantId: '',
  photoFile: null,
  photoPreviewUrl: null,
  tasteRating: null,
  portionRating: null,
  valueRating: null,
  tags: [],
  text: '',
}

export const useReviewFormStore = create<ReviewFormState>((set) => ({
  data: defaultData,
  currentStep: 1,
  setStep: (currentStep) => set({ currentStep }),
  updateField: (key, value) =>
    set((s) => ({ data: { ...s.data, [key]: value } })),
  reset: () => set({ data: defaultData, currentStep: 1 }),
}))
