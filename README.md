[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/Rahulboss7788/best-heist-game-20261122-0559/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/Rahulboss7788/best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

# The Gilded Hour

A museum gala after dark. You are Wren, a thief with one quiet hour: cross the
grand hall of the Halcyon Museum, crack the case of the Aurora Star, and slip
out the service exit before the gala ends.

## How to play

Open `game/index.html` in a desktop browser (or serve `game/` with
`node serve.ts` and visit http://localhost:8080). No build step, no network —
every file the game loads sits under `game/`.

- **Move** — WASD or arrow keys, or click anywhere to walk there.
- **Sneak** — hold Shift to move slower and half as noticeable.
- **Stay out of sight** — wardens sweep amber vision cones; Argus cameras sweep
  red ones. Being seen fills the alarm meter; at 100, the wardens close in.
- **Tools** — Q throws a smoke puff (3), E tosses a coin to lure the nearest
  warden (3), F picks the jewel's lock while standing by its pedestal.
- **Loot** — four side pieces (a bust, a canvas, a vase, a tiara) are worth
  250 each. The Aurora Star is worth 1000.
- **Win** — take the Star, reach the green service exit, and the getaway pays
  time and calm bonuses. Lose the hour, or the alarm, and the night is over.

Three ways through the hall: the West Gallery behind the columns, the red
carpet straight down the middle, or the East Gallery past the tall cases.

## Structure

- `game/src/config.js` — tuning numbers and the palette
- `game/src/random.js` — seeded random source
- `game/src/audio.js` — synthesised WebAudio sounds, no audio files
- `game/src/input.js` — keyboard and pointer input
- `game/src/museum.js` — the hall: walls, cover, wardens, cameras, loot
- `game/src/simulation.js` — movement, patrols, vision, alarm, tools, win/lose
- `game/src/render.js` — everything drawn on the canvas, plus the HUD
- `game/src/shots.js` — the staged screenshot scenes and their autopilot
- `game/src/main.js` — boot, the fixed-step loop, and the screens

`main.ts` copies `game/` and `screenshots/` to `/output` and writes
`/output/dossier.json` with the vendored make.fun library.

## License

MIT — see [LICENSE](LICENSE).
