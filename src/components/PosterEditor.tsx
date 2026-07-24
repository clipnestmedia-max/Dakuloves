"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import JSZip from "jszip";
import {
  ArrowDown,
  ArrowUp,
  Download,
  Eye,
  FileArchive,
  FileDown,
  Image as ImageIcon,
  Layers,
  Lock,
  Minus,
  Plus,
  Printer,
  Redo2,
  RefreshCw,
  Save,
  Settings,
  Trash2,
  Undo2,
  Unlock,
  Upload,
  Wand2
} from "lucide-react";
import { downloadBlob, fileToAsset, fileToLogo, sanitizeFilename } from "@/lib/assets";
import { exportJpg, exportPdf, exportPng, qrAsPng, qrAsSvg, renderPosterToCanvas } from "@/lib/renderer";
import { deleteDraft, listDrafts, loadDefaults, saveDefaults, saveDraft, type DraftRecord } from "@/lib/storage";
import { fontOptions, posterSizes, statusOptions, templateNames } from "@/lib/templates";
import { hasBlockingErrors, validateProject } from "@/lib/validation";
import { useEditorStore } from "@/store/editor";
import type { BulkCandidateRow, ContactDetails, LogoAsset, PosterProject, TemplateId, TextStyle } from "@/lib/types";

const tabs = ["Candidate", "Candidate Photo", "Event", "Branding", "Text Styling", "Contact Details", "Sponsors", "Background", "Templates", "Export"];

