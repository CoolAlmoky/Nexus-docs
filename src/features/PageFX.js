/* PageFX — built-in feature. Logic moved verbatim from the old monolith; see Feature.js for the lifecycle. */
(function () {
'use strict';
class PageFX extends Nexus.Feature {
  get id() { return 'pagefx'; }
  init() {
    var app = this.app;
    var ed=app.ed, canvas=app.canvas, $=app.$, $$=app.$$, showPop=app.showPop, closePop=app.closePop;

    var scroller=canvas;
    var ID = 'pagefx', LS = 'nx.pagefx.v1', MAXP = 600, TAU = Math.PI * 2, DEG = Math.PI / 180;
    /* ---------- helpers ---------- */
    function clone(o) { return JSON.parse(JSON.stringify(o)); }
    function rnd(a, b) { return a + Math.random() * (b - a); }
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
    function safeHex(c, fb) {
      c = String(c || '').trim();
      if (/^#[0-9a-f]{6}$/i.test(c)) return c.toLowerCase();
      if (/^#[0-9a-f]{3}$/i.test(c)) return ('#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3]).toLowerCase();
      return fb || '#000000';
    }
    function h2r(h) { h = safeHex(h); return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
    function r2h(r) { return '#' + r.map(function (n) { return ('0' + Math.round(clamp(n, 0, 255)).toString(16)).slice(-2); }).join(''); }
    function colorAt(st, t) { /* st sorted by p, t in 0..1 */
      var p = t * 100;
      if (p <= st[0].p) return h2r(st[0].c);
      for (var i = 1; i < st.length; i++) {
        if (p <= st[i].p) {
          var a = st[i - 1], b = st[i], k = (p - a.p) / Math.max(0.0001, b.p - a.p), ra = h2r(a.c), rb = h2r(b.c);
          return [ra[0] + (rb[0] - ra[0]) * k, ra[1] + (rb[1] - ra[1]) * k, ra[2] + (rb[2] - ra[2]) * k];
        }
      }
      return h2r(st[st.length - 1].c);
    }
    function cssGrad(st, ang) {
      return 'linear-gradient(' + (+ang || 0) + 'deg,' + st.map(function (s) { return safeHex(s.c, '#ffffff') + ' ' + clamp(+s.p || 0, 0, 100) + '%'; }).join(',') + ')';
    }
    function relLum(c) { return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255; }
    function fixStops(st) {
      if (!Array.isArray(st) || st.length < 2) return null;
      st = st.map(function (s) { return { p: clamp(+s.p || 0, 0, 100), c: safeHex(s.c, '#ffffff') }; }).sort(function (a, b) { return a.p - b.p; });
      if (st.length > 8) st = st.slice(0, 7).concat(st[st.length - 1]);
      st[0].p = 0; st[st.length - 1].p = 100;
      return st;
    }
    function reduced() { return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }

    /* ---------- defaults & presets ---------- */
    var SHAPES = [['circle', 'Circle'], ['square', 'Square'], ['diamond', 'Diamond'], ['star', 'Star'], ['heart', 'Heart'], ['ring', 'Ring'], ['line', 'Line']];
    var EMITS = [['whole', 'Whole screen'], ['top', 'Top edge'], ['bottom', 'Bottom edge'], ['left', 'Left edge'], ['right', 'Right edge'], ['center', 'Center']];
    var SPEC = {
      rate: { min: 1, max: 100, step: 1, int: 1 },
      lifeMin: { min: 0.1, max: 30, step: 0.1 }, lifeMax: { min: 0.1, max: 30, step: 0.1 },
      speedMin: { min: 0, max: 1000, step: 1 }, speedMax: { min: 0, max: 1000, step: 1 },
      dir: { min: 0, max: 359, step: 1, int: 1 }, spread: { min: 0, max: 360, step: 1, int: 1 },
      gravity: { min: -500, max: 500, step: 1, int: 1, glo: -100, ghi: 100 },
      size: { min: 0, max: 200, step: 1, int: 1, glo: 0, ghi: 40 },
      opacity: { min: 0, max: 1, step: 0.01, glo: 0, ghi: 1 },
      glow: { min: 0, max: 1, step: 0.01, glo: 0, ghi: 1 },
      rotMin: { min: -360, max: 360, step: 1, int: 1 }, rotMax: { min: -360, max: 360, step: 1, int: 1 },
      spinMin: { min: -720, max: 720, step: 1, int: 1 }, spinMax: { min: -720, max: 720, step: 1, int: 1 }
    };
    var SEQK = ['size', 'opacity', 'glow', 'gravity'];
    function clampSpec(k, v) { var sp = SPEC[k]; v = clamp(+v, sp.min, sp.max); return sp.int ? Math.round(v) : Math.round(v * 100) / 100; }
    function fixSeq(a, k) {
      if (!Array.isArray(a) || a.length < 2) return null;
      var pts = a.slice(0, 16).map(function (q) { q = q || {}; return { t: clamp(Math.round((+q.t || 0) * 100) / 100, 0, 1), v: clampSpec(k, +q.v || 0), e: Math.max(0, Math.round((+q.e || 0) * 100) / 100) }; })
        .sort(function (x, y) { return x.t - y.t; });
      pts[0].t = 0; pts[pts.length - 1].t = 1; return pts;
    }
    var PAL = ['#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8', '#475569', '#0f172a',
      '#fee2e2', '#ffedd5', '#fef3c7', '#ecfccb', '#d1fae5', '#cffafe', '#dbeafe', '#ede9fe',
      '#fce7f3', '#fecaca', '#fed7aa', '#fde68a', '#bef264', '#6ee7b7', '#67e8f9', '#93c5fd',
      '#c4b5fd', '#f9a8d4', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6',
      '#8b5cf6', '#ec4899', '#7f1d1d', '#78350f', '#14532d', '#164e63', '#1e3a8a', '#4c1d95'];
    var GPRESETS = [['#fde68a', '#f9a8d4', 135], ['#a5f3fc', '#c4b5fd', 120], ['#bbf7d0', '#fef9c3', 90], ['#0f172a', '#4c1d95', 160], ['#fecaca', '#fde68a', 45], ['#1e3a8a', '#06b6d4', 200]];

    var FXD = {
      on: false, shape: 'star', emit: 'whole', rate: 10, lifeMin: 2, lifeMax: 3, speedMin: 6, speedMax: 10, dir: 0, spread: 360,
      gravity: 0, gravitySeq: null, img: '',
      size: 10, sizeSeq: [{ t: 0, v: 10, e: 0 }, { t: 1, v: 0, e: 0 }],
      opacity: 1, opacitySeq: [{ t: 0, v: 0, e: 0 }, { t: 0.1, v: 1, e: 0 }, { t: 0.6, v: 1, e: 0 }, { t: 1, v: 0, e: 0 }],
      glow: 0.6, glowSeq: null,
      rotMin: 0, rotMax: 360, spinMin: -90, spinMax: 90,
      cstops: [{ p: 0, c: '#fbbf24' }, { p: 100, c: '#f472b6' }]
    };
    var DEF = { mode: 'none', solid: '#e0f2fe', angle: 135, stops: [{ p: 0, c: '#fde68a' }, { p: 100, c: '#f9a8d4' }], autoText: true, fx: FXD };
    var DEF_JSON = JSON.stringify(DEF);

    /* ---------- storage (per document) ---------- */
    var store = { docs: {} };
    try { var raw0 = localStorage.getItem(LS); if (raw0) store = JSON.parse(raw0); } catch (e) { }
    if (!store || typeof store.docs !== 'object' || !store.docs) store = { docs: {} };
    function docId() { return (app.cur && app.cur.id) || '_'; }
    function isOn() { return true; }
    function getCfg(id) {
      var s = store.docs[id] || {}, d = clone(DEF);
      if (s.mode === 'solid' || s.mode === 'gradient') d.mode = s.mode;
      d.solid = safeHex(s.solid, d.solid);
      if (typeof s.angle === 'number' && isFinite(s.angle)) d.angle = ((Math.round(s.angle) % 360) + 360) % 360;
      d.stops = fixStops(s.stops) || d.stops;
      if (typeof s.autoText === 'boolean') d.autoText = s.autoText;
      if (s.fx && typeof s.fx === 'object') {
        var f = d.fx, sf = s.fx;
        Object.keys(SPEC).forEach(function (k) { if (typeof sf[k] === 'number' && isFinite(sf[k])) f[k] = clampSpec(k, sf[k]); });
        ['life', 'speed', 'rot', 'spin'].forEach(function (b) { if (f[b + 'Min'] > f[b + 'Max']) { var t = f[b + 'Min']; f[b + 'Min'] = f[b + 'Max']; f[b + 'Max'] = t; } });
        SEQK.forEach(function (k) { if ((k + 'Seq') in sf) f[k + 'Seq'] = fixSeq(sf[k + 'Seq'], k); });
        SHAPES.forEach(function (o) { if (sf.shape === o[0]) f.shape = o[0]; });
        EMITS.forEach(function (o) { if (sf.emit === o[0]) f.emit = o[0]; });
        if (typeof sf.img === 'string' && /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+\/=]+$/.test(sf.img) && sf.img.length < 400000) f.img = sf.img;
        if (typeof sf.on === 'boolean') f.on = sf.on;
        f.cstops = fixStops(sf.cstops) || f.cstops;
      }
      return d;
    }
    var curId = docId(), cfg = getCfg(curId), lastOn = isOn(), saveT = 0, savePending = false;
    function persist() {
      clearTimeout(saveT); savePending = false;
      try {
        if (JSON.stringify(cfg) === DEF_JSON) delete store.docs[curId]; else store.docs[curId] = cfg;
        localStorage.setItem(LS, JSON.stringify(store));
      } catch (e) { }
    }
    function save() { savePending = true; clearTimeout(saveT); saveT = setTimeout(persist, 250); }
    function onHide() { if (savePending) persist(); }
    window.addEventListener('pagehide', onHide);

    /* ---------- styles ---------- */
    var styleEl = document.createElement('style');
    styleEl.id = 'nx-pagefx-style';
    styleEl.textContent = [
      '.sheet.pfx-dark{--paper-ink:#f4f7f8;--paper-line:#6b7a83;--paper-soft:rgb(255 255 255/.12)}',
      '.sheet.pfx-dark a{color:#8fd0ff}.sheet.pfx-dark blockquote{color:#c9d5db}',
      '.sheet.pfx-dark ul.check>li::before{background:transparent;border-color:#a9b7bf}.sheet.pfx-dark ul.check>li[data-checked="1"]{color:#a9b7bf}',
      '.pfx-root{flex:1 1 100%;width:100%;min-width:0;display:flex;flex-direction:column;gap:8px}',
      '.pfx-seg{display:flex;border:1px solid var(--line);border-radius:8px;overflow:hidden}',
      '.pfx-seg button{flex:1;height:28px;border:0;background:transparent;font-size:12px;cursor:pointer;color:var(--ink)}',
      '.pfx-seg button+button{border-left:1px solid var(--line)}',
      '.pfx-seg button[aria-pressed="true"]{background:var(--accent);color:var(--accent-ink)}',
      '.pfx-root button:focus-visible,.pfx-root input:focus-visible,.pfx-root select:focus-visible{outline:2px solid var(--accent);outline-offset:1px}',
      '.pfx-lab{font-size:11.5px;color:var(--muted)}',
      '.pfx-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap}',
      '.pfx-row>.pfx-sl{flex:1 1 90px;min-width:0}',
      '.pfx-pal{display:grid;grid-template-columns:repeat(8,1fr);gap:4px}',
      '.pfx-sw{aspect-ratio:1;border:1px solid rgb(0 0 0/.2);border-radius:5px;cursor:pointer;padding:0}',
      '.pfx-sw[aria-pressed="true"]{outline:2px solid var(--accent);outline-offset:1px}',
      '.pfx-root input[type=color]{width:34px;height:28px;padding:0;border:1px solid var(--line);border-radius:6px;background:transparent;flex:none}',
      '.pfx-root input[type=text],.pfx-root input.pfx-num,.pfx-root select{height:28px;border:1px solid var(--line);background:var(--chrome);border-radius:6px;padding:0 6px;font-size:12.5px;min-width:0}',
      '.pfx-root input.pfx-hex{width:76px}.pfx-root input.pfx-num{width:60px}.pfx-imgth{width:30px;height:30px;border:1px solid var(--line,#cbd5e1);border-radius:6px;background:#f1f5f9 center/contain no-repeat;cursor:pointer;padding:0;font-size:14px;color:#94a3b8}',
      '.pfx-root select{width:100%}',
      '.pfx-root input[type=range]{flex:1;width:100%;min-width:0;accent-color:var(--accent)}',
      '.pfx-prev{height:40px;border-radius:8px;border:1px solid var(--line)}',
      '.pfx-bw{position:relative;padding:0 8px;touch-action:none;user-select:none}',
      '.pfx-bar{height:22px;border-radius:6px;border:1px solid var(--line);cursor:copy}',
      '.pfx-hs{position:relative;height:20px}',
      '.pfx-h{position:absolute;top:3px;width:14px;height:14px;margin-left:-7px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px rgb(0 0 0/.45);padding:0;cursor:grab}',
      '.pfx-h.fixed{border-radius:3px;cursor:default}.pfx-h.sel{box-shadow:0 0 0 2px var(--accent)}',
      '.pfx-dial{width:44px;height:44px;border-radius:50%;border:1px solid var(--line);background:var(--bg);position:relative;flex:none;touch-action:none;cursor:pointer}',
      '.pfx-dial i{position:absolute;left:50%;top:50%;width:2px;height:17px;margin:-17px 0 0 -1px;background:var(--accent);border-radius:1px;transform-origin:50% 100%}',
      '.pfx-dial::after{content:"";position:absolute;left:50%;top:50%;width:6px;height:6px;margin:-3px;border-radius:50%;background:var(--accent)}',
      '.pfx-chip{height:26px;padding:0 10px;border:1px solid var(--line);border-radius:13px;background:var(--chrome);font-size:12px;cursor:pointer;color:var(--ink)}',
      '.pfx-chip:hover{background:var(--hover)}.pfx-chip[aria-pressed="true"]{background:var(--accent-soft);border-color:var(--accent)}',
      '.pfx-gp{width:36px;height:26px;border-radius:6px;border:1px solid var(--line);cursor:pointer;padding:0}',
      '.pfx-chk{display:flex;gap:6px;align-items:center;font-size:12.5px;cursor:pointer}',
      '.pfx-root p.pfx-note{font-size:11.5px;color:var(--muted);margin:0;line-height:1.45}',
      '.pfx-sl{display:flex;flex-direction:column;gap:2px;min-width:0}',
      '.pfx-sl .hd{display:flex;justify-content:space-between;font-size:12px}',
      '.pfx-h3{font-size:12px;font-weight:600;margin-top:2px}',
      '.ribtabs{display:flex;gap:2px;padding-top:4px}.rtab{height:28px;padding:0 14px;border:0;border-bottom:2px solid transparent;background:transparent;font-size:13px;font-weight:500;color:var(--muted);cursor:pointer;border-radius:6px 6px 0 0}.rtab:hover{background:var(--hover)}.rtab[aria-selected="true"]{color:var(--ink);border-bottom-color:var(--accent)}.rtab:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}.ribpage{align-items:flex-start;gap:8px 14px;padding-block:6px;flex-wrap:wrap;overflow-x:hidden;overflow-y:auto;max-height:42vh}.rg{display:flex;flex-direction:column;align-items:center;gap:3px;flex:none}.rc{display:flex;align-items:center;gap:8px;min-height:30px}.rl{font-size:10.5px;color:var(--muted)}.ribpage .sep{height:44px;align-self:center}.ribpage .cb[aria-pressed="true"]{background:var(--accent-soft);border-color:var(--accent);color:var(--accent)}.ribpage .pfx-chk{white-space:nowrap}.pfx-pop{width:300px;max-height:calc(100vh - 150px);overflow-y:auto}.pfx-rib.pfx-root{display:contents}.pfx-rib .pfx-sl{width:104px;flex:none}.pfx-rib .pfx-sl.wide{width:116px}.pfx-rib .pfx-row{flex-wrap:nowrap}.pfx-rib .pfx-note{display:none}.pfx-rib .pfx-chk{white-space:nowrap}.ribpage .pfx-rib .rc{align-items:flex-end}.pfx-fl{display:flex;flex-direction:column;gap:2px;flex:none}.pfx-fr{display:flex;align-items:center;gap:4px}.pfx-dots{width:22px;height:28px;border:1px solid var(--line);border-radius:6px;background:var(--chrome);cursor:pointer;font-size:15px;line-height:1;padding:0;color:var(--ink);flex:none}.pfx-dots:hover{background:var(--hover)}.pfx-dots:focus-visible,.pfx-cchip:focus-visible{outline:2px solid var(--accent);outline-offset:1px}.pfx-cchip{width:84px;height:28px;border:1px solid var(--line);border-radius:6px;cursor:pointer;padding:0;flex:none}.pfx-root input.pfx-num:disabled{opacity:.6}.pfx-rib .pfx-dial{width:36px;height:36px}.pfx-rib .pfx-dial i{height:13px;margin-top:-13px}'
    ].join('');
    document.head.appendChild(styleEl);

    /* ---------- page layer (background + particles) ---------- */
    var layer = null, bgEl = null, cvs = null, ctx = null, gkey = '', skey = '', ctop = null;
    var geom = { W: 0, H: 0, top: 0, bottom: 0 };
    var raf = 0, last = 0, parts = [], acc = 0;

    function ensureLayer() {
      if (layer && layer.parentNode === scroller) return;
      layer = el('div'); layer.id = 'nx-pagefx'; layer.setAttribute('aria-hidden', 'true');
      layer.style.cssText = 'position:absolute;pointer-events:none;z-index:0;overflow:hidden;left:0;top:0;width:0;height:0';
      bgEl = el('div'); bgEl.style.cssText = 'position:absolute;left:0;top:0;right:0;bottom:0';
      layer.appendChild(bgEl);
      scroller.insertBefore(layer, scroller.firstChild);
      gkey = '';
    }
    function place() {
      if (!layer) return;
      var cr = scroller.getBoundingClientRect(), sr = ed.getBoundingClientRect();
      var L = sr.left - cr.left + scroller.scrollLeft, T = sr.top - cr.top + scroller.scrollTop;
      geom.W = sr.width; geom.H = sr.height;
      geom.top = Math.max(0, cr.top - sr.top); geom.bottom = Math.min(sr.height, cr.bottom - sr.top);
      var k = [L, T, sr.width, sr.height].map(function (n) { return n.toFixed(1); }).join();
      if (k !== gkey) {
        gkey = k; var s = layer.style;
        s.left = L + 'px'; s.top = T + 'px'; s.width = sr.width + 'px'; s.height = sr.height + 'px';
      }
    }
    function avgLum() {
      if (cfg.mode === 'solid') return relLum(h2r(cfg.solid));
      var sum = 0, n = 11;
      for (var i = 0; i < n; i++) sum += relLum(colorAt(cfg.stops, i / (n - 1)));
      return sum / n;
    }
    function apply() {
      var on = isOn(), wantBg = on && cfg.mode !== 'none', wantFx = on && cfg.fx.on && !reduced();
      if (!wantBg && !wantFx) { dropLayer(); return; }
      ensureLayer();
      ed.style.position = 'relative'; ed.style.zIndex = '1'; ed.style.background = 'transparent';
      var bg = 'var(--paper)';
      if (cfg.mode === 'solid') bg = safeHex(cfg.solid, '#ffffff');
      else if (cfg.mode === 'gradient') bg = cssGrad(cfg.stops, cfg.angle);
      bgEl.style.background = bg;
      ed.classList.toggle('pfx-dark', wantBg && cfg.autoText && avgLum() < 0.45);
      place();
      if (wantFx) startFx(); else stopFx();
    }
    function dropLayer() {
      stopFx();
      if (layer) { layer.remove(); layer = null; bgEl = null; }
      ['position', 'z-index', 'background'].forEach(function (p) { ed.style.removeProperty(p); });
      ed.classList.remove('pfx-dark'); gkey = '';
    }
    function changed() { apply(); save(); syncRib(); }

    /* ---------- particles ---------- */
    function startFx() {
      if (!layer) return;
      if (!cvs) {
        cvs = document.createElement('canvas');
        cvs.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none';
        layer.appendChild(cvs); ctx = cvs.getContext('2d'); skey = ''; ctop = null;
      }
      if (!raf) { last = 0; raf = requestAnimationFrame(loop); }
    }
    function stopFx() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0; last = 0; parts.length = 0; acc = 0;
      if (cvs) { cvs.remove(); cvs = null; ctx = null; }
    }
    function loop(ts) {
      raf = requestAnimationFrame(loop);
      var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016; last = ts;
      place(); frame(dt);
    }
    function seqAt(seq, c, t, r) {
      if (!seq) return c;
      var i = 1; while (i < seq.length - 1 && t > seq[i].t) i++;
      var a = seq[i - 1], b = seq[i], k = b.t > a.t ? clamp((t - a.t) / (b.t - a.t), 0, 1) : 1;
      return a.v + (b.v - a.v) * k + r * (a.e + (b.e - a.e) * k);
    }
    function seqMax(seq, c) { if (!seq) return c; var m = 0; seq.forEach(function (q) { m = Math.max(m, q.v + q.e); }); return m; }
    function spawn(f, W, bt, bb) {
      var s = Math.max(6, seqMax(f.sizeSeq, f.size)), x, y;
      switch (f.emit) {
        case 'top': x = rnd(0, W); y = bt - s; break;
        case 'bottom': x = rnd(0, W); y = bb + s; break;
        case 'left': x = -s; y = rnd(bt, bb); break;
        case 'right': x = W + s; y = rnd(bt, bb); break;
        case 'center': x = W / 2 + rnd(-8, 8); y = (bt + bb) / 2 + rnd(-8, 8); break;
        default: x = rnd(0, W); y = rnd(bt, bb);
      }
      var an = (f.dir + rnd(-0.5, 0.5) * f.spread) * DEG, sp = rnd(f.speedMin, f.speedMax);
      parts.push({
        x: x, y: y, vx: Math.sin(an) * sp, vy: -Math.cos(an) * sp, age: 0, life: Math.max(0.1, rnd(f.lifeMin, f.lifeMax)),
        rot: rnd(f.rotMin, f.rotMax) * DEG, spin: rnd(f.spinMin, f.spinMax) * DEG,
        rs: rnd(-1, 1), ro: rnd(-1, 1), rg: rnd(-1, 1), rv: rnd(-1, 1)
      });
    }
    function drawShape(g, type, r, col) {
      g.fillStyle = col; g.strokeStyle = col; g.beginPath();
      switch (type) {
        case 'square': g.rect(-r, -r, r * 2, r * 2); g.fill(); break;
        case 'diamond': g.moveTo(0, -r * 1.2); g.lineTo(r * 0.8, 0); g.lineTo(0, r * 1.2); g.lineTo(-r * 0.8, 0); g.closePath(); g.fill(); break;
        case 'star':
          for (var k = 0; k < 10; k++) { var rr = k % 2 ? r * 0.58 : r * 1.3, a = -Math.PI / 2 + k * Math.PI / 5; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
          g.closePath(); g.fill(); break;
        case 'heart':
          g.moveTo(0, r * 0.9); g.bezierCurveTo(-r * 1.7, -r * 0.1, -r * 0.8, -r * 1.4, 0, -r * 0.5);
          g.bezierCurveTo(r * 0.8, -r * 1.4, r * 1.7, -r * 0.1, 0, r * 0.9); g.fill(); break;
        case 'ring': g.lineWidth = Math.max(1, r * 0.22); g.arc(0, 0, r * 0.9, 0, TAU); g.stroke(); break;
        case 'line': g.lineWidth = Math.max(1, r * 0.18); g.lineCap = 'round'; g.moveTo(-r, 0); g.lineTo(r, 0); g.stroke(); break;
        default: g.arc(0, 0, r, 0, TAU); g.fill();
      }
    }
    var fxImgSrc = '', fxImgEl = null;
    function getFxImg(src) {
      if (!src) { fxImgSrc = ''; fxImgEl = null; return null; }
      if (src !== fxImgSrc) { fxImgSrc = src; fxImgEl = new Image(); fxImgEl.src = src; }
      return fxImgEl && fxImgEl.complete && fxImgEl.naturalWidth ? fxImgEl : null;
    }
    function dropP(i) { parts[i] = parts[parts.length - 1]; parts.pop(); }
    function frame(dt) {
      var f = cfg.fx, W = geom.W, bt = geom.top, bh = geom.bottom - geom.top;
      if (!ctx || W <= 0 || bh <= 0) return;
      var dpr = Math.min(2, window.devicePixelRatio || 1), key = W.toFixed(1) + '|' + bh.toFixed(1) + '|' + dpr;
      if (key !== skey) { skey = key; cvs.width = Math.round(W * dpr); cvs.height = Math.round(bh * dpr); cvs.style.width = W + 'px'; cvs.style.height = bh + 'px'; }
      if (bt !== ctop) { ctop = bt; cvs.style.top = bt + 'px'; }
      var bb = bt + bh;
      acc += f.rate * dt; var whole = Math.floor(acc); acc -= whole;
      for (var n = Math.min(40, whole); n > 0 && parts.length < MAXP; n--) spawn(f, W, bt, bb);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cvs.width, cvs.height);
      var shp = f.shape, pimg = getFxImg(f.img);
      if (f.img && !pimg) shp = null;
      for (var i = parts.length - 1; i >= 0; i--) {
        var p = parts[i]; p.age += dt;
        if (p.age >= p.life) { dropP(i); continue; }
        var t = p.age / p.life;
        p.vy += seqAt(f.gravitySeq, f.gravity, t, p.rv) * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.spin * dt;
        if (p.y < bt - 250 || p.y > bb + 250 || p.x < -250 || p.x > W + 250) { dropP(i); continue; }
        var size = seqAt(f.sizeSeq, f.size, t, p.rs);
        if (size < 0.3) continue;
        var a = clamp(seqAt(f.opacitySeq, f.opacity, t, p.ro), 0, 1);
        if (a <= 0.003) continue;
        var gl = clamp(seqAt(f.glowSeq, f.glow, t, p.rg), 0, 1);
        var c = colorAt(f.cstops, t);
        var col = 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a.toFixed(3) + ')';
        if (!shp && !pimg) continue;
        var rot = !pimg && shp === 'line' ? Math.atan2(p.vy, p.vx) : p.rot, cs = Math.cos(rot) * dpr, sn = Math.sin(rot) * dpr;
        ctx.setTransform(cs, sn, -sn, cs, p.x * dpr, (p.y - bt) * dpr);
        if (gl > 0.01) { ctx.shadowColor = col; ctx.shadowBlur = size * dpr * gl * 2.6; } else { ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; }
        if (pimg) {
          var iw = size, ih = size * pimg.naturalHeight / pimg.naturalWidth;
          ctx.globalAlpha = a; ctx.drawImage(pimg, -iw / 2, -ih / 2, iw, ih); ctx.globalAlpha = 1;
        } else drawShape(ctx, shp, size / 2, col);
      }
    }

    /* ---------- UI building blocks ---------- */
    function seg(opts, get, set) {
      var d = el('div', 'pfx-seg'); d.setAttribute('role', 'group');
      opts.forEach(function (o) {
        var b = el('button', null, o[1]); b.type = 'button'; b.setAttribute('aria-pressed', String(get() === o[0]));
        b.addEventListener('click', function () { set(o[0]); });
        d.appendChild(b);
      });
      return d;
    }
    function note(t) { return el('p', 'pfx-note', t); }
    function chk(label, get, set) {
      var l = el('label', 'pfx-chk'), i = document.createElement('input');
      i.type = 'checkbox'; i.checked = !!get();
      i.addEventListener('change', function () { set(i.checked); });
      l.appendChild(i); l.appendChild(document.createTextNode(label)); return l;
    }
    function colorField(get, set) {
      var r = el('div', 'pfx-row'), pick = document.createElement('input'), hex = document.createElement('input');
      pick.type = 'color'; hex.type = 'text'; hex.maxLength = 7; hex.className = 'pfx-hex'; hex.spellcheck = false;
      pick.setAttribute('aria-label', 'Color picker'); hex.setAttribute('aria-label', 'Hex color');
      r.show = function () { var v = safeHex(get(), '#000000'); pick.value = v; hex.value = v; };
      pick.addEventListener('input', function () { set(pick.value); hex.value = pick.value; });
      hex.addEventListener('change', function () {
        var v = hex.value.trim(); if (v[0] !== '#') v = '#' + v;
        if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) set(safeHex(v));
        r.show();
      });
      r.appendChild(pick); r.appendChild(hex); r.show(); return r;
    }
    function angleCtl(get, set) {
      var row = el('div', 'pfx-row'), dial = el('div', 'pfx-dial'), needle = el('i'), rng = document.createElement('input'), num = document.createElement('input'), drag = false;
      dial.appendChild(needle); dial.title = 'Drag to set the angle';
      rng.type = 'range'; rng.min = 0; rng.max = 359; rng.step = 1; rng.setAttribute('aria-label', 'Angle');
      num.type = 'number'; num.min = 0; num.max = 359; num.className = 'pfx-num'; num.setAttribute('aria-label', 'Angle in degrees');
      row.show = function () { var v = get(); needle.style.transform = 'rotate(' + v + 'deg)'; rng.value = v; num.value = v; };
      function put(v) { v = ((Math.round(+v || 0) % 360) + 360) % 360; set(v); row.show(); }
      function fromEv(e) { var r = dial.getBoundingClientRect(); put(Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) / DEG); }
      dial.addEventListener('pointerdown', function (e) { drag = true; dial.setPointerCapture(e.pointerId); fromEv(e); e.preventDefault(); });
      dial.addEventListener('pointermove', function (e) { if (drag) fromEv(e); });
      dial.addEventListener('pointerup', function () { drag = false; });
      dial.addEventListener('pointercancel', function () { drag = false; });
      rng.addEventListener('input', function () { put(rng.value); });
      num.addEventListener('change', function () { put(num.value); });
      row.appendChild(dial); row.appendChild(rng); row.appendChild(num); row.show(); return row;
    }

    /* Gradient stop bar: the two end stops are fixed (only their color can change) */
    function gradEditor(getStops, onChange) {
      var box = el('div', 'pfx-root'), wrap = el('div', 'pfx-bw'), bar = el('div', 'pfx-bar'), hs = el('div', 'pfx-hs');
      var sel = null, drag = null;
      wrap.appendChild(bar); wrap.appendChild(hs); box.appendChild(wrap);
      var fields = el('div', 'pfx-row'), pos = document.createElement('input'), del = el('button', 'pfx-chip', 'Delete');
      var cf = colorField(function () { return sel ? sel.c : '#000000'; }, function (v) { if (sel) { sel.c = v; paint(); onChange(); } });
      pos.type = 'number'; pos.className = 'pfx-num'; pos.min = 1; pos.max = 99; pos.setAttribute('aria-label', 'Stop position (%)'); pos.title = 'Position (%)';
      del.type = 'button';
      fields.appendChild(cf); fields.appendChild(pos); fields.appendChild(del);
      box.appendChild(fields);
      box.appendChild(note('Click the bar to add a color stop and drag it to move. The two end points are fixed, only their color can change.'));

      function stops() { return getStops(); }
      function isEnd(s) { var a = stops(); return s === a[0] || s === a[a.length - 1]; }
      function sortS() { stops().sort(function (x, y) { return x.p - y.p; }); }
      function sync() {
        if (!sel || stops().indexOf(sel) < 0) sel = stops()[0];
        cf.show(); var e = isEnd(sel); pos.value = sel.p; pos.disabled = e; del.disabled = e;
      }
      function paint(focusSel) {
        bar.style.background = cssGrad(stops(), 90); hs.innerHTML = '';
        stops().forEach(function (s, i) {
          var e = isEnd(s), h = el('button', 'pfx-h' + (e ? ' fixed' : '') + (s === sel ? ' sel' : ''));
          h.type = 'button'; h.style.left = s.p + '%'; h.style.background = s.c; h._s = s;
          h.setAttribute('aria-label', (e ? 'Fixed end color ' : 'Color stop ') + (i + 1) + ', ' + s.p + '%');
          if (e) h.title = 'Fixed end point (color only)';
          hs.appendChild(h);
          if (focusSel && s === sel) h.focus();
        });
        sync();
      }
      function posFrom(e, lo, hi) { var r = bar.getBoundingClientRect(); return clamp(Math.round((e.clientX - r.left) / Math.max(1, r.width) * 100), lo, hi); }
      function removeSel() {
        var a = stops(), i = a.indexOf(sel);
        if (i > 0 && i < a.length - 1) { a.splice(i, 1); sel = a[Math.max(0, i - 1)]; paint(); onChange(); }
      }
      wrap.addEventListener('pointerdown', function (e) {
        if (e.button > 0) return;
        var h = e.target.closest && e.target.closest('.pfx-h'), added = false;
        if (h) { sel = h._s; if (!isEnd(sel)) drag = sel; }
        else if (e.target === bar || e.target === hs) {
          var a = stops(); if (a.length >= 8) return;
          var p = posFrom(e, 2, 98), s = { p: p, c: r2h(colorAt(a, p / 100)) };
          a.push(s); sortS(); sel = s; drag = s; added = true;
        } else return;
        wrap.setPointerCapture(e.pointerId); paint(); if (added) onChange(); e.preventDefault();
      });
      wrap.addEventListener('pointermove', function (e) {
        if (!drag) return; var p = posFrom(e, 1, 99);
        if (p !== drag.p) { drag.p = p; sortS(); paint(); onChange(); }
      });
      function endDrag() { drag = null; }
      wrap.addEventListener('pointerup', endDrag); wrap.addEventListener('pointercancel', endDrag);
      hs.addEventListener('focusin', function (e) {
        var h = e.target.closest && e.target.closest('.pfx-h'); if (!h) return; sel = h._s;
        Array.prototype.forEach.call(hs.children, function (c) { c.classList.toggle('sel', c._s === sel); }); sync();
      });
      hs.addEventListener('keydown', function (e) {
        var h = e.target.closest && e.target.closest('.pfx-h'); if (!h) return; var s = h._s; sel = s;
        if (isEnd(s)) return;
        if (/^Arrow(Left|Right|Up|Down)$/.test(e.key)) {
          var d = (e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 1) * (e.shiftKey ? 5 : 1);
          s.p = clamp(s.p + d, 1, 99); sortS(); e.preventDefault(); paint(true); onChange();
        } else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeSel(); }
      });
      pos.addEventListener('change', function () {
        if (!sel || isEnd(sel)) return; sel.p = clamp(Math.round(+pos.value || sel.p), 1, 99); sortS(); paint(); onChange();
      });
      del.addEventListener('click', removeSel);
      box.reload = function () { sel = stops()[0]; paint(); };
      box.style.flex = '0 0 auto'; box.reload();
      return box;
    }

    function buildPage(root) {
      root.appendChild(seg([['solid', 'Solid color'], ['gradient', 'Gradient']], function () { return cfg.mode; }, function (v) { cfg.mode = v; changed(); build(root); }));
      if (cfg.mode === 'none') {
        root.appendChild(note('Pick a solid color or a gradient to change the page background. Settings are saved per document.'));
        return;
      }
      if (cfg.mode === 'solid') {
        var pal = el('div', 'pfx-pal'), cf;
        var mark = function () { Array.prototype.forEach.call(pal.children, function (b) { b.setAttribute('aria-pressed', String(b.title === safeHex(cfg.solid))); }); };
        PAL.forEach(function (c) {
          var b = el('button', 'pfx-sw'); b.type = 'button'; b.style.background = c; b.title = c; b.setAttribute('aria-label', c);
          b.addEventListener('click', function () { cfg.solid = c; mark(); cf.show(); changed(); });
          pal.appendChild(b);
        });
        cf = colorField(function () { return cfg.solid; }, function (v) { cfg.solid = v; mark(); changed(); });
        root.appendChild(pal); mark();
        root.appendChild(el('span', 'pfx-lab', 'Custom color')); root.appendChild(cf);
      } else {
        var prev = el('div', 'pfx-prev'), ang, ge;
        var paintPrev = function () { prev.style.background = cssGrad(cfg.stops, cfg.angle); };
        paintPrev();
        ge = gradEditor(function () { return cfg.stops; }, function () { paintPrev(); changed(); });
        ang = angleCtl(function () { return cfg.angle; }, function (v) { cfg.angle = v; paintPrev(); changed(); });
        root.appendChild(prev);
        root.appendChild(el('span', 'pfx-lab', 'Colors')); root.appendChild(ge);
        root.appendChild(el('span', 'pfx-lab', 'Angle')); root.appendChild(ang);
        root.appendChild(el('span', 'pfx-lab', 'Presets'));
        var gp = el('div', 'pfx-row');
        GPRESETS.forEach(function (g) {
          var b = el('button', 'pfx-gp'); b.type = 'button'; b.style.background = 'linear-gradient(' + g[2] + 'deg,' + g[0] + ',' + g[1] + ')';
          b.setAttribute('aria-label', 'Gradient preset ' + g[0] + ' to ' + g[1]);
          b.addEventListener('click', function () {
            cfg.stops = [{ p: 0, c: g[0] }, { p: 100, c: g[1] }]; cfg.angle = g[2];
            paintPrev(); ge.reload(); ang.show(); changed();
          });
          gp.appendChild(b);
        });
        root.appendChild(gp);
      }
      root.appendChild(chk('Auto text color on dark pages', function () { return cfg.autoText; }, function (v) { cfg.autoText = v; changed(); }));
      var rb = el('button', 'pfx-chip', 'Reset page color'); rb.type = 'button';
      rb.addEventListener('click', function () { cfg.mode = 'solid'; cfg.solid = '#ffffff'; changed(); build(root); });
      root.appendChild(rb);
    }
    var fxRib = null, fxOnBtn = null, clrChip = null, seqKey = null, popSeq, seqRoot, popClr, clrRoot;
    function fmtN(v) { return String(Math.round(v * 100) / 100); }
    function pfxField(label, nodes) {
      var w = el('div', 'pfx-fl'), r = el('div', 'pfx-fr');
      w.appendChild(el('span', 'pfx-lab', label)); nodes.forEach(function (n) { r.appendChild(n); }); w.appendChild(r); return w;
    }
    function pfxDots(label, fn) {
      var b = el('button', 'pfx-dots', '⋯'); b.type = 'button'; b.title = label; b.setAttribute('aria-label', label); b.setAttribute('data-pop', '');
      b.addEventListener('click', function () { fn(b); }); return b;
    }
    function buildFxRib() {
      var root = fxRib; if (!root) return;
      root.innerHTML = '';
      var f = cfg.fx;
      function grp(label) { var g = el('div', 'rg'), c = el('div', 'rc'); g.appendChild(c); g.appendChild(el('span', 'rl', label)); root.appendChild(g); return c; }
      function num(key, label, seqOn, pairKey) {
        var sp = SPEC[key], i = document.createElement('input');
        i.type = 'number'; i.className = 'pfx-num'; i.min = sp.min; i.max = sp.max; i.step = sp.int ? 1 : sp.step; i.setAttribute('aria-label', label);
        if (seqOn) { i.disabled = true; i.placeholder = 'curve'; i.title = 'Driven by the curve (⋯)'; } else i.value = f[key];
        i.addEventListener('change', function () {
          var v = parseFloat(String(i.value).replace(',', '.'));
          f[key] = clampSpec(key, isFinite(v) ? v : f[key]); i.value = f[key];
          var fix = false;
          if (pairKey) {
            var lo = /Min$/.test(key) ? key : pairKey, hi = lo === key ? pairKey : key;
            if (f[lo] > f[hi]) { if (lo === key) f[hi] = f[lo]; else f[lo] = f[hi]; fix = true; }
          }
          changed(); if (fix) buildFxRib();
        });
        return i;
      }
      function range(label, base) {
        var mn = num(base + 'Min', label + ' min', false, base + 'Max'), mx = num(base + 'Max', label + ' max', false, base + 'Min');
        mn.title = 'Min'; mx.title = 'Max';
        return pfxField(label, [mn, el('span', 'pfx-lab', '–'), mx]);
      }
      function seqf(label, key) {
        return pfxField(label, [num(key, label, !!f[key + 'Seq']), pfxDots(label + ' over lifetime', function (b) { openSeq(key, label, b); })]);
      }
      function self(label, opts, key) {
        var s = document.createElement('select'); s.style.width = '136px'; s.setAttribute('aria-label', label);
        opts.forEach(function (o) { var op = document.createElement('option'); op.value = o[0]; op.textContent = o[1]; s.appendChild(op); });
        s.value = f[key]; s.addEventListener('change', function () { f[key] = s.value; changed(); });
        return pfxField(label, [s]);
      }
      function imgField() {
        var th = el('button', 'pfx-imgth'); th.type = 'button'; th.title = 'Choose an image for the particles';
        th.setAttribute('aria-label', 'Choose particle image');
        if (f.img) th.style.backgroundImage = 'url(' + f.img + ')'; else th.textContent = '★';
        var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/png,image/jpeg,image/webp,image/gif'; inp.hidden = true;
        function pick() { inp.click(); }
        th.addEventListener('click', pick);
        inp.addEventListener('change', function () {
          var file = inp.files && inp.files[0]; inp.value = ''; if (!file) return;
          var url = URL.createObjectURL(file), im = new Image();
          im.onload = function () {
            var m = 128, k = Math.min(1, m / Math.max(im.naturalWidth, im.naturalHeight)), w = Math.max(1, Math.round(im.naturalWidth * k)), h = Math.max(1, Math.round(im.naturalHeight * k));
            var cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.getContext('2d').drawImage(im, 0, 0, w, h);
            URL.revokeObjectURL(url);
            try { f.img = cv.toDataURL('image/png'); f.on = true; changed(); buildFxRib(); } catch (e) { }
          };
          im.onerror = function () { URL.revokeObjectURL(url); };
          im.src = url;
        });
        var pick2 = el('button', 'cb', f.img ? 'Change…' : 'Choose image…'); pick2.type = 'button'; pick2.addEventListener('click', pick);
        var nodes = [th, pick2, inp];
        if (f.img) { var rm = el('button', 'cb', 'Remove'); rm.type = 'button'; rm.addEventListener('click', function () { f.img = ''; changed(); buildFxRib(); }); nodes.push(rm); }
        return pfxField(f.img ? 'Image (default star)' : 'Image', nodes);
      }
      function dirField() {
        var dial = el('div', 'pfx-dial'), nd = el('i'), inp = num('dir', 'Direction', false), drag = false;
        dial.appendChild(nd); dial.title = 'Drag to set the direction (0° = up, clockwise)';
        function show() { nd.style.transform = 'rotate(' + f.dir + 'deg)'; inp.value = f.dir; }
        function put(v) { f.dir = ((Math.round(+v || 0) % 360) + 360) % 360; show(); changed(); }
        function fromEv(e) { var r = dial.getBoundingClientRect(); put(Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) / DEG); }
        dial.addEventListener('pointerdown', function (e) { drag = true; dial.setPointerCapture(e.pointerId); fromEv(e); e.preventDefault(); });
        dial.addEventListener('pointermove', function (e) { if (drag) fromEv(e); });
        dial.addEventListener('pointerup', function () { drag = false; });
        dial.addEventListener('pointercancel', function () { drag = false; });
        inp.addEventListener('change', function () { nd.style.transform = 'rotate(' + f.dir + 'deg)'; });
        show(); return pfxField('Direction (°)', [dial, inp]);
      }

      var c = grp('Particle effects');
      fxOnBtn = el('button', 'cb', 'Particles'); fxOnBtn.type = 'button'; fxOnBtn.setAttribute('aria-pressed', String(!!f.on));
      if (reduced()) fxOnBtn.title = 'Your system has "reduce motion" turned on, so the particle animation is paused.';
      fxOnBtn.addEventListener('click', function () { f.on = !f.on; changed(); });
      c.appendChild(fxOnBtn);
      if (reduced()) c.appendChild(el('span', 'pfx-lab', 'Paused (reduce motion)'));

      c = grp('Particle image');
      c.appendChild(imgField());
      c.appendChild(self('Emit from', EMITS, 'emit'));

      c = grp('Emitter');
      c.appendChild(pfxField('Rate (/s)', [num('rate', 'Rate', false)]));
      c.appendChild(range('Lifetime (s)', 'life'));
      c.appendChild(range('Speed (px/s)', 'speed'));
      c.appendChild(seqf('Gravity', 'gravity'));

      c = grp('Direction');
      c.appendChild(dirField());
      c.appendChild(pfxField('Spread (°)', [num('spread', 'Spread', false)]));

      c = grp('Particle');
      c.appendChild(seqf('Size (px)', 'size'));
      c.appendChild(seqf('Opacity (0–1)', 'opacity'));
      c.appendChild(seqf('Glow (0–1)', 'glow'));
      c.appendChild(range('Rotation (°)', 'rot'));
      c.appendChild(range('Rotation speed (°/s)', 'spin'));

      c = grp('Color');
      clrChip = el('button', 'pfx-cchip'); clrChip.type = 'button'; clrChip.setAttribute('data-pop', ''); clrChip.setAttribute('aria-label', 'Particle color over lifetime');
      clrChip.style.background = cssGrad(f.cstops, 90);
      clrChip.addEventListener('click', function () { openClr(clrChip); });
      c.appendChild(pfxField('Over lifetime', [clrChip, pfxDots('Edit color gradient', openClr)]));
    }

    function openClr(anchor) {
      if (app.openPopEl === popClr) { closePop(); return; }
      closePop(); clrRoot.innerHTML = '';
      clrRoot.appendChild(el('div', 'pfx-h3', 'Color over lifetime'));
      clrRoot.appendChild(gradEditor(function () { return cfg.fx.cstops; }, function () {
        if (clrChip) clrChip.style.background = cssGrad(cfg.fx.cstops, 90);
        changed();
      }));
      showPop(popClr, anchor);
    }

    /* time / value graph, like a Roblox NumberSequence */
    function openSeq(key, label, anchor) {
      if (app.openPopEl === popSeq && seqKey === key) { closePop(); return; }
      closePop(); seqKey = key;
      var f = cfg.fx, sp = SPEC[key], sk = key + 'Seq', NS = 'http://www.w3.org/2000/svg';
      var pts = f[sk] ? clone(f[sk]) : [{ t: 0, v: f[key], e: 0 }, { t: 1, v: f[key], e: 0 }];
      var sel = pts[0], wasSeq = !!f[sk], drag = false;
      var W = 280, H = 146, X0 = 32, X1 = 272, Y0 = 10, Y1 = 126;
      seqRoot.innerHTML = '';
      seqRoot.appendChild(el('div', 'pfx-h3', label + ' over lifetime'));
      var svgEl = document.createElementNS(NS, 'svg');
      svgEl.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svgEl.setAttribute('role', 'img'); svgEl.setAttribute('aria-label', 'Time / value graph');
      svgEl.style.cssText = 'width:100%;display:block;touch-action:none;cursor:crosshair';
      seqRoot.appendChild(svgEl);

      function mkIn(min, max, step) { var i = document.createElement('input'); i.type = 'number'; i.className = 'pfx-num'; i.min = min; i.max = max; i.step = step; return i; }
      var tIn = mkIn(0, 1, 0.01), vIn = mkIn(sp.min, sp.max, sp.int ? 1 : 0.01), eIn = mkIn(0, sp.max - sp.min, sp.int ? 1 : 0.01);
      tIn.setAttribute('aria-label', 'Time'); vIn.setAttribute('aria-label', 'Value'); eIn.setAttribute('aria-label', 'Envelope');
      var del = el('button', 'pfx-chip', 'Delete point'); del.type = 'button';
      var fr = el('div', 'pfx-row');
      fr.appendChild(pfxField('Time', [tIn])); fr.appendChild(pfxField('Value', [vIn])); fr.appendChild(pfxField('Envelope ±', [eIn]));
      seqRoot.appendChild(fr);
      var br = el('div', 'pfx-row'), cst = el('button', 'pfx-chip', 'Use constant value'); cst.type = 'button';
      br.appendChild(del); br.appendChild(cst); seqRoot.appendChild(br);
      seqRoot.appendChild(el('p', 'pfx-note', 'Click the graph to add a point, drag to move it. Time 0 is when a particle is born, 1 is the end of its life. Envelope gives each particle a random offset of up to ± that value.'));

      function lohi() {
        var lo = sp.glo, hi = sp.ghi;
        pts.forEach(function (q) { lo = Math.min(lo, q.v - q.e); hi = Math.max(hi, q.v + q.e); });
        lo = Math.max(lo, sp.min); hi = Math.min(hi, sp.max); if (hi - lo < 1e-6) hi = lo + 1; return [lo, hi];
      }
      function isEnd(q) { return q === pts[0] || q === pts[pts.length - 1]; }
      function loc(e) { var r = svgEl.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; }
      function valAt(y) { var r = lohi(); return clampSpec(key, r[0] + (Y1 - y) / (Y1 - Y0) * (r[1] - r[0])); }
      function timeAt(x) { return Math.round((x - X0) / (X1 - X0) * 100) / 100; }
      function commit() { f[sk] = pts; if (!wasSeq) { wasSeq = true; buildFxRib(); } changed(); }
      function sync() {
        var e = isEnd(sel);
        tIn.value = sel.t; tIn.disabled = e; vIn.value = sel.v; eIn.value = sel.e; del.disabled = e;
      }
      function draw() {
        var r = lohi(), lo = r[0], hi = r[1];
        function xOf(t) { return X0 + t * (X1 - X0); }
        function yOf(v) { return Y1 - (v - lo) / (hi - lo) * (Y1 - Y0); }
        function mk(tag, attrs) { var n = document.createElementNS(NS, tag); for (var k in attrs) n.setAttribute(k, attrs[k]); svgEl.appendChild(n); return n; }
        svgEl.innerHTML = '';
        mk('rect', { x: X0, y: Y0, width: X1 - X0, height: Y1 - Y0, style: 'fill:var(--bg);stroke:var(--line)' });
        [0.25, 0.5, 0.75].forEach(function (g) {
          mk('line', { x1: xOf(g), x2: xOf(g), y1: Y0, y2: Y1, style: 'stroke:var(--line);opacity:.6' });
          mk('line', { x1: X0, x2: X1, y1: Y0 + g * (Y1 - Y0), y2: Y0 + g * (Y1 - Y0), style: 'stroke:var(--line);opacity:.6' });
        });
        var lab = 'fill:var(--muted);font-size:9px';
        mk('text', { x: X0 - 4, y: Y0 + 3, 'text-anchor': 'end', style: lab }).textContent = fmtN(hi);
        mk('text', { x: X0 - 4, y: Y1, 'text-anchor': 'end', style: lab }).textContent = fmtN(lo);
        mk('text', { x: X0, y: H - 4, 'text-anchor': 'start', style: lab }).textContent = '0';
        mk('text', { x: xOf(0.5), y: H - 4, 'text-anchor': 'middle', style: lab }).textContent = 'time';
        mk('text', { x: X1, y: H - 4, 'text-anchor': 'end', style: lab }).textContent = '1';
        if (pts.some(function (q) { return q.e > 0; })) {
          var d = pts.map(function (q, i) { return (i ? 'L' : 'M') + xOf(q.t) + ' ' + clamp(yOf(q.v + q.e), Y0, Y1); }).join('') +
            pts.slice().reverse().map(function (q) { return 'L' + xOf(q.t) + ' ' + clamp(yOf(q.v - q.e), Y0, Y1); }).join('') + 'Z';
          mk('path', { d: d, style: 'fill:var(--accent);opacity:.18;stroke:none' });
        }
        mk('polyline', { points: pts.map(function (q) { return xOf(q.t) + ',' + yOf(q.v); }).join(' '), style: 'fill:none;stroke:var(--accent);stroke-width:2' });
        pts.forEach(function (q, i) {
          var h = mk('circle', { cx: xOf(q.t), cy: yOf(q.v), r: q === sel ? 6 : 5, 'data-i': i, style: 'fill:' + (q === sel ? 'var(--accent)' : 'var(--chrome)') + ';stroke:var(--accent);stroke-width:2;cursor:grab' });
        });
      }
      svgEl.addEventListener('pointerdown', function (e) {
        var h = e.target.getAttribute && e.target.getAttribute('data-i');
        if (h !== null && h !== undefined) sel = pts[+h];
        else {
          var m = loc(e); if (m.x < X0 - 2 || m.x > X1 + 2 || m.y < Y0 - 4 || m.y > Y1 + 4 || pts.length >= 16) return;
          var t = clamp(timeAt(m.x), 0.01, 0.99), near = pts.filter(function (q) { return Math.abs(q.t - t) < 0.02; })[0];
          if (near) sel = near;
          else { var q = { t: t, v: valAt(m.y), e: 0 }; pts.push(q); pts.sort(function (a, b) { return a.t - b.t; }); sel = q; commit(); }
        }
        drag = true; svgEl.setPointerCapture(e.pointerId); sync(); draw(); e.preventDefault();
      });
      svgEl.addEventListener('pointermove', function (e) {
        if (!drag) return; var m = loc(e), i = pts.indexOf(sel);
        if (i > 0 && i < pts.length - 1) sel.t = clamp(timeAt(m.x), pts[i - 1].t + 0.01, pts[i + 1].t - 0.01);
        sel.v = valAt(m.y); commit(); sync(); draw();
      });
      svgEl.addEventListener('pointerup', function () { drag = false; });
      svgEl.addEventListener('pointercancel', function () { drag = false; });
      tIn.addEventListener('change', function () {
        var i = pts.indexOf(sel); if (isEnd(sel)) { sync(); return; }
        sel.t = clamp(Math.round((parseFloat(tIn.value) || 0) * 100) / 100, pts[i - 1].t + 0.01, pts[i + 1].t - 0.01); commit(); sync(); draw();
      });
      vIn.addEventListener('change', function () { var v = parseFloat(String(vIn.value).replace(',', '.')); if (isFinite(v)) sel.v = clampSpec(key, v); commit(); sync(); draw(); });
      eIn.addEventListener('change', function () {
        var v = parseFloat(String(eIn.value).replace(',', '.')); if (!isFinite(v) || v < 0) v = 0;
        sel.e = sp.int ? Math.round(v) : Math.round(v * 100) / 100; commit(); sync(); draw();
      });
      del.addEventListener('click', function () {
        var i = pts.indexOf(sel); if (isEnd(sel)) return;
        pts.splice(i, 1); sel = pts[Math.max(0, i - 1)]; commit(); sync(); draw();
      });
      cst.addEventListener('click', function () { f[key] = clampSpec(key, pts[0].v); f[sk] = null; changed(); buildFxRib(); closePop(); });
      sync(); draw(); showPop(popSeq, anchor);
    }

    var popPage, pageRoot;
    function mkPop() { var q = el('div', 'pop pfx-pop'), r = el('div', 'pfx-root'); q.hidden = true; q.appendChild(r); document.body.appendChild(q); return [q, r]; }
    function repos(pop) { if (app.openPopEl === pop && app.openAnchor) { var r = app.openAnchor.getBoundingClientRect(); pop.style.top = Math.max(8, Math.min(r.bottom + 6, innerHeight - pop.offsetHeight - 8)) + 'px'; } }
    function build(root) { root.innerHTML = ''; buildPage(root); repos(root.parentNode); }
    function syncRib() {
      $('#pfxAuto').checked = !!cfg.autoText;
      if (fxOnBtn) fxOnBtn.setAttribute('aria-pressed', String(!!cfg.fx.on));
    }
    function onDoc() {
      if (savePending) persist();
      curId = docId(); cfg = getCfg(curId); parts.length = 0;
      if (app.openPopEl === popPage || app.openPopEl === popSeq || app.openPopEl === popClr) closePop();
      apply(); syncRib(); buildFxRib();
    }
    var ro = null;
    if (window.ResizeObserver) { var roRaf = 0; ro = new ResizeObserver(function () { if (roRaf) return; roRaf = requestAnimationFrame(function () { roRaf = 0; place(); }); }); ro.observe(ed); ro.observe(scroller); }
    window.addEventListener('resize', place);
    (function init() {
      var a = mkPop(), b = mkPop(), c = mkPop(); popPage = a[0]; pageRoot = a[1]; popSeq = b[0]; seqRoot = b[1]; popClr = c[0]; clrRoot = c[1];
      fxRib = $('#pfxFxRib'); buildFxRib(); syncRib();
      $('#pfxPageMore').addEventListener('click', function () {
        if (cfg.mode === 'none') { cfg.mode = 'solid'; cfg.solid = '#ffffff'; changed(); }
        build(pageRoot); showPop(popPage, this);
      });
      $('#pfxAuto').addEventListener('change', function () { cfg.autoText = this.checked; changed(); });
      $$('[data-rt]').forEach(function (t) {
        t.addEventListener('click', function () {
          closePop(); $$('[data-rt]').forEach(function (x) { x.setAttribute('aria-selected', String(x === t)); });
          $('#toolbar').hidden = t.dataset.rt !== 'home'; $('#ribPage').hidden = t.dataset.rt !== 'page'; $('#ribAnim').hidden = t.dataset.rt !== 'anim';
        });
      });
    })();
    this._api = { onDoc: onDoc };
  }
  onDocChange() { if (this._api) this._api.onDoc(); }
}
Nexus.PageFX = PageFX;
})();
