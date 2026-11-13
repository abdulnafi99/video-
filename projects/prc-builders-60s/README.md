# PRC Builders Sdn. Bhd.: 60s corporate film (HyperFrames)

A standalone HyperFrames composition: 1920×1080, 30 fps, exactly 60.0 s.

| Time | Scene | What you see |
| --- | --- | --- |
| 00–06 | Introduction | Light sweep reveals the PRC logo, then an aerial move over a modern residence. *BUILDING HOMES. / CREATING LASTING VALUE.* |
| 06–15 | Who we are | Gold architectural linework scans up on a blueprint grid, then a sweep turns the drawing into the real house. Planning checklist. |
| 15–29 | Our services | 01 Design & Build (half 3D visual, half wireframe) · 02 New House Construction (structure rising inside scaffolding) · 03 Renovation & Extension (before/after wipe) · 04 Interior Works (living room) · 05 Consultation & Project Management (floor plan and project schedule) |
| 29–40 | Our process | Animated six-step timeline: Understand, Plan, Design, Build, Review, Handover |
| 40–51 | Why PRC Builders | Timber facade close-up, material selection studio, aerial over a street of completed homes. Four keywords, then *PLAN WITH PURPOSE. / BUILD WITH PRECISION.* |
| 51–60 | Closing | The bungalow at golden hour, camera pulling away, logo reveal, *LET'S BUILD YOUR VISION.*, company name, tagline, website |

## Files

- `index.html`: the composition (GSAP timeline, typography, 2D motion graphics, soundtrack clip)
- `world.js`: the Three.js architectural world. Each frame is a pure function of film time, set through `hf-seek`
- `assets/prc-logo.png`: the supplied PRC logo (white "GROUP SDN BHD" version for dark backgrounds)
- `assets/audio/`: `music.wav` (original synthesised score), `vo.wav` (Malay voice-over guide), `mix.wav` (final mix)
- `scripts/build-audio.ts`: builds the music, voice-over and mix
- `voiceover-script.md`: Malay script with cue times, for a voice talent

All visuals are generated in code: the 3D architecture, procedural materials and lighting. No stock footage or
third-party audio is used, and everything works offline.

## Commands (from the repository root)

```bash
npm install
npx tsx projects/prc-builders-60s/scripts/build-audio.ts          # music + VO + mix
npx hyperframes lint projects/prc-builders-60s
npx hyperframes snapshot projects/prc-builders-60s --at 4.5,11,22.5,36,58.5
npx hyperframes render projects/prc-builders-60s -o projects/prc-builders-60s/renders/raw.mp4 --quality delivery
```

## Voice-over

`vo.wav` is an offline synthetic guide voice (espeak-ng with the MBROLA `ma1` Malay voice). It sets the timing,
but it does not sound like a broadcast voice. For the final ad, have a professional Malay voice talent record
`voiceover-script.md` to the same cues, replace `assets/audio/vo.wav`, then run
`build-audio.ts --mix-only` and re-render.
