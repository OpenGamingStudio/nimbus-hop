// Sauvegarde locale : record et réglage du son. Lecture validée ; le jeu marche aussi sans stockage.
const KEY = 'nimbushop.save';

export interface Save {
  v: 1;
  best: number;
  sound: boolean;
}

export function defaults(): Save {
  return { v: 1, best: 0, sound: true };
}

export function parse(raw: string | null): Save {
  const d = defaults();
  if (!raw) return d;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (!o || typeof o !== 'object') return d;
    if (typeof o.best === 'number' && Number.isFinite(o.best) && o.best >= 0) d.best = Math.min(Math.floor(o.best), 1e6);
    if (typeof o.sound === 'boolean') d.sound = o.sound;
  } catch {
    /* sauvegarde illisible : on repart de zéro */
  }
  return d;
}

export function load(): Save {
  try {
    return parse(localStorage.getItem(KEY));
  } catch {
    return defaults();
  }
}

export function store(s: Save): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* stockage refusé : tant pis */
  }
}