export function PosterEditor() {
  const { project, zoom, showGuides, selectedLayer, undo, redo, newProject, setProject, updateProject, dirty, markClean } = useEditorStore();
  const [exporting, setExporting] = useState("");
  const [draftOpen, setDraftOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [previewOnly, setPreviewOnly] = useState(false);
  const issues = useMemo(() => validateProject(project), [project]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (dirty) void saveDraft(project).then(markClean);
    }, 10000);
    return () => window.clearInterval(timer);
  }, [dirty, markClean, project]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      void saveDraft(project);
      event.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty, project]);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const editing = target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if (editing) return;
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === "z" && event.shiftKey) {
        event.preventDefault();
        redo();
      } else if (meta && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
      } else if (meta && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveDraft(project).then(markClean);
      } else if (event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        const step = event.shiftKey ? 10 : 1;
        const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
        const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
        updateProject((p) => moveSelected(p, selectedLayer, dx, dy));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [markClean, project, redo, selectedLayer, undo, updateProject]);

  async function runExport(format: "png" | "jpg" | "pdf") {
    if (hasBlockingErrors(project)) return;
    setExporting(`Exporting ${format.toUpperCase()}...`);
    try {
      const blob = format === "png" ? await exportPng(project) : format === "jpg" ? await exportJpg(project) : await exportPdf(project);
      downloadBlob(blob, `${sanitizeFilename(project.candidate.fullName)}-${project.size.width}x${project.size.height}.${format}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setExporting("");
    }
  }

  async function printPoster() {
    setPreviewOnly(true);
    await new Promise((resolve) => setTimeout(resolve, 350));
    window.print();
    setPreviewOnly(false);
  }

  if (previewOnly) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white p-0">
        <PosterCanvas className="max-h-screen max-w-full" exportScale={1} printMode />
      </main>
    );
  }

  return (
    <main className="editor-grid">
      <EditorToolbar
        onNew={newProject}
        onDrafts={() => setDraftOpen(true)}
        onAdmin={() => setAdminOpen(true)}
        onBulk={() => setBulkOpen(true)}
        onPreview={() => setPreviewOnly(true)}
        onReset={() => confirm("Reset this project?") && newProject()}
        onExport={runExport}
        onPrint={printPoster}
      />
      <SettingsPanel />
      <section className="no-print relative row-start-2 flex min-h-[560px] items-center justify-center overflow-auto bg-[#0d0b0c] p-5 md:p-8">
        <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-md border border-white/10 bg-black/35 px-3 py-2 text-xs text-cream">
          <Eye size={14} /> Drag photo to adjust position
        </div>
        <PosterCanvas zoom={zoom} guides={showGuides} />
      </section>
      <LayerPanel />
      <BottomBar issues={issues} exporting={exporting} onExport={runExport} onPrint={printPoster} />
      {draftOpen && <DraftManager onClose={() => setDraftOpen(false)} onLoad={(draft) => setProject(draft.project)} />}
      {adminOpen && <AdminDefaultsModal onClose={() => setAdminOpen(false)} />}
      {bulkOpen && <BulkGenerator onClose={() => setBulkOpen(false)} />}
    </main>
  );
}

function moveSelected(project: PosterProject, selected: string, dx: number, dy: number): PosterProject {
  if (selected === "candidatePhoto") return { ...project, photoTransform: { ...project.photoTransform, offsetX: project.photoTransform.offsetX + dx, offsetY: project.photoTransform.offsetY + dy } };
  if (selected === "candidateFrame") return { ...project, photoFrame: { ...project.photoFrame, x: project.photoFrame.x + dx, y: project.photoFrame.y + dy } };
  const key = selected.replace(/-./g, (value) => value[1].toUpperCase());
  const style = project.textStyles[key];
  if (!style) return project;
  return { ...project, textStyles: { ...project.textStyles, [key]: { ...style, x: style.x + dx, y: style.y + dy } } };
}

function EditorToolbar(props: {
  onNew: () => void;
  onDrafts: () => void;
  onAdmin: () => void;
  onBulk: () => void;
  onPreview: () => void;
  onReset: () => void;
  onExport: (format: "png" | "jpg" | "pdf") => void;
  onPrint: () => void;
}) {
  const { project, zoom, showGuides, setTemplate, setSize, setZoom, setGuides, undo, redo } = useEditorStore();
  return (
    <header className="no-print col-span-3 flex min-w-0 items-center gap-2 border-b border-white/10 bg-[#141012] px-3">
      <div className="flex min-w-[220px] items-center gap-2 font-bold text-cream">
        <Wand2 className="text-brightgold" size={20} /> Candidate Poster Studio
      </div>
      <button className="btn" onClick={props.onNew} title="New project">New</button>
      <select className="input max-w-56" value={project.templateId} onChange={(e) => setTemplate(e.target.value as TemplateId)} aria-label="Template selector">
        {Object.entries(templateNames).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select>
      <select className="input max-w-52" value={project.size.id} onChange={(e) => setSize(e.target.value as never)} aria-label="Poster size selector">
        {posterSizes.map((size) => <option key={size.id} value={size.id}>{size.label}</option>)}
      </select>
      <IconButton label="Undo" onClick={undo}><Undo2 size={17} /></IconButton>
      <IconButton label="Redo" onClick={redo}><Redo2 size={17} /></IconButton>
      <IconButton label="Zoom out" onClick={() => setZoom(zoom - 0.05)}><Minus size={17} /></IconButton>
      <span className="w-14 text-center text-xs text-cream">{Math.round(zoom * 100)}%</span>
      <IconButton label="Zoom in" onClick={() => setZoom(zoom + 0.05)}><Plus size={17} /></IconButton>
      <button className="btn" onClick={() => setZoom(0.46)}>Fit</button>
      <button className="btn" onClick={() => setGuides(!showGuides)}>{showGuides ? "Guides On" : "Guides Off"}</button>
      <button className="btn" onClick={props.onDrafts}><Save size={16} /> Drafts</button>
      <button className="btn" onClick={props.onAdmin}><Settings size={16} /> Defaults</button>
      <button className="btn" onClick={props.onBulk}><FileArchive size={16} /> Bulk</button>
      <button className="btn" onClick={props.onPreview}><Eye size={16} /> Preview</button>
      <button className="btn btn-danger" onClick={props.onReset}><RefreshCw size={16} /> Reset</button>
      <select className="input ml-auto max-w-36" onChange={(e) => e.target.value && props.onExport(e.target.value as "png" | "jpg" | "pdf")} defaultValue="" aria-label="Export menu">
        <option value="" disabled>Export</option>
        <option value="png">PNG</option>
        <option value="jpg">JPG</option>
        <option value="pdf">PDF</option>
      </select>
      <IconButton label="Print poster" onClick={props.onPrint}><Printer size={17} /></IconButton>
    </header>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return <button className="btn !px-2" onClick={onClick} title={label} aria-label={label}>{children}</button>;
}

function PosterCanvas({ zoom, guides, className, printMode = false, exportScale }: { zoom?: number; guides?: boolean; className?: string; printMode?: boolean; exportScale?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { project, selectedLayer, setCandidatePhoto, updateProject, selectLayer } = useEditorStore();
  const [dragging, setDragging] = useState(false);
  const last = useRef({ x: 0, y: 0 });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    void renderPosterToCanvas(canvas, project, { scale: exportScale ?? 1, guides: guides && !printMode, selectedLayer: printMode ? undefined : selectedLayer });
  }, [exportScale, guides, printMode, project, selectedLayer]);

  useEffect(draw, [draw]);

  function pointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (printMode) return;
    const point = canvasPoint(event, project.size.width, project.size.height);
    const f = project.photoFrame;
    if (point.x >= f.x && point.x <= f.x + f.width && point.y >= f.y && point.y <= f.y + f.height) {
      selectLayer("candidatePhoto");
      setDragging(true);
      last.current = point;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  }
  function pointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!dragging) return;
    const point = canvasPoint(event, project.size.width, project.size.height);
    const dx = point.x - last.current.x;
    const dy = point.y - last.current.y;
    last.current = point;
    updateProject((p) => ({ ...p, photoTransform: { ...p.photoTransform, offsetX: p.photoTransform.offsetX + dx, offsetY: p.photoTransform.offsetY + dy } }));
  }
  function pointerUp() {
    setDragging(false);
  }
  function canvasPoint(event: React.PointerEvent<HTMLCanvasElement>, width: number, height: number) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: ((event.clientX - rect.left) / rect.width) * width, y: ((event.clientY - rect.top) / rect.height) * height };
  }
  async function drop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) setCandidatePhoto(await fileToAsset(file));
  }

  return (
    <div ref={wrapRef} onDrop={drop} onDragOver={(e) => e.preventDefault()} className={className}>
      <canvas
        ref={canvasRef}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={pointerUp}
        className={`block bg-black shadow-2xl ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
        style={printMode ? { width: "auto", height: "100vh" } : { width: project.size.width * (zoom ?? 1), height: project.size.height * (zoom ?? 1) }}
      />
    </div>
  );
}

function SettingsPanel() {
  const { activeTab, setActiveTab } = useEditorStore();
  return (
    <aside className="panel no-print row-start-2 overflow-hidden border-r">
      <div className="flex gap-1 overflow-x-auto border-b border-white/10 p-2 md:grid md:grid-cols-2">
        {tabs.map((tab) => <button key={tab} className={`btn whitespace-nowrap !px-2 !py-1 text-xs ${activeTab === tab ? "btn-primary" : ""}`} onClick={() => setActiveTab(tab)}>{tab}</button>)}
      </div>
      <div className="scroll-thin h-[calc(100vh-112px)] overflow-auto p-4">
        {activeTab === "Candidate" && <CandidatePanel />}
        {activeTab === "Candidate Photo" && <PhotoPanel />}
        {activeTab === "Event" && <EventPanel />}
        {activeTab === "Branding" && <BrandingPanel />}
        {activeTab === "Text Styling" && <TextStylePanel />}
        {activeTab === "Contact Details" && <ContactPanel />}
        {activeTab === "Sponsors" && <SponsorPanel />}
        {activeTab === "Background" && <BackgroundPanel />}
        {activeTab === "Templates" && <TemplatePanel />}
        {activeTab === "Export" && <ExportPanel />}
      </div>
    </aside>
  );
}

function CandidatePanel() {
  const { project, updateProject } = useEditorStore();
  const set = (key: keyof PosterProject["candidate"], value: string) => updateProject((p) => ({ ...p, candidate: { ...p.candidate, [key]: value } }));
  return (
    <Section title="Candidate Details">
      <TextField label="Candidate full name" value={project.candidate.fullName} onChange={(v) => set("fullName", v)} />
      <TextField label="Candidate number" value={project.candidate.number} onChange={(v) => set("number", v)} />
      <TextField label="Candidate ID" value={project.candidate.id} onChange={(v) => set("id", v)} />
      <TextField label="Candidate title" value={project.candidate.title} onChange={(v) => set("title", v)} />
      <TextField label="Candidate category" value={project.candidate.category} onChange={(v) => set("category", v)} />
      <TextField label="Audition category" value={project.candidate.auditionCategory} onChange={(v) => set("auditionCategory", v)} />
      <label className="field"><span>Status</span><select className="input" value={project.candidate.status} onChange={(e) => set("status", e.target.value)}>{statusOptions.map((s) => <option key={s}>{s}</option>)}</select></label>
      {(["rank", "city", "state", "age", "profession", "qualification", "achievement"] as const).map((key) => <TextField key={key} label={titleCase(key)} value={project.candidate[key]} onChange={(v) => set(key, v)} />)}
      <TextArea label="Short description" value={project.candidate.description} onChange={(v) => set("description", v)} />
      <TextField label="Custom congratulations heading" value={project.candidate.congratulationsHeading} onChange={(v) => set("congratulationsHeading", v)} />
      <TextArea label="Custom message" value={project.candidate.customMessage} onChange={(v) => set("customMessage", v)} />
    </Section>
  );
}

function PhotoPanel() {
  const { project, setCandidatePhoto, updateProject } = useEditorStore();
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setCandidatePhoto(await fileToAsset(file));
    } catch (error) {
      alert(error instanceof Error ? error.message : "Upload failed.");
    }
  }
  const t = project.photoTransform;
  const f = project.photoFrame;
  const setT = (key: keyof typeof t, value: number | boolean) => updateProject((p) => ({ ...p, photoTransform: { ...p.photoTransform, [key]: value } }));
  const setF = (key: keyof typeof f, value: number | string) => updateProject((p) => ({ ...p, photoFrame: { ...p.photoFrame, [key]: value } }));
  return (
    <>
      <Section title="Upload">
        <label className="btn w-full"><Upload size={16} /> Upload / Replace<input className="hidden" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={upload} /></label>
        <button className="btn" onClick={() => setCandidatePhoto(undefined)}>Remove</button>
        <button className="btn" onClick={() => updateProject((p) => ({ ...p, photoTransform: { ...p.photoTransform, zoom: 1, offsetX: 0, offsetY: 0, rotate: 0, flipX: false, flipY: false } }))}>Reset photo</button>
        {project.candidatePhoto && <p className="text-xs text-cream/70">{project.candidatePhoto.name} · {project.candidatePhoto.width}x{project.candidatePhoto.height}</p>}
      </Section>
      <Section title="Photo Controls">
        <Slider label="Photo zoom" value={t.zoom} min={0.4} max={3} step={0.01} onChange={(v) => setT("zoom", v)} />
        <Slider label="Photo X offset" value={t.offsetX} min={-500} max={500} step={1} onChange={(v) => setT("offsetX", v)} />
        <Slider label="Photo Y offset" value={t.offsetY} min={-500} max={500} step={1} onChange={(v) => setT("offsetY", v)} />
        <Slider label="Rotate" value={t.rotate} min={-180} max={180} step={1} onChange={(v) => setT("rotate", v)} />
        <Toggle label="Flip horizontal" checked={t.flipX} onChange={(v) => setT("flipX", v)} />
        <Toggle label="Flip vertical" checked={t.flipY} onChange={(v) => setT("flipY", v)} />
        <Slider label="Brightness" value={t.brightness} min={0.2} max={2} step={0.01} onChange={(v) => setT("brightness", v)} />
        <Slider label="Contrast" value={t.contrast} min={0.2} max={2} step={0.01} onChange={(v) => setT("contrast", v)} />
        <Slider label="Saturation" value={t.saturation} min={0} max={2} step={0.01} onChange={(v) => setT("saturation", v)} />
        <Slider label="Blur" value={t.blur} min={0} max={8} step={0.1} onChange={(v) => setT("blur", v)} />
        <Slider label="Exposure" value={t.exposure} min={0.5} max={1.8} step={0.01} onChange={(v) => setT("exposure", v)} />
        <Slider label="Opacity" value={t.opacity} min={0} max={1} step={0.01} onChange={(v) => setT("opacity", v)} />
      </Section>
      <Section title="Frame">
        <label className="field"><span>Crop shape</span><select className="input" value={f.shape} onChange={(e) => setF("shape", e.target.value)}>{["rounded", "rectangle", "square", "circle", "oval", "portrait"].map((shape) => <option key={shape}>{shape}</option>)}</select></label>
        <Slider label="Frame width" value={f.width} min={220} max={project.size.width} step={1} onChange={(v) => setF("width", v)} />
        <Slider label="Frame height" value={f.height} min={220} max={project.size.height} step={1} onChange={(v) => setF("height", v)} />
        <Slider label="Frame X position" value={f.x} min={0} max={project.size.width} step={1} onChange={(v) => setF("x", v)} />
        <Slider label="Frame Y position" value={f.y} min={0} max={project.size.height} step={1} onChange={(v) => setF("y", v)} />
        <Slider label="Corner radius" value={f.radius} min={0} max={180} step={1} onChange={(v) => setF("radius", v)} />
        <Slider label="Border width" value={f.borderWidth} min={0} max={24} step={1} onChange={(v) => setF("borderWidth", v)} />
        <ColorField label="Border colour" value={f.borderColor} onChange={(v) => setF("borderColor", v)} />
        <Slider label="Shadow blur" value={f.shadowBlur} min={0} max={80} step={1} onChange={(v) => setF("shadowBlur", v)} />
        <Slider label="Shadow opacity" value={f.shadowOpacity} min={0} max={1} step={0.01} onChange={(v) => setF("shadowOpacity", v)} />
      </Section>
    </>
  );
}

