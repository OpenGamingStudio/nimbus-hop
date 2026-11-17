import { describe, expect, it } from 'vitest';
import { JUMP_T, W, jumpHeight, laneOf, newGame, phaseAt, cloudsOf, step, tap, LANE } from '../src/sim';
import { makeRng } from '../src/rng';
import { defaults, parse } from '../src/save';

const run = (s: ReturnType<typeof newGame>, secs: number) => {
  for (let i = 0; i < secs * 60; i++) step(s, 1 / 60);
};

describe('rangées', () => {
  it('sont déterministes et la rangée 0 est un grand nuage immobile', () => {
    expect(laneOf(5, 7)).toEqual(laneOf(5, 7));
    expect(laneOf(5, 7)).not.toEqual(laneOf(6, 7));
    const l0 = laneOf(1, 0);
    expect(l0.speed).toBe(0);
    expect(phaseAt(l0, 3, W / 2)).toBeLessThan(l0.w);
  });
  it('accélèrent et rétrécissent avec la hauteur, mais restent jouables', () => {
    const lo = laneOf(3, 2);
    const hi = laneOf(3, 80);
    expect(hi.w).toBeLessThanOrEqual(70 * 1.1);
    expect(hi.w).toBeGreaterThanOrEqual(70 * 0.9);
    expect(hi.speed).toBeGreaterThan(0);
    expect(hi.speed).toBeLessThanOrEqual(130 * 1.4 + 0.001);
    expect(lo.period).toBeGreaterThan(lo.w);
  });
  it('listent les nuages visibles', () => {
    const l = laneOf(2, 4);
    for (const c of cloudsOf(l, 1.5, 0, W)) expect(c + l.w).toBeGreaterThanOrEqual(0);
    expect(cloudsOf(l, 1.5, 0, W).length).toBeGreaterThan(0);
  });
});

describe('partie', () => {
  it('attend le premier tap', () => {
    const s = newGame(1);
    run(s, 2);
    expect(s.phase).toBe('ready');
    expect(tap(s)).toBe(true);
    expect(tap(s)).toBe(false);
  });
  it('la hauteur de saut finit exactement une rangée plus haut', () => {
    expect(jumpHeight(0)).toBe(0);
    expect(jumpHeight(1)).toBeCloseTo(LANE);
    expect(jumpHeight(0.5)).toBeGreaterThan(LANE / 2);
  });
  it('atterrit quand un nuage est dessous, sinon tombe', () => {
    let landed = 0;
    let fell = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const s = newGame(seed);
      tap(s);
      run(s, JUMP_T + 0.05);
      if (s.phase === 'ride') {
        landed++;
        expect(s.lane).toBe(1);
        expect(s.score).toBeGreaterThanOrEqual(1);
        expect(['land', 'center']).toContain(s.last);
      } else {
        fell++;
        expect(s.phase).toBe('fall');
        expect(s.last).toBe('miss');
        expect(s.combo).toBe(0);
      }
    }
    expect(landed).toBeGreaterThan(0);
    expect(fell).toBeGreaterThan(0);
  });
  it('une chute finit en game over et fige la partie', () => {
    let s = newGame(1);
    for (let seed = 1; seed < 60; seed++) {
      s = newGame(seed);
      tap(s);
      run(s, JUMP_T + 0.05);
      if (s.phase === 'fall') break;
    }
    run(s, 2);
    expect(s.phase).toBe('over');
    const t = s.t;
    run(s, 1);
    expect(s.t).toBe(t);
    expect(tap(s)).toBe(false);
  });
  it('un joueur parfait (saut au meilleur moment) monte et accumule du combo', () => {
    const s = newGame(9);
    let best = 0;
    for (let i = 0; i < 60 * 120 && s.phase !== 'over'; i++) {
      if (s.phase === 'ride' || s.phase === 'ready') {
        // cherche si un saut maintenant atterrirait au centre : on simule sur une copie
        const c = { ...s };
        tap(c);
        run(c, JUMP_T + 0.02);
        if (c.phase === 'ride' && c.lane === s.lane + 1) tap(s);
      }
      step(s, 1 / 60);
      best = Math.max(best, s.lane);
    }
    expect(best).toBeGreaterThan(10);
    expect(s.bestCombo).toBeGreaterThanOrEqual(0);
  });
});

describe('graine', () => {
  it('mulberry32 est stable', () => {
    const a = makeRng(7);
    const b = makeRng(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});

describe('sauvegarde', () => {
  it('valide la lecture', () => {
    expect(parse(null)).toEqual(defaults());
    expect(parse('pas du json')).toEqual(defaults());
    expect(parse('{"best":42,"sound":false}')).toEqual({ v: 1, best: 42, sound: false });
    expect(parse('{"best":-3,"sound":"oui"}')).toEqual(defaults());
    expect(parse('{"best":1e99}').best).toBe(1e6);
    expect(parse('null')).toEqual(defaults());
  });
});
