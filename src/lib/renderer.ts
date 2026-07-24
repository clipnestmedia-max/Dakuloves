import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import { dataUrlToBlob, loadHtmlImage } from "./assets";
import type { LogoAsset, PosterProject, TextStyle } from "./types";

interface RenderOptions {
  scale?: number;
  guides?: boolean;
  selectedLayer?: string;
}

const imageCache = new Map<string, HTMLImageElement>();

async function imageFor(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached) return cached;
  const img = await loadHtmlImage(src);
  imageCache.set(src, img);
  return img;
}

export async function ensureFonts(project: PosterProject): Promise<void> {
  if ("fonts" in document) {
    await document.fonts.ready;
    const fonts = new Set(Object.values(project.textStyles).map((style) => style.fontFamily));
    await Promise.all(Array.from(fonts).map((font) => document.fonts.load(`700 32px "${font}"`).catch(() => undefined)));
  }
}

function visible(project: PosterProject, id: string): boolean {
  return project.layers.find((layer) => layer.id === id)?.visible ?? true;
}

function layerLocked(project: PosterProject, id: string): boolean {
  return project.layers.find((layer) => layer.id === id)?.locked ?? false;
}

function drawCurtain(ctx: CanvasRenderingContext2D, project: PosterProject, scale: number): void {
  const { width, height } = project.size;
  const bg = project.background;
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, bg.gradientA);
  gradient.addColorStop(0.45, bg.baseColor);
  gradient.addColorStop(1, bg.gradientB);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  if (bg.curtainIntensity > 0 && visible(project, "curtain")) {
    for (let x = -80; x < width + 80; x += 36) {
      const wave = (Math.sin(x * 0.027) + 1) / 2;
      const alpha = (0.035 + wave * 0.09) * bg.foldContrast * bg.curtainIntensity;
      const fold = ctx.createLinearGradient(x, 0, x + 58, 0);
      fold.addColorStop(0, `rgba(255,255,255,${alpha})`);
      fold.addColorStop(0.42, "rgba(0,0,0,0)");
      fold.addColorStop(1, `rgba(0,0,0,${alpha * 1.7})`);
      ctx.fillStyle = fold;
      ctx.fillRect(x, 0, 58, height);
    }
  }

  if (visible(project, "sideLights")) {
    const beam = bg.goldLightWidth;
    for (const side of [0, width]) {
      const dir = side === 0 ? 1 : -1;
      const light = ctx.createLinearGradient(side, 0, side + dir * width * 0.22, 0);
      light.addColorStop(0, `rgba(242,195,77,${0.72 * bg.sideLightIntensity})`);
      light.addColorStop(0.16, `rgba(230,201,139,${0.2 * bg.sideLightIntensity})`);
      light.addColorStop(1, "rgba(242,195,77,0)");
      ctx.fillStyle = light;
      ctx.fillRect(side === 0 ? 0 : width * 0.78, 0, width * 0.22, height);
      ctx.fillStyle = `rgba(242,195,77,${0.95 * bg.sideLightIntensity})`;
      ctx.shadowColor = "#F2C34D";
      ctx.shadowBlur = 18 * scale;
      ctx.fillRect(side === 0 ? 42 : width - 42 - beam, 60, beam, height - 120);
      ctx.shadowBlur = 0;
    }
  }

  const spotlight = ctx.createRadialGradient(width / 2, height * 0.42, 20, width / 2, height * 0.42, height * 0.52);
  spotlight.addColorStop(0, `rgba(255,232,172,${0.22 * bg.spotlight})`);
  spotlight.addColorStop(0.55, "rgba(255,232,172,0.04)");
  spotlight.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = spotlight;
  ctx.fillRect(0, 0, width, height);

  const vignette = ctx.createRadialGradient(width / 2, height / 2, height * 0.22, width / 2, height / 2, height * 0.78);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, `rgba(0,0,0,${bg.vignette})`);
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  if (bg.overlayOpacity > 0) {
    ctx.fillStyle = hexToRgba(bg.overlayColor, bg.overlayOpacity);
    ctx.fillRect(0, 0, width, height);
  }
}