function EventPanel() {
  const { project, updateProject } = useEditorStore();
  const set = (key: keyof PosterProject["event"], value: string) => updateProject((p) => ({ ...p, event: { ...p.event, [key]: value } }));
  return (
    <Section title="Event Details">
      {(["organisationName", "presentedBy", "title", "subtitle", "year", "season", "auditionTitle", "auditionCategory", "venue", "eventDate", "resultDate", "registrationNumber", "contestantId", "termsLine", "footerNote"] as const).map((key) =>
        key === "title" || key === "footerNote" ? <TextArea key={key} label={titleCase(key)} value={project.event[key]} onChange={(v) => set(key, v)} /> : <TextField key={key} label={titleCase(key)} value={project.event[key]} onChange={(v) => set(key, v)} />
      )}
    </Section>
  );
}

function BrandingPanel() {
  const { project, setLogo, addLogo, removeLogo } = useEditorStore();
  return (
    <>
      <Section title="Organisation Logos">
        <LogoUpload label="Main organisation logo" onUpload={(logo) => setLogo("mainLogo", logo)} />
        <LogoUpload label="Production logo" onUpload={(logo) => setLogo("productionLogo", logo)} />
        <LogoUpload label="Presenter logo" onUpload={(logo) => setLogo("presenterLogo", logo)} />
        {(["mainLogo", "productionLogo", "presenterLogo"] as const).map((slot) => project.branding[slot] && <LogoRow key={slot} logo={project.branding[slot]} onDelete={() => setLogo(slot, undefined)} />)}
      </Section>
      <Section title="Partner Logos">
        <LogoUpload label="Add partner logo" onUpload={(logo) => addLogo("partnerLogos", logo)} />
        {project.branding.partnerLogos.map((logo) => <LogoRow key={logo.id} logo={logo} onDelete={() => removeLogo("partnerLogos", logo.id)} />)}
      </Section>
    </>
  );
}

