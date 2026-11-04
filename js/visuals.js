/* =========================================================
   VISUALS — hand-built canvas scenes, no libraries.

   Every <canvas data-visual="name"> on a page gets a scene.
   One requestAnimationFrame loop drives all of them; a scene
   only renders while it's on screen and the tab is visible.
   Under prefers-reduced-motion each scene draws one still
   frame and stops.
   ========================================================= */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var CYAN = [61, 232, 245];
  var VIOLET = [139, 108, 255];
  var ICE = [207, 232, 255];

  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a.toFixed(3) + ')'; }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t].map(Math.round); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* Pointer position, normalised to -1..1 across the viewport */
  var pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', function (e) {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  /* ---------- scene registry ---------- */
  var scenes = [];

  function Scene(canvas, factory) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.visible = false;
    this.w = 0; this.h = 0;
    this.t = 0;
    this.impl = factory(this);
    this.resize();
  }
  Scene.prototype.resize = function () {
    var r = this.canvas.getBoundingClientRect();
    this.w = Math.max(1, r.width); this.h = Math.max(1, r.height);
    this.canvas.width = Math.round(this.w * DPR);
    this.canvas.height = Math.round(this.h * DPR);
    this.ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (this.impl.resize) this.impl.resize(this.w, this.h);
    if (reduce) this.draw(0);
  };
  Scene.prototype.draw = function (dt) {
    this.t += dt;
    this.ctx.clearRect(0, 0, this.w, this.h);
    this.impl.draw(this.ctx, this.w, this.h, this.t, dt);
  };

  /* ---------- 1. Encrypted core (home hero) ----------
     A Fibonacci-sphere lattice with nearest-neighbour links,
     orbiting rings and packets, around a glowing core.     */
  function coreScene(scene) {
    var N = window.innerWidth < 700 ? 150 : 230;
    var pts = [], links = [], packets = [];
    var golden = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < N; i++) {
      var y = 1 - (i / (N - 1)) * 2;
      var rad = Math.sqrt(1 - y * y);
      var th = golden * i;
      pts.push([Math.cos(th) * rad, y, Math.sin(th) * rad]);
    }
    for (var a = 0; a < N; a++) {
      var near = [];
      for (var b = 0; b < N; b++) {
        if (a === b) continue;
        var dx = pts[a][0] - pts[b][0], dy = pts[a][1] - pts[b][1], dz = pts[a][2] - pts[b][2];
        near.push([dx * dx + dy * dy + dz * dz, b]);
      }
      near.sort(function (p, q) { return p[0] - q[0]; });
      for (var k = 0; k < 3; k++) if (a < near[k][1]) links.push([a, near[k][1]]);
    }
    for (var p = 0; p < 14; p++) packets.push({ l: (Math.random() * links.length) | 0, u: Math.random(), s: 0.25 + Math.random() * 0.5 });

    var rings = [
      { tilt: 1.15, spin: 0.35, r: 0.62, c: CYAN },
      { tilt: -0.55, spin: -0.22, r: 0.78, c: VIOLET },
      { tilt: 1.35, spin: 0.15, r: 1.18, c: ICE }
    ];
    var rotY = 0.6, rotX = -0.25, scrollK = 0;
    var cx, cy, R;

    function layout(w, h) {
      var mobile = w < 760;
      cx = mobile ? w * 0.5 : w * 0.7;
      cy = mobile ? h * 0.36 : h * 0.44;
      R = Math.min(w, h) * (mobile ? 0.36 : 0.33);
    }

    function project(v, ry, rx) {
      var cosy = Math.cos(ry), siny = Math.sin(ry), cosx = Math.cos(rx), sinx = Math.sin(rx);
      var x = v[0] * cosy - v[2] * siny;
      var z = v[0] * siny + v[2] * cosy;
      var y = v[1] * cosx - z * sinx;
      z = v[1] * sinx + z * cosx;
      var s = 2.6 / (2.6 - z);
      return [cx + x * R * s, cy + y * R * s, z, s];
    }

    return {
      resize: layout,
      draw: function (ctx, w, h, t, dt) {
        pointer.x = lerp(pointer.x, pointer.tx, 0.04);
        pointer.y = lerp(pointer.y, pointer.ty, 0.04);
        scrollK = lerp(scrollK, Math.min(1, window.scrollY / (h || 1)), 0.1);
        rotY += dt * 0.11;
        var ry = rotY + pointer.x * 0.5;
        var rx = rotX + pointer.y * 0.3;
        var fade = (1 - scrollK * 0.85) * (w < 760 ? 0.55 : 1);
        var lift = scrollK * h * 0.12;
        ctx.save();
        ctx.translate(0, -lift);
        ctx.globalAlpha = fade;

        /* core glow */
        var pulse = 0.85 + Math.sin(t * 1.6) * 0.15;
        var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.75);
        g.addColorStop(0, rgba(ICE, 0.55 * pulse));
        g.addColorStop(0.18, rgba(CYAN, 0.35 * pulse));
        g.addColorStop(0.55, rgba(VIOLET, 0.10));
        g.addColorStop(1, rgba(VIOLET, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, cy, R * 0.75, 0, Math.PI * 2); ctx.fill();

        /* inner cube: the "encrypted" kernel */
        var cube = [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
        var ce = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
        var cs = 0.2;
        var cp = cube.map(function (v) { return project([v[0] * cs, v[1] * cs, v[2] * cs], -rotY * 1.8, rx + t * 0.4); });
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = rgba(CYAN, 0.75);
        ctx.beginPath();
        ce.forEach(function (e) { ctx.moveTo(cp[e[0]][0], cp[e[0]][1]); ctx.lineTo(cp[e[1]][0], cp[e[1]][1]); });
        ctx.stroke();

        /* rings with travelling packets */
        rings.forEach(function (ring, idx) {
          var seg = 96, first = true;
          ctx.beginPath();
          for (var s = 0; s <= seg; s++) {
            var ang = (s / seg) * Math.PI * 2;
            var v = [Math.cos(ang) * ring.r, 0, Math.sin(ang) * ring.r];
            var ct = Math.cos(ring.tilt), st = Math.sin(ring.tilt);
            v = [v[0], v[1] * ct - v[2] * st, v[1] * st + v[2] * ct];
            var q = project(v, ry * (0.6 + idx * 0.1), rx);
            if (first) { ctx.moveTo(q[0], q[1]); first = false; } else ctx.lineTo(q[0], q[1]);
          }
          ctx.strokeStyle = rgba(ring.c, idx === 2 ? 0.12 : 0.28);
          ctx.lineWidth = 1;
          ctx.stroke();
          for (var k2 = 0; k2 < 3; k2++) {
            var ang2 = t * ring.spin * 2 + k2 * 2.09 + idx;
            var v2 = [Math.cos(ang2) * ring.r, 0, Math.sin(ang2) * ring.r];
            var ct2 = Math.cos(ring.tilt), st2 = Math.sin(ring.tilt);
            v2 = [v2[0], v2[1] * ct2 - v2[2] * st2, v2[1] * st2 + v2[2] * ct2];
            var q2 = project(v2, ry * (0.6 + idx * 0.1), rx);
            ctx.fillStyle = rgba(ring.c, 0.5 + q2[2] * 0.4);
            ctx.beginPath(); ctx.arc(q2[0], q2[1], 2.2 * q2[3], 0, Math.PI * 2); ctx.fill();
          }
        });

        /* lattice */
        var P = pts.map(function (v) { return project(v, ry, rx); });
        ctx.lineWidth = 0.8;
        for (var l = 0; l < links.length; l++) {
          var A = P[links[l][0]], B = P[links[l][1]];
          var depth = (A[2] + B[2]) * 0.5;
          var al = 0.05 + (depth + 1) * 0.13;
          ctx.strokeStyle = rgba(mix(VIOLET, CYAN, (depth + 1) / 2), al);
          ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
        }
        for (var n = 0; n < P.length; n++) {
          var Q = P[n], dd = (Q[2] + 1) / 2;
          ctx.fillStyle = rgba(mix(VIOLET, ICE, dd), 0.25 + dd * 0.7);
          ctx.beginPath(); ctx.arc(Q[0], Q[1], 0.6 + dd * 1.7, 0, Math.PI * 2); ctx.fill();
        }
        /* packets riding lattice edges */
        packets.forEach(function (pk) {
          pk.u += dt * pk.s;
          if (pk.u > 1) { pk.u = 0; pk.l = (Math.random() * links.length) | 0; }
          var A2 = P[links[pk.l][0]], B2 = P[links[pk.l][1]];
          var x = lerp(A2[0], B2[0], pk.u), y2 = lerp(A2[1], B2[1], pk.u);
          var d2 = ((A2[2] + B2[2]) * 0.5 + 1) / 2;
          ctx.fillStyle = rgba(CYAN, 0.35 + d2 * 0.65);
          ctx.shadowColor = rgba(CYAN, 0.9); ctx.shadowBlur = 8;
          ctx.beginPath(); ctx.arc(x, y2, 1.8, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
        });
        ctx.restore();
      }
    };
  }

  /* ---------- 2. Perspective floor (projects / certifications) ---------- */
  function floorScene() {
    var streaks = [];
    for (var i = 0; i < 18; i++) streaks.push({ col: (Math.random() * 30 - 15) | 0, z: Math.random(), s: 0.12 + Math.random() * 0.25, c: Math.random() < 0.3 ? VIOLET : CYAN });
    return {
      draw: function (ctx, w, h, t, dt) {
        pointer.x = lerp(pointer.x, pointer.tx, 0.04);
        var hz = h * 0.42, vx = w * 0.5 + pointer.x * w * 0.05;
        var floorH = h - hz;
        var fade = ctx.createLinearGradient(0, hz, 0, h);
        fade.addColorStop(0, rgba(CYAN, 0)); fade.addColorStop(1, rgba(CYAN, 0.22));
        ctx.strokeStyle = fade; ctx.lineWidth = 1;
        ctx.beginPath();
        for (var c = -15; c <= 15; c++) {
          var bx = vx + c * (w / 11);
          ctx.moveTo(vx + c * 4, hz); ctx.lineTo(bx, h);
        }
        var off = (t * 0.18) % 1;
        for (var r = 0; r < 16; r++) {
          var z = (r + off) / 16;
          var y = hz + floorH * z * z;
          ctx.moveTo(0, y); ctx.lineTo(w, y);
        }
        ctx.stroke();
        streaks.forEach(function (s) {
          s.z += dt * s.s; if (s.z > 1) { s.z = 0; s.col = (Math.random() * 30 - 15) | 0; }
          var z1 = s.z, z0 = Math.max(0, s.z - 0.12);
          var x1 = lerp(vx + s.col * 4, vx + s.col * (w / 11), z1), y1 = hz + floorH * z1 * z1;
          var x0 = lerp(vx + s.col * 4, vx + s.col * (w / 11), z0), y0 = hz + floorH * z0 * z0;
          var gr = ctx.createLinearGradient(x0, y0, x1, y1);
          gr.addColorStop(0, rgba(s.c, 0)); gr.addColorStop(1, rgba(s.c, 0.9));
          ctx.strokeStyle = gr; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        });
        var hg = ctx.createRadialGradient(vx, hz, 0, vx, hz, w * 0.45);
        hg.addColorStop(0, rgba(CYAN, 0.18)); hg.addColorStop(0.4, rgba(VIOLET, 0.06)); hg.addColorStop(1, rgba(VIOLET, 0));
        ctx.fillStyle = hg; ctx.fillRect(0, 0, w, h);
      }
    };
  }

  /* ---------- 3. Neural network with adversarial signals (research) ---------- */
  function neuralScene() {
    var layers = [5, 9, 9, 7, 3], nodes = [], edges = [], sigs = [];
    function build(w, h) {
      nodes = []; edges = [];
      var mobile = w < 760;
      var x0 = mobile ? w * 0.08 : w * 0.46, x1 = w * 0.94;
      layers.forEach(function (count, li) {
        var col = [];
        for (var i = 0; i < count; i++) {
          col.push({ x: lerp(x0, x1, li / (layers.length - 1)), y: h * 0.5 + (i - (count - 1) / 2) * Math.min(h * 0.085, 54), li: li });
        }
        nodes.push(col);
      });
      for (var l = 0; l < layers.length - 1; l++)
        nodes[l].forEach(function (a) { nodes[l + 1].forEach(function (b) { edges.push([a, b, l]); }); });
      sigs = [];
      for (var s = 0; s < 22; s++) sigs.push({ e: edges[(Math.random() * edges.length) | 0], u: Math.random(), adv: Math.random() < 0.25 });
    }
    return {
      resize: build,
      draw: function (ctx, w, h, t, dt) {
        ctx.lineWidth = 0.6;
        edges.forEach(function (e) {
          ctx.strokeStyle = rgba(ICE, 0.06);
          ctx.beginPath(); ctx.moveTo(e[0].x, e[0].y); ctx.lineTo(e[1].x, e[1].y); ctx.stroke();
        });
        sigs.forEach(function (s) {
          s.u += dt * 0.45;
          if (s.u >= 1) {
            var next = edges.filter(function (e) { return e[0] === s.e[1]; });
            s.e = next.length ? next[(Math.random() * next.length) | 0] : edges[(Math.random() * edges.length) | 0];
            if (!next.length) s.adv = Math.random() < 0.25;
            s.u = 0;
          }
          var c = s.adv ? VIOLET : CYAN;
          var x = lerp(s.e[0].x, s.e[1].x, s.u), y = lerp(s.e[0].y, s.e[1].y, s.u);
          ctx.strokeStyle = rgba(c, 0.35);
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(s.e[0].x, s.e[0].y); ctx.lineTo(x, y); ctx.stroke();
          ctx.fillStyle = rgba(c, 1); ctx.shadowColor = rgba(c, 1); ctx.shadowBlur = 10;
          ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        });
        nodes.forEach(function (col) {
          col.forEach(function (n, i) {
            var p = 0.5 + 0.5 * Math.sin(t * 1.4 + i + n.li * 1.7);
            ctx.fillStyle = '#0A0C11';
            ctx.strokeStyle = rgba(n.li === layers.length - 1 ? VIOLET : CYAN, 0.35 + p * 0.5);
            ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.arc(n.x, n.y, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          });
        });
      }
    };
  }

  /* ---------- 4. Port sweep (CyberToolkit) ----------
     Mirrors the README example: ports 20-100 on scanme.nmap.org
     (81 ports), scanned concurrently; 22/tcp and 80/tcp open.  */
  function portScene() {
    var COLS = 9, ROWS = 9, FIRST = 20, OPEN = { 22: 'SSH', 80: 'HTTP' };
    var heat = new Array(COLS * ROWS).fill(0), done = new Array(COLS * ROWS).fill(0);
    var workers = [0, 9, 18, 27, 36, 45, 54, 63, 72].map(function (s) { return { i: s, start: s, wait: Math.random() * 0.4 }; });
    var cycle = 0;
    return {
      draw: function (ctx, w, h, t, dt) {
        var pad = 28, gw = Math.min(w - pad * 2, (h - 140) / 0.62);
        var cell = gw / COLS, gh = cell * ROWS * 0.62, ch = gh / ROWS;
        var ox = (w - gw) / 2, oy = 52;
        cycle += dt;
        if (!reduce) {
          workers.forEach(function (wk) {
            wk.wait -= dt;
            if (wk.wait <= 0 && wk.i < wk.start + 9) { heat[wk.i] = 1; done[wk.i] = 1; wk.i++; wk.wait = 0.16 + Math.random() * 0.22; }
          });
          if (cycle > 9) { cycle = 0; done.fill(0); workers.forEach(function (wk) { wk.i = wk.start; wk.wait = Math.random() * 0.4; }); }
        } else { done.fill(1); }
        ctx.font = '500 10px "IBM Plex Mono", monospace';
        for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
          var idx = r * COLS + c, port = FIRST + idx;
          heat[idx] = Math.max(0, heat[idx] - dt * 1.6);
          var x = ox + c * cell + 3, y = oy + r * ch + 3, cw = cell - 6, chh = ch - 6;
          var open = OPEN[port] && done[idx];
          ctx.fillStyle = open ? rgba(CYAN, 0.9) : rgba(ICE, done[idx] ? 0.08 : 0.03) ;
          ctx.fillRect(x, y, cw, chh);
          if (heat[idx] > 0) { ctx.fillStyle = rgba(VIOLET, heat[idx] * 0.8); ctx.fillRect(x, y, cw, chh); }
          ctx.fillStyle = open ? '#05060A' : rgba(ICE, done[idx] ? 0.45 : 0.22);
          ctx.fillText(String(port), x + 6, y + chh / 2 + 3.5);
        }
        var scanned = done.reduce(function (s, v) { return s + v; }, 0);
        ctx.fillStyle = rgba(ICE, 0.65);
        ctx.font = '500 11px "IBM Plex Mono", monospace';
        ctx.fillText('scanme.nmap.org  ports 20-100  ' + scanned + '/81', ox, oy - 12);
        ctx.fillStyle = rgba(CYAN, 0.9);
        ctx.fillText(done[2] ? '22/tcp SSH' : '', ox, oy + gh + 22);
        ctx.fillText(done[60] ? '80/tcp HTTP' : '', ox + 110, oy + gh + 22);
      }
    };
  }

  /* ---------- 5. Radar (experience / SOC) ---------- */
  function radarScene() {
    var blips = [];
    for (var i = 0; i < 9; i++) blips.push({ a: Math.random() * Math.PI * 2, r: 0.25 + Math.random() * 0.7, life: 0, sev: Math.random() < 0.3 });
    return {
      draw: function (ctx, w, h, t, dt) {
        var mobile = w < 760;
        var cx = mobile ? w * 0.5 : w * 0.76, cy = mobile ? h * 0.32 : h * 0.5, R = Math.min(w, h) * (mobile ? 0.34 : 0.42);
        ctx.lineWidth = 1;
        for (var k = 1; k <= 4; k++) { ctx.strokeStyle = rgba(ICE, 0.07); ctx.beginPath(); ctx.arc(cx, cy, R * k / 4, 0, Math.PI * 2); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke();
        var sweep = (t * 0.9) % (Math.PI * 2);
        for (var s = 0; s < 28; s++) {
          var a0 = sweep - s * 0.03;
          ctx.strokeStyle = rgba(CYAN, 0.32 * (1 - s / 28));
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R); ctx.stroke();
        }
        blips.forEach(function (b) {
          var diff = ((sweep - b.a) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
          if (diff < 0.06) b.life = 1;
          b.life = Math.max(0, b.life - dt * 0.35);
          if (b.life <= 0 && Math.random() < 0.002) { b.a = Math.random() * Math.PI * 2; b.r = 0.25 + Math.random() * 0.7; }
          var x = cx + Math.cos(b.a) * b.r * R, y = cy + Math.sin(b.a) * b.r * R;
          var c = b.sev ? VIOLET : CYAN;
          ctx.fillStyle = rgba(c, b.life);
          ctx.shadowColor = rgba(c, 1); ctx.shadowBlur = 12 * b.life;
          ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
          if (b.life > 0) { ctx.strokeStyle = rgba(c, b.life * 0.5); ctx.beginPath(); ctx.arc(x, y, 3 + (1 - b.life) * 14, 0, Math.PI * 2); ctx.stroke(); }
        });
      }
    };
  }

  var factories = { core: coreScene, floor: floorScene, neural: neuralScene, ports: portScene, radar: radarScene };

  /* ---------- boot ---------- */
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { var s = e.target.__scene; if (s) s.visible = e.isIntersecting; });
  }, { rootMargin: '100px' }) : null;

  document.querySelectorAll('canvas[data-visual]').forEach(function (cv) {
    var f = factories[cv.getAttribute('data-visual')];
    if (!f || !cv.getContext) return;
    var s = new Scene(cv, f);
    cv.__scene = s;
    scenes.push(s);
    if (io) io.observe(cv); else s.visible = true;
  });
  if (!scenes.length) return;

  var resizeT;
  window.addEventListener('resize', function () {
    clearTimeout(resizeT);
    resizeT = setTimeout(function () { scenes.forEach(function (s) { s.resize(); }); }, 120);
  });

  if (reduce) { scenes.forEach(function (s) { s.draw(0.016); }); return; }

  var last = performance.now();
  function loop(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!document.hidden) scenes.forEach(function (s) { if (s.visible) s.draw(dt); });
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
