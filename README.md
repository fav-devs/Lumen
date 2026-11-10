# Seat View

A cinema seat picker built with [Exact](https://github.com/expo/exact): pick a seat on the map,
press Continue, and the camera flies into the hall and turns to the screen, so you see the view
from that seat before you book. It follows a concept by Ramin Nasibov; the cinema, the film on
the screen and the code are this repo's own.

Built and tested on Exact's web host only.

## How the 3D works

Exact boxes take 2D transforms only, and Exact has no canvas you can draw HTML into, so the hall
is projected by hand:

- `app.ts` builds the hall in metres as flat faces: walls, stepped floor, the screen, four faces
  per seat. Each face has an outward normal. The film on the screen is faces too, laid out in
  the screen's own coordinates, so it stays in perspective from any seat.
- `app.contract` keeps a camera (position, yaw, pitch, a 60° lens) and projects every face
  through it each frame. A face is drawn only when it turns toward the camera and lies wholly in
  front of it. Seats are drawn far to near.
- Everything is SVG `polygon`s, which Exact draws on every host.
- Continue animates the camera along a quadratic Bézier: from above the hall, past a point
  behind the seat, to the seat's eye line. The first frame lines up with the 2D map, so the map
  crossfades into the hall.
- From the seat, a drag turns the head.

In Chromium on a laptop the flight holds 60 fps with about 270 faces on screen.

### Why not HTML-in-Canvas?

Chrome's [HTML-in-Canvas](https://developer.chrome.com/blog/html-in-canvas) draws live DOM into a
2D, WebGL or WebGPU canvas and keeps it interactive. It would let the real seat-map DOM become a
texture in a WebGL hall. Exact can't use it:

- Exact's iOS, macOS and Linux builds have no DOM.
- Exact's web runtime doesn't expose the canvas APIs the feature needs.

The projection here gets the same seat-map-into-hall transition from one source on every host.

## What's in it

- **Map:** three showtimes, each with its own taken seats; recliners in rows H–I at €16.
- **View sheet:** the seat's verdict (UP CLOSE, SWEET SPOT or FULL PICTURE), distance to the screen,
  the screen's field of view, how far off-centre you sit, and a mini map.
- **Booking:** Book takes the seat for that showtime. It's a demo: nothing is charged, and bookings
  last until the page reloads.

| File | What it is |
|---|---|
| `app.contract` | The map, the camera and its flight, the view sheet, and the hall drawn through the camera |
| `shapes.contract` | Seats, rows, the per-seat numbers, faces, the hall, the camera |
| `app.ts` | Taken seats, prices, each seat's numbers and camera target, the hall's faces, booking |

## Run it

Set up Exact beside this repo as `apps/exact-editor/README.md` describes, then from this folder:

```bash
bun exact.mjs web
```

```bash
bun exact.mjs test web
```

There are 8 tests: the map, picking, the recliner price, the flight and the numbers from B4,
looking around, flying back, booking, and showtimes. All pass. Build outside the repo
(`CARGO_TARGET_DIR=/tmp/seat-view-target`) if the repo-root `tsconfig.json` stops the build.
