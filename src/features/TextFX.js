/* TextFX — built-in feature. Logic moved verbatim from the old monolith; see Feature.js for the lifecycle. */
(function () {
'use strict';
class TextFX extends Nexus.Feature {
  get id() { return 'textfx'; }
  init() {
    var app = this.app;

      var ED = document.getElementById('editor');
      if (!ED || !ED.animate) return;

      var SK = 'vb.nxfx';
      var DEAD = false, ON = true, busy = false, composing = false;

      function clone(o) { return JSON.parse(JSON.stringify(o)); }
      function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
      function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
      function prng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
      function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
      var SEG = (typeof Intl !== 'undefined' && Intl.Segmenter) ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
      function graphemes(s) {
        if (SEG) { var o = []; var it = SEG.segment(s); for (var x of it) o.push(x.segment); return o; }
        return s.match(/\P{M}\p{M}*/gu) || [];
      }

      function clusters(s) {
        var out = [], lead = '';
        graphemes(s).forEach(function (x) {
          if (/^\s+$/.test(x)) { if (out.length) out[out.length - 1] += x; else lead += x; }
          else { out.push(lead + x); lead = ''; }
        });
        if (!out.length && lead) out.push(lead);
        return out;
      }
      var L = [];
      function on(t, ev, fn, opt) { t.addEventListener(ev, fn, opt); L.push([t, ev, fn, opt]); }

      var cfg = {};
      try { cfg = JSON.parse(localStorage.getItem(SK) || '{}') || {}; } catch (e) { cfg = {}; }
      function saveCfg() { try { localStorage.setItem(SK, JSON.stringify(cfg)); } catch (e) { } }
      function isOn() { return true; }

      function mkId() {
        var id; do { id = (100 + Math.floor(Math.random() * 900)) + '_' + (100 + Math.floor(Math.random() * 900)); } while (cfg[id] || RT[id]);
        return id;
      }
      function getId(e) {
        var s = e.style; if (!s) return null;
        var ml = s.marginLeft, va = s.verticalAlign;
        if (!/px$/.test(ml) || !/px$/.test(va)) return null;
        var a = Math.round(parseFloat(ml) * 1e6), b = Math.round(parseFloat(va) * 1e6);
        if (!(a >= 100 && a <= 999 && b >= 100 && b <= 999)) return null;
        return a + '_' + b;
      }
      function setMarker(e, id) {
        var p = id.split('_');
        e.style.setProperty('margin-left', (p[0] / 1e6).toFixed(6) + 'px');
        e.style.setProperty('vertical-align', (p[1] / 1e6).toFixed(6) + 'px');
        e.className = 'nx-c';
      }
      function clearMarker(e) {
        e.style.removeProperty('margin-left'); e.style.removeProperty('vertical-align');
        if (!e.getAttribute('style')) e.removeAttribute('style');
        e.classList.remove('nx-c', 'nx-ib'); if (!e.getAttribute('class')) e.removeAttribute('class');
      }
      function unwrap(s) { var p = s.parentNode; if (!p) return; while (s.firstChild) p.insertBefore(s.firstChild, s); p.removeChild(s); }
      function markerSpans() { return [].slice.call(ED.querySelectorAll('span[style*="vertical-align"]')).filter(function (s) { return getId(s); }); }
      function mkOf(node) {
        var e = node && node.nodeType === 3 ? node.parentElement : node;
        while (e && e !== ED) { if (e.tagName === 'SPAN' && getId(e)) return e; e = e.parentElement; }
        return null;
      }

      function offOf(n, o) { var r = document.createRange(); r.selectNodeContents(ED); try { r.setEnd(n, o); } catch (e) { return 0; } return r.toString().length; }
      function posAt(n) {
        var w = document.createTreeWalker(ED, NodeFilter.SHOW_TEXT), acc = 0, node, last = null;
        while ((node = w.nextNode())) { var l = node.nodeValue.length; if (n <= acc + l) return [node, n - acc]; acc += l; last = node; }
        return last ? [last, last.nodeValue.length] : [ED, 0];
      }
      function rangeOf(o) { var a = posAt(o.s), b = posAt(o.e), r = document.createRange(); r.setStart(a[0], a[1]); r.setEnd(b[0], b[1]); return r; }
      function textNodesIn(r) {
        var root = r.commonAncestorContainer; if (root.nodeType === 3) return [root];
        var out = [], w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: function (n) { return r.intersectsNode(n) ? 1 : 3; } });
        while (w.nextNode()) out.push(w.currentNode); return out;
      }

      function letterSpans(str, id) {
        var frag = document.createDocumentFragment(), spans = [];
        if (!str.trim()) return { frag: frag, spans: spans };
        clusters(str).forEach(function (g) { var s = document.createElement('span'); setMarker(s, id); s.textContent = g; frag.appendChild(s); spans.push(s); });
        return { frag: frag, spans: spans };
      }
      function normalize() {
        var sel = getSelection(), pts = null, remapped = false;
        if (document.activeElement === ED && sel.rangeCount) { var r0 = sel.getRangeAt(0); pts = [{ n: r0.startContainer, o: r0.startOffset }, { n: r0.endContainer, o: r0.endOffset }]; }
        markerSpans().forEach(function (S) {
          if (!S.isConnected) return;
          var id = getId(S); if (!id) return;
          if (!S.classList.contains('nx-c')) S.classList.add('nx-c');
          var txt = S.textContent;
          if (!txt) {
            if (S.querySelector('img,br')) return;
            if (sel.anchorNode && S.contains(sel.anchorNode)) return;
            S.remove(); return;
          }
          if (!txt.trim()) { clearMarker(S); if (!S.attributes.length) unwrap(S); remapped = !!pts; return; }
          if (S.childNodes.length === 1 && S.firstChild.nodeType === 3 && clusters(txt).length === 1) return;
          var texts = [], w = document.createTreeWalker(S, NodeFilter.SHOW_TEXT);
          while (w.nextNode()) { var T = w.currentNode; if (T.nodeValue && mkOf(T.parentElement) === S) texts.push(T); }
          texts.forEach(function (T) {
            if (!T.nodeValue.trim()) return;
            var made = letterSpans(T.nodeValue, id), g = clusters(T.nodeValue);
            if (pts) pts.forEach(function (p) {
              if (p.n !== T) return;
              var cum = 0, j;
              if (p.o === 0) { p.n = made.spans[0].firstChild; p.o = 0; remapped = true; return; }
              for (j = 0; j < g.length; j++) { if (p.o <= cum + g[j].length) { p.n = made.spans[j].firstChild; p.o = p.o - cum; remapped = true; return; } cum += g[j].length; }
            });
            T.parentNode.replaceChild(made.frag, T);
          });
          clearMarker(S); if (!S.attributes.length) unwrap(S);
        });
        if (remapped && pts) {
          try { var r = document.createRange(); r.setStart(pts[0].n, pts[0].o); r.setEnd(pts[1].n, pts[1].o); sel.removeAllRanges(); sel.addRange(r); } catch (e) { }
        }
      }

      function hex(c) { var m = /^#?([0-9a-f]{6})$/i.exec(c || ''); var n = parseInt(m ? m[1] : 'ffffff', 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
      function toHex(a) { return '#' + a.map(function (v) { return ('0' + Math.round(v).toString(16)).slice(-2); }).join(''); }
      function colorAt(stops, t) {
        var s = stops.slice().sort(function (a, b) { return a.t - b.t; });
        if (t <= s[0].t) return s[0].c;
        for (var i = 1; i < s.length; i++) if (t <= s[i].t) {
          var a = hex(s[i - 1].c), b = hex(s[i].c), k = (t - s[i - 1].t) / ((s[i].t - s[i - 1].t) || 1);
          return toHex([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]);
        }
        return s[s.length - 1].c;
      }

      function rgbaHex(c, a) { var h = hex(c); return 'rgba(' + h[0] + ',' + h[1] + ',' + h[2] + ',' + clamp(a, 0, 1).toFixed(3) + ')'; }
      function rgbaOf(col, a) {
        var m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s\/]+([\d.]+%?))?/.exec(col || '') || [], ba = 1;
        if (m[4] != null) ba = /%$/.test(m[4]) ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
        return 'rgba(' + Math.round(m[1] || 0) + ',' + Math.round(m[2] || 0) + ',' + Math.round(m[3] || 0) + ',' + clamp(a * ba, 0, 1).toFixed(3) + ')';
      }
      function R(k, l, min, max, step, u) { return { k: k, l: l, t: 'r', min: min, max: max, step: step, u: u || '' }; }
      function S(k, l, o, rr) { return { k: k, l: l, t: 's', o: o, rr: !!rr }; }
      function C(k, l, show) { return { k: k, l: l, t: 'c', show: show }; }
      function fixDef(c) { if (c && DEF[c.fx]) { if (!c.p) c.p = {}; Object.keys(DEF[c.fx]).forEach(function (k) { if (c.p[k] === undefined) c.p[k] = clone(DEF[c.fx][k]); }); } return c; }
      var SCOPE = [['char', 'Each letter'], ['all', 'Whole selection']];

      var DEF = {
        glitch: { noise: 50, rgb: 3, power: 50, speed: 1, mode: 'char', swap: 20, swapTime: 120, swapSet: 'mix' },
        wave: { mode: 'char', up: 6, down: 6, strength: 100, speed: 1 },
        shake: { mode: 'char', dir: 'both', amount: 3, speed: 1 },
        glow: { stops: [{ t: 0, c: '#00e5ff' }, { t: 0.5, c: '#b04dff' }, { t: 1, c: '#00e5ff' }], dur: 3, spread: 25, loop: 'loop', radius: 12, power: 80 },
        typewriter: { speed: 8, jitter: 30, hold: 1.5, gap: 0.5, erase: 'clear' },
        distort: { mode: 'char', axis: 'x', style: 'stretch', amount: 50, speed: 1 },
        zoom: { style: 'both', mode: 'char', amount: 40, speed: 1, fade: 'no' },
        ghost: { mode: 'char', count: 4, angle: 0, spread: 60, life: 1.6, speed: 30, alpha: 60, blur: 1.5 },
        mouse: { type: 'attract', scope: 'char', amount: 14, strength: 60 },
        fade: { dir: 'both', power: 70, speed: 1, mode: 'char' },
        color: { stops: [{ t: 0, c: '#ff2d55' }, { t: 0.5, c: '#2d7bff' }, { t: 1, c: '#ff2d55' }], dur: 4, spread: 30, loop: 'loop' }
      };

      var FX = {
        glitch: {
          name: 'Glitch',
          params: [R('noise', 'Noise', 0, 100, 1, '%'), R('rgb', 'RGB split width', 0, 12, 0.5, 'px'), R('swap', 'Character swap', 0, 100, 1, '%'), R('swapTime', 'Swap duration', 30, 600, 10, 'ms'), S('swapSet', 'Swap characters', [['mix', 'Mixed'], ['sym', 'Symbols'], ['alpha', 'Letters']]), R('power', 'Intensity', 0, 100, 1, '%'), R('speed', 'Speed', 0.2, 4, 0.1, '×'), S('mode', 'Apply to', SCOPE)],
          build: function (els, c, id) {
            var p = c.p, dur = 1500 / p.speed, N = 24, base = hash(id);
            function frames(rnd) {
              var kf = [];
              for (var k = 0; k < N; k++) {
                var g = rnd() < p.noise / 100 * 0.55;
                var sh = p.rgb * (g ? (0.6 + rnd() * 0.9) : 0.3);
                var dx = g ? (rnd() * 2 - 1) * p.power * 0.14 : 0, dy = g ? (rnd() * 2 - 1) * p.power * 0.05 : 0;
                kf.push({
                  offset: k / N, left: dx.toFixed(2) + 'px', top: dy.toFixed(2) + 'px', opacity: (g && rnd() < 0.25) ? 0.7 : 1,
                  textShadow: sh < 0.05 ? 'none' : (-sh).toFixed(2) + 'px 0 rgba(255,0,60,.9),' + sh.toFixed(2) + 'px 0 rgba(0,220,255,.9)',
                  easing: 'steps(1,end)'
                });
              }
              var f = Object.assign({}, kf[0]); f.offset = 1; delete f.easing; kf.push(f); return kf;
            }
            var shared = c.p.mode === 'all' ? frames(prng(base)) : null;
            return els.map(function (e, i) {
              var r = prng(base + i * 977), kf = shared || frames(r);
              return { el: e, kf: kf, opt: { duration: dur, iterations: Infinity, delay: shared ? 0 : -r() * dur } };
            });
          }
        },
        wave: {
          name: 'Wave',
          params: [S('mode', 'Apply to', SCOPE), R('up', 'Height (up)', 0, 40, 1, 'px'), R('down', 'Depth (down)', 0, 40, 1, 'px'), R('strength', 'Intensity', 0, 200, 5, '%'), R('speed', 'Speed', 0.2, 4, 0.1, '×')],
          build: function (els, c) {
            var p = c.p, period = 1600 / p.speed, up = p.up * p.strength / 100, dn = p.down * p.strength / 100, N = 24, kf = [];
            for (var k = 0; k <= N; k++) { var s = Math.sin(2 * Math.PI * k / N); kf.push({ offset: k / N, top: (s >= 0 ? -up * s : -dn * s).toFixed(2) + 'px' }); }
            return els.map(function (e, i) { return { el: e, kf: kf, opt: { duration: period, iterations: Infinity, delay: p.mode === 'all' ? 0 : -((i * 0.09) % 1) * period } }; });
          }
        },
        shake: {
          name: 'Shake',
          params: [S('mode', 'Apply to', SCOPE), S('dir', 'Direction', [['both', 'Both'], ['x', 'Horizontal'], ['y', 'Vertical']]), R('amount', 'Distance', 0, 20, 0.5, 'px'), R('speed', 'Speed', 0.2, 4, 0.1, '×')],
          build: function (els, c, id) {
            var p = c.p, dur = 700 / p.speed, N = 16, base = hash(id);
            function frames(rnd) {
              var kf = [];
              for (var k = 0; k < N; k++) {
                var dx = p.dir === 'y' ? 0 : (rnd() * 2 - 1) * p.amount, dy = p.dir === 'x' ? 0 : (rnd() * 2 - 1) * p.amount;
                kf.push({ offset: k / N, left: dx.toFixed(2) + 'px', top: dy.toFixed(2) + 'px' });
              }
              var f = Object.assign({}, kf[0]); f.offset = 1; kf.push(f); return kf;
            }
            var shared = p.mode === 'all' ? frames(prng(base)) : null;
            return els.map(function (e, i) {
              var r = prng(base + i * 977), kf = shared || frames(r);
              return { el: e, kf: kf, opt: { duration: dur, iterations: Infinity, delay: shared ? 0 : -r() * dur } };
            });
          }
        },
        glow: {
          name: 'Glow', timeline: true,
          params: [R('radius', 'Glow size', 0, 60, 1, 'px'), R('power', 'Intensity', 0, 100, 1, '%'), R('dur', 'Loop length', 1, 20, 0.5, 's'), R('spread', 'Letter offset', 0, 100, 1, '%'), S('loop', 'Playback', [['loop', 'Loop'], ['pingpong', 'Back and forth']])],
          build: function (els, c) {
            var p = c.p, st = clone(p.stops).sort(function (a, b) { return a.t - b.t; }), n = els.length || 1, dur = p.dur * 1000, a = p.power / 100, r = p.radius;
            function sh(col) { return '0 0 ' + (r * 0.4).toFixed(1) + 'px ' + rgbaHex(col, a) + ', 0 0 ' + (r * 0.9).toFixed(1) + 'px ' + rgbaHex(col, a * 0.9) + ', 0 0 ' + (r * 1.8).toFixed(1) + 'px ' + rgbaHex(col, a * 0.7); }
            var kf = st.map(function (s) { return { offset: clamp(s.t, 0, 1), textShadow: sh(s.c) }; });
            if (kf[0].offset > 0) kf.unshift({ offset: 0, textShadow: kf[0].textShadow });
            if (kf[kf.length - 1].offset < 1) kf.push({ offset: 1, textShadow: p.loop === 'pingpong' ? kf[kf.length - 1].textShadow : kf[0].textShadow });
            return els.map(function (e, i) { return { el: e, kf: kf, opt: { duration: dur, iterations: Infinity, direction: p.loop === 'pingpong' ? 'alternate' : 'normal', delay: -(i / n) * (p.spread / 100) * dur } }; });
          }
        },
        typewriter: {
          name: 'Typewriter',
          params: [R('speed', 'Typing speed', 1, 30, 0.5, '/s'), R('jitter', 'Randomness', 0, 100, 1, '%'), R('hold', 'Hold when done', 0, 10, 0.1, 's'), R('gap', 'Pause before restart', 0, 5, 0.1, 's'), S('erase', 'When finished', [['clear', 'Clear all at once'], ['back', 'Backspace']])],
          build: function (els, c, id) {
            var p = c.p, n = els.length, rnd = prng(hash(id)), per = 1000 / p.speed, jit = p.jitter / 100, t = [], acc = 0, i;
            for (i = 0; i < n; i++) { t.push(acc); acc += per * (1 + (rnd() * 2 - 1) * jit * 0.9); }
            var hold = p.hold * 1000, eraseStart = acc + hold, step = per * 0.5, e = [], eraseEnd;
            for (i = 0; i < n; i++) e.push(p.erase === 'back' ? eraseStart + (n - 1 - i) * step : eraseStart);
            eraseEnd = p.erase === 'back' ? eraseStart + n * step : eraseStart;
            var total = Math.max(1, eraseEnd + p.gap * 1000 + 2);
            function o(ms) { return clamp(ms / total, 0, 1); }
            return els.map(function (el, i) {
              var kf = [{ offset: 0, opacity: 0 }];
              if (t[i] > 0) kf.push({ offset: o(t[i]), opacity: 0 });
              kf.push({ offset: o(t[i] + 1), opacity: 1 }, { offset: o(e[i]), opacity: 1 }, { offset: o(e[i] + 1), opacity: 0 }, { offset: 1, opacity: 0 });
              return { el: el, kf: kf, opt: { duration: total, iterations: Infinity } };
            });
          }
        },
        distort: {
          name: 'Distortion', ib: true,
          params: [S('mode', 'Apply to', SCOPE), S('axis', 'Direction', [['x', 'Horizontal'], ['y', 'Vertical'], ['xy', 'Both']]), S('style', 'Style', [['stretch', 'Stretch'], ['skew', 'Skew'], ['both', 'Stretch + skew']]), R('amount', 'Amount', 0, 100, 1, '%'), R('speed', 'Speed', 0.2, 4, 0.1, '×')],
          build: function (els, c) {
            var p = c.p, per = 1800 / p.speed, A = p.amount / 100, N = 24, kf = [], hx = p.axis !== 'y', hy = p.axis !== 'x', both = p.axis === 'xy';
            for (var k = 0; k <= N; k++) {
              var s = Math.sin(2 * Math.PI * k / N), co = Math.cos(2 * Math.PI * k / N), ys = both ? co : s;
              var sc = 'scale(' + (hx ? 1 + 0.6 * A * s : 1).toFixed(3) + ',' + (hy ? 1 + 0.6 * A * ys : 1).toFixed(3) + ')';
              var sk = 'skew(' + (hx ? 30 * A * s : 0).toFixed(2) + 'deg,' + (hy ? 30 * A * ys : 0).toFixed(2) + 'deg)';
              kf.push({ offset: k / N, transform: p.style === 'stretch' ? sc : (p.style === 'skew' ? sk : sc + ' ' + sk) });
            }
            return els.map(function (e, i) { return { el: e, kf: kf, opt: { duration: per, iterations: Infinity, delay: p.mode === 'all' ? 0 : -((i * 0.08) % 1) * per } }; });
          }
        },
        zoom: {
          name: 'Zoom in / out', ib: true,
          params: [S('style', 'Style', [['both', 'Zoom in and out'], ['in', 'Zoom in'], ['out', 'Zoom out']]), S('mode', 'Apply to', SCOPE), R('amount', 'Amount', 0, 200, 5, '%'), R('speed', 'Speed', 0.2, 4, 0.1, '×'), S('fade', 'Fade while zooming', [['no', 'No'], ['yes', 'Yes']])],
          build: function (els, c) {
            var p = c.p, A = p.amount / 100, per = (p.style === 'both' ? 1800 : 2200) / p.speed, fade = p.fade === 'yes', all = p.mode === 'all', kf = [], N = 24, k;
            if (p.style === 'both') {
              /* breathing: grows up to +amount, shrinks down to -amount (never below 5% size) */
              for (k = 0; k <= N; k++) {
                var s = Math.sin(2 * Math.PI * k / N), sc = 1 + (s >= 0 ? A : Math.min(A, 0.95)) * s, f = { offset: k / N, transform: 'scale(' + sc.toFixed(3) + ')' };
                if (fade) f.opacity = (1 - 0.5 * Math.abs(s)).toFixed(3);
                kf.push(f);
              }
            } else {
              /* zoom in: starts small and grows to normal size. zoom out: starts big and shrinks to normal size */
              var from = p.style === 'in' ? Math.max(0.02, 1 - Math.min(A, 1)) : 1 + A, ease = 'cubic-bezier(.2,.8,.2,1)';
              var a0 = { offset: 0, transform: 'scale(' + from.toFixed(3) + ')', easing: ease }, a1 = { offset: 0.45, transform: 'scale(1)' }, a2 = { offset: 1, transform: 'scale(1)' };
              if (fade) { a0.opacity = 0; a1.opacity = 1; a2.opacity = 1; }
              kf = [a0, a1, a2];
            }
            /* whole selection: every letter scales around the center of the whole selection */
            var org = null;
            if (all && els.length) {
              var z = zoom(), L = 1e9, T = 1e9, Rr = -1e9, B = -1e9, rects = els.map(function (e) { return e.getBoundingClientRect(); });
              rects.forEach(function (rc) { L = Math.min(L, rc.left); Rr = Math.max(Rr, rc.right); T = Math.min(T, rc.top); B = Math.max(B, rc.bottom); });
              var cx = (L + Rr) / 2, cy = (T + B) / 2;
              org = rects.map(function (rc) { return ((cx - rc.left) / z).toFixed(1) + 'px ' + ((cy - rc.top) / z).toFixed(1) + 'px'; });
            }
            return els.map(function (e, i) {
              var fr = kf;
              if (org) fr = kf.map(function (x) { var y = Object.assign({}, x); y.transformOrigin = org[i]; return y; });
              return { el: e, kf: fr, opt: { duration: per, iterations: Infinity, delay: all ? 0 : -((i * 0.09) % 1) * per } };
            });
          }
        },
        ghost: {
          name: 'Ghost',
          params: [S('mode', 'Apply to', SCOPE), R('count', 'Ghost count', 1, 8, 1, ''), R('angle', 'Direction', 0, 360, 1, '°'), R('spread', 'Spread angle', 0, 360, 1, '°'), R('life', 'Lifetime', 0.3, 6, 0.1, 's'), R('speed', 'Fly speed', 5, 300, 5, 'px/s'), R('alpha', 'Opacity', 5, 100, 1, '%'), R('blur', 'Blur', 0, 10, 0.5, 'px')],
          build: function (els, c, id) {
            var p = c.p, n = clamp(Math.round(p.count), 1, 8), life = p.life * 1000, dist = p.speed * p.life, m = Math.max(2, Math.ceil(16 / n)), N = n * m, base = hash(id), a0 = p.alpha / 100;
            var dir = p.angle * Math.PI / 180, sp = p.spread * Math.PI / 180, ang = [], cache = {}, i;
            for (i = 0; i < n; i++) ang.push(dir + sp * ((i + 0.5) / n - 0.5));
            function frame(col, k, high) {
              var sh = [];
              for (var i = 0; i < n; i++) {
                var pn = (k + i * m) % N, ph = (pn === 0 && high && k > 0) ? 1 : pn / N;
                sh.push((Math.sin(ang[i]) * dist * ph).toFixed(2) + 'px ' + (-Math.cos(ang[i]) * dist * ph).toFixed(2) + 'px ' + p.blur.toFixed(1) + 'px ' + rgbaOf(col, a0 * Math.pow(1 - ph, 1.3)));
              }
              return sh.join(',');
            }
            function frames(col) {
              if (cache[col]) return cache[col];
              var kf = [];
              for (var k = 0; k <= N; k++) {
                var wraps = false;
                if (k > 0 && k < N) for (var i = 0; i < n; i++) if ((k + i * m) % N === 0) wraps = true;
                if (k === N || wraps) kf.push({ offset: k / N, textShadow: frame(col, k, true) });
                if (k < N) kf.push({ offset: k / N, textShadow: frame(col, k, false) });
              }
              return (cache[col] = kf);
            }
            var cols = els.map(function (e) { return getComputedStyle(e).color; });
            return els.map(function (e, i) {
              var r = prng(base + i * 977);
              return { el: e, kf: frames(cols[i]), opt: { duration: life, iterations: Infinity, delay: p.mode === 'all' ? 0 : -r() * life } };
            });
          }
        },
        mouse: {
          name: 'Mouse pull/push', dyn: true,
          params: [S('type', 'Type', [['attract', 'Attract'], ['repel', 'Repel']]), S('scope', 'Apply to', SCOPE), R('amount', 'Distance', 0, 60, 1, 'px'), R('strength', 'Intensity', 0, 100, 1, '%')]
        },
        fade: {
          name: 'Fade in / out',
          params: [S('dir', 'Style', [['both', 'In and out'], ['in', 'Fade in'], ['out', 'Fade out']]), S('mode', 'Apply to', SCOPE), R('power', 'Intensity', 0, 100, 1, '%'), R('speed', 'Speed', 0.2, 4, 0.1, '×')],
          build: function (els, c) {
            var p = c.p, per = 2400 / p.speed, mn = Math.max(0, 1 - p.power / 100), ease = 'ease-in-out', kf;
            if (p.dir === 'in') kf = [{ opacity: mn, offset: 0, easing: ease }, { opacity: 1, offset: 0.55 }, { opacity: 1, offset: 1 }];
            else if (p.dir === 'out') kf = [{ opacity: 1, offset: 0, easing: ease }, { opacity: mn, offset: 0.55 }, { opacity: mn, offset: 1 }];
            else kf = [{ opacity: 1, offset: 0, easing: ease }, { opacity: mn, offset: 0.5, easing: ease }, { opacity: 1, offset: 1 }];
            return els.map(function (e, i) { return { el: e, kf: kf, opt: { duration: per, iterations: Infinity, delay: p.mode === 'all' ? 0 : -((i * 0.07) % 1) * per } }; });
          }
        },
        color: {
          name: 'Color shift', timeline: true,
          params: [R('dur', 'Loop length', 1, 20, 0.5, 's'), R('spread', 'Letter offset', 0, 100, 1, '%'), S('loop', 'Playback', [['loop', 'Loop'], ['pingpong', 'Back and forth']])],
          build: function (els, c) {
            var p = c.p, st = clone(p.stops).sort(function (a, b) { return a.t - b.t; }), n = els.length || 1, dur = p.dur * 1000;
            var kf = st.map(function (s) { return { offset: clamp(s.t, 0, 1), color: s.c }; });
            if (kf[0].offset > 0) kf.unshift({ offset: 0, color: kf[0].color });
            if (kf[kf.length - 1].offset < 1) kf.push({ offset: 1, color: p.loop === 'pingpong' ? kf[kf.length - 1].color : kf[0].color });
            return els.map(function (e, i) { return { el: e, kf: kf, opt: { duration: dur, iterations: Infinity, direction: p.loop === 'pingpong' ? 'alternate' : 'normal', delay: -(i / n) * (p.spread / 100) * dur } }; });
          }
        }
      };
      var ORDER = ['glitch', 'wave', 'shake', 'glow', 'typewriter', 'distort', 'zoom', 'ghost', 'mouse', 'fade', 'color'];
      var cur = { fx: 'wave', t: 'auto', d: 2, p: clone(DEF.wave) };

      var RT = {}, hoverId = null, hoverT = 0, ptr = null, raf = 0;

      function collect() {
        var g = {};
        markerSpans().forEach(function (s) { if (!s.classList.contains('nx-c')) s.classList.add('nx-c'); var id = getId(s); (g[id] || (g[id] = [])).push(s); });
        return g;
      }
      function sameEls(a, b) { if (a.length !== b.length) return false; for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; }
      var IO = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          var h = en.target._nxh; if (!h) return;
          h.vis = en.isIntersecting;
          if (h.r.specs) sync1(h); else kick();
        });
      }, { rootMargin: '160px' });
      function sync1(h) {
        var r = h.r, spec = r.specs && r.specs[h.i], c = cfg[r.id]; if (!spec || !c) return;
        var a = r.anims[h.i];
        if (h.vis && !a) {
          a = spec.el.animate(spec.kf, spec.opt);
          if (c.t === 'auto') { try { a.startTime = 0; } catch (e) { } }
          r.anims[h.i] = a;
        } else if (!h.vis && a) { try { a.cancel(); } catch (e) { } r.anims[h.i] = null; }
      }
      function start(r) {
        var c = cfg[r.id]; if (!c || !FX[c.fx]) return;
        var F = FX[c.fx];
        if (F.ib) r.els.forEach(function (e) { e.classList.add('nx-ib'); });
        r.anims = []; r.specs = F.dyn ? null : F.build(r.els, c, r.id);
        if (F.dyn) r.disp = r.els.map(function () { return { x: 0, y: 0 }; });
        /* decide visibility right now (no waiting for IntersectionObserver), so effects start instantly */
        var vh = innerHeight + 160, vis = r.els.map(function (e) {
          if (F.dyn) return true;
          var rc = e.getBoundingClientRect(); return rc.bottom > -160 && rc.top < vh;
        });
        r.els.forEach(function (e, i) { e._nxh = { r: r, i: i, vis: vis[i] }; IO.observe(e); });
        if (!F.dyn) r.els.forEach(function (e) { if (e._nxh.vis) sync1(e._nxh); });
        if (c.fx === 'glitch') startSwap(r);
        if (F.dyn) kick();
      }
      function stop(r) {
        stopSwap(r);
        r.anims.forEach(function (a) { if (a) { try { a.cancel(); } catch (e) { } } }); r.anims = []; r.specs = null;
        r.els.forEach(function (e) {
          e.classList.remove('nx-ib');
          if (e._nxh) { IO.unobserve(e); e._nxh = null; }
          if (e._nxd) { try { e._nxd.cancel(); } catch (x) { } e._nxd = null; }
        });
        r.disp = null;
      }
      function deact(r) { var c = cfg[r.id]; r.active = false; if (c && FX[c.fx] && FX[c.fx].dyn) kick(); else stop(r); }
      function rebuild() {
        if (DEAD) return;
        if (!ON) { stopAll(); return; }
        var groups = collect();
        Object.keys(groups).forEach(function (id) {
          var c = fixDef(cfg[id]), els = groups[id], r = RT[id] || (RT[id] = { id: id, els: [], sig: '', active: false, anims: [], disp: null, timer: 0 });
          var sig = c ? JSON.stringify(c) + '|' + els.length : '';
          if (r.sig === sig && sameEls(r.els, els)) return;
          stop(r); r.els = els; r.sig = sig;
          if (!c) { r.active = false; return; }
          r.active = c.t === 'auto' || (c.t === 'hover' && hoverId === id) || (c.t === 'click' && r.active);
          if (r.active || (FX[c.fx] && FX[c.fx].dyn)) start(r);
        });
        Object.keys(RT).forEach(function (id) { if (!groups[id]) { stop(RT[id]); clearTimeout(RT[id].timer); delete RT[id]; } });
        kick();
      }
      function stopAll() { Object.keys(RT).forEach(function (id) { stop(RT[id]); clearTimeout(RT[id].timer); delete RT[id]; }); }
      function touch(id) { var r = RT[id]; if (r) r.sig = ''; rebuild(); var c = cfg[id]; if (c && c.t !== 'auto') play(id, 1800); }
      function play(id, ms) {
        var r = RT[id], c = cfg[id]; if (!r || !c) return;
        clearTimeout(r.timer);
        var dyn = FX[c.fx] && FX[c.fx].dyn;
        if (dyn) { r.active = true; if (!r.disp) start(r); }
        else if (!r.active || !r.specs) { stop(r); r.active = true; start(r); }
        kick();
        r.timer = setTimeout(function () {
          var cc = cfg[id]; if (!cc || cc.t === 'auto') return;
          if (cc.t === 'hover' && hoverId === id) return;
          deact(r);
        }, ms);
      }

      /* glitch: temporary character swap (overlay via ::after, the real text is never edited) */
      var GS = [], SETS = { sym: '█▓▒░#@%&$?!/\\<>*+=~^|', alpha: 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghkmnpqrstuvwxyz', mix: '█▓▒░#@%&$?!/<>*+=~0123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghkmnpqrstuvwxyz' };
      function clearGs(e) {
        clearTimeout(e._gt); e._gt = 0;
        if (e.classList.contains('nx-gs')) { e.classList.remove('nx-gs'); e.removeAttribute('data-g'); e.style.removeProperty('--gc'); e.style.removeProperty('--gsh'); }
        var i = GS.indexOf(e); if (i >= 0) GS.splice(i, 1);
      }
      function purgeGs() { [].slice.call(ED.querySelectorAll('.nx-gs')).forEach(function (e) { if (GS.indexOf(e) < 0) clearGs(e); }); }
      function swapEl(e, p) {
        if (e._gt) return;
        var g = graphemes(e.textContent)[0]; if (!g || !g.trim()) return;
        var pool = Array.from(SETS[p.swapSet] || SETS.mix), ch = g, n = 0;
        while (ch === g && n++ < 6) ch = pool[Math.floor(Math.random() * pool.length)];
        var cs = getComputedStyle(e);
        e.style.setProperty('--gc', cs.color); e.style.setProperty('--gsh', cs.textShadow);
        e.setAttribute('data-g', ch); e.classList.add('nx-gs'); GS.push(e);
        e._gt = setTimeout(function () { clearGs(e); }, p.swapTime * (0.6 + Math.random() * 0.8));
      }
      function stopSwap(r) { if (r.sw) { clearInterval(r.sw); r.sw = 0; } r.els.forEach(clearGs); }
      function startSwap(r) {
        var c0 = cfg[r.id]; if (!c0 || !(c0.p.swap > 0)) return;
        r.sw = setInterval(function () {
          var c = cfg[r.id]; if (!c || DEAD || !ON) return;
          var p = c.p, rate = p.swap / 100, vis = r.els.filter(function (e) { return e._nxh && e._nxh.vis; });
          if (!vis.length) return;
          if (p.mode === 'all') { if (Math.random() < rate * 1.5 * p.speed * 0.05) vis.forEach(function (e) { if (Math.random() < 0.4) swapEl(e, p); }); }
          else { var q = rate * 0.8 * p.speed * 0.05; vis.forEach(function (e) { if (Math.random() < q) swapEl(e, p); }); }
        }, 50);
      }

      /* mouse pull/push loop */
      function zoom() { var v = parseFloat(getComputedStyle(ED).getPropertyValue('--z')); return v > 0 ? v : 1; }
      function setOff(e, x, y) {
        var pa = e._nxd;
        if (Math.abs(x) < 0.02 && Math.abs(y) < 0.02) { if (pa) { pa.cancel(); e._nxd = null; } return; }
        if (pa && Math.abs(x - e._nxx) < 0.01 && Math.abs(y - e._nxy) < 0.01) return;
        var kf = { left: x.toFixed(2) + 'px', top: y.toFixed(2) + 'px' };
        var a = e.animate([kf, kf], { duration: 1, fill: 'both' });
        if (pa) pa.cancel(); e._nxd = a; e._nxx = x; e._nxy = y;
      }
      function kick() { if (!raf && !DEAD) raf = requestAnimationFrame(tick); }
      var lastTs = 0;
      function tick(ts) {
        raf = 0; if (DEAD || !ON) return;
        var dt = lastTs ? clamp((ts - lastTs) / 1000, 0.001, 0.05) : 1 / 60; lastTs = ts;
        var z = zoom(), any = false, jobs = [];
        Object.keys(RT).forEach(function (id) {
          var r = RT[id], c = cfg[id]; if (!c || c.fx !== 'mouse' || !r.els.length) return;
          if (!r.disp || r.disp.length !== r.els.length) r.disp = r.els.map(function () { return { x: 0, y: 0 }; });
          if (!(r.active || c.t === 'hover') && !r.disp.some(function (d) { return d.x || d.y; })) return;
          jobs.push(r);
        });
        jobs.forEach(function (r) { r.rects = r.els.map(function (e) { return ((e._nxh && e._nxh.vis) || e._nxd) ? e.getBoundingClientRect() : null; }); });
        jobs.forEach(function (r) {
          var p = cfg[r.id].p, Rr = 50 + p.strength * 2.2, k = 1 - Math.exp(-(10 + p.strength * 0.3) * dt), sgn = p.type === 'repel' ? -1 : 1;
          var live = (r.active || cfg[r.id].t === 'hover') && ptr, n = r.els.length, cx = [], cy = [], i;
          var L0 = 1e9, T0 = 1e9, R0 = -1e9, B0 = -1e9;
          for (i = 0; i < n; i++) {
            var rc = r.rects[i], d = r.disp[i]; if (!rc) continue;
            cx[i] = rc.left + rc.width / 2 - d.x * z; cy[i] = rc.top + rc.height / 2 - d.y * z;
            L0 = Math.min(L0, rc.left - d.x * z); R0 = Math.max(R0, rc.right - d.x * z); T0 = Math.min(T0, rc.top - d.y * z); B0 = Math.max(B0, rc.bottom - d.y * z);
          }
          var gx = (L0 + R0) / 2, gy = (T0 + B0) / 2, gt = null;
          function target(x, y, dist) {
            if (!live || dist >= Rr) return [0, 0];
            var vx = ptr.x - x, vy = ptr.y - y, vl = Math.hypot(vx, vy), f = 1 - dist / Rr; f = f * f * (3 - 2 * f);
            var sh = p.amount * f; if (sgn > 0) sh = Math.min(sh, vl / z);
            var ux = vl < 1 ? 0 : vx / vl, uy = vl < 1 ? (sgn < 0 ? -1 : 0) : vy / vl;
            return [ux * sh * sgn, uy * sh * sgn];
          }
          if (p.scope === 'all' && live && L0 < 1e8) {
            var ddx = Math.max(L0 - ptr.x, 0, ptr.x - R0), ddy = Math.max(T0 - ptr.y, 0, ptr.y - B0);
            gt = target(gx, gy, Math.hypot(ddx, ddy) / z);
          }
          for (i = 0; i < n; i++) {
            var d2 = r.disp[i], rc2 = r.rects[i], t;
            if (!rc2) continue;
            if (rc2.bottom < -300 || rc2.top > innerHeight + 300) t = [0, 0];
            else t = gt || (live ? target(cx[i], cy[i], Math.hypot(ptr.x - cx[i], ptr.y - cy[i]) / z) : [0, 0]);
            d2.x += (t[0] - d2.x) * k; d2.y += (t[1] - d2.y) * k;
            if (Math.abs(t[0] - d2.x) > 0.03 || Math.abs(t[1] - d2.y) > 0.03) any = true; else if (!t[0] && !t[1]) { d2.x = 0; d2.y = 0; }
            setOff(r.els[i], d2.x, d2.y);
          }
        });
        if (any) raf = requestAnimationFrame(tick); else lastTs = 0;
      }

      /* ------------------------------------------------------- triggers (DOM) */
      on(ED, 'click', function (e) {
        if (!ON) return; var id = mkOf(e.target) && getId(mkOf(e.target)); var c = id && cfg[id];
        if (c && c.t === 'click') play(id, Math.max(0.3, +c.d || 2) * 1000);
      });
      function setHover(id) {
        if (id === hoverId) return;
        var old = hoverId; hoverId = id;
        if (old && cfg[old] && cfg[old].t === 'hover' && RT[old]) deact(RT[old]);
        if (id && cfg[id] && cfg[id].t === 'hover' && RT[id]) { var r = RT[id]; clearTimeout(r.timer); if (!r.active) { r.active = true; if (FX[cfg[id].fx] && FX[cfg[id].fx].dyn) { if (!r.disp) start(r); } else { stop(r); start(r); } } kick(); }
      }
      on(ED, 'mouseover', function (e) {
        if (!ON) return; var m = mkOf(e.target), id = m ? getId(m) : null;
        clearTimeout(hoverT);
        if (id) setHover(id); else hoverT = setTimeout(function () { setHover(null); }, 120);
      });
      on(ED, 'mouseleave', function () { clearTimeout(hoverT); hoverT = setTimeout(function () { setHover(null); }, 120); });
      on(document, 'pointermove', function (e) { ptr = { x: e.clientX, y: e.clientY }; kick(); }, { passive: true });
      on(document, 'pointerup', function (e) { if (e.pointerType === 'touch') { ptr = null; kick(); } }, { passive: true });
      on(document.documentElement, 'mouseleave', function () { ptr = null; kick(); });
      on(window, 'scroll', function () { kick(); }, { capture: true, passive: true });
      on(window, 'resize', function () {
        var hit = false;
        Object.keys(RT).forEach(function (id) { var c = cfg[id]; if (c && c.fx === 'zoom' && c.p.mode === 'all') { RT[id].sig = ''; hit = true; } });
        if (hit) schedule(200);
        kick();
      });

      /* -------------------------------------------- editing / re-render loop */
      var tmr = 0;
      function schedule(ms) { clearTimeout(tmr); tmr = setTimeout(settle, ms || 90); }
      function settle() {
        if (DEAD) return;
        if (!ON) { stopAll(); return; }
        if (composing) { schedule(250); return; }
        busy = true;
        try { normalize(); } catch (e) { if (window.console) console.warn('Text Animations:', e); }
        busy = false; MO.takeRecords();
        purgeGs(); rebuild(); onSel();
      }
      var MO = new MutationObserver(function () { if (!busy) schedule(); });
      MO.observe(ED, { childList: true, subtree: true, characterData: true });
      on(ED, 'compositionstart', function () { composing = true; });
      on(ED, 'compositionend', function () { composing = false; schedule(60); });

      /* ----------------------------------------------- selection + panel state */
      var lastOffs = null, act = null, UI = null, selRaf = 0;
      function curObj() { return act && cfg[act] ? cfg[act] : cur; }
      function idAtRange(r) {
        if (r.collapsed) {
          var m = mkOf(r.startContainer); if (m) return getId(m);
          var n = r.startContainer;
          if (n.nodeType === 1) { var c = n.childNodes[r.startOffset - 1] || n.childNodes[r.startOffset]; if (c) { var m2 = mkOf(c); if (m2) return getId(m2); } }
          return null;
        }
        var all = markerSpans();
        for (var i = 0; i < all.length; i++) if (r.intersectsNode(all[i])) return getId(all[i]);
        return null;
      }
      function onSel() {
        if (selRaf) return;
        selRaf = requestAnimationFrame(function () {
          selRaf = 0; if (DEAD) return;
          var s = getSelection(); if (!s.rangeCount) return;
          var r = s.getRangeAt(0);
          if (!ED.contains(r.startContainer) || !ED.contains(r.endContainer)) return;
          lastOffs = { s: offOf(r.startContainer, r.startOffset), e: offOf(r.endContainer, r.endOffset) };
          var id = idAtRange(r); id = id && cfg[id] ? id : null;
          if (id !== act) { act = id; syncUI(); } else if (UI && UI.root.isConnected) updButtons();
        });
      }
      on(document, 'selectionchange', onSel);

      /* ------------------------------------------------------------ apply/remove */
      function flash(msg) {
        if (!UI || !UI.root.isConnected) return;
        UI.hint.textContent = msg; UI.hint.style.color = 'var(--warn)';
        clearTimeout(flash.t); flash.t = setTimeout(function () { UI.hint.style.color = ''; syncUI(true); }, 2400);
      }
      function fireInput() { ED.dispatchEvent(new Event('input', { bubbles: true })); }
      function applySel() {
        var o = lastOffs;
        if (!o || o.s === o.e) { flash('Select some text in the document first.'); return; }
        busy = true;
        var r = rangeOf(o), spans = markerSpans().filter(function (s) { return r.intersectsNode(s); });
        spans.forEach(function (s) { clearMarker(s); if (!s.attributes.length) unwrap(s); });
        ED.normalize(); r = rangeOf(o);
        var id = mkId(), first = null, last = null, items = [];
        textNodesIn(r).forEach(function (T) {
          var a = T === r.startContainer ? r.startOffset : 0, b = T === r.endContainer ? r.endOffset : T.nodeValue.length;
          if (b > a) items.push({ T: T, a: a, b: b });
        });
        items.forEach(function (it) {
          var T = it.T, mid = T;
          if (it.b < T.nodeValue.length) T.splitText(it.b);
          if (it.a > 0) mid = T.splitText(it.a);
          var made = letterSpans(mid.nodeValue, id);
          if (!made.spans.length) return;
          mid.parentNode.replaceChild(made.frag, mid);
          if (!first) first = made.spans[0]; last = made.spans[made.spans.length - 1];
        });
        if (!first) { busy = false; MO.takeRecords(); flash('No text found in the selection.'); return; }
        var src = curObj(); // what the panel shows is what gets applied
        cfg[id] = { fx: src.fx, t: src.t, d: src.d, p: clone(src.p) }; cur = clone(cfg[id]); saveCfg();
        busy = false; MO.takeRecords();
        try { ED.focus({ preventScroll: true }); var rr = document.createRange(); rr.setStartBefore(first); rr.setEndAfter(last); var sel = getSelection(); sel.removeAllRanges(); sel.addRange(rr); } catch (e) { }
        fireInput(); rebuild(); act = id; lastOffs = { s: o.s, e: o.e }; syncUI(); if (cfg[id].t !== 'auto') play(id, 2200);
      }
      function removeSel() {
        var o = lastOffs, n = 0, id = act;
        busy = true;
        if (o && o.s !== o.e) {
          var r = rangeOf(o);
          markerSpans().forEach(function (s) { if (r.intersectsNode(s)) { clearMarker(s); if (!s.attributes.length) unwrap(s); n++; } });
        } else if (id) {
          markerSpans().forEach(function (s) { if (getId(s) === id) { clearMarker(s); if (!s.attributes.length) unwrap(s); n++; } });
          delete cfg[id]; saveCfg();
        }
        if (n) ED.normalize();
        busy = false; MO.takeRecords();
        if (!n) { flash('Nothing to remove here.'); return; }
        act = null; fireInput(); rebuild(); syncUI();
      }
      function changed() { if (act && cfg[act]) { saveCfg(); touch(act); } }

      /* ------------------------------------------------------------------- UI (ribbon tab) */
      var CSS = '.nx-c{position:relative}' +
        '.nx-gs{color:transparent!important;text-shadow:none!important}' +
        '.nx-gs::after{content:attr(data-g);position:absolute;left:0;top:0;white-space:pre;pointer-events:none;color:var(--gc);text-shadow:var(--gsh)}' +
        '.nx-ib{display:inline-block;white-space:pre;transform-origin:50% 75%}' +
        '.nxf-rib{display:flex;flex-wrap:wrap;align-items:flex-start;gap:8px 18px;width:100%;min-width:0}' +
        '.nxf-g{display:flex;flex-direction:column;gap:4px;flex:none;max-width:100%}' +
        '.nxf-gc{display:flex;flex-wrap:wrap;align-items:flex-end;gap:6px 12px;min-height:30px}' +
        '.nxf-gl{font-size:10.5px;color:var(--muted)}' +
        '.nxf-f{display:flex;flex-direction:column;gap:2px;flex:none;width:124px}' +
        '.nxf-f.wide{width:150px}' +
        '.nxf-f>span{font-size:11.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
        '.nxf-fc{display:flex;align-items:center;gap:6px;min-width:0}' +
        '.nxf-f select,.nxf-f input[type=number]{width:100%;min-width:0;height:28px;border:1px solid var(--line);background:var(--chrome);color:var(--ink);border-radius:6px;padding:0 6px;font-size:12.5px;font-family:inherit}' +
        '.nxf-f input[type=range]{flex:1;width:100%;min-width:0;accent-color:var(--accent)}' +
        '.nxf-f output{flex:0 0 auto;min-width:36px;text-align:right;font-size:12px;font-variant-numeric:tabular-nums;color:var(--ink)}' +
        '.nxf-rib select:focus-visible,.nxf-rib input:focus-visible,.nxf-rib button:focus-visible{outline:2px solid var(--accent);outline-offset:1px}' +
        '.nxf-rib .cb[disabled]{opacity:.5;cursor:not-allowed}' +
        '.nxf-hint{font-size:11.5px;color:var(--muted);line-height:1.4;max-width:230px}' +
        '.nxf-tl{display:flex;flex-direction:column;gap:4px;width:260px}' +
        '.nxf-tl .nxf-hint{max-width:none}' +
        '.nxf-bar{position:relative;height:26px;border-radius:6px;border:1px solid var(--line);cursor:copy;touch-action:none;margin:2px 7px}' +
        '.nxf-m{position:absolute;top:50%;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.55);cursor:grab;touch-action:none}' +
        '.nxf-m.on{outline:2px solid var(--accent);outline-offset:2px}' +
        '.nxf-tl input[type=color]{width:34px;height:28px;padding:0;border:1px solid var(--line);border-radius:6px;background:var(--chrome)}';
      var styleEl = document.createElement('style'); styleEl.id = 'nxf-css'; styleEl.textContent = CSS; document.head.appendChild(styleEl);

      function fmt(v) { v = +v; return (Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : v.toFixed(1)); }
      function selectEl(opts, val, fn) {
        var s = document.createElement('select');
        opts.forEach(function (o) { var op = document.createElement('option'); op.value = o[0]; op.textContent = o[1]; s.appendChild(op); });
        s.value = val; s.addEventListener('change', function () { fn(s.value); }); return s;
      }
      function field(label, ctrl, out, cls) {
        var f = el('div', 'nxf-f' + (cls ? ' ' + cls : '')), c = el('div', 'nxf-fc');
        f.appendChild(el('span', '', label)); c.appendChild(ctrl); if (out) c.appendChild(out); f.appendChild(c); return f;
      }
      function group(label) {
        var g = el('div', 'nxf-g'), c = el('div', 'nxf-gc');
        g.appendChild(c); g.appendChild(el('span', 'nxf-gl', label)); return { g: g, c: c };
      }

      function timelineEl() {
        var wrap = el('div', 'nxf-tl'), bar = el('div', 'nxf-bar'), selI = 0, drag = -1;
        wrap.appendChild(el('div', 'nxf-hint', 'Timeline: click the bar to add a stop, drag to move it, click a stop to recolor it. Use the same color at both ends for a seamless loop.'));
        wrap.appendChild(bar);
        var ci = document.createElement('input'); ci.type = 'color'; ci.setAttribute('aria-label', 'Selected stop color');
        var del = el('button', 'cb', 'Delete stop'); del.type = 'button';
        var r2 = el('div', 'nxf-fc'); r2.appendChild(el('span', 'nxf-gl', 'Selected stop')); r2.appendChild(ci); r2.appendChild(del); wrap.appendChild(r2);
        function stops() { return curObj().p.stops; }
        function grad() {
          var s = stops().slice().sort(function (a, b) { return a.t - b.t; });
          bar.style.background = 'linear-gradient(90deg,' + s.map(function (x) { return x.c + ' ' + (x.t * 100).toFixed(1) + '%'; }).join(',') + ')';
        }
        function paint() {
          if (selI >= stops().length) selI = 0;
          grad();
          [].slice.call(bar.querySelectorAll('.nxf-m')).forEach(function (m) { m.remove(); });
          stops().forEach(function (st, i) {
            var m = el('div', 'nxf-m' + (i === selI ? ' on' : '')); m.style.left = (st.t * 100) + '%'; m.style.background = st.c; m.dataset.i = i; bar.appendChild(m);
          });
          ci.value = stops()[selI].c; del.disabled = stops().length <= 2;
        }
        function tOf(e) { var rc = bar.getBoundingClientRect(); return clamp((e.clientX - rc.left) / rc.width, 0, 1); }
        bar.addEventListener('pointerdown', function (e) {
          if (e.target.classList.contains('nxf-m')) {
            selI = +e.target.dataset.i; drag = selI;
            [].slice.call(bar.querySelectorAll('.nxf-m')).forEach(function (m) { m.classList.toggle('on', +m.dataset.i === selI); });
            ci.value = stops()[selI].c;
            try { e.target.setPointerCapture(e.pointerId); } catch (x) { }
            e.preventDefault(); return;
          }
          var t = tOf(e), o = curObj(); o.p.stops.push({ t: +t.toFixed(3), c: colorAt(o.p.stops, t) });
          selI = o.p.stops.length - 1; drag = -1; paint(); changed();
        });
        bar.addEventListener('pointermove', function (e) {
          if (drag < 0) return;
          var st = stops()[drag]; if (!st) return;
          st.t = +tOf(e).toFixed(3);
          var m = bar.querySelector('.nxf-m[data-i="' + drag + '"]'); if (m) m.style.left = (st.t * 100) + '%';
          grad(); changed();
        });
        function up() { drag = -1; }
        bar.addEventListener('pointerup', up); bar.addEventListener('pointercancel', up);
        ci.addEventListener('input', function () { var st = stops()[selI]; if (!st) return; st.c = ci.value; paint(); changed(); });
        del.addEventListener('click', function () { if (stops().length <= 2) return; stops().splice(selI, 1); selI = 0; paint(); changed(); });
        paint(); return wrap;
      }

      function renderParams() {
        if (!UI) return;
        var o = fixDef(curObj()), F = FX[o.fx]; UI.params.innerHTML = '';
        F.params.forEach(function (d) {
          if (d.show && !d.show(o.p)) return;
          var ctrl, out = null;
          if (d.t === 'c') {
            ctrl = document.createElement('input'); ctrl.type = 'color'; ctrl.value = o.p[d.k]; ctrl.setAttribute('aria-label', d.l);
            ctrl.addEventListener('input', function () { curObj().p[d.k] = ctrl.value; changed(); });
          } else if (d.t === 'r') {
            ctrl = document.createElement('input'); ctrl.type = 'range'; ctrl.min = d.min; ctrl.max = d.max; ctrl.step = d.step; ctrl.value = o.p[d.k];
            ctrl.setAttribute('aria-label', d.l);
            out = el('output', '', fmt(o.p[d.k]) + d.u);
            ctrl.addEventListener('input', function () { curObj().p[d.k] = +ctrl.value; out.textContent = fmt(ctrl.value) + d.u; changed(); });
          } else {
            ctrl = selectEl(d.o, o.p[d.k], function (v) { curObj().p[d.k] = v; changed(); if (d.rr) renderParams(); });
            ctrl.setAttribute('aria-label', d.l);
          }
          UI.params.appendChild(field(d.l, ctrl, out, d.t === 'r' ? '' : 'wide'));
        });
        if (F.timeline) UI.params.appendChild(timelineEl());
      }
      function updButtons() {
        var hasSel = lastOffs && lastOffs.s !== lastOffs.e;
        UI.apply.disabled = !hasSel; UI.rm.disabled = !(act || hasSel);
        UI.rm.textContent = act && !hasSel ? 'Remove animation' : 'Remove from selection';
      }
      function syncUI(keepParams) {
        if (!UI) return;
        var o = curObj();
        UI.fx.value = o.fx; UI.trig.value = o.t; UI.dur.value = o.d; UI.durRow.style.display = o.t === 'click' ? '' : 'none';
        UI.hint.textContent = act ? 'Editing the animation under the cursor. Changes apply live.' : 'Select text, choose an effect, then press “Apply to selection”.';
        UI.hint.style.color = '';
        updButtons();
        if (!keepParams) renderParams();
      }

      function buildUI(box) {
        box.classList.add('nxf-rib');
        var gE = group('Effect'), gT = group('Trigger'), gP = group('Settings'), gA = group('Apply');
        var hint = el('div', 'nxf-hint');
        var fx = selectEl(ORDER.map(function (k) { return [k, FX[k].name]; }), cur.fx, function (v) {
          var o = curObj(); o.fx = v; o.p = clone(DEF[v]); renderParams(); changed();
        });
        fx.setAttribute('aria-label', 'Animation effect');
        var trig = selectEl([['auto', 'Automatic'], ['click', 'On mouse click'], ['hover', 'On mouse hover']], cur.t, function (v) {
          var o = curObj(); o.t = v; UI.durRow.style.display = v === 'click' ? '' : 'none'; changed();
        });
        trig.setAttribute('aria-label', 'Trigger');
        var dur = document.createElement('input'); dur.type = 'number'; dur.min = '0.3'; dur.max = '60'; dur.step = '0.1'; dur.value = cur.d;
        dur.setAttribute('aria-label', 'Play time in seconds');
        dur.addEventListener('input', function () { var v = parseFloat(dur.value); if (v > 0) { curObj().d = clamp(v, 0.3, 60); if (act) saveCfg(); } });
        var durRow = field('Play time (s)', dur);
        var apply = el('button', 'cb pri', 'Apply to selection'); apply.type = 'button'; apply.addEventListener('click', applySel);
        var rm = el('button', 'cb danger', 'Remove animation'); rm.type = 'button'; rm.addEventListener('click', removeSel);
        var params = gP.c;
        gE.c.appendChild(field('Effect', fx, null, 'wide'));
        gT.c.appendChild(field('Start', trig, null, 'wide')); gT.c.appendChild(durRow);
        gA.c.appendChild(apply); gA.c.appendChild(rm);
        gA.g.insertBefore(hint, gA.g.lastChild);
        [gE, gT, gP, gA].forEach(function (x) { box.appendChild(x.g); });
        UI = { root: box, hint: hint, fx: fx, params: params, trig: trig, dur: dur, durRow: durRow, apply: apply, rm: rm };
        syncUI();
      }

      buildUI(document.getElementById('nxfRib'));
      schedule(60);
  }
}
Nexus.TextFX = TextFX;
})();
