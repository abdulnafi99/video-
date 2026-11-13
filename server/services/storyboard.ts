import crypto from "node:crypto";
import type { Project, Scene, SceneTemplateId, TransitionType } from "../../shared/types";

/**
 * Deterministic storyboard generator. It turns the project brief into a
 * structured, fully editable scene list following a proven promo arc:
 *   hook → product → benefits → proof/statement → brand → call to action.
 * No external AI service is required; every field can be edited afterwards.
 */

interface Beat {
  template: SceneTemplateId;
  weight: number; // share of total duration
  transition: TransitionType;
  variant?: string;
  build: (p: Project, L: Copy) => Partial<Scene>;
}

interface Copy {
  hook: (p: Project) => string;
  hookSub: (p: Project) => string;
  productHead: (p: Project) => string;
  benefitsHead: string;
  benefitsEyebrow: string;
  defaultBenefits: string[];
  statement: (p: Project) => string;
  ctaHead: string;
  ctaSub: (p: Project) => string;
  ctaButton: string;
  phases: string[];
}

const COPY: Record<"ms" | "en", Copy> = {
  ms: {
    hook: (p) => (p.objective ? firstSentence(p.objective) : `Kenali ${p.productName}`),
    hookSub: (p) => p.audience ? `Untuk ${p.audience.toLowerCase()}` : p.brandName,
    productHead: (p) => p.productName,
    benefitsHead: "Kenapa pilih kami",
    benefitsEyebrow: "Kelebihan",
    defaultBenefits: ["Reka bentuk premium", "Kualiti terjamin", "Siap lebih pantas", "Harga berpatutan"],
    statement: (p) => `Direka teliti.|Dibina untuk anda.|${p.brandName}.`,
    ctaHead: "Mulakan hari ini",
    ctaSub: (p) => `Hubungi ${p.brandName} untuk maklumat lanjut.`,
    ctaButton: "Hubungi kami",
    phases: ["Asas", "Struktur", "Dinding", "Bumbung", "Siap"],
  },
  en: {
    hook: (p) => (p.objective ? firstSentence(p.objective) : `Meet ${p.productName}`),
    hookSub: (p) => p.audience ? `Made for ${p.audience.toLowerCase()}` : p.brandName,
    productHead: (p) => p.productName,
    benefitsHead: "Why it stands apart",
    benefitsEyebrow: "Highlights",
    defaultBenefits: ["Premium design", "Built to last", "Faster delivery", "Honest pricing"],
    statement: (p) => `Thoughtfully designed.|Built for you.|${p.brandName}.`,
    ctaHead: "Start today",
    ctaSub: (p) => `Talk to ${p.brandName} to learn more.`,
    ctaButton: "Get in touch",
    phases: ["Base", "Frame", "Walls", "Roof", "Done"],
  },
};

function firstSentence(s: string) {
  const t = s.split(/[.!?\n]/)[0].trim();
  return t.length > 60 ? t.slice(0, 57).trimEnd() + "…" : t;
}

