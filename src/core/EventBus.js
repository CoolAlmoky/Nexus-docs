/* EventBus — tiny pub/sub. Modules talk through events instead of calling each other directly.
   Standard events so far:
     'doc:opened'  (doc)  – a document finished loading into the editor */
(function () {
  'use strict';
  class EventBus {
    constructor() { this._h = {}; }
    /** Subscribe. Returns an unsubscribe function. */
    on(evt, fn) {
      (this._h[evt] = this._h[evt] || []).push(fn);
      return () => this.off(evt, fn);
    }
    off(evt, fn) {
      var a = this._h[evt]; if (!a) return;
      var i = a.indexOf(fn); if (i > -1) a.splice(i, 1);
    }
    once(evt, fn) {
      var off = this.on(evt, (p) => { off(); fn(p); });
      return off;
    }
    /** Call handlers in subscription order. One failing handler never blocks the others. */
    emit(evt, payload) {
      (this._h[evt] || []).slice().forEach(function (fn) {
        try { fn(payload); } catch (e) { console.error('[EventBus] handler for "' + evt + '" failed:', e); }
      });
    }
  }
  (window.Nexus = window.Nexus || {}).EventBus = EventBus;
})();
