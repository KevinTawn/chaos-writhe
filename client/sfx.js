/* 混乱与蠕动 · 战场音效（Web Audio 现场合成，无素材） */
(() => {
'use strict';

const AC = window.AudioContext || window.webkitAudioContext;
let ctx = null, dry = null, revSend = null, master = null, comp = null;
let whiteBuf = null, brownBuf = null;
let enabled = true;
const volume = 1.8;
const active = new Set();
const lastPlay = Object.create(null);

const GAP = { move: 55, chaos: 90, death: 80, grave: 90, card: 50, tide_stone: 90 };

function rnd(a, b) { return a + Math.random() * (b - a); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function track(src) {
  active.add(src);
  src.onended = () => active.delete(src);
}

function makeIR(sec, decay) {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * sec);
  const buf = ctx.createBuffer(2, len, rate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) {
      const t = i / len;
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
    }
    for (const [ms, amp] of [[23, .5], [47, .32], [83, .2]]) {
      const i = Math.floor(rate * ms / 1000);
      if (i < len) d[i] += (c ? -amp : amp);
    }
  }
  return buf;
}

function makeNoise(sec, brown) {
  const len = Math.floor(ctx.sampleRate * sec);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  if (!brown) {
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  } else {
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + .018 * w) / 1.018;
      d[i] = clamp(last * 3.4, -1, 1);
    }
  }
  return buf;
}

function initAudio() {
  if (ctx) return;
  ctx = new AC();
  comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.knee.value = 14;
  comp.ratio.value = 5;
  comp.attack.value = .003;
  comp.release.value = .22;
  master = ctx.createGain();
  master.gain.value = volume;
  dry = ctx.createGain();
  dry.gain.value = 1;
  const conv = ctx.createConvolver();
  conv.buffer = makeIR(1.7, 2.8);
  revSend = ctx.createGain();
  revSend.gain.value = .34;
  dry.connect(comp);
  revSend.connect(conv);
  conv.connect(comp);
  comp.connect(master);
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -1.5;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = .001;
  limiter.release.value = .12;
  master.connect(limiter);
  limiter.connect(ctx.destination);
  whiteBuf = makeNoise(2, false);
  brownBuf = makeNoise(2.4, true);
}

function bus(send, pan) {
  const input = ctx.createGain();
  let node = input;
  if (pan && ctx.createStereoPanner) {
    const p = ctx.createStereoPanner();
    p.pan.value = clamp(pan, -1, 1);
    node.connect(p);
    node = p;
  }
  node.connect(dry);
  if (send > 0) {
    const s = ctx.createGain();
    s.gain.value = send;
    node.connect(s);
    s.connect(revSend);
  }
  return input;
}

function envelope(t, dur, gain, attack) {
  const g = ctx.createGain();
  const atk = Math.max(.002, Math.min(dur * .6, attack || .006));
  g.gain.setValueAtTime(.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(.0002, gain), t + atk);
  g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  return g;
}

function tone(t, freq, dur, gain, opts = {}) {
  const o = ctx.createOscillator();
  o.type = opts.type || 'sine';
  o.frequency.setValueAtTime(Math.max(18, freq), t);
  if (opts.to) o.frequency.exponentialRampToValueAtTime(Math.max(18, opts.to), t + dur);
  if (opts.detune) o.detune.value = opts.detune;
  let node = o;
  if (opts.filter) {
    const f = ctx.createBiquadFilter();
    f.type = opts.filter;
    f.frequency.setValueAtTime(Math.max(40, opts.cutoff || 1200), t);
    if (opts.cutoffTo) f.frequency.exponentialRampToValueAtTime(Math.max(40, opts.cutoffTo), t + dur);
    f.Q.value = opts.q == null ? .7 : opts.q;
    o.connect(f);
    node = f;
  }
  const g = envelope(t, dur, gain, opts.attack);
  node.connect(g);
  g.connect(bus(opts.send == null ? .12 : opts.send, opts.pan || 0));
  o.start(t);
  o.stop(t + dur + .04);
  track(o);
}

function noise(t, dur, opts = {}) {
  const src = ctx.createBufferSource();
  src.buffer = opts.brown ? brownBuf : whiteBuf;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = opts.type || 'bandpass';
  f.frequency.setValueAtTime(Math.max(30, opts.freq || 900), t);
  if (opts.to) f.frequency.exponentialRampToValueAtTime(Math.max(30, opts.to), t + dur);
  f.Q.value = opts.q == null ? 1 : opts.q;
  const g = envelope(t, dur, opts.gain == null ? .08 : opts.gain, opts.attack);
  src.connect(f);
  f.connect(g);
  g.connect(bus(opts.send == null ? .1 : opts.send, opts.pan || 0));
  src.start(t);
  src.stop(t + dur + .04);
  track(src);
}

