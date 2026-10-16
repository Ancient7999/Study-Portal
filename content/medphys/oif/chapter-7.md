# Chapter 7 — Atomic & Nuclear Physics

---

## 1. Overview & learning map

### What this chapter covers

Chapter 7 starts with **light as particles**, through photons and the photoelectric effect, and **particles as waves**, through de Broglie waves. It then goes inside the atom: the **nucleus**, its size, **isotopes** and stability. The second half is about **radioactivity**: alpha, beta and gamma decay, **activity and half-life**, **carbon dating**, **fission and fusion**, how radiation dose is measured, called **dosimetry**, and how it is detected with the **Geiger–Muller counter**.

Waves in general, with v = f λ, wavelength and frequency, are covered in the Periodic Test 2 notes, Chapter 4.

### Topics map

| Topic | Core idea |
|-------|-----------|
| EM spectrum | γ, X, UV, visible, IR, microwave, radio, in order of increasing wavelength |
| Photon | A quantum of light: E = h f = h c / λ |
| Photoelectric effect | h f = Kₘₐₓ + φ |
| de Broglie | Moving particles have a wavelength λ = h / (m v) |
| Atom & nucleus | Mostly empty space; nucleus of Z protons + N neutrons; A = Z + N |
| Nuclear radius | r = 1.2 × 10⁻¹⁵ m × A^(1/3) |
| Radioactive decay | α: Z − 2, A − 4 · β⁻: Z + 1 · β⁺: Z − 1 · γ: no change |
| Activity & half-life | R = λ N; T½ = 0.693 / λ; 1 Bq = 1 decay/s; 1 Ci = 3.70 × 10¹⁰ Bq |
| Carbon dating | C-14, half-life 5730 years |
| Fission & fusion | Heavy nucleus splits · light nuclei join; both release energy |
| Dosimetry | Gray (J/kg), rad, sievert, rem; dose equivalent = dose × QF |
| Detection | Geiger–Muller counter: radiation ionizes a gas |

---

## 2. Electromagnetic waves and the spectrum

- An **electromagnetic (EM) wave** is made of an **electric field E** and a **magnetic field B** that are **perpendicular to each other and to the direction of travel**.
- All EM waves travel at **c = 3 × 10⁸ m/s** in vacuum, and **f = c / λ**.

<div class="optics-diagram" role="img" aria-label="In an electromagnetic wave the electric and magnetic fields are perpendicular to each other and to the direction of travel">
<svg viewBox="0 0 640 250" xmlns="http://www.w3.org/2000/svg" width="100%" style="height:auto;display:block;max-width:640px;margin:0.6rem auto">
<line x1="40" y1="120" x2="600" y2="120" stroke="var(--col-text-muted)" stroke-width="1.3"/><polygon points="604.8,120 595.2,123.6 595.2,116.4" fill="var(--col-text-muted)"/><text x="596" y="140" text-anchor="end" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="11">direction of travel</text><path d="M40,120.0 L44,112.5 L48,105.1 L52,97.9 L56,91.1 L60,84.7 L64,78.9 L68,73.8 L72,69.3 L76,65.7 L80,62.9 L84,61.1 L88,60.1 L92,60.1 L96,61.1 L100,62.9 L104,65.7 L108,69.3 L112,73.8 L116,78.9 L120,84.7 L124,91.1 L128,97.9 L132,105.1 L136,112.5 L140,120.0 L144,127.5 L148,134.9 L152,142.1 L156,148.9 L160,155.3 L164,161.1 L168,166.2 L172,170.7 L176,174.3 L180,177.1 L184,178.9 L188,179.9 L192,179.9 L196,178.9 L200,177.1 L204,174.3 L208,170.7 L212,166.2 L216,161.1 L220,155.3 L224,148.9 L228,142.1 L232,134.9 L236,127.5 L240,120.0 L244,112.5 L248,105.1 L252,97.9 L256,91.1 L260,84.7 L264,78.9 L268,73.8 L272,69.3 L276,65.7 L280,62.9 L284,61.1 L288,60.1 L292,60.1 L296,61.1 L300,62.9 L304,65.7 L308,69.3 L312,73.8 L316,78.9 L320,84.7 L324,91.1 L328,97.9 L332,105.1 L336,112.5 L340,120.0 L344,127.5 L348,134.9 L352,142.1 L356,148.9 L360,155.3 L364,161.1 L368,166.2 L372,170.7 L376,174.3 L380,177.1 L384,178.9 L388,179.9 L392,179.9 L396,178.9 L400,177.1 L404,174.3 L408,170.7 L412,166.2 L416,161.1 L420,155.3 L424,148.9 L428,142.1 L432,134.9 L436,127.5 L440,120.0 L444,112.5 L448,105.1 L452,97.9 L456,91.1 L460,84.7 L464,78.9 L468,73.8 L472,69.3 L476,65.7 L480,62.9 L484,61.1 L488,60.1 L492,60.1 L496,61.1 L500,62.9 L504,65.7 L508,69.3 L512,73.8 L516,78.9 L520,84.7 L524,91.1 L528,97.9 L532,105.1 L536,112.5 L540,120.0 L544,127.5 L548,134.9 L552,142.1 L556,148.9 L560,155.3" fill="none" stroke="var(--accent-0)" stroke-width="2.5"/><text x="90" y="40" text-anchor="start" fill="var(--accent-0)" font-family="Outfit,sans-serif" font-size="12" font-weight="600">electric field E: up–down</text><line x1="40" y1="120" x2="40" y2="120" stroke="var(--accent-4)" stroke-width="2"/><line x1="60" y1="120" x2="49.4" y2="129.5" stroke="var(--accent-4)" stroke-width="2"/><line x1="80" y1="120" x2="62.9" y2="135.4" stroke="var(--accent-4)" stroke-width="2"/><line x1="100" y1="120" x2="82.9" y2="135.4" stroke="var(--accent-4)" stroke-width="2"/><line x1="120" y1="120" x2="109.4" y2="129.5" stroke="var(--accent-4)" stroke-width="2"/><line x1="140" y1="120" x2="140" y2="120" stroke="var(--accent-4)" stroke-width="2"/><line x1="160" y1="120" x2="170.6" y2="110.5" stroke="var(--accent-4)" stroke-width="2"/><line x1="180" y1="120" x2="197.1" y2="104.6" stroke="var(--accent-4)" stroke-width="2"/><line x1="200" y1="120" x2="217.1" y2="104.6" stroke="var(--accent-4)" stroke-width="2"/><line x1="220" y1="120" x2="230.6" y2="110.5" stroke="var(--accent-4)" stroke-width="2"/><line x1="240" y1="120" x2="240" y2="120" stroke="var(--accent-4)" stroke-width="2"/><line x1="260" y1="120" x2="249.4" y2="129.5" stroke="var(--accent-4)" stroke-width="2"/><line x1="280" y1="120" x2="262.9" y2="135.4" stroke="var(--accent-4)" stroke-width="2"/><line x1="300" y1="120" x2="282.9" y2="135.4" stroke="var(--accent-4)" stroke-width="2"/><line x1="320" y1="120" x2="309.4" y2="129.5" stroke="var(--accent-4)" stroke-width="2"/><line x1="340" y1="120" x2="340" y2="120" stroke="var(--accent-4)" stroke-width="2"/><line x1="360" y1="120" x2="370.6" y2="110.5" stroke="var(--accent-4)" stroke-width="2"/><line x1="380" y1="120" x2="397.1" y2="104.6" stroke="var(--accent-4)" stroke-width="2"/><line x1="400" y1="120" x2="417.1" y2="104.6" stroke="var(--accent-4)" stroke-width="2"/><line x1="420" y1="120" x2="430.6" y2="110.5" stroke="var(--accent-4)" stroke-width="2"/><line x1="440" y1="120" x2="440" y2="120" stroke="var(--accent-4)" stroke-width="2"/><line x1="460" y1="120" x2="449.4" y2="129.5" stroke="var(--accent-4)" stroke-width="2"/><line x1="480" y1="120" x2="462.9" y2="135.4" stroke="var(--accent-4)" stroke-width="2"/><line x1="500" y1="120" x2="482.9" y2="135.4" stroke="var(--accent-4)" stroke-width="2"/><line x1="520" y1="120" x2="509.4" y2="129.5" stroke="var(--accent-4)" stroke-width="2"/><line x1="540" y1="120" x2="540" y2="120" stroke="var(--accent-4)" stroke-width="2"/><line x1="560" y1="120" x2="570.6" y2="110.5" stroke="var(--accent-4)" stroke-width="2"/><text x="150" y="210" text-anchor="start" fill="var(--accent-4)" font-family="Outfit,sans-serif" font-size="12" font-weight="600">magnetic field B: in and out of the page, drawn slanted</text><text x="320" y="236" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12">E ⟂ B, and both ⟂ the direction of travel</text>
</svg>
</div>

