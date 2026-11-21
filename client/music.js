/* 混乱与蠕动 · 程序化背景音乐
 * 单文件、无音频素材，全部由 Web Audio 实时合成。
 * 联机版通过 <script src="/client/music.js"> 引入；
 * 单机版由 tools/build-local-music.cjs 内联到 local.html。
 */
(function () {
  'use strict';
  if (window.ChaosMusic) return;

  const STORAGE_KEY = 'chaos-music-enabled';

  let enabled = true;
  try { enabled = localStorage.getItem(STORAGE_KEY) !== '0'; } catch (e) { /* file:// 下可能不可用 */ }

  let ctx = null, bus = null, master = null, comp = null, revSend = null, noiseBuf = null;
  let filter = null, mixPanner = null, fadeGain = null, outputGain = null;
  let rainGain = null, windGain = null, windPanner = null;

  let timer = null, step = 0, nextTime = 0;
  let currentId = null, currentTrack = null, switchToken = 0;
  let lastSceneKey = '';
  let scene = { area: 'lobby', mode: null, weather: null, gameOver: false };
  let wxKey = null;
  // 图鉴试听：进入后暂停场景切换，由试听接口独占曲目。
  let previewMode = false, previewAutoResume = false, previewLoop = false;

  const f = m => 440 * Math.pow(2, (m - 69) / 12);

  /* ── 音频基础 ───────────────────────────────────────────── */

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
      for (const [ms, amp] of [[29, .55], [53, .35], [79, .22]]) {
        const i = Math.floor(rate * ms / 1000);
        if (i < len) d[i] += (c ? -amp : amp);
      }
    }
    return buf;
  }

  function makeNoise(sec) {
    const len = Math.floor(ctx.sampleRate * sec);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function out(node, sendAmt) {
    node.connect(bus);
    if (sendAmt > 0) {
      const g = ctx.createGain();
      g.gain.value = sendAmt;
      node.connect(g);
      g.connect(revSend);
    }
  }

  /* ── 乐器 ───────────────────────────────────────────────── */

  function pad(t, notes, dur, gain, o) {
    o = o || {};
    const atk = o.attack != null ? o.attack : Math.min(1.2, dur * 0.35);
    const rel = o.release != null ? o.release : 1.4;
    const cut = o.cut || 1000;

    const env = ctx.createGain();
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.Q.value = 0.6;
    filt.frequency.setValueAtTime(cut * 0.55, t);
    filt.frequency.linearRampToValueAtTime(cut, t + Math.min(atk + 0.4, dur));
    filt.frequency.linearRampToValueAtTime(cut * 0.7, t + dur);
    filt.connect(env);
    out(env, o.send != null ? o.send : 0.45);

    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(gain, t + atk);
    env.gain.setValueAtTime(gain, t + dur);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel);

    const end = t + dur + rel + 0.05;
    notes.forEach((m, idx) => {
      for (let k = 0; k < 2; k++) {
        const osc = ctx.createOscillator();
        osc.type = o.type || (k ? 'sawtooth' : 'triangle');
        osc.frequency.value = f(m);
        osc.detune.value = k ? (idx % 2 ? 7 : -7) : 0;
        osc.connect(filt);
        osc.start(t);
        osc.stop(end);
      }
    });
  }

  function pluck(t, m, gain, dur, o) {
    o = o || {};
    dur = Math.max(0.18, dur);
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = f(m);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = f(m) * 2.002;
    const g2 = ctx.createGain();
    g2.gain.value = 0.18;
    osc2.connect(g2);

    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.Q.value = 2;
    filt.frequency.setValueAtTime(4200, t);
    filt.frequency.exponentialRampToValueAtTime(900, t + dur);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.connect(filt);
    g2.connect(filt);
    filt.connect(env);
    out(env, o.send != null ? o.send : 0.5);

    osc.start(t); osc2.start(t);
    osc.stop(t + dur + 0.1); osc2.stop(t + dur + 0.1);
  }

  function bell(t, m, gain, dur) {
    dur = dur || 3;
    const car = ctx.createOscillator();
    car.type = 'sine';
    car.frequency.value = f(m);

    const mod = ctx.createOscillator();
    mod.type = 'sine';
    mod.frequency.value = f(m) * 2.76;

    const mg = ctx.createGain();
    mg.gain.setValueAtTime(f(m) * 2.2, t);
    mg.gain.exponentialRampToValueAtTime(f(m) * 0.02, t + dur * 0.45);
    mod.connect(mg);
    mg.connect(car.frequency);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(gain, t + 0.006);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    car.connect(env);
    out(env, 0.7);
    car.start(t); mod.start(t);
    car.stop(t + dur + 0.1); mod.stop(t + dur + 0.1);
  }

  function bass(t, m, dur, gain) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = f(m);

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = f(m);
    osc2.detune.value = -6;
    const g2 = ctx.createGain();
    g2.gain.value = 0.5;

    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 380;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(gain, t + 0.02);
    env.gain.setValueAtTime(gain, t + dur * 0.65);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.connect(filt);
    osc2.connect(g2);
    g2.connect(filt);
    filt.connect(env);
    out(env, 0.08);

    osc.start(t); osc2.start(t);
    osc.stop(t + dur + 0.1); osc2.stop(t + dur + 0.1);
  }

  function taiko(t, gain, pitch) {
    pitch = pitch || 52;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch * 2.4, t);
    osc.frequency.exponentialRampToValueAtTime(pitch, t + 0.12);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(gain, t + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    osc.connect(env);
    out(env, 0.32);

    const n = ctx.createBufferSource();
    n.buffer = noiseBuf;
    const nf = ctx.createBiquadFilter();
    nf.type = 'lowpass';
    nf.frequency.value = 420;
    const ne = ctx.createGain();
    ne.gain.setValueAtTime(gain * 0.5, t);
    ne.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    n.connect(nf); nf.connect(ne); out(ne, 0.25);

    osc.start(t); osc.stop(t + 0.55);
    n.start(t); n.stop(t + 0.15);
  }

  function timpani(t, m, gain) {
    gain = gain || 0.4;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f(m) * 1.06, t);
    osc.frequency.exponentialRampToValueAtTime(f(m), t + 0.18);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    osc.connect(env);
    out(env, 0.45);

    const n = ctx.createBufferSource();
    n.buffer = noiseBuf;
    const nf = ctx.createBiquadFilter();
    nf.type = 'bandpass';
    nf.frequency.value = 600;
    nf.Q.value = 1;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(gain * 0.5, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    n.connect(nf); nf.connect(ng); out(ng, 0.4);

    osc.start(t); osc.stop(t + 1.7);
    n.start(t); n.stop(t + 0.1);
  }

  function brass(t, m, dur, gain) {
    const o1 = ctx.createOscillator();
    o1.type = 'sawtooth';
    o1.frequency.value = f(m);
    const o2 = ctx.createOscillator();
    o2.type = 'sawtooth';
    o2.frequency.value = f(m);
    o2.detune.value = 8;

    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.Q.value = 1.2;
    filt.frequency.setValueAtTime(600, t);
    filt.frequency.linearRampToValueAtTime(2600, t + 0.08);
    filt.frequency.exponentialRampToValueAtTime(900, t + Math.max(0.1, dur));

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(gain, t + 0.04);
    env.gain.setValueAtTime(gain, t + dur * 0.8);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.2);

    o1.connect(filt); o2.connect(filt);
    filt.connect(env);
    out(env, 0.4);

    o1.start(t); o2.start(t);
    o1.stop(t + dur + 0.3); o2.stop(t + dur + 0.3);
  }

  function fiddle(t, m, dur, gain) {
    dur = Math.max(0.12, dur);
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = f(m);

    const vib = ctx.createOscillator();
    vib.frequency.value = 5.2;
    const vg = ctx.createGain();
    vg.gain.value = 7;
    vib.connect(vg);
    vg.connect(osc.detune);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3400;
    lp.Q.value = 0.9;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(gain, t + 0.05);
    env.gain.setValueAtTime(gain * 0.85, t + dur * 0.6);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.12);

    osc.connect(lp); lp.connect(env);
    out(env, 0.32);

    osc.start(t); osc.stop(t + dur + 0.2);
    vib.start(t); vib.stop(t + dur + 0.2);
  }

  // 奥洛斯管：古希腊双簧管，带鼻音的持续旋律
  function aulos(t, m, dur, gain) {
    dur = Math.max(0.16, dur);
    const o1 = ctx.createOscillator();
    o1.type = 'sawtooth';
    o1.frequency.value = f(m);
    const o2 = ctx.createOscillator();
    o2.type = 'square';
    o2.frequency.value = f(m) * 1.002;
    o2.detune.value = -5;

    const vib = ctx.createOscillator();
    vib.frequency.value = 4.8;
    const vg = ctx.createGain();
    vg.gain.value = 5;
    vib.connect(vg);
    vg.connect(o1.detune);
    vg.connect(o2.detune);

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1150;
    bp.Q.value = 2.4;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3200;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(gain, t + 0.055);
    env.gain.linearRampToValueAtTime(gain * 0.78, t + dur * 0.6);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.18);

    o1.connect(bp); o2.connect(bp);
    bp.connect(lp); lp.connect(env);
    out(env, 0.38);

    o1.start(t); o2.start(t); vib.start(t);
    o1.stop(t + dur + 0.3); o2.stop(t + dur + 0.3); vib.stop(t + dur + 0.3);
  }

  function choir(t, notes, dur, gain) {
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(gain, t + 1.4);
    env.gain.setValueAtTime(gain, t + dur);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur + 2.4);

    const f1 = ctx.createBiquadFilter();
    f1.type = 'bandpass'; f1.frequency.value = 520; f1.Q.value = 1.1;
    const f2 = ctx.createBiquadFilter();
    f2.type = 'bandpass'; f2.frequency.value = 1350; f2.Q.value = 1.4;

    const mix = ctx.createGain();
    mix.gain.value = 0.9;
    f1.connect(mix); f2.connect(mix);
    mix.connect(env);
    out(env, 0.75);

    const end = t + dur + 2.8;
    notes.forEach((m, i) => {
      for (let k = 0; k < 2; k++) {
        const osc = ctx.createOscillator();
        osc.type = k ? 'sawtooth' : 'triangle';
        osc.frequency.value = f(m);
        osc.detune.value = (k ? 9 : -9) + (i % 2 ? 4 : -4);
        osc.connect(f1);
        osc.connect(f2);
        osc.start(t);
        osc.stop(end);
      }
    });
  }

  function shaker(t, gain) {
    const n = ctx.createBufferSource();
    n.buffer = noiseBuf;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 5200;
    const env = ctx.createGain();
    env.gain.setValueAtTime(gain, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    n.connect(hp); hp.connect(env);
    out(env, 0.2);
    n.start(t); n.stop(t + 0.09);
  }

  function rim(t, gain) {
    const n = ctx.createBufferSource();
    n.buffer = noiseBuf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2400;
    bp.Q.value = 7;
    const env = ctx.createGain();
    env.gain.setValueAtTime(gain, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    n.connect(bp); bp.connect(env);
    out(env, 0.28);
    n.start(t); n.stop(t + 0.07);
  }

  function snare(t, gain) {
    const n = ctx.createBufferSource();
    n.buffer = noiseBuf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1900;
    bp.Q.value = 0.7;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 500;
    const env = ctx.createGain();
    env.gain.setValueAtTime(gain, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    n.connect(bp); bp.connect(hp); hp.connect(env);
    out(env, 0.25);
    n.start(t); n.stop(t + 0.16);

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(210, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.08);
    const oe = ctx.createGain();
    oe.gain.setValueAtTime(gain * 0.5, t);
    oe.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    osc.connect(oe);
    out(oe, 0.15);
    osc.start(t); osc.stop(t + 0.1);
  }

  function wind(t, dur, gain) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 600;
    bp.Q.value = 0.8;

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lg = ctx.createGain();
    lg.gain.value = 260;
    lfo.connect(lg);
    lg.connect(bp.frequency);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(gain, t + dur * 0.25);
    env.gain.linearRampToValueAtTime(gain * 0.7, t + dur * 0.7);
    env.gain.linearRampToValueAtTime(0.0001, t + dur);

    src.connect(bp); bp.connect(env);
    out(env, 0.3);

    src.start(t); src.stop(t + dur + 0.1);
    lfo.start(t); lfo.stop(t + dur + 0.1);
  }

  /* ── 乐段数据 ───────────────────────────────────────────── */

  function toMap(list) {
    const map = Object.create(null);
    for (const [s, n, len] of list) {
      (map[s] || (map[s] = [])).push([n, len]);
    }
    return map;
  }

  const L_CH = [[50, 53, 57], [46, 50, 53], [41, 45, 48], [48, 52, 55]];
  const L_MEL_A = toMap([
    [0, 69, 3], [8, 72, 2], [14, 67, 4],
    [16, 65, 2], [24, 69, 3],
    [32, 72, 4], [40, 69, 3],
    [48, 65, 4], [56, 62, 6],
    [64, 67, 2], [70, 69, 2], [76, 72, 3],
    [80, 74, 4], [88, 72, 2],
    [96, 69, 3], [104, 65, 3],
    [112, 62, 6], [120, 64, 2], [122, 65, 4]
  ]);
  const L_MEL_B = toMap([
    [0, 72, 2], [2, 74, 2], [4, 76, 2], [6, 77, 2], [8, 76, 4], [12, 74, 2], [14, 72, 2],
    [16, 69, 4], [20, 72, 2], [22, 74, 2], [24, 76, 4], [28, 74, 2], [30, 72, 2],
    [32, 74, 2], [34, 76, 2], [36, 77, 2], [38, 79, 2], [40, 81, 4], [44, 79, 2], [46, 77, 2],
    [48, 76, 4], [52, 74, 2], [54, 72, 2], [56, 69, 6], [62, 67, 2],
    [64, 69, 2], [66, 72, 2], [68, 74, 2], [70, 76, 2], [72, 77, 4], [76, 76, 2], [78, 74, 2],
    [80, 72, 4], [84, 69, 2], [86, 72, 2], [88, 74, 4], [92, 72, 2], [94, 69, 2],
    [96, 67, 2], [98, 69, 2], [100, 72, 2], [102, 74, 2], [104, 76, 4], [108, 74, 2], [110, 72, 2],
    [112, 69, 8], [124, 67, 4]
  ]);

  /* 经典·行军曲：D 小调，112 BPM，48 小节，A–B–A′–C–D–coda */
  const B_CH = [
    [[50, 53, 57, 62], [46, 50, 53, 58], [41, 45, 48, 53], [48, 52, 55, 60]],
    [[43, 46, 50, 55], [50, 53, 57, 62], [51, 55, 58, 63], [45, 49, 52, 57]],
    [[50, 53, 57, 62], [46, 50, 53, 58], [43, 46, 50, 55], [45, 49, 52, 57]],
    [[46, 50, 53, 58], [41, 45, 48, 53], [43, 46, 50, 55], [45, 49, 52, 57]],
    [[50, 53, 57, 62], [46, 50, 53, 58], [41, 45, 48, 53], [48, 52, 55, 60]],
    [[50, 53, 57, 62], [43, 46, 50, 55], [46, 50, 53, 58], [50, 53, 57, 62]]
  ];
  const B_MEL_A = toMap([
    [0, 74, 4], [4, 77, 2], [6, 81, 2],
    [8, 79, 4], [12, 77, 2], [14, 74, 2],
    [16, 77, 4], [20, 81, 2], [22, 84, 2],
    [24, 82, 6], [30, 81, 2],
    [32, 81, 4], [36, 84, 2], [38, 86, 2],
    [40, 84, 4], [44, 81, 2], [46, 79, 2],
    [48, 77, 4], [52, 79, 2], [54, 81, 2],
    [56, 79, 6], [62, 74, 2],
    [64, 81, 4], [68, 84, 2], [70, 86, 2],
    [80, 84, 4], [84, 81, 2], [86, 79, 2],
    [96, 77, 4], [100, 79, 2], [102, 81, 2],
    [112, 79, 4], [116, 77, 2], [118, 74, 8]
  ]);
  const B_MEL_B = toMap([
    [0, 67, 4], [4, 70, 2], [6, 74, 2],
    [8, 77, 4], [12, 74, 2], [14, 70, 2],
    [16, 69, 4], [20, 74, 2], [22, 77, 2],
    [24, 76, 4], [28, 74, 2], [30, 69, 2],
    [32, 70, 4], [36, 75, 2], [38, 79, 2],
    [40, 77, 4], [44, 75, 2], [46, 74, 2],
    [48, 73, 4], [52, 76, 2], [54, 81, 2],
    [56, 79, 4], [60, 76, 2], [62, 73, 2],
    [64, 70, 4], [68, 75, 2], [70, 79, 2],
    [80, 77, 4], [84, 75, 2], [86, 74, 2],
    [96, 73, 4], [100, 76, 2], [102, 81, 2],
    [112, 79, 4], [116, 76, 2], [118, 73, 4]
  ]);
  const B_MEL_A2 = toMap([
    [0, 74, 4], [4, 77, 2], [6, 81, 2],
    [8, 79, 4], [12, 77, 2], [14, 74, 2],
    [16, 77, 4], [20, 81, 2], [22, 84, 2],
    [24, 82, 6], [30, 81, 2],
    [32, 74, 4], [36, 77, 2], [38, 79, 2],
    [40, 81, 4], [44, 82, 2], [46, 81, 2],
    [48, 73, 4], [52, 76, 2], [54, 81, 2],
    [56, 79, 4], [60, 76, 2], [62, 81, 2],
    [64, 74, 4], [68, 77, 2], [70, 79, 2],
    [80, 81, 4], [84, 82, 2], [86, 81, 2],
    [96, 73, 4], [100, 76, 2], [102, 81, 2],
    [112, 79, 4], [116, 76, 2], [118, 81, 4]
  ]);
  const B_MEL_C = toMap([
    [0, 74, 2], [2, 72, 2], [4, 70, 4],
    [8, 69, 2], [10, 70, 2], [12, 72, 4],
    [16, 74, 4], [20, 76, 2], [22, 77, 2],
    [24, 76, 4], [28, 72, 2], [30, 69, 2],
    [32, 70, 4], [36, 74, 2], [38, 79, 2],
    [40, 77, 4], [44, 74, 2], [46, 70, 2],
    [48, 73, 4], [52, 76, 2], [54, 81, 2],
    [56, 82, 2], [58, 81, 2], [60, 79, 4],
    [64, 70, 4], [68, 74, 2], [70, 79, 2],
    [80, 77, 4], [84, 74, 2], [86, 70, 2],
    [96, 73, 4], [100, 76, 2], [102, 81, 2],
    [112, 82, 2], [114, 81, 2], [116, 79, 4]
  ]);
  const B_MEL_D = toMap([
    [0, 81, 4], [4, 79, 2], [6, 77, 2],
    [8, 76, 4], [12, 74, 2], [14, 69, 2],
    [16, 77, 4], [20, 82, 2], [22, 86, 2],
    [24, 84, 4], [28, 82, 2], [30, 81, 2],
    [32, 81, 4], [36, 77, 2], [38, 84, 2],
    [40, 86, 4], [44, 84, 2], [46, 81, 2],
    [48, 79, 4], [52, 81, 2], [54, 82, 2],
    [56, 81, 6], [62, 79, 2],
    [64, 81, 4], [68, 77, 2], [70, 84, 2],
    [80, 86, 4], [84, 84, 2], [86, 81, 2],
    [96, 79, 4], [100, 81, 2], [102, 82, 2],
    [112, 81, 6], [118, 79, 2]
  ]);
  const B_MEL_CODA = toMap([
    [0, 74, 4], [4, 77, 2], [6, 81, 2],
    [8, 79, 4], [12, 77, 2], [14, 74, 2],
    [16, 70, 6], [22, 74, 2],
    [24, 69, 4], [28, 67, 2], [30, 65, 2],
    [32, 74, 4], [36, 77, 2], [38, 82, 2],
    [40, 81, 4], [44, 77, 2], [46, 74, 2],
    [48, 72, 4], [52, 69, 2], [54, 65, 2],
    [56, 74, 8],
    [64, 74, 4], [68, 77, 2], [70, 82, 2],
    [80, 81, 4], [84, 77, 2], [86, 74, 2],
    [96, 72, 4], [100, 69, 2], [102, 65, 2],
    [112, 74, 8], [120, 74, 8]
  ]);


  const S_CH = [[64, 67, 71, 74], [60, 64, 67, 72], [55, 59, 62, 67], [62, 66, 69, 74]];
  const S_ARP = [0, 1, 2, 3, 2, 1, 2, 3];
  const S_MEL_A = toMap([
    [0, 76, 2], [2, 79, 2], [4, 83, 2], [6, 81, 2], [8, 79, 4], [12, 76, 2], [14, 74, 2],
    [16, 72, 2], [18, 76, 2], [20, 79, 2], [22, 83, 2], [24, 84, 4], [28, 83, 2], [30, 79, 2],
    [32, 81, 2], [34, 79, 2], [36, 76, 2], [38, 74, 2], [40, 71, 4], [44, 74, 2], [46, 76, 2],
    [48, 79, 4], [52, 81, 2], [54, 83, 2], [56, 84, 6], [62, 83, 2],
    [64, 79, 2], [66, 76, 2], [68, 74, 2], [70, 76, 2], [72, 79, 4], [76, 81, 2], [78, 83, 2],
    [80, 84, 4], [84, 83, 2], [86, 81, 2], [88, 79, 4], [92, 76, 2], [94, 74, 2],
    [96, 72, 2], [98, 74, 2], [100, 76, 2], [102, 79, 2], [104, 81, 4], [108, 79, 2], [110, 76, 2],
    [112, 74, 8], [124, 71, 4]
  ]);
  const S_MEL_B = toMap([
    [0, 83, 2], [2, 84, 2], [4, 86, 2], [6, 88, 2], [8, 86, 4], [12, 84, 2], [14, 83, 2],
    [16, 81, 2], [18, 83, 2], [20, 84, 2], [22, 86, 2], [24, 88, 4], [28, 86, 2], [30, 84, 2],
    [32, 83, 2], [34, 81, 2], [36, 79, 2], [38, 76, 2], [40, 74, 4], [44, 76, 2], [46, 79, 2],
    [48, 83, 4], [52, 81, 2], [54, 79, 2], [56, 76, 6], [62, 74, 2],
    [64, 79, 2], [66, 83, 2], [68, 84, 2], [70, 83, 2], [72, 81, 4], [76, 79, 2], [78, 76, 2],
    [80, 74, 2], [82, 76, 2], [84, 79, 2], [86, 81, 2], [88, 83, 4], [92, 84, 2], [94, 83, 2],
    [96, 81, 2], [98, 79, 2], [100, 76, 2], [102, 74, 2], [104, 71, 4], [108, 74, 2], [110, 76, 2],
    [112, 79, 8], [124, 83, 4]
  ]);

  const P_CH = [
    [50, 53, 57], [46, 50, 53], [48, 52, 55], [50, 53, 57],
    [46, 50, 53], [48, 52, 55], [50, 53, 57], [50, 53, 57]
  ];
  const P_MEL_A = toMap([
    [3, 74, 2], [9, 72, 2], [15, 69, 3],
    [24, 69, 1], [25, 72, 1], [27, 74, 2], [29, 72, 1], [30, 69, 2],
    [33, 65, 1], [34, 67, 1], [36, 69, 2], [39, 72, 2],
    [42, 74, 2], [44, 72, 1], [45, 74, 1], [47, 77, 1]
  ]);
  const P_MEL_B = toMap([
    [0, 74, 2], [3, 72, 1], [4, 69, 2],
    [6, 67, 1], [7, 69, 1], [9, 72, 2],
    [12, 74, 2], [15, 77, 2], [18, 76, 2],
    [21, 74, 2], [24, 72, 1], [25, 74, 1], [27, 77, 2],
    [30, 79, 2], [33, 77, 2], [36, 76, 2],
    [39, 74, 2], [42, 72, 2], [45, 69, 2]
  ]);

  const H_CH = [[50, 53, 57, 62], [46, 50, 53, 58], [41, 45, 48, 53], [48, 52, 55, 60]];
  const H_MEL_A = toMap([
    [0, 74, 3], [8, 72, 2], [12, 69, 4], [20, 70, 3],
    [24, 74, 3], [28, 77, 4], [36, 76, 2], [40, 74, 3],
    [48, 72, 4], [56, 69, 4]
  ]);
  const H_MEL_B = toMap([
    [0, 74, 4], [4, 77, 4], [8, 81, 4], [12, 79, 2], [14, 77, 2],
    [16, 76, 4], [20, 74, 2], [22, 72, 2], [24, 74, 6],
    [32, 81, 4], [36, 84, 4], [40, 86, 4], [44, 84, 2], [46, 81, 2],
    [48, 79, 4], [52, 77, 2], [54, 76, 2], [56, 74, 6],
    [64, 77, 4], [68, 79, 4], [72, 81, 4], [76, 84, 2], [78, 81, 2],
    [80, 79, 4], [84, 77, 2], [86, 76, 2], [88, 74, 6],
    [96, 72, 4], [100, 74, 2], [102, 76, 2], [104, 77, 6],
    [112, 76, 4], [116, 74, 2], [118, 72, 2], [120, 69, 8]
  ]);

  /* 城邦裂变：D 多利亚调式，里拉琴与奥洛斯管，Dm – C – B♭ – Am */
  const W_CH = [[50, 53, 57, 62], [48, 52, 55, 60], [46, 50, 53, 58], [45, 48, 52, 57]];
  const W_MEL_A = toMap([
    [0, 69, 3], [3, 72, 2], [6, 74, 2], [8, 77, 4], [12, 76, 2], [14, 74, 2],
    [16, 72, 3], [20, 69, 3], [24, 72, 2], [26, 74, 2], [28, 77, 4],
    [32, 79, 2], [34, 77, 2], [36, 76, 2], [38, 74, 2], [40, 72, 5], [46, 69, 2],
    [48, 72, 2], [50, 74, 2], [52, 76, 2], [54, 77, 2], [56, 79, 4], [60, 77, 4],
    [64, 76, 2], [66, 74, 2], [68, 72, 2], [70, 69, 2], [72, 67, 4], [76, 69, 2], [78, 72, 2],
    [80, 74, 3], [84, 77, 3], [88, 79, 4], [92, 77, 2], [94, 74, 2],
    [96, 72, 2], [98, 74, 2], [100, 76, 2], [102, 77, 2], [104, 81, 4], [108, 79, 2], [110, 77, 2],
    [112, 76, 3], [116, 74, 3], [120, 72, 4], [124, 69, 4]
  ]);
  const W_MEL_B = toMap([
    [0, 81, 3], [3, 79, 2], [6, 77, 3], [10, 76, 2], [12, 74, 4],
    [16, 77, 2], [18, 79, 2], [20, 81, 4], [24, 84, 2], [26, 81, 2], [28, 79, 4],
    [32, 77, 2], [34, 76, 2], [36, 74, 2], [38, 72, 2], [40, 74, 6], [48, 77, 2],
    [50, 79, 2], [52, 81, 2], [54, 84, 2], [56, 86, 4], [60, 84, 4],
    [64, 81, 2], [66, 79, 2], [68, 77, 2], [70, 76, 2], [72, 74, 4], [76, 77, 2], [78, 81, 2],
    [80, 79, 2], [82, 77, 2], [84, 76, 2], [86, 74, 2], [88, 72, 6],
    [96, 74, 2], [98, 77, 2], [100, 81, 2], [102, 84, 2], [104, 86, 4], [108, 84, 2], [110, 81, 2],
    [112, 79, 4], [116, 77, 2], [118, 76, 2], [120, 74, 4], [124, 69, 4]
  ]);

  /* 城邦裂变二阶段·抒情版：D 小调/弗里吉亚，126 BPM，6/8，48 小节 */
  const W3_CH = [
    [[50, 53, 57, 62], [46, 50, 53, 58], [41, 45, 48, 53], [48, 52, 55, 60]],
    [[43, 46, 50, 55], [50, 53, 57, 62], [51, 55, 58, 63], [41, 45, 48, 53]],
    [[50, 53, 57, 62], [46, 50, 53, 58], [43, 46, 50, 55], [45, 48, 52, 57]],
    [[46, 50, 53, 58], [41, 45, 48, 53], [43, 46, 50, 55], [45, 49, 52, 57]],
    [[50, 53, 57, 62], [51, 55, 58, 63], [46, 50, 53, 58], [43, 46, 50, 55]],
    [[50, 53, 57, 62], [43, 46, 50, 55], [46, 50, 53, 58], [50, 53, 57, 62]]
  ];
  const W3_MEL_A = toMap([
    [12, 74, 3], [15, 75, 3],
    [18, 74, 3], [21, 72, 3],
    [24, 70, 6],
    [30, 69, 3], [33, 72, 3],
    [36, 74, 6],
    [42, 72, 3], [45, 69, 3]
  ]);
  const W3_MEL_B = toMap([
    [0, 67, 3], [3, 70, 3],
    [6, 74, 6],
    [12, 72, 3], [15, 70, 3],
    [18, 69, 6],
    [24, 70, 3], [27, 74, 3],
    [30, 75, 6],
    [36, 74, 3], [39, 72, 3],
    [42, 70, 3], [45, 69, 3]
  ]);
  const W3_MEL_A2 = toMap([
    [0, 74, 3], [3, 75, 3],
    [6, 74, 3], [9, 72, 3],
    [12, 70, 6],
    [18, 69, 3], [21, 72, 3],
    [24, 74, 3], [27, 77, 3],
    [30, 75, 3], [33, 74, 3],
    [36, 72, 3], [39, 69, 3],
    [42, 70, 3], [45, 69, 3]
  ]);
  const W3_MEL_C = toMap([
    [0, 74, 3], [3, 72, 3],
    [6, 70, 3], [9, 69, 3],
    [12, 72, 3], [15, 74, 3],
    [18, 75, 6],
    [24, 74, 3], [27, 72, 3],
    [30, 70, 3], [33, 69, 3],
    [36, 67, 3], [39, 65, 3],
    [42, 69, 6]
  ]);
  const W3_MEL_D = toMap([
    [0, 81, 3], [3, 79, 3],
    [6, 77, 6],
    [12, 75, 3], [15, 74, 3],
    [18, 72, 6],
    [24, 74, 3], [27, 77, 3],
    [30, 79, 3], [33, 81, 3],
    [36, 82, 6],
    [42, 81, 3], [45, 79, 3]
  ]);
  const W3_MEL_CODA = toMap([
    [0, 74, 3], [3, 75, 3],
    [6, 74, 3], [9, 72, 3],
    [12, 70, 6],
    [18, 69, 6],
    [24, 74, 3], [27, 77, 3],
    [30, 75, 3], [33, 74, 3],
    [36, 72, 3], [39, 69, 3],
    [42, 74, 6]
  ]);


  /* ── 乐段 ───────────────────────────────────────────────── */

  function playLobby(s, t, d) {
    const bar = (s / 16) | 0;
    const pos = s % 16;
    const ci = ((bar / 2) | 0) % 4;
    const sec = (bar / 8) | 0;
    const idx = (s - sec * 128) % 128;

    if (pos === 0 && bar % 2 === 0) {
      const ch = L_CH[ci];
      pad(t, ch.concat([ch[0] + 12]), d * 32, 0.072, { attack: 2.4, release: 2.8, cut: 820, send: 0.6 });
      bass(t, ch[0] - 12, d * 30, 0.15);
      wind(t, d * 32, 0.02);
    }

    const map = sec % 2 === 1 ? L_MEL_B : L_MEL_A;
    const ev = map[idx];
    if (ev) for (const [n, len] of ev) {
      pluck(t, n, 0.125, len * d, { send: 0.55 });
      if (sec === 3) pluck(t, n + 12, 0.035, len * d, { send: 0.65 });
    }

    if (s === 0) bell(t, 81, 0.055, 4.2);
    else if (s === 128) bell(t, 77, 0.045, 3.6);
    else if (s === 256) bell(t, 84, 0.045, 4.2);
    else if (s === 384) bell(t, 79, 0.045, 3.6);
  }

  function playBattle(s, t, d) {
    const bar = (s / 16) | 0;
    const pos = s % 16;
    const sec = (bar / 8) | 0;
    const sb = bar % 8;
    const ci = (sb / 2) | 0;
    const ch = B_CH[sec][ci];
    const root = ch[0] - 12;
    const sparse = sec === 3;
    const full = sec === 4 || sec === 5;

    if (pos === 0) bass(t, root, d * (sparse ? 6 : 3.8), sparse ? 0.12 : 0.16);
    if (pos === 8 && !sparse) bass(t, root + 7, d * 2.2, 0.1);
    if (sec === 4 && (pos === 6 || pos === 14)) bass(t, root + 12, d * 1.2, 0.06);

    if (pos === 0 && sb % 2 === 0) {
      pad(t, ch.map(n => n + 12), d * 32, sparse ? 0.018 : full ? 0.03 : 0.024, {
        attack: 0.22, release: 0.9, cut: sparse ? 1400 : full ? 2600 : 2000, type: 'sawtooth', send: 0.5
      });
    }

    if (pos === 0) taiko(t, sparse ? 0.16 : full ? 0.42 : 0.34, 50);
    if (pos === 8) taiko(t, sparse ? 0.08 : 0.22, 50);
    if (!sparse) {
      if (pos === 4 || pos === 12) snare(t, full ? 0.04 : 0.028);
      if (pos === 2 || pos === 6 || pos === 10 || pos === 14) rim(t, 0.03);
    } else if (pos === 4 || pos === 12) {
      rim(t, 0.025);
    }
    if (sb === 7 && pos >= 8) snare(t, (sparse ? 0.012 : 0.02) + (pos - 8) * 0.0025);
    if (pos === 0 && sb === 0 && sec > 0) bell(t, ch[3] + 24, 0.025, 3.2);

    // 经典天候的轻量加花：不重排旋律，只跟随天候换气
    if (wxKey === 'breeze' && pos === 14 && sb % 2 === 1) {
      pluck(t, ch[3] + 24, 0.012, d * 1.2, { send: 0.75 });
    } else if (wxKey === 'mist' && pos === 0 && sb % 4 === 0) {
      bell(t, ch[0] + 12, 0.012, 4.5);
    } else if (wxKey === 'drizzle' && pos === 6) {
      shaker(t, 0.008);
    }

    if (pos === 4 || pos === 12) {
      for (const n of ch) pluck(t, n + 12, sparse ? 0.016 : 0.022, d * 1.1, { send: 0.4 });
    }
    if (full && pos === 0 && sb % 2 === 0) {
      brass(t, ch[0] + 12, d * 4, 0.026);
      brass(t, ch[1] + 12, d * 4, 0.018);
    }

    const map = [B_MEL_A, B_MEL_B, B_MEL_A2, B_MEL_C, B_MEL_D, B_MEL_CODA][sec];
    const ev = map[(s - sec * 128) % 128];
    if (ev) for (const [n, len] of ev) {
      if (sec === 3) {
        fiddle(t, n, len * d, 0.055);
      } else {
        pluck(t, n, sec === 1 ? 0.07 : 0.085, len * d, { send: 0.55 });
        if (sec >= 1) fiddle(t, n - 12, len * d, full ? 0.024 : 0.016);
        if (sec === 4 && len >= 4) brass(t, n - 12, len * d, 0.022);
      }
      if (len >= 6) bell(t, n + 12, 0.012, len * d * 1.2);
    }

    if (sec === 5 && bar === 47 && pos === 0) {
      timpani(t, 38, 0.4);
      bell(t, 86, 0.03, 5);
    }
  }


  function playSnow(s, t, d) {
    const bar = (s / 16) | 0;
    const pos = s % 16;
    const ci = ((bar / 2) | 0) % 4;
    const ch = S_CH[ci];
    const sec = (bar / 8) | 0;

    if (pos === 0 && bar % 2 === 0) {
      pad(t, ch.map(x => x + 12), d * 32, 0.032, { attack: 1.8, release: 2.4, cut: 2800, send: 0.7 });
      bass(t, Math.max(30, ch[0] - 24), d * 30, 0.09);
      wind(t, d * 32, 0.026);
    }

    if (pos % 2 === 0) {
      const idx = (pos / 2) % S_ARP.length;
      bell(t, ch[S_ARP[idx]] + 12, 0.03, 1.5);
    }

    const map = sec % 2 === 1 ? S_MEL_B : S_MEL_A;
    const ev = map[(s - sec * 128) % 128];
    if (ev) for (const [n, len] of ev) {
      pluck(t, n, 0.075, len * d, { send: 0.6 });
      if (len >= 4) bell(t, n + 12, 0.022, 2.6);
    }

    if (s === 56) bell(t, 95, 0.04, 3.4);
    if (s === 320) bell(t, 93, 0.035, 3.2);

    if (wxKey === 'snowHeavy' && pos === 0 && bar % 2 === 0) taiko(t, 0.2, 40);
  }

  function playFog(s, t, d) {
    const bar = (s / 16) | 0;
    const pos = s % 16;

    if (pos === 0 && bar % 4 === 0) {
      pad(t, [38, 45, 50], d * 64, 0.085, { attack: 5, release: 5, cut: 420, type: 'sawtooth', send: 0.6 });
      wind(t, d * 64, 0.05);
    }
    if (pos === 0 && bar === 4) {
      pad(t, [62, 69, 75], d * 64, 0.022, { attack: 4, release: 5, cut: 1800, send: 0.8 });
    }
    if (pos === 0 && bar === 12) {
      pad(t, [60, 67, 74, 75], d * 64, 0.02, { attack: 4.5, release: 5, cut: 1500, type: 'triangle', send: 0.85 });
    }

    if (s === 0) bell(t, 74, 0.05, 6);
    else if (s === 40) bell(t, 82, 0.035, 5);
    else if (s === 80) bell(t, 75, 0.04, 6);
    else if (s === 120) bell(t, 70, 0.035, 5);
    else if (s === 160) bell(t, 74, 0.03, 4);
    else if (s === 200) bell(t, 79, 0.028, 4.5);
    else if (s === 240) bell(t, 74, 0.03, 4);

    if (wxKey === 'fogDawn' && pos === 0 && bar % 4 === 0) bell(t, 86, 0.026, 4.5);
  }

  function playPirate(s, t, d) {
    const bar = (s / 6) | 0;
    const pos = s % 6;
    const ch = P_CH[bar % 8];
    const sec = bar >= 8 ? 1 : 0;

    if (pos === 0) bass(t, ch[0] - 12, d * 2.6, 0.18);
    if (pos === 3) bass(t, ch[0] - 12 + 7, d * 2.2, 0.14);

    if (pos === 0) taiko(t, 0.4, 58);
    if (pos === 3) taiko(t, 0.3, 58);
    if (pos === 5) taiko(t, 0.16, 60);
    if (pos === 2 || pos === 5) shaker(t, 0.035);

    if (pos === 2 || pos === 5) {
      pad(t, ch, d * 0.8, 0.032, { attack: 0.01, release: 0.12, cut: 2000, type: 'sawtooth', send: 0.3 });
    }

    const map = sec === 1 ? P_MEL_B : P_MEL_A;
    const ev = map[(s - sec * 48) % 48];
    if (ev) for (const [n, len] of ev) {
      fiddle(t, n, len * d, 0.09);
      if (sec === 1) pluck(t, n + 12, 0.03, len * d, { send: 0.6 });
    }
  }

  function playHoly(s, t, d) {
    const bar = (s / 16) | 0;
    const pos = s % 16;
    const ci = ((bar / 2) | 0) % 4;
    const ch = H_CH[ci];
    const sec = (bar / 8) | 0;

    if (pos === 0 && bar % 2 === 0) {
      choir(t, ch.map(x => x + 12), d * 32, 0.042);
      pad(t, ch, d * 32, 0.045, { attack: 1.6, release: 2.6, cut: 1000, send: 0.6 });
      timpani(t, Math.max(31, ch[0] - 12), 0.42);
      bell(t, ch[0] + 24, 0.03, 4.5);
    }
    if (pos === 0 && bar % 2 === 1) timpani(t, Math.max(31, ch[0] - 12), 0.26);
    if (pos === 8 && bar % 2 === 1) timpani(t, Math.max(31, ch[0] - 7), 0.18);

    const map = sec % 2 === 1 ? H_MEL_B : H_MEL_A;
    const ev = map[(s - sec * 128) % 128];
    if (ev) for (const [n, len] of ev) {
      fiddle(t, n, len * d, 0.075);
      if (sec === 3) choir(t, [n - 12, n], len * d + d * 2, 0.012);
    }
  }

  /* ── 城邦裂变：里拉琴、奥洛斯管与战鼓（事变前 / 事变后） ── */

  function playWannan(s, t, d) {
    const bar = (s / 16) | 0;
    const pos = s % 16;
    const ci = bar % 4;
    const ch = W_CH[ci];
    const intro = bar < 4;
    const sec = bar < 12 ? 0 : bar < 20 ? 1 : bar < 28 ? 2 : 3;

    if (pos === 0 && bar % 2 === 0) {
      pad(t, ch, d * 30, 0.045, { attack: 1.4, release: 2.2, cut: 900, type: 'triangle', send: 0.55 });
      wind(t, d * 30, 0.016);
    }
    if (pos === 0) bass(t, ch[0] - 12, d * 3.4, 0.16);
    if (pos === 8) bass(t, ch[0] - 12, d * 3.0, 0.1);

    // 古希腊里拉琴：四音列分解
    if (pos % 4 === 0) {
      const idx = (pos / 4 + bar) % ch.length;
      pluck(t, ch[idx] + 12, 0.055, d * 2.2, { send: 0.55 });
      if (pos === 8) pluck(t, ch[(idx + 1) % ch.length] + 24, 0.025, d * 1.5, { send: 0.6 });
    }

    // 框鼓与响板
    if (pos === 0) timpani(t, Math.max(33, ch[0] - 12), 0.22);
    if (pos === 8 && bar % 2 === 1) timpani(t, Math.max(33, ch[0] - 12), 0.12);
    if (pos === 4 || pos === 12) rim(t, 0.028);
    if (!intro && (pos === 6 || pos === 14)) shaker(t, 0.016);

    if (intro && pos % 4 === 0) {
      const motif = [62, 65, 67, 69, 72, 69, 67, 65];
      pluck(t, motif[(bar * 4 + pos / 4) % motif.length], 0.05, d * 2, { send: 0.55 });
      if (bar === 0 && pos === 0) bell(t, 69, 0.045, 5);
    }

    if (sec < 3) {
      const map = sec === 1 ? W_MEL_B : W_MEL_A;
      const ev = map[(s - 64) % 128];
      if (ev) for (const [n, len] of ev) {
        aulos(t, n, len * d, 0.075);
        if (sec === 2) pluck(t, n + 12, 0.028, len * d, { send: 0.6 });
      }
      if (bar >= 8 && pos === 0) brass(t, ch[0] + 12, d * 2.2, 0.035);
      if (sec === 2 && pos === 0 && bar % 2 === 0) choir(t, ch.map(x => x + 12), d * 28, 0.016);
    } else {
      if (pos === 0) brass(t, ch[0] + 12, d * 3, 0.055);
      if (pos === 8) timpani(t, ch[0] - 12, 0.28);
      if (s === 448) bell(t, 69, 0.045, 5);
    }
  }

  function playWannan2(s, t, d) {
    const bar = (s / 6) | 0;
    const pos = s % 6;
    const sec = (bar / 8) | 0;
    const sb = bar % 8;
    const ci = (sb / 2) | 0;
    const ch = W3_CH[sec][ci];
    const root = ch[0] - 12;

    // 两小节里拉琴引子：只留低音与分解和弦，让主题进来时更亮
    if (sec === 0 && bar < 2) {
      if (pos === 0) {
        bass(t, root, d * 10, 0.11);
        pad(t, [50, 57, 62, 65], d * 12, 0.022, { attack: 1.6, release: 2.4, cut: 1200, type: 'triangle', send: 0.65 });
        bell(t, 86, 0.012, 4.5);
      }
      const pat = [62, 69, 74, 77, 74, 69];
      pluck(t, pat[pos] + (bar === 1 ? 12 : 0), pos === 0 ? 0.045 : 0.03, d * 1.6, { send: 0.7 });
      return;
    }

    if (pos === 0) {
      const second = sb % 2 === 1;
      bass(t, second ? root + 7 : root, d * (second ? 4 : 5), second ? 0.09 : 0.13);
      if (sb % 2 === 0) {
        pad(t, ch.map(n => n + 12), d * 12, sec === 4 ? 0.03 : 0.022, {
          attack: 0.8, release: 1.6, cut: sec >= 3 ? 2000 : 1500, type: 'sawtooth', send: 0.6
        });
      }
    }

    if (pos === 0 && sb % 2 === 0) timpani(t, root, sec === 4 ? 0.32 : sec === 3 ? 0.18 : 0.2);
    if (pos === 3 && sb % 2 === 1 && sec >= 1) timpani(t, root + 7, sec === 4 ? 0.14 : 0.09);
    if (sec === 4 && pos === 0 && sb % 2 === 1) taiko(t, 0.1, 40);
    if (pos === 5) shaker(t, sec === 3 ? 0.01 : 0.014);

    // 里拉琴分解：按段落改变密度，C 段收、D 段放
    if (sec === 0 || sec === 5) {
      if (pos === 0) pluck(t, ch[0] + 12, 0.04, d * 1.5, { send: 0.65 });
      if (pos === 3) pluck(t, ch[2] + 12, 0.03, d * 1.4, { send: 0.65 });
      if (pos === 5 && sb % 2 === 1) pluck(t, ch[3] + 24, 0.02, d * 1.3, { send: 0.7 });
    } else if (sec === 1 || sec === 2) {
      if (pos === 0) pluck(t, ch[0] + 12, 0.038, d * 1.5, { send: 0.65 });
      if (pos === 2) pluck(t, ch[1] + 12, 0.03, d * 1.4, { send: 0.65 });
      if (pos === 4) pluck(t, ch[2] + 24, 0.024, d * 1.4, { send: 0.7 });
      if (pos === 5 && sb % 2 === 0) pluck(t, ch[3] + 24, 0.018, d * 1.3, { send: 0.7 });
    } else if (sec === 3) {
      if (pos === 0) pluck(t, ch[0] + 12, 0.032, d * 1.5, { send: 0.65 });
      if (pos === 2 || pos === 4) pluck(t, ch[2] + 12, 0.022, d * 1.2, { send: 0.65 });
    } else {
      if (pos === 0) pluck(t, ch[0] + 12, 0.042, d * 1.5, { send: 0.65 });
      if (pos === 1 || pos === 4) pluck(t, ch[2] + 12, 0.03, d * 1.3, { send: 0.65 });
      if (pos === 2) pluck(t, ch[1] + 24, 0.026, d * 1.3, { send: 0.7 });
      if (pos === 5) pluck(t, ch[3] + 24, 0.02, d * 1.2, { send: 0.7 });
    }

    if (pos === 0 && sb % 4 === 0 && (sec === 1 || sec === 2 || sec === 4)) {
      choir(t, ch.map(n => n + 12), d * 12, sec === 4 ? 0.022 : 0.018);
    }
    if (sec === 4 && pos === 0 && sb % 2 === 0) {
      brass(t, ch[0] + 12, d * 5, 0.026);
      brass(t, ch[1] + 12, d * 5, 0.018);
    }
    if (pos === 0 && sb === 0 && sec > 0) bell(t, ch[3] + 24, 0.012, 3.2);

    const map = [W3_MEL_A, W3_MEL_B, W3_MEL_A2, W3_MEL_C, W3_MEL_D, W3_MEL_CODA][sec];
    const ev = map[(s - sec * 48) % 48];
    if (ev) for (const [n, len] of ev) {
      aulos(t, n, len * d, sec === 3 ? 0.075 : 0.09);
      if (len >= 4) bell(t, n + 12, 0.012, len * d * 1.2);
      if ((sec === 2 || sec === 4 || sec === 5) && len >= 3) {
        fiddle(t, n - 12, len * d, sec === 4 ? 0.022 : 0.014);
      }
      if (sec === 4 && len >= 6) brass(t, n - 12, len * d, 0.012);
    }
    if (sec === 5 && bar === 47 && pos === 3) bell(t, 86, 0.025, 5);
  }


  /* 蛇骨矿洞新版：D 小调，108 BPM，6/8，32 小节，音乐盒与洞穴回声 */
  const M2_CH = [[50, 53, 57, 62], [46, 50, 53, 58], [43, 46, 50, 55], [45, 48, 52, 57]];
  const M2_MEL_A = toMap([
    [0, 62, 2], [2, 65, 1], [3, 69, 1], [4, 67, 1], [5, 65, 1],
    [6, 62, 2], [8, 65, 1], [9, 69, 1], [10, 70, 1], [11, 69, 1],
    [12, 67, 1], [13, 65, 1], [14, 62, 1], [15, 60, 1], [16, 62, 1], [17, 64, 1],
    [18, 65, 2], [20, 69, 1], [21, 67, 1], [22, 65, 1], [23, 64, 1],
    [24, 69, 1], [25, 70, 1], [26, 69, 1], [27, 67, 1], [28, 65, 1], [29, 64, 1],
    [30, 62, 1], [31, 64, 1], [32, 65, 1], [33, 67, 1], [34, 69, 1], [35, 70, 1],
    [36, 69, 1], [37, 67, 1], [38, 65, 1], [39, 64, 1], [40, 62, 1], [41, 60, 1],
    [42, 62, 4]
  ]);
  const M2_MEL_B = toMap([
    [0, 77, 1], [1, 76, 1], [2, 74, 1], [3, 72, 1], [4, 74, 1], [5, 76, 1],
    [6, 77, 1], [8, 81, 1], [9, 79, 1], [10, 77, 1], [11, 76, 1],
    [12, 82, 1], [13, 81, 1], [14, 79, 1], [15, 77, 1], [16, 76, 1], [17, 74, 1],
    [18, 72, 1], [19, 74, 1], [20, 76, 1], [21, 77, 1], [22, 79, 1], [23, 81, 1],
    [24, 79, 1], [25, 77, 1], [26, 76, 1], [27, 74, 1], [28, 72, 1], [29, 70, 1],
    [30, 69, 1], [31, 70, 1], [32, 72, 1], [33, 74, 1], [34, 76, 1], [35, 77, 1],
    [36, 79, 1], [37, 77, 1], [38, 76, 1], [39, 74, 1], [40, 72, 1], [41, 69, 1],
    [42, 74, 4]
  ]);
  const M2_MEL_C = toMap([
    [0, 74, 1], [1, 77, 1], [2, 81, 1], [3, 86, 1], [4, 84, 1], [5, 82, 1],
    [6, 81, 1], [7, 79, 1], [8, 77, 1], [9, 76, 1], [10, 74, 1], [11, 72, 1],
    [12, 74, 1], [13, 77, 1], [14, 81, 1], [15, 82, 1], [16, 81, 1], [17, 79, 1],
    [18, 77, 1], [19, 76, 1], [20, 74, 1], [21, 72, 1], [22, 74, 1], [23, 76, 1],
    [24, 77, 1], [25, 81, 1], [26, 79, 1], [27, 77, 1], [28, 76, 1], [29, 74, 1],
    [30, 81, 1], [31, 82, 1], [32, 81, 1], [33, 79, 1], [34, 77, 1], [35, 76, 1],
    [36, 74, 1], [37, 76, 1], [38, 77, 1], [39, 79, 1], [40, 81, 1], [41, 82, 1],
    [42, 74, 4]
  ]);



  function playMine(s, t, d) {
    const bar = (s / 6) | 0;
    const pos = s % 6;
    const ci = ((bar / 2) | 0) % 4;
    const ch = M2_CH[ci];
    const sec = (bar / 8) | 0;

    if (pos === 0) {
      bass(t, ch[0] - 12, d * 4, 0.17);
      taiko(t, bar % 2 === 0 ? 0.14 : 0.09, 38);
    }
    if (pos === 3) {
      rim(t, 0.03);
      bass(t, ch[0] - 5, d * 2, 0.08);
    }
    if (pos === 5) shaker(t, 0.018);
    if (pos === 0 && bar % 4 === 0) {
      pad(t, ch.map(n => n - 12), d * 24, 0.045, { attack: 3, release: 4, cut: 480, type: 'sawtooth', send: 0.6 });
      wind(t, d * 24, 0.022);
    }
    if (pos === 0 || pos === 3) pluck(t, ch[(pos / 3 + bar) % ch.length] + 12, 0.025, d * 1.3, { send: 0.6 });
    if (pos === 0) bell(t, ch[3] + 24, 0.022, 3.5);
    if (pos === 4) bell(t, ch[3] + 36, 0.01, 2.2);
    if (pos === 2 && bar % 4 === 2) bell(t, ch[3] + 31, 0.012, 2.5);
    if (sec === 1 && pos === 0 && bar % 2 === 0) choir(t, ch.map(n => n + 12), d * 12, 0.018);

    const map = sec === 1 ? M2_MEL_B : sec === 3 ? M2_MEL_C : M2_MEL_A;
    const ev = map[(s - sec * 48) % 48];
    if (ev) for (const [n, len] of ev) {
      pluck(t, n, 0.08, len * d, { send: 0.65 });
      bell(t, n + 12, 0.016, Math.min(2.2, len * d * 1.4));
      if (sec >= 2 && len >= 2) aulos(t, n - 12, len * d, 0.02);
    }
  }


  /* ── 蠕潮蚀野：深海潮眼、淹没的城邦与缓慢的潮汐脉搏 ─────── */

  const T_CH = [
    [45, 48, 52, 57],
    [41, 45, 48, 53],
    [38, 41, 45, 50],
    [40, 44, 47, 52]
  ];
  const T_MEL_A = toMap([
    [0, 69, 4], [6, 72, 3], [10, 74, 4], [16, 72, 2], [20, 69, 5],
    [28, 67, 3], [32, 65, 4], [38, 67, 2], [40, 69, 5],
    [48, 72, 3], [52, 74, 3], [56, 76, 5], [64, 74, 2], [68, 72, 4], [74, 69, 4],
    [80, 67, 3], [84, 65, 3], [88, 64, 4], [94, 65, 3], [96, 67, 5],
    [104, 69, 3], [108, 72, 3], [112, 74, 4], [118, 72, 3], [120, 69, 6],
    [126, 67, 2]
  ]);
  const T_MEL_B = toMap([
    [0, 76, 4], [6, 74, 2], [8, 72, 5], [16, 69, 3], [20, 72, 3], [24, 74, 5],
    [32, 76, 3], [36, 77, 3], [40, 79, 5], [48, 77, 2], [52, 76, 3], [56, 74, 5],
    [64, 72, 3], [68, 74, 3], [72, 76, 5], [80, 77, 3], [84, 76, 2], [88, 74, 5],
    [96, 72, 3], [100, 69, 3], [104, 67, 3], [108, 69, 3], [112, 72, 5], [120, 74, 3], [124, 76, 3]
  ]);

  function playTide(s, t, d) {
    const bar = (s / 16) | 0;
    const pos = s % 16;
    const ch = T_CH[((bar / 2) | 0) % 4];
    const sec = (bar / 8) | 0;

    // 潮汐深呼吸：每两小节一次的暗色和声
    if (pos === 0 && bar % 2 === 0) {
      pad(t, ch.map(n => n - 12), d * 32, 0.05, { attack: 3.2, release: 4.2, cut: 460, type: 'sawtooth', send: 0.65 });
      bass(t, ch[0] - 12, d * 30, 0.17);
      wind(t, d * 32, 0.028);
    }
    if (pos === 0) timpani(t, Math.max(30, ch[0] - 12), 0.2);

    // 潮眼的心跳：缓慢、偏移的重音
    if (pos === 0) taiko(t, 0.24, 36);
    if (pos === 6 && bar % 4 === 2) taiko(t, 0.12, 38);
    if (pos === 10 && bar % 4 === 1) taiko(t, 0.08, 34);

    // 水滴与潮泡
    if (pos === 3 || pos === 11) bell(t, ch[3] + 24, 0.022, 2.2);
    if (pos === 7 || pos === 13) pluck(t, ch[2] + 24, 0.032, d * 1.6, { send: 0.75 });
    if (pos % 4 === 2) shaker(t, 0.012);

    // 水下合唱：每八小节涌起一次
    if (pos === 0 && bar % 8 === 0) {
      choir(t, ch.map(n => n + 12), d * 60, 0.018);
    }

    const map = sec % 2 === 1 ? T_MEL_B : T_MEL_A;
    const ev = map[(s - sec * 128) % 128];
    if (ev) for (const [n, len] of ev) {
      pluck(t, n, 0.045, len * d, { send: 0.7 });
      if (sec >= 2) aulos(t, n - 12, len * d, 0.028);
    }

    if (s === 0) bell(t, 81, 0.04, 6);
    if (s === 256) bell(t, 77, 0.035, 6);
    if (s === 448) bell(t, 74, 0.03, 5);
  }

  /* 烽燧阵线：边塞大鼓、笙与古筝拨弦，五声音阶苍凉主题。 */
  const BT_CH = [[50, 57, 62, 69], [48, 55, 60, 67], [45, 52, 57, 64], [43, 50, 55, 62]];
  const BT_MEL_A = toMap([
    [0, 74, 2], [2, 77, 2], [4, 79, 2], [6, 81, 3], [10, 79, 2], [12, 77, 2], [14, 74, 2],
    [16, 72, 2], [18, 74, 2], [20, 77, 2], [22, 79, 2], [24, 81, 4], [28, 79, 2], [30, 77, 2]
  ]);
  const BT_MEL_B = toMap([
    [0, 79, 2], [2, 81, 2], [4, 84, 3], [8, 81, 2], [10, 79, 2], [12, 77, 2],
    [16, 74, 2], [18, 77, 2], [20, 79, 2], [22, 81, 2], [24, 79, 4], [28, 74, 4]
  ]);

  function playBeacon(s, t, d) {
    const bar = (s / 16) | 0;
    const pos = s % 16;
    const ch = BT_CH[((bar / 4) | 0) % 4];
    const sec = (bar / 8) | 0;

    if (pos === 0 && bar % 2 === 0) {
      pad(t, ch.map(n => n - 12), d * 30, 0.045, { attack: 2.6, release: 3.8, cut: 620, type: 'sawtooth', send: 0.6 });
      bass(t, ch[0] - 12, d * 28, 0.16);
      wind(t, d * 30, 0.012);
    }
    if (pos === 0) taiko(t, 0.3, 40);
    if (pos === 6) taiko(t, 0.13, 46);
    if (pos === 8) taiko(t, 0.2, 43);
    if (pos === 12 && bar % 2 === 0) taiko(t, 0.1, 48);
    if (pos === 0) timpani(t, Math.max(31, ch[0] - 12), 0.2);

    if (pos === 2 || pos === 10) pluck(t, ch[2] + 12, 0.03, d * 2.2, { send: 0.7 });
    if (pos === 5 || pos === 13) bell(t, ch[3] + 12, 0.016, 2.4);
    if (pos === 0 && bar % 8 === 0) {
      brass(t, ch[0] + 12, d * 10, 0.026);
      brass(t, ch[2] + 12, d * 10, 0.022);
      bell(t, ch[0] + 36, 0.03, 5);
    }

    const map = sec % 2 === 1 ? BT_MEL_B : BT_MEL_A;
    const ev = map[s % 32];
    if (ev) for (const [n, len] of ev) {
      pluck(t, n, 0.052, len * d, { send: 0.72 });
      aulos(t, n - 12, len * d, 0.024);
      if (len >= 3) bell(t, n + 12, 0.01, 2.6);
    }
  }

  /* 霓虹纪元：8 小节和声 × 4 段旋律，32 小节内不重复同一乐句。 */
  const NEON_CH = [
    [45, 52, 57, 64], [45, 52, 57, 64],
    [41, 48, 53, 60], [41, 48, 53, 60],
    [43, 50, 55, 62], [43, 50, 55, 62],
    [38, 45, 50, 57], [40, 47, 52, 59]
  ];
  const NEON_MEL_A = toMap([
    [0, 76, 2], [2, 79, 2], [4, 81, 2], [6, 84, 4], [10, 83, 2], [12, 81, 2], [14, 79, 2],
    [16, 79, 2], [18, 76, 2], [20, 74, 2], [22, 76, 4], [26, 74, 2], [28, 72, 2], [30, 69, 2],
    [32, 77, 2], [34, 81, 2], [36, 84, 2], [38, 86, 4], [42, 84, 2], [44, 81, 2], [46, 79, 2],
    [48, 79, 2], [50, 77, 2], [52, 76, 4], [56, 74, 4], [60, 72, 2], [62, 74, 2],
    [64, 74, 2], [66, 79, 2], [68, 83, 2], [70, 86, 4], [74, 84, 2], [76, 83, 2], [78, 81, 2],
    [80, 81, 2], [82, 79, 2], [84, 77, 2], [86, 76, 4], [90, 74, 2], [92, 72, 2], [94, 74, 2],
    [96, 77, 4], [100, 76, 2], [102, 74, 2], [104, 69, 4], [108, 72, 2], [110, 74, 2],
    [112, 74, 2], [114, 76, 2], [116, 77, 2], [118, 76, 2], [120, 74, 6]
  ]);
  const NEON_MEL_B = toMap([
    [0, 81, 2], [2, 84, 2], [4, 88, 4], [8, 86, 2], [10, 84, 2], [12, 83, 2], [14, 81, 2],
    [16, 79, 2], [18, 81, 2], [20, 83, 4], [24, 81, 4], [28, 79, 2], [30, 76, 2],
    [32, 77, 2], [34, 79, 2], [36, 81, 2], [38, 84, 4], [42, 83, 2], [44, 81, 2], [46, 79, 2],
    [48, 79, 4], [52, 77, 2], [54, 76, 2], [56, 74, 6], [62, 72, 2],
    [64, 74, 2], [66, 76, 2], [68, 79, 2], [70, 81, 4], [74, 83, 2], [76, 86, 2],
    [80, 84, 4], [84, 83, 2], [86, 81, 2], [88, 79, 4], [92, 76, 2], [94, 79, 2],
    [96, 77, 2], [98, 81, 2], [100, 86, 4], [104, 84, 2], [106, 81, 2], [108, 77, 2], [110, 74, 2],
    [112, 76, 2], [114, 77, 2], [116, 76, 2], [118, 74, 2], [120, 76, 6]
  ]);
  const NEON_MEL_C = toMap([
    [0, 69, 4], [4, 72, 2], [6, 76, 2], [8, 74, 4], [12, 72, 4],
    [16, 71, 4], [20, 67, 4], [24, 64, 8],
    [32, 65, 4], [36, 69, 2], [38, 72, 2], [40, 74, 4], [44, 72, 4],
    [48, 71, 4], [52, 67, 4], [56, 62, 8],
    [64, 67, 4], [68, 71, 2], [70, 74, 2], [72, 76, 4], [76, 74, 4],
    [80, 72, 4], [84, 71, 4], [88, 69, 8],
    [96, 74, 4], [100, 72, 2], [102, 69, 2], [104, 65, 4], [108, 69, 4],
    [112, 64, 4], [116, 67, 4], [120, 69, 8]
  ]);
  const NEON_MEL_D = toMap([
    [0, 76, 2], [2, 81, 2], [4, 84, 4], [8, 83, 2], [10, 81, 2], [12, 79, 4],
    [16, 81, 4], [20, 83, 2], [22, 84, 2], [24, 86, 4], [28, 88, 4],
    [32, 86, 2], [34, 84, 2], [36, 81, 2], [38, 77, 4], [42, 81, 2], [44, 84, 2],
    [48, 83, 4], [52, 79, 4], [56, 76, 8],
    [64, 74, 2], [66, 79, 2], [68, 83, 4], [72, 86, 2], [74, 84, 2], [76, 83, 2], [78, 81, 2],
    [80, 79, 4], [84, 77, 2], [86, 76, 2], [88, 74, 8],
    [96, 77, 2], [98, 76, 2], [100, 74, 2], [102, 72, 2], [104, 69, 4], [108, 74, 4],
    [112, 76, 2], [114, 77, 2], [116, 79, 2], [118, 81, 2], [120, 74, 8]
  ]);
  const NEON_SECTIONS = [NEON_MEL_A, NEON_MEL_B, NEON_MEL_C, NEON_MEL_D];

  function playNeon(s, t, d) {
    const bar = (s / 16) | 0;
    const pos = s % 16;
    const ch = NEON_CH[bar % 8];
    const sec = (bar >> 3) % 4;
    const phrase = NEON_SECTIONS[sec];

    if (pos === 0) {
      pad(t, ch.map(n => n + 12), d * 15, 0.034, { attack: 0.45, release: 1.7, cut: sec === 2 ? 1900 : 2600, type: 'sawtooth', send: 0.55 });
      bass(t, ch[0] - 12, d * 14, 0.12);
    }
    if (pos % 4 === 0) bass(t, ch[0] - 12, d * 3, 0.10);
    if (pos === 3 || pos === 11) bass(t, ch[2] - 12, d * 1.5, 0.07);
    if (pos === 0 || pos === 8) taiko(t, 0.15, 38);
    if (pos === 6 || pos === 14) snare(t, 0.045);
    if (pos % 2 === 0) shaker(t, pos % 4 === 2 ? 0.026 : 0.016);
    if (pos === 0 || pos === 4 || pos === 8 || pos === 12) bell(t, ch[2] + 24, 0.01, 1.2);

    const arp = [0, 2, 1, 3, 2, 1, 3, 2];
    if (pos % 2 === 1) pluck(t, ch[arp[(pos >> 1) % 8]] + 24, 0.028, d * 1.4, { send: 0.65 });

    const ev = phrase[s % 128];
    if (ev) for (const [n, len] of ev) {
      if (sec === 2) {
        pluck(t, n, 0.05, len * d, { send: 0.7 });
        if (len >= 4) bell(t, n + 12, 0.012, 2.6);
      } else {
        brass(t, n, len * d, sec === 3 ? 0.042 : 0.036);
        if (sec === 3) aulos(t, n - 12, len * d, 0.02);
        if (len >= 3) bell(t, n + 12, 0.012, 2.4);
      }
    }
  }

  /* ── 模式结束曲：每局结束时短促收束，只播放一次 ─────────── */

  const E_BATTLE_CH = [[48, 52, 55, 60], [55, 59, 62, 67]];
  const E_BATTLE_MEL = toMap([
    [0, 72, 2], [2, 76, 2], [4, 79, 2], [6, 84, 3], [10, 83, 2], [12, 79, 2], [14, 76, 2],
    [16, 74, 2], [18, 79, 2], [20, 83, 2], [22, 86, 2], [24, 84, 2], [26, 81, 2], [28, 79, 4]
  ]);

  function playEndBattle(s, t, d) {
    const bar = (s / 16) | 0;
    const pos = s % 16;
    const ch = E_BATTLE_CH[bar];

    if (pos === 0) {
      pad(t, ch.map(n => n + 12), d * 16, 0.022, { attack: 0.18, release: 0.9, cut: 2600, send: 0.45 });
      bass(t, ch[0] - 12, d * 15, 0.15);
      for (const n of ch) pluck(t, n + 12, 0.032, d * 1.4, { send: 0.45 });
      taiko(t, 0.3, 46);
      timpani(t, ch[0] - 12, 0.3);
    }
    if (pos === 8) taiko(t, 0.16, 48);
    if (pos === 4 || pos === 12) snare(t, 0.03);
    if (bar === 1 && pos >= 8) snare(t, 0.03 + (pos - 8) * 0.005);

    if (bar === 1 && pos === 12) {
      for (const n of E_BATTLE_CH[0]) brass(t, n + 12, d * 4, 0.075);
      bell(t, 84, 0.035, 4);
      timpani(t, 36, 0.45);
      taiko(t, 0.35, 46);
    }
    if (bar === 1 && pos === 14) bell(t, 96, 0.012, 3);

    const ev = E_BATTLE_MEL[s];
    if (ev) for (const [n, len] of ev) brass(t, n, len * d, 0.065);
  }

  const E_SNOW_CH = [[53, 57, 60, 65], [48, 52, 55, 60]];
  const E_SNOW_MEL = toMap([
    [0, 77, 2], [2, 81, 2], [4, 84, 2], [6, 89, 3], [10, 88, 2], [12, 84, 2], [14, 81, 2],
    [16, 79, 2], [18, 81, 2], [20, 84, 2], [22, 86, 2], [24, 89, 4], [28, 84, 4]
  ]);

  function playEndSnow(s, t, d) {
    const bar = (s / 16) | 0;
    const pos = s % 16;
    const ch = E_SNOW_CH[bar];

    if (pos === 0) {
      pad(t, ch.map(n => n + 12), d * 16, 0.024, { attack: 0.25, release: 1.2, cut: 3000, send: 0.55 });
      bass(t, ch[0] - 12, d * 15, 0.12);
      for (const n of ch) pluck(t, n + 12, 0.026, d * 1.3, { send: 0.55 });
    }
    if (pos % 4 === 2) shaker(t, 0.018);

    if (bar === 1 && pos === 12) {
      for (const n of E_SNOW_CH[0]) pluck(t, n + 12, 0.07, d * 4, { send: 0.6 });
      bell(t, 89, 0.032, 4);
      bell(t, 96, 0.012, 3);
    }

    const ev = E_SNOW_MEL[s];
    if (ev) for (const [n, len] of ev) {
      pluck(t, n, 0.072, len * d, { send: 0.55 });
      if (len >= 3) bell(t, n + 12, 0.018, 2.2);
    }
  }

  const E_CITY_CH = [[50, 54, 57, 62], [45, 49, 52, 57]];
  const E_CITY_MEL = toMap([
    [0, 74, 2], [2, 78, 2], [4, 81, 2], [6, 86, 3], [10, 85, 2], [12, 81, 2], [14, 78, 2],
    [16, 79, 2], [18, 81, 2], [20, 83, 2], [22, 86, 2], [24, 88, 2], [26, 86, 2], [28, 81, 4]
  ]);

  function playEndCity(s, t, d) {
    const bar = (s / 16) | 0;
    const pos = s % 16;
    const ch = E_CITY_CH[bar];

    if (pos === 0) {
      pad(t, ch.map(n => n + 12), d * 16, 0.022, { attack: 0.2, release: 1.0, cut: 2200, send: 0.5 });
      bass(t, ch[0] - 12, d * 15, 0.13);
      timpani(t, ch[0] - 12, 0.28);
    }
    if (pos === 0 || pos === 4 || pos === 8 || pos === 12) rim(t, 0.026);
    if (pos % 2 === 0) {
      const idx = (pos / 2 + bar) % ch.length;
      pluck(t, ch[idx] + 12, 0.03, d * 1.2, { send: 0.5 });
    }

    if (bar === 1 && pos === 12) {
      for (const n of E_CITY_CH[0]) pluck(t, n + 12, 0.06, d * 4, { send: 0.6 });
      bell(t, 86, 0.032, 4);
      timpani(t, 38, 0.38);
      rim(t, 0.04);
    }

    const ev = E_CITY_MEL[s];
    if (ev) for (const [n, len] of ev) aulos(t, n, len * d, 0.08);
  }

  const E_PIRATE_CH = [[55, 59, 62, 67], [50, 54, 57, 62]];
  const E_PIRATE_MEL = toMap([
    [0, 79, 1], [1, 83, 1], [2, 86, 1], [3, 91, 1], [4, 88, 1], [5, 86, 1],
    [6, 84, 1], [7, 88, 1], [8, 91, 1], [9, 93, 1], [10, 91, 2]
  ]);

  function playEndPirate(s, t, d) {
    const bar = (s / 6) | 0;
    const pos = s % 6;
    const ch = E_PIRATE_CH[bar];

    if (pos === 0) {
      bass(t, ch[0] - 12, d * 5, 0.16);
      timpani(t, ch[0] - 12, 0.24);
      for (const n of ch) pluck(t, n + 12, 0.03, d * 2, { send: 0.55 });
    }
    if (pos === 3) taiko(t, 0.2, 56);
    if (pos === 1 || pos === 3 || pos === 5) shaker(t, 0.024);

    if (bar === 1 && pos === 4) {
      for (const n of E_PIRATE_CH[0]) brass(t, n + 12, d * 2, 0.06);
      bell(t, 91, 0.03, 3.5);
      timpani(t, 43, 0.35);
      taiko(t, 0.28, 56);
    }

    const ev = E_PIRATE_MEL[s];
    if (ev) for (const [n, len] of ev) fiddle(t, n, len * d, 0.08);
  }

  const E_FOG_CH = [[45, 49, 52, 57], [52, 56, 59, 64]];
  const E_FOG_MEL = toMap([
    [0, 76, 2], [2, 81, 2], [4, 85, 2], [6, 88, 3], [10, 86, 2], [12, 81, 2], [14, 76, 2],
    [16, 78, 2], [18, 81, 2], [20, 85, 2], [22, 88, 2], [24, 90, 2], [26, 88, 2], [28, 81, 4]
  ]);

  function playEndFog(s, t, d) {
    const bar = (s / 16) | 0;
    const pos = s % 16;
    const ch = E_FOG_CH[bar];

    if (pos === 0) {
      pad(t, ch.map(n => n + 12), d * 16, 0.026, { attack: 0.3, release: 1.4, cut: 3000, type: 'triangle', send: 0.55 });
      bass(t, ch[0] - 12, d * 15, 0.12);
    }
    if (pos === 0 || pos === 4 || pos === 8 || pos === 12) rim(t, 0.02);
    if (pos === 2 || pos === 6 || pos === 10 || pos === 14) shaker(t, 0.014);

    if (bar === 1 && pos === 12) {
      for (const n of E_FOG_CH[0]) pluck(t, n + 12, 0.05, d * 4, { send: 0.65 });
      choir(t, E_FOG_CH[0].map(n => n + 12), d * 8, 0.02);
      bell(t, 81, 0.035, 4);
      bell(t, 93, 0.018, 4);
    }

    const ev = E_FOG_MEL[s];
    if (ev) for (const [n, len] of ev) {
      bell(t, n, 0.042, Math.min(2.8, len * d * 1.5));
      pluck(t, n, 0.035, len * d, { send: 0.6 });
    }
  }

  const E_HOLY_CH = [[46, 50, 53, 58], [53, 57, 60, 65]];
  const E_HOLY_MEL = toMap([
    [0, 70, 2], [2, 74, 2], [4, 77, 2], [6, 82, 3], [10, 81, 2], [12, 77, 2], [14, 74, 2],
    [16, 75, 2], [18, 77, 2], [20, 81, 2], [22, 84, 2], [24, 86, 2], [26, 84, 2], [28, 77, 4]
  ]);

  function playEndHoly(s, t, d) {
    const bar = (s / 16) | 0;
    const pos = s % 16;
    const ch = E_HOLY_CH[bar];

    if (pos === 0) {
      choir(t, ch.map(n => n + 12), d * 16, 0.028);
      pad(t, ch.map(n => n + 12), d * 16, 0.02, { attack: 0.3, release: 1.2, cut: 2000, send: 0.6 });
      bass(t, ch[0] - 12, d * 15, 0.12);
      timpani(t, ch[0] - 12, 0.28);
      bell(t, ch[3] + 24, 0.022, 3.5);
    }

    if (bar === 1 && pos === 12) {
      for (const n of E_HOLY_CH[0]) brass(t, n + 12, d * 4, 0.07);
      choir(t, E_HOLY_CH[0].map(n => n + 12), d * 8, 0.03);
      bell(t, 82, 0.035, 4);
      timpani(t, 34, 0.42);
    }
    if (bar === 1 && pos === 14) bell(t, 94, 0.012, 3);

    const ev = E_HOLY_MEL[s];
    if (ev) for (const [n, len] of ev) fiddle(t, n, len * d, 0.068);
  }

  const E_MINE_CH = [[51, 55, 58, 63], [46, 50, 53, 58]];
  const E_MINE_MEL = toMap([
    [0, 75, 2], [2, 79, 2], [4, 82, 2], [6, 87, 3], [10, 86, 2], [12, 82, 2], [14, 79, 2],
    [16, 77, 2], [18, 79, 2], [20, 82, 2], [22, 86, 2], [24, 87, 4], [28, 82, 4]
  ]);

  function playEndMine(s, t, d) {
    const bar = (s / 16) | 0;
    const pos = s % 16;
    const ch = E_MINE_CH[bar];

    if (pos === 0) {
      pad(t, ch, d * 16, 0.022, { attack: 0.22, release: 1.0, cut: 1700, send: 0.55 });
      bass(t, ch[0] - 12, d * 15, 0.14);
      taiko(t, bar === 0 ? 0.24 : 0.18, 38);
      bell(t, ch[3] + 24, 0.022, 3.5);
    }
    if (pos === 8) taiko(t, 0.14, 38);

    if (bar === 1 && pos === 12) {
      for (const n of E_MINE_CH[0]) pluck(t, n + 12, 0.06, d * 4, { send: 0.6 });
      bell(t, 87, 0.032, 4);
      timpani(t, 39, 0.38);
      taiko(t, 0.3, 38);
    }

    const ev = E_MINE_MEL[s];
    if (ev) for (const [n, len] of ev) {
      pluck(t, n, 0.072, len * d, { send: 0.6 });
      if (len >= 3) pluck(t, n + 12, 0.025, len * d, { send: 0.65 });
    }
  }

  const E_TIDE_CH = [[52, 56, 59, 64], [47, 51, 54, 59]];
  const E_TIDE_MEL = toMap([
    [0, 76, 2], [2, 80, 2], [4, 83, 2], [6, 88, 3], [10, 84, 2], [12, 83, 2], [14, 80, 2],
    [16, 81, 2], [18, 83, 2], [20, 84, 2], [22, 88, 2], [24, 90, 2], [26, 88, 2], [28, 83, 4]
  ]);

  function playEndTide(s, t, d) {
    const bar = (s / 16) | 0;
    const pos = s % 16;
    const ch = E_TIDE_CH[bar];

    if (pos === 0) {
      pad(t, ch, d * 16, 0.024, { attack: 0.28, release: 1.2, cut: 1300, send: 0.55 });
      bass(t, ch[0] - 12, d * 15, 0.14);
      taiko(t, bar === 0 ? 0.22 : 0.16, 36);
      timpani(t, ch[0] - 12, 0.24);
    }
    if (pos === 2 || pos === 6 || pos === 10 || pos === 14) {
      bell(t, ch[(pos / 2) % 4] + 24, 0.016, 2);
    }

    if (bar === 1 && pos === 12) {
      for (const n of E_TIDE_CH[0]) pluck(t, n + 12, 0.055, d * 4, { send: 0.65 });
      choir(t, E_TIDE_CH[0].map(n => n + 12), d * 8, 0.018);
      bell(t, 88, 0.032, 4);
      timpani(t, 40, 0.38);
      taiko(t, 0.28, 36);
    }

    const ev = E_TIDE_MEL[s];
    if (ev) for (const [n, len] of ev) {
      aulos(t, n, len * d, 0.075);
      if (len >= 3) bell(t, n + 12, 0.012, 2.2);
    }
  }

  const E_BEACON_CH = [[50, 57, 62, 69], [43, 50, 55, 62]];
  const E_BEACON_MEL = toMap([
    [0, 74, 2], [2, 77, 2], [4, 81, 2], [6, 86, 3], [10, 84, 2], [12, 81, 2], [14, 77, 2],
    [16, 79, 2], [18, 81, 2], [20, 84, 2], [22, 86, 2], [24, 89, 4], [28, 81, 4]
  ]);

  function playEndBeacon(s, t, d) {
    const bar = (s / 16) | 0;
    const pos = s % 16;
    const ch = E_BEACON_CH[bar];

    if (pos === 0) {
      pad(t, ch.map(n => n + 12), d * 16, 0.02, { attack: 0.22, release: 1.1, cut: 2200, send: 0.5 });
      bass(t, ch[0] - 12, d * 15, 0.15);
      for (const n of ch) pluck(t, n + 12, 0.03, d * 1.5, { send: 0.6 });
      taiko(t, 0.34, 40);
      timpani(t, ch[0] - 12, 0.3);
    }
    if (pos === 6) taiko(t, 0.14, 45);
    if (pos === 8) taiko(t, 0.2, 42);
    if (pos === 4 || pos === 12) bell(t, ch[2] + 24, 0.012, 2.2);

    if (bar === 1 && pos === 12) {
      for (const n of E_BEACON_CH[0]) brass(t, n + 12, d * 4, 0.07);
      bell(t, 86, 0.035, 4);
      timpani(t, 31, 0.45);
      taiko(t, 0.36, 40);
    }

    const ev = E_BEACON_MEL[s];
    if (ev) for (const [n, len] of ev) aulos(t, n, len * d, 0.07);
  }

  const E_NEON_CH = [[45, 52, 57, 64], [40, 47, 52, 59]];
  const E_NEON_MEL = toMap([
    [0, 81, 2], [2, 84, 2], [4, 88, 4], [8, 86, 2], [10, 84, 2], [12, 83, 4],
    [16, 84, 2], [18, 83, 2], [20, 81, 2], [22, 79, 2], [24, 81, 8]
  ]);

  function playEndNeon(s, t, d) {
    const bar = (s / 16) | 0;
    const pos = s % 16;
    const ch = E_NEON_CH[bar];

    if (pos === 0) {
      pad(t, ch.map(n => n + 12), d * 16, 0.03, { attack: 0.14, release: 1.4, cut: 3200, type: 'sawtooth', send: 0.55 });
      bass(t, ch[0] - 12, d * 15, 0.15);
      for (const n of ch) bell(t, n + 24, 0.018, d * 2.2);
      taiko(t, 0.26, 36);
    }
    if (pos % 2 === 0) shaker(t, 0.016);
    if (pos === 8 || pos === 14) snare(t, 0.045);
    if (pos === 4 || pos === 12) taiko(t, 0.16, 44);

    if (bar === 1 && pos === 12) {
      for (const n of E_NEON_CH[0]) brass(t, n + 12, d * 4, 0.075);
      bell(t, 88, 0.032, 4);
      bell(t, 95, 0.016, 3);
      taiko(t, 0.34, 36);
      timpani(t, 33, 0.4);
    }

    const ev = E_NEON_MEL[s];
    if (ev) for (const [n, len] of ev) {
      brass(t, n, len * d, 0.06);
      bell(t, n + 12, 0.02, len * d + 0.5);
      aulos(t, n - 12, len * d, 0.026);
    }
  }

  /* ── 曲目表 ─────────────────────────────────────────────── */

function failGlitch(t, gain, pan) {
  const n = ctx.createBufferSource();
  n.buffer = noiseBuf;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(1900, t);
  bp.frequency.exponentialRampToValueAtTime(190, t + 0.18);
  bp.Q.value = 3.2;
  const env = ctx.createGain();
  env.gain.setValueAtTime(gain, t);
  env.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  const p = ctx.createStereoPanner();
  p.pan.value = pan || 0;
  n.connect(bp); bp.connect(env); env.connect(p);
  out(p, 0.22);
  n.start(t); n.stop(t + 0.22);
}

// 失败曲专用：断电式下行扫频
function failSweep(t, m1, m2, dur, gain) {
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(f(m1), t);
  osc.frequency.exponentialRampToValueAtTime(f(m2), t + dur);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(2200, t);
  lp.frequency.exponentialRampToValueAtTime(240, t + dur);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.linearRampToValueAtTime(gain, t + 0.03);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(lp); lp.connect(env);
  out(env, 0.4);
  osc.start(t); osc.stop(t + dur + 0.08);
}


/* ── 失败曲：每模式四小节，下行旋律 + 未解决终止，只播放一次 ── */

const F_BATTLE_CH = [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52]];
const F_BATTLE_MEL = toMap([
  [0, 74, 4], [4, 72, 2], [6, 70, 2], [8, 69, 4], [12, 65, 4],
  [16, 64, 4], [20, 62, 4], [24, 60, 4], [28, 62, 4],
  [32, 70, 4], [36, 69, 2], [38, 67, 2], [40, 65, 4], [44, 64, 4],
  [48, 62, 8], [56, 61, 2], [58, 62, 6]
]);

function playFailBattle(s, t, d) {
  const bar = (s / 16) | 0;
  const pos = s % 16;
  const ch = F_BATTLE_CH[bar];

  if (pos === 0) {
    pad(t, ch.map(n => n + 12), d * 16, 0.017, { attack: 0.45, release: 1.3, cut: 1500, type: 'sawtooth', send: 0.5 });
    bass(t, ch[0] - 12, d * 15, 0.14);
    for (const n of ch) pluck(t, n + 12, 0.022, d * 1.5, { send: 0.45 });
    if (bar === 0 || bar === 2) {
      timpani(t, ch[0] - 12, 0.24);
      taiko(t, 0.15, 42);
    }
  }
  if (pos === 4 || pos === 12) snare(t, 0.018);
  if (bar === 3 && pos % 2 === 0) snare(t, 0.013 + pos * 0.0012);
  if (bar === 3 && pos === 0) brass(t, 45, d * 8, 0.04);
  if (bar === 3 && pos === 14) {
    timpani(t, 38, 0.3);
    taiko(t, 0.22, 40);
  }

  const ev = F_BATTLE_MEL[s];
  if (ev) for (const [n, len] of ev) brass(t, n, len * d, 0.058);
}

const F_SNOW_CH = [[53, 56, 60], [49, 53, 56], [44, 48, 51], [48, 52, 55]];
const F_SNOW_MEL = toMap([
  [0, 84, 4], [4, 80, 4], [8, 77, 8],
  [16, 75, 4], [20, 73, 4], [24, 72, 8],
  [32, 80, 4], [36, 77, 4], [40, 75, 8],
  [48, 73, 4], [52, 72, 4], [56, 65, 8]
]);

function playFailSnow(s, t, d) {
  const bar = (s / 16) | 0;
  const pos = s % 16;
  const ch = F_SNOW_CH[bar];

  if (s === 0) wind(t, d * 64, 0.045, -0.35);
  if (pos === 0) {
    pad(t, ch.map(n => n + 12), d * 16, 0.016, { attack: 0.6, release: 1.6, cut: 2300, type: 'triangle', send: 0.6 });
    bass(t, ch[0] - 12, d * 15, 0.1);
  }
  if (pos % 4 === 2) shaker(t, 0.009);
  if (bar === 3 && pos === 12) bell(t, 65, 0.02, 5);

  const ev = F_SNOW_MEL[s];
  if (ev) for (const [n, len] of ev) {
    bell(t, n, 0.032, Math.min(4.5, len * d * 2.2));
    pluck(t, n, 0.035, len * d, { send: 0.6 });
  }
}

const F_CITY_CH = [[50, 53, 57], [51, 55, 58], [46, 50, 53], [50, 53, 57, 63]];
const F_CITY_MEL = toMap([
  [0, 74, 4], [4, 72, 2], [6, 70, 2], [8, 69, 4], [12, 67, 4],
  [16, 65, 4], [20, 63, 4], [24, 62, 4], [28, 60, 4],
  [32, 69, 4], [36, 67, 2], [38, 65, 2], [40, 63, 4], [44, 62, 4],
  [48, 63, 8], [56, 62, 8]
]);

function playFailCity(s, t, d) {
  const bar = (s / 16) | 0;
  const pos = s % 16;
  const ch = F_CITY_CH[bar];

  if (pos === 0) {
    pad(t, ch.map(n => n + 12), d * 16, 0.018, { attack: 0.4, release: 1.2, cut: 1900, type: 'triangle', send: 0.55 });
    bass(t, ch[0] - 12, d * 15, 0.13);
    timpani(t, ch[0] - 12, 0.22);
  }
  if (pos % 4 === 0) rim(t, 0.018);
  if (pos % 4 === 2) {
    const n = ch[(pos >> 2) % ch.length] + 12;
    pluck(t, n, 0.025, d * 1.2, { send: 0.5 });
  }
  if (bar === 3 && pos === 0) {
    wind(t, d * 16, 0.03, 0.3);
    brass(t, 50, d * 10, 0.04);
  }
  if (bar === 3 && pos === 8) timpani(t, 38, 0.34);

  const ev = F_CITY_MEL[s];
  if (ev) for (const [n, len] of ev) aulos(t, n, len * d, 0.065);
}

const F_PIRATE_CH = [[43, 46, 50], [39, 43, 46], [36, 39, 43], [43, 46, 50]];
const F_PIRATE_MEL = toMap([
  [0, 74, 2], [2, 70, 2], [4, 67, 2],
  [6, 65, 2], [8, 63, 2], [10, 62, 2],
  [12, 70, 2], [14, 67, 2], [16, 65, 2],
  [18, 63, 2], [20, 62, 2], [22, 55, 4]
]);

function playFailPirate(s, t, d) {
  const bar = (s / 6) | 0;
  const pos = s % 6;
  const ch = F_PIRATE_CH[bar];

  if (s === 0) wind(t, d * 24, 0.04, 0.35);
  if (pos === 0) {
    bass(t, ch[0] - 12, d * 5, 0.15);
    timpani(t, ch[0] - 12, 0.22);
    for (const n of ch) pluck(t, n + 12, 0.025, d * 2, { send: 0.55 });
  }
  if (pos === 3) taiko(t, 0.16, 50);
  if (pos === 1 || pos === 5) shaker(t, 0.012);
  if (bar === 3 && pos === 4) {
    timpani(t, 43, 0.3);
    taiko(t, 0.16, 48);
  }

  const ev = F_PIRATE_MEL[s];
  if (ev) for (const [n, len] of ev) fiddle(t, n, len * d, 0.065);
}

const F_FOG_CH = [[45, 48, 52], [41, 45, 48], [38, 41, 45], [40, 44, 47, 50]];
const F_FOG_MEL = toMap([
  [0, 76, 4], [4, 74, 4], [8, 72, 8],
  [16, 71, 4], [20, 69, 4], [24, 68, 8],
  [32, 65, 4], [36, 64, 4], [40, 62, 8],
  [48, 60, 4], [52, 59, 4], [56, 57, 8]
]);

function playFailFog(s, t, d) {
  const bar = (s / 16) | 0;
  const pos = s % 16;
  const ch = F_FOG_CH[bar];

  if (s === 0) wind(t, d * 64, 0.04, -0.4);
  if (pos === 0) {
    pad(t, ch.map(n => n + 12), d * 16, 0.02, { attack: 0.8, release: 1.8, cut: 2100, type: 'triangle', send: 0.65 });
    choir(t, ch.map(n => n + 12), d * 16, 0.016);
    bass(t, ch[0] - 12, d * 15, 0.11);
    if (bar === 0 || bar === 2) timpani(t, ch[0] - 12, 0.18);
  }
  if (pos === 8) rim(t, 0.012);
  if (bar === 3 && pos === 0) bell(t, 59, 0.02, 6);

  const ev = F_FOG_MEL[s];
  if (ev) for (const [n, len] of ev) {
    bell(t, n, 0.03, Math.min(5, len * d * 2.8));
    pluck(t, n, 0.024, len * d, { send: 0.65 });
  }
}

const F_HOLY_CH = [[46, 49, 53], [42, 46, 49], [37, 41, 44], [41, 45, 48]];
const F_HOLY_MEL = toMap([
  [0, 65, 4], [4, 63, 4], [8, 61, 8],
  [16, 60, 4], [20, 58, 4], [24, 56, 8],
  [32, 61, 4], [36, 60, 4], [40, 58, 8],
  [48, 56, 4], [52, 55, 4], [56, 53, 8]
]);

function playFailHoly(s, t, d) {
  const bar = (s / 16) | 0;
  const pos = s % 16;
  const ch = F_HOLY_CH[bar];

  if (pos === 0) {
    choir(t, ch.map(n => n + 12), d * 16, 0.022);
    pad(t, ch.map(n => n + 12), d * 16, 0.018, { attack: 0.5, release: 1.4, cut: 1600, type: 'sawtooth', send: 0.6 });
    bass(t, ch[0] - 12, d * 15, 0.12);
    timpani(t, ch[0] - 12, 0.2);
  }
  if (bar === 0 && pos === 0) bell(t, 65, 0.016, 5);
  if (bar === 3 && pos === 12) timpani(t, 41, 0.34);

  const ev = F_HOLY_MEL[s];
  if (ev) for (const [n, len] of ev) {
    brass(t, n, len * d, 0.05);
    fiddle(t, n - 12, len * d, 0.018);
  }
}

const F_MINE_CH = [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52]];
const F_MINE_MEL = toMap([
  [0, 69, 2], [2, 65, 2], [4, 64, 2],
  [6, 62, 2], [8, 60, 2], [10, 57, 2],
  [12, 65, 2], [14, 64, 2], [16, 62, 2],
  [18, 60, 2], [20, 57, 2], [22, 50, 4]
]);