function thump(t, freq, dur, gain, opts = {}) {
  tone(t, freq, dur, gain, { type: 'sine', to: freq * .32, send: opts.send == null ? .1 : opts.send, pan: opts.pan || 0 });
  noise(t, dur * .7, { type: 'lowpass', freq: freq * 5, to: 70, q: .6, gain: gain * .36, send: .04, pan: opts.pan || 0 });
}

function bell(t, freq, dur, gain, opts = {}) {
  const parts = opts.parts || [[1, 1], [2.01, .48], [2.98, .28], [4.16, .15], [5.43, .09]];
  parts.forEach(([ratio, amp], i) => {
    tone(t, freq * ratio, dur * (1 - i * .11), gain * amp, {
      type: 'sine', attack: .004,
      send: opts.send == null ? .38 : opts.send,
      pan: opts.pan || 0
    });
  });
}

function pluck(t, freq, dur, gain, opts = {}) {
  tone(t, freq, dur, gain, {
    type: 'triangle', to: freq * .996, filter: 'lowpass', cutoff: 2800, q: .8,
    attack: .003, send: opts.send == null ? .2 : opts.send, pan: opts.pan || 0
  });
  noise(t, .045, { type: 'highpass', freq: 2600, q: .7, gain: gain * .24, send: .05, pan: opts.pan || 0 });
}

function brass(t, freq, dur, gain, opts = {}) {
  tone(t, freq, dur, gain, {
    type: 'sawtooth', filter: 'lowpass', cutoff: opts.cutoff || 1500, cutoffTo: opts.cutoffTo || 900,
    q: .8, attack: .035, send: opts.send == null ? .3 : opts.send, pan: opts.pan || 0
  });
  tone(t, freq * .5, dur, gain * .45, { type: 'triangle', attack: .03, send: .16, pan: opts.pan || 0 });
}

function metal(t, freq, dur, gain, opts = {}) {
  const ratios = [1, 1.73, 2.41, 3.17, 4.63];
  ratios.forEach((r, i) => {
    tone(t, freq * r, dur * (1 - i * .14), gain / (1 + i * .7), {
      type: 'triangle', attack: .002, send: opts.send == null ? .25 : opts.send, pan: opts.pan || 0
    });
  });
  noise(t, dur * .5, { type: 'highpass', freq: 3200, q: .7, gain: gain * .3, send: .12, pan: opts.pan || 0 });
}

function howl(t, freq, dur, gain, opts = {}) {
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(freq * .78, t);
  o.frequency.linearRampToValueAtTime(freq, t + dur * .24);
  o.frequency.linearRampToValueAtTime(freq * 1.08, t + dur * .58);
  o.frequency.exponentialRampToValueAtTime(freq * .72, t + dur);
  const lfo = ctx.createOscillator();
  lfo.frequency.value = opts.vibrato || 5.2;
  const lg = ctx.createGain();
  lg.gain.value = opts.depth || 7;
  lfo.connect(lg);
  lg.connect(o.frequency);
  const g = envelope(t, dur, gain, .08);
  o.connect(g);
  g.connect(bus(opts.send == null ? .38 : opts.send, opts.pan || 0));
  o.start(t);
  lfo.start(t);
  o.stop(t + dur + .05);
  lfo.stop(t + dur + .05);
  track(o);
  track(lfo);
}

function chord(t, freqs, dur, gain, opts = {}) {
  freqs.forEach((fq, i) => {
    tone(t, fq, dur, gain / Math.sqrt(freqs.length), {
      type: opts.type || 'triangle',
      attack: opts.attack || .12,
      filter: opts.filter,
      cutoff: opts.cutoff,
      cutoffTo: opts.cutoffTo,
      q: opts.q,
      send: opts.send == null ? .35 : opts.send,
      pan: (opts.pan || 0) + (i - (freqs.length - 1) / 2) * .08
    });
  });
}

/* ============================== 音效定义 ============================== */