In order of **increasing wavelength**, which is decreasing frequency and photon energy:

**gamma rays → X-rays → ultraviolet → visible → infrared → microwaves → radio waves**

- **Visible light** spans about **400 nm (violet) to 700 nm (red)**.

<div class="optics-diagram" role="img" aria-label="The electromagnetic spectrum in order of wavelength">
<svg viewBox="0 0 640 238" xmlns="http://www.w3.org/2000/svg" width="100%" style="height:auto;display:block;max-width:640px;margin:0.6rem auto">
<rect x="30" y="60" width="70" height="46" rx="4" fill="rgba(var(--accent-0-rgb),0.45)" stroke="var(--accent-0)" stroke-width="1.8"/><text x="65" y="88" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12" font-weight="600">gamma</text><rect x="104" y="60" width="80" height="46" rx="4" fill="rgba(var(--accent-1-rgb),0.45)" stroke="var(--accent-1)" stroke-width="1.8"/><text x="144" y="88" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12" font-weight="600">X-rays</text><rect x="188" y="60" width="70" height="46" rx="4" fill="rgba(var(--accent-2-rgb),0.45)" stroke="var(--accent-2)" stroke-width="1.8"/><text x="223" y="88" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12" font-weight="600">UV</text><rect x="262" y="60" width="60" height="46" rx="4" fill="rgba(var(--accent-3-rgb),0.45)" stroke="var(--accent-3)" stroke-width="1.8"/><text x="292" y="88" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12" font-weight="600">visible</text><rect x="326" y="60" width="90" height="46" rx="4" fill="rgba(var(--accent-4-rgb),0.45)" stroke="var(--accent-4)" stroke-width="1.8"/><text x="371" y="88" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12" font-weight="600">infrared</text><rect x="420" y="60" width="90" height="46" rx="4" fill="rgba(var(--accent-5-rgb),0.45)" stroke="var(--accent-5)" stroke-width="1.8"/><text x="465" y="88" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12" font-weight="600">microwave</text><rect x="514" y="60" width="120" height="46" rx="4" fill="rgba(var(--accent-6-rgb),0.45)" stroke="var(--accent-6)" stroke-width="1.8"/><text x="574" y="88" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12" font-weight="600">radio</text><line x1="30" y1="130" x2="610" y2="130" stroke="var(--col-text-main)" stroke-width="1.5"/><polygon points="614.8,130 605.2,133.6 605.2,126.4" fill="var(--col-text-main)"/><text x="320" y="150" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12">wavelength gets LONGER →</text><line x1="610" y1="175" x2="30" y2="175" stroke="var(--col-text-main)" stroke-width="1.5"/><polygon points="25.2,175 34.8,171.4 34.8,178.6" fill="var(--col-text-main)"/><text x="320" y="195" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12">← frequency and photon energy get HIGHER</text><text x="292" y="44" text-anchor="middle" fill="var(--accent-3)" font-family="Outfit,sans-serif" font-size="11.5" font-weight="600">400–700 nm</text><text x="320" y="226" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="11.5">all travel at c = 3 × 10⁸ m/s in vacuum;  c = f λ</text>
</svg>
</div>

---

## 3. The photon

- Einstein (1905) suggested that light comes in small packets of energy called **photons**. A **photon is a quantum of electromagnetic radiation**.

```
E = h f = h c / λ
h = 6.63 × 10⁻³⁴ J·s   ← Planck's constant
c = 3 × 10⁸ m/s
1 eV = 1.602 × 10⁻¹⁹ J
```

A **higher frequency**, which is a shorter wavelength, means **more energy per photon**.

### Worked example

**An X-ray photon has frequency 1.8 × 10¹⁸ s⁻¹. Find its energy.**

```
E = h f = 6.63 × 10⁻³⁴ × 1.8 × 10¹⁸
E = 1.19 × 10⁻¹⁵ J   ← also written 11.93 × 10⁻¹⁶ J, the same number
In eV:  1.19 × 10⁻¹⁵ / 1.602 × 10⁻¹⁹ ≈ 7.45 × 10³ eV
```

---

