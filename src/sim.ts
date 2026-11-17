// Règles du jeu, sans DOM : testables seules.
// Les nuages d'une rangée dérivent de gauche à droite et se répètent (période). Le mouton voyage avec son nuage
// (la caméra le suit : il reste au milieu de l'écran et les autres rangées défilent par rapport à lui) ;
// un saut dure JUMP_T et le pose sur la rangée du dessus, s'il y a un nuage sous lui à ce moment-là.
import { makeRng } from './rng';

export const W = 360;
export const H = 640;
export const LANE = 110;
export const SHEEP_Y = 470;
export const CLOUD_H = 34;
export const JUMP_T = 0.55;
export const ARC = 62;
export const CENTER_RATIO = 0.2;
export const SLACK = 4;
export const FALL_T = 0.9;

export interface Lane {
  speed: number;
  w: number;
  period: number;
  off: number;
}

/** Paramètres de la rangée n : dérivés de la graine, donc identiques à chaque lecture. */
export function laneOf(seed: number, n: number): Lane {
  if (n === 0) return { speed: 0, w: 220, period: 100000, off: 70 };
  const r = makeRng((seed * 7919 + n * 104729) >>> 0);
  const base = Math.min(28 + 2 * n, 130);
  const speed = base * (0.6 + 0.8 * r());
  const w = Math.max(70, 150 - 1.6 * n) * (0.9 + 0.2 * r());
  const gap = Math.min(24 + n * 1.3, 110) + r() * 40;
  return { speed, w, period: w + gap, off: r() * (w + gap) };
}

/** Distance entre le bord gauche du nuage le plus proche à gauche de x et x. */
export function phaseAt(l: Lane, t: number, x: number): number {
  const p = (x - (l.off + l.speed * t)) % l.period;
  return p < 0 ? p + l.period : p;
}

/** Position x du bord gauche de chaque nuage visible de la rangée. */
export function cloudsOf(l: Lane, t: number, from: number, to: number): number[] {
  const first = l.off + l.speed * t;
  const k0 = Math.ceil((from - l.w - first) / l.period);
  const out: number[] = [];
  for (let k = k0; first + k * l.period <= to; k++) out.push(first + k * l.period);
  return out;
}

export type Phase = 'ready' | 'ride' | 'jump' | 'fall' | 'over';
export type LandKind = 'none' | 'land' | 'center' | 'miss';

export interface State {
  seed: number;
  t: number;
  phase: Phase;
  lane: number;
  x: number;
  u: number; // avancement du saut 0..1
  fallT: number;
  score: number;
  clouds: number;
  combo: number;
  bestCombo: number;
  last: LandKind; // dernier événement, lu par l'affichage (puis remis à 'none')
  lastPoints: number;
}

export function newGame(seed: number): State {
  return { seed, t: 0, phase: 'ready', lane: 0, x: W / 2, u: 0, fallT: 0, score: 0, clouds: 0, combo: 0, bestCombo: 0, last: 'none', lastPoints: 0 };
}

/** Hauteur du mouton au-dessus de sa rangée, en pixels. */
export function jumpHeight(u: number): number {
  return LANE * u + ARC * 4 * u * (1 - u);
}

/** Un tap : lance le saut. Renvoie vrai si le saut part. */
export function tap(s: State): boolean {
  if (s.phase !== 'ready' && s.phase !== 'ride') return false;
  s.phase = 'jump';
  s.u = 0;
  return true;
}

export function laneSpeed(s: State): number {
  return laneOf(s.seed, s.lane).speed;
}

function land(s: State): void {
  const target = laneOf(s.seed, s.lane + 1);
  const ph = phaseAt(target, s.t, s.x);
  const covered = (ph <= target.w + SLACK || ph >= target.period - SLACK);
  if (!covered) {
    s.phase = 'fall';
    s.fallT = 0;
    s.combo = 0;
    s.last = 'miss';
    return;
  }
  const signed = ph > target.w + SLACK ? ph - target.period : ph;
  const centered = Math.abs(signed - target.w / 2) <= (target.w / 2) * CENTER_RATIO;
  s.lane += 1;
  s.clouds += 1;
  s.u = 0;
  s.phase = 'ride';
  s.combo = centered ? s.combo + 1 : 0;
  s.bestCombo = Math.max(s.bestCombo, s.combo);
  s.lastPoints = centered ? 1 + Math.min(s.combo, 5) : 1;
  s.score += s.lastPoints;
  s.last = centered ? 'center' : 'land';
}

/** Avance la partie de dt secondes (sous-pas de 1/120 s pour un atterrissage net). */
export function step(s: State, dt: number): void {
  let left = Math.min(dt, 0.1);
  while (left > 1e-9) {
    const h = Math.min(left, 1 / 120);
    left -= h;
    if (s.phase === 'over') return;
    s.t += h;
    if (s.phase === 'ready' || s.phase === 'ride') {
      s.x += laneSpeed(s) * h;
    } else if (s.phase === 'jump') {
      s.x += laneSpeed(s) * h;
      s.u += h / JUMP_T;
      if (s.u >= 1) {
        s.u = 1;
        land(s);
      }
    } else if (s.phase === 'fall') {
      s.fallT += h;
      if (s.fallT >= FALL_T) s.phase = 'over';
    }
  }
}
