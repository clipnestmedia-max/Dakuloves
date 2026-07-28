import type { BackgroundSettings, LayerSettings, LogoAsset, PosterProject, PosterSize, PosterSizeId, TemplateId, TextStyle } from "./types";

export const posterSizes: PosterSize[] = [
  { id: "poster-3-4", label: "1080 x 1440 Poster", width: 1080, height: 1440 },
  { id: "instagram", label: "1080 x 1350 Instagram", width: 1080, height: 1350 },
  { id: "story", label: "1080 x 1920 Story/Reel", width: 1080, height: 1920 },
  { id: "square", label: "1080 x 1080 Square", width: 1080, height: 1080 },
  { id: "a4", label: "A4 300 DPI", width: 2480, height: 3508, print: "A4" },
  { id: "a5", label: "A5 300 DPI", width: 1748, height: 2480, print: "A5" }
];

export const templateNames: Record<TemplateId, string> = {
  "official-audition-candidate": "Official Audition Candidate Pamphlet",
  "royal-curtain": "Royal Curtain Announcement",
  "black-luxury": "Black Luxury Finalist",
  "burgundy-spotlight": "Burgundy Spotlight",
  "cream-gold": "Cream Gold Winner",
  "navy-royal": "Navy Royal Contestant",
  "modern-red": "Modern Red Gradient"
};

export const statusOptions = [
  "Audition Contestant",
  "Selected",
  "Shortlisted",
  "Finalist",
  "Winner",
  "First Runner-Up",
  "Second Runner-Up",
  "Special Mention",
  "Custom"
];

export const fontOptions = [
  "Cinzel",
  "Cinzel Decorative",
  "Playfair Display",
  "Cormorant Garamond",
  "Montserrat",
  "Poppins",
  "Noto Sans Devanagari",
  "Noto Serif Devanagari"
];

const officialLogos: Record<"mainLogo" | "productionLogo" | "presenterLogo", LogoAsset> = {
  mainLogo: {
    id: "official-dakuloves-production",
    name: "Dakuloves Production",
    type: "image/png",
    dataUrl: "assets/branding/dakuloves-production.png",
    width: 1024,
    height: 1024,
    hidden: false,
    locked: false,
    opacity: 1,
    grayscale: false,
    monochrome: false,
    backgroundBox: false
  },
  productionLogo: {
    id: "official-unfiltered-mithila",
    name: "Unfiltered Mithila",
    type: "image/jpeg",
    dataUrl: "assets/branding/unfiltered-mithila.jpg",
    width: 640,
    height: 640,
    hidden: false,
    locked: false,
    opacity: 1,
    grayscale: false,
    monochrome: false,
    backgroundBox: false
  },
  presenterLogo: {
    id: "official-bollywood-umang-production",
    name: "Bollywood Umang Production",
    type: "image/png",
    dataUrl: "assets/branding/bollywood-umang-production.png",
    width: 1563,
    height: 1563,
    hidden: false,
    locked: false,
    opacity: 1,
    grayscale: false,
    monochrome: false,
    backgroundBox: false
  }
};

export function createOfficialLogos(): Pick<PosterProject["branding"], "mainLogo" | "productionLogo" | "presenterLogo"> {
  return structuredClone(officialLogos);
}

export function ensureOfficialLogos(project: PosterProject): PosterProject {
  const logos = createOfficialLogos();
  return {
    ...project,
    branding: {
      ...project.branding,
      mainLogo: project.branding.mainLogo ?? logos.mainLogo,
      productionLogo: project.branding.productionLogo ?? logos.productionLogo,
      presenterLogo: project.branding.presenterLogo ?? logos.presenterLogo
    }
  };
}

export function layerDefaults(): LayerSettings[] {
  return [
    ["background", "Background"],
    ["curtain", "Curtain overlay"],
    ["sideLights", "Side lights"],
    ["borders", "Decorative borders"],
    ["presentedBy", "Presented-by text"],
    ["logos", "Top logos"],
    ["eventTitle", "Event title"],
    ["eventYear", "Event year"],
    ["candidateFrame", "Candidate frame"],
    ["candidatePhoto", "Candidate photo"],
    ["congratulations", "Congratulations text"],
    ["candidateName", "Candidate name"],
    ["candidateCategory", "Candidate category"],
    ["contact", "Contact details"],
    ["website", "Website"],
    ["sponsors", "Sponsor section"],
    ["qr", "QR code"],
    ["footer", "Footer ornament"]
  ].map(([id, label]) => ({ id: id as LayerSettings["id"], label, visible: true, locked: id === "background", system: true }));
}