function SponsorPanel() {
  const { project, addLogo, removeLogo } = useEditorStore();
  return (
    <Section title="Sponsors and Media">
      {(["sponsorLogos", "mediaPartnerLogos", "certificationLogos"] as const).map((slot) => (
        <div key={slot} className="grid gap-2 border-b border-white/10 pb-3">
          <LogoUpload label={`Add ${titleCase(slot)}`} onUpload={(logo) => addLogo(slot, logo)} />
          {project.branding[slot].map((logo) => <LogoRow key={logo.id} logo={logo} onDelete={() => removeLogo(slot, logo.id)} />)}
        </div>
      ))}
    </Section>
  );
}

function LogoUpload({ label, onUpload }: { label: string; onUpload: (logo: LogoAsset) => void }) {
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      onUpload(await fileToLogo(file));
    } catch (error) {
      alert(error instanceof Error ? error.message : "Logo upload failed.");
    }
  }
  return <label className="btn w-full"><ImageIcon size={16} /> {label}<input className="hidden" type="file" accept="image/*" onChange={upload} /></label>;
}

function LogoRow({ logo, onDelete }: { logo: LogoAsset; onDelete: () => void }) {
  return <div className="flex items-center justify-between gap-2 rounded-md bg-white/5 px-2 py-2 text-xs"><span className="truncate">{logo.name}</span><button className="btn btn-danger !min-h-7 !px-2" onClick={onDelete}><Trash2 size={14} /></button></div>;
}

