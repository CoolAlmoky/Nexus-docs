/* Util — small pure helpers shared by every module (no state, no DOM side effects). */
(function (global) {
  'use strict';
  var Nexus = global.Nexus = global.Nexus || {};

  class Util {
    /** querySelector shortcut */
    static $(sel, root) { return (root || document).querySelector(sel); }
    /** querySelectorAll → real Array */
    static $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
    /** Escape text for safe use inside HTML / attributes */
    static esc(s) {
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    /** Short unique id (time + random) */
    static uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
    static clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    /** Create an element: el('div', 'cls', 'text') */
    static el(tag, cls, txt) {
      var e = document.createElement(tag);
      if (cls) e.className = cls;
      if (txt != null) e.textContent = txt;
      return e;
    }
    /** '12px' | '9pt' → number of CSS px (0 if not a px/pt value) */
    static pxS(v) {
      var m = /^(-?[\d.]+)(px|pt)$/.exec(v || '');
      if (!m) return 0;
      return m[2] === 'pt' ? parseFloat(m[1]) * 4 / 3 : parseFloat(m[1]);
    }
  }

  Nexus.Util = Util;
})(window);