## 4. The photoelectric effect

- The **photoelectric effect** happens when **photons hit a metal surface and eject electrons**.
- Each photon gives **all** its energy **hf** to one electron. Part of it pays the **work function φ**, the **minimum energy needed to free an electron** from the metal. The rest becomes the electron's **maximum kinetic energy Kₘₐₓ**.

```
h f = Kₘₐₓ + φ
```

```example
Given photon energy h f = 5.0 eV, work function φ = 2.3 eV
Kₘₐₓ = h f − φ = 5.0 − 2.3 = 2.7 eV
```

<div class="optics-diagram" role="img" aria-label="Photoelectric effect: photon energy hf is shared between the work function and the electron kinetic energy">
<svg viewBox="0 0 640 248" xmlns="http://www.w3.org/2000/svg" width="100%" style="height:auto;display:block;max-width:640px;margin:0.6rem auto">
<rect x="60" y="150" width="280" height="50" rx="4" fill="rgba(var(--accent-1-rgb),0.35)" stroke="var(--accent-1)" stroke-width="1.8"/><text x="200" y="182" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12" font-weight="600">metal surface</text><path d="M30.0,20.0 L35.2,22.7 L39.2,25.4 L41.2,28.1 L41.3,30.8 L39.8,33.5 L38.1,36.2 L37.4,38.9 L38.4,41.6 L41.6,44.3 L46.3,47.0 L51.7,49.7 L56.4,52.4 L59.4,55.1 L60.3,57.8 L59.5,60.5 L57.8,63.2 L56.4,65.9 L56.5,68.6 L58.7,71.3 L62.8,74.0 L68.0,76.7 L73.2,79.4 L77.1,82.1 L79.0,84.8 L78.9,87.5 L77.4,90.2 L75.8,92.9 L75.1,95.6 L76.2,98.3 L79.5,101.0 L84.3,103.7 L89.7,106.4 L94.3,109.1 L97.2,111.8 L98.0,114.5 L97.1,117.2 L95.4,119.9 L94.1,122.6 L94.3,125.3 L96.6,128.0 L100.8,130.7 L106.0,133.4 L111.1,136.1 L114.9,138.8 L116.7,141.5 L116.5,144.2" fill="none" stroke="var(--accent-6)" stroke-width="2"/><path d="M90.0,20.0 L95.2,22.7 L99.2,25.4 L101.2,28.1 L101.3,30.8 L99.8,33.5 L98.1,36.2 L97.4,38.9 L98.4,41.6 L101.6,44.3 L106.3,47.0 L111.7,49.7 L116.4,52.4 L119.4,55.1 L120.3,57.8 L119.5,60.5 L117.8,63.2 L116.4,65.9 L116.5,68.6 L118.7,71.3 L122.8,74.0 L128.0,76.7 L133.2,79.4 L137.1,82.1 L139.0,84.8 L138.9,87.5 L137.4,90.2 L135.8,92.9 L135.1,95.6 L136.2,98.3 L139.5,101.0 L144.3,103.7 L149.7,106.4 L154.3,109.1 L157.2,111.8 L158.0,114.5 L157.1,117.2 L155.4,119.9 L154.1,122.6 L154.3,125.3 L156.6,128.0 L160.8,130.7 L166.0,133.4 L171.1,136.1 L174.9,138.8 L176.7,141.5 L176.5,144.2" fill="none" stroke="var(--accent-6)" stroke-width="2"/><path d="M150.0,20.0 L155.2,22.7 L159.2,25.4 L161.2,28.1 L161.3,30.8 L159.8,33.5 L158.1,36.2 L157.4,38.9 L158.4,41.6 L161.6,44.3 L166.3,47.0 L171.7,49.7 L176.4,52.4 L179.4,55.1 L180.3,57.8 L179.5,60.5 L177.8,63.2 L176.4,65.9 L176.5,68.6 L178.7,71.3 L182.8,74.0 L188.0,76.7 L193.2,79.4 L197.1,82.1 L199.0,84.8 L198.9,87.5 L197.4,90.2 L195.8,92.9 L195.1,95.6 L196.2,98.3 L199.5,101.0 L204.3,103.7 L209.7,106.4 L214.3,109.1 L217.2,111.8 L218.0,114.5 L217.1,117.2 L215.4,119.9 L214.1,122.6 L214.3,125.3 L216.6,128.0 L220.8,130.7 L226.0,133.4 L231.1,136.1 L234.9,138.8 L236.7,141.5 L236.5,144.2" fill="none" stroke="var(--accent-6)" stroke-width="2"/><text x="250" y="30" text-anchor="start" fill="var(--accent-6)" font-family="Outfit,sans-serif" font-size="12">photons, energy hf each</text><circle cx="260" cy="150" r="6" fill="var(--accent-4)"/><line x1="266" y1="144" x2="320" y2="96" stroke="var(--accent-4)" stroke-width="2"/><polygon points="325.4,90.6 321.2,99.9 316.1,94.8" fill="var(--accent-4)"/><text x="330" y="90" text-anchor="start" fill="var(--accent-4)" font-family="Outfit,sans-serif" font-size="12">ejected electron</text><rect x="480" y="40" width="60" height="70" rx="3" fill="rgba(var(--accent-4-rgb),0.4)" stroke="var(--accent-4)" stroke-width="1.8"/><text x="550" y="80" text-anchor="start" fill="var(--accent-4)" font-family="Outfit,sans-serif" font-size="12">Kₘₐₓ</text><rect x="480" y="110" width="60" height="90" rx="3" fill="rgba(var(--accent-1-rgb),0.4)" stroke="var(--accent-1)" stroke-width="1.8"/><text x="542" y="160" text-anchor="start" fill="var(--accent-1)" font-family="Outfit,sans-serif" font-size="12">φ: work function</text><line x1="470" y1="40" x2="470" y2="200" stroke="var(--accent-6)" stroke-width="2"/><text x="464" y="124" text-anchor="end" fill="var(--accent-6)" font-family="Outfit,sans-serif" font-size="13" font-weight="700">hf</text><text x="320" y="236" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="14" font-weight="700">h f = Kₘₐₓ + φ</text>
</svg>
</div>

If **h f is smaller than φ**, no electron comes out, however bright the light.

---

## 5. de Broglie waves

- de Broglie waves are also called **matter waves**. de Broglie suggested that a **moving particle has both a particle nature and a wave nature**.
- Combining E = m c² with E = h c / λ gives λ = h / (m c). For a particle moving at speed v:

```
λ = h / (m v)
```