function hexToRgba(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const n = parseInt(value.length === 3 ? value.split("").map((c) => c + c).join("") : value, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function clipFrame(ctx: CanvasRenderingContext2D, project: PosterProject): void {
  const f = project.photoFrame;
  if (f.shape === "circle" || f.shape === "oval") {
    ctx.beginPath();
    ctx.ellipse(f.x + f.width / 2, f.y + f.height / 2, f.width / 2, f.height / 2, 0, 0, Math.PI * 2);
    ctx.closePath();
  } else {
    roundedRect(ctx, f.x, f.y, f.width, f.height, f.shape === "rectangle" ? 0 : f.radius);
  }
  ctx.clip();
}

async function drawCandidatePhoto(ctx: CanvasRenderingContext2D, project: PosterProject): Promise<void> {
  const f = project.photoFrame;
  ctx.save();
  ctx.shadowColor = `rgba(0,0,0,${f.shadowOpacity})`;
  ctx.shadowBlur = f.shadowBlur;
  roundedRect(ctx, f.x, f.y, f.width, f.height, f.radius);
  ctx.fillStyle = "rgba(245,232,203,.10)";
  ctx.fill();
  ctx.restore();

  if (project.candidatePhoto) {
    const img = await imageFor(project.candidatePhoto.dataUrl);
    const t = project.photoTransform;
    const base = Math.max(f.width / img.naturalWidth, f.height / img.naturalHeight) * t.zoom;
    const drawW = img.naturalWidth * base;
    const drawH = img.naturalHeight * base;
    const cx = f.x + f.width / 2 + t.offsetX;
    const cy = f.y + f.height / 2 + t.offsetY;
    ctx.save();
    clipFrame(ctx, project);
    ctx.globalAlpha = t.opacity;
    ctx.filter = `brightness(${t.brightness * t.exposure}) contrast(${t.contrast}) saturate(${t.saturation}) blur(${t.blur}px)`;
    ctx.translate(cx, cy);
    ctx.rotate((t.rotate * Math.PI) / 180);
    ctx.scale(t.flipX ? -1 : 1, t.flipY ? -1 : 1);
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  } else {
    ctx.save();
    roundedRect(ctx, f.x, f.y, f.width, f.height, f.radius);
    ctx.fillStyle = "rgba(245,232,203,.13)";
    ctx.fill();
    ctx.fillStyle = "rgba(245,232,203,.72)";
    ctx.font = "600 30px Montserrat";
    ctx.textAlign = "center";
    ctx.fillText("Upload candidate photo", f.x + f.width / 2, f.y + f.height / 2);
    ctx.restore();
  }

  if (f.borderWidth > 0) {
    ctx.save();
    roundedRect(ctx, f.x, f.y, f.width, f.height, f.radius);
    ctx.lineWidth = f.borderWidth;
    ctx.strokeStyle = f.borderColor;
    ctx.stroke();
    ctx.restore();
  }
}

function transformText(style: TextStyle, text: string): string {
  if (style.transform === "uppercase") return text.toLocaleUpperCase();
  if (style.transform === "lowercase") return text.toLocaleLowerCase();
  return text;
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const sourceLines = text.split(/\n+/);
  const lines: string[] = [];
  sourceLines.forEach((source) => {
    const words = source.trim().split(/\s+/).filter(Boolean);
    let current = "";
    words.forEach((word) => {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width <= maxWidth || !current) current = test;
      else {
        lines.push(current);
        current = word;
      }
    });
    if (current) lines.push(current);
  });
  return lines.length ? lines : [""];
}

function fitFont(ctx: CanvasRenderingContext2D, style: TextStyle, text: string, min = 24): { size: number; lines: string[] } {
  let size = style.fontSize;
  let lines: string[] = [];
  while (size >= min) {
    ctx.font = `${style.italic ? "italic " : ""}${style.fontWeight} ${size}px "${style.fontFamily}"`;
    lines = wrapLines(ctx, text, style.width);
    const tooTall = lines.length * size * style.lineHeight > size * style.lineHeight * 2.4 && style.fontSize > 44;
    const tooWide = lines.some((line) => ctx.measureText(line).width > style.width);
    if (!tooTall && !tooWide) break;
    size -= 2;
  }
  return { size, lines };
}

function drawText(ctx: CanvasRenderingContext2D, style: TextStyle, rawText: string, minFont = 22): void {
  if (!style.visible || !rawText.trim()) return;
  const text = transformText(style, rawText);
  ctx.save();
  ctx.globalAlpha = style.opacity;
  ctx.translate(style.x, style.y);
  ctx.rotate((style.rotation * Math.PI) / 180);
  ctx.textAlign = style.align;
  ctx.textBaseline = "middle";
  const { size, lines } = fitFont(ctx, style, text, minFont);
  ctx.font = `${style.italic ? "italic " : ""}${style.fontWeight} ${size}px "${style.fontFamily}"`;
  ctx.fillStyle = style.color;
  ctx.strokeStyle = style.strokeColor;
  ctx.lineWidth = style.strokeWidth;
  if (style.shadow || style.glow) {
    ctx.shadowColor = style.glow ? style.color : "rgba(0,0,0,.65)";
    ctx.shadowBlur = style.glow ? 18 : 10;
    ctx.shadowOffsetY = style.glow ? 0 : 4;
  }
  const start = -((lines.length - 1) * size * style.lineHeight) / 2;
  lines.forEach((line, index) => {
    const y = start + index * size * style.lineHeight;
    if (style.strokeWidth > 0) ctx.strokeText(line, 0, y);
    if (style.letterSpacing === 0) ctx.fillText(line, 0, y);
    else drawLetterSpaced(ctx, line, 0, y, style.letterSpacing, style.align);
  });
  ctx.restore();
}

function drawLetterSpaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number, align: CanvasTextAlign): void {
  const chars = Array.from(text);
  const width = chars.reduce((sum, char) => sum + ctx.measureText(char).width + spacing, -spacing);
  let cursor = align === "center" ? x - width / 2 : align === "right" || align === "end" ? x - width : x;
  chars.forEach((char) => {
    ctx.fillText(char, cursor, y);
    cursor += ctx.measureText(char).width + spacing;
  });
}

