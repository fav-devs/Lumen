// The hall: which seats are taken at each showtime, what the view from each seat is like, and
// the hall as 3D faces for app.contract to project. The film on the screen is drawn as faces too,
// so it stays in perspective from any seat.
import type { Answer, Result, Sources } from './app.contract.d.ts';

export const grants = '';

type Face = Result<'world'>['backdrop'][number];
type P3 = { x: number; y: number; z: number };
type SeatInfo = Result<'seatInfo'>;

const ROWS = 'ABCDEFGHI';
const SEATS_PER_ROW = 16;
/** The screen, in metres: centred on x = 0, its face at z = 0. */
const SCREEN = { width: 11.6, height: 5.6, bottom: 1.4 };
/** Stadium seating: row A's centre is ROW_Z0 from the screen; each row is a step further and higher. */
const ROW_Z0 = 5.4;
const ROW_PITCH = 0.95;
const ROW_RISE = 0.32;
const SEAT_PITCH = 0.56;
const AISLE = 0.6;
const HALL_HALF_WIDTH = 7.2;
const HALL_DEPTH = 14.6;
const EYE = 1.2;
/** Where a seated eye rests: on the lower part of the screen, not its middle. */
const LOOK_Y = SCREEN.bottom + 1.8;
const PRICES = { standard: 12.5, recliner: 16 };

const rowIndex = (row: string) => ROWS.indexOf(row);
const rowZ = (r: number) => ROW_Z0 + r * ROW_PITCH;
const rowFloor = (r: number) => r * ROW_RISE;
const block = (n: number) => (n <= 3 ? 0 : n >= 14 ? 2 : 1);
const seatX = (n: number) => (n - 8.5) * SEAT_PITCH + (block(n) - 1) * AISLE;
const kindOf = (r: number) => (r >= 7 ? 'recliner' : 'standard');
const round1 = (n: number) => Math.round(n * 10) / 10;

/** The seats people booked here, by showtime. */
const booked = new Map<number, Set<string>>();

/** A seat taken before the app opened: a fixed pattern per showtime, a few gaps in each row. */
function takenBefore(show: number, r: number, n: number): boolean {
  return ((r + 1) * 31 + n * 17 + show * 7) % 10 < 3;
}

function hall(show: number): Result<'hall'> {
  const mine = booked.get(show) ?? new Set();
  return [...ROWS].map((letter, r) => ({
    letter,
    seats: Array.from({ length: SEATS_PER_ROW }, (_, i) => {
      const n = i + 1, id = `${letter}${n}`, kind = kindOf(r);
      return { id, row: letter, n, block: block(n), kind, price: PRICES[kind], taken: takenBefore(show, r, n) || mine.has(id) };
    }),
  }));
}

function seatInfo(id: string): SeatInfo {
  const row = id.slice(0, 1), n = Number(id.slice(1));
  const r = Math.max(0, rowIndex(row));
  const x = seatX(n), z = rowZ(r), eyeY = rowFloor(r) + EYE;
  // The eye turns to the middle of the screen and rests a little below its centre.
  const yaw = Math.atan2(-x, z);
  const pitch = Math.atan2(LOOK_Y - eyeY, Math.hypot(x, z));
  const kind = kindOf(r);
  return {
    id, row, n,
    label: r <= 2 ? 'UP CLOSE' : r <= 6 ? 'SWEET SPOT' : 'FULL PICTURE',
    kind, price: PRICES[kind],
    distance: round1(z),
    fov: Math.round((2 * Math.atan(SCREEN.width / 2 / z) * 180) / Math.PI),
    offset: round1(Math.abs(x)),
    side: Math.abs(x) < 0.2 ? 'centre' : x < 0 ? 'left of centre' : 'right of centre',
    nearX: x * 0.55, nearY: rowFloor(r) + 5, nearZ: z + 3.4, nearYaw: yaw * 0.5, nearPitch: -0.72,
    eyeX: x, eyeY, eyeZ: z + 0.15, yaw, pitch,
  };
}

