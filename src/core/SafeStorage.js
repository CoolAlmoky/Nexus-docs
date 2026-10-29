/* SafeStorage — localStorage that never throws.
   If localStorage is blocked (private mode, sandboxed iframe...) values live in memory
   and `ok` flips to false so the UI can warn that nothing is persisted. */
(function () {
  'use strict';
  class SafeStorage {
    constructor() {
      this._mem = {};
      this.ok = true;
    }
    get(key) {
      if (key in this._mem) return this._mem[key];
      try { return localStorage.getItem(key); }
      catch (e) { this.ok = false; return null; }
    }
    /** @returns {boolean} true if really persisted */
    set(key, value) {
      try { localStorage.setItem(key, value); delete this._mem[key]; return true; }
      catch (e) { this._mem[key] = value; this.ok = false; return false; }
    }
    del(key) {
      delete this._mem[key];
      try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
    }
  }
  (window.Nexus = window.Nexus || {}).SafeStorage = SafeStorage;
})();