function textStyle(partial: Partial<TextStyle>): TextStyle {
  return {
    fontFamily: "Cinzel",
    fontSize: 52,
    fontWeight: 700,
    italic: false,
    transform: "none",
    letterSpacing: 0,
    lineHeight: 1.08,
    align: "center",
    color: "#F5E8CB",
    strokeColor: "#140003",
    strokeWidth: 0,
    shadow: true,
    glow: false,
    opacity: 1,
    width: 880,
    x: 540,
    y: 200,
    rotation: 0,
    visible: true,
    locked: false,
    ...partial
  };
}

function backgroundFor(id: TemplateId): BackgroundSettings {
  const presets: Record<TemplateId, Pick<BackgroundSettings, "preset" | "baseColor" | "gradientA" | "gradientB" | "overlayColor">> = {
    "official-audition-candidate": { preset: "Official Audition Curtain", baseColor: "#210002", gradientA: "#72000a", gradientB: "#080000", overlayColor: "#120000" },
    "royal-curtain": { preset: "Royal Maroon Curtain", baseColor: "#320006", gradientA: "#57000D", gradientB: "#140003", overlayColor: "#140003" },
    "black-luxury": { preset: "Black and Gold Luxury", baseColor: "#070506", gradientA: "#1f1510", gradientB: "#000000", overlayColor: "#240e00" },
    "burgundy-spotlight": { preset: "Burgundy Spotlight", baseColor: "#42000a", gradientA: "#6d0816", gradientB: "#190005", overlayColor: "#120003" },
    "cream-gold": { preset: "Cream and Gold", baseColor: "#F5E8CB", gradientA: "#fff7e3", gradientB: "#d6ad57", overlayColor: "#5a1b00" },
    "navy-royal": { preset: "Navy Royal", baseColor: "#071323", gradientA: "#11294b", gradientB: "#030813", overlayColor: "#00070f" },
    "modern-red": { preset: "Modern Dark Red", baseColor: "#270006", gradientA: "#720019", gradientB: "#120006", overlayColor: "#160004" }
  };
  return {
    ...presets[id],
    curtainIntensity: id === "cream-gold" ? 0.25 : id === "official-audition-candidate" ? 0.96 : 0.82,
    foldContrast: id === "official-audition-candidate" ? 0.74 : 0.62,
    sideLightIntensity: id === "official-audition-candidate" ? 1 : 0.86,
    goldLightWidth: id === "official-audition-candidate" ? 22 : 16,
    vignette: id === "official-audition-candidate" ? 0.72 : 0.68,
    spotlight: id === "official-audition-candidate" ? 0.34 : 0.55,
    textureOpacity: id === "official-audition-candidate" ? 0.14 : 0.22,
    particleOpacity: id === "official-audition-candidate" ? 0.09 : 0.18,
    brightness: 1,
    blur: 0,
    overlayOpacity: 0.18
  };
}