- **Matter waves** are waves of moving particles; they are **not electromagnetic waves**.

### Worked examples

**A proton moves at 1.3 × 10⁶ m/s.** Its mass is m = 1.67 × 10⁻²⁷ kg.

```
λ = h / (m v) = 6.63 × 10⁻³⁴ / (1.67 × 10⁻²⁷ × 1.3 × 10⁶)
λ = 6.63 × 10⁻³⁴ / 2.17 × 10⁻²¹ ≈ 3.05 × 10⁻¹³ m
```

**A 20 g steel ball moves at 20 m/s.** Its mass is m = 0.02 kg.

```
λ = 6.63 × 10⁻³⁴ / (0.02 × 20) ≈ 1.66 × 10⁻³³ m
```

This is far smaller than even a nucleus, so the wave nature of everyday objects is **of no practical size**. Wave effects matter only for tiny particles such as electrons and protons.

---

## 6. The atom and the nucleus

- The atom is **mostly empty space** with a **small, dense central nucleus** that holds nearly all the mass.
- The nucleus contains positive **protons** and uncharged **neutrons**. Together they are called **nucleons**.
- Negative **electrons** move around the nucleus. Electron mass = **9.109 × 10⁻³¹ kg**, about **1840 times lighter** than a proton.

<div class="optics-diagram" role="img" aria-label="Atom: a small dense nucleus of protons and neutrons with electrons around it">
<svg viewBox="0 0 640 262" xmlns="http://www.w3.org/2000/svg" width="100%" style="height:auto;display:block;max-width:640px;margin:0.6rem auto">
<circle cx="200" cy="130" r="55" fill="none" stroke="var(--col-text-muted)" stroke-width="1.2" stroke-dasharray="4 4"/><circle cx="200" cy="130" r="95" fill="none" stroke="var(--col-text-muted)" stroke-width="1.2" stroke-dasharray="4 4"/><circle cx="194" cy="125" r="5" fill="var(--accent-0)"/><circle cx="205" cy="124" r="5" fill="var(--accent-4)"/><circle cx="193" cy="135" r="5" fill="var(--accent-0)"/><circle cx="206" cy="135" r="5" fill="var(--accent-4)"/><circle cx="200" cy="130" r="5" fill="var(--accent-0)"/><circle cx="201" cy="119" r="5" fill="var(--accent-4)"/><circle cx="199" cy="141" r="5" fill="var(--accent-0)"/><circle cx="247.6" cy="157.5" r="5" fill="var(--accent-2)"/><circle cx="148.3" cy="111.2" r="5" fill="var(--accent-2)"/><circle cx="167.5" cy="219.3" r="5" fill="var(--accent-2)"/><circle cx="247.5" cy="47.7" r="5" fill="var(--accent-2)"/><text x="200" y="252" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="11">mostly empty space; tiny dense nucleus</text><circle cx="360" cy="40" r="6" fill="var(--accent-0)"/><text x="374" y="44" text-anchor="start" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12">proton: + charge, Z of them</text><circle cx="360" cy="72" r="6" fill="var(--accent-4)"/><text x="374" y="76" text-anchor="start" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12">neutron: no charge, N of them</text><circle cx="360" cy="104" r="6" fill="var(--accent-2)"/><text x="374" y="108" text-anchor="start" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12">electron: − charge, 1840× lighter</text><text x="360" y="150" text-anchor="start" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12" font-weight="600">nucleons = protons + neutrons</text><text x="360" y="174" text-anchor="start" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="13" font-weight="700">A = Z + N   →   N = A − Z</text><text x="360" y="198" text-anchor="start" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12">e.g. copper-64: A = 64, Z = 29, N = 35</text>
</svg>
</div>

| Symbol | Name | Meaning |
|---|---|---|
| Z | Atomic number | Number of **protons** |
| A | Mass number | Total number of **nucleons**: protons + neutrons |
| N | Neutron number | **N = A − Z** |

A nuclide is written with A at the top left and Z at the bottom left of the element symbol, for example **⁶⁴Cu₂₉**. Here A = 64, Z = 29 and N = 35.

### Isotopes and stability

- **Isotopes** have the **same number of protons**, so they are the same element, but **different numbers of neutrons**. Examples: carbon-12, carbon-13, carbon-14; hydrogen-1, deuterium or hydrogen-2, and tritium or hydrogen-3.
- For **light nuclides**, the nucleus is generally **stable when N = Z**. Deuterium is stable; tritium is radioactive.

### Size of the nucleus

```
r = R₀ A^(1/3),   R₀ = 1.2 × 10⁻¹⁵ m
```

```example
Given A = 27
r = 1.2 × 10⁻¹⁵ × 27^(1/3) = 1.2 × 10⁻¹⁵ × 3 = 3.6 × 10⁻¹⁵ m
```

### Worked examples

**Copper-64:** 64^(1/3) = 4, so r = 1.2 × 10⁻¹⁵ × 4 = **4.8 × 10⁻¹⁵ m**.

**Silver-107:** 107^(1/3) ≈ 4.75, so r ≈ **5.7 × 10⁻¹⁵ m**.

**Carbon-12:** 12^(1/3) ≈ 2.29, so r ≈ **2.75 × 10⁻¹⁵ m**.

**Ratio of radii for A = 27 and A = 64:**

```
r₁ / r₂ = (27 / 64)^(1/3) = 3 / 4   →  r₁ : r₂ = 3 : 4
```

---

## 7. Radioactivity and the types of decay

- **Radioactivity** is the **spontaneous decay of unstable nuclei**. It is **random**: we cannot say when one nucleus will decay, only what fraction will decay in a given time.
- Very heavy nuclei, with Z above 83 and A above 209, tend to decay by **alpha emission**.

| Radiation | What it is | Charge | Change in nucleus |
|---|---|---|---|
| **Alpha (α)** | **2 protons + 2 neutrons**, a helium-4 nucleus | +2 | **Z − 2, A − 4** |
| **Beta minus (β⁻)** | Fast **electron**; a neutron turns into a proton | −1 | **Z + 1, A same** |
| **Beta plus (β⁺)** | Fast **positron**; a proton turns into a neutron | +1 | **Z − 1, A same** |
| **Gamma (γ)** | **High-energy photon**, no mass, no charge | 0 | **No change in Z or A** |

In beta decay one kind of nucleon turns into the other, so the **total number of nucleons (A) stays the same**. Beta decay also releases a **neutrino**.

