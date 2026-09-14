// ╔═══════════════════════════════════════════════════════════════════╗
// ║  Cozy Town Plaza — Strudel track for a cozy video game            ║
// ║  BPM: 96  |  Key: F major  |  ~64 bars ≈ ~2:40                    ║
// ║  Vibe: lively town/city streets — bustle, not church organ        ║
// ║                                                                   ║
// ║  How to play: paste into https://strudel.cc → Ctrl+Enter          ║
// ║  Stop: Ctrl+. or hush                                             ║
// ║                                                                   ║
// ║  Techniques from BreathOfStrudle M1–M12 + Final Project.          ║
// ║                                                                   ║
// ║  Sections (1 cycle = 1 bar at setcpm(96/4)):                      ║
// ║    Intro 8 | Build 8 | Main A 16 | Breakdown 8 | Main B 16 | Outro 8 ║
// ╚═══════════════════════════════════════════════════════════════════╝

setcpm(96 / 4)

// Delay sync at 96 BPM (Module 9)
const beat = 60 / 96
const eighth = beat / 2 // 0.3125s
const dotted8th = beat * 0.75 // 0.46875s

// === SOUND DEFINITIONS — town/city palette (no sustained organ pad) ===

// Soft pulse — walking-pace kick, still gentle
let softPulse = note("f1!4")
  .s("sine")
  .penv(14)
  .pdecay(0.06)
  .decay(0.28)
  .sustain(0)
  .release(0.04)
  .gain(0.5)
  .orbit(0)

// Hats — syncopated closed/open groove (street bounce, not grid 8ths)
let softHats = s("[hh ~ hh hh]*2, ~ ~ <oh ~> ~")
  .bank("RolandTR909")
  .cut(1)
  .gain(".24 .18 .2 .16")
  .hpf(5000)
  .lpf(12000)
  .swingBy(1/8, 4)
  .sometimes((x) => x.speed(1.15))
  .orbit(0)

// Soft accent — clap on 2 & 4 + quiet Euclidean rim
let softAccent = stack(
  s("~ cp ~ cp")
    .bank("RolandTR909")
    .gain(0.28)
    .room(0.12)
    .roomsize(0.25)
    .orbit(1),
  s("rim(5,16)")
    .bank("RolandTR909")
    .gain(0.14)
    .pan(rand)
    .delay(0.12)
    .delaytime(eighth)
    .delayfeedback(0.2)
    .orbit(1)
)

// Bass — more rhythmic walking line (not just whole notes)
let bass = note("<[f2 ~ a2 f2] [d2 ~ f2 d2] [bb1 ~ d2 bb1] [c2 ~ e2 c2]>")
  .s("triangle")
  .lpf(650)
  .lpq(2)
  .ftype("12db")
  .attack(0.005)
  .decay(0.22)
  .sustain(0.25)
  .release(0.1)
  .gain(0.42)
  .orbit(0)

// Harmony — soft FM chimes (replaces harsh pad/chord stabs)
let chimes = note("<[f4,a4,c5] [d4,f4,a4] [bb3,d4,f4] [c4,e4,g4]>")
  .s("sine")
  .fm(2.5)
  .fmh(2)
  .fmattack(0)
  .fmdecay(0.45)
  .fmsustain(0)
  .attack(0.01)
  .decay(0.9)
  .sustain(0)
  .release(0.5)
  .lpf(4500)
  .room(0.35)
  .roomsize(0.55)
  .gain(0.2)
  .orbit(2)

// Arp — lively town sparkle (replaces wash pad)
let arp = n("<[0 2 4 7]*2 [0 2 4 5]*2 [0 2 5 7]*2 [0 2 4 6]*2>")
  .scale("F4:major")
  .s("triangle")
  .lpf(5000)
  .decay(0.1)
  .sustain(0)
  .release(0.05)
  .delay(0.25)
  .delaytime(eighth)
  .delayfeedback(0.3)
  .gain(0.14)
  .pan(sine.range(0.3, 0.7).slow(4))
  .orbit(2)

// Melody — busier, catchier town tune
let melody = n("<[0 2 ~ 4 3 ~ 5 4] [0 ~ 4 2 ~ 5 3 2]>")
  .scale("F4:major:pentatonic")
  .s("triangle")
  .lpf(4800)
  .decay(0.14)
  .sustain(0)
  .release(0.06)
  .delay(0.35)
  .delaytime(dotted8th)
  .delayfeedback(0.35)
  .degradeBy(0.1)
  .sometimes((x) => x.add(note(12)).gain(0.12))
  .pan(sine.range(0.4, 0.6).slow(6))
  .gain(0.26)
  .orbit(2)

// Melody B — Main B variation with gentle fill
let melodyB = n("<[0 4 ~ 2 5 ~ 3 0] [2 ~ 4 5 3 ~ 2 0]>")
  .scale("F4:major:pentatonic")
  .s("triangle")
  .lpf(4800)
  .decay(0.14)
  .sustain(0)
  .release(0.06)
  .delay(0.35)
  .delaytime(dotted8th)
  .delayfeedback(0.35)
  .lastOf(4, (x) => x.ply(2).gain(0.2))
  .pan(sine.range(0.4, 0.6).slow(6))
  .gain(0.28)
  .orbit(2)

// Texture — light street/vinyl grain (not fireplace)
let texture = s("crackle*2")
  .density(0.02)
  .gain(0.05)
  .orbit(1)

