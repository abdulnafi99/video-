import type { Project, Scene } from "../../shared/types";

/**
 * Creative brief for PRC Group Sdn Bhd — "Tiny House Perak" (TikTok @tinyhouseperak).
 * Copy is in Bahasa Melayu. It avoids prices, timelines or claims that cannot
 * be verified; edit any line in the Storyboard editor before publishing.
 */
export function prcScenes(): Omit<Scene, "mediaIds">[] {
  const s = (order: number, x: Partial<Scene> & Pick<Scene, "template" | "duration" | "headline">): Omit<Scene, "mediaIds"> => ({
    id: `prc-s${order + 1}`,
    order,
    subline: "",
    bullets: [],
    visualDescription: "",
    cameraMovement: "",
    animationDirection: "",
    animationPreset: "cinematic",
    transition: "crossfade",
    audioDirection: "",
    voiceOver: "",
    ...x,
  });
  return [
    s(0, {
      template: "cinematic-intro", duration: 4,
      headline: "Rumah impian anda", subline: "Kini lebih dekat dari yang anda sangka.",
      visualDescription: "Gelap. Satu garis cahaya keemasan membuka bingkai.",
      cameraMovement: "Push-in perlahan", animationDirection: "Pancaran cahaya mengembang, tajuk naik perkataan demi perkataan.",
      transition: "dissolve", audioDirection: "Muzik masuk perlahan, pad hangat.",
      voiceOver: "Rumah impian anda. Kini lebih dekat dari yang anda sangka.",
    }),
    s(1, {
      template: "house-build-3d", variant: "build", duration: 7,
      headline: "Dibina dengan teliti", subline: "PRC Group · Pembinaan",
      bullets: ["Asas", "Rangka", "Dinding", "Bumbung", "Siap"],
      visualDescription: "Tiny house moden dibina dalam 3D: tapak, rangka, dinding, bumbung, lampu menyala.",
      cameraMovement: "Orbit tinggi turun ke paras mata", animationDirection: "Setiap komponen jatuh ke tempat dengan ease lembut.",
      transition: "crossfade", audioDirection: "Rentak binaan, ketukan halus setiap fasa.",
      voiceOver: "Setiap unit dibina dengan teliti, dari asas hingga ke bumbung.",
    }),
    s(2, {
      template: "feature-showcase", duration: 5,
      headline: "Semua yang anda perlukan", subline: "Kenapa Tiny House Perak",
      bullets: ["Reka bentuk moden & selesa", "Struktur kukuh, bahan berkualiti", "Proses pembinaan lebih pantas", "Sesuai untuk kediaman & homestay"],
      visualDescription: "Kad kaca kelebihan muncul satu persatu.",
      cameraMovement: "Push lembut", animationDirection: "Kad naik dan menajam, kilauan emas.",
      transition: "slide", audioDirection: "Tik halus pada setiap kad.",
      voiceOver: "Reka bentuk moden. Struktur kukuh. Pembinaan lebih pantas.",
    }),
    s(3, {
      template: "house-build-3d", variant: "showcase", duration: 5,
      headline: "Ruang hidup yang bijak", subline: "Tiny House Perak",
      visualDescription: "Rumah siap pada waktu senja, cahaya hangat dari tingkap.",
      cameraMovement: "Orbit perlahan", animationDirection: "Kamera mengelilingi rumah, cahaya dalaman menyala.",
      transition: "fade-black", audioDirection: "Muzik memuncak dengan lembut.",
      voiceOver: "Ruang hidup yang bijak, untuk gaya hidup moden.",
    }),
    s(4, {
      template: "typography-statement", duration: 4,
      headline: "Kecil saiznya.|Besar impiannya.", subline: "Rekaan & pembinaan oleh PRC Group.",
      visualDescription: "Tipografi besar di atas latar hitam.",
      cameraMovement: "Pull-back perlahan", animationDirection: "Baris naik dari topeng, baris akhir warna emas.",
      transition: "fade-black", audioDirection: "Jeda ringkas sebelum logo.",
      voiceOver: "Kecil saiznya. Besar impiannya.",
    }),
    s(5, {
      template: "logo-reveal", variant: "light", duration: 4.2,
      headline: "PRC Group Sdn Bhd", subline: "Pakar pembinaan tiny house di Perak",
      visualDescription: "Logo PRC di atas pentas gading yang bersih.",
      cameraMovement: "Settle 1.04 → 1", animationDirection: "Lengkok dilukis, logo jelas dari kabur, sapuan cahaya.",
      transition: "crossfade", audioDirection: "Shimmer pada sapuan logo.",
      voiceOver: "PRC Group. Pakar pembinaan tiny house di Perak.",
    }),
    s(6, {
      template: "final-cta", duration: 5.5,
      headline: "Tempah lawatan anda", subline: "Lihat sendiri unit contoh dan bincang rekaan impian anda bersama kami.",
      bullets: ["Hubungi kami sekarang"],
      visualDescription: "Seruan tindakan dengan butiran hubungan dan cip logo.",
      cameraMovement: "Settle", animationDirection: "Tajuk muncul, butang berkilau, butiran hubungan masuk.",
      transition: "match-cut", audioDirection: "Muzik selesai pada kord akhir.",
      voiceOver: "Tempah lawatan anda hari ini. Ikuti kami di TikTok, at tiny house perak.",
    }),
  ];
}