async function drawLogos(ctx: CanvasRenderingContext2D, project: PosterProject): Promise<void> {
  const logos = [
    project.branding.mainLogo,
    project.branding.productionLogo,
    project.branding.presenterLogo,
    ...project.branding.partnerLogos
  ].filter((logo): logo is LogoAsset => Boolean(logo && !logo.hidden));
  if (!logos.length) {
    ctx.save();
    ctx.fillStyle = "rgba(245,232,203,.82)";
    ctx.font = "700 30px Montserrat";
    ctx.textAlign = "center";
    ctx.fillText(project.event.organisationName, project.size.width / 2, project.size.height * 0.13);
    ctx.restore();
    return;
  }
  const loaded = await Promise.all(logos.map((logo) => imageFor(logo.dataUrl)));
  const maxH = project.branding.maxLogoHeight;
  const widths = loaded.map((img) => (img.naturalWidth / img.naturalHeight) * maxH);
  const total = widths.reduce((sum, width) => sum + width, 0) + project.branding.logoGap * (loaded.length - 1);
  let x = project.size.width / 2 - total / 2;
  const y = project.size.height * 0.115;
  loaded.forEach((img, index) => {
    const logo = logos[index];
    const w = widths[index];
    ctx.save();
    ctx.globalAlpha = logo.opacity;
    if (logo.backgroundBox) {
      roundedRect(ctx, x - 10, y - maxH / 2 - 8, w + 20, maxH + 16, 12);
      ctx.fillStyle = "rgba(245,232,203,.92)";
      ctx.fill();
    }
    ctx.filter = logo.grayscale ? "grayscale(1)" : logo.monochrome ? "grayscale(1) contrast(2)" : "none";
    ctx.drawImage(img, x, y - maxH / 2, w, maxH);
    ctx.restore();
    x += w + project.branding.logoGap;
  });
}

