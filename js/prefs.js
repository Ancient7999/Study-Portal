/* Study Portal — local display quality / cursor preferences */
(function (global) {
  var LS_QUALITY = 'pt1_quality_mode';
  var LS_CURSOR = 'pt1_custom_cursor';

  function readQuality() {
    try {
      var raw = localStorage.getItem(LS_QUALITY);
      if (raw === 'basic' || raw === '1' || raw === 'true') return 'basic';
    } catch (e) {}
    return 'full';
  }

  function readCustomCursor() {
    try {
      var raw = localStorage.getItem(LS_CURSOR);
      if (raw === '0' || raw === 'false' || raw === 'off') return false;
    } catch (e) {}
    return true;
  }

  function apply() {
    var root = document.documentElement;
    var quality = readQuality();
    var customCursor = readCustomCursor();
    root.setAttribute('data-quality', quality);
    root.setAttribute('data-custom-cursor', customCursor ? 'on' : 'off');
    try {
      global.dispatchEvent(new CustomEvent('study-prefs-changed', {
        detail: { quality: quality, customCursor: customCursor }
      }));
    } catch (e) {}
    return { quality: quality, customCursor: customCursor };
  }

  function setQuality(mode) {
    var next = mode === 'basic' ? 'basic' : 'full';
    try {
      localStorage.setItem(LS_QUALITY, next);
    } catch (e) {}
    return apply();
  }

  function setCustomCursor(on) {
    try {
      localStorage.setItem(LS_CURSOR, on ? '1' : '0');
    } catch (e) {}
    return apply();
  }

  function isBasic() {
    return readQuality() === 'basic';
  }

  function isCustomCursorEnabled() {
    return readCustomCursor();
  }

  // Apply as early as this script runs (also bootstrapped inline in <head>).
  if (document.documentElement) apply();

  global.StudyPrefs = {
    apply: apply,
    getQuality: readQuality,
    isBasic: isBasic,
    setQuality: setQuality,
    isCustomCursorEnabled: isCustomCursorEnabled,
    setCustomCursor: setCustomCursor
  };
})(typeof window !== 'undefined' ? window : this);
