import './style.css';
import { Audio } from './audio';
import { draw, type Puff, type View } from './render';
import { load, parse, store } from './save';
import { SHEEP_Y, W, newGame, step, tap, type State } from './sim';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('stage');
const ctx = canvas.getContext('2d')!;
const save = load();
const audio = new Audio();
audio.sound = save.sound;

const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
const applyMotion = () => document.documentElement.classList.toggle('reduce', mq.matches);
applyMotion();
mq.addEventListener('change', applyMotion);

type Screen = 'menu' | 'play' | 'pause' | 'over';
let screen: Screen = 'menu';
let state: State = newGame(Date.now() & 0xffffff);
const view: View = { s: state, puffs: [], reduce: mq.matches, blink: 0, shake: 0 };
let overAt = 0;

const show = (id: string, on: boolean) => {
  $(id).hidden = !on;
};

function setScreen(sc: Screen): void {
  screen = sc;
  show('menu', sc === 'menu');
  show('hud', sc === 'play' || sc === 'pause');
  show('pause', sc === 'pause');
  show('over', sc === 'over');
  show('hint', sc === 'play' && state.phase === 'ready');
  if (sc === 'menu') $('btn-play').focus({ preventScroll: true });
  if (sc === 'pause') $('btn-resume').focus({ preventScroll: true });
  if (sc === 'over') $('btn-again').focus({ preventScroll: true });
}

function syncSound(): void {
  const on = audio.sound;
  $('btn-sound-menu').textContent = on ? 'Son : oui' : 'Son : non';
  $('btn-sound-menu').setAttribute('aria-pressed', String(on));
  const h = $('btn-sound-hud');
  h.setAttribute('aria-pressed', String(on));
  h.setAttribute('aria-label', on ? 'Son activé' : 'Son coupé');
  document.getElementById('snd-waves')!.setAttribute('visibility', on ? 'visible' : 'hidden');
}

function toggleSound(): void {
  audio.unlock();
  audio.sound = !audio.sound;
  save.sound = audio.sound;
  store(save);
  syncSound();
}

function start(): void {
  audio.unlock();
  state = newGame(Date.now() & 0xffffff);
  view.s = state;
  view.puffs = [];
  view.shake = 0;
  $('hud-score').textContent = '0';
  $('hud-combo').hidden = true;
  $('hud-best').textContent = String(save.best);
  show('banner', false);
  setScreen('play');
}

function jump(): void {
  if (screen === 'over') {
    if (performance.now() - overAt > 450) start();
    return;
  }
  if (screen !== 'play') return;
  audio.unlock();
  if (tap(state)) {
    audio.jump();
    show('hint', false);
  }
}

function pause(): void {
  if (screen === 'play') setScreen('pause');
}

function resume(): void {
  if (screen === 'pause') setScreen('play');
}

function say(text: string): void {
  $('live').textContent = text;
}

function banner(text: string): void {
  const b = $('banner');
  b.textContent = text;
  b.hidden = false;
  b.classList.remove('pop');
  void b.offsetWidth;
  b.classList.add('pop');
}

function puffs(centered: boolean): void {
  if (view.reduce) return;
  for (let i = 0; i < (centered ? 10 : 5); i++) {
    const a = Math.random() * Math.PI * 2;
    view.puffs.push({ x: W / 2, y: SHEEP_Y, vx: Math.cos(a) * 90, vy: Math.sin(a) * 60 - 40, age: 0, star: centered && i % 2 === 0 });
  }
}

function onEvent(): void {
  const s = state;
  const k = s.last;
  if (k === 'none') return;
  s.last = 'none';
  if (k === 'land' || k === 'center') {
    const sc = $('hud-score');
    sc.textContent = String(s.score);
    sc.classList.remove('bump');
    void sc.offsetWidth;
    sc.classList.add('bump');
    $('hud-combo').hidden = s.combo < 2;
    $('hud-combo-n').textContent = String(s.combo);
    puffs(k === 'center');
    if (k === 'center') {
      audio.center(s.combo);
      banner(s.combo >= 2 ? `Parfait ! ×${s.combo}` : 'Parfait !');
    } else {
      audio.land();
      show('banner', false);
    }
    say(`Score ${s.score}`);
  } else {
    audio.fall();
    view.shake = view.reduce ? 0 : 1;
    $('hud-combo').hidden = true;
  }
}

