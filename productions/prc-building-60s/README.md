# PRC BUILDING – Membina Rumah, Membina Masa Depan (60 s, 16:9, 4K/30)

A self-contained, deterministic motion-graphics production. Every frame is drawn by
`index.html` from a timestamp (`window.renderAt(t)`), screenshotted by headless Chromium at
3840×2160 and encoded with FFmpeg. No stock footage, no third-party audio.

| Time | Scene | What happens |
| --- | --- | --- |
| 0–8 s | Intro | Blueprint front elevation draws itself, camera push, "SETIAP RUMAH BERMULA DENGAN SEBUAH IMPIAN.", PRC logo reveal with light sweep, "PRC BUILDING" |
| 8–18 s | Apakah itu pembinaan rumah? | Isometric site: penyediaan tapak → pembersihan tapak → pembinaan asas → kerangka struktur, tracked labels, kinetic copy |
| 18–38 s | Proses pembinaan | 4-step stepper: 01 Perancangan (floor plan + dimensions, tilts into 3D) · 02 Asas & Foundation (cutaway: excavation, rebar, concrete pour) · 03 Struktur (columns, walls, beams, trusses, roof) · 04 Kerja-kerja kemasan (windows, door, paint, interior inset) |
| 38–50 s | Kualiti & profesionalisme | Edge-detected "blueprint" of the real Gerik house scanned into the photo, then PRC project photos (Gerik, Chandan, Lempor) with the three statements and five quality tags |
| 50–60 s | Closing | Completed house push-in, 3D logo reveal, "PRC BUILDING · MEREALISASIKAN IMPIAN, MEMBINA MASA DEPAN." lockup |

## Build

```bash
python3 crop.py                                  # crop project photos from the client collages into assets/
python3 -m http.server 8765 --bind 127.0.0.1 &   # mask-image needs http, not file://
node render.cjs 0 450 out/seg0.mp4               # …run 4 ranges in parallel (0/450/900/1350 → +450)
python3 audio.py                                 # original synthesized music bed + SFX → out/soundtrack.wav
./mux.sh                                         # concat segments + audio → out/PRC-Building-60s-4K.mp4
```

Preview in a browser: `http://127.0.0.1:8765/index.html?play` (or `?t=42` for a single frame).

## Voice-over

The script (Bahasa Melayu) is timed to the scenes; drop the takes into `vo/` as
`vo1.wav`…`vo5.wav` and `mux.sh` places and ducks them automatically:

1. (0.6 s) Setiap rumah bermula dengan sebuah impian. Bersama PRC Building, impian itu menjadi kenyataan.
2. (8.6 s) Pembinaan rumah bukan sekadar membina dinding. Ia adalah proses merancang, mereka bentuk dan membina kediaman yang berkualiti.
3. (18.6 s) Segalanya bermula dengan perancangan yang teliti. Kemudian, asas yang kukuh disediakan. Struktur tiang, rasuk, dinding dan bumbung dibina secara sistematik. Akhir sekali, kerja-kerja kemasan menyempurnakan setiap ruang.
4. (39.4 s) Perancangan yang teliti. Pembinaan yang sistematik. Kualiti yang diutamakan. Setiap butiran diberi perhatian.
5. (54.4 s) PRC Building. Merealisasikan impian, membina masa depan.

No credentials, certifications, awards or statistics are claimed anywhere. Dimension figures
on the drawings are illustrative drawing annotations only.
