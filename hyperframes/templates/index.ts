import type { SceneTemplateId } from "../../shared/types";
import type { SceneTemplate, TemplateContext } from "./common";
import { cinematicIntro } from "./cinematic-intro";
import { logoReveal } from "./logo-reveal";
import { featureShowcase } from "./feature-showcase";
import { typographyStatement } from "./typography-statement";
import { finalCta } from "./final-cta";
import { productShowcase, floatingProduct, uiDemonstration } from "./media-scenes";
import { houseBuild3d } from "./house-build-3d";
import { buildDocument } from "./shell";

export type { TemplateContext } from "./common";

export interface TemplateMeta {
  id: SceneTemplateId;
  label: string;
  description: string;
  defaultDuration: number;
  usesMedia: boolean;
  usesBullets: boolean;
  variants?: { id: string; label: string }[];
}

export const TEMPLATE_META: TemplateMeta[] = [
  { id: "cinematic-intro", label: "Cinematic Intro", description: "A beam of light opens the frame and the headline rises out of it.", defaultDuration: 4, usesMedia: false, usesBullets: false },
  { id: "logo-reveal", label: "Logo Reveal", description: "Arcs draw in, the mark resolves from blur and a light sweep crosses the logo.", defaultDuration: 4, usesMedia: false, usesBullets: false, variants: [{ id: "light", label: "Light stage" }, { id: "dark", label: "Dark stage" }] },
  { id: "product-showcase", label: "Product Showcase", description: "Full-bleed hero image or video with a slow Ken Burns move.", defaultDuration: 5, usesMedia: true, usesBullets: false },
  { id: "feature-showcase", label: "Feature Showcase", description: "Headline and up to four glass feature cards revealed in sequence.", defaultDuration: 5, usesMedia: true, usesBullets: true },
  { id: "ui-demonstration", label: "UI Demonstration", description: "Device mockup with a screenshot that scrolls like a live demo.", defaultDuration: 5, usesMedia: true, usesBullets: false },
  { id: "floating-product", label: "Floating Product", description: "Product floating in space with a soft shadow and particles.", defaultDuration: 5, usesMedia: true, usesBullets: false },
  { id: "typography-statement", label: "Typography Statement", description: "Big statement lines rising from masks. Separate lines with |.", defaultDuration: 4, usesMedia: false, usesBullets: false },
  { id: "final-cta", label: "Final CTA", description: "Headline, shimmering call-to-action button and contact details.", defaultDuration: 5, usesMedia: false, usesBullets: true },
  { id: "house-build-3d", label: "3D Build Sequence", description: "Three.js: a modern tiny house assembles itself, then the lights come on.", defaultDuration: 7, usesMedia: false, usesBullets: true, variants: [{ id: "build", label: "Construction sequence" }, { id: "showcase", label: "Finished house orbit" }] },
];

const REGISTRY: Record<SceneTemplateId, SceneTemplate> = {
  "cinematic-intro": cinematicIntro,
  "logo-reveal": logoReveal,
  "product-showcase": productShowcase,
  "feature-showcase": featureShowcase,
  "ui-demonstration": uiDemonstration,
  "floating-product": floatingProduct,
  "typography-statement": typographyStatement,
  "final-cta": finalCta,
  "house-build-3d": houseBuild3d,
};

/** Compile one scene into a complete HyperFrames HTML document. */
export function compileScene(ctx: TemplateContext): { html: string; libs: string[] } {
  const tpl = REGISTRY[ctx.scene.template];
  if (!tpl) throw new Error(`Unknown scene template: ${ctx.scene.template}`);
  const out = tpl(ctx);
  return { html: buildDocument(ctx, out), libs: out.libs ?? [] };
}
