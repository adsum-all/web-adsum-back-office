/**
 * Optimise an uploaded image into a lightweight banner data URL: cover-crop to the
 * banner aspect ratio (16:9), downscale to a sane width and re-encode as JPEG. Keeps
 * the stored value small (typically well under 250 KB) so it can live inline in the
 * reference-date row and render in the member calendar without heavy payloads.
 */
export async function optimiserImageBanniere(file: File, maxW = 1280, ratio = 16 / 9, quality = 0.82): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image invalide."));
    image.src = dataUrl;
  });

  const targetW = Math.min(maxW, img.width || maxW);
  const targetH = Math.round(targetW / ratio);
  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;

  // Cover-crop the source to the banner ratio (centred), then draw scaled.
  const srcRatio = img.width / img.height;
  let sw = img.width;
  let sh = img.height;
  let sx = 0;
  let sy = 0;
  if (srcRatio > ratio) {
    sw = Math.round(img.height * ratio);
    sx = Math.round((img.width - sw) / 2);
  } else {
    sh = Math.round(img.width / ratio);
    sy = Math.round((img.height - sh) / 2);
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
  return canvas.toDataURL("image/jpeg", quality);
}
