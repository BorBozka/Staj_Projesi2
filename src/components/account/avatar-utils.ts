const supportedAvatarTypes = new Set(["image/jpeg", "image/png", "image/webp"])

export function isSupportedAvatarFile(file: Pick<File, "type">) {
  return supportedAvatarTypes.has(file.type)
}

export async function normalizeAvatarFile(file: File): Promise<string> {
  if (!isSupportedAvatarFile(file)) throw new Error("Yalnız JPG, PNG veya WebP fotoğraf seçebilirsiniz.")

  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await loadImage(objectUrl)
    const side = Math.min(image.naturalWidth, image.naturalHeight)
    if (!side) throw new Error("Fotoğraf okunamadı.")
    const canvas = document.createElement("canvas")
    canvas.width = 512
    canvas.height = 512
    const context = canvas.getContext("2d")
    if (!context) throw new Error("Fotoğraf işlenemedi.")
    const sourceX = (image.naturalWidth - side) / 2
    const sourceY = (image.naturalHeight - side) / 2
    context.drawImage(image, sourceX, sourceY, side, side, 0, 0, 512, 512)
    return canvas.toDataURL("image/webp", 0.82)
  } catch (error) {
    throw error instanceof Error ? error : new Error("Fotoğraf okunamadı.")
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("Fotoğraf okunamadı."))
    image.src = source
  })
}