// Soft duck on wet bus
let softDuck = s("bd*4")
  .bank("RolandTR909")
  .duckorbit(2)
  .duckattack(0.25)
  .duckdepth(0.3)
  .gain(0)

// === ARRANGEMENT (Module 11) ===
arrange(
  // INTRO (8) — chimes + light arp fade in
  [
    8,
    stack(
      chimes.gain(saw.range(0, 0.2).slow(8)),
      arp.gain(saw.range(0, 0.12).slow(8)),
      texture.gain(saw.range(0, 0.05).slow(8))
    ),
  ],

  // BUILD (8) — groove enters
  [
    4,
    stack(
      softPulse.gain(saw.range(0, 0.5).slow(4)),
      softHats.gain(saw.range(0, 0.28).slow(4)),
      chimes,
      arp,
      texture
    ),
  ],
  [
    4,
    stack(
      softPulse,
      softHats,
      bass.gain(saw.range(0, 0.42).slow(4)),
      chimes,
      arp,
      texture
    ),
  ],

  // MAIN A (16) — full town plaza groove
  [
    16,
    stack(softPulse, softHats, softAccent, bass, chimes, arp, melody, texture, softDuck),
  ],

  // BREAKDOWN (8) — chimes + melody breathe (no pulse/bass)
  [
    8,
    stack(
      chimes.room(0.55).roomsize(0.7).gain(0.24),
      arp.gain(0.18).delay(0.4),
      melody.delay(0.5).delayfeedback(0.45).gain(0.28),
      softHats.gain(0.12).lpf(sine.range(2000, 7000).slow(8)),
      texture.gain(0.06)
    ),
  ],

  // MAIN B (16) — full return, melody variation
  [
    16,
    stack(softPulse, softHats, softAccent, bass, chimes, arp, melodyB, texture, softDuck),
  ],

  // OUTRO (8) — fade street activity → quiet chimes
  [
    4,
    stack(
      softPulse.gain(saw.range(0.5, 0).slow(4)),
      softHats.gain(saw.range(0.28, 0).slow(4)),
      bass.gain(saw.range(0.42, 0).slow(4)),
      chimes,
      arp.gain(saw.range(0.14, 0).slow(4)),
      melody.gain(saw.range(0.26, 0).slow(4)),
      texture
    ),
  ],
  [
    4,
    stack(
      chimes.gain(saw.range(0.2, 0).slow(4)),
      texture.gain(saw.range(0.05, 0).slow(4))
    ),
  ]
)

// ═══════════════════════════════════════════════════════════════════
// LIVE TEMPLATE (Module 12) — additive town/city performance
// Comment out the arrange() block above (or hush), then uncomment
// lines below one at a time. Ctrl+Enter after each addition.
// ═══════════════════════════════════════════════════════════════════

/*
setcpm(96 / 4)

const beat = 60 / 96
const eighth = beat / 2
const dotted8th = beat * 0.75

// === PHASE 1: soft FM chimes ===
$: note("<[f4,a4,c5] [d4,f4,a4] [bb3,d4,f4] [c4,e4,g4]>")
  .s("sine").fm(2.5).fmh(2).fmdecay(0.45).fmsustain(0)
  .attack(0.01).decay(0.9).sustain(0).release(0.5)
  .lpf(4500).room(0.35).roomsize(0.55).gain(0.2).orbit(2)

// === PHASE 2: arp sparkle ===
// $: n("<[0 2 4 7]*2 [0 2 4 5]*2 [0 2 5 7]*2 [0 2 4 6]*2>")
//   .scale("F4:major").s("triangle")
//   .decay(0.1).sustain(0).delay(0.25).delaytime(eighth).gain(0.14).orbit(2)

// === PHASE 3: soft pulse ===
// $: note("f1!4").s("sine")
//   .penv(14).pdecay(0.06).decay(0.28).sustain(0).gain(0.5)

// === PHASE 4: syncopated hats ===
// $: s("[hh ~ hh hh]*2, ~ ~ <oh ~> ~").bank("RolandTR909")
//   .cut(1).gain(".24 .18 .2 .16").hpf(5000).swingBy(1/8, 4)

// === PHASE 5: walking bass ===
// $: note("<[f2 ~ a2 f2] [d2 ~ f2 d2] [bb1 ~ d2 bb1] [c2 ~ e2 c2]>")
//   .s("triangle").lpf(650).decay(0.22).sustain(0.25).gain(0.42)

// === PHASE 6: clap + rim ===
// $: s("~ cp ~ cp").bank("RolandTR909").gain(0.28).room(0.12)
// $: s("rim(5,16)").bank("RolandTR909").gain(0.14).pan(rand)

// === PHASE 7: melody ===
// $: n("<[0 2 ~ 4 3 ~ 5 4] [0 ~ 4 2 ~ 5 3 2]>")
//   .scale("F4:major:pentatonic").s("triangle")
//   .decay(0.14).sustain(0)
//   .delay(0.35).delaytime(dotted8th).delayfeedback(0.35)
//   .gain(0.26).orbit(2)

// === PHASE 8: soft duck (optional) ===
// $: s("bd*4").bank("RolandTR909")
//   .duckorbit(2).duckattack(0.25).duckdepth(0.3).gain(0)

// BREAKDOWN tip: mute pulse/bass with _$: or // $:
// DROP tip: swap melody to n("<[0 4 ~ 2 5 ~ 3 0] [2 ~ 4 5 3 ~ 2 0]>")
*/