const SFX = [
  {
    id: 'move', dur: .38,
    play(t) {
      const p = rnd(-.22, .22);
      noise(t, .11, { freq: rnd(760, 940), to: 560, q: 1.4, gain: .09, send: .05, pan: p });
      thump(t + .02, rnd(105, 130), .13, .055, { send: .05, pan: p });
      noise(t + .06, .05, { type: 'highpass', freq: 2200, q: .8, gain: .018, send: .04, pan: -p });
    }
  },
  {
    id: 'chaos', dur: .98,
    play(t) {
      tone(t, 196, .86, .032, { type: 'triangle', attack: .09, send: .42, pan: -.12 });
      tone(t, 207.65, .9, .03, { type: 'triangle', attack: .11, send: .42, pan: .12 });
      tone(t, 392, .7, .016, { type: 'sine', to: 358, attack: .12, send: .36, pan: 0 });
      noise(t + .08, .55, { type: 'bandpass', freq: 1500, to: 520, q: 2.6, gain: .034, send: .4, pan: .2 });
    }
  },
  {
    id: 'death', dur: .86,
    play(t) {
      thump(t, 150, .42, .2, { send: .16 });
      noise(t, .3, { type: 'lowpass', freq: 680, to: 170, q: .8, gain: .12, send: .12 });
      tone(t + .02, 220, .5, .04, { type: 'triangle', to: 55, send: .25, pan: -.08 });
      metal(t + .06, 1450, .18, .025, { send: .16, pan: .18 });
    }
  },
  {
    id: 'cannon', dur: 1.05,
    play(t) {
      thump(t, 105, .5, .28, { send: .3 });
      noise(t, .5, { type: 'lowpass', freq: 1900, to: 130, q: .7, gain: .18, send: .3 });
      noise(t, .075, { type: 'highpass', freq: 2400, q: .8, gain: .1, send: .18, pan: .15 });
      tone(t, 70, .55, .05, { type: 'sine', to: 34, send: .2 });
    }
  },
  {
    id: 'mineboom', dur: 1.15,
    play(t) {
      thump(t, 92, .46, .26, { send: .22 });
      noise(t, .38, { type: 'bandpass', freq: 1400, to: 180, q: .9, gain: .2, send: .2 });
      noise(t, .06, { type: 'highpass', freq: 3000, q: .7, gain: .09, send: .15 });
      for (let i = 0; i < 6; i++) {
        const dt = .16 + i * .105 + rnd(-.02, .02);
        noise(t + dt, .035, { type: 'bandpass', freq: rnd(900, 2200), q: 3, gain: .03, send: .18, pan: rnd(-.5, .5) });
      }
    }
  },
  {
    id: 'board', dur: 1,
    play(t) {
      tone(t, 88, .34, .026, { type: 'sawtooth', to: 62, filter: 'lowpass', cutoff: 420, q: 1.2, send: .15, pan: -.2 });
      noise(t, .28, { type: 'bandpass', freq: 520, to: 920, q: 1.8, gain: .07, send: .14, pan: -.2 });
      noise(t + .18, .48, { type: 'highpass', freq: 1700, q: .7, gain: .095, send: .28, pan: .18 });
      thump(t + .16, 72, .3, .09, { send: .18, pan: .15 });
    }
  },
  {
    id: 'dragon', dur: 1.8,
    play(t) {
      noise(t, 1.2, { type: 'bandpass', freq: 320, to: 3200, q: 1.1, gain: .1, send: .38 });
      tone(t + .08, 220, .95, .035, { type: 'triangle', to: 330, attack: .12, send: .35, pan: -.12 });
      tone(t + .18, 330, .9, .026, { type: 'sine', to: 440, attack: .16, send: .4, pan: .14 });
      chord(t + .48, [440, 554.37, 659.25], 1.05, .04, { attack: .22, send: .5 });
      bell(t + .74, 880, .85, .04, { send: .5, pan: .12 });
    }
  },
  {
    id: 'dive', dur: .9,
    play(t) {
      noise(t, .55, { type: 'bandpass', freq: 2600, to: 220, q: 1.2, gain: .11, send: .3 });
      tone(t + .25, 520, .5, .03, { type: 'triangle', to: 120, send: .25, pan: .1 });
      thump(t + .52, 95, .3, .18, { send: .2 });
      metal(t + .54, 900, .16, .022, { send: .18, pan: -.15 });
    }
  },
  {
    id: 'grave', dur: .65,
    play(t) {
      noise(t, .16, { type: 'bandpass', freq: 1250, q: 2.8, gain: .12, send: .16, pan: -.12 });
      thump(t + .01, 90, .24, .12, { send: .12, pan: -.08 });
      tone(t + .03, 420, .14, .026, { type: 'triangle', to: 300, send: .18, pan: .12 });
      noise(t + .1, .34, { type: 'lowpass', freq: 500, to: 160, q: .7, gain: .038, send: .16, pan: .12 });
    }
  },
  {
    id: 'ghost', dur: 1.15,
    play(t) {
      tone(t, 1450, .78, .03, { type: 'sine', to: 300, attack: .03, send: .46, pan: -.48 });
      noise(t + .12, .7, { type: 'bandpass', freq: 1050, to: 380, q: 5.5, gain: .052, send: .5, pan: .38 });
      thump(t + .54, 62, .4, .1, { send: .2 });
      tone(t + .58, 233, .45, .02, { type: 'triangle', to: 207, send: .3, pan: -.2 });
    }
  },
  {
    id: 'card', dur: .7,
    play(t) {
      noise(t, .13, { type: 'highpass', freq: 1900, q: .9, gain: .055, send: .1, pan: -.18 });
      noise(t + .09, .12, { type: 'highpass', freq: 2500, q: .9, gain: .04, send: .1, pan: .16 });
      metal(t + .04, 1250, .1, .018, { send: .12 });
      bell(t + .16, 1046.5, .38, .028, { send: .35, pan: .1 });
    }
  },
  {
    id: 'snow_road', dur: 1.25,
    play(t) {
      noise(t, 1.05, { type: 'bandpass', freq: 620, to: 180, q: .9, gain: .11, send: .32, brown: true });
      noise(t + .22, .09, { type: 'highpass', freq: 2600, q: 1.2, gain: .075, send: .18, pan: -.2 });
      thump(t + .32, 78, .38, .16, { send: .25, pan: .08 });
      tone(t + .3, 160, .34, .025, { type: 'triangle', to: 90, send: .2, pan: .16 });
    }
  },
  {
    id: 'snow_fort', dur: 1,
    play(t) {
      metal(t, 190, .2, .07, { send: .24, pan: -.55 });
      metal(t + .28, 170, .22, .08, { send: .26, pan: .55 });
      thump(t, 95, .18, .1, { send: .1, pan: -.5 });
      thump(t + .28, 95, .18, .1, { send: .1, pan: .5 });
      brass(t + .06, 146.83, .55, .025, { cutoff: 800, cutoffTo: 500, send: .34, pan: 0 });
    }
  },
  {
    id: 'snow_chill', dur: 1,
    play(t) {
      [2093, 1760, 1318.5].forEach((fq, i) => bell(t + i * .13, fq, .42 - i * .05, .025, { send: .46, pan: -.2 + i * .2 }));
      noise(t + .04, .68, { type: 'highpass', freq: 3200, to: 1800, q: .8, gain: .03, send: .38 });
      tone(t, 110, .8, .025, { type: 'sine', attack: .18, send: .2, pan: -.1 });
    }
  },
  {
    id: 'snow_sun', dur: 1.35,
    play(t) {
      chord(t, [261.63, 329.63, 392, 523.25], 1.15, .06, { attack: .16, send: .48 });
      bell(t + .38, 1046.5, .78, .035, { send: .46, pan: .16 });
      noise(t, .65, { type: 'highpass', freq: 2400, q: .7, gain: .018, send: .3 });
    }
  },
  {
    id: 'snow_camp', dur: 1,
    play(t) {
      tone(t, 74, .36, .024, { type: 'sawtooth', to: 58, filter: 'lowpass', cutoff: 360, q: 1.2, send: .12, pan: -.28 });
      metal(t + .17, 820, .12, .022, { send: .14, pan: -.18 });
      metal(t + .25, 1230, .1, .016, { send: .14, pan: .16 });
      noise(t + .3, .09, { type: 'bandpass', freq: 1800, q: 1.4, gain: .05, send: .12, pan: .25 });
      thump(t + .4, 130, .16, .07, { send: .08, pan: .18 });
    }
  },
  {
    id: 'snow_wolves', dur: 1.6,
    play(t) {
      howl(t, 392, 1.1, .04, { send: .48, pan: -.4 });
      howl(t + .34, 349.23, 1.05, .032, { send: .48, pan: .38 });
      noise(t, 1.4, { type: 'bandpass', freq: 520, to: 300, q: .6, gain: .045, send: .32, brown: true });
    }
  },
  {
    id: 'pirate_wave', dur: 1.5,
    play(t) {
      noise(t, .95, { type: 'highpass', freq: 420, to: 2600, q: .65, gain: .13, send: .38, pan: -.25 });
      noise(t + .3, .9, { type: 'lowpass', freq: 180, to: 60, q: .7, gain: .13, send: .32, brown: true, pan: .2 });
      thump(t + .3, 68, .4, .11, { send: .22, pan: .2 });
      tone(t + .48, 82, .75, .026, { type: 'sine', to: 58, attack: .12, send: .3, pan: .3 });
      for (let i = 0; i < 4; i++) {
        tone(t + .42 + i * .16, rnd(500, 900), .1, .012, { type: 'sine', to: rnd(900, 1300), send: .3, pan: rnd(-.3, .3) });
      }
    }
  },
  {
    id: 'pirate_cannon', dur: 1.5,
    play(t) {
      [0, .2, .4].forEach((dt, i) => {
        thump(t + dt, 96 - i * 5, .38, .16, { send: .26, pan: -.45 + i * .45 });
        noise(t + dt, .32, { type: 'lowpass', freq: 1500, to: 120, q: .7, gain: .11, send: .24, pan: -.45 + i * .45 });
        noise(t + dt, .06, { type: 'highpass', freq: 2600, q: .8, gain: .05, send: .15, pan: -.4 + i * .4 });
      });
      noise(t + .62, .6, { type: 'highpass', freq: 900, to: 2200, q: .7, gain: .03, send: .3, pan: .2 });
    }
  },
  {
    id: 'pirate_resupply', dur: 1.1,
    play(t) {
      metal(t, 260, .16, .075, { send: .25, pan: -.2 });
      metal(t + .25, 210, .18, .065, { send: .24, pan: .18 });
      noise(t + .02, .55, { type: 'bandpass', freq: 420, to: 760, q: 1.5, gain: .045, send: .18 });
      bell(t + .42, 660, .55, .028, { send: .35, pan: .12 });
      thump(t + .53, 100, .2, .06, { send: .1 });
    }
  },
  {
    id: 'pirate_point', dur: 1,
    play(t) {
      thump(t, 132, .2, .1, { send: .12, pan: -.16 });
      noise(t + .02, .12, { type: 'bandpass', freq: 1600, q: 1.5, gain: .05, send: .12, pan: -.1 });
      bell(t + .08, 1568, .32, .022, { send: .32, pan: .18 });
      bell(t + .16, 2093, .28, .016, { send: .32, pan: .22 });
      brass(t + .16, 293.66, .58, .026, { cutoff: 1400, cutoffTo: 800, send: .35, pan: 0 });
    }
  },
  {
    id: 'fog_graveyard', dur: 1.5,
    play(t) {
      bell(t, 110, 1.2, .06, { send: .5, pan: -.16, parts: [[1, 1], [2.02, .35], [3.1, .16]] });
      noise(t + .28, .4, { type: 'bandpass', freq: 620, to: 340, q: 1.8, gain: .07, send: .3, pan: .2 });
      noise(t + .45, .5, { type: 'bandpass', freq: 1200, to: 700, q: 4.5, gain: .025, send: .48, pan: -.3 });
      tone(t + .72, 196, .55, .022, { type: 'triangle', to: 185, send: .4, pan: .2 });
    }
  },
  {
    id: 'fog_dawn', dur: 1.7,
    play(t) {
      chord(t, [329.63, 415.3, 493.88], 1.3, .045, { attack: .24, send: .5 });
      bell(t + .34, 987.77, .95, .028, { send: .46, pan: .12 });
      tone(t + .3, 620, 1.05, .018, { type: 'sine', to: 310, attack: .18, send: .45, pan: -.3 });
      noise(t, .9, { type: 'highpass', freq: 2800, to: 1600, q: .7, gain: .014, send: .35 });
    }
  },
  {
    id: 'fog_soul', dur: .95,
    play(t) {
      bell(t, 1318.5, .55, .028, { send: .45, pan: -.18 });
      bell(t + .09, 1975.5, .62, .022, { send: .48, pan: .18 });
      noise(t + .05, .58, { type: 'highpass', freq: 3600, to: 2200, q: .8, gain: .018, send: .4 });
    }
  },
  {
    id: 'dragon_mark', dur: 1,
    play(t) {
      [523.25, 659.25, 783.99, 1046.5].forEach((fq, i) => {
        bell(t + i * .09, fq, .62 - i * .045, .022, { send: .5, pan: -.2 + i * .13 });
      });
      noise(t, .55, { type: 'highpass', freq: 3200, q: .7, gain: .02, send: .4 });
    }
  },
  {
    id: 'volcano', dur: 2.1,
    play(t) {
      noise(t, 1.8, { type: 'lowpass', freq: 130, to: 45, q: .7, gain: .22, send: .32, brown: true });
      noise(t + .28, 1.2, { type: 'bandpass', freq: 500, to: 1800, q: .8, gain: .12, send: .38, pan: -.2 });
      thump(t + .3, 72, .9, .16, { send: .3 });
      for (let i = 0; i < 8; i++) {
        const dt = .55 + i * .16 + rnd(0, .07);
        noise(t + dt, .05, { type: 'bandpass', freq: rnd(700, 2400), q: 2.6, gain: .026, send: .24, pan: rnd(-.55, .55) });
      }
      tone(t + .15, 55, 1.5, .03, { type: 'sine', to: 38, attack: .2, send: .2 });
    }
  },
  {
    id: 'volcano_warn', dur: 1.35,
    play(t) {
      noise(t, 1.2, { type: 'lowpass', freq: 170, to: 55, q: .7, gain: .14, send: .28, brown: true });
      tone(t, 46, 1.15, .04, { type: 'sine', to: 34, attack: .16, send: .24 });
      noise(t + .1, .9, { type: 'bandpass', freq: 420, to: 1400, q: 1.4, gain: .04, send: .36, pan: .15 });
      for (let i = 0; i < 3; i++) {
        noise(t + .55 + i * .22, .05, { type: 'bandpass', freq: 900 + i * 260, q: 2.4, gain: .028, send: .2, pan: -.3 + i * .3 });
      }
      bell(t + 1.02, 196, .32, .02, { send: .4, pan: .1 });
    }
  },
  {
    id: 'zone', dur: 1.15,
    play(t) {
      [392, 493.88, 587.33].forEach((fq, i) => brass(t + i * .08, fq, .38, .03, { cutoff: 1800, cutoffTo: 1200, send: .34, pan: -.15 + i * .15 }));
      noise(t, .12, { type: 'bandpass', freq: 1700, q: 1.6, gain: .055, send: .1, pan: 0 });
      thump(t + .28, 110, .25, .09, { send: .12 });
      bell(t + .3, 783.99, .55, .02, { send: .4, pan: .16 });
    }
  },
  {
    id: 'reinforce', dur: 1.35,
    play(t) {
      for (let i = 0; i < 6; i++) {
        noise(t + i * .075, .045, { type: 'bandpass', freq: 1500, q: 1.4, gain: .028 + i * .004, send: .1, pan: -.2 + i * .08 });
      }
      thump(t + .05, 118, .16, .055, { send: .08, pan: -.15 });
      thump(t + .24, 118, .16, .06, { send: .08, pan: .15 });
      brass(t + .34, 220, .72, .04, { cutoff: 1300, cutoffTo: 700, send: .36, pan: 0 });
      brass(t + .38, 329.63, .68, .026, { cutoff: 1500, cutoffTo: 800, send: .36, pan: .08 });
    }
  },
  {
    id: 'mine_descend', dur: 1.45,
    play(t) {
      tone(t, 82, .65, .024, { type: 'sawtooth', to: 56, filter: 'lowpass', cutoff: 340, q: 1.3, attack: .04, send: .18, pan: -.15 });
      noise(t, .95, { type: 'bandpass', freq: 900, to: 220, q: .9, gain: .065, send: .32, pan: .12, brown: true });
      thump(t + .75, 80, .26, .06, { send: .12 });
      bell(t + .86, 1760, .34, .012, { send: .48, pan: .2 });
    }
  },
  {
    id: 'mine_ascend', dur: 1.2,
    play(t) {
      noise(t, .8, { type: 'bandpass', freq: 260, to: 1050, q: .9, gain: .07, send: .3, pan: -.1, brown: true });
      tone(t + .12, 58, .55, .024, { type: 'sawtooth', to: 86, filter: 'lowpass', cutoff: 380, q: 1.2, send: .16, pan: .15 });
      thump(t + .7, 105, .2, .1, { send: .12 });
      metal(t + .72, 520, .16, .018, { send: .16, pan: .12 });
    }
  },
  {
    id: 'crystal', dur: .95,
    play(t) {
      [1046.5, 1318.5, 1568].forEach((fq, i) => bell(t + i * .085, fq, .55 - i * .04, .024, { send: .48, pan: -.18 + i * .16 }));
      noise(t + .04, .45, { type: 'highpass', freq: 3400, to: 2400, q: .8, gain: .018, send: .38 });
      pluck(t + .05, 523.25, .4, .018, { send: .3, pan: .1 });
    }
  },
  {
    id: 'relic', dur: 1.3,
    play(t) {
      bell(t, 196, 1.1, .05, { send: .52, pan: -.18, parts: [[1, 1], [2.01, .4], [2.98, .2], [4.2, .08]] });
      tone(t + .2, 293.66, 1, .022, { type: 'triangle', attack: .18, send: .42, pan: .18 });
      tone(t + .26, 311.13, .92, .014, { type: 'sine', attack: .22, send: .42, pan: .24 });
      noise(t, 1.05, { type: 'bandpass', freq: 500, to: 260, q: 2.4, gain: .025, send: .45, pan: -.1 });
    }
  },
  {
    id: 'collapse_warn', dur: 1.15,
    play(t) {
      tone(t, 58, 1, .04, { type: 'sawtooth', to: 44, filter: 'lowpass', cutoff: 180, q: 1.4, attack: .12, send: .24, pan: -.12 });
      noise(t, 1, { type: 'lowpass', freq: 240, to: 110, q: .8, gain: .07, send: .2, brown: true, pan: .1 });
      for (let i = 0; i < 3; i++) {
        noise(t + .18 + i * .24, .045, { type: 'bandpass', freq: 1300 - i * 220, q: 2.2, gain: .03, send: .16, pan: -.2 + i * .2 });
      }
    }
  },
  {
    id: 'cave_in', dur: 1.8,
    play(t) {
      noise(t, 1.5, { type: 'lowpass', freq: 180, to: 55, q: .7, gain: .22, send: .3, brown: true });
      thump(t + .1, 62, 1, .18, { send: .26 });
      for (let i = 0; i < 7; i++) {
        const dt = .18 + i * .17 + rnd(0, .05);
        thump(t + dt, rnd(80, 130), .2, .07, { send: .18, pan: rnd(-.5, .5) });
        noise(t + dt, .06, { type: 'bandpass', freq: rnd(700, 1900), q: 2.2, gain: .028, send: .2, pan: rnd(-.5, .5) });
      }
      tone(t + .2, 48, 1.35, .035, { type: 'sine', to: 34, attack: .16, send: .2 });
    }
  },
  {
    id: 'mine_boss', dur: 1.35,
    play(t) {
      tone(t, 64, 1.15, .06, { type: 'sawtooth', to: 42, filter: 'lowpass', cutoff: 190, cutoffTo: 120, q: 2.2, attack: .06, send: .28, pan: -.1 });
      tone(t + .15, 96, .85, .026, { type: 'triangle', to: 58, attack: .1, send: .24, pan: .16 });
      thump(t + .08, 72, .4, .16, { send: .24, pan: -.12 });
      thump(t + .42, 62, .45, .15, { send: .24, pan: .12 });
      metal(t + .5, 380, .3, .026, { send: .3, pan: .18 });
    }
  },
  {
    id: 'tide_rise', dur: 1.9,
    play(t) {
      noise(t, 1.7, { type: 'bandpass', freq: 260, to: 900, q: .8, gain: .1, send: .4, brown: true, pan: -.18 });
      tone(t, 55, 1.55, .035, { type: 'sine', to: 68, attack: .3, send: .3, pan: .12 });
      for (let i = 0; i < 6; i++) {
        tone(t + .18 + i * .22 + rnd(-.03, .03), rnd(420, 760), .11, .014, { type: 'sine', to: rnd(800, 1300), send: .36, pan: rnd(-.35, .35) });
      }
      noise(t + .8, .8, { type: 'highpass', freq: 1300, to: 2400, q: .8, gain: .026, send: .35, pan: .2 });
    }
  },
  {
    id: 'tide_cut', dur: .75,
    play(t) {
      noise(t, .18, { type: 'highpass', freq: 900, to: 3400, q: 1.4, gain: .1, send: .3, pan: -.2 });
      noise(t + .08, .35, { type: 'highpass', freq: 2200, to: 900, q: .8, gain: .08, send: .28, pan: .18 });
      thump(t + .1, 96, .26, .13, { send: .16 });
      tone(t + .12, 420, .22, .016, { type: 'triangle', to: 180, send: .2, pan: .1 });
    }
  },
  {
    id: 'tide_lure', dur: 1.2,
    play(t) {
      tone(t, 880, .38, .03, { type: 'sine', to: 660, attack: .01, send: .52, pan: -.1 });
      tone(t + .2, 880, .4, .02, { type: 'sine', to: 640, attack: .01, send: .55, pan: .18 });
      noise(t + .06, .9, { type: 'bandpass', freq: 700, to: 1200, q: 2.2, gain: .028, send: .42, pan: .1 });
      bell(t + .4, 440, .55, .012, { send: .55, pan: .25 });
    }
  },
  {
    id: 'tide_stone', dur: .75,
    play(t) {
      noise(t, .2, { type: 'bandpass', freq: 760, q: 2.5, gain: .1, send: .22, pan: -.16 });
      thump(t + .02, 82, .3, .15, { send: .18, pan: -.08 });
      noise(t + .12, .45, { type: 'lowpass', freq: 420, to: 150, q: 1.4, gain: .06, send: .25, brown: true, pan: .18 });
      tone(t + .18, 130, .34, .02, { type: 'triangle', to: 92, send: .2, pan: .12 });
    }
  },
  {
    id: 'tide_repair', dur: 1.05,
    play(t) {
      bell(t, 523.25, .85, .035, { send: .46, pan: -.12 });
      bell(t + .12, 783.99, .7, .02, { send: .46, pan: .2 });
      thump(t + .28, 90, .24, .07, { send: .14, pan: .1 });
      noise(t + .32, .55, { type: 'highpass', freq: 1600, to: 900, q: .7, gain: .02, send: .34, pan: -.15 });
    }
  },
  {
    id: 'incident', dur: 1.65,
    play(t) {
      bell(t, 440, 1.15, .045, { send: .48, pan: -.2, parts: [[1, 1], [2.02, .45], [3.1, .2]] });
      bell(t + .34, 415.3, 1, .033, { send: .48, pan: .22, parts: [[1, 1], [2.02, .4], [3.1, .16]] });
      tone(t + .12, 110, 1.1, .026, { type: 'sawtooth', filter: 'lowpass', cutoff: 420, q: 1.2, attack: .14, send: .34, pan: -.1 });
      tone(t + .14, 116.54, 1.05, .022, { type: 'sawtooth', filter: 'lowpass', cutoff: 380, q: 1.2, attack: .16, send: .34, pan: .12 });
      thump(t + .85, 88, .35, .08, { send: .2, pan: .18 });
    }
  },
  {
    id: 'city_reward', dur: 1.25,
    play(t) {
      [293.66, 369.99, 440].forEach((fq, i) => brass(t + i * .1, fq, .42, .032, { cutoff: 1700, cutoffTo: 1000, send: .34, pan: -.15 + i * .15 }));
      for (let i = 0; i < 4; i++) noise(t + .05 + i * .07, .04, { type: 'bandpass', freq: 1600, q: 1.4, gain: .022, send: .1, pan: -.2 + i * .1 });
      thump(t + .3, 88, .3, .09, { send: .16 });
      noise(t + .32, .6, { type: 'lowpass', freq: 300, to: 700, q: .8, gain: .025, send: .2, brown: true });
    }
  },
  {
    id: 'beacon_ignite', dur: 1.55,
    play(t) {
      noise(t, .5, { type: 'bandpass', freq: 300, to: 1400, q: .8, gain: .12, send: .32, pan: -.15 });
      noise(t + .08, .85, { type: 'bandpass', freq: 1200, to: 500, q: 1.5, gain: .055, send: .3, pan: .2, brown: true });
      for (let i = 0; i < 7; i++) {
        noise(t + .12 + i * .09 + rnd(0, .03), .035, { type: 'highpass', freq: rnd(1800, 3800), q: .9, gain: .025, send: .2, pan: rnd(-.35, .35) });
      }
      brass(t + .38, 146.83, .9, .052, { cutoff: 1100, cutoffTo: 1800, send: .45, pan: 0 });
      brass(t + .42, 220, .85, .034, { cutoff: 1200, cutoffTo: 1800, send: .45, pan: .08 });
      thump(t + .3, 75, .45, .12, { send: .22 });
    }
  },
  {
    id: 'beacon_capture', dur: 1.3,
    play(t) {
      brass(t, 220, .45, .04, { cutoff: 1300, cutoffTo: 900, send: .38, pan: -.2 });
      brass(t + .22, 293.66, .55, .04, { cutoff: 1500, cutoffTo: 1000, send: .38, pan: .2 });
      tone(t + .42, 70, .55, .03, { type: 'sawtooth', to: 48, filter: 'lowpass', cutoff: 260, q: 1.2, attack: .05, send: .24, pan: 0 });
      thump(t + .5, 78, .35, .16, { send: .24 });
      metal(t + .55, 340, .24, .022, { send: .24, pan: .18 });
    }
  },
  {
    id: 'beacon_signal', dur: 1.8,
    play(t) {
      [146.83, 220, 293.66].forEach((fq, i) => {
        brass(t + i * .24, fq, .72, .045, { cutoff: 1100, cutoffTo: 1700, send: .46, pan: -.3 + i * .3 });
      });
      chord(t + .62, [293.66, 369.99, 440, 587.33], 1.05, .055, { type: 'sawtooth', attack: .06, send: .5, filter: 'lowpass', cutoff: 1900, cutoffTo: 900, q: .7 });
      thump(t + .58, 72, .55, .18, { send: .28 });
      thump(t + .78, 72, .4, .12, { send: .24, pan: .15 });
      bell(t + .92, 1174.66, .7, .025, { send: .5, pan: .18 });
    }
  }
];

