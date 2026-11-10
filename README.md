# Seat View

A cinema seat picker built with [Exact](https://github.com/expo/exact): pick a seat on the map,
press Continue, and the camera flies into the hall and turns to the screen, so you see the view
from that seat before you book. It follows a concept by Ramin Nasibov; the cinema, the film on
the screen and the code are this repo's own.

It runs on the web at any size: a phone gets the map with a bar under it; a window 860 px or
wider keeps a sidebar on the left (showtimes, legend, your pick, then the seat's numbers) and gives
the hall the rest. Built and tested on Exact's web host only.

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
- **The map is the hall seen from above.** The camera looks straight down, its lens set so the
  floor is a fixed number of pixels a metre, and every height is flattened to the floor, so each
  seat draws as a tile. The seat buttons are invisible press targets laid exactly over their tiles.
  Nothing crossfades: the map you tap is the first frame of the flight.
- **Continue raises the hall.** Over the first 38% of the 2.4 s flight:
  - every height grows back, so the seats extrude from their tiles;
  - each face's colour turns from its tile's grey or recliner red to the upholstery (yours stays
    green);
  - the walls and the screen fade in.
- **The camera makes two overlapping moves, so it never stops:**
  1. Down from the map to a point behind and above the seat, looking at it. On the way down the
     lens keeps the floor at the map's scale (a dolly zoom) until it reaches the seat's lens: 60°
     on a phone, 70° across a wide stage.
  2. Into the seat, turning up to the screen.
- **From the seat, a drag turns the head.**

In headless Chromium (software rendering) the flight holds a 60 fps median with about 270 faces
on screen, with some 30 fps frames at 1440×900.

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

There are 9 tests: the map, picking, the recliner price, the flight and the numbers from B4,
looking around, flying back, booking, showtimes, and the wide layout. All pass. Build outside the repo
(`CARGO_TARGET_DIR=/tmp/seat-view-target`) if the repo-root `tsconfig.json` stops the build.
