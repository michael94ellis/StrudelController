// ╔═══════════════════════════════════════════════════════════════════╗
// ║  Cozy Restaurant Tutorial — Strudel bed for a casual cafe game    ║
// ║  BPM: 90  |  Key: G major  |  ~64 bars ≈ ~2:50                    ║
// ║  Vibe: warm bistro / casual restaurant tutorial music             ║
// ║                                                                   ║
// ║  How to play: paste into https://strudel.cc → Ctrl+Enter          ║
// ║  Stop: Ctrl+. or hush                                             ║
// ║                                                                   ║
// ║  Sections (1 cycle = 1 bar at setcpm(90/4)):                      ║
// ║    Intro 8 | Build 8 | Main A 16 | Breakdown 8 | Main B 16 | Outro 8 ║
// ╚═══════════════════════════════════════════════════════════════════╝

setcpm(90 / 4)

const beat = 60 / 90
const eighth = beat / 2
const dotted8th = beat * 0.75

// Soft kick — gentle pulse under the cafe groove
let softKick = note("g1!4")
  .s("sine")
  .penv(10)
  .pdecay(0.07)
  .decay(0.3)
  .sustain(0)
  .release(0.04)
  .gain(0.38)
  .orbit(0)

// Soft brushes — light cafe percussion (not club hats)
let brushes = s("~ hh ~ <hh oh>")
  .bank("RolandTR909")
  .cut(1)
  .gain(0.16)
  .hpf(4000)
  .lpf(9000)
  .room(0.1)
  .swingBy(1/8, 4)
  .orbit(0)

// Soft clap — quiet backbeat
let softClap = s("~ cp ~ cp")
  .bank("RolandTR909")
  .gain(0.18)
  .room(0.15)
  .roomsize(0.3)
  .orbit(1)

// Bass — warm round roots (G Em C D)
let bass = note("<[g2 ~ d2 g2] [e2 ~ b1 e2] [c2 ~ g1 c2] [d2 ~ a1 d2]>")
  .s("sine")
  .lpf(380)
  .attack(0.01)
  .decay(0.35)
  .sustain(0.4)
  .release(0.15)
  .gain(0.4)
  .orbit(0)

// Keys — soft piano chords (warm cafe harmony, not synth pad)
let keys = note("<[g3,b3,d4] [e3,g3,b3] [c3,e3,g3] [d3,fs3,a3]>")
  .s("piano")
  .attack(0.01)
  .decay(0.6)
  .sustain(0.35)
  .release(0.8)
  .room(0.3)
  .roomsize(0.45)
  .gain(0.32)
  .orbit(2)

// Soft guitar-like pluck — gentle rhythmic fill
let pluck = n("<0 ~ 2 ~ 4 ~ 2 ~>")
  .scale("G4:major:pentatonic")
  .s("triangle")
  .lpf(2800)
  .attack(0.005)
  .decay(0.22)
  .sustain(0)
  .release(0.1)
  .delay(0.2)
  .delaytime(eighth)
  .delayfeedback(0.2)
  .gain(0.14)
  .orbit(2)

// Melody — friendly tutorial hook (simple, singable)
let melody = n("<[0 ~ 2 4 ~ 2 0 ~] [4 ~ 2 0 ~ 1 2 ~]>")
  .scale("G4:major:pentatonic")
  .s("triangle")
  .lpf(3500)
  .attack(0.01)
  .decay(0.25)
  .sustain(0.1)
  .release(0.2)
  .delay(0.3)
  .delaytime(dotted8th)
  .delayfeedback(0.3)
  .gain(0.22)
  .orbit(2)

// Melody B — slight variation for second main
let melodyB = n("<[0 2 ~ 4 ~ 5 4 2] [0 ~ 2 4 3 ~ 2 0]>")
  .scale("G4:major:pentatonic")
  .s("triangle")
  .lpf(3500)
  .attack(0.01)
  .decay(0.25)
  .sustain(0.1)
  .release(0.2)
  .delay(0.3)
  .delaytime(dotted8th)
  .delayfeedback(0.3)
  .gain(0.24)
  .orbit(2)

// Soft room tone
let ambience = s("crackle*2")
  .density(0.015)
  .gain(0.03)
  .orbit(1)

// Gentle duck so piano/melody breathe with the kick
let softDuck = s("bd*4")
  .bank("RolandTR909")
  .duckorbit(2)
  .duckattack(0.3)
  .duckdepth(0.25)
  .gain(0)

