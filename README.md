# Lumen

A cinema seat picker built with [Exact](https://github.com/expo/exact). Pick a seat on the map,
press Continue, and the map rises into a 3D hall while the camera flies into your seat and turns
to the screen. You see the view from that seat before you book: how far you are from the screen,
how much of your view it fills, and how far off-centre you sit.

It follows a concept by Ramin Nasibov; the cinema, the film on the screen, the icon and the code
are this project's own. The booking is a demo: nothing is charged.

## Platforms

One `app.contract` and one `app.ts` run on every platform Exact has. `app.json` names them all.

| Platform | Build and run | Checked so far |
|---|---|---|
| Web | `bun exact.mjs web` | Built, 9 tests pass, recorded on a real clock at phone and 1440×900 sizes |
| Linux | `bun exact.mjs linux`, then `bun exact.mjs test linux` | Built (Exact's own painter, no browser); 8 tests pass, the 9th is web-only (below) |
| iOS | On a Mac with Xcode: `bun exact.mjs ios --run` (Simulator), `--device --run` (an iPhone), `bun exact.mjs share` (a link to install it) | Not built: needs a Mac |
| macOS | On a Mac with Xcode: `bun exact.mjs mac --run` | Not built: needs a Mac |
| Android | `bun exact.mjs android` with the Android SDK, the `aarch64-linux-android` Rust target and Hermes's Android bundle (`bun scripts/hermes-android.mjs build` in the Exact checkout) | Not built: needs the Android SDK |
| Windows | On Windows: `bun exact.mjs windows --run` | Not built: needs Windows |

The look-around test runs on the web only: Linux's test driver refuses a one-step drag, though a
drive with separate down and move steps turns the head there exactly as on the web.

Exact calls Android early: it builds and runs on an emulator or a phone, but store packaging
doesn't exist yet. The first native build on a machine takes 10–15 minutes; later ones take a
minute or two.

## Setup

You need [Bun](https://bun.sh) 1.4.2 or newer and Rust (rustup). Exact has no releases and
changes daily, so use the commit this app was built against. Clone it beside this repo, so it
sits at `../exact`:

```bash
git clone https://github.com/expo/exact ../exact
```

```bash
git -C ../exact checkout 94b8671f70fe2e25b307a40e7fce66dc27c9f802
```

```bash
cd ../exact && bun scripts/exact.mjs setup
```

`EXACT2=/path/to/exact` points at a checkout somewhere else. `bun ../exact/scripts/exact.mjs
setup --check` names anything a platform is missing.

## Develop

```bash
bun exact.mjs web
```

```bash
bun exact.mjs test web
```

```bash
bun exact.mjs web-build --out dist
```

The first opens the dev loop: it rebuilds on save and serves at the URL it prints. Add `--lan`
to open it from a phone on the same network. The second runs `app.test.contract`. The third
writes a static site to `dist/` for any host, and `bun exact.mjs serve dist` serves it.

## How it works

| File | What it is |
|---|---|
| `app.contract` | The map, the camera and its flight, the view from the seat, the layouts |
| `shapes.contract` | Seats, rows, the per-seat numbers, faces, the hall, the camera |
| `app.ts` | Taken seats, prices, each seat's numbers and camera target, the hall's faces, booking |
| `assets/icon-1024.png` | The app icon every platform derives its own from; `tools/icon.svg` is its source |

Exact draws boxes with 2D transforms only, so the hall is projected by hand:

- **The hall is faces.** `app.ts` builds it in metres: walls, stepped floor, the screen, four
  faces per seat, each with an outward normal. The film on the screen is faces too, laid out in
  the screen's own coordinates, so it stays in perspective from any seat.
- **The camera projects them.** `app.contract` keeps a camera (position, yaw, pitch, lens) and
  projects every face through it each frame as SVG `polygon`s, which Exact draws on every
  platform. It draws a face only when it turns toward the camera and lies wholly in front of
  it, and draws the seats far to near.
- **The map is the hall seen from above.** The camera looks straight down, its lens set so the
  floor is a fixed number of pixels a metre, and every height is flattened to the floor, so each
  seat draws as a tile. The seat buttons are invisible targets over their tiles, so the map you
  tap is the first frame of the flight.
- **Continue raises the hall.** Over the first 38% of the 2.4 s flight the seats extrude from their
  tiles, each face's colour turns from the map's to the upholstery (yours stays green), and the
  walls and screen fade in.
- **The camera makes two moves that overlap, so it never stops.** It comes down from the map to
  behind and above your seat, looking at it. On the way the lens keeps the floor at the map's
  scale (a dolly zoom) until it reaches the seat's lens. Then it drops into the seat and turns up
  to the screen.
- **From the seat, a drag turns your head.**

A window 860 px or wider keeps the showtimes, legend, your pick and the seat's numbers in a
sidebar and gives the hall the rest; narrower, the map has a bar under it and the numbers come
up in a sheet.

### Why not HTML-in-Canvas?

Chrome's [HTML-in-Canvas](https://developer.chrome.com/blog/html-in-canvas) draws live HTML into a
2D, WebGL or WebGPU canvas and keeps it clickable: the natural tool for turning a seat map into a
3D hall in a browser. Exact's iOS, macOS and Linux builds have no HTML, and its web runtime
doesn't expose those canvas APIs, so this app projects the hall itself and gets the same
map-into-hall shot on every platform.

## Changing the icon

Edit `tools/icon.svg`, then render it from this folder with Playwright's Chromium:

```bash
node tools/render-icon.cjs
```
