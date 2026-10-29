/* Feature — base class for self-contained editor features (Page style, Ruler, Text animations...).
   Lifecycle (driven by the app context's register()):
     new Feature(app)  →  init()  →  onDocChange(doc) every time a document is opened  →  destroy()
   `app` gives access to: bus, ed, canvas, $, $$, cur (current doc), showPop/closePop, record, afterChange.
   A feature owns its own DOM/ribbon tab, its own storage key, and exposes only what others really need. */
(function () {
  'use strict';
  class Feature {
    constructor(app) { this.app = app; }
    /** Unique key used in app.features[id] — override in subclasses */
    get id() { throw new Error('Feature subclass must define get id()'); }
    /** Build UI / attach listeners */
    init() {}
    /** A document was opened (or switched) */
    onDocChange(doc) {}
    /** Undo whatever init() did, if the feature supports being removed */
    destroy() {}
  }
  (window.Nexus = window.Nexus || {}).Feature = Feature;
})();