function playFailMine(s, t, d) {
  const bar = (s / 6) | 0;
  const pos = s % 6;
  const ch = F_MINE_CH[bar];

  if (s === 0) wind(t, d * 24, 0.025, 0.2);
  if (pos === 0) {
    pad(t, ch, d * 6, 0.018, { attack: 0.2, release: 0.8, cut: 1500, type: 'triangle', send: 0.6 });
    bass(t, ch[0] - 12, d * 5, 0.13);
    taiko(t, bar === 0 ? 0.22 : 0.15, 38);
    bell(t, ch[ch.length - 1] + 24, 0.014, 2.5);
  }
  if (pos === 3) taiko(t, 0.08, 38);
  if (bar >= 2 && pos === 5) bell(t, 84 + bar * 2, 0.01, 1.6);
  if (bar === 3 && pos === 4) {
    timpani(t, 38, 0.36);
    taiko(t, 0.28, 36);
  }

  const ev = F_MINE_MEL[s];
  if (ev) for (const [n, len] of ev) {
    pluck(t, n, 0.055, len * d, { send: 0.65 });
    if (len >= 4) bell(t, n + 12, 0.012, 2);
  }
}

const F_TIDE_CH = [[45, 48, 52], [41, 45, 48], [38, 41, 45], [40, 44, 47]];
const F_TIDE_MEL = toMap([
  [0, 76, 4], [4, 74, 4], [8, 72, 8],
  [16, 71, 4], [20, 69, 4], [24, 67, 8],
  [32, 65, 4], [36, 64, 4], [40, 62, 8],
  [48, 60, 4], [52, 59, 4], [56, 57, 8]
]);

