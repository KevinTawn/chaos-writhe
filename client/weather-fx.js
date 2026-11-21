// 混乱与蠕动 · 经典模式天候视觉层（联机版与单机热座共用）。
// 只负责绘制氛围粒子，不参与规则；天候种类由引擎下发的 weather.kind 决定。
(function (root) {
  'use strict';

  var KINDS = { clear: 1, overcast: 1, breeze: 1, drizzle: 1, mist: 1 };
  var canvas = null;
  var ctx = null;
  var rafId = 0;
  var lastTs = 0;
  var elapsed = 0;
  var kind = '';
  var W = 0;
  var H = 0;
  var dpr = 1;
  var drops = [];
  var splashes = [];
  var leaves = [];
  var puffs = [];
  var motes = [];
  var shadows = [];
  var beams = [];
  var reduced = false;

  try {
    reduced = !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (err) {
    reduced = false;
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function ensureCanvas() {
    if (canvas && root.document && root.document.body && root.document.body.contains(canvas)) return canvas;
    canvas = root.document.getElementById('weather-fx');
    if (!canvas) {
      canvas = root.document.createElement('canvas');
      canvas.id = 'weather-fx';
      root.document.body.appendChild(canvas);
    }
    canvas.setAttribute('aria-hidden', 'true');
    ctx = canvas.getContext('2d');
    return canvas;
  }

  function measure() {
    var w = root.innerWidth || root.document.documentElement.clientWidth || 0;
    var h = root.innerHeight || root.document.documentElement.clientHeight || 0;
    var d = Math.min(2, root.devicePixelRatio || 1);
    if (w === W && h === H && d === dpr && canvas && canvas.width) return false;
    W = w;
    H = h;
    dpr = d;
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  }

  function build(nextKind) {
    drops = [];
    splashes = [];
    leaves = [];
    puffs = [];
    motes = [];
    shadows = [];
    beams = [];
    if (!nextKind) return;

    var i;
    if (nextKind === 'drizzle') {
      var dropCount = Math.max(100, Math.min(360, Math.round(W * H / 4800)));
      for (i = 0; i < dropCount; i++) {
        drops.push({
          x: rand(-40, W + 40),
          y: rand(-H, H),
          len: rand(11, 26),
          spd: rand(440, 880),
          drift: rand(-0.11, -0.02),
          a: rand(0.10, 0.36)
        });
      }
      for (i = 0; i < 6; i++) {
        splashes.push({ x: rand(0, W), y: rand(0, H), r: 0, life: rand(0, 0.4), max: rand(0.28, 0.5), size: rand(3, 8) });
      }
    } else if (nextKind === 'breeze') {
      var leafCount = Math.max(18, Math.min(46, Math.round(W / 28)));
      var palette = [
        ['rgba(152,178,104,', 'rgba(152,178,104,0)'],
        ['rgba(186,160,92,', 'rgba(186,160,92,0)'],
        ['rgba(118,148,86,', 'rgba(118,148,86,0)']
      ];
      for (i = 0; i < leafCount; i++) {
        leaves.push({
          x: rand(-40, W + 40),
          y: rand(-20, H),
          size: rand(2.4, 5.2),
          spd: rand(22, 58),
          fall: rand(-6, 14),
          phase: rand(0, Math.PI * 2),
          freq: rand(0.7, 1.8),
          angle: rand(0, Math.PI * 2),
          spin: rand(-1.6, 1.6),
          color: palette[i % palette.length]
        });
      }
    } else if (nextKind === 'mist') {
      var puffCount = Math.max(14, Math.min(30, Math.round(W / 46)));
      for (i = 0; i < puffCount; i++) {
        puffs.push({
          x: rand(-120, W + 120),
          y: rand(0, H),
          r: rand(130, 330),
          spd: rand(5, 18),
          bob: rand(0, Math.PI * 2),
          a: rand(0.04, 0.11)
        });
      }
      for (i = 0; i < 4; i++) {
        puffs.push({
          x: rand(-120, W + 120),
          y: H * rand(0.62, 0.96),
          r: rand(240, 420),
          spd: rand(3, 9),
          bob: rand(0, Math.PI * 2),
          a: rand(0.075, 0.13)
        });
      }
    } else if (nextKind === 'overcast') {
      var shadowCount = Math.max(7, Math.min(14, Math.round(W / 120)));
      for (i = 0; i < shadowCount; i++) {
        shadows.push({
          x: rand(-200, W + 200),
          y: rand(0, H),
          rx: rand(170, 360),
          ry: rand(70, 150),
          spd: rand(7, 20),
          bob: rand(0, Math.PI * 2),
          a: rand(0.035, 0.085)
        });
      }
    } else if (nextKind === 'clear') {
      var moteCount = Math.max(20, Math.min(48, Math.round(W / 34)));
      for (i = 0; i < moteCount; i++) {
        motes.push({
          x: rand(0, W),
          y: rand(0, H),
          r: rand(0.7, 2.1),
          spd: rand(3, 11),
          phase: rand(0, Math.PI * 2),
          a: rand(0.12, 0.42)
        });
      }
      beams = [
        { x: W * 0.10, y: -H * 0.10, w: 130, len: Math.max(W, H) * 1.15, angle: 0.38, a: 0.045 },
        { x: W * 0.26, y: -H * 0.16, w: 62, len: Math.max(W, H) * 1.1, angle: 0.30, a: 0.032 },
        { x: W * 0.42, y: -H * 0.20, w: 34, len: Math.max(W, H) * 1.05, angle: 0.24, a: 0.022 }
      ];
    }
  }

  function tint() {
    var g;
    if (kind === 'clear') {
      g = ctx.createRadialGradient(W * 0.16, H * 0.04, 0, W * 0.16, H * 0.04, Math.max(W, H) * 0.95);
      g.addColorStop(0, 'rgba(255,214,142,0.16)');
      g.addColorStop(0.42, 'rgba(255,198,120,0.05)');
      g.addColorStop(1, 'rgba(255,190,110,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    } else if (kind === 'overcast') {
      g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, 'rgba(122,134,148,0.20)');
      g.addColorStop(0.45, 'rgba(92,104,118,0.10)');
      g.addColorStop(1, 'rgba(64,76,88,0.08)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    } else if (kind === 'breeze') {
      g = ctx.createRadialGradient(W * 0.72, H * 0.18, 0, W * 0.72, H * 0.18, Math.max(W, H) * 0.8);
      g.addColorStop(0, 'rgba(232,238,196,0.055)');
      g.addColorStop(1, 'rgba(232,238,196,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    } else if (kind === 'drizzle') {
      g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, 'rgba(48,72,92,0.34)');
      g.addColorStop(0.40, 'rgba(38,58,76,0.16)');
      g.addColorStop(1, 'rgba(22,36,48,0.20)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    } else if (kind === 'mist') {
      g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, 'rgba(230,238,236,0.09)');
      g.addColorStop(0.55, 'rgba(226,235,232,0.042)');
      g.addColorStop(1, 'rgba(222,232,229,0.075)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function drawClear(dt) {
    var i;
    for (i = 0; i < beams.length; i++) {
      var b = beams[i];
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle);
      var g = ctx.createLinearGradient(0, 0, b.w, 0);
      g.addColorStop(0, 'rgba(255,232,178,' + b.a + ')');
      g.addColorStop(0.5, 'rgba(255,224,158,' + (b.a * 0.45) + ')');
      g.addColorStop(1, 'rgba(255,220,150,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(b.w, 0);
      ctx.lineTo(b.w * 0.45, b.len);
      ctx.lineTo(-b.w * 0.55, b.len);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    for (i = 0; i < motes.length; i++) {
      var m = motes[i];
      m.x += m.spd * dt;
      m.y -= m.spd * 0.42 * dt;
      m.phase += dt * 1.4;
      if (m.x > W + 6) { m.x = -6; m.y = rand(0, H); }
      if (m.y < -6) { m.y = H + 6; m.x = rand(0, W); }
      var a = m.a * (0.55 + 0.45 * Math.sin(m.phase));
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,230,168,' + a.toFixed(3) + ')';
      ctx.fill();
    }
  }

  function drawOvercast(dt) {
    for (var i = 0; i < shadows.length; i++) {
      var s = shadows[i];
      s.x += s.spd * dt;
      s.bob += dt * 0.25;
      if (s.x - s.rx > W + 40) s.x = -s.rx - 40;
      var y = s.y + Math.sin(s.bob) * 10;
      var g = ctx.createRadialGradient(s.x, y, 0, s.x, y, s.rx);
      g.addColorStop(0, 'rgba(16,24,32,' + s.a.toFixed(3) + ')');
      g.addColorStop(0.62, 'rgba(16,24,32,' + (s.a * 0.5).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(16,24,32,0)');
      ctx.save();
      ctx.translate(s.x, y);
      ctx.scale(1, s.ry / s.rx);
      ctx.translate(-s.x, -y);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(s.x, y, s.rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawBreeze(dt) {
    for (var i = 0; i < leaves.length; i++) {
      var l = leaves[i];
      l.x += l.spd * dt;
      l.y += Math.sin(elapsed * l.freq + l.phase) * 15 * dt + l.fall * dt;
      l.angle += l.spin * dt;
      if (l.x > W + 24) { l.x = -24; l.y = rand(-10, H); }
      if (l.y > H + 18) { l.y = -18; l.x = rand(0, W); }
      if (l.y < -20) { l.y = H + 10; }
      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.rotate(l.angle);
      ctx.beginPath();
      ctx.ellipse(0, 0, l.size, l.size * 0.42, 0, 0, Math.PI * 2);
      ctx.fillStyle = l.color[0] + '0.46)';
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-l.size * 0.8, 0);
      ctx.lineTo(l.size * 0.8, 0);
      ctx.strokeStyle = l.color[0] + '0.22)';
      ctx.lineWidth = 0.7;
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawSplashes(dt) {
    for (var i = splashes.length - 1; i >= 0; i--) {
      var s = splashes[i];
      s.life += dt;
      if (s.life >= s.max) { splashes.splice(i, 1); continue; }
      var p = s.life / s.max;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, s.size * (0.6 + p * 1.5), s.size * (0.18 + p * 0.34), 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(196,224,240,' + (0.26 * (1 - p)).toFixed(3) + ')';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  function drawDrizzle(dt) {
    drawSplashes(dt);
    var i, d;
    for (i = 0; i < drops.length; i++) {
      d = drops[i];
      d.x += d.drift * d.spd * dt;
      d.y += d.spd * dt;
      if (d.y - d.len > H) {
        if (Math.random() < 0.22 && splashes.length < 60) {
          splashes.push({ x: d.x, y: d.y - d.len, r: 0, life: 0, max: rand(0.25, 0.5), size: rand(2.5, 7) });
        }
        d.y = -d.len - rand(0, 90);
        d.x = rand(-40, W + 40);
      } else if (d.x < -60) {
        d.x = W + 40;
      }
    }
    ctx.lineWidth = 1;
    for (var pass = 0; pass < 2; pass++) {
      var bright = pass === 1;
      ctx.beginPath();
      for (i = 0; i < drops.length; i++) {
        d = drops[i];
        if ((d.a >= 0.24) !== bright) continue;
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + d.drift * 30, d.y + d.len);
      }
      ctx.strokeStyle = bright ? 'rgba(214,238,250,0.62)' : 'rgba(188,218,238,0.52)';
      ctx.globalAlpha = bright ? 0.72 : 0.40;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawMist(dt) {
    for (var i = 0; i < puffs.length; i++) {
      var p = puffs[i];
      p.x += p.spd * dt;
      p.bob += dt * 0.22;
      if (p.x - p.r > W + 60) { p.x = -p.r - 60; p.y = rand(0, H); }
      var y = p.y + Math.sin(p.bob) * 12;
      var g = ctx.createRadialGradient(p.x, y, 0, p.x, y, p.r);
      g.addColorStop(0, 'rgba(235,242,240,' + p.a.toFixed(3) + ')');
      g.addColorStop(0.58, 'rgba(228,237,234,' + (p.a * 0.46).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(222,232,229,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function render(dt) {
    if (!ctx || !kind) return;
    elapsed += dt;
    ctx.clearRect(0, 0, W, H);
    tint();
    if (kind === 'clear') drawClear(dt);
    else if (kind === 'overcast') drawOvercast(dt);
    else if (kind === 'breeze') drawBreeze(dt);
    else if (kind === 'drizzle') drawDrizzle(dt);
    else if (kind === 'mist') drawMist(dt);
  }

  function frame(ts) {
    rafId = 0;
    if (!kind) return;
    var dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0;
    lastTs = ts;
    render(dt);
    rafId = root.requestAnimationFrame(frame);
  }

  function start() {
    if (reduced) { render(0); return; }
    if (rafId) return;
    lastTs = 0;
    rafId = root.requestAnimationFrame(frame);
  }

  function stopLoop() {
    if (rafId) {
      root.cancelAnimationFrame(rafId);
      rafId = 0;
    }
    lastTs = 0;
  }

  function set(weather) {
    var next = weather && weather.mode === 'classic' && KINDS[weather.kind] ? weather.kind : '';
    if (!next) { clear(); return; }
    var el = ensureCanvas();
    if (!el || !ctx) return;
    var resized = measure();
    var changed = next !== kind;
    kind = next;
    el.style.display = 'block';
    if (changed || resized) build(kind);
    if (reduced) { stopLoop(); render(0); }
    else start();
  }

  function clear() {
    stopLoop();
    kind = '';
    drops = [];
    splashes = [];
    leaves = [];
    puffs = [];
    motes = [];
    shadows = [];
    beams = [];
    if (ctx && W && H) ctx.clearRect(0, 0, W, H);
    if (canvas) canvas.style.display = 'none';
  }

  if (root.addEventListener) {
    root.addEventListener('resize', function () {
      if (!kind || !canvas || canvas.style.display === 'none') return;
      if (measure()) {
        build(kind);
        if (reduced) render(0);
      }
    });
  }

  root.ChaosWeatherFX = Object.freeze({
    set: set,
    clear: clear,
    current: function () { return kind; },
    reducedMotion: reduced
  });
})(typeof window !== 'undefined' ? window : globalThis);
