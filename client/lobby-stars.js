/* 大厅星尘背景：轻量 canvas，只在可见时绘制。 */
(function () {
  'use strict';
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function init() {
    var canvas = document.getElementById('lobby-stars');
    if (!canvas) return;
    var ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return;

    var stars = [];
    var shoot = null;
    var rafId = 0;
    var active = true;
    var width = 0;
    var height = 0;

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.round((width * height) / 9000);
      stars = [];
      for (var i = 0; i < Math.min(240, count); i++) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.random() * 1.25 + .25,
          a: Math.random() * .55 + .2,
          sp: Math.random() * .0018 + .0004,
          ph: Math.random() * 6.28
        });
      }
    }

    function drawStatic() {
      ctx.clearRect(0, 0, width, height);
      stars.forEach(function (s) {
        ctx.globalAlpha = s.a;
        ctx.fillStyle = s.r > 1.1 ? '#ecf7ee' : '#b7d4be';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, 6.283);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }

    function loop(t) {
      rafId = 0;
      if (!active) return;
      ctx.clearRect(0, 0, width, height);
      stars.forEach(function (s) {
        var a = s.a + Math.sin(t * s.sp + s.ph) * .18;
        ctx.globalAlpha = Math.max(.06, a);
        ctx.fillStyle = s.r > 1.1 ? '#ecf7ee' : '#b7d4be';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, 6.283);
        ctx.fill();
      });
      if (!shoot && Math.random() < .0022) {
        shoot = { x: Math.random() * width * .7, y: Math.random() * height * .4, len: 0, sp: 7 + Math.random() * 5 };
      }
      if (shoot) {
        shoot.x += shoot.sp;
        shoot.y += shoot.sp * .38;
        shoot.len += shoot.sp;
        var tailX = shoot.x - shoot.len * .8;
        var tailY = shoot.y - shoot.len * .3;
        var g = ctx.createLinearGradient(shoot.x, shoot.y, tailX, tailY);
        g.addColorStop(0, 'rgba(236,247,238,.8)');
        g.addColorStop(1, 'rgba(236,247,238,0)');
        ctx.globalAlpha = 1;
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(shoot.x, shoot.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();
        if (shoot.len > 260) shoot = null;
      }
      ctx.globalAlpha = 1;
      rafId = requestAnimationFrame(loop);
    }

    function start() {
      if (reduce) { drawStatic(); return; }
      active = true;
      if (!rafId) rafId = requestAnimationFrame(loop);
    }

    function stop() {
      active = false;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    }

    resize();
    window.addEventListener('resize', function () {
      resize();
      if (reduce) drawStatic();
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) start(); else stop();
      }).observe(canvas);
    } else {
      start();
    }

    if (reduce) drawStatic();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