function ContactPanel() {
  const { project, updateProject } = useEditorStore();
  const set = (key: keyof ContactDetails, value: string | number) => updateProject((p) => ({ ...p, contact: { ...p.contact, [key]: value } }));
  return (
    <Section title="Contact Details">
      {(["primaryPhone", "secondaryPhone", "thirdPhone", "whatsapp", "website", "email", "instagram", "facebook", "youtube", "address", "registrationUrl", "candidateProfileUrl"] as const).map((key) => <TextField key={key} label={titleCase(key)} value={project.contact[key]} onChange={(v) => set(key, v)} />)}
      <label className="field"><span>Phone display mode</span><select className="input" value={project.contact.phoneDisplayMode} onChange={(e) => set("phoneDisplayMode", e.target.value)}><option value="comma">Comma-separated</option><option value="bullet">Bullet-separated</option><option value="lines">Separate lines</option></select></label>
      <Slider label="Icon size" value={project.contact.iconSize} min={12} max={56} step={1} onChange={(v) => set("iconSize", v)} />
      <ColorField label="Icon colour" value={project.contact.iconColor} onChange={(v) => set("iconColor", v)} />
    </Section>
  );
}

function TextStylePanel() {
  const { project, updateProject } = useEditorStore();
  const [target, setTarget] = useState("candidateName");
  const style = project.textStyles[target];
  const set = (key: keyof TextStyle, value: string | number | boolean) => updateProject((p) => ({ ...p, textStyles: { ...p.textStyles, [target]: { ...p.textStyles[target], [key]: value } } }));
  if (!style) return null;
  return (
    <Section title="Text Styling">
      <label className="field"><span>Text element</span><select className="input" value={target} onChange={(e) => setTarget(e.target.value)}>{Object.keys(project.textStyles).map((key) => <option key={key} value={key}>{titleCase(key)}</option>)}</select></label>
      <label className="field"><span>Font family</span><select className="input" value={style.fontFamily} onChange={(e) => set("fontFamily", e.target.value)}>{fontOptions.map((font) => <option key={font}>{font}</option>)}</select></label>
      <Slider label="Font size" value={style.fontSize} min={10} max={160} step={1} onChange={(v) => set("fontSize", v)} />
      <Slider label="Font weight" value={style.fontWeight} min={300} max={900} step={100} onChange={(v) => set("fontWeight", v)} />
      <Toggle label="Italic" checked={style.italic} onChange={(v) => set("italic", v)} />
      <label className="field"><span>Text transform</span><select className="input" value={style.transform} onChange={(e) => set("transform", e.target.value)}><option value="none">None</option><option value="uppercase">Uppercase</option><option value="lowercase">Lowercase</option></select></label>
      <Slider label="Letter spacing" value={style.letterSpacing} min={0} max={12} step={0.5} onChange={(v) => set("letterSpacing", v)} />
      <Slider label="Line height" value={style.lineHeight} min={0.8} max={1.8} step={0.01} onChange={(v) => set("lineHeight", v)} />
      <ColorField label="Colour" value={style.color} onChange={(v) => set("color", v)} />
      <ColorField label="Stroke colour" value={style.strokeColor} onChange={(v) => set("strokeColor", v)} />
      <Slider label="Stroke width" value={style.strokeWidth} min={0} max={12} step={0.5} onChange={(v) => set("strokeWidth", v)} />
      <Toggle label="Shadow" checked={style.shadow} onChange={(v) => set("shadow", v)} />
      <Toggle label="Glow" checked={style.glow} onChange={(v) => set("glow", v)} />
      <Slider label="Opacity" value={style.opacity} min={0} max={1} step={0.01} onChange={(v) => set("opacity", v)} />
      <Slider label="Width" value={style.width} min={120} max={project.size.width} step={1} onChange={(v) => set("width", v)} />
      <Slider label="X position" value={style.x} min={0} max={project.size.width} step={1} onChange={(v) => set("x", v)} />
      <Slider label="Y position" value={style.y} min={0} max={project.size.height} step={1} onChange={(v) => set("y", v)} />
      <Slider label="Rotation" value={style.rotation} min={-180} max={180} step={1} onChange={(v) => set("rotation", v)} />
      <Toggle label="Visible" checked={style.visible} onChange={(v) => set("visible", v)} />
      <Toggle label="Lock" checked={style.locked} onChange={(v) => set("locked", v)} />
    </Section>
  );
}

