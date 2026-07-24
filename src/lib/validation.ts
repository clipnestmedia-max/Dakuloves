import type { PosterProject, ValidationIssue } from "./types";

function validUrl(value: string): boolean {
  if (!value) return true;
  try {
    const normalized = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    new URL(normalized);
    return true;
  } catch {
    return false;
  }
}

export function validateProject(project: PosterProject): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!project.candidate.fullName.trim()) issues.push({ level: "error", field: "Candidate name", message: "Candidate name is required." });
  if (!project.event.title.trim()) issues.push({ level: "error", field: "Event title", message: "Event title is required." });
  if (!project.candidatePhoto && !project.allowNoPhoto) issues.push({ level: "error", field: "Candidate photo", message: "Upload a candidate photo or explicitly allow no-photo export." });
  if (project.candidatePhoto && ((project.candidatePhoto.width ?? 0) < 900 || (project.candidatePhoto.height ?? 0) < 900)) {
    issues.push({ level: "warning", field: "Candidate photo", message: "The image is low resolution for high-quality print output." });
  }
  if (!project.branding.mainLogo && !project.branding.presenterLogo && project.event.organisationName.trim()) {
    issues.push({ level: "warning", field: "Logo", message: "No organisation logo is uploaded." });
  }
  for (const [field, value] of [
    ["Website", project.contact.website],
    ["Registration URL", project.contact.registrationUrl],
    ["Candidate profile URL", project.contact.candidateProfileUrl],
    ["Instagram", project.contact.instagram],
    ["Facebook", project.contact.facebook],
    ["YouTube", project.contact.youtube]
  ] as const) {
    if (!validUrl(value)) issues.push({ level: "warning", field, message: `${field} does not look like a valid URL.` });
  }
  if (project.contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(project.contact.email)) {
    issues.push({ level: "warning", field: "Email", message: "Email address is not valid." });
  }
  const frame = project.photoFrame;
  if (frame.x < 0 || frame.y < 0 || frame.x + frame.width > project.size.width || frame.y + frame.height > project.size.height) {
    issues.push({ level: "warning", field: "Photo frame", message: "Photo frame is outside the poster safe area." });
  }
  return issues;
}

export function hasBlockingErrors(project: PosterProject): boolean {
  return validateProject(project).some((issue) => issue.level === "error");
}