<div class="optics-diagram" role="img" aria-label="How alpha, beta minus, beta plus and gamma decay change Z and N">
<svg viewBox="0 0 640 250" xmlns="http://www.w3.org/2000/svg" width="100%" style="height:auto;display:block;max-width:640px;margin:0.6rem auto">
<line x1="120" y1="230" x2="500" y2="230" stroke="var(--col-text-main)" stroke-width="1.4"/><polygon points="504.8,230 495.2,233.6 495.2,226.4" fill="var(--col-text-main)"/><text x="504" y="234" text-anchor="start" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="11">Z protons</text><line x1="120" y1="230" x2="120" y2="20" stroke="var(--col-text-main)" stroke-width="1.4"/><polygon points="120,15.2 123.6,24.8 116.4,24.8" fill="var(--col-text-main)"/><text x="126" y="18" text-anchor="start" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="11">N neutrons</text><circle cx="280" cy="110" r="7" fill="var(--col-text-main)"/><text x="292" y="102" text-anchor="start" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="11">parent</text><line x1="280" y1="110" x2="200" y2="190" stroke="var(--accent-0)" stroke-width="2.5"/><polygon points="196.6,193.4 200.8,184.1 205.9,189.2" fill="var(--accent-0)"/><text x="192" y="208" text-anchor="middle" fill="var(--accent-0)" font-family="Outfit,sans-serif" font-size="12" font-weight="600">α: Z − 2, A − 4</text><line x1="280" y1="110" x2="320" y2="150" stroke="var(--accent-4)" stroke-width="2.5"/><polygon points="323.4,153.4 314.1,149.2 319.2,144.1" fill="var(--accent-4)"/><text x="330" y="154" text-anchor="start" fill="var(--accent-4)" font-family="Outfit,sans-serif" font-size="12" font-weight="600">β⁻: n → p, Z + 1, A same</text><line x1="280" y1="110" x2="240" y2="70" stroke="var(--accent-2)" stroke-width="2.5"/><polygon points="236.6,66.6 245.9,70.8 240.8,75.9" fill="var(--accent-2)"/><text x="230" y="64" text-anchor="end" fill="var(--accent-2)" font-family="Outfit,sans-serif" font-size="12" font-weight="600">β⁺: p → n, Z − 1, A same</text><text x="290" y="48" text-anchor="start" fill="var(--accent-6)" font-family="Outfit,sans-serif" font-size="12" font-weight="600">γ: no change in Z or A</text>
</svg>
</div>

### Examples of alpha decay

```
U-238 (Z 92)  → Th-234 (Z 90) + α
Rn-222 (Z 86) → Po-218 (Z 84) + α
Po-208 (Z 84) → Pb-204 (Z 82) + α
Th-230 (Z 90) → Ra-226 (Z 88) + α
```

### Worked examples: decay chains

**U-238 emits one α, then one β⁻. What is the daughter?**

```
α:  Z 92 → 90,  A 238 → 234   ← thorium-234
β⁻: Z 90 → 91,  A stays 234
Daughter: protactinium-234, Z = 91
```

**Th-234 emits two α particles and one β⁺.**

```
2 α: Z 90 → 86,  A 234 → 226
β⁺:  Z 86 → 85,  A stays 226
Daughter: Z = 85, A = 226 → astatine-226
```

### Penetration and ionization

| | Alpha | Beta | Gamma |
|---|---|---|---|
| Penetration | **Lowest**: stopped by paper | Medium: a few mm of aluminium | **Highest**: needs thick lead or concrete |
| Ionizing power | **Highest** | Medium | **Lowest** |

<div class="optics-diagram" role="img" aria-label="Alpha is stopped by paper, beta by a few millimetres of aluminium, gamma needs lead">
<svg viewBox="0 0 640 228" xmlns="http://www.w3.org/2000/svg" width="100%" style="height:auto;display:block;max-width:640px;margin:0.6rem auto">
<text x="20" y="54" text-anchor="start" fill="var(--accent-0)" font-family="Outfit,sans-serif" font-size="12" font-weight="600">α alpha</text><line x1="100" y1="50" x2="170" y2="50" stroke="var(--accent-0)" stroke-width="2.5"/><polygon points="174.8,50 165.2,53.6 165.2,46.4" fill="var(--accent-0)"/><text x="20" y="104" text-anchor="start" fill="var(--accent-4)" font-family="Outfit,sans-serif" font-size="12" font-weight="600">β beta</text><line x1="100" y1="100" x2="300" y2="100" stroke="var(--accent-4)" stroke-width="2.5"/><polygon points="304.8,100 295.2,103.6 295.2,96.4" fill="var(--accent-4)"/><text x="20" y="154" text-anchor="start" fill="var(--accent-6)" font-family="Outfit,sans-serif" font-size="12" font-weight="600">γ gamma</text><line x1="100" y1="150" x2="470" y2="150" stroke="var(--accent-6)" stroke-width="2.5"/><polygon points="474.8,150 465.2,153.6 465.2,146.4" fill="var(--accent-6)"/><rect x="180" y="24" width="8" height="140" rx="2" fill="rgba(var(--accent-1-rgb),0.5)" stroke="var(--accent-1)" stroke-width="1.8"/><text x="184" y="184" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="11">paper</text><rect x="310" y="24" width="16" height="140" rx="2" fill="rgba(var(--accent-2-rgb),0.5)" stroke="var(--accent-2)" stroke-width="1.8"/><text x="318" y="184" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="11">aluminium, few mm</text><rect x="480" y="24" width="30" height="140" rx="2" fill="rgba(var(--accent-5-rgb),0.5)" stroke="var(--accent-5)" stroke-width="1.8"/><text x="495" y="184" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="11">lead</text><text x="320" y="214" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12">ionizing power: α high → β medium → γ low;  penetration: the opposite</text>
</svg>
</div>

### In a magnetic field

**Alpha and beta bend in opposite directions** because they have opposite charges; **gamma is not bent** because it has no charge. Beta bends more because it is much lighter.

