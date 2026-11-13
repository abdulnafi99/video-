# PRC Builders Sdn. Bhd.: 60s film, Bahasa Melayu voice-over script

For a professional voice talent. Tone: warm, confident and unhurried, like a premium corporate film.
Cue times match the edit. Each line should start on its cue and finish before the next one.
The guide track in `assets/audio/vo.wav` uses these same cues.

| Cue | Scene | Malay voice-over | On screen |
| --- | --- | --- | --- |
| 00:00.9 | 1 Intro | PRC Builders. Membina kediaman, mencipta nilai yang berkekalan. | BUILDING HOMES. / CREATING LASTING VALUE. |
| 00:06.5 | 2 Who we are | Kami rakan pembinaan kediaman anda, menggabungkan perancangan, reka bentuk dan pembinaan, dalam satu proses yang tersusun. | WHO WE ARE / PRC Builders Sdn. Bhd. / Your Residential Construction Partner. |
| 00:15.4 | 3 Services | Daripada reka bentuk dan bina, pembinaan rumah baharu, pengubahsuaian dan tambahan, kerja dalaman, hinggalah perundingan dan pengurusan projek. | 01 Design & Build … 05 Consultation & Project Management |
| 00:26.4 | 3 Services | Penyelesaian kediaman yang lengkap. | FROM DESIGN TO COMPLETION / Complete Residential Solutions. |
| 00:29.3 | 4 Process | Setiap projek melalui enam langkah yang jelas. | OUR PROCESS |
| 00:32.4 | 4 Process | Memahami. | 01 Understand |
| 00:33.7 | 4 Process | Merancang. | 02 Plan |
| 00:34.9 | 4 Process | Mereka bentuk. | 03 Design |
| 00:36.2 | 4 Process | Membina. | 04 Build |
| 00:37.4 | 4 Process | Menyemak. | 05 Review |
| 00:38.7 | 4 Process | Dan menyerahkan. | 06 Handover |
| 00:40.3 | 5 Why PRC | Pengurusan projek yang profesional. | Professional Project Management |
| 00:42.2 | 5 Why PRC | Tumpuan pada kualiti kerja. | Quality-Focused Workmanship |
| 00:43.9 | 5 Why PRC | Pendekatan berpaksikan pelanggan. | Client-Centred Approach |
| 00:46.0 | 5 Why PRC | Komitmen terhadap penyiapan. | Commitment to Delivery |
| 00:47.8 | 5 Why PRC | Merancang dengan tujuan. Membina dengan ketepatan. | PLAN WITH PURPOSE. / BUILD WITH PRECISION. |
| 00:51.7 | 6 Closing | PRC Builders Sendirian Berhad. Mari bina visi anda, bersama kami. | LET'S BUILD YOUR VISION. / PRC BUILDERS SDN. BHD. / prcgroupglobal.com.my/PRCBuilders |

Pronunciation: "PRC" is said letter by letter (pi-ar-si). "Sdn. Bhd." is read in full as "Sendirian Berhad".

To swap in a studio recording, export one mono 48 kHz WAV, 60.0 s long, with each line on its cue. Save it as
`assets/audio/vo.wav`, then run `npx tsx projects/prc-builders-60s/scripts/build-audio.ts --mix-only`
and re-render (see README).