function playFailTide(s, t, d) {
  const bar = (s / 16) | 0;
  const pos = s % 16;
  const ch = F_TIDE_CH[bar];

  if (s === 0) wind(t, d * 64, 0.045, 0.3);
  if (pos === 0) {
    pad(t, ch, d * 16, 0.02, { attack: 0.7, release: 1.8, cut: 1100, type: 'triangle', send: 0.6 });
    bass(t, ch[0] - 12, d * 15, 0.13);
    if (bar === 0 || bar === 2) timpani(t, ch[0] - 12, 0.2);
  }
  if (pos === 2 || pos === 6 || pos === 10 || pos === 14) {
    bell(t, ch[(pos / 2) % ch.length] + 24, 0.012, 2);
  }
  if (bar === 3 && pos === 0) timpani(t, 40, 0.3);
  if (s === 56) {
    bass(t, 33, d * 10, 0.16);
    bell(t, 81, 0.018, 5);
  }

  const ev = F_TIDE_MEL[s];
  if (ev) for (const [n, len] of ev) {
    aulos(t, n, len * d, 0.06);
    if (len >= 4) bell(t, n + 12, 0.01, 2.2);
  }
}

const F_BEACON_CH = [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 49, 52]];
const F_BEACON_MEL = toMap([
  [0, 69, 4], [4, 67, 4], [8, 65, 4], [12, 62, 4],
  [16, 60, 4], [20, 62, 4], [24, 65, 8],
  [32, 69, 4], [36, 67, 4], [40, 65, 4], [44, 62, 4],
  [48, 60, 4], [52, 57, 4], [56, 62, 8]
]);

