export type PosterSizeId = "poster-3-4" | "instagram" | "story" | "square" | "a4" | "a5" | "custom";
export type TemplateId =
  | "royal-curtain"
  | "black-luxury"
  | "burgundy-spotlight"
  | "cream-gold"
  | "navy-royal"
  | "modern-red";
export type ExportFormat = "png" | "jpg" | "pdf";
export type CropShape = "rounded" | "rectangle" | "square" | "circle" | "oval" | "portrait";
export type PhoneDisplayMode = "comma" | "bullet" | "lines";
export type LayerId =
  | "background"
  | "curtain"
  | "sideLights"
  | "borders"
  | "presentedBy"
  | "logos"
  | "eventTitle"
  | "eventYear"
  | "candidateFrame"
  | "candidatePhoto"
  | "congratulations"
  | "candidateName"
  | "candidateCategory"
  | "contact"
  | "website"
  | "sponsors"
  | "qr"
  | "footer";

export interface PosterSize {
  id: PosterSizeId;
  label: string;
  width: number;
  height: number;
  print?: "A4" | "A5";
}

export interface CandidateDetails {
  fullName: string;
  number: string;
  id: string;
  title: string;
  category: string;
  auditionCategory: string;
  status: string;
  rank: string;
  city: string;
  state: string;
  age: string;
  profession: string;
  qualification: string;
  achievement: string;
  description: string;
  congratulationsHeading: string;
  customMessage: string;
}

export interface EventDetails {
  organisationName: string;
  presentedBy: string;
  title: string;
  subtitle: string;
  year: string;
  season: string;
  auditionTitle: string;
  auditionCategory: string;
  venue: string;
  eventDate: string;
  resultDate: string;
  registrationNumber: string;
  contestantId: string;
  termsLine: string;
  footerNote: string;
}

export interface ContactDetails {
  primaryPhone: string;
  secondaryPhone: string;
  thirdPhone: string;
  whatsapp: string;
  website: string;
  email: string;
  instagram: string;
  facebook: string;
  youtube: string;
  address: string;
  registrationUrl: string;
  candidateProfileUrl: string;
  phoneDisplayMode: PhoneDisplayMode;
  iconSize: number;
  iconColor: string;
}

export interface AssetRef {
  id: string;
  name: string;
  type: string;
  dataUrl: string;
  width?: number;
  height?: number;
}

export interface LogoAsset extends AssetRef {
  hidden: boolean;
  locked: boolean;
  opacity: number;
  grayscale: boolean;
  monochrome: boolean;
  backgroundBox: boolean;
}

export interface BrandingSettings {
  mainLogo?: LogoAsset;
  productionLogo?: LogoAsset;
  presenterLogo?: LogoAsset;
  partnerLogos: LogoAsset[];
  sponsorLogos: LogoAsset[];
  mediaPartnerLogos: LogoAsset[];
  certificationLogos: LogoAsset[];
  logoGap: number;
  maxLogoHeight: number;
  verticalAlign: "top" | "middle" | "bottom";
}

export interface PhotoTransform {
  zoom: number;
  offsetX: number;
  offsetY: number;
  rotate: number;
  flipX: boolean;
  flipY: boolean;
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  exposure: number;
  opacity: number;
}

export interface PhotoFrame {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  borderWidth: number;
  borderColor: string;
  shadowBlur: number;
  shadowOpacity: number;
  shape: CropShape;
}

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  italic: boolean;
  transform: "none" | "uppercase" | "lowercase";
  letterSpacing: number;
  lineHeight: number;
  align: CanvasTextAlign;
  color: string;
  strokeColor: string;
  strokeWidth: number;
  shadow: boolean;
  glow: boolean;
  opacity: number;
  width: number;
  x: number;
  y: number;
  rotation: number;
  visible: boolean;
  locked: boolean;
}

export interface BackgroundSettings {
  preset: string;
  baseColor: string;
  gradientA: string;
  gradientB: string;
  curtainIntensity: number;
  foldContrast: number;
  sideLightIntensity: number;
  goldLightWidth: number;
  vignette: number;
  spotlight: number;
  textureOpacity: number;
  particleOpacity: number;
  brightness: number;
  blur: number;
  overlayColor: string;
  overlayOpacity: number;
  customAsset?: AssetRef;
}

export interface QRSettings {
  visible: boolean;
  source: "website" | "whatsapp" | "registration" | "profile" | "custom";
  customUrl: string;
  size: number;
  x: number;
  y: number;
  foreground: string;
  background: string;
  margin: number;
  border: number;
}

export interface DecorativeSettings {
  dividers: boolean;
  diamond: boolean;
  sparkles: boolean;
  cornerOrnaments: boolean;
  outerBorder: boolean;
  innerBorder: boolean;
  sideGoldLines: boolean;
  footerFlourish: boolean;
  color: string;
  opacity: number;
}

export interface LayerSettings {
  id: LayerId;
  label: string;
  visible: boolean;
  locked: boolean;
  system: boolean;
}

export interface ExportSettings {
  format: ExportFormat;
  scale: 1 | 2 | 3;
  jpgQuality: number;
  transparentPng: boolean;
  pdfPage: "poster" | "a4" | "a5" | "custom";
  bleedMm: number;
  cropMarks: boolean;
}

export interface PosterProject {
  schemaVersion: 1;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  size: PosterSize;
  templateId: TemplateId;
  candidate: CandidateDetails;
  event: EventDetails;
  contact: ContactDetails;
  candidatePhoto?: AssetRef;
  photoTransform: PhotoTransform;
  photoFrame: PhotoFrame;
  branding: BrandingSettings;
  background: BackgroundSettings;
  qr: QRSettings;
  decorations: DecorativeSettings;
  textStyles: Record<string, TextStyle>;
  layers: LayerSettings[];
  export: ExportSettings;
  allowNoPhoto: boolean;
}

export interface ValidationIssue {
  level: "error" | "warning";
  field: string;
  message: string;
}

export interface BulkCandidateRow {
  candidate_name: string;
  candidate_number?: string;
  candidate_id?: string;
  candidate_category?: string;
  candidate_title?: string;
  city?: string;
  state?: string;
  status?: string;
  rank?: string;
  phone?: string;
  phone_2?: string;
  website?: string;
  photo_url?: string;
  photo_filename?: string;
  qr_url?: string;
  custom_message?: string;
}