function BackgroundPanel() {
  const { project, updateProject } = useEditorStore();
  const b = project.background;
  const set = (key: keyof typeof b, value: string | number) => updateProject((p) => ({ ...p, background: { ...p.background, [key]: value } }));
  return (
    <Section title="Background">
      <label className="field"><span>Preset</span><select className="input" value={b.preset} onChange={(e) => set("preset", e.target.value)}>{["Royal Maroon Curtain", "Burgundy Spotlight", "Black and Gold Luxury", "Navy Royal", "Cream and Gold", "Modern Dark Red", "Custom Uploaded Background"].map((preset) => <option key={preset}>{preset}</option>)}</select></label>
      <ColorField label="Base colour" value={b.baseColor} onChange={(v) => set("baseColor", v)} />
      <ColorField label="Gradient colour A" value={b.gradientA} onChange={(v) => set("gradientA", v)} />
      <ColorField label="Gradient colour B" value={b.gradientB} onChange={(v) => set("gradientB", v)} />
      <Slider label="Curtain intensity" value={b.curtainIntensity} min={0} max={1} step={0.01} onChange={(v) => set("curtainIntensity", v)} />
      <Slider label="Curtain-fold contrast" value={b.foldContrast} min={0} max={1} step={0.01} onChange={(v) => set("foldContrast", v)} />
      <Slider label="Side-light intensity" value={b.sideLightIntensity} min={0} max={1} step={0.01} onChange={(v) => set("sideLightIntensity", v)} />
      <Slider label="Gold-light width" value={b.goldLightWidth} min={2} max={50} step={1} onChange={(v) => set("goldLightWidth", v)} />
      <Slider label="Vignette" value={b.vignette} min={0} max={1} step={0.01} onChange={(v) => set("vignette", v)} />
      <Slider label="Centre spotlight" value={b.spotlight} min={0} max={1} step={0.01} onChange={(v) => set("spotlight", v)} />
      <Slider label="Texture opacity" value={b.textureOpacity} min={0} max={1} step={0.01} onChange={(v) => set("textureOpacity", v)} />
      <Slider label="Decorative-particle opacity" value={b.particleOpacity} min={0} max={1} step={0.01} onChange={(v) => set("particleOpacity", v)} />
      <ColorField label="Overlay colour" value={b.overlayColor} onChange={(v) => set("overlayColor", v)} />
      <Slider label="Overlay opacity" value={b.overlayOpacity} min={0} max={1} step={0.01} onChange={(v) => set("overlayOpacity", v)} />
    </Section>
  );
}

function TemplatePanel() {
  const { project, setTemplate } = useEditorStore();
  return (
    <Section title="Templates">
      <div className="grid gap-3">
        {Object.entries(templateNames).map(([id, name]) => <button key={id} className={`btn min-h-20 justify-start ${project.templateId === id ? "btn-primary" : ""}`} onClick={() => setTemplate(id as TemplateId)}><span className="h-12 w-10 rounded border border-brightgold bg-gradient-to-b from-burgundy to-blackred" /> {name}</button>)}
      </div>
    </Section>
  );
}

function ExportPanel() {
  const { project, updateProject } = useEditorStore();
  const e = project.export;
  const set = (key: keyof typeof e, value: string | number | boolean) => updateProject((p) => ({ ...p, export: { ...p.export, [key]: value } }));
  async function downloadQr(format: "png" | "svg") {
    if (format === "png") {
      downloadBlob(await qrAsPng(project), "poster-qr.png");
    } else {
      downloadBlob(new Blob([await qrAsSvg(project)], { type: "image/svg+xml" }), "poster-qr.svg");
    }
  }
  return (
    <Section title="Export Settings">
      <label className="field"><span>Format</span><select className="input" value={e.format} onChange={(event) => set("format", event.target.value)}><option value="png">PNG</option><option value="jpg">JPG</option><option value="pdf">PDF</option></select></label>
      <label className="field"><span>Render scale</span><select className="input" value={e.scale} onChange={(event) => set("scale", Number(event.target.value))}><option value={1}>1x</option><option value={2}>2x</option><option value={3}>3x</option></select></label>
      <Slider label="JPG quality" value={e.jpgQuality} min={0.4} max={1} step={0.01} onChange={(v) => set("jpgQuality", v)} />
      <Toggle label="Transparent PNG" checked={e.transparentPng} onChange={(v) => set("transparentPng", v)} />
      <label className="field"><span>PDF page</span><select className="input" value={e.pdfPage} onChange={(event) => set("pdfPage", event.target.value)}><option value="poster">Poster size</option><option value="a4">A4</option><option value="a5">A5</option><option value="custom">Custom</option></select></label>
      <Slider label="Bleed mm" value={e.bleedMm} min={0} max={8} step={0.5} onChange={(v) => set("bleedMm", v)} />
      <Toggle label="Crop marks" checked={e.cropMarks} onChange={(v) => set("cropMarks", v)} />
      <Toggle label="Allow no-photo export" checked={project.allowNoPhoto} onChange={(v) => updateProject((p) => ({ ...p, allowNoPhoto: v }))} />
      <button className="btn" onClick={() => void downloadQr("png")}>Download QR PNG</button>
      <button className="btn" onClick={() => void downloadQr("svg")}>Download QR SVG</button>
    </Section>
  );
}

function LayerPanel() {
  const { project, selectedLayer, selectLayer, toggleLayer, lockLayer, moveLayer } = useEditorStore();
  return (
    <aside className="panel no-print row-start-2 overflow-hidden border-l">
      <div className="flex items-center gap-2 border-b border-white/10 p-4 font-semibold"><Layers size={18} /> Layers</div>
      <div className="scroll-thin h-[calc(100vh-112px)] overflow-auto p-3">
        {project.layers.map((layer) => (
          <div key={layer.id} className={`mb-2 grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-1 rounded-md border border-white/10 p-2 ${selectedLayer === layer.id ? "bg-brightgold/20" : "bg-white/5"}`}>
            <button className="truncate text-left text-sm" onClick={() => selectLayer(layer.id)}>{layer.label}</button>
            <button className="btn !min-h-7 !px-2" onClick={() => toggleLayer(layer.id)}>{layer.visible ? <Eye size={14} /> : <Eye size={14} className="opacity-35" />}</button>
            <button className="btn !min-h-7 !px-2" onClick={() => lockLayer(layer.id)}>{layer.locked ? <Lock size={14} /> : <Unlock size={14} />}</button>
            <button className="btn !min-h-7 !px-2" onClick={() => moveLayer(layer.id, -1)}><ArrowUp size={14} /></button>
            <button className="btn !min-h-7 !px-2" onClick={() => moveLayer(layer.id, 1)}><ArrowDown size={14} /></button>
          </div>
        ))}
      </div>
    </aside>
  );
}