function playFailBeacon(s, t, d) {
  const bar = (s / 16) | 0;
  const pos = s % 16;
  const ch = F_BEACON_CH[bar];

  if (s === 0) wind(t, d * 64, 0.035, -0.2);
  if (pos === 0) {
    pad(t, ch, d * 16, 0.018, { attack: 0.4, release: 1.2, cut: 1700, type: 'triangle', send: 0.55 });
    bass(t, ch[0] - 12, d * 15, 0.13);
    taiko(t, bar === 0 ? 0.24 : 0.18, 40);
    timpani(t, ch[0] - 12, 0.2);
  }
  if (pos === 8) taiko(t, 0.09, 44);
  if (bar === 2 && pos === 0) rim(t, 0.02);
  if (bar === 3 && pos === 0) wind(t, d * 16, 0.03, -0.35);
  if (bar === 3 && pos === 12) {
    timpani(t, 45, 0.38);
    taiko(t, 0.26, 36);
    bell(t, 57, 0.018, 5);
  }

  const ev = F_BEACON_MEL[s];
  if (ev) for (const [n, len] of ev) brass(t, n, len * d, 0.052);
}

const F_NEON_CH = [[45, 48, 52], [41, 45, 48], [38, 41, 45], [40, 44, 47]];
const F_NEON_MEL = toMap([
  [0, 81, 4], [4, 79, 2], [6, 76, 2], [8, 74, 4], [12, 72, 4],
  [16, 71, 4], [20, 69, 4], [24, 67, 8],
  [32, 72, 4], [36, 71, 2], [38, 69, 2], [40, 67, 4], [44, 64, 4],
  [48, 65, 4], [52, 64, 4], [56, 57, 8]
]);