function drawDecorations(ctx: CanvasRenderingContext2D, project: PosterProject): void {
  if (!visible(project, "borders")) return;
  const { width, height } = project.size;
  const d = project.decorations;
  ctx.save();
  ctx.globalAlpha = d.opacity;
  ctx.strokeStyle = d.color;
  ctx.fillStyle = d.color;
  if (d.outerBorder) {
    ctx.lineWidth = 4;
    roundedRect(ctx, 34, 34, width - 68, height - 68, 20);
    ctx.stroke();
  }
  if (d.innerBorder) {
    ctx.lineWidth = 1.5;
    roundedRect(ctx, 58, 58, width - 116, height - 116, 12);
    ctx.stroke();
  }
  if (d.dividers) {
    drawDivider(ctx, width / 2, height * 0.672, width * 0.62);
    drawDivider(ctx, width / 2, height * 0.765, width * 0.52);
  }
  if (d.footerFlourish) drawDivider(ctx, width / 2, height * 0.925, width * 0.34);
  if (d.sparkles) {
    for (let i = 0; i < 42; i += 1) {
      const x = 90 + ((i * 137) % (width - 180));
      const y = 120 + ((i * 211) % (height - 250));
      const alpha = ((i % 5) + 1) / 7;
      ctx.globalAlpha = d.opacity * alpha;
      ctx.fillRect(x, y, 2 + (i % 3), 2 + (i % 3));
    }
  }
  ctx.restore();
}

function drawDivider(ctx: CanvasRenderingContext2D, x: number, y: number, width: number): void {
  ctx.beginPath();
  ctx.moveTo(x - width / 2, y);
  ctx.lineTo(x - 18, y);
  ctx.moveTo(x + 18, y);
  ctx.lineTo(x + width / 2, y);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 4);
  ctx.fillRect(-7, -7, 14, 14);
  ctx.restore();
}

function phoneText(project: PosterProject): string {
  const phones = [project.contact.primaryPhone, project.contact.secondaryPhone, project.contact.thirdPhone].filter(Boolean);
  if (project.contact.phoneDisplayMode === "lines") return phones.join("\n");
  if (project.contact.phoneDisplayMode === "comma") return phones.join(", ");
  return phones.join("  •  ");
}

function qrContent(project: PosterProject): string {
  if (project.qr.source === "custom") return project.qr.customUrl;
  if (project.qr.source === "whatsapp") return project.contact.whatsapp;
  if (project.qr.source === "registration") return project.contact.registrationUrl;
  if (project.qr.source === "profile") return project.contact.candidateProfileUrl;
  return project.contact.website;
}

async function drawQr(ctx: CanvasRenderingContext2D, project: PosterProject): Promise<void> {
  if (!project.qr.visible) return;
  const content = qrContent(project);
  if (!content) return;
  const dataUrl = await QRCode.toDataURL(content, {
    margin: project.qr.margin,
    color: { dark: project.qr.foreground, light: project.qr.background },
    width: project.qr.size
  });
  const img = await imageFor(dataUrl);
  ctx.save();
  ctx.fillStyle = project.qr.background;
  roundedRect(ctx, project.qr.x - project.qr.border, project.qr.y - project.qr.border, project.qr.size + project.qr.border * 2, project.qr.size + project.qr.border * 2, 10);
  ctx.fill();
  ctx.drawImage(img, project.qr.x, project.qr.y, project.qr.size, project.qr.size);
  ctx.restore();
}

function drawGuides(ctx: CanvasRenderingContext2D, project: PosterProject): void {
  const { width, height } = project.size;
  ctx.save();
  ctx.setLineDash([12, 10]);
  ctx.strokeStyle = "rgba(86, 214, 255, .65)";
  ctx.lineWidth = 2;
  ctx.strokeRect(width * 0.06, height * 0.045, width * 0.88, height * 0.91);
  ctx.strokeStyle = "rgba(242,195,77,.7)";
  ctx.beginPath();
  ctx.moveTo(width / 2, 0);
  ctx.lineTo(width / 2, height);
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.stroke();
  ctx.restore();
}

function drawSelection(ctx: CanvasRenderingContext2D, project: PosterProject, selectedLayer?: string): void {
  if (!selectedLayer) return;
  const f = project.photoFrame;
  const boxes: Record<string, [number, number, number, number]> = {
    candidatePhoto: [f.x, f.y, f.width, f.height],
    candidateFrame: [f.x, f.y, f.width, f.height],
    eventTitle: [project.textStyles.eventTitle.x - project.textStyles.eventTitle.width / 2, project.textStyles.eventTitle.y - 70, project.textStyles.eventTitle.width, 140],
    candidateName: [project.textStyles.candidateName.x - project.textStyles.candidateName.width / 2, project.textStyles.candidateName.y - 56, project.textStyles.candidateName.width, 112]
  };
  const box = boxes[selectedLayer];
  if (!box || layerLocked(project, selectedLayer)) return;
  ctx.save();
  ctx.setLineDash([8, 6]);
  ctx.strokeStyle = "#56d6ff";
  ctx.lineWidth = 3;
  ctx.strokeRect(...box);
  ctx.restore();
}

