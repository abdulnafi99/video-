/**
 * Line icons (24×24, stroke-only) for HyperFrames scenes. Every path carries
 * pathLength="1" so a single strokeDashoffset 1→0 tween draws it on, a
 * seek-safe "hand-drawn" reveal.
 */
export const ICONS: Record<string, string> = {
  ruler: "M3 21V3l18 18H3z M7 17v-4l4 4H7z M3 8h2 M3 12h2 M3 16h2",
  house: "M3 11l9-7 9 7 M5 10v10h14V10 M10 20v-6h4v6",
  hammer: "M14 6l4 4 M12.5 4.5l7 7-2 2-7-7z M11 9l-8 8 2 2 8-8",
  brick: "M3 5h18v14H3z M3 9.7h18 M3 14.3h18 M9 5v4.7 M15 5v4.7 M6 9.7v4.6 M12 9.7v4.6 M18 9.7v4.6 M9 14.3V19 M15 14.3V19",
  sofa: "M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3 M2 13a2 2 0 0 1 4 0v2h12v-2a2 2 0 0 1 4 0v5H2z M5 18v2 M19 18v2",
  clipboard: "M8 4H6v17h12V4h-2 M9 3h6v3H9z M9 11h6 M9 15h6",
  chat: "M4 5h16v11H9l-5 4V5z M8 10h.01 M12 10h.01 M16 10h.01",
  pencil: "M16 3l5 5L8 21H3v-5L16 3z M13 6l5 5",
  crane: "M4 21h8 M7 21V5 M7 5l13 0 M7 5l3-2 M17 5v6 M15.5 11h3v3h-3z M7 9l4-4",
  key: "M14 10a4 4 0 1 0-1.2 2.8L21 21 M18 18l2-2 M16 16l1.5-1.5",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z M8.5 12l2.5 2.5L15.5 10",
  check: "M5 12.5l4.5 4.5L19 7",
  bungalow: "M2 12l10-7 10 7 M4 11v9h16v-9 M9 20v-5h6v5 M17 6V3h2v4.5",
  semid: "M2 11l5-5 5 5 5-5 5 5 M3 10v10h18V10 M12 11v9 M5.5 20v-4h3v4 M15.5 20v-4h3v4",
  terrace: "M2 10l3.3-4 3.4 4 3.3-4 3.4 4 3.3-4L22 10 M2 10v10h20V10 M8.7 10v10 M15.3 10v10 M4.3 20v-3h2v3 M11 20v-3h2v3 M17.7 20v-3h2v3",
  modern: "M3 20V9h9v11 M12 20V4h9v16 M3 20h18 M6 12h3 M6 15h3 M15 7h3 M15 10h3 M15 13h3",
  layers: "M12 3l9 5-9 5-9-5 9-5z M3 13l9 5 9-5 M3 17l9 5 9-5",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M21 21l-5-5",
  coordination: "M5 6a2 2 0 1 0 0 .01 M19 6a2 2 0 1 0 0 .01 M12 18a2 2 0 1 0 0 .01 M7 7l4 9 M17 7l-4 9 M7 6h10",
  safety: "M4 15a8 8 0 0 1 16 0z M12 7V4 M3 15h18v2H3z",
};

/** Keyword → icon (Malay + English). First match wins. */
const KEYWORDS: [RegExp, string][] = [
  [/reka|design|konsep/i, "ruler"],
  [/rumah baharu|new house|pembinaan rumah/i, "house"],
  [/ubah suai|renovat/i, "hammer"],
  [/pembesaran|extension|tambah/i, "brick"],
  [/dalaman|interior/i, "sofa"],
  [/konsultasi|consult|pengurusan projek|project manag/i, "clipboard"],
  [/banglo|bungalow/i, "bungalow"],
  [/berkembar|semi/i, "semid"],
  [/teres|terrace/i, "terrace"],
  [/kontemporari|contemporary|moden|modern/i, "modern"],
  [/profesional|professional/i, "chat"],
  [/mutu|workmanship|ketukangan/i, "pencil"],
  [/pelanggan|client/i, "crane"],
  [/penyerahan|delivery|handover|kunci/i, "key"],
  [/bahan|material/i, "layers"],
  [/koordinasi|coordination/i, "coordination"],
  [/butiran|detail/i, "search"],
  [/pemeriksaan|inspection|kawalan|control/i, "shield"],
  [/selamat|safe/i, "safety"],
];

export function iconFor(text: string): string {
  for (const [re, name] of KEYWORDS) if (re.test(text)) return name;
  return "check";
}

export function iconSvg(name: string, cls: string, color: string, strokeWidth = 1.6) {
  const d = ICONS[name] ?? ICONS.check;
  const paths = d
    .split(/ (?=M)/)
    .map((seg) => `<path d="${seg}" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>`)
    .join("");
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}
