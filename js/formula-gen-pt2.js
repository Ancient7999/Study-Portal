/**
 * Unlimited formula practice generators for Medical Physics Periodic Test 2
 * Scope: Chapter 3 (Bernoulli to surface tension), Chapter 4 (waves, sound, temperature)
 * and Chapter 5 (ray optics). Same architecture as the PT1 generator:
 * FORMULA_METADATA + QUESTION_GENERATORS + variants, exposed as window.Pt2FormulaGen.
 * Symbols follow content/medphys/pt2: Pₜ = transmural pressure, μ = wall thickness,
 * r = lens separation, T_K = T_C + 273, d_o / d_i with real-is-positive signs.
 */
(function (global) {
  'use strict';

  const G = 9.8;
  const C_LIGHT = 3e8;

  const FORMULA_METADATA = {
    bernoulli:        { name: "Bernoulli's equation",  description: 'P + ½ρv² + ρgh = constant', variants: ['ΔP from speeds', 'ΔP from height', 'v₂ from ΔP'] },
    viscosity:        { name: 'Viscous force',         description: 'F = η A v / y', variants: ['F', 'η', 'v', 'y'] },
    poiseuille:       { name: "Poiseuille's law",      description: 'Q = π r⁴ ΔP / (8 η L)', variants: ['Q', 'ΔP', 'radius ratio', 'η'] },
    laplaceCylinder:  { name: "Laplace's law (vessel)", description: 'T = P × r', variants: ['T', 'P', 'r'] },
    wallStress:       { name: 'Wall stress',           description: 'σ = Pₜ R / μ', variants: ['σ', 'Pₜ', 'μ'] },
    reynolds:         { name: 'Reynolds number',       description: 'Re = ρ v D / η', variants: ['Re', 'v', 'D'] },
    surfaceTension:   { name: 'Surface tension',       description: 'T = F / L', variants: ['T', 'F', 'L'] },
    alveolus:         { name: 'Alveolar pressure',     description: 'P = 2T / r', variants: ['P', 'T', 'r'] },
    waveSpeed:        { name: 'Wave speed',            description: 'v = f λ', variants: ['v', 'f', 'λ'] },
    periodFreq:       { name: 'Period and frequency',  description: 'T = 1 / f', variants: ['T', 'f'] },
    soundSpeed:       { name: 'Speed of sound',        description: 'v = √(B / ρ)', variants: ['v', 'B', 'ρ'] },
    dopplerSource:    { name: 'Doppler effect (source moving)', description: 'f′ = f × v / (v ∓ v_S)', variants: ['towards', 'away', 'v_S'] },
    mach:             { name: 'Mach number',           description: 'Ma = v_S / v', variants: ['Ma', 'v_S'] },
    tempConvert:      { name: 'Temperature scales',    description: 'T_K = T_C + 273 · T_F = (9/5)T_C + 32', variants: ['C → K', 'K → C', 'C → F', 'F → C'] },
    refractiveIndex:  { name: 'Refractive index',      description: 'n = c / v', variants: ['n', 'v'] },
    snell:            { name: "Snell's law",           description: 'n₁ sin θ₁ = n₂ sin θ₂', variants: ['θ₂', 'n₂', 'θ₁'] },
    criticalAngle:    { name: 'Critical angle',        description: 'sin θc = n₂ / n₁', variants: ['θc', 'n₁'] },
    mirrorFocal:      { name: 'Mirror focal length',   description: 'f = r / 2', variants: ['f', 'r'] },
    thinLens:         { name: 'Thin lens equation',    description: '1/d_o + 1/d_i = 1/f', variants: ['d_i', 'f', 'd_o'] },
    magnification:    { name: 'Magnification',         description: 'm = h_i / h_o = −d_i / d_o', variants: ['m', 'h_i', 'd_i'] },
    lensPower:        { name: 'Lens power',            description: 'P = 1 / f', variants: ['P', 'f'] },
    powerSum:         { name: 'Lenses in contact',     description: 'P = P₁ + P₂', variants: ['P', 'P₂'] },
    separatedLenses:  { name: 'Lenses apart',          description: '1/f = 1/f₁ + 1/f₂ − r / (f₁ f₂)', variants: ['f', 'r = 0 check'] }
  };

  /* —— helpers (as in PT1) —— */
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function shuffle(a) { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = x[i]; x[i] = x[j]; x[j] = t; } return x; }
  function toSuperscript(exp) { const map = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻', '+': '⁺' }; return String(exp).split('').map(function (c) { return map[c] || c; }).join(''); }
  function fmtSci(n, digits) {
    if (!Number.isFinite(n)) return String(n);
    const d = digits == null ? 3 : digits; const abs = Math.abs(n);
    if (abs !== 0 && (abs >= 1e4 || abs < 1e-2)) {
      let exp = Math.floor(Math.log10(abs)); let mant = n / Math.pow(10, exp);
      if (Math.abs(Number(mant.toFixed(d))) >= 10) { exp += 1; mant = n / Math.pow(10, exp); }
      return mant.toFixed(d).replace(/\.?0+$/, '') + ' × 10' + toSuperscript(exp);
    }
    if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n)).replace('-', '−');
    return n.toFixed(d).replace(/\.?0+$/, '').replace('-', '−');
  }
  function fmtWithUnit(n, unit, digits) { return fmtSci(n, digits) + (unit ? ' ' + unit : ''); }
  function mapLine(valueText, symbol) { return valueText + ' → ' + symbol; }
  const R2D = 180 / Math.PI, D2R = Math.PI / 180;

  /**
   * Options from the correct value plus distractors. Works for negative answers
   * (sign-flip distractor allowed) and for pure ratios (unit '').
   * Labels are compared as text, so the 4 options are always distinct.
   */
  function buildOpts(ans, unit, digits, extra) {
    const mults = [0.25, 0.5, 2, 4, 0.1, 10, 0.2, 5, 1.5, 0.75, 3, 1 / 3];
    const vals = [ans]; const labels = [fmtWithUnit(ans, unit, digits)];
    function tryAdd(c) {
      if (!Number.isFinite(c)) return;
      const minDiff = Math.max(Math.abs(ans) * 0.08, 1e-12);
      if (!vals.every(function (v) { return Math.abs(v - c) >= minDiff; })) return;
      const l = fmtWithUnit(c, unit, digits); if (labels.indexOf(l) >= 0) return;
      vals.push(c); labels.push(l);
    }
    (extra || []).forEach(function (c) { if (vals.length < 4) tryAdd(c); });
    let tries = 0;
    while (vals.length < 4 && tries < 80) { tries++; tryAdd(ans * pick(mults)); }
    let k = 1; while (vals.length < 4) { tryAdd(ans === 0 ? k : ans * (1 + 0.37 * k)); k++; }
    const order = shuffle([0, 1, 2, 3]);
    return { options: order.map(function (i) { return labels[i]; }), correct: order.indexOf(0), value: ans };
  }

  function pack(meta) {
    const md = FORMULA_METADATA[meta.key];
    return {
      type: 'mcq',
      id: 'FORM2_' + meta.key + '_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36),
      cat: 'Formulas · ' + md.name,
      q: meta.q, options: meta.built.options, correct: meta.built.correct, answerValue: meta.built.value,
      explain: meta.explain,
      formulaKey: meta.key, _formulaVariant: meta.variant,
      formulaHint: meta.hint, formulaMap: meta.map || [], formulaPlugIn: meta.plug || '',
      formulaSteps: meta.steps || [], formulaName: md.name, formulaEq: md.description,
      __formulaMode: true
    };
  }
  /** Common finish: steps = [formula, plug-in, result]. */
  function done(key, variant, q, hint, map, plug, ans, unit, digits, extra, explainTail) {
    const res = fmtWithUnit(ans, unit, digits);
    return pack({ key: key, variant: variant, q: q, hint: hint, map: map, plug: plug,
      steps: [hint, '= ' + plug, '= ' + res],
      explain: hint + ' = ' + plug + ' = ' + res + '.' + (explainTail ? ' ' + explainTail : ''),
      built: buildOpts(ans, unit, digits, extra) });
  }

  /* —— Chapter 3 —— */
  function genBernoulli() {
    const v = randInt(0, 2), rho = pick([1000, 1050, 1060]);
    if (v === 0) {
      const v1 = pick([0.5, 1, 1.5, 2, 3]), v2 = v1 * pick([2, 3, 4]);
      const dP = 0.5 * rho * (v2 * v2 - v1 * v1);
      return done('bernoulli', v, 'A fluid of density ' + rho + ' kg/m³ flows in a horizontal tube and speeds up from ' + v1 + ' m/s to ' + fmtSci(v2) + ' m/s. By how much does the pressure fall?',
        'ΔP = ½ ρ (v₂² − v₁²)', [mapLine(rho + ' kg/m³', 'ρ'), mapLine(v1 + ' m/s', 'v₁'), mapLine(fmtSci(v2) + ' m/s', 'v₂')],
        '½ · ' + rho + ' · (' + fmtSci(v2) + '² − ' + v1 + '²)', dP, 'Pa', 3, [0.5 * rho * v2 * v2, rho * (v2 * v2 - v1 * v1), 0.5 * rho * (v2 - v1)]);
    }
    if (v === 1) {
      const h = pick([0.2, 0.5, 1, 1.5, 2]);
      return done('bernoulli', v, 'A fluid of density ' + rho + ' kg/m³ flows at constant speed and rises ' + h + ' m. By how much does the pressure fall?',
        'ΔP = ρ g Δh', [mapLine(rho + ' kg/m³', 'ρ'), mapLine('9.8 m/s²', 'g'), mapLine(h + ' m', 'Δh')], rho + ' · 9.8 · ' + h, rho * G * h, 'Pa', 3, [rho * h, 0.5 * rho * G * h]);
    }
    const v1 = pick([0.5, 1, 2]), dP = pick([1000, 1500, 2000, 4000, 6000]);
    const v2 = Math.sqrt(v1 * v1 + 2 * dP / rho);
    return done('bernoulli', v, 'In a horizontal tube, fluid of density ' + rho + ' kg/m³ moves at ' + v1 + ' m/s. The pressure falls by ' + dP + ' Pa at a narrower section. What is the speed there?',
      'v₂ = √(v₁² + 2ΔP / ρ)', [mapLine(v1 + ' m/s', 'v₁'), mapLine(dP + ' Pa', 'ΔP'), mapLine(rho + ' kg/m³', 'ρ')], '√(' + v1 + '² + 2 · ' + dP + ' / ' + rho + ')', v2, 'm/s', 3, [Math.sqrt(2 * dP / rho), v1 + 2 * dP / rho]);
  }

  function genViscosity() {
    const v = randInt(0, 3);
    const eta = pick([1e-3, 2e-3, 3e-3, 4e-3, 0.1, 0.5]), A = pick([0.01, 0.02, 0.05, 0.1]), sp = pick([0.1, 0.2, 0.5, 1, 2]), y = pick([1e-3, 2e-3, 5e-3, 0.01]);
    const F = eta * A * sp / y;
    const m = { eta: mapLine(fmtSci(eta) + ' Pa·s', 'η'), A: mapLine(fmtSci(A) + ' m²', 'A'), v: mapLine(sp + ' m/s', 'v'), y: mapLine(fmtSci(y) + ' m', 'y'), F: mapLine(fmtSci(F) + ' N', 'F') };
    const base = 'A plate of area ' + fmtSci(A) + ' m² moves over a fluid layer ' + fmtSci(y) + ' m thick';
    if (v === 0) return done('viscosity', v, base + ' at ' + sp + ' m/s. The viscosity is ' + fmtSci(eta) + ' Pa·s. What force is needed?', 'F = η A v / y', [m.eta, m.A, m.v, m.y], fmtSci(eta) + ' · ' + fmtSci(A) + ' · ' + sp + ' / ' + fmtSci(y), F, 'N', 3, [eta * A * y / sp, eta * sp / (A * y)]);
    if (v === 1) return done('viscosity', v, base + ' at ' + sp + ' m/s, pulled by a force of ' + fmtSci(F) + ' N. What is the viscosity?', 'η = F y / (A v)', [m.F, m.A, m.v, m.y], fmtSci(F) + ' · ' + fmtSci(y) + ' / (' + fmtSci(A) + ' · ' + sp + ')', eta, 'Pa·s', 3);
    if (v === 2) return done('viscosity', v, base + '. The viscosity is ' + fmtSci(eta) + ' Pa·s and the force is ' + fmtSci(F) + ' N. At what speed does the plate move?', 'v = F y / (η A)', [m.F, m.y, m.eta, m.A], fmtSci(F) + ' · ' + fmtSci(y) + ' / (' + fmtSci(eta) + ' · ' + fmtSci(A) + ')', sp, 'm/s', 3);
    return done('viscosity', v, 'A plate of area ' + fmtSci(A) + ' m² moves at ' + sp + ' m/s over a fluid of viscosity ' + fmtSci(eta) + ' Pa·s, with a force of ' + fmtSci(F) + ' N. How thick is the fluid layer?', 'y = η A v / F', [m.eta, m.A, m.v, m.F], fmtSci(eta) + ' · ' + fmtSci(A) + ' · ' + sp + ' / ' + fmtSci(F), y, 'm', 3);
  }

  function genPoiseuille() {
    const v = randInt(0, 3);
    const r = pick([1e-3, 1.5e-3, 2e-3, 3e-3, 4e-3]), L = pick([0.05, 0.1, 0.2, 0.5]), eta = pick([3e-3, 4e-3, 1e-3]), dP = pick([100, 200, 500, 1000, 2000]);
    const Q = Math.PI * Math.pow(r, 4) * dP / (8 * eta * L);
    const mr = mapLine(fmtSci(r) + ' m', 'r'), mL = mapLine(L + ' m', 'L'), me = mapLine(fmtSci(eta) + ' Pa·s', 'η'), mP = mapLine(dP + ' Pa', 'ΔP'), mQ = mapLine(fmtSci(Q) + ' m³/s', 'Q');
    const tube = 'A tube of radius ' + fmtSci(r) + ' m and length ' + L + ' m carries a fluid of viscosity ' + fmtSci(eta) + ' Pa·s';
    if (v === 0) return done('poiseuille', v, tube + ' with a pressure difference of ' + dP + ' Pa. What is the volume flow rate?', 'Q = π r⁴ ΔP / (8 η L)', [mr, mP, me, mL], 'π · (' + fmtSci(r) + ')⁴ · ' + dP + ' / (8 · ' + fmtSci(eta) + ' · ' + L + ')', Q, 'm³/s', 3, [Q * 2, Q / r]);
    if (v === 1) return done('poiseuille', v, tube + ' at a flow rate of ' + fmtSci(Q) + ' m³/s. What pressure difference drives it?', 'ΔP = 8 η L Q / (π r⁴)', [mQ, me, mL, mr], '8 · ' + fmtSci(eta) + ' · ' + L + ' · ' + fmtSci(Q) + ' / (π · (' + fmtSci(r) + ')⁴)', dP, 'Pa', 3);
    if (v === 2) {
      const k = pick([0.5, 2, 3, 1.5, 0.8]); const ratio = Math.pow(k, 4);
      return done('poiseuille', v, 'All else unchanged, the radius of a vessel is multiplied by ' + k + '. By what factor does the flow rate change? (Q₂ / Q₁, no unit)', 'Q₂ / Q₁ = (r₂ / r₁)⁴',
        [mapLine(String(k), 'r₂ / r₁')], '(' + k + ')⁴', ratio, '', 3, [k, k * k, Math.pow(k, 3)]);
    }
    return done('poiseuille', v, tube.replace(' carries a fluid of viscosity ' + fmtSci(eta) + ' Pa·s', ' carries a fluid') + '. A pressure difference of ' + dP + ' Pa gives a flow rate of ' + fmtSci(Q) + ' m³/s. What is the viscosity?', 'η = π r⁴ ΔP / (8 Q L)', [mr, mP, mQ, mL], 'π · (' + fmtSci(r) + ')⁴ · ' + dP + ' / (8 · ' + fmtSci(Q) + ' · ' + L + ')', eta, 'Pa·s', 3);
  }

  function genLaplaceCylinder() {
    const v = randInt(0, 2), P = pick([8000, 10000, 13300, 16000, 20000]), r = pick([1e-3, 2e-3, 5e-3, 0.0125, 0.015]); const T = P * r;
    const mP = mapLine(P + ' Pa', 'P'), mr = mapLine(fmtSci(r) + ' m', 'r'), mT = mapLine(fmtSci(T) + ' N/m', 'T');
    if (v === 0) return done('laplaceCylinder', v, 'A blood vessel of radius ' + fmtSci(r) + ' m has an internal pressure of ' + P + ' Pa. What is the wall tension?', 'T = P × r', [mP, mr], P + ' × ' + fmtSci(r), T, 'N/m', 3, [P / r, P * r * r]);
    if (v === 1) return done('laplaceCylinder', v, 'A vessel of radius ' + fmtSci(r) + ' m has a wall tension of ' + fmtSci(T) + ' N/m. What is the pressure inside?', 'P = T / r', [mT, mr], fmtSci(T) + ' / ' + fmtSci(r), P, 'Pa', 3, [T * r]);
    return done('laplaceCylinder', v, 'A vessel at ' + P + ' Pa has a wall tension of ' + fmtSci(T) + ' N/m. What is its radius?', 'r = T / P', [mT, mP], fmtSci(T) + ' / ' + P, r, 'm', 3, [P / T]);
  }

  function genWallStress() {
    const v = randInt(0, 2), Pi = pick([12000, 13300, 16000, 20000]), Pe = pick([0, 500, 1000, 2000]), R = pick([2e-3, 5e-3, 0.01, 0.0125]), mu = pick([2e-4, 5e-4, 1e-3, 2e-3]);
    const Pt = Pi - Pe, s = Pt * R / mu;
    const mPt = mapLine(Pi + ' − ' + Pe + ' = ' + Pt + ' Pa', 'Pₜ'), mR = mapLine(fmtSci(R) + ' m', 'R'), mmu = mapLine(fmtSci(mu) + ' m', 'μ'), ms = mapLine(fmtSci(s) + ' Pa', 'σ');
    if (v === 0) return done('wallStress', v, 'A vessel has inside pressure ' + Pi + ' Pa and outside pressure ' + Pe + ' Pa. Its radius is ' + fmtSci(R) + ' m and its wall is ' + fmtSci(mu) + ' m thick. What is the wall stress?', 'σ = Pₜ R / μ', [mPt, mR, mmu], Pt + ' · ' + fmtSci(R) + ' / ' + fmtSci(mu), s, 'Pa', 3, [Pi * R / mu, Pt * R, Pt * mu / R]);
    if (v === 1) return done('wallStress', v, 'A vessel of radius ' + fmtSci(R) + ' m with a wall ' + fmtSci(mu) + ' m thick has a wall stress of ' + fmtSci(s) + ' Pa. What is the transmural pressure Pₜ?', 'Pₜ = σ μ / R', [ms, mmu, mR], fmtSci(s) + ' · ' + fmtSci(mu) + ' / ' + fmtSci(R), Pt, 'Pa', 3);
    return done('wallStress', v, 'A vessel has a transmural pressure of ' + Pt + ' Pa and radius ' + fmtSci(R) + ' m. Its wall stress is ' + fmtSci(s) + ' Pa. How thick is the wall?', 'μ = Pₜ R / σ', [mapLine(Pt + ' Pa', 'Pₜ'), mR, ms], Pt + ' · ' + fmtSci(R) + ' / ' + fmtSci(s), mu, 'm', 3);
  }

  function genReynolds() {
    const v = randInt(0, 2), rho = pick([1000, 1050, 1060]), eta = pick([3e-3, 4e-3, 1e-3]), sp = pick([0.1, 0.2, 0.3, 0.5, 1]), D = pick([5e-3, 0.01, 0.02, 0.025]);
    const Re = rho * sp * D / eta; const flow = Re < 2000 ? 'laminar' : 'turbulent';
    const mr = mapLine(rho + ' kg/m³', 'ρ'), mv = mapLine(sp + ' m/s', 'v'), mD = mapLine(fmtSci(D) + ' m', 'D'), me = mapLine(fmtSci(eta) + ' Pa·s', 'η');
    if (v === 0) return done('reynolds', v, 'Blood (density ' + rho + ' kg/m³, viscosity ' + fmtSci(eta) + ' Pa·s) flows at ' + sp + ' m/s in a vessel of diameter ' + fmtSci(D) + ' m. What is the Reynolds number? (no unit)', 'Re = ρ v D / η', [mr, mv, mD, me], rho + ' · ' + sp + ' · ' + fmtSci(D) + ' / ' + fmtSci(eta), Re, '', 3, [eta * sp * D / rho * 1e6, Re / 2], 'Re is ' + (Re < 2000 ? 'below' : 'above') + ' 2000, so the flow is ' + flow + '.');
    if (v === 1) return done('reynolds', v, 'A fluid (density ' + rho + ' kg/m³, viscosity ' + fmtSci(eta) + ' Pa·s) in a tube of diameter ' + fmtSci(D) + ' m has Re = ' + fmtSci(Re) + '. What is the flow speed?', 'v = Re η / (ρ D)', [mapLine(fmtSci(Re), 'Re'), me, mr, mD], fmtSci(Re) + ' · ' + fmtSci(eta) + ' / (' + rho + ' · ' + fmtSci(D) + ')', sp, 'm/s', 3);
    return done('reynolds', v, 'A fluid (density ' + rho + ' kg/m³, viscosity ' + fmtSci(eta) + ' Pa·s) flows at ' + sp + ' m/s with Re = ' + fmtSci(Re) + '. What is the tube diameter?', 'D = Re η / (ρ v)', [mapLine(fmtSci(Re), 'Re'), me, mr, mv], fmtSci(Re) + ' · ' + fmtSci(eta) + ' / (' + rho + ' · ' + sp + ')', D, 'm', 3);
  }

  function genSurfaceTension() {
    const v = randInt(0, 2), T = pick([0.025, 0.05, 0.07, 0.072, 0.0728]), L = pick([0.02, 0.05, 0.1, 0.2]); const F = T * L;
    if (v === 0) return done('surfaceTension', v, 'A surface force of ' + fmtSci(F) + ' N acts along a line ' + L + ' m long on a liquid surface. What is the surface tension?', 'T = F / L', [mapLine(fmtSci(F) + ' N', 'F'), mapLine(L + ' m', 'L')], fmtSci(F) + ' / ' + L, T, 'N/m', 3, [F * L]);
    if (v === 1) return done('surfaceTension', v, 'A liquid has a surface tension of ' + T + ' N/m. What force acts along a line ' + L + ' m long on its surface?', 'F = T × L', [mapLine(T + ' N/m', 'T'), mapLine(L + ' m', 'L')], T + ' × ' + L, F, 'N', 3, [T / L]);
    return done('surfaceTension', v, 'A liquid with surface tension ' + T + ' N/m pulls with ' + fmtSci(F) + ' N along a line on its surface. How long is the line?', 'L = F / T', [mapLine(fmtSci(F) + ' N', 'F'), mapLine(T + ' N/m', 'T')], fmtSci(F) + ' / ' + T, L, 'm', 3, [F * T]);
  }

  function genAlveolus() {
    const v = randInt(0, 2), T = pick([0.005, 0.01, 0.025, 0.05, 0.07]), r = pick([5e-5, 1e-4, 1.5e-4, 2e-4]); const P = 2 * T / r;
    if (v === 0) return done('alveolus', v, 'An alveolus of radius ' + fmtSci(r) + ' m has a lining with surface tension ' + T + ' N/m. What pressure is needed to keep it open?', 'P = 2T / r', [mapLine(T + ' N/m', 'T'), mapLine(fmtSci(r) + ' m', 'r')], '2 · ' + T + ' / ' + fmtSci(r), P, 'Pa', 3, [T / r, 4 * T / r]);
    if (v === 1) return done('alveolus', v, 'An alveolus of radius ' + fmtSci(r) + ' m needs ' + fmtSci(P) + ' Pa to stay open. What is the surface tension of its lining?', 'T = P r / 2', [mapLine(fmtSci(P) + ' Pa', 'P'), mapLine(fmtSci(r) + ' m', 'r')], fmtSci(P) + ' · ' + fmtSci(r) + ' / 2', T, 'N/m', 3, [P * r]);
    return done('alveolus', v, 'The lining of an alveolus has surface tension ' + T + ' N/m, and ' + fmtSci(P) + ' Pa keeps it open. What is its radius?', 'r = 2T / P', [mapLine(T + ' N/m', 'T'), mapLine(fmtSci(P) + ' Pa', 'P')], '2 · ' + T + ' / ' + fmtSci(P), r, 'm', 3, [T / P]);
  }

  /* —— Chapter 4 —— */
  function genWaveSpeed() {
    const v = randInt(0, 2), sp = pick([340, 343, 1482, 1540, 5941]), f = pick([256, 440, 512, 1000, 2000, 2.5e6, 5e6]); const lam = sp / f;
    if (v === 0) return done('waveSpeed', v, 'A wave has frequency ' + fmtSci(f) + ' Hz and wavelength ' + fmtSci(lam) + ' m. What is its speed?', 'v = f λ', [mapLine(fmtSci(f) + ' Hz', 'f'), mapLine(fmtSci(lam) + ' m', 'λ')], fmtSci(f) + ' × ' + fmtSci(lam), sp, 'm/s', 3, [f / lam]);
    if (v === 1) return done('waveSpeed', v, 'Sound travels at ' + sp + ' m/s with a wavelength of ' + fmtSci(lam) + ' m. What is its frequency?', 'f = v / λ', [mapLine(sp + ' m/s', 'v'), mapLine(fmtSci(lam) + ' m', 'λ')], sp + ' / ' + fmtSci(lam), f, 'Hz', 3, [sp * lam]);
    return done('waveSpeed', v, 'Sound of frequency ' + fmtSci(f) + ' Hz travels at ' + sp + ' m/s. What is its wavelength?', 'λ = v / f', [mapLine(sp + ' m/s', 'v'), mapLine(fmtSci(f) + ' Hz', 'f')], sp + ' / ' + fmtSci(f), lam, 'm', 3, [f / sp, sp * f]);
  }

  function genPeriodFreq() {
    const v = randInt(0, 1), f = pick([2, 4, 5, 10, 20, 50, 100, 250, 500, 1000]); const T = 1 / f;
    if (v === 0) return done('periodFreq', v, 'A wave has a frequency of ' + f + ' Hz. What is its time period?', 'T = 1 / f', [mapLine(f + ' Hz', 'f')], '1 / ' + f, T, 's', 3, [f, 2 / f]);
    return done('periodFreq', v, 'One full vibration takes ' + fmtSci(T) + ' s. What is the frequency?', 'f = 1 / T', [mapLine(fmtSci(T) + ' s', 'T')], '1 / ' + fmtSci(T), f, 'Hz', 3, [T]);
  }

  function genSoundSpeed() {
    const v = randInt(0, 2);
    const m = pick([{ B: 2.2e9, rho: 1000, n: 'water' }, { B: 2.25e9, rho: 1025, n: 'seawater' }, { B: 1.42e5, rho: 1.2, n: 'air' }, { B: 2.6e9, rho: 1060, n: 'soft tissue' }]);
    const sp = Math.sqrt(m.B / m.rho);
    if (v === 0) return done('soundSpeed', v, 'For ' + m.n + ', the bulk modulus is ' + fmtSci(m.B) + ' Pa and the density is ' + m.rho + ' kg/m³. What is the speed of sound?', 'v = √(B / ρ)', [mapLine(fmtSci(m.B) + ' Pa', 'B'), mapLine(m.rho + ' kg/m³', 'ρ')], '√(' + fmtSci(m.B) + ' / ' + m.rho + ')', sp, 'm/s', 3, [m.B / m.rho, Math.sqrt(m.rho / m.B)]);
    if (v === 1) return done('soundSpeed', v, 'Sound travels at ' + fmtSci(sp) + ' m/s in a medium of density ' + m.rho + ' kg/m³. What is its bulk modulus?', 'B = ρ v²', [mapLine(fmtSci(sp) + ' m/s', 'v'), mapLine(m.rho + ' kg/m³', 'ρ')], m.rho + ' · (' + fmtSci(sp) + ')²', m.B, 'Pa', 3, [m.rho * sp]);
    return done('soundSpeed', v, 'Sound travels at ' + fmtSci(sp) + ' m/s in a medium with bulk modulus ' + fmtSci(m.B) + ' Pa. What is its density?', 'ρ = B / v²', [mapLine(fmtSci(m.B) + ' Pa', 'B'), mapLine(fmtSci(sp) + ' m/s', 'v')], fmtSci(m.B) + ' / (' + fmtSci(sp) + ')²', m.rho, 'kg/m³', 3, [m.B / sp]);
  }

  function genDopplerSource() {
    const v = randInt(0, 2), c = pick([340, 343]), f = pick([400, 500, 600, 800, 1000]), vs = pick([10, 20, 25, 30, 34, 40]);
    const mv = mapLine(c + ' m/s', 'v'), mf = mapLine(f + ' Hz', 'f'), ms = mapLine(vs + ' m/s', 'v_S');
    if (v === 0) { const fp = f * c / (c - vs); return done('dopplerSource', v, 'A siren of ' + f + ' Hz moves towards a person at rest at ' + vs + ' m/s. Sound travels at ' + c + ' m/s. What frequency does the person hear?', "f′ = f × v / (v − v_S)", [mf, mv, ms], f + ' × ' + c + ' / (' + c + ' − ' + vs + ')', fp, 'Hz', 1, [f * c / (c + vs), f * (c + vs) / c, f], 'Towards each other, so f′ is higher than f.'); }
    if (v === 1) { const fp = f * c / (c + vs); return done('dopplerSource', v, 'A siren of ' + f + ' Hz moves away from a person at rest at ' + vs + ' m/s. Sound travels at ' + c + ' m/s. What frequency does the person hear?', "f′ = f × v / (v + v_S)", [mf, mv, ms], f + ' × ' + c + ' / (' + c + ' + ' + vs + ')', fp, 'Hz', 1, [f * c / (c - vs), f * (c - vs) / c, f], 'Moving apart, so f′ is lower than f.'); }
    const fp = f * c / (c - vs);
    return done('dopplerSource', v, 'A source of ' + f + ' Hz moves towards a person at rest, who hears ' + fmtSci(fp, 1) + ' Hz. Sound travels at ' + c + ' m/s. How fast is the source moving?', "v_S = v (1 − f / f′)", [mf, mapLine(fmtSci(fp, 1) + ' Hz', "f′"), mv], c + ' × (1 − ' + f + ' / ' + fmtSci(fp, 1) + ')', vs, 'm/s', 3);
  }

  function genMach() {
    const v = randInt(0, 1), c = pick([330, 340, 343]), Ma = pick([0.5, 0.8, 1.2, 1.5, 2, 2.3, 3]); const vs = Ma * c;
    if (v === 0) return done('mach', v, 'A plane flies at ' + fmtSci(vs) + ' m/s where sound travels at ' + c + ' m/s. What is its Mach number? (no unit)', 'Ma = v_S / v', [mapLine(fmtSci(vs) + ' m/s', 'v_S'), mapLine(c + ' m/s', 'v')], fmtSci(vs) + ' / ' + c, Ma, '', 3, [1 / Ma], Ma > 1 ? 'Ma > 1, so the flight is supersonic.' : 'Ma < 1, so the flight is subsonic.');
    return done('mach', v, 'A plane flies at Mach ' + Ma + ' where sound travels at ' + c + ' m/s. What is its speed?', 'v_S = Ma × v', [mapLine(String(Ma), 'Ma'), mapLine(c + ' m/s', 'v')], Ma + ' × ' + c, vs, 'm/s', 3, [c / Ma]);
  }

  function genTempConvert() {
    const v = randInt(0, 3);
    if (v === 0) { const C = pick([-40, -20, 0, 15, 25, 37, 100]); return done('tempConvert', v, 'Convert ' + fmtSci(C) + ' °C to kelvin.', 'T_K = T_C + 273', [mapLine(fmtSci(C) + ' °C', 'T_C')], fmtSci(C) + ' + 273', C + 273, 'K', 3, [C - 273, 273 - C, C + 32]); }
    if (v === 1) { const K = pick([233, 253, 273, 300, 310, 373]); return done('tempConvert', v, 'Convert ' + K + ' K to degrees Celsius.', 'T_C = T_K − 273', [mapLine(K + ' K', 'T_K')], K + ' − 273', K - 273, '°C', 3, [K + 273, 273 - K, K - 32]); }
    if (v === 2) { const C = pick([-40, -10, 0, 20, 37, 39, 100]); const F = 9 / 5 * C + 32; return done('tempConvert', v, 'Convert ' + fmtSci(C) + ' °C to degrees Fahrenheit.', 'T_F = (9/5) T_C + 32', [mapLine(fmtSci(C) + ' °C', 'T_C')], '(9/5) · ' + fmtSci(C) + ' + 32', F, '°F', 3, [9 / 5 * C - 32, 5 / 9 * C + 32, 5 / 9 * (C - 32)]); }
    const F = pick([-40, 14, 32, 50, 98.6, 212]); const C = 5 / 9 * (F - 32);
    return done('tempConvert', v, 'Convert ' + fmtSci(F) + ' °F to degrees Celsius.', 'T_C = (5/9)(T_F − 32)', [mapLine(fmtSci(F) + ' °F', 'T_F')], '(5/9) · (' + fmtSci(F) + ' − 32)', C, '°C', 3, [5 / 9 * F - 32, 9 / 5 * (F - 32), (F - 32) / 2]);
  }

  /* —— Chapter 5 —— */
  const MEDIA = [{ n: 1.33, name: 'water' }, { n: 1.5, name: 'glass' }, { n: 2.42, name: 'diamond' }, { n: 1.31, name: 'ice' }, { n: 1.36, name: 'ethyl alcohol' }, { n: 1.46, name: 'fused quartz' }];
  function genRefractiveIndex() {
    const v = randInt(0, 1), m = pick(MEDIA); const sp = C_LIGHT / m.n;
    if (v === 0) return done('refractiveIndex', v, 'Light travels at ' + fmtSci(sp) + ' m/s in ' + m.name + '. What is its refractive index? (c = 3 × 10⁸ m/s, no unit)', 'n = c / v', [mapLine('3 × 10⁸ m/s', 'c'), mapLine(fmtSci(sp) + ' m/s', 'v')], '3 × 10⁸ / ' + fmtSci(sp), m.n, '', 3, [1 / m.n, m.n - 1]);
    return done('refractiveIndex', v, m.name.charAt(0).toUpperCase() + m.name.slice(1) + ' has n = ' + m.n + '. What is the speed of light in it? (c = 3 × 10⁸ m/s)', 'v = c / n', [mapLine('3 × 10⁸ m/s', 'c'), mapLine(String(m.n), 'n')], '3 × 10⁸ / ' + m.n, sp, 'm/s', 3, [C_LIGHT * m.n]);
  }

  function genSnell() {
    const v = randInt(0, 2);
    for (;;) {
      const into = Math.random() < 0.5; const m = pick(MEDIA);
      const n1 = into ? 1 : m.n, n2 = into ? m.n : 1; const t1 = randInt(10, 70);
      const s2 = n1 * Math.sin(t1 * D2R) / n2; if (s2 >= 0.98) continue; // no refracted ray (total internal reflection): roll again
      const t2 = Math.asin(s2) * R2D; const a = into ? 'air into ' + m.name : m.name + ' into air';
      const mn = [mapLine(String(n1), 'n₁'), mapLine(String(n2), 'n₂')];
      if (v === 0) return done('snell', v, 'Light passes from ' + a + ' (n₁ = ' + n1 + ', n₂ = ' + n2 + ') at ' + t1 + '° to the normal. What is the angle of refraction?', 'θ₂ = sin⁻¹(n₁ sin θ₁ / n₂)', mn.concat(mapLine(t1 + '°', 'θ₁')), 'sin⁻¹(' + n1 + ' · sin ' + t1 + '° / ' + n2 + ')', t2, '°', 1, [t1 * n1 / n2 === t2 ? t1 : t1, Math.asin(Math.min(0.999, n2 * Math.sin(t1 * D2R) / n1 * 0.5 + 0.1)) * R2D, 90 - t2]);
      if (v === 1) { if (!into) continue; return done('snell', v, 'Light in air hits a material at ' + t1 + '° to the normal and refracts at ' + t2.toFixed(1) + '°. What is the refractive index of the material? (no unit)', 'n₂ = n₁ sin θ₁ / sin θ₂', [mapLine('1', 'n₁'), mapLine(t1 + '°', 'θ₁'), mapLine(t2.toFixed(1) + '°', 'θ₂')], '1 · sin ' + t1 + '° / sin ' + t2.toFixed(1) + '°', Math.sin(t1 * D2R) / Math.sin(t2.toFixed(1) * D2R), '', 3, [Math.sin(t2 * D2R) / Math.sin(t1 * D2R), t1 / t2 * 1.4]); }
      return done('snell', v, 'Light passes from ' + a + ' (n₁ = ' + n1 + ', n₂ = ' + n2 + ') and refracts at ' + t2.toFixed(1) + '° to the normal. What was the angle of incidence?', 'θ₁ = sin⁻¹(n₂ sin θ₂ / n₁)', mn.concat(mapLine(t2.toFixed(1) + '°', 'θ₂')), 'sin⁻¹(' + n2 + ' · sin ' + t2.toFixed(1) + '° / ' + n1 + ')', Math.asin(Math.min(1, n2 * Math.sin(t2.toFixed(1) * D2R) / n1)) * R2D, '°', 1, [t2 * 0.5 + 5, 90 - t1]);
    }
  }

  function genCriticalAngle() {
    const v = randInt(0, 1), m = pick(MEDIA); const n2 = 1; const tc = Math.asin(n2 / m.n) * R2D;
    if (v === 0) return done('criticalAngle', v, 'What is the critical angle for light going from ' + m.name + ' (n₁ = ' + m.n + ') into air (n₂ = 1)?', 'θc = sin⁻¹(n₂ / n₁)', [mapLine(String(m.n), 'n₁'), mapLine('1', 'n₂')], 'sin⁻¹(1 / ' + m.n + ')', tc, '°', 1, [90 - tc, Math.acos(1 / m.n) * R2D + 3, tc / 2]);
    return done('criticalAngle', v, 'Light going from a material into air has a critical angle of ' + tc.toFixed(1) + '°. What is the refractive index of the material? (no unit)', 'n₁ = n₂ / sin θc', [mapLine('1', 'n₂'), mapLine(tc.toFixed(1) + '°', 'θc')], '1 / sin ' + tc.toFixed(1) + '°', 1 / Math.sin(tc.toFixed(1) * D2R), '', 3, [Math.sin(tc * D2R), 1 / Math.cos(tc * D2R)]);
  }

  function genMirrorFocal() {
    const v = randInt(0, 1), r = pick([10, 16, 20, 30, 40, 50, 60, 80]);
    if (v === 0) return done('mirrorFocal', v, 'A concave mirror has a radius of curvature of ' + r + ' cm. What is its focal length?', 'f = r / 2', [mapLine(r + ' cm', 'r')], r + ' / 2', r / 2, 'cm', 3, [2 * r, r, r / 4]);
    return done('mirrorFocal', v, 'A concave mirror has a focal length of ' + r / 2 + ' cm. What is its radius of curvature?', 'r = 2f', [mapLine(r / 2 + ' cm', 'f')], '2 × ' + r / 2, r, 'cm', 3, [r / 4, r / 2]);
  }

  /** d_o is never equal to f (no image there); a negative d_i is a virtual image on the object side. */
  function lensPair() {
    for (;;) {
      const f = pick([5, 8, 10, 12, 15, 20, 25]) * (Math.random() < 0.8 ? 1 : -1);
      const dO = pick([4, 5, 6, 10, 12, 15, 20, 24, 30, 40, 60]);
      if (dO === f) continue;
      const dI = 1 / (1 / f - 1 / dO); if (!Number.isFinite(dI) || Math.abs(dI) > 500) continue;
      return { f: f, dO: dO, dI: dI };
    }
  }
  function imageWord(dI) { return dI > 0 ? 'd_i is positive: a real image on the other side of the lens.' : 'd_i is negative: a virtual image on the same side as the object.'; }
  function genThinLens() {
    const v = randInt(0, 2), p = lensPair(); const kind = p.f > 0 ? 'convex' : 'concave';
    if (v === 0) return done('thinLens', v, 'An object is ' + p.dO + ' cm from a ' + kind + ' lens of focal length ' + fmtSci(p.f) + ' cm. What is the image distance d_i?', '1/d_i = 1/f − 1/d_o', [mapLine(p.dO + ' cm', 'd_o'), mapLine(fmtSci(p.f) + ' cm', 'f')], '1 / (1/' + fmtSci(p.f) + ' − 1/' + p.dO + ')', p.dI, 'cm', 3, [-p.dI, 1 / (1 / p.f + 1 / p.dO), p.dO - p.f], imageWord(p.dI));
    if (v === 1) return done('thinLens', v, 'An object ' + p.dO + ' cm from a lens gives an image at d_i = ' + fmtSci(p.dI) + ' cm. What is the focal length?', '1/f = 1/d_o + 1/d_i', [mapLine(p.dO + ' cm', 'd_o'), mapLine(fmtSci(p.dI) + ' cm', 'd_i')], '1 / (1/' + p.dO + ' + 1/' + fmtSci(p.dI) + ')', p.f, 'cm', 3, [-p.f, p.dO + p.dI, 1 / (1 / p.dO - 1 / p.dI)]);
    return done('thinLens', v, 'A lens of focal length ' + fmtSci(p.f) + ' cm forms an image at d_i = ' + fmtSci(p.dI) + ' cm. Where is the object (d_o)?', '1/d_o = 1/f − 1/d_i', [mapLine(fmtSci(p.f) + ' cm', 'f'), mapLine(fmtSci(p.dI) + ' cm', 'd_i')], '1 / (1/' + fmtSci(p.f) + ' − 1/' + fmtSci(p.dI) + ')', p.dO, 'cm', 3, [-p.dO, 1 / (1 / p.f + 1 / p.dI)]);
  }

  function genMagnification() {
    const v = randInt(0, 2), p = lensPair(); const m = -p.dI / p.dO; const ho = pick([1, 2, 3, 4, 5]); const hi = m * ho;
    const look = (m < 0 ? 'inverted' : 'upright') + ', ' + (Math.abs(m) > 1 ? 'larger' : 'smaller') + ' than the object.';
    if (v === 0) return done('magnification', v, 'An object is ' + p.dO + ' cm from a lens and the image is at d_i = ' + fmtSci(p.dI) + ' cm. What is the magnification? (no unit)', 'm = −d_i / d_o', [mapLine(fmtSci(p.dI) + ' cm', 'd_i'), mapLine(p.dO + ' cm', 'd_o')], '−(' + fmtSci(p.dI) + ') / ' + p.dO, m, '', 3, [-m, p.dO / p.dI, 1 / m], 'The image is ' + look);
    if (v === 1) return done('magnification', v, 'An object ' + ho + ' cm tall is ' + p.dO + ' cm from a lens; the image is at d_i = ' + fmtSci(p.dI) + ' cm. What is the image height h_i?', 'h_i = −(d_i / d_o) h_o', [mapLine(ho + ' cm', 'h_o'), mapLine(fmtSci(p.dI) + ' cm', 'd_i'), mapLine(p.dO + ' cm', 'd_o')], '−(' + fmtSci(p.dI) + ' / ' + p.dO + ') × ' + ho, hi, 'cm', 3, [-hi, ho * p.dO / p.dI], hi < 0 ? 'The negative height means the image is inverted.' : 'The positive height means the image is upright.');
    return done('magnification', v, 'A lens gives a magnification of ' + fmtSci(m) + ' for an object ' + p.dO + ' cm away. What is the image distance d_i?', 'd_i = −m d_o', [mapLine(fmtSci(m), 'm'), mapLine(p.dO + ' cm', 'd_o')], '−(' + fmtSci(m) + ') × ' + p.dO, p.dI, 'cm', 3, [-p.dI, p.dO / m]);
  }

  function genLensPower() {
    const v = randInt(0, 1), fcm = pick([10, 20, 25, 40, 50, 100, -20, -25, -50]) ; const f = fcm / 100; const P = 1 / f;
    if (v === 0) return done('lensPower', v, 'A lens has a focal length of ' + fmtSci(fcm) + ' cm. What is its power?', 'P = 1 / f   (f in metres)', [mapLine(fmtSci(fcm) + ' cm = ' + fmtSci(f) + ' m', 'f')], '1 / ' + fmtSci(f), P, 'D', 3, [-P, 1 / fcm, fcm], P > 0 ? 'Positive power: a converging (convex) lens.' : 'Negative power: a diverging (concave) lens.');
    return done('lensPower', v, 'A lens has a power of ' + fmtSci(P) + ' D. What is its focal length?', 'f = 1 / P', [mapLine(fmtSci(P) + ' D', 'P')], '1 / ' + fmtSci(P), f, 'm', 3, [-f, P / 100]);
  }

  function genPowerSum() {
    const v = randInt(0, 1), P1 = pick([-3, -2, -1.75, -1, 1, 1.5, 2, 2.25, 3, 4]); let P2 = pick([-2.5, -1.5, -1, 0.5, 1, 2.25, 2.5, 3.5]);
    if (P1 + P2 === 0) P2 += 0.5;
    const P = P1 + P2;
    if (v === 0) return done('powerSum', v, 'Two thin lenses in contact have powers ' + fmtSci(P1) + ' D and ' + fmtSci(P2) + ' D. What is the power of the pair?', 'P = P₁ + P₂', [mapLine(fmtSci(P1) + ' D', 'P₁'), mapLine(fmtSci(P2) + ' D', 'P₂')], fmtSci(P1) + ' + (' + fmtSci(P2) + ')', P, 'D', 3, [P1 - P2, P1 * P2, -P]);
    return done('powerSum', v, 'Two thin lenses in contact give a total power of ' + fmtSci(P) + ' D. One has ' + fmtSci(P1) + ' D. What is the power of the other?', 'P₂ = P − P₁', [mapLine(fmtSci(P) + ' D', 'P'), mapLine(fmtSci(P1) + ' D', 'P₁')], fmtSci(P) + ' − (' + fmtSci(P1) + ')', P2, 'D', 3, [P + P1, -P2]);
  }

  function genSeparatedLenses() {
    const v = randInt(0, 1);
    for (;;) {
      const f1 = pick([10, 15, 20, 25, 30]), f2 = pick([10, 20, 30, 40]), r = v === 1 ? 0 : pick([2, 5, 10, 15]);
      const inv = 1 / f1 + 1 / f2 - r / (f1 * f2); if (Math.abs(inv) < 1e-3) continue; const f = 1 / inv;
      return done('separatedLenses', v, v === 0
        ? 'Two thin lenses of focal lengths ' + f1 + ' cm and ' + f2 + ' cm are ' + r + ' cm apart. What is the focal length of the pair?'
        : 'Two thin lenses of focal lengths ' + f1 + ' cm and ' + f2 + ' cm touch each other (r = 0). What is the focal length of the pair?',
        '1/f = 1/f₁ + 1/f₂ − r / (f₁ f₂)', [mapLine(f1 + ' cm', 'f₁'), mapLine(f2 + ' cm', 'f₂'), mapLine(r + ' cm', 'r')],
        '1 / (1/' + f1 + ' + 1/' + f2 + ' − ' + r + ' / (' + f1 + ' · ' + f2 + '))', f, 'cm', 3, [f1 + f2, 1 / (1 / f1 + 1 / f2 + r / (f1 * f2)), (f1 + f2) / 2]);
    }
  }

  const QUESTION_GENERATORS = {
    bernoulli: genBernoulli, viscosity: genViscosity, poiseuille: genPoiseuille, laplaceCylinder: genLaplaceCylinder,
    wallStress: genWallStress, reynolds: genReynolds, surfaceTension: genSurfaceTension, alveolus: genAlveolus,
    waveSpeed: genWaveSpeed, periodFreq: genPeriodFreq, soundSpeed: genSoundSpeed, dopplerSource: genDopplerSource,
    mach: genMach, tempConvert: genTempConvert, refractiveIndex: genRefractiveIndex, snell: genSnell,
    criticalAngle: genCriticalAngle, mirrorFocal: genMirrorFocal, thinLens: genThinLens, magnification: genMagnification,
    lensPower: genLensPower, powerSum: genPowerSum, separatedLenses: genSeparatedLenses
  };
  function allKeys() { return Object.keys(QUESTION_GENERATORS); }
  function generateQuestion(selectedKeys) {
    const keys = (selectedKeys && selectedKeys.length ? selectedKeys : allKeys()).filter(function (k) { return QUESTION_GENERATORS[k]; });
    return QUESTION_GENERATORS[pick(keys.length ? keys : allKeys())]();
  }

  global.Pt2FormulaGen = { FORMULA_METADATA: FORMULA_METADATA, QUESTION_GENERATORS: QUESTION_GENERATORS, generateQuestion: generateQuestion, allKeys: allKeys, fmtSci: fmtSci };
})(typeof window !== 'undefined' ? window : globalThis);
