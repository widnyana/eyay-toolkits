---
name: perihbahasa
description: |
  This skill should be used when the user asks to make a "perihbahasa",
  "plesetan peribahasa", "peribahasa lucu", "peribahasa gombal",
  "perihbahasa flirty/spicy", "plesetin peribahasa", a rhyming twist on a
  classic Indonesian idiom, or a witty/flirty caption riffing on a proverb.
  Generates humorous, absurd, and flirty remixes that preserve the original
  meter and rhyme.
---

# Perihbahasa (Peribahasa Remix — Pun, Reversal, Transplant)

**Perihbahasa** bukan sekadar "ganti klausa kedua dengan kata modern." Kerja utamanya adalah
**menukar satu kata kunci** (atau membalik moral, atau memindahkan ke domain lain) sehingga
makna baru muncul dari permainan kata itu sendiri. Rima dan ritme asli dipertahankan lewat
*near-homophone*; *punchline* berdiri sendiri **tanpa dijelaskan**.

**Target imitasi:** `references/exemplars.md` — 23 baris gold-standard. Baca dulu, tiru
kalibernya. Kalau outputmu tidak sekuat contoh di sana, buang dan ulang.

## Anatomy — kenapa sebuah perihbahasa nendang

1. **Pun-nya adalah maknanya, bukan dekorasi.** Kata yang ditukar harus membawa argumen nyata.
   `nila → async` works karena async memang "hal kecil yang merusak sistem besar."
2. **Mainkan moral aslinya — sering dengan membaliknya.** Pertahankan moral di domain baru,
   atau balik untuk membongkar kebenaran yang ditutupi peribahasa aslinya.
3. **Relatable = spesifik, bukan *vibe*.** Sebut satu momen betulan (`jadian seminggu, move-on
   sedasawarsa`), bukan ringkasan generik ("sedih karena di-ghosting").
4. **Asimetri emosional = mesin yang dipakai ulang.** Sebab kecil : akibat besar, atau
   investasi besar : hasil kecil — diselipkan ke kerangka `se-… se-…`.
5. **Tukar kata bedah, bukan tulis ulang klausa.** Makin sedikit kata diganti, makin keras
   "aha"-nya. `terbitlah terang → terdengarlah erang`; `jatuh → jauh`; `payung → kamu`.
6. **Jaga kerangka fonetik via *near-homophone*.** `jatuh→jauh`, `terang→erang`,
   `beriak→teriak`, `tangan→kenangan`. Suara bertahan walau makna berbalik.
7. **Pilih bentuk yang pas untuk lawakannya** — lihat katalog Techniques; jangan paksa satu
   bentuk untuk semua idiom.
8. **Nada itu kerajinan; menjelaskan membunuhnya.** ALL-CAPS untuk marah, satu baris untuk
   nendang, kadens pantun untuk puitis (`Malam menyingsing rindu menyongsong`). **Jangan
   pernah jelaskan lelucon.**
9. **Domain = rasa sakit yang kamu aktifkan.** tech, office, romance, money, mudik, LDR —
   pilih yang punya derita betulan, bukan tema kabur.
10. **Bobot budaya menguatkan.** Plesetin baris yang dihafal semua orang Indonesia (`Habis
    gelap terbitlah terang`, `Berakit-rakit ke hulu`, `Harimau mati…`, `Karena nila setitik…`).

## Techniques

Pilih satu (atau gabungan). Definisi + contoh penuh per teknik ada di
`references/exemplars.md`.

- **Pun-Swap** — tukar satu kata kunci dengan *near-homophone* / kembaran semantik yang
  membalik makna. *Terbitlah terang → terdengarlah erang.* *Jatuh → jauh.* *Payung → kamu.*
- **Moral-Reversal** — balik kesimpulan aslinya untuk membongkar kebenaran.
  *Daripada hujan batu di negeri sendiri, lebih baik hujan emas di negeri orang.* *Pacar
  teriak tanda terlalu dalam.*
- **Domain-Transplant** — pertahankan logika, pindahkan ke domain berderita.
  *Karena async setitik, kena await sebelanga.* *Senior kencing berdiri, junior … direview.*
- **Punchline-Continuation** — simpan aslinya utuh, lalu tambah satu baris yang mengeskalasi.
  *Air susu dibalas air tuba. Jadian lagi seminggu move-onnya sedasawarsa.*
- **Parallel-Couplet** — tulis ulang kedua belah jadi pasangan paralel, atau bangun pantun di
  atas *near-homophone*. *Mantan pergi meninggalkan kenangan, gebetan pergi menanggalkan
  harapan.*
- **Numeric-Asymmetry** — kerangka `se-… se-…` untuk kontras kecil:besar. *Putus satu, nunggu
  seribu.* *Gara-gara 'Hai' sebaris, rusak move-on setahun.*