// === ARRANGEMENT ===
arrange(
  // INTRO (8) — piano + ambience (tutorial splash)
  [
    8,
    stack(
      keys.gain(saw.range(0, 0.32).slow(8)),
      ambience.gain(saw.range(0, 0.03).slow(8))
    ),
  ],

  // BUILD (8) — soft groove enters
  [
    4,
    stack(
      softKick.gain(saw.range(0, 0.38).slow(4)),
      brushes.gain(saw.range(0, 0.16).slow(4)),
      keys,
      pluck.gain(saw.range(0, 0.12).slow(4)),
      ambience
    ),
  ],
  [
    4,
    stack(
      softKick,
      brushes,
      softClap.gain(saw.range(0, 0.18).slow(4)),
      bass.gain(saw.range(0, 0.4).slow(4)),
      keys,
      pluck,
      ambience
    ),
  ],

  // MAIN A (16) — full cozy restaurant bed
  [
    16,
    stack(softKick, brushes, softClap, bass, keys, pluck, melody, ambience, softDuck),
  ],

  // BREAKDOWN (8) — soft piano moment (UI pause / tip screen)
  [
    8,
    stack(
      keys.room(0.45).roomsize(0.6).gain(0.34),
      melody.gain(0.2).delay(0.4),
      brushes.gain(0.1),
      ambience.gain(0.04)
    ),
  ],

  // MAIN B (16) — return with melody variation
  [
    16,
    stack(softKick, brushes, softClap, bass, keys, pluck, melodyB, ambience, softDuck),
  ],

  // OUTRO (8) — fade to piano
  [
    4,
    stack(
      softKick.gain(saw.range(0.38, 0).slow(4)),
      brushes.gain(saw.range(0.16, 0).slow(4)),
      bass.gain(saw.range(0.4, 0).slow(4)),
      keys,
      pluck.gain(saw.range(0.14, 0).slow(4)),
      melody.gain(saw.range(0.22, 0).slow(4)),
      ambience
    ),
  ],
  [
    4,
    stack(
      keys.gain(saw.range(0.32, 0).slow(4)),
      ambience.gain(saw.range(0.03, 0).slow(4))
    ),
  ]
)

// ═══════════════════════════════════════════════════════════════════
// LIVE TEMPLATE — additive cafe tutorial performance
// Comment out arrange() above (or hush), then uncomment line by line.
// ═══════════════════════════════════════════════════════════════════

/*
setcpm(90 / 4)

const beat = 60 / 90
const eighth = beat / 2
const dotted8th = beat * 0.75

// === PHASE 1: soft piano ===
$: note("<[g3,b3,d4] [e3,g3,b3] [c3,e3,g3] [d3,fs3,a3]>")
  .s("piano").attack(0.01).decay(0.6).sustain(0.35).release(0.8)
  .room(0.3).roomsize(0.45).gain(0.32).orbit(2)

// === PHASE 2: soft kick ===
// $: note("g1!4").s("sine")
//   .penv(10).pdecay(0.07).decay(0.3).sustain(0).gain(0.38)

// === PHASE 3: brushes ===
// $: s("~ hh ~ <hh oh>").bank("RolandTR909")
//   .cut(1).gain(0.16).hpf(4000).swingBy(1/8, 4)

// === PHASE 4: bass ===
// $: note("<[g2 ~ d2 g2] [e2 ~ b1 e2] [c2 ~ g1 c2] [d2 ~ a1 d2]>")
//   .s("sine").lpf(380).decay(0.35).sustain(0.4).gain(0.4)

// === PHASE 5: clap ===
// $: s("~ cp ~ cp").bank("RolandTR909").gain(0.18).room(0.15)

// === PHASE 6: pluck fill ===
// $: n("<0 ~ 2 ~ 4 ~ 2 ~>").scale("G4:major:pentatonic")
//   .s("triangle").lpf(2800).decay(0.22).sustain(0).gain(0.14).orbit(2)

// === PHASE 7: melody ===
// $: n("<[0 ~ 2 4 ~ 2 0 ~] [4 ~ 2 0 ~ 1 2 ~]>")
//   .scale("G4:major:pentatonic").s("triangle")
//   .decay(0.25).delay(0.3).delaytime(dotted8th).gain(0.22).orbit(2)
*/
