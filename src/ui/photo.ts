// Profile photos are stored on the profile itself as a small square JPEG (a data URL), like a character id.

/** A stored avatar that is a photo rather than a character id. */
export const isPhoto = (x: string | null | undefined): x is string => !!x && x.startsWith('data:image/')

const SIZE = 192
/** The database takes up to 120,000 characters; stay well under it. */
const MAX = 100000

/** The middle square of a picture, shrunk to SIZE × SIZE and turned upright, as a JPEG data URL. */
export async function avatarPhoto(file: File): Promise<string> {
  const img = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const side = Math.min(img.width, img.height)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = SIZE
  canvas.getContext('2d')!.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, SIZE, SIZE)
  img.close()
  for (const q of [0.85, 0.7, 0.55]) {
    const url = canvas.toDataURL('image/jpeg', q)
    if (url.length <= MAX) return url
  }
  throw new Error('too large')
}