export async function renderPosterToCanvas(canvas: HTMLCanvasElement, project: PosterProject, options: RenderOptions = {}): Promise<void> {
  const scale = options.scale ?? 1;
  canvas.width = Math.round(project.size.width * scale);
  canvas.height = Math.round(project.size.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, project.size.width, project.size.height);
  await ensureFonts(project);
  drawCurtain(ctx, project, scale);
  drawDecorations(ctx, project);
  if (visible(project, "logos")) await drawLogos(ctx, project);
  if (visible(project, "eventTitle")) drawText(ctx, project.textStyles.eventTitle, project.event.title, 30);
  if (visible(project, "eventYear")) drawText(ctx, project.textStyles.eventYear, project.event.year, 24);
  if (visible(project, "candidatePhoto")) await drawCandidatePhoto(ctx, project);
  if (visible(project, "presentedBy")) drawText(ctx, project.textStyles.presentedBy, project.event.presentedBy, 14);
  if (visible(project, "congratulations")) drawText(ctx, project.textStyles.congratulations, project.candidate.congratulationsHeading || project.candidate.status, 18);
  if (visible(project, "candidateName")) drawText(ctx, project.textStyles.candidateName, project.candidate.fullName, 28);
  if (visible(project, "candidateCategory")) drawText(ctx, project.textStyles.candidateCategory, project.candidate.category || project.candidate.title || project.candidate.status, 18);
  if (visible(project, "contact")) drawText(ctx, project.textStyles.phone, phoneText(project), 14);
  if (visible(project, "website")) drawText(ctx, project.textStyles.website, project.contact.website, 14);
  if (visible(project, "footer")) drawText(ctx, project.textStyles.footer, project.event.footerNote, 12);
  if (visible(project, "qr")) await drawQr(ctx, project);
  if (options.guides) drawGuides(ctx, project);
  drawSelection(ctx, project, options.selectedLayer);
}

export async function exportPng(project: PosterProject): Promise<Blob> {
  const canvas = document.createElement("canvas");
  await renderPosterToCanvas(canvas, project, { scale: project.export.scale });
  return await new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("PNG export failed."))), "image/png"));
}

export async function exportJpg(project: PosterProject): Promise<Blob> {
  const canvas = document.createElement("canvas");
  await renderPosterToCanvas(canvas, project, { scale: project.export.scale });
  return await new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("JPG export failed."))), "image/jpeg", project.export.jpgQuality));
}

export async function exportPdf(project: PosterProject): Promise<Blob> {
  const canvas = document.createElement("canvas");
  await renderPosterToCanvas(canvas, project, { scale: 1 });
  const dataUrl = canvas.toDataURL("image/png");
  const page =
    project.export.pdfPage === "a4"
      ? { w: 210, h: 297 }
      : project.export.pdfPage === "a5"
        ? { w: 148, h: 210 }
        : { w: project.size.width / 10, h: project.size.height / 10 };
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [page.w, page.h], compress: true });
  pdf.addImage(dataUrl, "PNG", 0, 0, page.w, page.h, undefined, "FAST");
  return dataUrlToBlob(pdf.output("datauristring"));
}

export async function qrAsSvg(project: PosterProject): Promise<string> {
  return QRCode.toString(qrContent(project), {
    type: "svg",
    margin: project.qr.margin,
    color: { dark: project.qr.foreground, light: project.qr.background },
    width: project.qr.size
  });
}

export async function qrAsPng(project: PosterProject): Promise<Blob> {
  const dataUrl = await QRCode.toDataURL(qrContent(project), {
    margin: project.qr.margin,
    color: { dark: project.qr.foreground, light: project.qr.background },
    width: project.qr.size
  });
  return dataUrlToBlob(dataUrl);
}