const byId = new Map(SFX.map(fx => [fx.id, fx]));

/* ============================== 播放接口 ============================== */

function unlock() {
  try {
    initAudio();
  } catch (err) {
    return false;
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx.state === 'running';
}

function play(id, opts = {}) {
  if (!enabled || !ctx || ctx.state !== 'running') return false;
  const fx = byId.get(id);
  if (!fx) return false;
  const now = performance.now();
  const gap = opts.minGap == null ? (GAP[id] == null ? 70 : GAP[id]) : opts.minGap;
  if (now - (lastPlay[id] || -1e9) < gap) return false;
  lastPlay[id] = now;
  try {
    fx.play(ctx.currentTime + .025);
    return true;
  } catch (err) {
    return false;
  }
}

function playFx(list) {
  if (!Array.isArray(list)) return 0;
  let played = 0;
  for (const event of list) {
    if (!event) continue;
    let id = null;
    switch (event.type) {
      case 'sfx': id = event.sound; break;
      case 'cannon': id = 'cannon'; break;
      case 'eruption-warn': id = 'volcano_warn'; break;
      case 'eruption': id = 'volcano'; break;
      case 'dragon-pickup': id = 'dragon_mark'; break;
      case 'layer-move': id = event.direction === 'down' ? 'dive' : 'dragon'; break;
      default: break;
    }
    if (id && play(id)) played++;
  }
  return played;
}

function setEnabled(value) {
  enabled = !!value;
  if (!enabled) {
    for (const src of active) {
      try { src.stop(); } catch (err) { /* already stopped */ }
    }
    active.clear();
  }
}

function debug() {
  return {
    ready: !!ctx,
    state: ctx ? ctx.state : 'none',
    enabled,
    volume,
    voices: active.size,
    count: SFX.length,
    last: Object.keys(lastPlay).slice(-8)
  };
}

window.ChaosSfx = { unlock, play, playFx, setEnabled, isEnabled: () => enabled, debug, list: () => SFX.map(fx => fx.id) };

function onGesture() {
  if (unlock()) {
    window.removeEventListener('pointerdown', onGesture, true);
    window.removeEventListener('keydown', onGesture, true);
    window.removeEventListener('touchstart', onGesture, true);
  }
}
window.addEventListener('pointerdown', onGesture, true);
window.addEventListener('keydown', onGesture, true);
window.addEventListener('touchstart', onGesture, true);
})();