- **Pantun-Lyrical** — utamakan keindahan fonetik/kadens di atas *punch*. *Malam menyingsing
  rindu menyongsong.*

## Generation Workflow

1. **Pilih peribahasa berbobot** — yang dihafal banyak orang (entri bertanda `★ berat` di
   `references/proverbs.md`), atau yang disebut user. Tanpa spesifikasi, ambil kandidat dari
   sana. Untuk membidik rima ujung tertentu: `grep -i '<ending>' references/proverbs.md`.
2. **Bongkar dua hal** — (a) **kata kunci** yang bisa ditukar, (b) **moral** aslinya. Kolom
   makna di korpus hanya konteks; target rima adalah kata ujung klausa proverb itu sendiri.
3. **Pilih domain berderita + teknik.** Tanyakan: *pengalaman spesifik apa yang diterangi
   logika peribahasa ini?* (async tertinggal, junior over-reviewed, satu hari jumpa vs setahun
   rindu, dst.)
4. **Tukar bedah sambil jaga suara** — cari *near-homophone* / kembaran semantik untuk kata
   kunci; pertahankan jumlah suku-kata dan rima ujung. Kalau rima dipaksakan, buang ulang.
5. **Baca keras-keras (di kepala).** Renyah atau kaku? Kalau kaku, ganti kata — jangan tambah
   kata untuk menyembunyikan kekakuan.
6. **Potong semua penjelasan.** Kirim dalam 1–2 baris. *Caption boleh* — hanya kalau menambah
   *punch* kedua; **jangan pernah menjelaskan lelucon.**
7. **Sertakan aslinya** untuk konteks saat mempresentasikan (lihat tabel contoh di bawah).

Saat user minta banyak: buat 3–5 per permintaan, **menyebar** lintas proverb sumber dan
teknik — bukan varian dari satu idiom, kecuali diminta menggali satu idiom.

## Examples

| Peribahasa Asli | Perihbahasa | Teknik | Domain |
| :--- | :--- | :--- | :--- |
| *Habis gelap terbitlah terang.* | **Habis gelap, terdengarlah erang.** | Pun-Swap | romance |
| *Karena nila setitik, rusak susu sebelanga.* | **Karena async setitik, kena await sebelanga.** | Domain-Transplant | tech |
| *Air beriak tanda tak dalam.* | **Pacar teriak tanda terlalu dalam.** | Moral-Reversal | romance |
| *Sedia payung sebelum hujan.* | **Sedia kamu sebelum hujan.** | Pun-Swap | flirty |
| *Air susu dibalas air tuba.* | **Air susu dibalas air tuba. Jadian lagi seminggu, move-onnya sedasawarsa.** | Continuation + Asymmetry | romance |
| *Rumput tetangga lebih hijau.* | **Pekerjaan tetangga selalu lebih hijau.** | Pun-Swap | office |
| *Sedikit demi sedikit, menjadi bukit.* | **Sedikit demi sedikit, lama-lama ditinggal merit.** | Moral-Reversal | romance |
| *Sudah jatuh tertimpa tangga.* | **Sudah jauh tertimpa rindu.** | Pun-Swap | LDR |
| *Anak dipangku dilepaskan, beruk di rimba disusui.* | **Pacar di bahu dilepaskan, selingkuhan di bahu orang lain disayangi.** | Parallel-Couplet | romance |
| *Panas setahun hilang oleh hujan sehari.* | **Rindu setahun dihapus jumpa sehari.** | Numeric-Asymmetry | LDR |
| *(bentuk pantun)* | **Malam menyingsing rindu menyonsong.** | Pantun-Lyrical | romance |

## Tone & Safety

- Kreativitas tinggi, *witty* — bukan vulgar demi vulgar. Citra eksplisit tetap metaforis.
- Default **tanpa spicy** (technique + domain dulu). Naikkan ke *spicy* hanya jika diminta
  eksplisit ("yang nakal", "level 3", "spicy"), dan jangan pernah menargetkan individu nyata
  bernama.
- Rima renyah, cocok pola tutur Indonesia baku/sehari-hari.

## Quality Checklist

Sebelum mengirim:

- [ ] Menggali proverb spesifik (idealnya berbobot) dan menyebut tekniknya
- [ ] Pun / kata yang ditukar **membawa makna**, bukan dekorasi
- [ ] Kadens + rima ujung asli terjaga (via *near-homophone*, bukan rima dipaksakan)
- [ ] Menyebut satu **momen spesifik** yang relatable
- [ ] **Tanpa penjelasan** — berdiri sendiri dalam 1–2 baris
- [ ] Peribahasa asli disertakan untuk konteks

## References

- **`references/exemplars.md`** — 23 gold-standard exemplars dikelompokkan per teknik. Target
  imitasi utama; baca sebelum generate.
- **`references/proverbs.md`** — korpus ~240 peribahasa tradisional + makna; entri berbobot
  ditandai `★ berat` sebagai target utama.