function textStylesFor(id: TemplateId, size: PosterSize): Record<string, TextStyle> {
  const scaleY = size.height / 1440;
  const isCream = id === "cream-gold";
  const isOfficial = id === "official-audition-candidate";
  const light = isCream ? "#4d1600" : "#F5E8CB";
  const gold = isCream ? "#8b5b0d" : "#F2C34D";
  if (isOfficial) {
    const topBranding = {
      presentedByY: size.height * 0.045,
      eventTitleY: size.height * 0.125,
      eventYearY: size.height * 0.167
    };
    return {
      presentedBy: textStyle({ fontFamily: "Montserrat", fontSize: 24 * scaleY, fontWeight: 500, color: "#EED7AD", width: size.width * 0.5, x: size.width / 2, y: topBranding.presentedByY, transform: "uppercase", letterSpacing: 2.2, shadow: false }),
      eventTitle: textStyle({ fontFamily: "Montserrat", fontSize: 52 * scaleY, fontWeight: 400, color: "#EED7AD", width: size.width * 0.88, x: size.width / 2, y: topBranding.eventTitleY, transform: "uppercase", letterSpacing: 0, glow: false, lineHeight: 1.02 }),
      eventYear: textStyle({ fontFamily: "Montserrat", fontSize: 56 * scaleY, fontWeight: 400, color: "#EED7AD", width: 500, x: size.width / 2, y: topBranding.eventYearY, transform: "uppercase", letterSpacing: 0, shadow: false }),
      congratulations: textStyle({ fontFamily: "Montserrat", fontSize: 35 * scaleY, fontWeight: 400, color: "#EED7AD", width: 780, x: size.width / 2, y: 1016 * scaleY, transform: "uppercase", letterSpacing: 4, shadow: false }),
      candidateName: textStyle({ fontFamily: "Cinzel", fontSize: 62 * scaleY, fontWeight: 800, color: "#EED7AD", width: size.width * 0.82, x: size.width / 2, y: 1128 * scaleY, transform: "uppercase", glow: false, letterSpacing: 0 }),
      candidateCategory: textStyle({ fontFamily: "Montserrat", fontSize: 32 * scaleY, fontWeight: 400, color: "#EED7AD", width: size.width * 0.78, x: size.width / 2, y: 1246 * scaleY, transform: "uppercase", letterSpacing: 3, shadow: false }),
      phone: textStyle({ fontFamily: "Montserrat", fontSize: 23 * scaleY, fontWeight: 400, color: "#EED7AD", width: size.width * 0.62, x: size.width * 0.31, y: 1340 * scaleY, align: "left", letterSpacing: 0, shadow: false }),
      website: textStyle({ fontFamily: "Montserrat", fontSize: 23 * scaleY, fontWeight: 400, color: "#EED7AD", width: size.width * 0.78, x: size.width / 2, y: 1389 * scaleY, visible: true, transform: "uppercase", letterSpacing: 0, shadow: false }),
      footer: textStyle({ fontFamily: "Montserrat", fontSize: 18 * scaleY, fontWeight: 500, color: light, width: size.width * 0.78, x: size.width / 2, y: 1418 * scaleY, opacity: 0.68, visible: false })
    };
  }
  return {
    presentedBy: textStyle({ fontFamily: "Montserrat", fontSize: 20 * scaleY, fontWeight: 600, color: gold, width: 620, x: size.width / 2, y: 108 * scaleY, transform: "uppercase", letterSpacing: 2 }),
    eventTitle: textStyle({ fontFamily: "Cinzel Decorative", fontSize: 54 * scaleY, fontWeight: 700, color: light, width: size.width * 0.82, x: size.width / 2, y: 244 * scaleY, glow: true, lineHeight: 0.96 }),
    eventYear: textStyle({ fontFamily: "Montserrat", fontSize: 26 * scaleY, fontWeight: 600, color: gold, width: 500, x: size.width / 2, y: 300 * scaleY, transform: "uppercase", letterSpacing: 1.5 }),
    congratulations: textStyle({ fontFamily: "Montserrat", fontSize: 34 * scaleY, fontWeight: 500, color: gold, width: 780, x: size.width / 2, y: 1036 * scaleY, transform: "uppercase", letterSpacing: 4, shadow: false }),
    candidateName: textStyle({ fontFamily: "Playfair Display", fontSize: 68 * scaleY, fontWeight: 800, color: light, width: size.width * 0.84, x: size.width / 2, y: 1188 * scaleY, transform: "uppercase", glow: true, letterSpacing: 1 }),
    candidateCategory: textStyle({ fontFamily: "Montserrat", fontSize: 34 * scaleY, fontWeight: 700, color: gold, width: size.width * 0.78, x: size.width / 2, y: 1288 * scaleY, transform: "uppercase", letterSpacing: 1 }),
    phone: textStyle({ fontFamily: "Montserrat", fontSize: 22 * scaleY, fontWeight: 600, color: light, width: size.width * 0.78, x: size.width / 2, y: 1360 * scaleY }),
    website: textStyle({ fontFamily: "Montserrat", fontSize: 22 * scaleY, fontWeight: 600, color: gold, width: size.width * 0.78, x: size.width / 2, y: 1398 * scaleY, visible: false }),
    footer: textStyle({ fontFamily: "Montserrat", fontSize: 18 * scaleY, fontWeight: 500, color: light, width: size.width * 0.78, x: size.width / 2, y: 1418 * scaleY, opacity: 0.68, visible: false })
  };
}

