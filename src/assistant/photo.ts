/** A photo made small enough to send: the long side at most `max` pixels, as a JPEG data URL. Receipts stay readable. */
export async function shrinkPhoto(file: Blob, max = 1600, quality = 0.82): Promise<string> {
  const img = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, max / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
  img.close()
  return canvas.toDataURL('image/jpeg', quality)
}
