import type { BackgroundSettings, LayerSettings, PosterProject, PosterSize, PosterSizeId, TemplateId, TextStyle } from "./types";

export const posterSizes: PosterSize[] = [
  { id: "poster-3-4", label: "1080 x 1440 Poster", width: 1080, height: 1440 },
  { id: "instagram", label: "1080 x 1350 Instagram", width: 1080, height: 1350 },
  { id: "story", label: "1080 x 1920 Story/Reel", width: 1080, height: 1920 },
  { id: "square", label: "1080 x 1080 Square", width: 1080, height: 1080 },
  { id: "a4", label: "A4 300 DPI", width: 2480, height: 3508, print: "A4" },
  { id: "a5", label: "A5 300 DPI", width: 1748, height: 2480, print: "A5" }
];

export const templateNames: Record<TemplateId, string> = {
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
    "royal-curtain": { preset: "Royal Maroon Curtain", baseColor: "#320006", gradientA: "#57000D", gradientB: "#140003", overlayColor: "#140003" },
    "black-luxury": { preset: "Black and Gold Luxury", baseColor: "#070506", gradientA: "#1f1510", gradientB: "#000000", overlayColor: "#240e00" },
    "burgundy-spotlight": { preset: "Burgundy Spotlight", baseColor: "#42000a", gradientA: "#6d0816", gradientB: "#190005", overlayColor: "#120003" },
    "cream-gold": { preset: "Cream and Gold", baseColor: "#F5E8CB", gradientA: "#fff7e3", gradientB: "#d6ad57", overlayColor: "#5a1b00" },
    "navy-royal": { preset: "Navy Royal", baseColor: "#071323", gradientA: "#11294b", gradientB: "#030813", overlayColor: "#00070f" },
    "modern-red": { preset: "Modern Dark Red", baseColor: "#270006", gradientA: "#720019", gradientB: "#120006", overlayColor: "#160004" }
  };
  return {
    ...presets[id],
    curtainIntensity: id === "cream-gold" ? 0.25 : 0.82,
    foldContrast: 0.62,
    sideLightIntensity: 0.86,
    goldLightWidth: 16,
    vignette: 0.68,
    spotlight: 0.55,
    textureOpacity: 0.22,
    particleOpacity: 0.18,
    brightness: 1,
    blur: 0,
    overlayOpacity: 0.18
  };
}

function textStylesFor(id: TemplateId, size: PosterSize): Record<string, TextStyle> {
  const scaleY = size.height / 1440;
  const isCream = id === "cream-gold";
  const light = isCream ? "#4d1600" : "#F5E8CB";
  const gold = isCream ? "#8b5b0d" : "#F2C34D";
  return {
    presentedBy: textStyle({ fontFamily: "Montserrat", fontSize: 23 * scaleY, fontWeight: 600, color: gold, width: 620, x: size.width / 2, y: 96 * scaleY, transform: "uppercase" }),
    eventTitle: textStyle({ fontFamily: "Cinzel Decorative", fontSize: 66 * scaleY, fontWeight: 700, color: light, width: size.width * 0.82, x: size.width / 2, y: 210 * scaleY, glow: true }),
    eventYear: textStyle({ fontFamily: "Cinzel", fontSize: 60 * scaleY, fontWeight: 800, color: gold, width: 500, x: size.width / 2, y: 330 * scaleY }),
    congratulations: textStyle({ fontFamily: "Montserrat", fontSize: 36 * scaleY, fontWeight: 700, color: gold, width: 780, x: size.width / 2, y: 920 * scaleY, transform: "uppercase", letterSpacing: 3 }),
    candidateName: textStyle({ fontFamily: "Playfair Display", fontSize: 78 * scaleY, fontWeight: 800, color: light, width: size.width * 0.86, x: size.width / 2, y: 1012 * scaleY, glow: true }),
    candidateCategory: textStyle({ fontFamily: "Cormorant Garamond", fontSize: 40 * scaleY, fontWeight: 700, color: gold, width: size.width * 0.78, x: size.width / 2, y: 1115 * scaleY }),
    phone: textStyle({ fontFamily: "Montserrat", fontSize: 27 * scaleY, fontWeight: 600, color: light, width: size.width * 0.78, x: size.width / 2, y: 1240 * scaleY }),
    website: textStyle({ fontFamily: "Montserrat", fontSize: 27 * scaleY, fontWeight: 600, color: gold, width: size.width * 0.78, x: size.width / 2, y: 1290 * scaleY }),
    footer: textStyle({ fontFamily: "Montserrat", fontSize: 20 * scaleY, fontWeight: 500, color: light, width: size.width * 0.78, x: size.width / 2, y: 1360 * scaleY, opacity: 0.78 })
  };
}

export function createDefaultProject(templateId: TemplateId = "royal-curtain", sizeId: PosterSizeId = "poster-3-4"): PosterProject {
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
      category: "Audition Category",
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
      organisationName: "Your Organisation",
      presentedBy: "Presented By",
      title: "Grand Talent Auditions",
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
      footerNote: "Create, customise and export premium candidate announcements."
    },
    contact: {
      primaryPhone: "+91 98765 43210",
      secondaryPhone: "",
      thirdPhone: "",
      whatsapp: "",
      website: "www.example.com",
      email: "",
      instagram: "",
      facebook: "",
      youtube: "",
      address: "",
      registrationUrl: "",
      candidateProfileUrl: "",
      phoneDisplayMode: "bullet",
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
      x: size.width * 0.18,
      y: size.height * 0.31,
      width: size.width * 0.64,
      height: size.height * 0.34,
      radius: 72,
      borderWidth: 7,
      borderColor: "#F5E8CB",
      shadowBlur: 36,
      shadowOpacity: 0.42,
      shape: "rounded"
    },
    branding: {
      partnerLogos: [],
      sponsorLogos: [],
      mediaPartnerLogos: [],
      certificationLogos: [],
      logoGap: 22,
      maxLogoHeight: 72,
      verticalAlign: "middle"
    },
    background: backgroundFor(templateId),
    qr: { visible: false, source: "website", customUrl: "", size: 120, x: size.width - 180, y: size.height - 210, foreground: "#140003", background: "#F5E8CB", margin: 1, border: 10 },
    decorations: { dividers: true, diamond: true, sparkles: true, cornerOrnaments: true, outerBorder: true, innerBorder: true, sideGoldLines: true, footerFlourish: true, color: "#F2C34D", opacity: 0.92 },
    textStyles: textStylesFor(templateId, size),
    layers: layerDefaults(),
    export: { format: "png", scale: 1, jpgQuality: 0.92, transparentPng: false, pdfPage: "poster", bleedMm: 0, cropMarks: false },
    allowNoPhoto: false
  };
}

export function applyTemplate(project: PosterProject, templateId: TemplateId): PosterProject {
  return {
    ...project,
    templateId,
    updatedAt: new Date().toISOString(),
    background: backgroundFor(templateId),
    textStyles: textStylesFor(templateId, project.size)
  };
}

export function applySize(project: PosterProject, sizeId: PosterSizeId): PosterProject {
  const size = posterSizes.find((item) => item.id === sizeId) ?? project.size;
  return {
    ...project,
    size,
    updatedAt: new Date().toISOString(),
    photoFrame: { ...project.photoFrame, x: size.width * 0.18, y: size.height * 0.31, width: size.width * 0.64, height: size.height * 0.34 },
    textStyles: textStylesFor(project.templateId, size),
    qr: { ...project.qr, x: size.width - 180, y: size.height - 210 }
  };
}
