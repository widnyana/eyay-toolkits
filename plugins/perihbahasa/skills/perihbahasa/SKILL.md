---
name: perihbahasa
description: |
  Generate "Perihbahasa" — humorous, absurd, and flirty remixes of traditional
  Indonesian proverbs (peribahasa). Use when asked to make a peribahasa lucu,
  plesetan peribahasa, peribahasa gombal/nyeleneh, or any request to twist a
  classic Indonesian idiom into a modern punchline while preserving its rhyme
  and rhythm.
---

# Perihbahasa (Peribahasa Humor, Absurd & Flirty)

**Perihbahasa** adalah variasi humorik, absurdis, dan terkadang provokatif
(*flirty/spicy*) dari peribahasa tradisional Indonesia. Format ini memadukan
struktur peribahasa klasik yang familiar dengan *punchline* modern yang
tajam, wittiness, serta permainan rima (*rhyme*) dan ritme (*cadence*) yang
presisi.

## Core Rules & Principles

### 1. Structural Fidelity & Rhyme Logic

- **Struktur Peribahasa Asli** — pertahankan pola ritme dan meter asli
  peribahasa reference.
- **Keselarasan Rima** — akhiran kata pada frasa turunan wajib memiliki
  rima/fonetik yang pas dengan frasa pembanding.

  **Tingkat Kualitas Rima:**
  - **Perfect rhyme** — ending sound sama persis (*pinggang* / *melayang*,
    *batu* / *baju*, *jalan* / *celana*)
  - **Assonance rhyme** — vokal match tapi konsonan beda (*menghanyutkan* /
    *melayang* — sama-sama "ang")
  - **Weak/no rhyme** — tolak ini (*gunung* / *bra* — beda jauh)

- **Subversi Ekspresi** — ubah klausa kedua (atau klausa penutup) untuk
  menciptakan kontras komedi, absurditas, atau eskalasi keintiman.

### 2. Escalation Scale (Tingkat Ketajaman)

- **Level 1 (Sarkas / Relatable)** — kehidupan sehari-hari, *overthinking*,
  *workplace culture*, media sosial.
- **Level 2 (Romance / Baper)** — *ghosting*, *archive chat*, *second
  account*, gengsi asmara.
- **Level 3 (Flirty / Spicy / Adult Humor)** — permainan kata nakal, sensual,
  eksplisit secara metaforis tanpa kehilangan rima dan estetika humor.

Default ke Level 1–2 kecuali user secara eksplisit minta yang lebih tajam
(*"bikin yang spicy"*, *"level 3"*, *"yang nakal dikit"*, dst).

## Pattern Matrix & Examples

Formula: `[Klausa A (Peribahasa Asli/Modifikasi)] + [Klausa B (Subversi Humor/Flirty dengan Rima Sejajar)]`

| Peribahasa Asli | Perihbahasa | Level | Rima |
| :--- | :--- | :--- | :--- |
| *Sekali merengkuh dayung, dua tiga pulau terlampaui.* | **Sekali merengkuh pinggang, dua tiga kancing melayang.** | 3 | Perfect (*pinggang* / *melayang*) |
| *Ada udang di balik batu.* | **Ada udang di balik batu, ada hickey merah di balik kerah baju.** | 3 | Perfect (*batu* / *baju*) |
| *Malu bertanya, sesat di jalan.* | **Malu bertanya, sesat di dalam celana.** | 3 | Near (*bertanya* / *celana*) |
| *Air tenang menghanyutkan.* | **Air tenang menghanyutkan, kamu terlentang bikin melayang.** | 3 | Assonance (*menghanyutkan* / *melayang*) |
| *Lain di bibir, lain di hati.* | **Lain di bibir, lain di Secondary Account.** | 2 | — |
| *Tak kenal maka tak sayang.* | **Tak kenal maka tak tun tuang.** | 1 | Near (*kenal* / *tun*) |

## Generation Workflow

1. **Identify Target Idiom** — pick a well-known Indonesian proverb, or use
   the one the user names. When no specific proverb is requested, draw
   candidates from `references/proverbs.md` (a curated corpus of ~130
   traditional peribahasa with their meanings). To match a desired rhyme
   ending, grep the corpus: `grep -i '<ending>' references/proverbs.md`
   (e.g. `grep -i 'ang'` surfaces *menghanyutkan* / *melayang* candidates).
2. **Analyze Phonetics & Meter** — break down the rhythm (syllable counts)
   and ending rhymes of the original. The `— meaning` column in the corpus
   is context only; the rhyme target is the proverb's own clause-ending
   word, not the makna.
3. **Draft the Subversion** — replace the second clause with a modern,
   absurd, or flirty twist at the requested escalation level.
4. **Test the Flow** — read it aloud (mentally) to verify the punchline
   rolls off the tongue naturally (*renyah*).

   **Checklist:**
   - Does the last word of clause B rhyme with the last word of clause A
     (or internal break point)?
   - Read aloud — does it flow naturally or feel forced?
   - If rhyme is weak or absent, redraft before accepting.

5. **Add Commentary** — append a 1-sentence sarcastic or flirty commentary
   explaining the scenario.
6. **Show with Original** — when presenting output, always include the
   original peribahasa for context (see examples table above).

When the user asks for multiple, generate 3–5 per request spanning
different source proverbs rather than variations on the same one, unless
they ask to riff on a single idiom.

## Quality Checklist

Before finalizing a perihbahasa:

- [ ] Original meter/cadence preserved
- [ ] End rhyme is crisp (perfect or assonance, not forced)
- [ ] Punchline creates clear contrast/absurdity
- [ ] Commentary ties it back to relatable scenario
- [ ] Original peribahasa included for context

## Safety & Tone Note

- Maintain high linguistic creativity and playfulness.
- Keep the humor clever (*witty*) rather than vulgar for the sake of
  vulgarity — explicit imagery should stay metaphorical, not literal.
- Ensure rhymes are crisp and match standard Indonesian speech patterns.
- Stay at Level 1–2 by default; only escalate to Level 3 on explicit
  request, and never target a real, named individual.

## References

- **`references/proverbs.md`** — traditional Indonesian proverbs with their
  meanings (source corpus for picking target idioms and analyzing their
  meter/rhyme before subversion).