export const PRC_PROJECT_BASE: Omit<Project, "id" | "scenes" | "audio" | "createdAt" | "updatedAt" | "status"> = {
  name: "Tiny House Perak — Promo 30s",
  brandName: "PRC Group Sdn Bhd",
  productName: "Tiny House Perak",
  description:
    "Pembinaan tiny house moden di Perak oleh PRC Group Sdn Bhd. Reka bentuk moden & selesa, struktur kukuh, proses pembinaan lebih pantas, sesuai untuk kediaman & homestay.",
  objective: "Menarik pelanggan untuk menempah lawatan / konsultasi pembinaan tiny house.",
  audience: "Pasangan muda, pelabur homestay dan pemilik tanah di Perak",
  format: "9:16",
  duration: 30,
  fps: 30,
  style: "premium-cinematic",
  language: "ms",
  brand: {
    brandName: "PRC Group Sdn Bhd",
    primaryColor: "#FDCC03",
    accentColor: "#F4C430",
    backgroundColor: "#08090C",
    textColor: "#F5F5F7",
    headingFont: "Space Grotesk",
    bodyFont: "Inter",
    handle: "TikTok @tinyhouseperak",
    location: "Perak, Malaysia",
  },
};

/**
 * Extended ~60s version with the content from the PRC Group website:
 * core services, what we build, why PRC and quality commitments,
 * plus a full Bahasa Melayu voice-over script (one line per scene).
 */