<div class="optics-diagram" role="img" aria-label="In a magnetic field alpha and beta bend opposite ways; gamma goes straight">
<svg viewBox="0 0 640 260" xmlns="http://www.w3.org/2000/svg" width="100%" style="height:auto;display:block;max-width:640px;margin:0.6rem auto">
<rect x="30" y="110" width="40" height="40" rx="4" fill="rgba(var(--accent-3-rgb),0.4)" stroke="var(--accent-3)" stroke-width="1.8"/><text x="50" y="170" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="11">source</text><text x="240" y="60" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="14">×</text><text x="240" y="110" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="14">×</text><text x="240" y="160" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="14">×</text><text x="240" y="210" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="14">×</text><text x="300" y="60" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="14">×</text><text x="300" y="110" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="14">×</text><text x="300" y="160" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="14">×</text><text x="300" y="210" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="14">×</text><text x="360" y="60" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="14">×</text><text x="360" y="110" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="14">×</text><text x="360" y="160" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="14">×</text><text x="360" y="210" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="14">×</text><text x="420" y="60" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="14">×</text><text x="420" y="110" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="14">×</text><text x="420" y="160" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="14">×</text><text x="420" y="210" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="14">×</text><text x="480" y="60" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="14">×</text><text x="480" y="110" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="14">×</text><text x="480" y="160" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="14">×</text><text x="480" y="210" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="14">×</text><text x="560" y="36" text-anchor="end" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="11">magnetic field into page</text><path d="M70,130 Q340,130 560,50" fill="none" stroke="var(--accent-0)" stroke-width="2.5"/><text x="566" y="44" text-anchor="start" fill="var(--accent-0)" font-family="Outfit,sans-serif" font-size="12" font-weight="600">α, +</text><path d="M70,130 L600,130" fill="none" stroke="var(--accent-6)" stroke-width="2.5"/><text x="604" y="134" text-anchor="start" fill="var(--accent-6)" font-family="Outfit,sans-serif" font-size="12" font-weight="600">γ</text><path d="M70,130 Q300,130 430,240" fill="none" stroke="var(--accent-4)" stroke-width="2.5"/><text x="438" y="244" text-anchor="start" fill="var(--accent-4)" font-family="Outfit,sans-serif" font-size="12" font-weight="600">β⁻, −, bends more</text>
</svg>
</div>

---

## 8. Activity and half-life

- The number of nuclei left falls exponentially: **N = N₀ e^(−λt)**, where **λ** is the **decay constant**.
- The **activity R** is the number of decays per second:

```
R = λ N = − dN/dt
```

```example
Given λ = 0.01 s⁻¹, N = 5000 nuclei
R = 0.01 × 5000 = 50 decays per second = 50 Bq
```

- **Units of activity:** the **becquerel**, **1 Bq = 1 decay per second**, the SI unit, and the **curie**, **1 Ci = 3.70 × 10¹⁰ Bq**.
- The **half-life T½** is the **time for half of the radioactive nuclei to decay**:

```
T½ = 0.693 / λ   ← 0.693 = ln 2
```

<div class="optics-diagram" role="img" aria-label="Radioactive decay: the amount halves every half-life">
<svg viewBox="0 0 640 270" xmlns="http://www.w3.org/2000/svg" width="100%" style="height:auto;display:block;max-width:640px;margin:0.6rem auto">
<line x1="80" y1="220" x2="570" y2="220" stroke="var(--col-text-main)" stroke-width="1.4"/><line x1="80" y1="220" x2="80" y2="40" stroke="var(--col-text-main)" stroke-width="1.4"/><text x="320" y="260" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="11">time in half-lives</text><text x="72" y="36" text-anchor="start" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="11">amount left</text><path d="M80.0,50.0 L84.8,55.8 L89.6,61.4 L94.4,66.8 L99.2,72.0 L104.0,77.0 L108.8,81.9 L113.6,86.6 L118.4,91.2 L123.2,95.6 L128.0,99.8 L132.8,103.9 L137.6,107.8 L142.4,111.7 L147.2,115.4 L152.0,118.9 L156.8,122.4 L161.6,125.7 L166.4,128.9 L171.2,132.0 L176.0,135.0 L180.8,137.9 L185.6,140.7 L190.4,143.4 L195.2,146.0 L200.0,148.5 L204.8,151.0 L209.6,153.3 L214.4,155.6 L219.2,157.8 L224.0,159.9 L228.8,161.9 L233.6,163.9 L238.4,165.8 L243.2,167.7 L248.0,169.5 L252.8,171.2 L257.6,172.8 L262.4,174.4 L267.2,176.0 L272.0,177.5 L276.8,178.9 L281.6,180.3 L286.4,181.7 L291.2,183.0 L296.0,184.3 L300.8,185.5 L305.6,186.7 L310.4,187.8 L315.2,188.9 L320.0,189.9 L324.8,191.0 L329.6,192.0 L334.4,192.9 L339.2,193.8 L344.0,194.7 L348.8,195.6 L353.6,196.4 L358.4,197.2 L363.2,198.0 L368.0,198.8 L372.8,199.5 L377.6,200.2 L382.4,200.8 L387.2,201.5 L392.0,202.1 L396.8,202.7 L401.6,203.3 L406.4,203.9 L411.2,204.4 L416.0,205.0 L420.8,205.5 L425.6,206.0 L430.4,206.5 L435.2,206.9 L440.0,207.4 L444.8,207.8 L449.6,208.2 L454.4,208.6 L459.2,209.0 L464.0,209.4 L468.8,209.7 L473.6,210.1 L478.4,210.4 L483.2,210.8 L488.0,211.1 L492.8,211.4 L497.6,211.7 L502.4,211.9 L507.2,212.2 L512.0,212.5 L516.8,212.7 L521.6,213.0 L526.4,213.2 L531.2,213.5 L536.0,213.7 L540.8,213.9 L545.6,214.1 L550.4,214.3 L555.2,214.5 L560.0,214.7" fill="none" stroke="var(--accent-0)" stroke-width="3"/><line x1="80" y1="50" x2="80" y2="50" stroke="var(--col-text-muted)" stroke-width="1" stroke-dasharray="3 3"/><line x1="80" y1="50" x2="80" y2="220" stroke="var(--col-text-muted)" stroke-width="1" stroke-dasharray="3 3"/><circle cx="80" cy="50" r="4" fill="var(--accent-0)"/><text x="72" y="54" text-anchor="end" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="11">1</text><text x="80" y="238" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="11">0</text><line x1="80" y1="135" x2="176" y2="135" stroke="var(--col-text-muted)" stroke-width="1" stroke-dasharray="3 3"/><line x1="176" y1="135" x2="176" y2="220" stroke="var(--col-text-muted)" stroke-width="1" stroke-dasharray="3 3"/><circle cx="176" cy="135" r="4" fill="var(--accent-0)"/><text x="72" y="139" text-anchor="end" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="11">½</text><text x="176" y="238" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="11">1</text><line x1="80" y1="177.5" x2="272" y2="177.5" stroke="var(--col-text-muted)" stroke-width="1" stroke-dasharray="3 3"/><line x1="272" y1="177.5" x2="272" y2="220" stroke="var(--col-text-muted)" stroke-width="1" stroke-dasharray="3 3"/><circle cx="272" cy="177.5" r="4" fill="var(--accent-0)"/><text x="72" y="181.5" text-anchor="end" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="11">¼</text><text x="272" y="238" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="11">2</text><line x1="80" y1="198.8" x2="368" y2="198.8" stroke="var(--col-text-muted)" stroke-width="1" stroke-dasharray="3 3"/><line x1="368" y1="198.8" x2="368" y2="220" stroke="var(--col-text-muted)" stroke-width="1" stroke-dasharray="3 3"/><circle cx="368" cy="198.8" r="4" fill="var(--accent-0)"/><text x="72" y="202.8" text-anchor="end" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="11">⅛</text><text x="368" y="238" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="11">3</text><line x1="80" y1="209.4" x2="464" y2="209.4" stroke="var(--col-text-muted)" stroke-width="1" stroke-dasharray="3 3"/><line x1="464" y1="209.4" x2="464" y2="220" stroke="var(--col-text-muted)" stroke-width="1" stroke-dasharray="3 3"/><circle cx="464" cy="209.4" r="4" fill="var(--accent-0)"/><text x="472" y="201.4" text-anchor="start" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="11">1/16</text><text x="464" y="238" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="11">4</text><text x="377.6" y="114.6" text-anchor="start" fill="var(--accent-0)" font-family="Outfit,sans-serif" font-size="12">N = N₀ e^(−λt)</text><text x="377.6" y="132.6" text-anchor="start" fill="var(--accent-0)" font-family="Outfit,sans-serif" font-size="12">T½ = 0.693 / λ</text>
</svg>
</div>

