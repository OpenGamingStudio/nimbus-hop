// Sons synthétisés (Web Audio) : aucun fichier. Le contexte naît au premier geste du joueur.
export class Audio {
  private ctx: AudioContext | null = null;
  sound = true;

  unlock(): void {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private blip(freq: number, to: number, dur: number, type: OscillatorType, vol: number, delay = 0): void {
    const c = this.ctx;
    if (!c || !this.sound) return;
    const t0 = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  jump(): void {
    this.blip(330, 660, 0.14, 'square', 0.07);
  }
  land(): void {
    this.blip(240, 160, 0.09, 'triangle', 0.12);
  }
  center(combo: number): void {
    const f = 440 * Math.pow(1.122, Math.min(combo, 8));
    this.blip(f, f * 1.5, 0.12, 'triangle', 0.12);
    this.blip(f * 1.5, f * 2, 0.14, 'triangle', 0.1, 0.09);
  }
  fall(): void {
    this.blip(420, 90, 0.5, 'sawtooth', 0.08);
  }
}