function benefitsFrom(p: Project, L: Copy) {
  const found = p.description
    .split(/[\n•;,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3 && s.length < 48);
  return (found.length >= 3 ? found : L.defaultBenefits).slice(0, 4);
}

const BEATS: Beat[] = [
  {
    template: "cinematic-intro", weight: 0.13, transition: "dissolve",
    build: (p, L) => ({
      headline: L.hook(p), subline: L.hookSub(p),
      visualDescription: "Darkness, a single beam of warm light opens the frame.",
      cameraMovement: "Slow push-in", animationDirection: "Beam expands, headline rises word by word from a soft blur.",
      audioDirection: "Music swells in softly; low whoosh as the beam opens.",
    }),
  },
  {
    template: "product-showcase", weight: 0.2, transition: "crossfade",
    build: (p, L) => ({
      headline: L.productHead(p), subline: firstSentence(p.description || p.objective || ""),
      visualDescription: "Hero image or footage of the product, full bleed.",
      cameraMovement: "Ken Burns drift left to right", animationDirection: "Lower-third title reveal, light sweep.",
      audioDirection: "Music settles into the main groove.",
    }),
  },
  {
    template: "feature-showcase", weight: 0.22, transition: "slide",
    build: (p, L) => ({
      headline: L.benefitsHead, subline: L.benefitsEyebrow, bullets: benefitsFrom(p, L),
      visualDescription: "Glass feature cards over a soft-focus product backdrop.",
      cameraMovement: "Gentle push", animationDirection: "Cards rise and sharpen one after another, each with a shine.",
      audioDirection: "Soft tick on each card.",
    }),
  },
  {
    template: "typography-statement", weight: 0.14, transition: "fade-black",
    build: (p, L) => ({
      headline: L.statement(p), subline: "",
      visualDescription: "Big confident typography on black.",
      cameraMovement: "Slow pull-back", animationDirection: "Lines rise from masks; last line in accent colour.",
      audioDirection: "Music breathes; short pause before brand.",
    }),
  },
  {
    template: "logo-reveal", weight: 0.13, transition: "crossfade", variant: "light",
    build: (p) => ({
      headline: p.brandName, subline: p.productName,
      visualDescription: "Brand mark on a clean ivory stage.",
      cameraMovement: "Settle (scale 1.04 → 1)", animationDirection: "Arcs draw, logo resolves from blur, light sweep across the mark.",
      audioDirection: "Shimmer accent on the logo sweep.",
    }),
  },
  {
    template: "final-cta", weight: 0.18, transition: "match-cut",
    build: (p, L) => ({
      headline: L.ctaHead, subline: L.ctaSub(p), bullets: [L.ctaButton],
      visualDescription: "Call to action with contact details and logo chip.",
      cameraMovement: "Settle", animationDirection: "Headline reveal, button pops with shine, contacts fade in.",
      audioDirection: "Music resolves on the final chord.",
    }),
  },
];

export function generateStoryboard(project: Project, opts: { includeBuild3d?: boolean } = {}): Scene[] {
  const L = COPY[project.language] ?? COPY.en;
  const beats = [...BEATS];
  if (opts.includeBuild3d) {
    beats.splice(1, 1, {
      template: "house-build-3d", weight: 0.24, transition: "crossfade", variant: "build",
      build: (p, Lc) => ({
        headline: Lc.productHead(p), subline: p.brandName, bullets: Lc.phases,
        visualDescription: "3D construction sequence: base, frame, walls, roof, lights on.",
        cameraMovement: "High orbit descending to eye level", animationDirection: "Pieces assemble in order with eased drops.",
        audioDirection: "Rhythmic build; subtle impacts as pieces land.",
      }),
    });
  }
  const total = Math.max(6, project.duration);
  // account for transition overlap so the final cut lands close to the target
  const overlap = beats.slice(0, -1).reduce((a, b) => a + (b.transition === "match-cut" ? 0 : b.transition === "fade-black" ? 0.8 : b.transition === "dissolve" ? 0.9 : 0.65), 0);
  const weightSum = beats.reduce((a, b) => a + b.weight, 0);
  return beats.map((b, i) => {
    const base = b.build(project, L);
    const duration = Math.max(2.5, Math.round(((total + overlap) * b.weight) / weightSum * 10) / 10);
    return {
      id: crypto.randomUUID().slice(0, 12),
      order: i,
      template: b.template,
      duration,
      headline: base.headline ?? "",
      subline: base.subline ?? "",
      bullets: base.bullets ?? [],
      visualDescription: base.visualDescription ?? "",
      cameraMovement: base.cameraMovement ?? "",
      animationDirection: base.animationDirection ?? "",
      animationPreset: "cinematic",
      transition: b.transition,
      audioDirection: base.audioDirection ?? "",
      voiceOver: [base.headline, base.subline].filter(Boolean).join(". ").replace(/\|/g, " ").replace(/\.\./g, "."),
      mediaIds: [],
      variant: b.variant,
    } satisfies Scene;
  });
}