### Worked examples

**A material has a half-life of 30 years. Find λ.**

```
T½ = 30 × 365 × 24 × 3600 ≈ 9.47 × 10⁸ s
λ = 0.693 / 9.47 × 10⁸ ≈ 7.32 × 10⁻¹⁰ s⁻¹
```

**Radon, with a half-life of 3.8 days, starting with 1 mg:**

| Days | 0 | 3.8 | 7.6 | 11.4 | 15.2 |
|---|---|---|---|---|---|
| Radon left (mg) | 1 | 0.5 | 0.25 | 0.125 | 0.0625 |

**15-day half-life, 1 g at the start, after two half-lives, which is 30 days:** 1 → 0.5 → **0.25 g**.

**Half-life of 50 years:** after **25 years**, half a half-life, **more than half** is left, about 71%; after **100 years**, two half-lives, **exactly ¼** is left.

---

## 9. Carbon dating

- Living things contain carbon-12 and a tiny amount of radioactive **carbon-14**, with a **half-life of about 5730 years**.
- While an organism is **alive**, the C-14 : C-12 ratio stays **constant** because its tissue **keeps exchanging carbon with the surroundings** by breathing and eating.
- After death the exchange stops and C-14 decays, so the ratio falls. Measuring it gives the age.
- The method works up to about **60 000 years**, about 10 half-lives.

**Note:** the natural ratio is about **1 C-14 atom per 10¹² C-12 atoms**.

---

## 10. Fission and fusion

- **Fission:** a **heavy nucleus**, such as uranium or plutonium, **absorbs a neutron and splits** into two medium nuclei, releasing **energy** and more neutrons.

```
U-235 + n → Xe-140 + Sr-94 + 2 n
U-235 + n → Rb-90 + Cs-143 + 3 n
```

Check: mass numbers 235 + 1 = 140 + 94 + 2 = 236; proton numbers 92 = 54 + 38.

- **Fusion:** **two light nuclei join** into a heavier nucleus, releasing **energy**. Fusion powers the **stars**, including the sun.

```
²H + ²H → ³H + ¹H + 4.0 MeV
²H + ²H → ³He + n + 3.3 MeV
```

**Radiation therapy:** the radiation source is **rotated around the patient**, so the tumour gets the full dose while the healthy tissue on each path gets only a part.

---

## 11. Dosimetry: measuring radiation dose

### Absorbed dose

- **Absorbed dose** = **energy deposited by ionizing radiation per unit mass** of material.
- SI unit: the **gray**, **1 Gy = 1 J/kg**. Older unit: the **rad**, **1 rad = 0.01 J/kg**, so **1 Gy = 100 rad**.

### Dose equivalent

Different radiations do different amounts of harm for the same energy, so the dose is multiplied by the **quality factor QF**, also called **RBE** or the radiation weighting factor. The result is the dose equivalent, also called the equivalent dose:

```
Dose equivalent = absorbed dose × QF
Gy × QF → sievert (Sv)        rad × QF → rem
1 Sv = 100 rem
```

| Radiation | QF |
|---|---|
| X-rays and gamma rays | **1** |
| Beta: electrons | about 1 |
| Fast protons | 1 |
| Slow neutrons | about 3 |
| Fast neutrons | up to 10 |
| Alpha particles and heavy ions | up to 20 |

### Units summary

| Quantity | SI unit | Old unit | Link |
|---|---|---|---|
| Activity | Becquerel (Bq) = 1 decay/s | Curie (Ci) | 1 Ci = 3.70 × 10¹⁰ Bq |
| Absorbed dose | Gray (Gy) = 1 J/kg | Rad | 1 Gy = 100 rad |
| Dose equivalent | Sievert (Sv) | Rem | 1 Sv = 100 rem |

### Safety limits and effects

- **IAEA** limit for radiation workers: **20 mSv per year averaged over 5 years**. That is 100 mSv in 5 years, and no more than 50 mSv in any one year.
- US **NRC** limit: **5 rem per year**, which is 50 mSv.
- About **10 Sv** at once is likely to cause **death**; **1 Sv** raises the lifetime risk of cancer by about **5.5%**.

### Worked examples

```
1.6 × 10⁻⁸ Gy = 1.6 × 10⁻⁸ × 100 = 1.6 × 10⁻⁶ rad
3.2 × 10⁻⁷ Sv = 3.2 × 10⁻⁷ × 100 = 3.2 × 10⁻⁵ rem
2 Gy  → 2 J absorbed by every kilogram of tissue
0.02 Gy of X-rays with QF = 1 → 0.02 × 1 = 0.02 Sv = 20 mSv
```

---

## 12. Detecting radiation: the Geiger–Muller counter

