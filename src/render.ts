// Dessin canvas : aplats, contour encre, aucune image ni dégradé.
import { CLOUD_H, H, LANE, SHEEP_Y, W, cloudsOf, jumpHeight, laneOf, type State } from './sim';

const INK = '#1b2340';
const SKY = '#7cc8f5';
const SIDE = '#5bb4ea';
const CLOUD = '#ffffff';
const CLOUD_DIM = '#e4f3fd';
const SUN = '#ffd23f';
const WOOL = '#fff8ec';
const MINT = '#5ed6a0';

export interface Puff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  star: boolean;
}

export interface View {
  s: State;
  puffs: Puff[];
  reduce: boolean;
  blink: number;
  shake: number;
}

/** Un nuage = trois bosses et un socle plat : contour encre posé d'abord, aplat blanc par-dessus. */
function drawCloud(c: CanvasRenderingContext2D, x: number, y: number, w: number, dim: boolean): void {
  const r = CLOUD_H / 2;
  const bumps: [number, number, number][] = [
    [x + r, y, r],
    [x + w / 2, y - r * 0.5, r * 1.1],
    [x + w - r, y, r],
  ];
  const paint = (fill: string, grow: number) => {
    c.fillStyle = fill;
    c.strokeStyle = fill;
    c.lineWidth = grow;
    for (const [cx, cy, cr] of bumps) {
      c.beginPath();
      c.arc(cx, cy, cr, 0, Math.PI * 2);
      c.fill();
      if (grow) c.stroke();
    }
    c.fillRect(x + r, y - r, w - 2 * r, 2 * r);
    if (grow) c.strokeRect(x + r, y - r, w - 2 * r, 2 * r);
  };
  paint(INK, 8);
  paint(dim ? CLOUD_DIM : CLOUD, 0);
}

function drawSheep(c: CanvasRenderingContext2D, x: number, y: number, v: View): void {
  const s = v.s;
  const squash = s.phase === 'ride' && !v.reduce ? 1 + Math.sin(s.t * 6) * 0.03 : 1;
  const stretch = s.phase === 'jump' ? 1.12 : 1;
  c.save();
  c.translate(x, y);
  c.scale(1.25, 1.25);
  c.scale(1 / stretch, stretch * squash);
  if (s.phase === 'fall') c.rotate(Math.min(s.fallT * 6, 4));
  c.lineWidth = 4;
  c.strokeStyle = INK;
  c.lineJoin = 'round';
  // pattes
  c.fillStyle = INK;
  c.fillRect(-12, -6, 6, 10);
  c.fillRect(6, -6, 6, 10);
  // laine
  c.fillStyle = WOOL;
  for (const [dx, dy, r] of [[-12, -18, 12], [12, -18, 12], [0, -28, 13], [0, -14, 15]] as const) {
    c.beginPath();
    c.arc(dx, dy, r, 0, Math.PI * 2);
    c.stroke();
    c.fill();
  }
  c.beginPath();
  c.arc(0, -14, 13, 0, Math.PI * 2);
  c.fill();
  // tête
  c.fillStyle = INK;
  c.beginPath();
  c.ellipse(17, -18, 10, 9, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#fff';
  const eye = v.blink > 0 || s.phase === 'over' ? 0 : 3;
  if (eye) {
    c.beginPath();
    c.arc(20, -20, eye, 0, Math.PI * 2);
    c.fill();
  } else c.fillRect(17, -21, 6, 2);
  // oreille
  c.fillStyle = MINT;
  c.beginPath();
  c.ellipse(11, -24, 4, 6, -0.6, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

export function draw(c: CanvasRenderingContext2D, cw: number, ch: number, v: View): void {
  const s = v.s;
  const scale = Math.min(cw / W, ch / H);
  const ox = (cw / scale - W) / 2;
  const oy = (ch / scale - H) / 2;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = SIDE;
  c.fillRect(0, 0, cw, ch);
  c.setTransform(scale, 0, 0, scale, ox * scale, oy * scale);
  c.save();
  c.beginPath();
  c.rect(0, -oy, W, ch / scale);
  c.clip();
  c.fillStyle = SKY;
  c.fillRect(0, -oy, W, ch / scale);

  const shk = v.shake > 0 && !v.reduce ? (Math.random() - 0.5) * 8 * v.shake : 0;
  c.translate(shk, shk);

  // u vaut 0 au repos et reste à 1 après un saut raté : la caméra ne recule pas pendant la chute
  const cam = s.lane + jumpHeight(s.u) / LANE;
  const camX = s.x - W / 2; // la caméra suit le mouton en x
  const laneY = (n: number) => SHEEP_Y - (n - cam) * LANE;

  // soleil : aplat fixe
  c.fillStyle = SUN;
  c.strokeStyle = INK;
  c.lineWidth = 4;
  c.beginPath();
  c.arc(W - 62, -oy + 74, 30, 0, Math.PI * 2);
  c.fill();
  c.stroke();

  const nMin = Math.max(0, Math.floor(cam - (ch / scale - oy - SHEEP_Y) / LANE) - 1);
  const nMax = Math.ceil(cam + (SHEEP_Y + oy) / LANE) + 1;
  for (let n = nMin; n <= nMax; n++) {
    const l = laneOf(s.seed, n);
    const y = laneY(n);
    const standing = n === s.lane || (s.phase === 'jump' && n === s.lane + 1);
    for (const x of cloudsOf(l, s.t, camX - l.w, camX + W + 10)) drawCloud(c, x - camX, y, l.w, !standing);
  }

  // mouton : la caméra le suit, il reste à la même hauteur d'écran sauf en chute
  const sheepY = s.phase === 'fall' || s.phase === 'over' ? SHEEP_Y + Math.max(0, s.fallT * s.fallT * 900 - s.fallT * 140) : SHEEP_Y;
  drawSheep(c, W / 2, sheepY - CLOUD_H * 0.9, v);

  for (const p of v.puffs) {
    const a = 1 - p.age / 0.6;
    if (a <= 0) continue;
    c.globalAlpha = a;
    c.fillStyle = p.star ? SUN : CLOUD;
    c.strokeStyle = INK;
    c.lineWidth = 3;
    c.beginPath();
    if (p.star) c.rect(p.x - 5, p.y - 5, 10, 10);
    else c.arc(p.x, p.y, 7, 0, Math.PI * 2);
    c.fill();
    c.stroke();
  }
  c.globalAlpha = 1;
  c.restore();
}