let faceCount = 0;
/** A face from its corners, with its outward normal; `alt` is its colour on the picked seat. */
function face(fill: string, normal: P3, pts: P3[], alt = fill): Face {
  return { id: `f${faceCount++}`, fill, alt, nx: normal.x, ny: normal.y, nz: normal.z, px: pts[0].x, py: pts[0].y, pz: pts[0].z, pts };
}
const p = (x: number, y: number, z: number): P3 => ({ x, y, z });
const UP = p(0, 1, 0), BACK = p(0, 0, 1), FRONT = p(0, 0, -1);
const shade = (rgb: [number, number, number], k: number) => `rgb(${rgb.map((c) => Math.round(c * k)).join(',')})`;

function backdrop(): Face[] {
  const faces: Face[] = [];
  // The walls, in slices along the hall, so a slice behind the camera drops without the rest.
  for (let z = 0; z < HALL_DEPTH; z += 1.46) {
    const z2 = Math.min(HALL_DEPTH, z + 1.46), k = 1 - z / HALL_DEPTH * 0.6;
    faces.push(face(shade([34, 22, 24], k), p(1, 0, 0), [p(-HALL_HALF_WIDTH, -1, z), p(-HALL_HALF_WIDTH, 10, z), p(-HALL_HALF_WIDTH, 10, z2), p(-HALL_HALF_WIDTH, -1, z2)]));
    faces.push(face(shade([34, 22, 24], k), p(-1, 0, 0), [p(HALL_HALF_WIDTH, -1, z), p(HALL_HALF_WIDTH, -1, z2), p(HALL_HALF_WIDTH, 10, z2), p(HALL_HALF_WIDTH, 10, z)]));
  }
  // The floor in front of row A, then each row's step: its tread and the riser up to it.
  faces.push(face('rgb(26,16,15)', UP, [p(-HALL_HALF_WIDTH, 0, 0), p(HALL_HALF_WIDTH, 0, 0), p(HALL_HALF_WIDTH, 0, rowZ(0) - ROW_PITCH / 2), p(-HALL_HALF_WIDTH, 0, rowZ(0) - ROW_PITCH / 2)]));
  for (let r = 0; r < ROWS.length; r++) {
    const front = rowZ(r) - ROW_PITCH / 2, back = rowZ(r) + ROW_PITCH / 2, y = rowFloor(r);
    faces.push(face(shade([40, 22, 20], 1 - r * 0.05), FRONT, [p(-HALL_HALF_WIDTH, y - ROW_RISE, front), p(HALL_HALF_WIDTH, y - ROW_RISE, front), p(HALL_HALF_WIDTH, y, front), p(-HALL_HALF_WIDTH, y, front)]));
    faces.push(face(shade([30, 18, 17], 1 - r * 0.05), UP, [p(-HALL_HALF_WIDTH, y, front), p(HALL_HALF_WIDTH, y, front), p(HALL_HALF_WIDTH, y, back), p(-HALL_HALF_WIDTH, y, back)]));
  }
  return faces;
}