function playFailNeon(s, t, d) {
  const bar = (s / 16) | 0;
  const pos = s % 16;
  const ch = F_NEON_CH[bar];

  if (pos === 0) {
    pad(t, ch.map(n => n + 12), d * 16, 0.02, { attack: 0.3, release: 1.2, cut: 1800, type: 'sawtooth', send: 0.55 });
    bass(t, ch[0] - 12, d * 15, 0.14);
    failGlitch(t, 0.008 + bar * 0.004, bar % 2 ? 0.25 : -0.25);
  }

  // 琶音逐段变稀，像系统正在掉帧、断电
  const every = bar === 0 ? 2 : bar === 3 ? 8 : 4;
  if (pos % every === 0) {
    const n = ch[(pos / every) % ch.length] + 24;
    pluck(t, n, 0.024, d * 1.2, { send: 0.65 });
  }

  if (bar === 3 && pos === 0) failSweep(t, 81, 45, d * 8, 0.04);
  if (s === 56) {
    failSweep(t, 69, 33, d * 8, 0.03);
    bass(t, 33, d * 10, 0.16);
    failGlitch(t, 0.022, -0.35);
  }
  if (bar === 3 && pos === 14) failGlitch(t, 0.025, 0.4);

  const ev = F_NEON_MEL[s];
  if (ev) for (const [n, len] of ev) {
    brass(t, n, len * d, 0.038);
    bell(t, n + 12, 0.01, len * d + 0.4);
    aulos(t, n - 12, len * d, 0.014);
  }
}

  const TRACKS = {
    lobby:      { bpm: 62,  beatsPerBar: 4, stepsPerBar: 16, bars: 32, play: playLobby },
    battle:     { bpm: 112, beatsPerBar: 4, stepsPerBar: 16, bars: 48, play: playBattle },
    wannan:     { bpm: 84,  beatsPerBar: 4, stepsPerBar: 16, bars: 32, play: playWannan },
    wannan2:    { bpm: 126, beatsPerBar: 3, stepsPerBar: 6,  bars: 48, play: playWannan2 },
    snow:       { bpm: 72,  beatsPerBar: 4, stepsPerBar: 16, bars: 32, play: playSnow },
    pirate:     { bpm: 160, beatsPerBar: 3, stepsPerBar: 6,  bars: 16, play: playPirate },
    fog:        { bpm: 54,  beatsPerBar: 4, stepsPerBar: 16, bars: 16, play: playFog },
    holy:       { bpm: 66,  beatsPerBar: 4, stepsPerBar: 16, bars: 32, play: playHoly },
    mine:       { bpm: 108, beatsPerBar: 3, stepsPerBar: 6,  bars: 32, play: playMine },
    tide:       { bpm: 56,  beatsPerBar: 4, stepsPerBar: 16, bars: 32, play: playTide },
    beacon:     { bpm: 96,  beatsPerBar: 4, stepsPerBar: 16, bars: 32, play: playBeacon },
    neon:       { bpm: 118, beatsPerBar: 4, stepsPerBar: 16, bars: 32, play: playNeon },
    fail_battle:  { bpm: 66,  beatsPerBar: 4, stepsPerBar: 16, bars: 4, once: true, play: playFailBattle },
    fail_snow:    { bpm: 58,  beatsPerBar: 4, stepsPerBar: 16, bars: 4, once: true, play: playFailSnow },
    fail_wannan:  { bpm: 70,  beatsPerBar: 4, stepsPerBar: 16, bars: 4, once: true, play: playFailCity },
    fail_pirate:  { bpm: 84,  beatsPerBar: 3, stepsPerBar: 6,  bars: 4, once: true, play: playFailPirate },
    fail_fog:     { bpm: 50,  beatsPerBar: 4, stepsPerBar: 16, bars: 4, once: true, play: playFailFog },
    fail_holy:    { bpm: 58,  beatsPerBar: 4, stepsPerBar: 16, bars: 4, once: true, play: playFailHoly },
    fail_mine:    { bpm: 68,  beatsPerBar: 3, stepsPerBar: 6,  bars: 4, once: true, play: playFailMine },
    fail_tide:    { bpm: 52,  beatsPerBar: 4, stepsPerBar: 16, bars: 4, once: true, play: playFailTide },
    fail_beacon:  { bpm: 62,  beatsPerBar: 4, stepsPerBar: 16, bars: 4, once: true, play: playFailBeacon },
    fail_neon:    { bpm: 88,  beatsPerBar: 4, stepsPerBar: 16, bars: 4, once: true, play: playFailNeon },
    end_battle: { bpm: 138,  beatsPerBar: 4, stepsPerBar: 16, bars: 2,  once: true, play: playEndBattle },
    end_snow:   { bpm: 126,  beatsPerBar: 4, stepsPerBar: 16, bars: 2,  once: true, play: playEndSnow },
    end_city:   { bpm: 132,  beatsPerBar: 4, stepsPerBar: 16, bars: 2,  once: true, play: playEndCity },
    end_pirate: { bpm: 150, beatsPerBar: 3, stepsPerBar: 6,  bars: 2,  once: true, play: playEndPirate },
    end_fog:    { bpm: 120,  beatsPerBar: 4, stepsPerBar: 16, bars: 2,  once: true, play: playEndFog },
    end_holy:   { bpm: 128,  beatsPerBar: 4, stepsPerBar: 16, bars: 2,  once: true, play: playEndHoly },
    end_mine:   { bpm: 126,  beatsPerBar: 4, stepsPerBar: 16, bars: 2,  once: true, play: playEndMine },
    end_tide:   { bpm: 120,  beatsPerBar: 4, stepsPerBar: 16, bars: 2,  once: true, play: playEndTide },
    end_beacon: { bpm: 104,  beatsPerBar: 4, stepsPerBar: 16, bars: 2,  once: true, play: playEndBeacon },
    end_neon:   { bpm: 122,  beatsPerBar: 4, stepsPerBar: 16, bars: 2,  once: true, play: playEndNeon }
  };

  const MODE_TRACK = {
    classic: 'battle', wannan: 'wannan', mine: 'mine', tide: 'tide', beacon: 'beacon', neon: 'neon',
    snow: 'snow', pirate: 'pirate', fog: 'fog', holy: 'holy'
  };

  const MODE_END = {
    classic: 'end_battle', snow: 'end_snow', wannan: 'end_city', pirate: 'end_pirate',
    fog: 'end_fog', holy: 'end_holy', mine: 'end_mine', tide: 'end_tide', beacon: 'end_beacon',
    neon: 'end_neon'
  };

  const MODE_FAIL = {
    classic: 'fail_battle', snow: 'fail_snow', wannan: 'fail_wannan', pirate: 'fail_pirate',
    fog: 'fail_fog', holy: 'fail_holy', mine: 'fail_mine', tide: 'fail_tide', beacon: 'fail_beacon',
    neon: 'fail_neon'
  };

  /* ── 天候参数（与 1.6.0 天候系统一一对应） ───────────────── */

  const NEUTRAL = { cut: 20000, rain: 0, wind: 0, pan: 0 };
  const WEATHER_PARAMS = {
    clear:     { cut: 20000, rain: 0, wind: 0.02, pan: 0 },
    overcast:  { cut: 3000,  rain: 0, wind: 0.02, pan: 0 },
    breeze:    { cut: 12000, rain: 0, wind: 0.09, pan: 0 },
    drizzle:   { cut: 7000,  rain: 1, wind: 0.03, pan: 0 },
    mist:      { cut: 2200,  rain: 0, wind: 0.05, pan: 0 },
    snowLight: { cut: 11000, rain: 0, wind: 0.05, pan: 0 },
    snowHeavy: { cut: 6000,  rain: 0, wind: 0.12, pan: 0 },
    eastWind:  { cut: 16000, rain: 0, wind: 0.14, pan: -0.7 },
    westWind:  { cut: 16000, rain: 0, wind: 0.14, pan: 0.7 },
    fogNight:  { cut: 900,   rain: 0, wind: 0.03, pan: 0 },
    fogDawn:   { cut: 5200,  rain: 0, wind: 0.04, pan: 0 }
  };

  function weatherKeyFor(s) {
    const w = s.weather;
    if (!w || s.area !== 'game') return null;
    if (s.gameOver) return null;
    if (s.mode === 'classic' && w.mode === 'classic') {
      return WEATHER_PARAMS[w.kind] ? w.kind : 'clear';
    }
    if (s.mode === 'snow' && w.mode === 'snow') return w.level === 2 ? 'snowHeavy' : 'snowLight';
    if (s.mode === 'pirate' && w.mode === 'pirate') return w.windDir > 0 ? 'eastWind' : 'westWind';
    if (s.mode === 'fog' && w.mode === 'fog') return w.kind === 'fog-dawn' ? 'fogDawn' : 'fogNight';
    return null;
  }

  function trackIdFor(s) {
    if (s.area === 'lobby') return 'lobby';
    if (s.gameOver) return s.defeat ? (MODE_FAIL[s.mode] || 'fail_battle') : (MODE_END[s.mode] || 'end_battle');
    if (s.mode === 'wannan' && s.phase === 2) return 'wannan2';
    return MODE_TRACK[s.mode] || 'battle';
  }

  /* ── 音频图与噪声床 ─────────────────────────────────────── */

  function ensureAudio() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();

    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 18;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.25;

    master = ctx.createGain();
    master.gain.value = 0.9;

    outputGain = ctx.createGain();
    outputGain.gain.value = 0.0001;

    fadeGain = ctx.createGain();
    fadeGain.gain.value = 0.0001;

    bus = ctx.createGain();
    bus.gain.value = 1;

    filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 20000;
    filter.Q.value = 0.4;

    mixPanner = ctx.createStereoPanner();
    mixPanner.pan.value = 0;

    const rev = ctx.createConvolver();
    rev.buffer = makeIR(3.0, 2.6);
    const revGain = ctx.createGain();
    revGain.gain.value = 0.55;

    revSend = ctx.createGain();
    revSend.gain.value = 1;
    revSend.connect(rev);
    rev.connect(revGain);
    revGain.connect(bus);

    bus.connect(mixPanner);
    mixPanner.connect(filter);
    filter.connect(fadeGain);
    fadeGain.connect(outputGain);
    outputGain.connect(comp);
    comp.connect(master);
    master.connect(ctx.destination);

    noiseBuf = makeNoise(2);

    rainGain = ctx.createGain();
    rainGain.gain.value = 0.0001;
    const rainSrc = ctx.createBufferSource();
    rainSrc.buffer = noiseBuf;
    rainSrc.loop = true;
    const rainBP = ctx.createBiquadFilter();
    rainBP.type = 'bandpass';
    rainBP.frequency.value = 2600;
    rainBP.Q.value = 0.55;
    const rainLP = ctx.createBiquadFilter();
    rainLP.type = 'lowpass';
    rainLP.frequency.value = 7000;
    rainSrc.connect(rainBP);
    rainBP.connect(rainLP);
    rainLP.connect(rainGain);
    out(rainGain, 0.18);
    rainSrc.start();

    windGain = ctx.createGain();
    windGain.gain.value = 0.0001;
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = noiseBuf;
    windSrc.loop = true;
    const windBP = ctx.createBiquadFilter();
    windBP.type = 'bandpass';
    windBP.frequency.value = 620;
    windBP.Q.value = 0.7;
    const windLfo = ctx.createOscillator();
    windLfo.frequency.value = 0.09;
    const windLg = ctx.createGain();
    windLg.gain.value = 240;
    windLfo.connect(windLg);
    windLg.connect(windBP.frequency);
    windPanner = ctx.createStereoPanner();
    windPanner.pan.value = 0;
    windSrc.connect(windBP);
    windBP.connect(windGain);
    windGain.connect(windPanner);
    out(windPanner, 0.3);
    windSrc.start();
    windLfo.start();
  }

  /* ── 播放调度 ───────────────────────────────────────────── */

  function tick() {
    if (!ctx || !currentTrack) return;
    const tr = currentTrack;
    const d = 60 / tr.bpm / (tr.stepsPerBar / tr.beatsPerBar);
    if (nextTime < ctx.currentTime - 0.4) nextTime = ctx.currentTime + 0.05;

    while (nextTime < ctx.currentTime + 0.16) {
      try {
        tr.play(step, nextTime, d);
      } catch (err) {
        if (window.console && console.error) console.error(err);
      }
      nextTime += d;
      step++;
      if (step >= tr.stepsPerBar * tr.bars) {
        if (tr.once) {
          // 图鉴试听允许把两小节结束曲循环播放；游戏内仍只播一次。
          if (previewMode && previewLoop) {
            step = 0;
          } else {
            if (timer) { clearInterval(timer); timer = null; }
            currentTrack = null;
            break;
          }
        } else {
          step = 0;
        }
      }
    }
  }

  function startTrack(id, opts) {
    const tr = TRACKS[id];
    if (!tr || !ctx) return;
    previewLoop = !!(opts && opts.loop);
    currentId = id;
    currentTrack = tr;
    step = 0;
    nextTime = ctx.currentTime + 0.08;

    if (timer) clearInterval(timer);
    timer = setInterval(tick, 25);
    tick();

    const now = ctx.currentTime;
    fadeGain.gain.cancelScheduledValues(now);
    fadeGain.gain.setValueAtTime(Math.max(fadeGain.gain.value, 0.0001), now);
    fadeGain.gain.linearRampToValueAtTime(1, now + 0.6);
  }

  function fadeOutAndStop(delayMs) {
    const now = ctx.currentTime;
    fadeGain.gain.cancelScheduledValues(now);
    fadeGain.gain.setValueAtTime(Math.max(fadeGain.gain.value, 0.0001), now);
    fadeGain.gain.linearRampToValueAtTime(0.0001, now + Math.max(0.25, (delayMs || 350) / 1000));
    if (timer) { clearInterval(timer); timer = null; }
    currentTrack = null;
  }

  function queueSwitch(id) {
    if (!ctx || !enabled) { currentId = null; currentTrack = null; return; }
    if (id === currentId && timer) return;

    const token = ++switchToken;
    fadeOutAndStop(420);
    currentId = null;

    setTimeout(function () {
      if (token !== switchToken || !enabled) return;
      startTrack(id);
    }, 440);
  }

  function applyWeather() {
    if (!ctx) return;
    const key = weatherKeyFor(scene);
    wxKey = key;
    const p = (key && WEATHER_PARAMS[key]) || NEUTRAL;
    const now = ctx.currentTime;
    filter.frequency.setTargetAtTime(p.cut, now, 0.5);
    rainGain.gain.setTargetAtTime(p.rain * 0.045, now, 0.4);
    windGain.gain.setTargetAtTime(p.wind * 0.32, now, 0.4);
    windPanner.pan.setTargetAtTime(p.pan, now, 0.4);
    mixPanner.pan.setTargetAtTime(p.pan * 0.4, now, 0.45);
  }

  function applyOutput() {
    if (!ctx) return;
    const target = enabled ? 0.5 : 0.0001;
    outputGain.gain.setTargetAtTime(target, ctx.currentTime, 0.25);
  }

  /* ── 场景 ───────────────────────────────────────────────── */

  function normalize(next) {
    next = next || {};
    return {
      area: next.area === 'game' ? 'game' : 'lobby',
      mode: next.mode || null,
      weather: next.weather || null,
      phase: next.phase === 2 ? 2 : 1,
      gameOver: !!next.gameOver,
      defeat: !!next.defeat
    };
  }

  function setScene(next) {
    const s = normalize(next);
    const key = trackIdFor(s) + '|' + (weatherKeyFor(s) || '') + '|' + (s.gameOver ? '1' : '0');
    scene = s;
    if (previewMode) return; // 试听期间只记录场景，不打断试听曲目
    if (key === lastSceneKey) return;
    lastSceneKey = key;

    if (!ctx || !enabled) return;

    const id = trackIdFor(s);
    if (id !== currentId) queueSwitch(id);
    applyWeather();
    applyOutput();
  }

  function unlock() {
    if (!ctx) ensureAudio();
    if (!ctx) return;
    if (ctx.state === 'suspended' && ctx.resume) ctx.resume();

    if (previewMode) {
      // 图鉴页首次点击只解锁音频，不自动播放大厅曲。
      applyOutput();
      return;
    }
    if (!enabled) return;

    if (!currentTrack) {
      startTrack(trackIdFor(scene));
    }
    applyWeather();
    applyOutput();
  }

  /* ── 图鉴试听 ───────────────────────────────────────────── */

  function enterPreviewMode(autoResume) {
    previewAutoResume = !!autoResume;
    if (previewMode) return;
    previewMode = true;
    switchToken++; // 取消进行中的场景切换
    if (ctx) fadeOutAndStop(260);
    currentId = null;
  }

  function preview(id, opts) {
    const tr = TRACKS[id];
    if (!tr) return false;
    if (!ctx) ensureAudio();
    if (!ctx) return false;
    if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
    previewMode = true;
    switchToken++;
    if (timer) clearInterval(timer);
    timer = null;
    startTrack(id, { loop: !!(opts && opts.loop) });
    // 显式试听优先于静音开关：直接打开输出，不改写用户的音乐偏好。
    outputGain.gain.cancelScheduledValues(ctx.currentTime);
    outputGain.gain.setTargetAtTime(0.5, ctx.currentTime, 0.2);
    return true;
  }

  function stopPreview() {
    if (!previewMode) return;
    previewMode = false;
    previewLoop = false;
    if (ctx) fadeOutAndStop(280);
    currentId = null;
    if (ctx) applyOutput();
  }

  function exitPreviewMode() {
    const resume = previewAutoResume;
    previewAutoResume = false;
    stopPreview();
    if (resume && enabled && ctx) {
      setTimeout(function () {
        if (previewMode || !enabled || !ctx) return;
        if (!currentTrack) startTrack(trackIdFor(scene));
        applyWeather();
        applyOutput();
      }, 420);
    }
  }

  function setVolume(v) {
    const vol = Math.max(0, Math.min(1, Number(v)));
    if (!isFinite(vol) || !ctx) return;
    master.gain.setTargetAtTime(0.9 * vol, ctx.currentTime, 0.15);
  }

  function setEnabled(v) {
    enabled = !!v;
    try { localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0'); } catch (e) {}

    if (enabled) {
      if (!ctx) ensureAudio();
      if (ctx) {
        if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
        if (!currentTrack) startTrack(trackIdFor(scene));
        applyWeather();
        applyOutput();
      }
    } else if (ctx) {
      fadeOutAndStop(500);
      currentId = null;
      outputGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.2);
    }

    updateButtons();
  }

  function toggle() { setEnabled(!enabled); }

  /* ── 按钮 ───────────────────────────────────────────────── */

  function updateButtons() {
    document.querySelectorAll('.music-toggle').forEach(function (btn) {
      btn.classList.toggle('off', !enabled);
      btn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
      btn.title = enabled ? '关闭背景音乐' : '开启背景音乐';
      var label = btn.querySelector('.music-label');
      if (label) label.textContent = enabled ? '音乐' : '静音';
    });
  }

  function wireButtons() {
    document.querySelectorAll('.music-toggle').forEach(function (btn) {
      if (btn.dataset.musicWired === '1') return;
      btn.dataset.musicWired = '1';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      });
    });
    updateButtons();
  }

  /* ── 对外接口 ───────────────────────────────────────────── */

  window.ChaosMusic = {
    unlock: unlock,
    setScene: setScene,
    toggle: toggle,
    setEnabled: setEnabled,
    isEnabled: function () { return enabled; },
    enterPreviewMode: enterPreviewMode,
    preview: preview,
    stopPreview: stopPreview,
    exitPreviewMode: exitPreviewMode,
    setVolume: setVolume,
    isPreviewing: function () { return previewMode; },
    previewTrack: function () { return previewMode ? currentId : null; },
    debug: function () {
      return {
        ready: !!ctx,
        enabled: enabled,
        track: currentId,
        playing: !!currentTrack,
        step: step,
        bars: currentTrack ? currentTrack.bars : 0,
        weatherKey: wxKey,
        cutoff: filter ? filter.frequency.value : 0,
        rain: rainGain ? rainGain.gain.value : 0,
        wind: windGain ? windGain.gain.value : 0,
        pan: windPanner ? windPanner.pan.value : 0
      };
    }
  };

  window.addEventListener('pointerdown', function once() {
    window.removeEventListener('pointerdown', once);
    unlock();
  }, { capture: true });

  window.addEventListener('keydown', function onceKey() {
    window.removeEventListener('keydown', onceKey);
    unlock();
  }, { capture: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireButtons);
  } else {
    wireButtons();
  }
})();