export function prcScenesFull(): Omit<Scene, "mediaIds">[] {
  const s = (order: number, x: Partial<Scene> & Pick<Scene, "template" | "duration" | "headline">): Omit<Scene, "mediaIds"> => ({
    id: `prcf-s${order + 1}`,
    order,
    subline: "",
    bullets: [],
    visualDescription: "",
    cameraMovement: "",
    animationDirection: "",
    animationPreset: "cinematic",
    transition: "crossfade",
    audioDirection: "",
    voiceOver: "",
    ...x,
  });
  return [
    s(0, {
      template: "cinematic-intro", duration: 4.5,
      headline: "Rumah impian anda", subline: "Dari konsep hingga serahan kunci.",
      transition: "dissolve", visualDescription: "Pancaran cahaya keemasan membuka bingkai.",
      voiceOver: "Rumah impian anda, dibina dengan teliti.",
    }),
    s(1, {
      template: "house-build-3d", variant: "build", duration: 7,
      headline: "Dibina dengan teliti", subline: "PRC Group · Pembinaan",
      bullets: ["Asas", "Rangka", "Dinding", "Bumbung", "Siap"],
      visualDescription: "Rumah moden dibina dalam 3D, fasa demi fasa.",
      voiceOver: "Di PRC Group, setiap projek diurus dengan tersusun, dari asas hingga bumbung.",
    }),
    s(2, {
      template: "feature-showcase", duration: 7,
      headline: "Penyelesaian pembinaan lengkap", subline: "Perkhidmatan Teras",
      bullets: ["Reka & Bina", "Pembinaan Rumah Baharu", "Ubah Suai & Tambahan", "Pembesaran Rumah", "Kerja Dalaman", "Konsultasi & Pengurusan Projek"],
      transition: "slide", visualDescription: "Enam kad perkhidmatan teras.",
      voiceOver: "Reka dan bina, rumah baharu, ubah suai, pembesaran rumah, kerja dalaman, dan pengurusan projek.",
    }),
    s(3, {
      template: "feature-showcase", duration: 6,
      headline: "Rumah untuk gaya hidup moden", subline: "Apa Yang Kami Bina",
      bullets: ["Banglo", "Rumah Berkembar (Semi-D)", "Rumah Teres", "Kediaman Kontemporari"],
      transition: "crossfade", visualDescription: "Jenis kediaman yang dibina.",
      voiceOver: "Banglo, rumah berkembar, rumah teres, dan kediaman kontemporari.",
    }),
    s(4, {
      template: "house-build-3d", variant: "showcase", duration: 5.5,
      headline: "Ruang hidup yang bijak", subline: "Tiny House Perak",
      transition: "fade-black", visualDescription: "Rumah siap pada waktu senja.",
      voiceOver: "Termasuk tiny house moden di Perak.",
    }),
    s(5, {
      template: "feature-showcase", duration: 6.5,
      headline: "Projek anda. Komitmen kami.", subline: "Kenapa PRC",
      bullets: ["Pengurusan projek profesional", "Mutu kerja berkualiti", "Pendekatan berpaksikan pelanggan", "Komitmen hingga penyerahan"],
      transition: "slide", visualDescription: "Empat sebab memilih PRC.",
      voiceOver: "Projek anda, komitmen kami. Profesional dan berkualiti, hingga penyerahan.",
    }),
    s(6, {
      template: "feature-showcase", duration: 7,
      headline: "Kualiti di setiap peringkat", subline: "Kualiti & Ketukangan",
      bullets: ["Mutu kerja berkualiti", "Pemilihan bahan yang sesuai", "Koordinasi tapak yang berkesan", "Perhatian pada butiran pembinaan", "Pemeriksaan & kawalan kualiti", "Amalan kerja yang selamat"],
      transition: "fade-black", visualDescription: "Enam komitmen kualiti.",
      voiceOver: "Kualiti di setiap peringkat, dari pemilihan bahan hingga pemeriksaan akhir.",
    }),
    s(7, {
      template: "typography-statement", duration: 4,
      headline: "Mencipta ruang|yang kekal.", subline: "Kualiti dalam setiap kemasan.",
      transition: "fade-black", visualDescription: "Tipografi besar.",
      voiceOver: "Mencipta ruang yang kekal.",
    }),
    s(8, {
      template: "logo-reveal", variant: "light", duration: 4.5,
      headline: "PRC Group Sdn Bhd", subline: "Reka · Bina · Ubah Suai",
      transition: "crossfade", visualDescription: "Logo PRC di pentas gading.",
      voiceOver: "PRC Group Sdn Bhd.",
    }),
    s(9, {
      template: "final-cta", duration: 6,
      headline: "Bincang projek anda", subline: "Hubungi kami untuk konsultasi dan lawatan unit contoh.",
      bullets: ["Hubungi kami sekarang"],
      transition: "match-cut", visualDescription: "Seruan tindakan.",
      voiceOver: "Bincang projek anda bersama kami. Ikuti kami di TikTok, at tiny house perak.",
    }),
  ];
}
