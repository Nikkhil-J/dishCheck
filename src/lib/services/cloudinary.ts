// Next.js only inlines NEXT_PUBLIC env vars with direct property access.
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

const UPLOAD_TIMEOUT_MS = 30_000

export async function uploadDishPhoto(file: File, dishId: string): Promise<string> {
  if (!CLOUD_NAME) {
    throw new Error('Missing env var: NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME')
  }
  if (!UPLOAD_PRESET) {
    throw new Error('Missing env var: NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', `dishcheck/reviews/${dishId}`)
  formData.append('transformation', 'c_limit,w_1200,q_auto,f_auto')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS)

  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    })

    if (!res.ok) {
      throw new Error(`Cloudinary upload failed: ${res.statusText}`)
    }

    const data = await res.json() as { secure_url: string }
    return data.secure_url
  } finally {
    clearTimeout(timeout)
  }
}

export async function uploadAvatarPhoto(
  file: File,
  userId: string
): Promise<{ secure_url: string } | null> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) return null

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', `dishcheck/avatars/${userId}`)
  formData.append('transformation', 'c_fill,w_200,h_200,q_auto,f_auto')

  try {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: 'POST', body: formData }
    )
    return res.ok ? (await res.json() as { secure_url: string }) : null
  } catch {
    return null
  }
}