function gameOver(): void {
  const s = state;
  const record = s.score > save.best;
  if (record) {
    save.best = s.score;
    store(save);
  }
  $('over-score').textContent = String(s.score);
  $('over-best').textContent = String(save.best);
  $('over-clouds').textContent = String(s.clouds);
  $('over-combo').textContent = String(s.bestCombo);
  show('over-record', record);
  $('menu-best').textContent = String(save.best);
  overAt = performance.now();
  show('banner', false);
  setScreen('over');
  say(`Plouf ! Score ${s.score}${record ? ', nouveau record' : ''}`);
}

function resize(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.round(canvas.clientWidth * dpr);
  const h = Math.round(canvas.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  resize();
  view.reduce = mq.matches;
  if (screen !== 'pause') {
    step(state, screen === 'over' ? 0 : dt);
    if (screen === 'play') {
      onEvent();
      if (state.phase === 'over') gameOver();
    }
    for (const p of view.puffs) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 200 * dt;
    }
    view.puffs = view.puffs.filter((p: Puff) => p.age < 0.6);
    view.shake = Math.max(0, view.shake - dt * 3);
    view.blink = Math.random() < 0.01 ? 0.12 : Math.max(0, view.blink - dt);
  } else {
    last = now;
  }
  draw(ctx, canvas.width, canvas.height, view);
  requestAnimationFrame(frame);
}

// Menu en fond animé : la partie 'ready' tourne derrière le titre.
canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  jump();
});
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const t = e.target as HTMLElement | null;
  const onButton = t instanceof HTMLButtonElement;
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
    if (screen === 'play') {
      e.preventDefault();
      jump();
    } else if (screen === 'over' && !onButton) {
      e.preventDefault();
      jump();
    }
  } else if (e.code === 'Escape' || e.code === 'KeyP') {
    if (screen === 'play') pause();
    else if (screen === 'pause') resume();
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause();
});
window.addEventListener('blur', pause);

$('btn-play').addEventListener('click', start);
$('btn-again').addEventListener('click', start);
$('btn-pause').addEventListener('click', pause);
$('btn-resume').addEventListener('click', resume);
for (const id of ['btn-home', 'btn-home2']) {
  $(id).addEventListener('click', () => {
    state = newGame(Date.now() & 0xffffff);
    view.s = state;
    setScreen('menu');
  });
}
$('btn-sound-menu').addEventListener('click', toggleSound);
$('btn-sound-hud').addEventListener('click', toggleSound);

$('menu-best').textContent = String(save.best);
syncSound();
setScreen('menu');
requestAnimationFrame(frame);

/* ---------- compte OpenGamingStudio (facultatif) ---------- */
interface AccountApi {
  init(o: {
    game: string;
    version: string;
    getSave: () => unknown;
    applySave: (d: unknown) => void;
    isEmpty?: (d: unknown) => boolean;
    describe?: (d: unknown) => string;
  }): void;
}
const ogs = (window as unknown as { OGSAccount?: AccountApi }).OGSAccount;
ogs?.init({
  game: 'nimbus-hop',
  version: '1.0',
  getSave: () => save,
  applySave: (d) => {
    const n = parse(JSON.stringify(d));
    save.best = n.best;
    save.sound = n.sound;
    store(save);
    audio.sound = save.sound;
    syncSound();
    $('menu-best').textContent = String(save.best);
    $('hud-best').textContent = String(save.best);
  },
  isEmpty: (d) => parse(JSON.stringify(d)).best === 0,
  describe: (d) => `record ${parse(JSON.stringify(d)).best}`,
});
