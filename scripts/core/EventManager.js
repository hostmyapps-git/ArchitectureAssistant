(function () {
  class ArchitectureEventManager {
    constructor() {
      this.cleanups = [];
    }

    on(target, type, handler, options) {
      if (!target) {
        return;
      }
      target.addEventListener(type, handler, options);
      this.cleanups.push(function () {
        target.removeEventListener(type, handler, options);
      });
    }

    destroy() {
      this.cleanups.forEach(function (dispose) {
        dispose();
      });
      this.cleanups = [];
    }
  }

  window.ArchitectureEventManager = ArchitectureEventManager;
})();
