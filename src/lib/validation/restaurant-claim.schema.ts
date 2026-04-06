import { z } from 'zod'

export const submitClaimSchema = z.object({
  phone: z.string().min(6, 'Phone number is required').max(20),
  role: z.enum(['owner', 'manager']),
  proofDocumentUrl: z.string().url().nullable().default(null),
}).strip()

export type SubmitClaimInput = z.infer<typeof submitClaimSchema>

export const reviewClaimSchema = z.object({
  action: z.enum(['approve', 'reject']),
  note: z.string().max(500).optional(),
}).strip()

export type ReviewClaimInput = z.infer<typeof reviewClaimSchema>