function BottomBar({ issues, exporting, onExport, onPrint }: { issues: ReturnType<typeof validateProject>; exporting: string; onExport: (format: "png" | "jpg" | "pdf") => void; onPrint: () => void }) {
  const errors = issues.filter((issue) => issue.level === "error").length;
  const warnings = issues.length - errors;
  return (
    <footer className="no-print col-span-3 flex items-center gap-3 border-t border-white/10 bg-[#141012] px-4 text-sm">
      <span className={errors ? "text-red-300" : "text-green-300"}>{errors} errors</span>
      <span className={warnings ? "text-yellow-200" : "text-cream/60"}>{warnings} warnings</span>
      <div className="scroll-thin flex min-w-0 flex-1 gap-3 overflow-x-auto text-xs text-cream/70">{issues.slice(0, 3).map((issue) => <span key={`${issue.field}-${issue.message}`}>{issue.field}: {issue.message}</span>)}</div>
      {exporting && <span className="text-brightgold">{exporting}</span>}
      <button className="btn btn-primary" disabled={Boolean(errors)} onClick={() => onExport("png")}><Download size={16} /> PNG</button>
      <button className="btn" disabled={Boolean(errors)} onClick={() => onExport("jpg")}>JPG</button>
      <button className="btn" disabled={Boolean(errors)} onClick={() => onExport("pdf")}><FileDown size={16} /> PDF</button>
      <button className="btn" onClick={onPrint}><Printer size={16} /> Print</button>
    </footer>
  );
}