export function createDefaultProject(templateId: TemplateId = "official-audition-candidate", sizeId: PosterSizeId = "poster-3-4"): PosterProject {
  const size = posterSizes.find((item) => item.id === sizeId) ?? posterSizes[0];
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    name: "Untitled Candidate Poster",
    createdAt: now,
    updatedAt: now,
    size,
    templateId,
    candidate: {
      fullName: "Candidate Name",
      number: "",
      id: "",
      title: "",
      category: "AUDITIONS CONTESTANT",
      auditionCategory: "",
      status: "Finalist",
      rank: "",
      city: "",
      state: "",
      age: "",
      profession: "",
      qualification: "",
      achievement: "",
      description: "",
      congratulationsHeading: "CONGRATULATIONS",
      customMessage: ""
    },
    event: {
      organisationName: "Dakuloves Production",
      presentedBy: "PRESENTED BY",
      title: "REAL TITLE OF MR & MISS BIHAR",
      subtitle: "",
      year: String(new Date().getFullYear()),
      season: "",
      auditionTitle: "",
      auditionCategory: "",
      venue: "",
      eventDate: "",
      resultDate: "",
      registrationNumber: "",
      contestantId: "",
      termsLine: "",
      footerNote: ""
    },
    contact: {
      primaryPhone: "7765001122",
      secondaryPhone: "9122441332",
      thirdPhone: "6207276248",
      whatsapp: "",
      website: "DAKULOVESPRODUCTIONS.IN",
      email: "",
      instagram: "",
      facebook: "",
      youtube: "",
      address: "",
      registrationUrl: "",
      candidateProfileUrl: "",
      phoneDisplayMode: "comma",
      iconSize: 24,
      iconColor: "#F2C34D"
    },
    photoTransform: {
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
      rotate: 0,
      flipX: false,
      flipY: false,
      brightness: 1,
      contrast: 1,
      saturation: 1,
      blur: 0,
      exposure: 1,
      opacity: 1
    },
    photoFrame: {
      x: size.width * 0.213,
      y: size.height * 0.203,
      width: size.width * 0.574,
      height: size.height * 0.485,
      radius: size.width * 0.078,
      borderWidth: 0,
      borderColor: "#F5E8CB",
      shadowBlur: 28,
      shadowOpacity: 0.55,
      shape: "rounded"
    },
    branding: {
      ...createOfficialLogos(),
      partnerLogos: [],
      sponsorLogos: [],
      mediaPartnerLogos: [],
      certificationLogos: [],
      logoGap: 18,
      maxLogoHeight: 70,
      verticalAlign: "middle"
    },
    background: backgroundFor(templateId),
    qr: { visible: false, source: "website", customUrl: "", size: 120, x: size.width - 180, y: size.height - 210, foreground: "#140003", background: "#F5E8CB", margin: 1, border: 10 },
    decorations: { dividers: true, diamond: true, sparkles: true, cornerOrnaments: false, outerBorder: false, innerBorder: false, sideGoldLines: true, footerFlourish: true, color: "#EED7AD", opacity: 0.8 },
    textStyles: textStylesFor(templateId, size),
    layers: layerDefaults(),
    export: { format: "png", scale: 2, jpgQuality: 0.92, transparentPng: false, pdfPage: "poster", bleedMm: 0, cropMarks: false },
    allowNoPhoto: false
  };
}

export function applyTemplate(project: PosterProject, templateId: TemplateId): PosterProject {
  const officialFrame = {
    ...project.photoFrame,
    x: project.size.width * 0.213,
    y: project.size.height * 0.203,
    width: project.size.width * 0.574,
    height: project.size.height * 0.485,
    radius: project.size.width * 0.078,
    borderWidth: 0,
    shape: "rounded" as const
  };
  return {
    ...project,
    templateId,
    updatedAt: new Date().toISOString(),
    background: backgroundFor(templateId),
    photoFrame: templateId === "official-audition-candidate" ? officialFrame : project.photoFrame,
    decorations: templateId === "official-audition-candidate"
      ? { ...project.decorations, dividers: true, sparkles: true, cornerOrnaments: false, outerBorder: false, innerBorder: false, sideGoldLines: true, footerFlourish: true, color: "#EED7AD", opacity: 0.8 }
      : project.decorations,
    branding: templateId === "official-audition-candidate" ? { ...project.branding, logoGap: 18, maxLogoHeight: 70 } : project.branding,
    export: templateId === "official-audition-candidate" ? { ...project.export, format: "png", scale: 2 } : project.export,
    textStyles: textStylesFor(templateId, project.size)
  };
}

export function applySize(project: PosterProject, sizeId: PosterSizeId): PosterProject {
  const size = posterSizes.find((item) => item.id === sizeId) ?? project.size;
  return {
    ...project,
    size,
    updatedAt: new Date().toISOString(),
    photoFrame: project.templateId === "official-audition-candidate"
      ? { ...project.photoFrame, x: size.width * 0.213, y: size.height * 0.203, width: size.width * 0.574, height: size.height * 0.485, radius: size.width * 0.078, borderWidth: 0, shape: "rounded" }
      : { ...project.photoFrame, x: size.width * 0.15, y: size.height * 0.22, width: size.width * 0.7, height: size.height * 0.47, radius: 0, shape: "rectangle" },
    textStyles: textStylesFor(project.templateId, size),
    qr: { ...project.qr, x: size.width - 180, y: size.height - 210 }
  };
}