- A **metal tube**, the cathode, is filled with a gas such as **helium or argon**, with a **thin wire**, the anode, along the centre kept at a **high voltage**. Radiation enters through a thin **mica or paper window**.
- Radiation **ionizes the gas**. The electrons rush to the wire and the positive ions to the wall, making a **pulse** of current, heard as a **click** or shown as a **count**.
- **Drawback:** it **cannot tell the type or the energy** of the radiation.

<div class="optics-diagram" role="img" aria-label="Geiger–Muller counter: a gas ionization tube">
<svg viewBox="0 0 640 246" xmlns="http://www.w3.org/2000/svg" width="100%" style="height:auto;display:block;max-width:640px;margin:0.6rem auto">
<rect x="140" y="70" width="320" height="100" rx="50" fill="rgba(var(--accent-1-rgb),0.15)" stroke="var(--accent-1)" stroke-width="3"/><text x="300" y="62" text-anchor="middle" fill="var(--accent-1)" font-family="Outfit,sans-serif" font-size="11.5">metal tube = cathode −, filled with He or Ar gas</text><line x1="170" y1="120" x2="460" y2="120" stroke="var(--accent-4)" stroke-width="3"/><text x="300" y="114" text-anchor="middle" fill="var(--accent-4)" font-family="Outfit,sans-serif" font-size="11.5">central wire = anode +, high voltage</text><rect x="128" y="96" width="12" height="48" fill="rgba(var(--accent-6-rgb),0.6)"/><text x="120" y="190" text-anchor="middle" fill="var(--accent-6)" font-family="Outfit,sans-serif" font-size="11">thin mica window</text><line x1="30" y1="150" x2="150" y2="135" stroke="var(--accent-0)" stroke-width="2.5"/><polygon points="154.8,134.4 145.7,139.1 144.8,132" fill="var(--accent-0)"/><text x="30" y="140" text-anchor="start" fill="var(--accent-0)" font-family="Outfit,sans-serif" font-size="12" font-weight="600">radiation</text><text x="180" y="154" text-anchor="middle" fill="var(--accent-0)" font-family="Outfit,sans-serif" font-size="13">+</text><text x="194" y="154" text-anchor="middle" fill="var(--accent-4)" font-family="Outfit,sans-serif" font-size="11">e⁻</text><text x="380" y="154" text-anchor="middle" fill="var(--accent-0)" font-family="Outfit,sans-serif" font-size="13">+</text><text x="394" y="154" text-anchor="middle" fill="var(--accent-4)" font-family="Outfit,sans-serif" font-size="11">e⁻</text><text x="420" y="96" text-anchor="middle" fill="var(--accent-0)" font-family="Outfit,sans-serif" font-size="13">+</text><text x="434" y="96" text-anchor="middle" fill="var(--accent-4)" font-family="Outfit,sans-serif" font-size="11">e⁻</text><line x1="460" y1="120" x2="540" y2="120" stroke="var(--col-text-main)" stroke-width="1.6"/><rect x="540" y="96" width="70" height="48" rx="6" fill="rgba(var(--accent-3-rgb),0.3)" stroke="var(--accent-3)" stroke-width="1.8"/><text x="575" y="124" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="11">counter</text><text x="575" y="166" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="11">click / count</text><text x="320" y="214" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="11.5">radiation ionizes the gas → electrons to the wire, + ions to the wall → a pulse</text><text x="320" y="234" text-anchor="middle" fill="var(--accent-0)" font-family="Outfit,sans-serif" font-size="11.5">drawback: cannot tell the type or energy of the radiation</text>
</svg>
</div>

---

## 13. Clinical / medical links

| Physics | Medicine |
|---------|----------|
| X-ray and gamma photons | Imaging and radiotherapy |
| Gamma: no charge, high penetration | Treating deep tumours; needs lead shielding |
| Alpha: high ionizing, low penetration | Very harmful **inside** the body, harmless outside the skin |
| Half-life | Choosing short-lived tracers for nuclear medicine |
| Rotating the source | Radiotherapy: full dose to the tumour, less to healthy tissue |
| Gray and sievert | Patient and staff dose records |
| IAEA and NRC dose limits | Radiation worker safety |
| GM counter | Checking for contamination |
| Carbon-14 | Dating ancient remains |

---

## 14. Formula sheet — Chapter 7

```
Wave:            f = c / λ,   c = 3 × 10⁸ m/s
Photon:          E = h f = h c / λ,   h = 6.63 × 10⁻³⁴ J·s
Photoelectric:   h f = Kₘₐₓ + φ
de Broglie:      λ = h / (m v)
Nucleus:         A = Z + N,   N = A − Z
Nuclear radius:  r = 1.2 × 10⁻¹⁵ m × A^(1/3)
Decay:           N = N₀ e^(−λt)
Activity:        R = λ N = − dN/dt
Half-life:       T½ = 0.693 / λ
After n half-lives: N = N₀ / 2ⁿ
Dose:            1 Gy = 1 J/kg = 100 rad
Dose equivalent: dose × QF;   1 Sv = 100 rem
Units:           1 Bq = 1 decay/s;   1 Ci = 3.70 × 10¹⁰ Bq
```

### Key numbers at a glance

- Visible light: **400–700 nm**  
- Electron mass **9.109 × 10⁻³¹ kg**, about **1/1840** of a proton  
- C-14 half-life **5730 years**; dating up to about **60 000 years**  
- QF: X and γ **1**, α up to **20**  
- Worker limit: **20 mSv/year** as a 5-year average by the IAEA; **50 mSv** or 5 rem by the NRC  

### Key Points to Remember
- The spectrum from short to long wavelength: gamma rays, X-rays, ultraviolet, visible, infrared, microwaves, radio waves.  
- **Alpha** decay: Z falls by 2 and A by 4. **β⁻** decay: Z rises by 1. **β⁺** decay: Z falls by 1. **Gamma** decay: Z and A do not change.  
- Penetration and ionizing power are opposite: alpha is stopped by paper but ionizes the most.  
- 1 Gy = 1 J/kg. Dose equivalent in Sv = dose in Gy × QF. 1 Gy = 100 rad and 1 Sv = 100 rem.  
- After each half-life the amount halves: 1 → ½ → ¼ → ⅛.  

### Medical Applications
- Alpha emitters are dangerous when **swallowed or breathed in**.  
- Gamma rays and X-rays need **lead** shielding.  
- In radiotherapy the source is **rotated** around the patient to spare healthy tissue.  
- A GM counter **counts** radiation but cannot **identify** its type.  
