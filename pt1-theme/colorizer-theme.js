/* Colorizer / theme engine
 * Drives --accent-* CSS variables + light-mode + presets.
 * Consumed by calculator visuals (wallpaper wave, overlays, buttons).
 */
(function (global) {
  'use strict';

  const THEME_STORAGE_KEY = 'atc_theme_color_v1';

  // refreshThemeSVGs is defined in particles.js; provide no-op fallback + local binding (strict mode)
  if (typeof global.refreshThemeSVGs !== 'function') {
    global.refreshThemeSVGs = function () {};
  }
  var refreshThemeSVGs = function () { return global.refreshThemeSVGs.apply(null, arguments); };
  if (typeof global.cosmicOrbs === 'undefined') global.cosmicOrbs = [];
  if (typeof global.globalBlobs === 'undefined') global.globalBlobs = null;
  var cosmicOrbs = global.cosmicOrbs;
  var globalBlobs = global.globalBlobs;

  var extraGlowEnabled = false;
  function applyExtraGlow() {
    document.body.classList.toggle('extra-glow-active', extraGlowEnabled);
  }
  function toggleExtraGlow() {
    var el = document.getElementById('extra-glow-toggle');
    extraGlowEnabled = el ? el.checked : false;
    localStorage.setItem('atc_extra_glow', extraGlowEnabled ? '1' : '0');
    applyExtraGlow();
  }
  global.toggleExtraGlow = toggleExtraGlow;

  function openSettingsPanel(panelName) {
    document.querySelectorAll('.settings-panel').forEach(function (p) { p.classList.remove('active'); });
    document.querySelectorAll('.settings-nav-btn').forEach(function (b) { b.classList.remove('active'); });
    var panel = document.getElementById('settings-panel-' + panelName);
    if (panel) panel.classList.add('active');
    var btn = document.querySelector('.settings-nav-btn[data-panel="' + panelName + '"]');
    if (btn) btn.classList.add('active');
  }
  global.openSettingsPanel = openSettingsPanel;

  function openSettingsModal() {
    if (document.activeElement && typeof document.activeElement.blur === 'function') document.activeElement.blur();
    var modal = document.getElementById('settings-modal');
    if (modal) {
      modal.style.display = 'flex';
      document.body.classList.add('settings-open');
      openSettingsPanel('general');
    }
  }
  global.openSettingsModal = openSettingsModal;

  function closeSettingsModal() {
    var hexInput = document.getElementById('accent-hex-input');
    if (hexInput && hexInput.value) {
      var _skipSave = _activePresetType === 'custom' && _customPresets[_activeCustomIdx] && _customPresets[_activeCustomIdx].locked;
      if (!_skipSave) {
        try { localStorage.setItem(THEME_STORAGE_KEY, hexInput.value); } catch (e) { console.warn('Could not save theme preference:', e); }
      }
    }
    var modal = document.getElementById('settings-modal');
    if (modal) modal.style.display = 'none';
    document.body.classList.remove('settings-open');
  }
  global.closeSettingsModal = closeSettingsModal;

  function applyThemeLocks() {
    var locked = _activePresetType === 'custom' && _customPresets[_activeCustomIdx] && !!_customPresets[_activeCustomIdx].locked;
    ['theme-lock-colorPicker', 'theme-lock-colorStrength'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.classList.toggle('theme-locked', locked);
      if (locked) el.setAttribute('data-lock-hint', 'Preset locked. Click 🔒 to unlock.');
      else el.removeAttribute('data-lock-hint');
    });
  }
  global.applyThemeLocks = applyThemeLocks;

  function loadAppSettings() {
    // Prefixes / quiz settings omitted in standalone package
    applyThemeLocks();
  }

var _customPresets=[];var _activePresetType=null;var _activeCustomIdx=-1;var CUSTOM_PRESETS_KEY='atc_custom_presets';var ACTIVE_PRESET_KEY='atc_active_preset';
function loadCustomPresets(){try{var d=JSON.parse(localStorage.getItem(CUSTOM_PRESETS_KEY));if(Array.isArray(d))_customPresets=d.slice(0,3);}catch(e){}_customPresets=_customPresets.map(function(p){return{hex:p.hex||'#4EA121',strength:p.strength!=null?p.strength:62,locked:!!p.locked};});try{var a=JSON.parse(localStorage.getItem(ACTIVE_PRESET_KEY));if(a){_activePresetType=a.type;_activeCustomIdx=a.type==='custom'?a.index:-1;}}catch(e){}}
function saveCustomPresets(){try{localStorage.setItem(CUSTOM_PRESETS_KEY,JSON.stringify(_customPresets));}catch(e){}}
function saveActivePreset(){try{if(_activePresetType)localStorage.setItem(ACTIVE_PRESET_KEY,JSON.stringify({type:_activePresetType,index:_activeCustomIdx}));else localStorage.removeItem(ACTIVE_PRESET_KEY);}catch(e){}}
function renderCustomPresets(){var area=document.getElementById('custom-presets-area');if(!area)return;var html='';_customPresets.forEach(function(p,i){var isActive=_activePresetType==='custom'&&_activeCustomIdx===i;var lockCls=p.locked?' locked':'';html+='<div class="custom-preset-wrap"><button class="preset-swatch'+(isActive?' active-preset':'')+'" data-custom-idx="'+i+'" style="background:'+p.hex+';" title="Custom '+(i+1)+' ('+p.hex+')" onclick="selectCustomPreset('+i+')"></button><button class="custom-preset-lock'+lockCls+'" onclick="event.stopPropagation();toggleCustomLock('+i+')" title="'+(p.locked?'Unlock':'Lock')+'">'+(p.locked?'🔒':'🔓')+'</button><button class="custom-preset-del" onclick="event.stopPropagation();removeCustomPreset('+i+')" title="Remove">×</button></div>';});if(_customPresets.length>0&&_customPresets.length<3)html+='<button class="custom-add-btn" onclick="addCustomPreset()" title="Add custom preset">+</button>';area.innerHTML=html;}
function selectCustomPreset(idx){var p=_customPresets[idx];if(!p)return;_activePresetType='custom';_activeCustomIdx=idx;var picker=document.getElementById('accent-color-picker');var hexInput=document.getElementById('accent-hex-input');var slider=document.getElementById('accent-strength-slider');var disp=document.getElementById('strength-value-display');if(picker)picker.value=p.hex;if(hexInput)hexInput.value=p.hex.toUpperCase();if(slider)slider.value=p.strength;if(disp)disp.textContent=p.strength;changeAccentColor(p.hex,p.strength);localStorage.setItem(THEME_STORAGE_KEY,p.hex);localStorage.setItem('atc_accent_strength',String(p.strength));saveActivePreset();syncAllPresetHighlights();}
function addCustomPreset(){if(_customPresets.length>=3)return;var picker=document.getElementById('accent-color-picker');var slider=document.getElementById('accent-strength-slider');var hex=picker?picker.value:'#000000';var str=slider?parseInt(slider.value):90;_customPresets.push({hex:hex.toLowerCase(),strength:str,locked:false});_activePresetType='custom';_activeCustomIdx=_customPresets.length-1;saveCustomPresets();saveActivePreset();renderCustomPresets();}
function toggleCustomLock(idx){if(!_customPresets[idx])return;_customPresets[idx].locked=!_customPresets[idx].locked;saveCustomPresets();renderCustomPresets();}
function removeCustomPreset(idx){_customPresets.splice(idx,1);saveCustomPresets();if(_activePresetType==='custom'){if(_activeCustomIdx===idx){_activePresetType=null;_activeCustomIdx=-1;}else if(_activeCustomIdx>idx)_activeCustomIdx--;}saveActivePreset();renderCustomPresets();}
function syncAllPresetHighlights(){document.querySelectorAll('.preset-swatches .preset-swatch').forEach(function(sw){sw.classList.remove('active-preset');if(_activePresetType==='standard'){var picker=document.getElementById('accent-color-picker');var slider=document.getElementById('accent-strength-slider');
if(picker&&sw.dataset.hex===picker.value.toLowerCase()&&slider&&getStandardPresetMatch(picker.value.toLowerCase(),parseInt(slider.value)))sw.classList.add('active-preset');
}});renderCustomPresets();}
function getStandardPresetMatch(hex,strength){var map={'#4ea121':62,'#330000':90,'#8833ff':32,'#000000':90,'#ff8800':62,'#ff0000':43,'#0008ff':26};return map[hex.toLowerCase()]===strength;}function handleColorChange(){var picker=document.getElementById('accent-color-picker');var slider=document.getElementById('accent-strength-slider');var hex=picker?picker.value.toLowerCase():'#000000';var str=slider?parseInt(slider.value):90;if(getStandardPresetMatch(hex,str)){_activePresetType='standard';_activeCustomIdx=-1;saveActivePreset();localStorage.setItem(THEME_STORAGE_KEY,hex);localStorage.setItem('atc_accent_strength',String(str));syncAllPresetHighlights();return;}if(_activePresetType==='custom'&&_customPresets[_activeCustomIdx]){var cp=_customPresets[_activeCustomIdx];if(!cp.locked){cp.hex=hex;cp.strength=str;saveCustomPresets();localStorage.setItem(THEME_STORAGE_KEY,hex);localStorage.setItem('atc_accent_strength',String(str));}}_activePresetType=_activePresetType==='custom'?'custom':null;if(_activePresetType!=='custom'&&_customPresets.length===0){_customPresets.push({hex:hex,strength:str,locked:false});_activePresetType='custom';_activeCustomIdx=0;saveCustomPresets();localStorage.setItem(THEME_STORAGE_KEY,hex);localStorage.setItem('atc_accent_strength',String(str));}else if(_activePresetType!=='custom'){localStorage.setItem(THEME_STORAGE_KEY,hex);localStorage.setItem('atc_accent_strength',String(str));}saveActivePreset();syncAllPresetHighlights();}
function applyPreset(hexColor, isLight, presetStrength) {
const PRESET_STRENGTH = presetStrength !== undefined ? presetStrength : 62;
const picker = document.getElementById('accent-color-picker');
const hexInput = document.getElementById('accent-hex-input');
const strengthSlider = document.getElementById('accent-strength-slider');
const strengthDisplay = document.getElementById('strength-value-display');
const lightToggle = document.getElementById('light-mode-toggle');
if (picker) picker.value = hexColor;
if (hexInput) hexInput.value = hexColor.toUpperCase();
if (strengthSlider) strengthSlider.value = PRESET_STRENGTH;
if (strengthDisplay) strengthDisplay.textContent = PRESET_STRENGTH;
if (lightToggle) lightToggle.checked = isLight;
document.documentElement.classList.toggle('light-mode', isLight);
localStorage.setItem('atc_light_mode', isLight ? '1' : '0');
changeAccentColor(hexColor, PRESET_STRENGTH);
try {
localStorage.setItem(THEME_STORAGE_KEY, hexColor);
localStorage.setItem('atc_accent_strength', String(PRESET_STRENGTH));
} catch(e) {}
_activePresetType='standard';_activeCustomIdx=-1;saveActivePreset();syncAllPresetHighlights();
}

global.applyPreset = applyPreset;
global.selectCustomPreset = selectCustomPreset;
global.addCustomPreset = addCustomPreset;
global.toggleCustomLock = toggleCustomLock;
global.removeCustomPreset = removeCustomPreset;

const lightnessLevels = [90, 82, 74, 65, 55, 42, 80, 62, 87, 48];
function hexToHsl(hex) {
let r = parseInt(hex.slice(1,3),16)/255;
let g = parseInt(hex.slice(3,5),16)/255;
let b = parseInt(hex.slice(5,7),16)/255;
const max = Math.max(r,g,b), min = Math.min(r,g,b);
let h, s, l = (max + min)/2;
if (max === min) h = s = 0;
else {
const d = max - min;
s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
switch(max){
case r: h = (g-b)/d + (g<b?6:0); break;
case g: h = (b-r)/d + 2; break;
case b: h = (r-g)/d + 4; break;
}
h /= 6;
}
return [Math.round(h*360), Math.round(s*100), Math.round(l*100)];
}
function hslToHex(h, s, l) {
h /= 360; s /= 100; l /= 100;
let r, g, b;
if (s === 0) r = g = b = l;
else {
const hue2rgb = (p,q,t) => {
if(t<0) t+=1; if(t>1) t-=1;
if(t<1/6) return p + (q-p)*6*t;
if(t<1/2) return q;
if(t<2/3) return p + (q-p)*(2/3-t)*6;
return p;
};
const q = l<0.5 ? l*(1+s) : l + s - l*s;
const p = 2*l - q;
r = hue2rgb(p,q,h+1/3);
g = hue2rgb(p,q,h);
b = hue2rgb(p,q,h-1/3);
}
const toHex = x => Math.round(x*255).toString(16).padStart(2,'0');
return '#' + toHex(r) + toHex(g) + toHex(b);
}
function refreshParticleEffects() {
  try { refreshThemeSVGs(); } catch (e) {}
  try {
    if (typeof global.refreshFxAccentColors === 'function') global.refreshFxAccentColors();
  } catch (e) {}
}
function changeAccentColor(newHex, strength = 100) {
if (!newHex || newHex[0] !== '#' || newHex.length !== 7) return;
let [hue, baseSat, baseLight] = hexToHsl(newHex);
const factor = strength / 100;
for (let i = 0; i < 10; i++) {
let targetLight = lightnessLevels[i];
let finalLight = baseLight + (targetLight - baseLight) * factor;
const newColor = hslToHex(hue, baseSat, finalLight);
document.documentElement.style.setProperty(`--accent-${i}`, newColor);
const nr = parseInt(newColor.slice(1,3),16);
const ng = parseInt(newColor.slice(3,5),16);
const nb = parseInt(newColor.slice(5,7),16);
document.documentElement.style.setProperty(`--accent-${i}-rgb`, `${nr}, ${ng}, ${nb}`);
}
const tintSat = Math.min(100, baseSat * 1.2);
const tintLight = 50;
const tintHex = hslToHex(hue, tintSat, tintLight);
const r = parseInt(tintHex.slice(1,3), 16);
const g = parseInt(tintHex.slice(3,5), 16);
const b = parseInt(tintHex.slice(5,7), 16);
const isLightMode = document.documentElement.classList.contains('light-mode');
document.documentElement.style.setProperty('--bg-tint-color',isLightMode ? 'rgba(0,0,0,0)' : `rgba(${r}, ${g}, ${b}, 0.05)`);
document.documentElement.style.setProperty('--bg-tint-color-high', isLightMode ? 'rgba(0,0,0,0)' : `rgba(${r}, ${g}, ${b}, 0.08)`);
const deepColor = hslToHex(hue, Math.min(100, baseSat * 1.1), 28);
const dr = parseInt(deepColor.slice(1,3),16);
const dg = parseInt(deepColor.slice(3,5),16);
const db = parseInt(deepColor.slice(5,7),16);
document.documentElement.style.setProperty('--accent-deep', deepColor);
document.documentElement.style.setProperty('--accent-deep-rgb', `${dr}, ${dg}, ${db}`);
refreshParticleEffects();
if (typeof globalBlobs !== 'undefined' && globalBlobs) {
globalBlobs.forEach(blob => {
blob.colorStops = [ `rgba(var(--accent-0-rgb), 0.32)`, `rgba(var(--accent-2-rgb), 0.08)`, `rgba(var(--accent-4-rgb), 0)`
];
});
}
if (typeof cosmicOrbs !== 'undefined' && cosmicOrbs.length > 0) {
const rs = getComputedStyle(document.documentElement);
const a0 = rs.getPropertyValue('--accent-0-rgb').trim();
const a2 = rs.getPropertyValue('--accent-2-rgb').trim();
cosmicOrbs.forEach(orb => {
orb.el.style.background = `radial-gradient(circle, rgba(${a0}, 0.5) 0%, rgba(${a2}, 0.15) 60%, transparent 100%)`;
orb.el.style.boxShadow = `0 0 ${orb.size/2}px rgba(${a0}, 0.3)`;
});
}
}

global.changeAccentColor = changeAccentColor;
global.hexToHsl = hexToHsl;
global.hslToHex = hslToHex;

function resetThemeToDefaults() {
if (!confirm('Reset all theme settings to default?')) return;
localStorage.removeItem(THEME_STORAGE_KEY);
localStorage.removeItem('atc_accent_strength');
localStorage.removeItem(CUSTOM_PRESETS_KEY);
localStorage.removeItem(ACTIVE_PRESET_KEY);
_customPresets=[];_activePresetType=null;_activeCustomIdx=-1;
const picker = document.getElementById('accent-color-picker');
const hexInput = document.getElementById('accent-hex-input');
const strengthSlider = document.getElementById('accent-strength-slider');
const strengthDisplay = document.getElementById('strength-value-display');
if (picker) picker.value = '#330000';
if (hexInput) hexInput.value = '#330000';
if (strengthSlider) strengthSlider.value = 90;
if (strengthDisplay) strengthDisplay.textContent = 90;
_activePresetType='standard';_activeCustomIdx=-1;
changeAccentColor('#330000', 90);
refreshParticleEffects();
syncAllPresetHighlights();renderCustomPresets();
}

global.resetThemeToDefaults = resetThemeToDefaults;




  // —— Per-role font pickers (Quiz Theme settings) ——
  var FONT_STORAGE_PREFIX = 'pt1_font_';
  var FONT_ROLES = [
    { id: 'ui', defaultName: 'Comic Neue', vars: ['--font-ui', '--body'] },
    { id: 'head', defaultName: 'Pacifico', vars: ['--font-head', '--head'] },
    { id: 'question', defaultName: 'Outfit', vars: ['--font-question'] },
    { id: 'choice', defaultName: 'Outfit', vars: ['--font-choice'] },
    { id: 'nav', defaultName: 'Montserrat', vars: ['--font-nav'] },
    { id: 'mono', defaultName: 'Oswald', vars: ['--font-mono', '--mono'] }
  ];
  // question and choice text moved to Outfit: drop the old Space Mono default once
  try {
    if (!localStorage.getItem('pt1_font_qa_v2')) {
      ['question', 'choice'].forEach(function (r) { if (localStorage.getItem(FONT_STORAGE_PREFIX + r) === 'Space Mono') localStorage.removeItem(FONT_STORAGE_PREFIX + r); });
      localStorage.setItem('pt1_font_qa_v2', '1');
    }
  } catch (e) {}
  var FONT_ORDER = [
    'Instrument Serif', 'Fraunces', 'Playfair Display', 'Georgia', 'Times New Roman',
    'Outfit', 'Nunito', 'Montserrat', 'Roboto', 'Oswald', 'Arial', 'Verdana', 'Trebuchet MS',
    'Space Mono', 'IBM Plex Mono', 'Press Start 2P',
    'Bebas Neue', 'Impact',
    'Permanent Marker', 'Pacifico', 'Indie Flower', 'Comic Neue'
  ];
  var FONT_LABELS = {
    'Instrument Serif': 'Instrument',
    'Playfair Display': 'Playfair',
    'Bebas Neue': 'Bebas',
    'Permanent Marker': 'Marker',
    'Press Start 2P': 'Pixel',
    'Times New Roman': 'Times',
    'Trebuchet MS': 'Trebuchet',
    'IBM Plex Mono': 'IBM Plex Mono',
    'Fraunces': 'Fraunces'
  };
  var FONT_STACKS = {
    'Instrument Serif': "'Instrument Serif', Georgia, serif",
    'Fraunces': "'Fraunces', Georgia, serif",
    'Space Mono': "'Space Mono', ui-monospace, monospace",
    'IBM Plex Mono': "'IBM Plex Mono', ui-monospace, monospace",
    'Nunito': "'Nunito', system-ui, sans-serif",
    'Outfit': "'Outfit', system-ui, sans-serif",
    'Montserrat': "'Montserrat', system-ui, sans-serif",
    'Roboto': "'Roboto', system-ui, sans-serif",
    'Oswald': "'Oswald', system-ui, sans-serif",
    'Playfair Display': "'Playfair Display', Georgia, serif",
    'Bebas Neue': "'Bebas Neue', Impact, sans-serif",
    'Permanent Marker': "'Permanent Marker', cursive",
    'Pacifico': "'Pacifico', cursive",
    'Indie Flower': "'Indie Flower', cursive",
    'Comic Neue': "'Comic Neue', Comic Sans MS, cursive",
    'Press Start 2P': "'Press Start 2P', monospace",
    'Georgia': "Georgia, 'Times New Roman', serif",
    'Times New Roman': "'Times New Roman', Times, serif",
    'Arial': "Arial, Helvetica, sans-serif",
    'Verdana': "Verdana, Geneva, sans-serif",
    'Trebuchet MS': "'Trebuchet MS', Helvetica, sans-serif",
    'Impact': "Impact, Haettenschweiler, sans-serif"
  };
  var FONT_GOOGLE = {
    'Instrument Serif': 'Instrument+Serif:ital@0;1',
    'Fraunces': 'Fraunces:opsz,wght@9..144,400;9..144,500;9..144,700',
    'Space Mono': 'Space+Mono:wght@400;700',
    'IBM Plex Mono': 'IBM+Plex+Mono:wght@400;500;600;700',
    'Nunito': 'Nunito:wght@400;500;600;700',
    'Outfit': 'Outfit:wght@400;500;600;700',
    'Montserrat': 'Montserrat:wght@400;500;600;700',
    'Roboto': 'Roboto:wght@400;500;700',
    'Oswald': 'Oswald:wght@400;500;600;700',
    'Playfair Display': 'Playfair+Display:ital,wght@0,400;0,700;1,400',
    'Bebas Neue': 'Bebas+Neue',
    'Permanent Marker': 'Permanent+Marker',
    'Pacifico': 'Pacifico',
    'Indie Flower': 'Indie+Flower',
    'Comic Neue': 'Comic+Neue:wght@400;700',
    'Press Start 2P': 'Press+Start+2P'
  };
  var _loadedGoogleFonts = {};

  function ensureGoogleFont(name) {
    var spec = FONT_GOOGLE[name];
    if (!spec || _loadedGoogleFonts[name]) return;
    _loadedGoogleFonts[name] = true;
    // Already bundled defaults are imported in page CSS; still fine to re-link.
    var id = 'pt1-gfont-' + name.replace(/\s+/g, '-').toLowerCase();
    if (document.getElementById(id)) return;
    var link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=' + spec + '&display=swap';
    document.head.appendChild(link);
  }

  function fontStackFor(name, fallback) {
    if (FONT_STACKS[name]) return FONT_STACKS[name];
    if (FONT_STACKS[fallback]) return FONT_STACKS[fallback];
    return FONT_STACKS['Outfit'];
  }

  function readFontRole(roleId, defaultName) {
    try {
      var v = localStorage.getItem(FONT_STORAGE_PREFIX + roleId);
      if (v && FONT_STACKS[v]) return v;
      // Migrate legacy single-key choice onto Body / UI only
      if (roleId === 'ui') {
        var legacy = localStorage.getItem('pt1_font_family');
        if (legacy && FONT_STACKS[legacy]) return legacy;
      }
    } catch (e) {}
    return defaultName;
  }

  function fontLabel(name) {
    return FONT_LABELS[name] || name;
  }

  function syncFontSelectOptions(sel) {
    if (!sel) return;
    var current = sel.value;
    var html = '';
    for (var i = 0; i < FONT_ORDER.length; i++) {
      var name = FONT_ORDER[i];
      if (!FONT_STACKS[name]) continue;
      var selected = name === current ? ' selected' : '';
      html += '<option value="' + name.replace(/"/g, '&quot;') + '"' + selected +
        ' style="font-family:' + FONT_STACKS[name].replace(/"/g, '&quot;') + ';">' +
        fontLabel(name) + '</option>';
    }
    sel.innerHTML = html;
    if (current && FONT_STACKS[current]) sel.value = current;
    if (FONT_STACKS[sel.value]) sel.style.fontFamily = FONT_STACKS[sel.value];
  }

  function syncFontPickerUI(roleId, name) {
    var wrap = document.querySelector('.font-picker-wrap[data-font-role="' + roleId + '"]');
    if (!wrap) return;
    var btn = wrap.querySelector('.font-picker-btn');
    var opts = wrap.querySelectorAll('.font-picker-option');
    var stack = FONT_STACKS[name] || '';
    if (btn) {
      btn.textContent = fontLabel(name);
      btn.style.fontFamily = stack;
      btn.setAttribute('aria-expanded', 'false');
    }
    for (var i = 0; i < opts.length; i++) {
      var on = opts[i].getAttribute('data-font') === name;
      opts[i].classList.toggle('active', on);
      opts[i].setAttribute('aria-selected', on ? 'true' : 'false');
    }
    wrap.classList.remove('open');
  }

  function closeAllFontPickers(except) {
    var opens = document.querySelectorAll('.font-picker-wrap.open');
    for (var i = 0; i < opens.length; i++) {
      if (except && opens[i] === except) continue;
      opens[i].classList.remove('open');
      var b = opens[i].querySelector('.font-picker-btn');
      if (b) b.setAttribute('aria-expanded', 'false');
    }
  }

  function buildCustomFontPicker(sel) {
    if (!sel || sel.dataset.customPicker === '1') return;
    sel.dataset.customPicker = '1';
    var role = sel.getAttribute('data-font-role') || '';
    var wrap = document.createElement('div');
    wrap.className = 'font-picker-wrap';
    wrap.setAttribute('data-font-role', role);
    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(sel);
    sel.classList.add('font-family-select-native');
    sel.setAttribute('aria-hidden', 'true');
    sel.tabIndex = -1;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'font-picker-btn number-input';
    btn.id = sel.id + '-btn';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    btn.title = sel.title || 'Choose font';
    wrap.appendChild(btn);

    var menu = document.createElement('div');
    menu.className = 'font-picker-menu';
    menu.setAttribute('role', 'listbox');
    menu.id = sel.id + '-menu';
    btn.setAttribute('aria-controls', menu.id);

    for (var i = 0; i < FONT_ORDER.length; i++) {
      var name = FONT_ORDER[i];
      if (!FONT_STACKS[name]) continue;
      var opt = document.createElement('button');
      opt.type = 'button';
      opt.className = 'font-picker-option';
      opt.setAttribute('role', 'option');
      opt.setAttribute('data-font', name);
      opt.style.fontFamily = FONT_STACKS[name];
      opt.textContent = fontLabel(name);
      if (name === sel.value) {
        opt.classList.add('active');
        opt.setAttribute('aria-selected', 'true');
      } else {
        opt.setAttribute('aria-selected', 'false');
      }
      menu.appendChild(opt);
    }
    wrap.appendChild(menu);

    btn.textContent = fontLabel(sel.value);
    if (FONT_STACKS[sel.value]) btn.style.fontFamily = FONT_STACKS[sel.value];

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var willOpen = !wrap.classList.contains('open');
      closeAllFontPickers(wrap);
      wrap.classList.toggle('open', willOpen);
      btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      if (willOpen) {
        for (var fi = 0; fi < FONT_ORDER.length; fi++) ensureGoogleFont(FONT_ORDER[fi]);
        var active = menu.querySelector('.font-picker-option.active');
        if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest' });
      }
    });

    menu.addEventListener('click', function (e) {
      var opt = e.target && e.target.closest ? e.target.closest('.font-picker-option') : null;
      if (!opt || !menu.contains(opt)) return;
      e.preventDefault();
      e.stopPropagation();
      var name = opt.getAttribute('data-font');
      if (!name || !FONT_STACKS[name]) return;
      sel.value = name;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      closeAllFontPickers();
    });
  }

  function applyFontRole(roleId, name, persist) {
    if (document.documentElement.classList.contains('study-page')) return;
    var role = null;
    for (var i = 0; i < FONT_ROLES.length; i++) {
      if (FONT_ROLES[i].id === roleId) { role = FONT_ROLES[i]; break; }
    }
    if (!role) return;
    if (!FONT_STACKS[name]) name = role.defaultName;
    ensureGoogleFont(name);
    var stack = fontStackFor(name, role.defaultName);
    var root = document.documentElement;
    for (var j = 0; j < role.vars.length; j++) {
      root.style.setProperty(role.vars[j], stack);
    }
    if (persist !== false) {
      try { localStorage.setItem(FONT_STORAGE_PREFIX + roleId, name); } catch (e) {}
    }
    var sel = document.getElementById('font-family-' + roleId);
    if (sel) {
      if (sel.value !== name) sel.value = name;
      if (FONT_STACKS[name]) sel.style.fontFamily = FONT_STACKS[name];
    }
    syncFontPickerUI(roleId, name);
  }

  function applyAllFonts(persist) {
    if (document.documentElement.classList.contains('study-page')) return;
    for (var i = 0; i < FONT_ROLES.length; i++) {
      var r = FONT_ROLES[i];
      applyFontRole(r.id, readFontRole(r.id, r.defaultName), persist === true);
    }
  }

  function wireFontPickers() {
    var panel = document.getElementById('theme-font-picker');
    if (!panel) return;
    var selects = panel.querySelectorAll('select.font-family-select');
    for (var i = 0; i < selects.length; i++) {
      syncFontSelectOptions(selects[i]);
      buildCustomFontPicker(selects[i]);
    }
    applyAllFonts(false);
    if (panel.dataset.wired === '1') return;
    panel.dataset.wired = '1';
    panel.addEventListener('change', function (e) {
      var sel = e.target && e.target.closest ? e.target.closest('select.font-family-select') : null;
      if (!sel || !panel.contains(sel)) return;
      var role = sel.getAttribute('data-font-role');
      if (!role) return;
      applyFontRole(role, sel.value, true);
    });
    if (!document.documentElement.dataset.fontPickerDocWired) {
      document.documentElement.dataset.fontPickerDocWired = '1';
      document.addEventListener('click', function (e) {
        if (e.target && e.target.closest && e.target.closest('.font-picker-wrap')) return;
        closeAllFontPickers();
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeAllFontPickers();
      });
    }
  }

  global.applyFontRole = applyFontRole;
  global.applyAllFonts = applyAllFonts;
  global.wireFontPickers = wireFontPickers;

  var CURSOR_SKIN_KEY = 'pt1_cursor_skin';
  var CURSOR_ON_KEY = 'pt1_custom_cursor';
  var CURSOR_SKINS = ['ring-screen','ring-tight','ring-gold','pill','beam-v','beam-h','diamond','comma','system'];

  function isCustomCursorEnabled() {
    try {
      var on = localStorage.getItem(CURSOR_ON_KEY);
      if (on === 'off' || on === '0' || on === 'false') return false;
      if (on === 'on' || on === '1' || on === 'true') return true;
    } catch (e) {}
    return document.documentElement.getAttribute('data-custom-cursor') !== 'off';
  }

  function currentCursorSkin() {
    try {
      var skin = localStorage.getItem(CURSOR_SKIN_KEY);
      if (skin === 'off') skin = 'system';
      if (skin && CURSOR_SKINS.indexOf(skin) !== -1) return skin;
    } catch (e) {}
    var cur = document.documentElement.getAttribute('data-cursor');
    if (cur && CURSOR_SKINS.indexOf(cur) !== -1) return cur;
    return 'system';
  }

  /** @deprecated use currentCursorSkin — kept for any external callers */
  function currentCursorChoice() {
    return currentCursorSkin();
  }

  function syncCursorPickerUI() {
    var skin = currentCursorSkin();
    var enabled = isCustomCursorEnabled();
    document.querySelectorAll('.cursor-skin-opt').forEach(function (btn) {
      var v = btn.getAttribute('data-cursor-skin');
      btn.classList.toggle('active', v === skin);
      btn.setAttribute('aria-selected', v === skin ? 'true' : 'false');
    });
    var toggle = document.getElementById('custom-cursor-toggle');
    if (toggle) toggle.checked = enabled;
    var grid = document.getElementById('cursor-skin-grid');
    if (grid) grid.classList.toggle('cursor-skins-disabled', !enabled);
  }

  function isTouchPointerActive() {
    return document.documentElement.getAttribute('data-pointer-input') === 'touch';
  }

  function refreshCursorOverlayVisibility() {
    // Preference stays in data-custom-cursor / localStorage; touch only suppresses overlays.
    var show = isCustomCursorEnabled() && !isTouchPointerActive();
    document.querySelectorAll('#cursor').forEach(function (el) {
      el.classList.toggle('hidden', !show);
    });
    document.querySelectorAll('.brushCursor').forEach(function (el) {
      el.classList.toggle('hidden', !show);
    });
  }

  function setPointerInputKind(kind) {
    var next = kind === 'touch' ? 'touch' : 'fine';
    var root = document.documentElement;
    if (root.getAttribute('data-pointer-input') === next) return;
    root.setAttribute('data-pointer-input', next);
    refreshCursorOverlayVisibility();
    try {
      root.dispatchEvent(new CustomEvent('pt1-pointer-input', { detail: { kind: next } }));
    } catch (e) {}
  }

  var lastTouchAt = 0;
  // Ghost mouse/pointer events follow a tap on mobile. If they flip the
  // page back to a fine pointer, the idle cursor overlay arms and then
  // swallows later taps. Hold touch mode briefly after any real touch.
  var TOUCH_HOLD_MS = 1200;

  function eventFromTouch(ev) {
    if (!ev) return false;
    if (ev.type === 'touchstart' || ev.pointerType === 'touch') return true;
    var caps = ev.sourceCapabilities;
    return !!(caps && caps.firesTouchEvents);
  }

  function notePointerTypeEvent(ev) {
    if (!ev) return;
    if (eventFromTouch(ev)) {
      lastTouchAt = Date.now();
      setPointerInputKind('touch');
      return;
    }
    var t = ev.pointerType;
    if (t === 'mouse' || t === 'pen') {
      if (Date.now() - lastTouchAt < TOUCH_HOLD_MS) return;
      setPointerInputKind('fine');
    }
  }

  function wirePointerInputDetection() {
    if (document.documentElement.dataset.pointerInputWired === '1') return;
    document.documentElement.dataset.pointerInputWired = '1';
    if (!document.documentElement.getAttribute('data-pointer-input')) {
      document.documentElement.setAttribute('data-pointer-input', 'fine');
    }
    document.addEventListener('pointerdown', notePointerTypeEvent, true);
    document.addEventListener('pointermove', notePointerTypeEvent, true);
    document.addEventListener('touchstart', notePointerTypeEvent, { capture: true, passive: true });
  }

  function applyCursorState(opts) {
    var root = document.documentElement;
    var enabled = (opts && typeof opts.enabled === 'boolean')
      ? opts.enabled
      : isCustomCursorEnabled();
    var skin = (opts && opts.skin) || currentCursorSkin();
    if (skin === 'off') skin = 'system';
    if (CURSOR_SKINS.indexOf(skin) === -1) skin = 'system';
    try {
      localStorage.setItem(CURSOR_ON_KEY, enabled ? 'on' : 'off');
      localStorage.setItem(CURSOR_SKIN_KEY, skin);
    } catch (e) {}
    root.setAttribute('data-custom-cursor', enabled ? 'on' : 'off');
    root.setAttribute('data-cursor', skin);
    refreshCursorOverlayVisibility();
    syncCursorPickerUI();
  }

  function applyCursorChoice(value) {
    // Selecting a skin (including System) turns custom cursors ON and applies that skin.
    applyCursorState({ enabled: true, skin: value || 'system' });
  }

  function setCustomCursorEnabled(on) {
    applyCursorState({ enabled: !!on, skin: currentCursorSkin() });
  }

  function wireCursorPicker() {
    var grid = document.getElementById('cursor-skin-grid');
    var toggle = document.getElementById('custom-cursor-toggle');
    if (toggle && toggle.dataset.wired !== '1') {
      toggle.dataset.wired = '1';
      toggle.addEventListener('change', function () {
        setCustomCursorEnabled(!!toggle.checked);
      });
    }
    if (!grid) {
      syncCursorPickerUI();
      return;
    }
    var firstWire = grid.dataset.wired !== '1';
    if (firstWire) {
      grid.dataset.wired = '1';
      grid.addEventListener('click', function (e) {
        var btn = e.target.closest('.cursor-skin-opt');
        if (!btn || !grid.contains(btn)) return;
        if (grid.classList.contains('cursor-skins-disabled')) return;
        applyCursorChoice(btn.getAttribute('data-cursor-skin'));
      });
      applyCursorState({ enabled: isCustomCursorEnabled(), skin: currentCursorSkin() });
    } else {
      syncCursorPickerUI();
    }
  }

  global.applyCursorChoice = applyCursorChoice;
  global.setCustomCursorEnabled = setCustomCursorEnabled;
  global.syncCursorPickerUI = syncCursorPickerUI;
  global.isCustomCursorEnabled = isCustomCursorEnabled;
  global.currentCursorSkin = currentCursorSkin;
  global.isTouchPointerActive = isTouchPointerActive;
  global.refreshCursorOverlayVisibility = refreshCursorOverlayVisibility;
  wirePointerInputDetection();

(function initThemeSystem() {
const picker = document.getElementById('accent-color-picker');
const hexInput = document.getElementById('accent-hex-input');
const settingsBtn = document.getElementById('settings-btn');
const settingsCloseBtn = document.getElementById('settings-close-btn');
const settingsModal = document.getElementById('settings-modal');
if (settingsBtn) {
settingsBtn.addEventListener('click', function(e) {
e.stopPropagation();
openSettingsModal();
});
// Sometimes run the gear cycle in slow motion (incl. recoils), not always full speed.
settingsBtn.addEventListener('mouseenter', function() {
  var slow = Math.random() < 0.4;
  var dur = slow ? (9 + Math.random() * 5) : (5.0 + Math.random() * 0.8);
  settingsBtn.style.setProperty('--gear-dur', dur.toFixed(2) + 's');
});
// Long-hover fade: after random 5–7s continuous hover, fade opacity to 0.05 over 3s.
// On mouseleave, restore with accelerating ease to a settled 0.7 over ~4.5–6s.
// Cancel pending fade if leave early; the next hover can fade again from 0.7.
(function wireSettingsBtnHoverFade(btn) {
  var hoverTimer = null;
  var fadeRaf = null;
  var fadeToken = 0;

  function cancelHoverTimer() {
    if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
  }
  function cancelRaf() {
    if (fadeRaf) { cancelAnimationFrame(fadeRaf); fadeRaf = null; }
  }
  function currentOpacity() {
    var v = parseFloat(btn.style.opacity);
    return Number.isFinite(v) ? v : 1;
  }
  function setOpacity(v) {
    btn.style.opacity = String(v);
  }
  function animateOpacity(from, to, durationMs, easeFn) {
    cancelRaf();
    var token = ++fadeToken;
    var start = performance.now();
    function frame(now) {
      if (token !== fadeToken) return;
      var t = Math.min(1, (now - start) / durationMs);
      setOpacity(from + (to - from) * easeFn(t));
      if (t < 1) fadeRaf = requestAnimationFrame(frame);
      else fadeRaf = null;
    }
    fadeRaf = requestAnimationFrame(frame);
  }
  function easeLinear(t) { return t; }
  // Accelerating restore (ease-in cubic).
  function easeInAccel(t) { return t * t * t; }

  btn.addEventListener('mouseenter', function() {
    cancelHoverTimer();
    // If mid-restore, keep current opacity and arm a fresh delay from here.
    cancelRaf();
    fadeToken++;
    var delay = 5000 + Math.random() * 2000; // 5–7s
    hoverTimer = setTimeout(function() {
      hoverTimer = null;
      var from = currentOpacity();
      animateOpacity(from, 0.05, 3000, easeLinear);
    }, delay);
  });

  btn.addEventListener('mouseleave', function() {
    cancelHoverTimer(); // cancel pending fade if leave early
    var from = currentOpacity();
    var dur = 4500 + Math.random() * 1500; // 4.5–6s
    animateOpacity(from, 0.7, dur, easeInAccel);
  });
})(settingsBtn);
}
if (settingsCloseBtn) {
settingsCloseBtn.addEventListener('click', function(e) {
e.stopPropagation();
closeSettingsModal();
});
}
if (settingsModal) {
settingsModal.addEventListener('click', function(e) {
if (e.target === settingsModal) closeSettingsModal();
});
}
const strengthSlider = document.getElementById('accent-strength-slider');
function updateThemeFromInputs() {
const hex = picker ? picker.value : '#ff8800';
const strength = strengthSlider ? parseInt(strengthSlider.value) : 100;
const displayEl = document.getElementById('strength-value-display');
if (displayEl) displayEl.textContent = strength;
changeAccentColor(hex, strength);
handleColorChange();
}
if (picker) {
picker.addEventListener('input', function() {
if (hexInput) hexInput.value = picker.value.toUpperCase();
updateThemeFromInputs();
});
}
if (hexInput) {
hexInput.addEventListener('change', function() {
var v = hexInput.value.trim();
if (v[0] !== '#') v = '#' + v;
if (/^#[0-9A-Fa-f]{6}$/.test(v)) {
if (picker) picker.value = v;
updateThemeFromInputs();
}
});
}
if (strengthSlider) {
strengthSlider.addEventListener('input', updateThemeFromInputs);
}
const lightToggle = document.getElementById('light-mode-toggle');
if (lightToggle) {
lightToggle.addEventListener('change', function() {
document.documentElement.classList.toggle('light-mode', this.checked);
localStorage.setItem('atc_light_mode', this.checked ? '1' : '0');
const hex = picker ? picker.value : '#000000';
const str = strengthSlider ? parseInt(strengthSlider.value) : 90;
changeAccentColor(hex, str);
});
}
// Main Menu (index): keep hardcoded theme-vars accents — never apply Quiz colorizer / Violet.
var isMainMenu = !!document.getElementById('ps2-home');
if (isMainMenu) {
loadAppSettings();
applyExtraGlow();
wireFontPickers();
wireCursorPicker();
document.body.style.opacity = "1";
return;
}

// Quiz default when no saved theme: Maroon (matches applyPreset('#330000', false, 90))
var DEFAULT_ACCENT_HEX = '#330000';
var DEFAULT_ACCENT_STRENGTH = 90;
let initialColor = DEFAULT_ACCENT_HEX;
let initialStrength = DEFAULT_ACCENT_STRENGTH;
var hadSavedColor = false;
try {
const savedColor = localStorage.getItem(THEME_STORAGE_KEY);
if (savedColor && savedColor[0] === '#' && savedColor.length === 7) {
initialColor = savedColor;
hadSavedColor = true;
}
const savedMode = localStorage.getItem('atc_light_mode');
if (savedMode === '1') {
document.documentElement.classList.add('light-mode');
if(lightToggle) lightToggle.checked = true;
}
const savedStrength = localStorage.getItem('atc_accent_strength');
if(savedStrength) initialStrength = parseInt(savedStrength);
} catch (e) { console.warn("Could not load saved theme:", e); }
if (picker) picker.value = initialColor;
if (hexInput) hexInput.value = initialColor.toUpperCase();
if (strengthSlider) strengthSlider.value = initialStrength;
const displayEl = document.getElementById('strength-value-display');
if (displayEl) displayEl.textContent = initialStrength;
loadCustomPresets();
if(_activePresetType==='custom'&&_customPresets[_activeCustomIdx]){var cp=_customPresets[_activeCustomIdx];initialColor=cp.hex;initialStrength=cp.strength;if(picker)picker.value=initialColor;if(hexInput)hexInput.value=initialColor.toUpperCase();if(strengthSlider)strengthSlider.value=initialStrength;var de=document.getElementById('strength-value-display');if(de)de.textContent=initialStrength;}
else if(!hadSavedColor && !_activePresetType){
  // No saved theme: show Maroon as the active standard preset
  initialColor = DEFAULT_ACCENT_HEX;
  initialStrength = DEFAULT_ACCENT_STRENGTH;
  if (picker) picker.value = initialColor;
  if (hexInput) hexInput.value = initialColor.toUpperCase();
  if (strengthSlider) strengthSlider.value = initialStrength;
  if (displayEl) displayEl.textContent = initialStrength;
  _activePresetType = 'standard';
  _activeCustomIdx = -1;
}
changeAccentColor(initialColor, initialStrength);
syncAllPresetHighlights();
renderCustomPresets();
if(strengthSlider) {
strengthSlider.addEventListener('change', function() {
localStorage.setItem('atc_accent_strength', strengthSlider.value);
});
}
loadAppSettings();
applyThemeLocks();
applyExtraGlow();
wireFontPickers();
wireCursorPicker();
document.body.style.opacity = "1";
})();

})(typeof window !== 'undefined' ? window : globalThis);
