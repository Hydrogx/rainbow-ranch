/**
 * 程序化音效系统（PRD 第 14 节）
 * 全部用 WebAudio 实时合成，不引入任何音频文件，因此没有版权问题、也不会产生额外请求。
 */

export type SfxName =
  | 'click'
  | 'open'
  | 'close'
  | 'pickup'
  | 'coin'
  | 'star'
  | 'cluck'
  | 'baa'
  | 'moo'
  | 'feed'
  | 'water'
  | 'plant'
  | 'harvest'
  | 'milk'
  | 'cook'
  | 'cheer'
  | 'pop'
  | 'error';

class AudioSystem {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private musicTimer: number | null = null;
  private step = 0;
  private nextNoteTime = 0;

  soundEnabled = true;
  musicEnabled = true;

  /** 必须由用户手势调用一次 */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      const Ctor: typeof AudioContext =
        window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = 0.5;
      this.sfxBus.connect(this.master);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0.18;
      this.musicBus.connect(this.master);
      if (this.musicEnabled) this.startMusic();
    } catch (err) {
      console.warn('[audio] 初始化失败', err);
    }
  }

  setSound(on: boolean): void {
    this.soundEnabled = on;
  }

  setMusic(on: boolean): void {
    this.musicEnabled = on;
    if (on) this.startMusic();
    else this.stopMusic();
  }

  private now(): number {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  private tone(opts: {
    freq: number;
    freq2?: number;
    dur?: number;
    type?: OscillatorType;
    gain?: number;
    delay?: number;
    attack?: number;
    when?: number;
    vibrato?: number;
    vibratoDepth?: number;
  }): void {
    if (!this.ctx || !this.sfxBus) return;
    const dur = opts.dur ?? 0.16;
    const t0 = (opts.when ?? this.now()) + (opts.delay ?? 0);
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(opts.freq, t0);
    if (opts.freq2 !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.freq2), t0 + dur);
    const peak = opts.gain ?? 0.25;
    const attack = opts.attack ?? 0.012;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    let target: AudioNode = gain;
    if (opts.vibrato) {
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.value = opts.vibrato;
      lfoGain.gain.value = opts.vibratoDepth ?? 8;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(t0);
      lfo.stop(t0 + dur + 0.05);
    }
    osc.connect(target);
    target.connect(this.sfxBus);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
    void target;
  }

  private noise(opts: { dur?: number; gain?: number; freq?: number; q?: number; delay?: number; sweepTo?: number; type?: BiquadFilterType }): void {
    if (!this.ctx || !this.sfxBus) return;
    const dur = opts.dur ?? 0.18;
    const t0 = this.now() + (opts.delay ?? 0);
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = opts.type ?? 'bandpass';
    filter.frequency.setValueAtTime(opts.freq ?? 1200, t0);
    if (opts.sweepTo) filter.frequency.exponentialRampToValueAtTime(opts.sweepTo, t0 + dur);
    filter.Q.value = opts.q ?? 1.2;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(opts.gain ?? 0.18, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxBus);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  play(name: SfxName): void {
    if (!this.soundEnabled) return;
    if (!this.ctx) {
      // 还没解锁就静默忽略，等用户第一次点击后再补上
      return;
    }
    try {
      switch (name) {
        case 'click':
          this.tone({ freq: 880, freq2: 1180, dur: 0.07, type: 'triangle', gain: 0.16 });
          break;
        case 'open':
          this.tone({ freq: 520, freq2: 880, dur: 0.16, type: 'sine', gain: 0.2 });
          break;
        case 'close':
          this.tone({ freq: 620, freq2: 320, dur: 0.14, type: 'sine', gain: 0.18 });
          break;
        case 'pickup':
          this.tone({ freq: 740, freq2: 1180, dur: 0.13, type: 'triangle', gain: 0.22 });
          this.tone({ freq: 1180, dur: 0.1, type: 'sine', gain: 0.12, delay: 0.07 });
          break;
        case 'coin':
          this.tone({ freq: 988, dur: 0.1, type: 'square', gain: 0.12 });
          this.tone({ freq: 1319, dur: 0.18, type: 'square', gain: 0.11, delay: 0.08 });
          break;
        case 'star':
          [1046, 1318, 1568, 2093].forEach((f, i) => this.tone({ freq: f, dur: 0.22, type: 'sine', gain: 0.16, delay: i * 0.06 }));
          break;
        case 'cluck':
          this.tone({ freq: 900, freq2: 420, dur: 0.09, type: 'sawtooth', gain: 0.12 });
          this.tone({ freq: 700, freq2: 380, dur: 0.08, type: 'sawtooth', gain: 0.1, delay: 0.12 });
          break;
        case 'baa':
          this.tone({ freq: 430, freq2: 360, dur: 0.5, type: 'sawtooth', gain: 0.12, vibrato: 18, vibratoDepth: 22 });
          break;
        case 'moo':
          this.tone({ freq: 190, freq2: 140, dur: 0.7, type: 'triangle', gain: 0.22, vibrato: 6, vibratoDepth: 10 });
          break;
        case 'feed':
          this.noise({ dur: 0.16, freq: 1800, gain: 0.14, sweepTo: 700 });
          break;
        case 'water':
          this.noise({ dur: 0.5, freq: 700, gain: 0.12, sweepTo: 2400, q: 0.7 });
          break;
        case 'plant':
          this.noise({ dur: 0.12, freq: 500, gain: 0.16, sweepTo: 200 });
          this.tone({ freq: 320, freq2: 460, dur: 0.12, type: 'sine', gain: 0.12 });
          break;
        case 'harvest':
          [523, 659, 784].forEach((f, i) => this.tone({ freq: f, dur: 0.2, type: 'triangle', gain: 0.18, delay: i * 0.07 }));
          break;
        case 'milk':
          for (let i = 0; i < 3; i += 1) this.noise({ dur: 0.1, freq: 900 + i * 200, gain: 0.13, delay: i * 0.14, sweepTo: 400 });
          break;
        case 'cook':
          this.tone({ freq: 220, freq2: 330, dur: 0.3, type: 'sine', gain: 0.12, vibrato: 12, vibratoDepth: 30 });
          this.noise({ dur: 0.4, freq: 600, gain: 0.08, sweepTo: 1400, q: 0.6, delay: 0.05 });
          this.tone({ freq: 1568, dur: 0.25, type: 'sine', gain: 0.14, delay: 0.42 });
          break;
        case 'cheer':
          [523, 659, 784, 1046].forEach((f, i) => this.tone({ freq: f, dur: 0.26, type: 'triangle', gain: 0.2, delay: i * 0.09 }));
          break;
        case 'pop':
          this.tone({ freq: 420, freq2: 900, dur: 0.08, type: 'sine', gain: 0.16 });
          break;
        case 'error':
          this.tone({ freq: 320, freq2: 240, dur: 0.18, type: 'sine', gain: 0.14 });
          break;
        default:
          break;
      }
    } catch (err) {
      console.warn('[audio] 播放失败', name, err);
    }
  }

  /* --------------------------- 背景音乐 --------------------------- */

  startMusic(): void {
    if (!this.ctx || !this.musicEnabled || this.musicTimer !== null) return;
    this.nextNoteTime = this.ctx.currentTime + 0.2;
    this.musicTimer = window.setInterval(() => this.scheduleMusic(), 200);
  }

  stopMusic(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private scheduleMusic(): void {
    if (!this.ctx || !this.musicBus || !this.musicEnabled) return;
    const stepDur = 0.46;
    const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
    const bass = [130.81, 174.61, 196.0, 146.83];
    while (this.nextNoteTime < this.ctx.currentTime + 0.6) {
      const s = this.step % 16;
      const t = this.nextNoteTime;
      // 主旋律（五声音阶，轻柔三角波）
      if (s % 2 === 0 || s % 7 === 3) {
        const note = scale[(s * 3 + Math.floor(s / 4)) % scale.length];
        this.musicNote(note, t, stepDur * 1.4, 'triangle', 0.16);
      }
      // 低音
      if (s % 4 === 0) {
        this.musicNote(bass[Math.floor(s / 4) % bass.length], t, stepDur * 3.4, 'sine', 0.22);
      }
      this.nextNoteTime += stepDur;
      this.step += 1;
    }
  }

  private musicNote(freq: number, when: number, dur: number, type: OscillatorType, gainValue: number): void {
    if (!this.ctx || !this.musicBus) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(gainValue, when + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(gain);
    gain.connect(this.musicBus);
    osc.start(when);
    osc.stop(when + dur + 0.05);
  }
}

export const audio = new AudioSystem();