/** The film on the screen, laid out in the screen's own units: u across, v down, 0 to 1. */
function film(): Face[] {
  const { width: W, height: H, bottom } = SCREEN, top = bottom + H;
  const at = (u: number, v: number, lift = 0.02) => p((u - 0.5) * W, top - v * H, lift);
  const shape = (fill: string, pts: Array<[number, number]>, lift = 0.02) => face(fill, BACK, pts.map(([u, v]) => at(u, v, lift)));
  const faces = [shape('rgb(8,8,9)', [[-0.025, -0.035], [1.025, -0.035], [1.025, 1.035], [-0.025, 1.035]], 0)];
  // A hazy dusk sky, lightest at the horizon: app.contract draws "sky" with its gradient.
  faces.push(shape('sky', [[0, 0], [1, 0], [1, 0.63], [0, 0.63]]));
  // The sun low in the haze, and its glow.
  const disc = (cu: number, cv: number, r: number, fill: string) =>
    shape(fill, Array.from({ length: 20 }, (_, i) => [cu + Math.cos((i / 20) * 2 * Math.PI) * r, cv + Math.sin((i / 20) * 2 * Math.PI) * r * (W / H)] as [number, number]));
  faces.push(disc(0.74, 0.41, 0.07, 'rgba(255,236,206,0.35)'), disc(0.74, 0.41, 0.03, 'rgb(255,242,222)'));
  // Far dunes, the lit face of the near dune and its shadow side, and the foreground.
  faces.push(shape('rgb(208,174,140)', [[0, 0.6], [0.1, 0.585], [0.22, 0.6], [0.36, 0.575], [0.52, 0.595], [0.7, 0.57], [0.86, 0.59], [1, 0.58], [1, 0.7], [0, 0.7]]));
  faces.push(shape('rgb(222,184,140)', [[0, 0.76], [0.12, 0.7], [0.26, 0.645], [0.38, 0.62], [0.47, 0.63], [0.55, 0.7], [0.62, 0.8], [0.66, 1], [0, 1]]));
  faces.push(shape('rgb(168,120,84)', [[0.47, 0.63], [0.6, 0.67], [0.78, 0.73], [1, 0.79], [1, 1], [0.66, 1], [0.62, 0.8], [0.55, 0.7]]));
  faces.push(shape('rgb(196,150,106)', [[0, 0.9], [0.18, 0.86], [0.34, 0.89], [0.44, 0.95], [0.48, 1], [0, 1]]));
  // Someone walking the crest.
  faces.push(shape('rgb(48,32,26)', [[0.384, 0.583], [0.392, 0.583], [0.393, 0.622], [0.383, 0.622]]));
  faces.push(shape('rgb(48,32,26)', [[0.385, 0.571], [0.391, 0.571], [0.391, 0.582], [0.385, 0.582]]));
  return faces;
}

/** Each seat: its cushion, the back and front of its backrest, and the backrest's top. */
function seats3d(): Result<'world'>['seats'] {
  const out: Result<'world'>['seats'] = [];
  [...ROWS].forEach((letter, r) => {
    const y = rowFloor(r), z = rowZ(r), k = 1.08 - r * 0.045, plush = r >= 7 ? 0.9 : 1;
    for (let n = 1; n <= SEATS_PER_ROW; n++) {
      const x = seatX(n), w = r >= 7 ? 0.27 : 0.25;
      // Drawn in this order: from behind, the backrest covers the cushion; from the front, the cushion
      // covers the backrest's foot.
      const faces = [
        face(shade([120, 14, 22], k * plush), FRONT, [p(x - w, y + 0.45, z + 0.22), p(x + w, y + 0.45, z + 0.22), p(x + w, y + 1.1, z + 0.22), p(x - w, y + 1.1, z + 0.22)], 'rgb(92,206,146)'),
        face(shade([150, 20, 28], k * plush), UP, [p(x - w, y + 0.45, z - 0.24), p(x + w, y + 0.45, z - 0.24), p(x + w, y + 0.45, z + 0.22), p(x - w, y + 0.45, z + 0.22)], 'rgb(122,226,170)'),
        face(shade([96, 10, 18], k * plush), BACK, [p(x - w, y + 0.3, z + 0.36), p(x - w, y + 1.14, z + 0.36), p(x + w, y + 1.14, z + 0.36), p(x + w, y + 0.3, z + 0.36)], 'rgb(66,170,116)'),
        face(shade([138, 22, 30], k * plush), UP, [p(x - w, y + 1.14, z + 0.36), p(x + w, y + 1.14, z + 0.36), p(x + w, y + 1.1, z + 0.22), p(x - w, y + 1.1, z + 0.22)], 'rgb(150,240,192)'),
      ];
      out.push({ id: `${letter}${n}`, c: p(x, y + 0.7, z), faces });
    }
  });
  return out;
}

const WORLD: Result<'world'> = { backdrop: backdrop(), film: film(), seats: seats3d() };

const sources: Sources = {
  hall: ([show]) => hall(show),
  seatInfo: ([id]) => seatInfo(id),
  world: () => WORLD,
  book: ([show, id]) => {
    const r = rowIndex(id.slice(0, 1)), n = Number(id.slice(1));
    const mine = booked.get(show) ?? new Set<string>();
    if (r < 0 || takenBefore(show, r, n) || mine.has(id)) return { ok: false, error: 'Someone just took that seat.' };
    booked.set(show, new Set([...mine, id]));
    return { ok: true, error: '' };
  },
};

export const answer: Answer = (source, args, store, storage, native) =>
  sources[source](args, store, storage, native);
