import type { AssetRef, LogoAsset } from "./types";

const acceptedImages = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export function isSupportedImage(file: File): boolean {
  return acceptedImages.includes(file.type) || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
}

export async function fileToAsset(file: File, maxMb = 15): Promise<AssetRef> {
  if (!isSupportedImage(file)) {
    throw new Error("Unsupported image type. Use JPG, PNG, WEBP, or browser-supported HEIC.");
  }
  if (file.size > maxMb * 1024 * 1024) {
    throw new Error(`Image is larger than ${maxMb} MB.`);
  }
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
  const dimensions = await readImageDimensions(dataUrl);
  return {
    id: crypto.randomUUID(),
    name: file.name,
    type: file.type || "image/png",
    dataUrl,
    width: dimensions.width,
    height: dimensions.height
  };
}

export async function fileToLogo(file: File): Promise<LogoAsset> {
  const asset = await fileToAsset(file);
  return {
    ...asset,
    hidden: false,
    locked: false,
    opacity: 1,
    grayscale: false,
    monochrome: false,
    backgroundBox: false
  };
}

export function readImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("The image appears to be corrupt or unsupported by this browser."));
    img.src = src;
  });
}

export function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("An image asset failed to load."));
    img.src = src;
  });
}

export function sanitizeFilename(value: string): string {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120) || "candidate";
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(",");
  const mime = /data:(.*?);/.exec(header)?.[1] ?? "application/octet-stream";
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mime });
}