function DraftManager({ onClose, onLoad }: { onClose: () => void; onLoad: (draft: DraftRecord) => void }) {
  const { project, markClean } = useEditorStore();
  const [drafts, setDrafts] = useState<DraftRecord[]>([]);
  const refresh = useCallback(() => void listDrafts().then(setDrafts), []);
  useEffect(refresh, [refresh]);
  return (
    <Modal title="Draft Manager" onClose={onClose}>
      <button className="btn btn-primary" onClick={() => void saveDraft(project).then(() => { markClean(); refresh(); })}><Save size={16} /> Save draft</button>
      <button className="btn" onClick={() => downloadBlob(new Blob([JSON.stringify(project, null, 2)], { type: "application/json" }), `${sanitizeFilename(project.name)}.json`)}>Export project JSON</button>
      <ImportProjectButton />
      <div className="mt-4 grid gap-2">
        {drafts.map((draft) => <div key={draft.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-md bg-white/5 p-3"><div><b>{draft.name}</b><p className="text-xs text-cream/60">{new Date(draft.updatedAt).toLocaleString()}</p></div><button className="btn" onClick={() => { onLoad(draft); onClose(); }}>Restore</button><button className="btn btn-danger" onClick={() => void deleteDraft(draft.id).then(refresh)}><Trash2 size={15} /></button></div>)}
      </div>
    </Modal>
  );
}

function ImportProjectButton() {
  const { setProject } = useEditorStore();
  return <label className="btn"><Upload size={16} /> Import JSON<input className="hidden" type="file" accept="application/json" onChange={(event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setProject(JSON.parse(String(reader.result)) as PosterProject);
    reader.readAsText(file);
  }} /></label>;
}

function AdminDefaultsModal({ onClose }: { onClose: () => void }) {
  const { project, setProject } = useEditorStore();
  return (
    <Modal title="Admin Defaults" onClose={onClose}>
      <div className="grid gap-3 md:grid-cols-2">
        <button className="btn btn-primary" onClick={() => void saveDefaults(project)}>Save as organisation default</button>
        <button className="btn" onClick={() => void loadDefaults().then((defaults) => defaults && setProject(defaults))}>Restore defaults</button>
        <button className="btn" onClick={() => downloadBlob(new Blob([JSON.stringify(project, null, 2)], { type: "application/json" }), "organisation-defaults.json")}>Export defaults JSON</button>
        <ImportProjectButton />
      </div>
    </Modal>
  );
}

function BulkGenerator({ onClose }: { onClose: () => void }) {
  const { project } = useEditorStore();
  const [rows, setRows] = useState<BulkCandidateRow[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [progress, setProgress] = useState("");
  const [search, setSearch] = useState("");
  const filtered = rows.map((row, index) => ({ row, index })).filter(({ row }) => row.candidate_name?.toLowerCase().includes(search.toLowerCase()));
  function sampleCsv() {
    const csv = "candidate_name,candidate_number,candidate_id,candidate_category,candidate_title,city,state,status,rank,phone,phone_2,website,photo_url,photo_filename,qr_url,custom_message\nCandidate Name,001,CAN001,Finalist,Contestant,Delhi,Delhi,Finalist,,+91 98765 43210,,www.example.com,,,https://example.com/profile,Best wishes";
    downloadBlob(new Blob([csv], { type: "text/csv" }), "sample-candidates.csv");
  }
  function parseCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    Papa.parse<BulkCandidateRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        setRows(result.data.filter((row) => row.candidate_name));
        setSelected(new Set(result.data.map((_, index) => index)));
      }
    });
  }
  async function generate(all: boolean) {
    const zip = new JSZip();
    const report = ["row,status,file,error"];
    const targets = all ? rows.map((_, i) => i) : Array.from(selected);
    for (let i = 0; i < targets.length; i += 1) {
      const index = targets[i];
      const row = rows[index];
      setProgress(`Generating ${i + 1} of ${targets.length}: ${row.candidate_name}`);
      try {
        const candidateProject: PosterProject = {
          ...project,
          candidate: {
            ...project.candidate,
            fullName: row.candidate_name,
            number: row.candidate_number ?? "",
            id: row.candidate_id ?? "",
            category: row.candidate_category ?? project.candidate.category,
            title: row.candidate_title ?? "",
            city: row.city ?? "",
            state: row.state ?? "",
            status: row.status ?? project.candidate.status,
            rank: row.rank ?? "",
            customMessage: row.custom_message ?? ""
          },
          contact: { ...project.contact, primaryPhone: row.phone ?? project.contact.primaryPhone, secondaryPhone: row.phone_2 ?? "", website: row.website ?? project.contact.website },
          qr: row.qr_url ? { ...project.qr, visible: true, source: "custom", customUrl: row.qr_url } : project.qr
        };
        if (row.photo_url) candidateProject.candidatePhoto = await urlToAsset(row.photo_url, row.candidate_name);
        const blob = await exportPng(candidateProject);
        const filename = `${sanitizeFilename(row.candidate_number || String(index + 1))}_${sanitizeFilename(row.candidate_name)}.png`;
        zip.file(filename, blob);
        report.push(`${index + 1},success,${filename},`);
      } catch (error) {
        report.push(`${index + 1},failed,,${JSON.stringify(error instanceof Error ? error.message : "Unknown error")}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    zip.file("generation-report.csv", report.join("\n"));
    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlob(blob, "candidate-posters.zip");
    setProgress("Complete");
  }
  return (
    <Modal title="Bulk CSV Poster Generator" onClose={onClose}>
      <div className="flex flex-wrap gap-2">
        <button className="btn" onClick={sampleCsv}>Download sample CSV</button>
        <label className="btn"><Upload size={16} /> Upload CSV<input className="hidden" type="file" accept=".csv,text/csv" onChange={parseCsv} /></label>
        <button className="btn" onClick={() => setSelected(new Set(rows.map((_, index) => index)))}>Select all</button>
        <button className="btn" onClick={() => setSelected(new Set())}>Clear</button>
        <button className="btn btn-primary" disabled={!rows.length} onClick={() => void generate(false)}>Generate selected</button>
        <button className="btn" disabled={!rows.length} onClick={() => void generate(true)}>Generate all</button>
      </div>
      <TextField label="Search candidates" value={search} onChange={setSearch} />
      {progress && <p className="text-sm text-brightgold">{progress}</p>}
      <div className="mt-3 max-h-96 overflow-auto rounded-md border border-white/10">
        {filtered.map(({ row, index }) => <label key={index} className="grid grid-cols-[auto_1fr_1fr] gap-3 border-b border-white/10 p-2 text-sm"><input type="checkbox" checked={selected.has(index)} onChange={(e) => setSelected((old) => { const next = new Set(old); if (e.target.checked) next.add(index); else next.delete(index); return next; })} /><span>{row.candidate_name}</span><span className="text-cream/60">{row.candidate_category}</span></label>)}
      </div>
    </Modal>
  );
}

async function urlToAsset(url: string, name: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not download photo for ${name}`);
  const blob = await response.blob();
  return fileToAsset(new File([blob], `${name}.png`, { type: blob.type || "image/png" }));
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <details open className="mb-4 rounded-md border border-white/10 bg-white/[.035] p-3"><summary className="mb-3 cursor-pointer font-semibold text-champagne">{title}</summary><div className="grid gap-3">{children}</div></details>;
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="field"><span>{label}</span><input className="input" value={value} onChange={(e) => onChange(e.target.value)} /></label>;
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="field"><span>{label}</span><textarea className="input min-h-24 resize-y" value={value} onChange={(e) => onChange(e.target.value)} /></label>;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="field"><span>{label}</span><input className="input" type="color" value={value} onChange={(e) => onChange(e.target.value)} /></label>;
}

function Slider({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  return <label className="field"><span>{label}: {Number(value).toFixed(step < 1 ? 2 : 0)}</span><input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} /></label>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex items-center gap-2 text-sm text-cream"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /> {label}</label>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="panel max-h-[88vh] w-full max-w-4xl overflow-auto rounded-lg border p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-xl font-bold text-champagne">{title}</h2><button className="btn" onClick={onClose}>Close</button></div>
        <div className="grid gap-4">{children}</div>
      </div>
    </div>
  );
}

function titleCase(value: string): string {
  return value.replace(/([A-Z])/g, " $1").replace(/_/g, " ").replace(/^./, (char) => char.toUpperCase());
}
