# CINEMOTION STUDIO

**Create. Animate. Inspire.**: a premium promotional-video production platform.

Two separate rendering engines with a clear contract between them:

| Engine | Role | Where |
| --- | --- | --- |
| **HyperFrames** 0.9.40 | Each scene is an independent HTML/CSS/JS composition (GSAP, CSS, Three.js), linted and rendered to its own MP4 | `hyperframes/` |
| **Remotion** 4.0.543 | Imports the scene MP4s through a scene manifest, sequences them with transitions, mixes music / voice-over / SFX, burns optional subtitles, renders the final H.264/AAC MP4 | `remotion/` |

The engines never share a timeline. The only interface is the **scene manifest**
(`SceneManifest` in `shared/types.ts`): scene id, file, duration, frames, size, fps,
audio info, transition. All frame math lives in one place (`remotion/utils/timing.ts`)
and is used by the server, the Remotion composition and the editor timeline, so audio,
subtitles and scenes stay in sync.

---

## Quick start

```bash
npm install
npm run seed:prc            # optional: PRC Group "Tiny House Perak" demo project
npm run dev                 # API on :4317 + Vite UI on :5173
```

Production:

```bash
npm run build && npm start  # serves the built UI + API on http://127.0.0.1:4317
```

Headless render of a project (same job pipeline as the UI):

```bash
npm run render:cli -- <projectId> --quality standard --fps 30
```

Requirements: Node ≥ 22, FFmpeg/ffprobe, a Chrome/Chromium (HyperFrames finds the system
Chrome; Remotion uses `REMOTION_BROWSER_EXECUTABLE` or the pre-installed headless shell).

---

## Render pipeline (real, verified)

Runs in the background queue (`server/jobs/queue.ts`), one job at a time, each engine in
its own process group with a timeout and cancellation:

1. Validate project configuration
2. Validate media assets (existence on disk)
3. Generate HyperFrames compositions (`server/services/hyperframesCompiler.ts`)
4. `hyperframes lint`: any error fails the job
5. `hyperframes render` per scene (progress from `@hf-progress` lines)
6. Verify each scene with ffprobe (dimensions, duration ±2 frames)
7. Build Remotion props + scene manifest
8. Remotion `renderMedia` in an isolated worker (`server/jobs/remotion-worker.ts`) that serves only whitelisted files on 127.0.0.1
9. Validate final MP4 (size, H.264, duration, audio present)
10. Save exports: master MP4, social 720p copy, thumbnail, `.srt`, project config JSON

Progress is never simulated. A job is "completed" only after step 9 passes.
Jobs interrupted by a server restart are marked failed and can be retried.

## Features

- Dashboard: overview, projects, 6-step Create Video wizard, editable storyboard (every field)
- Live preview editor: scene list, live HyperFrames iframe preview per scene, full-video Remotion Player, scene settings, timeline, 9:16 / 16:9 / 1:1 switch
- Scene Library: 9 templates (Logo Reveal, Cinematic Intro, Product Showcase, Feature Showcase, UI Demonstration, Floating Product, Typography Statement, Final CTA, 3D Build Sequence), each previewed live
- Brand Kit, Media Library (validated uploads), Audio Studio (volume, fades, timing, SFX placement, subtitles)
- Original, procedurally generated music beds and whooshes (`server/services/music.ts`): no copyrighted audio
- Transitions: crossfade, fade to black, smooth slide, cinematic dissolve, match cut
- Render Queue (live via SSE: cancel, retry, logs) and Export History (downloads)
- Persistence: SQLite (`node:sqlite`) + private file store in `data/`

## Security

- Uploads: extension allow-list **and** magic-byte check, per-type size limits, ffprobe decode check, server-generated file names. HTML/SVG/JS are never accepted
- All user text is control-char stripped and length-limited on the server, then HTML-escaped in templates; colours are validated
- IDs validated by regex; every file path goes through `safeJoin` (path-traversal guard)
- Render engines run as separate processes with timeouts; temp files are cleaned
- API binds to 127.0.0.1 by default; set `CINEMOTION_API_TOKEN` to require a token for all API/media routes
- No secrets in frontend code

## Layout

```
src/            React UI (dashboard, editor, scene-library, brand-kit, audio-studio, render-queue, pages, services)
shared/         Types shared by every layer
hyperframes/    templates/ (scene templates + document shell), assets/brand
remotion/       compositions, components (SceneClip bridge), transitions, audio, utils/timing
server/         routes, services, jobs (queue, pipeline, remotion worker), storage (SQLite)
data/           runtime storage (git-ignored)
```

---

### PRC Group: Tiny House Perak (demo project)

`npm run seed:prc` creates a 30-second vertical (9:16) promo in Bahasa Melayu for PRC Group
Sdn Bhd / TikTok @tinyhouseperak: cinematic intro → 3D tiny-house construction sequence →
features → finished house at dusk → statement → PRC logo reveal → call to action. Copy is
in `server/scripts/prc-project.ts` and fully editable in the Storyboard editor.

### PRC Group: full 60s promo with Malay voice-over

`npx tsx server/scripts/seed-prc-full.ts` creates the extended version with the PRC website
content (core services, what we build, why PRC, quality commitments) and a Bahasa Melayu
voice-over. Scene durations are fitted automatically to each spoken line.

Voice-over is synthesised **offline** (`server/services/tts.ts`, espeak-ng + MBROLA `ma1`
Malay voice; `apt-get install espeak-ng mbrola mbrola-ma1`). It is also available in the
Audio Studio ("Generate voice-over from scripts"). It is a synthetic voice: for broadcast
quality, upload a recorded voice-over in Audio Studio and it replaces the generated track.
