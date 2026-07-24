"use client";

import { create } from "zustand";
import { applySize, applyTemplate, createDefaultProject } from "@/lib/templates";
import type { AssetRef, LayerId, LogoAsset, PosterProject, PosterSizeId, TemplateId } from "@/lib/types";

interface HistoryEntry {
  project: PosterProject;
}

interface EditorState {
  project: PosterProject;
  selectedLayer: LayerId | "eventTitle" | "candidateName" | "candidatePhoto";
  activeTab: string;
  zoom: number;
  showGuides: boolean;
  dirty: boolean;
  past: HistoryEntry[];
  future: HistoryEntry[];
  setActiveTab: (tab: string) => void;
  setZoom: (zoom: number) => void;
  setGuides: (show: boolean) => void;
  selectLayer: (layer: EditorState["selectedLayer"]) => void;
  setProject: (project: PosterProject, push?: boolean) => void;
  newProject: () => void;
  updateProject: (updater: (project: PosterProject) => PosterProject) => void;
  setTemplate: (templateId: TemplateId) => void;
  setSize: (sizeId: PosterSizeId) => void;
  setCandidatePhoto: (asset?: AssetRef) => void;
  setLogo: (slot: "mainLogo" | "productionLogo" | "presenterLogo", logo?: LogoAsset) => void;
  addLogo: (slot: "partnerLogos" | "sponsorLogos" | "mediaPartnerLogos" | "certificationLogos", logo: LogoAsset) => void;
  removeLogo: (slot: "partnerLogos" | "sponsorLogos" | "mediaPartnerLogos" | "certificationLogos", id: string) => void;
  toggleLayer: (id: LayerId) => void;
  lockLayer: (id: LayerId) => void;
  moveLayer: (id: LayerId, direction: -1 | 1) => void;
  undo: () => void;
  redo: () => void;
  markClean: () => void;
}

const initial = createDefaultProject();

export const useEditorStore = create<EditorState>((set, get) => ({
  project: initial,
  selectedLayer: "candidatePhoto",
  activeTab: "Candidate",
  zoom: 0.46,
  showGuides: true,
  dirty: false,
  past: [],
  future: [],
  setActiveTab: (activeTab) => set({ activeTab }),
  setZoom: (zoom) => set({ zoom: Math.min(1.25, Math.max(0.12, zoom)) }),
  setGuides: (showGuides) => set({ showGuides }),
  selectLayer: (selectedLayer) => set({ selectedLayer }),
  setProject: (project, push = true) => {
    const state = get();
    set({
      project: { ...project, updatedAt: new Date().toISOString() },
      past: push ? [...state.past.slice(-40), { project: state.project }] : state.past,
      future: push ? [] : state.future,
      dirty: true
    });
  },
  newProject: () => get().setProject(createDefaultProject()),
  updateProject: (updater) => get().setProject(updater(get().project)),
  setTemplate: (templateId) => get().setProject(applyTemplate(get().project, templateId)),
  setSize: (sizeId) => get().setProject(applySize(get().project, sizeId)),
  setCandidatePhoto: (asset) => get().updateProject((project) => ({ ...project, candidatePhoto: asset })),
  setLogo: (slot, logo) => get().updateProject((project) => ({ ...project, branding: { ...project.branding, [slot]: logo } })),
  addLogo: (slot, logo) => get().updateProject((project) => ({ ...project, branding: { ...project.branding, [slot]: [...project.branding[slot], logo] } })),
  removeLogo: (slot, id) => get().updateProject((project) => ({ ...project, branding: { ...project.branding, [slot]: project.branding[slot].filter((logo) => logo.id !== id) } })),
  toggleLayer: (id) => get().updateProject((project) => ({ ...project, layers: project.layers.map((layer) => (layer.id === id ? { ...layer, visible: !layer.visible } : layer)) })),
  lockLayer: (id) => get().updateProject((project) => ({ ...project, layers: project.layers.map((layer) => (layer.id === id ? { ...layer, locked: !layer.locked } : layer)) })),
  moveLayer: (id, direction) =>
    get().updateProject((project) => {
      const layers = [...project.layers];
      const index = layers.findIndex((layer) => layer.id === id);
      const next = index + direction;
      if (index < 0 || next < 0 || next >= layers.length) return project;
      const [item] = layers.splice(index, 1);
      layers.splice(next, 0, item);
      return { ...project, layers };
    }),
  undo: () => {
    const { past, future, project } = get();
    const previous = past.at(-1);
    if (!previous) return;
    set({ project: previous.project, past: past.slice(0, -1), future: [{ project }, ...future].slice(0, 40), dirty: true });
  },
  redo: () => {
    const { past, future, project } = get();
    const next = future[0];
    if (!next) return;
    set({ project: next.project, past: [...past, { project }].slice(-40), future: future.slice(1), dirty: true });
  },
  markClean: () => set({ dirty: false })
}));
