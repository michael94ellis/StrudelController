# Strudel Controller

A browser app of ten soft, looping ambient songs. Tap a title to play; playback and scrubbing sit in a bar fixed to the bottom. Strudel Controller writes the music as [Strudel](https://strudel.cc/) — bed, pad, felt piano, harp, glow, and air — and the arrangement repeats until you stop it.

Strudel is the JavaScript port of TidalCycles. This app uses cycles, mini-notation, scales, and effects the way the [getting-started workshop](https://strudel.cc/workshop/getting-started/) does, and borrows the loop-to-form idea from [Breath of Strudel](https://github.com/vakofmaya/BreathOfStrudle). The palette stays quiet: sine and triangle tones, low gain, and no percussion.

## Run

```bash
npm install
npm run dev
```

Open the URL Vite prints (http://localhost:5173). Use headphones. Playback needs a click, same as any browser instrument.

```bash
npm test
npm run build
```

## Library

- Ten songs, named and ready to play. Lengths sit between about 45 seconds and 2 minutes.
- Moods are Sleep, Meditation, Focus, and Relax. The filters show one mood at a time.
- Tap a song in the list, or use the bottom bar to play, scrub, and stop.

## Credits

Sound is [Strudel](https://codeberg.org/uzu/strudel) via `@strudel/web` (AGPL-3.0). Strudel Controller’s own interface and score generator are MIT. Breath of Strudel is a course by vakofmaya; this app does not include that course text.
