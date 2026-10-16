# Chapter 5 — Ray Optics

---

## 1. Overview & learning map

### What this chapter covers

How light **reflects** from mirrors, how it **bends**, or refracts, when it crosses into a new material, how it gets **trapped** inside glass by total internal reflection, the idea behind optical fibres and endoscopes, and how **lenses** form images. It ends with the lens / mirror equation and magnification.

### Ray optics vs wave optics

- **Ray optics**, the subject of this chapter: light is treated as **rays that travel in straight lines** until they hit a mirror or cross into a new material. We draw rays with a ruler and use angles.
- **Wave optics**: light is treated as a **wave**, with wavelength, interference and diffraction. Not needed for this chapter.

### Topics map

| Topic | Core idea |
|-------|-----------|
| Reflection | θi = θr, measured from the normal |
| Plane mirror | Virtual, upright, same size image; do = di |
| Spherical mirrors | Concave mirrors converge and convex mirrors diverge; f = r/2 |
| Refractive index | n = c / v; higher n → slower light |
| Snell's law | n₁ sin θ₁ = n₂ sin θ₂ |
| Total internal reflection | Dense → less dense, beyond the critical angle |
| Optical fibres | Core n₁ > cladding n₂; endoscopes |
| Thin lenses | Convex lenses converge and concave lenses diverge; P = 1/f |
| Lens / mirror equation | 1/do + 1/di = 1/f; m = hi/ho = −di/do |

**Study tip:** for every rule, picture the **ray diagram**. Almost every answer in this chapter comes from three things: the **normal**, the **focal point F**, and the **sign** of a number.

---

## 2. Reflection & plane mirrors

### Laws of reflection

When a light ray falls on a plane mirror, it bounces off following the laws of reflection. This is called **regular reflection**.

1. The **incident ray**, the **normal** at the point of incidence and the **reflected ray** all lie in the **same plane**.
2. The incident ray and the reflected ray are on **opposite sides of the normal**.
3. The **angle of incidence equals the angle of reflection**: θi = θr.

**What "normal to the surface" means:** the normal is an imaginary line at **90°** to the surface, **perpendicular** to it, at the point where the ray hits. Angles of incidence and reflection are always measured **from the normal**, not from the mirror surface.

<div class="optics-diagram" role="img" aria-label="Law of reflection: incident and reflected rays make equal angles with the normal">
<svg viewBox="0 0 560 262" xmlns="http://www.w3.org/2000/svg" width="100%" style="height:auto;display:block;max-width:640px;margin:0.6rem auto">
<rect x="80" y="200" width="400" height="14" fill="rgba(var(--accent-6-rgb),0.25)" stroke="var(--accent-6)" stroke-width="2"/><line x1="90" y1="214" x2="80" y2="226" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="106" y1="214" x2="96" y2="226" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="122" y1="214" x2="112" y2="226" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="138" y1="214" x2="128" y2="226" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="154" y1="214" x2="144" y2="226" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="170" y1="214" x2="160" y2="226" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="186" y1="214" x2="176" y2="226" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="202" y1="214" x2="192" y2="226" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="218" y1="214" x2="208" y2="226" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="234" y1="214" x2="224" y2="226" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="250" y1="214" x2="240" y2="226" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="266" y1="214" x2="256" y2="226" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="282" y1="214" x2="272" y2="226" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="298" y1="214" x2="288" y2="226" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="314" y1="214" x2="304" y2="226" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="330" y1="214" x2="320" y2="226" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="346" y1="214" x2="336" y2="226" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="362" y1="214" x2="352" y2="226" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="378" y1="214" x2="368" y2="226" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="394" y1="214" x2="384" y2="226" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="410" y1="214" x2="400" y2="226" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="426" y1="214" x2="416" y2="226" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="442" y1="214" x2="432" y2="226" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="458" y1="214" x2="448" y2="226" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="474" y1="214" x2="464" y2="226" stroke="var(--col-text-muted)" stroke-width="1"/><text x="490" y="212" text-anchor="start" fill="var(--col-text-muted)" font-family="Space Mono,monospace" font-size="11">mirror</text><line x1="280" y1="200" x2="280" y2="30" stroke="var(--col-text-muted)" stroke-width="1.5" stroke-dasharray="6 5"/><rect x="280" y="186" width="14" height="14" fill="none" stroke="var(--col-text-muted)" stroke-width="1.2"/><text x="280" y="22" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12">normal: 90° to the surface</text><line x1="175.3" y1="66" x2="280" y2="200" stroke="var(--accent-0)" stroke-width="2.5"/><polygon points="230.6,136.8 221.9,131.5 227.6,127" fill="var(--accent-0)"/><line x1="280" y1="200" x2="384.7" y2="66" stroke="var(--accent-1)" stroke-width="2.5"/><polygon points="335.3,129.2 332.2,139 326.5,134.6" fill="var(--accent-1)"/><path d="M280,140 A60,60 0 0 0 243.1,152.7" fill="none" stroke="var(--accent-0)" stroke-width="1.5"/><path d="M280,140 A60,60 0 0 1 316.9,152.7" fill="none" stroke="var(--accent-1)" stroke-width="1.5"/><text x="258" y="128" text-anchor="middle" fill="var(--accent-0)" font-family="Outfit,sans-serif" font-size="15" font-weight="600">θi</text><text x="304" y="128" text-anchor="middle" fill="var(--accent-1)" font-family="Outfit,sans-serif" font-size="15" font-weight="600">θr</text><text x="167.3" y="56" text-anchor="end" fill="var(--accent-0)" font-family="Outfit,sans-serif" font-size="12">incident ray</text><text x="392.7" y="56" text-anchor="start" fill="var(--accent-1)" font-family="Outfit,sans-serif" font-size="12">reflected ray</text><text x="280" y="250" text-anchor="middle" fill="var(--col-text-muted)" font-family="Space Mono,monospace" font-size="11">θi = θr · incident ray, normal and reflected ray lie in one plane</text>
</svg>
</div>

### Image in a Plane Mirror

- An object in front of a plane mirror has an image **behind the mirror**.
- It is a **virtual image**: the light does **not** actually pass through it. The reflected rays only **seem** to come from behind the mirror, shown by dashed lines.
- **Image distance = object distance:** di = do.
- The image is the **same size** as the object, and **upright**.

<div class="optics-diagram" role="img" aria-label="Plane mirror: the image is behind the mirror, as far behind as the object is in front">
<svg viewBox="0 0 600 268" xmlns="http://www.w3.org/2000/svg" width="100%" style="height:auto;display:block;max-width:640px;margin:0.6rem auto">
<line x1="300" y1="40" x2="300" y2="230" stroke="var(--accent-6)" stroke-width="4"/><line x1="302" y1="46" x2="312" y2="38" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="302" y1="60" x2="312" y2="52" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="302" y1="74" x2="312" y2="66" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="302" y1="88" x2="312" y2="80" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="302" y1="102" x2="312" y2="94" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="302" y1="116" x2="312" y2="108" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="302" y1="130" x2="312" y2="122" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="302" y1="144" x2="312" y2="136" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="302" y1="158" x2="312" y2="150" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="302" y1="172" x2="312" y2="164" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="302" y1="186" x2="312" y2="178" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="302" y1="200" x2="312" y2="192" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="302" y1="214" x2="312" y2="206" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="302" y1="228" x2="312" y2="220" stroke="var(--col-text-muted)" stroke-width="1"/><text x="300" y="30" text-anchor="middle" fill="var(--col-text-muted)" font-family="Space Mono,monospace" font-size="11">plane mirror</text><line x1="190" y1="200" x2="190" y2="110" stroke="var(--accent-4)" stroke-width="3"/><polygon points="190,103.4 194.9,116.6 185.1,116.6" fill="var(--accent-4)"/><text x="190" y="218" text-anchor="middle" fill="var(--accent-4)" font-family="Outfit,sans-serif" font-size="12">object</text><line x1="410" y1="200" x2="410" y2="110" stroke="var(--accent-3)" stroke-width="3" stroke-dasharray="5 4"/><polygon points="410,103.4 414.9,116.6 405.1,116.6" fill="var(--accent-3)"/><text x="410" y="218" text-anchor="middle" fill="var(--accent-3)" font-family="Outfit,sans-serif" font-size="12">virtual image</text><line x1="190" y1="110" x2="300" y2="97.1" stroke="var(--accent-0)" stroke-width="2"/><polygon points="249.8,103 240.7,107.7 239.8,100.5" fill="var(--accent-0)"/><line x1="300" y1="97.1" x2="70" y2="70" stroke="var(--accent-0)" stroke-width="2"/><polygon points="180.2,83 190.2,80.5 189.3,87.7" fill="var(--accent-0)"/><line x1="300" y1="97.1" x2="410" y2="110" stroke="var(--accent-0)" stroke-width="1.6" stroke-dasharray="5 4"/><line x1="190" y1="198" x2="300" y2="156.6" stroke="var(--accent-1)" stroke-width="2"/><polygon points="249.5,175.6 241.8,182.4 239.2,175.6" fill="var(--accent-1)"/><line x1="300" y1="156.6" x2="70" y2="70" stroke="var(--accent-1)" stroke-width="2"/><polygon points="180.5,111.6 190.8,111.6 188.2,118.4" fill="var(--accent-1)"/><line x1="300" y1="156.6" x2="410" y2="198" stroke="var(--accent-1)" stroke-width="1.6" stroke-dasharray="5 4"/><ellipse cx="60" cy="70" rx="16" ry="9" fill="none" stroke="var(--col-text-main)" stroke-width="2"/><circle cx="66" cy="70" r="4" fill="var(--col-text-main)"/><text x="60" y="54" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="11">eye</text><line x1="190" y1="240" x2="300" y2="240" stroke="var(--col-text-muted)" stroke-width="1.2"/><line x1="300" y1="240" x2="410" y2="240" stroke="var(--col-text-muted)" stroke-width="1.2"/><line x1="190" y1="234" x2="190" y2="246" stroke="var(--col-text-muted)" stroke-width="1.2"/><line x1="300" y1="234" x2="300" y2="246" stroke="var(--col-text-muted)" stroke-width="1.2"/><line x1="410" y1="234" x2="410" y2="246" stroke="var(--col-text-muted)" stroke-width="1.2"/><text x="245" y="258" text-anchor="middle" fill="var(--col-text-main)" font-family="Space Mono,monospace" font-size="13">do</text><text x="355" y="258" text-anchor="middle" fill="var(--col-text-main)" font-family="Space Mono,monospace" font-size="13">di</text><text x="520" y="120" text-anchor="middle" fill="var(--accent-0)" font-family="Outfit,sans-serif" font-size="15" font-weight="700">do = di</text><text x="520" y="140" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="11">same size</text><text x="520" y="156" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="11">upright, virtual</text><text x="520" y="172" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="11">light does not</text><text x="520" y="186" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="11">pass through it</text>
</svg>
</div>

### Real vs virtual image

| | Real image | Virtual image |
|---|---|---|
| Light really meets there? | Yes | No, only seems to |
| Can be caught on a screen? | Yes | No |
| Orientation, for a single mirror or lens | Inverted | Upright |
| Example | Concave mirror, object beyond F | Plane mirror; convex mirror |

---

## 3. Spherical mirrors

### Concave and convex

Spherical mirrors are shaped like a **section of a sphere**. A **concave** mirror reflects from the **inside**; a **convex** mirror reflects from the **outside**.

- **Concave mirror:** reflecting surface faces **towards the centre** of the sphere. It brings parallel rays **together**: it is converging.
- **Convex mirror:** reflecting surface faces **away from the centre** of the sphere. It **spreads** parallel rays out: it is diverging.

### Key definitions

- **Focus / focal point (F):** when a parallel beam hits a concave mirror, all the reflected rays **meet at one point**. That point is F.
- **Centre of curvature (C):** the centre of the sphere that the mirror is part of.
- **Radius of curvature (r):** distance from the mirror to C.
- **Focal length (f):** distance from the central point of the mirror, the pole P, to the focus.

```
f = r / 2   ← r = 2f
```

```example
Given r = 40 cm
f = 40 / 2 = 20 cm
```

**How f = r/2 is made:** using the geometry of a ray reflecting at a curved surface, where the angles to the normal are equal and the normal at any point of a sphere passes through C, a parallel ray close to the axis crosses the axis halfway between C and the mirror. So F sits **halfway** between the mirror and C.

<div class="optics-diagram" role="img" aria-label="Concave mirror brings parallel rays to F; convex mirror spreads them as if from F behind it">
<svg viewBox="0 0 640 312" xmlns="http://www.w3.org/2000/svg" width="100%" style="height:auto;display:block;max-width:640px;margin:0.6rem auto">
<line x1="20" y1="140" x2="300" y2="140" stroke="var(--col-text-muted)" stroke-width="1.2" stroke-dasharray="4 4"/><path d="M268.6,50 A200,200 0 0 1 268.6,230" fill="none" stroke="var(--accent-6)" stroke-width="5"/><line x1="30" y1="80" x2="280.8" y2="80" stroke="var(--accent-0)" stroke-width="1.8"/><polygon points="160.2,80 150.6,83.6 150.6,76.4" fill="var(--accent-0)"/><line x1="280.8" y1="80" x2="167.3" y2="155" stroke="var(--accent-1)" stroke-width="1.8"/><polygon points="231.4,112.6 237.4,104.4 241.4,110.4" fill="var(--accent-1)"/><line x1="30" y1="110" x2="287.7" y2="110" stroke="var(--accent-0)" stroke-width="1.8"/><polygon points="163.7,110 154.1,113.6 154.1,106.4" fill="var(--accent-0)"/><line x1="287.7" y1="110" x2="165.6" y2="147.5" stroke="var(--accent-1)" stroke-width="1.8"/><polygon points="234.3,126.4 242.4,120.1 244.5,127" fill="var(--accent-1)"/><line x1="30" y1="170" x2="287.7" y2="170" stroke="var(--accent-0)" stroke-width="1.8"/><polygon points="163.7,170 154.1,173.6 154.1,166.4" fill="var(--accent-0)"/><line x1="287.7" y1="170" x2="165.6" y2="132.5" stroke="var(--accent-1)" stroke-width="1.8"/><polygon points="234.3,153.6 244.5,153 242.4,159.9" fill="var(--accent-1)"/><line x1="30" y1="200" x2="280.8" y2="200" stroke="var(--accent-0)" stroke-width="1.8"/><polygon points="160.2,200 150.6,203.6 150.6,196.4" fill="var(--accent-0)"/><line x1="280.8" y1="200" x2="167.3" y2="125" stroke="var(--accent-1)" stroke-width="1.8"/><polygon points="231.4,167.4 241.4,169.6 237.4,175.6" fill="var(--accent-1)"/><circle cx="90" cy="140" r="4" fill="var(--col-text-main)"/><text x="90" y="160" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="14" font-weight="700">C</text><circle cx="190" cy="140" r="4" fill="var(--col-text-main)"/><text x="190" y="160" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="14" font-weight="700">F</text><text x="296" y="160" text-anchor="start" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="12">P</text><line x1="90" y1="146" x2="90" y2="276" stroke="var(--col-text-muted)" stroke-width="1" stroke-dasharray="2 4"/><line x1="190" y1="146" x2="190" y2="276" stroke="var(--col-text-muted)" stroke-width="1" stroke-dasharray="2 4"/><line x1="290" y1="146" x2="290" y2="276" stroke="var(--col-text-muted)" stroke-width="1" stroke-dasharray="2 4"/><line x1="190" y1="244" x2="290" y2="244" stroke="var(--accent-2)" stroke-width="1.6"/><text x="240" y="238" text-anchor="middle" fill="var(--accent-2)" font-family="Space Mono,monospace" font-size="13">f</text><line x1="90" y1="270" x2="290" y2="270" stroke="var(--accent-2)" stroke-width="1.6"/><text x="190" y="264" text-anchor="middle" fill="var(--accent-2)" font-family="Space Mono,monospace" font-size="13">r = 2f</text><text x="160" y="26" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="14" font-weight="600">Concave, converging mirror</text><text x="160" y="44" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="11">reflecting surface faces the centre C</text><line x1="340" y1="140" x2="630" y2="140" stroke="var(--col-text-muted)" stroke-width="1.2" stroke-dasharray="4 4"/><path d="M431.4,50 A200,200 0 0 0 431.4,230" fill="none" stroke="var(--accent-6)" stroke-width="5"/><line x1="350" y1="80" x2="419.2" y2="80" stroke="var(--accent-0)" stroke-width="1.8"/><polygon points="389.4,80 379.8,83.6 379.8,76.4" fill="var(--accent-0)"/><line x1="419.2" y1="80" x2="352.5" y2="35.9" stroke="var(--accent-1)" stroke-width="1.8"/><polygon points="381.8,55.3 391.8,57.6 387.9,63.6" fill="var(--accent-1)"/><line x1="419.2" y1="80" x2="510" y2="140" stroke="var(--accent-1)" stroke-width="1.2" stroke-dasharray="4 4"/><line x1="350" y1="110" x2="412.3" y2="110" stroke="var(--accent-0)" stroke-width="1.8"/><polygon points="385.9,110 376.3,113.6 376.3,106.4" fill="var(--accent-0)"/><line x1="412.3" y1="110" x2="335.8" y2="86.5" stroke="var(--accent-1)" stroke-width="1.8"/><polygon points="369.4,96.9 379.7,96.2 377.6,103.1" fill="var(--accent-1)"/><line x1="412.3" y1="110" x2="510" y2="140" stroke="var(--accent-1)" stroke-width="1.2" stroke-dasharray="4 4"/><line x1="350" y1="170" x2="412.3" y2="170" stroke="var(--accent-0)" stroke-width="1.8"/><polygon points="385.9,170 376.3,173.6 376.3,166.4" fill="var(--accent-0)"/><line x1="412.3" y1="170" x2="335.8" y2="193.5" stroke="var(--accent-1)" stroke-width="1.8"/><polygon points="369.4,183.1 377.6,176.9 379.7,183.8" fill="var(--accent-1)"/><line x1="412.3" y1="170" x2="510" y2="140" stroke="var(--accent-1)" stroke-width="1.2" stroke-dasharray="4 4"/><line x1="350" y1="200" x2="419.2" y2="200" stroke="var(--accent-0)" stroke-width="1.8"/><polygon points="389.4,200 379.8,203.6 379.8,196.4" fill="var(--accent-0)"/><line x1="419.2" y1="200" x2="352.5" y2="244.1" stroke="var(--accent-1)" stroke-width="1.8"/><polygon points="381.8,224.7 387.9,216.4 391.8,222.4" fill="var(--accent-1)"/><line x1="419.2" y1="200" x2="510" y2="140" stroke="var(--accent-1)" stroke-width="1.2" stroke-dasharray="4 4"/><circle cx="510" cy="140" r="4" fill="var(--col-text-main)"/><text x="510" y="160" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="14" font-weight="700">F</text><text x="404" y="160" text-anchor="end" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="12">P</text><text x="495" y="26" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="14" font-weight="600">Convex, diverging mirror</text><text x="495" y="44" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="11">reflecting surface faces away from the centre</text><text x="495" y="300" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="11">rays spread out; they seem to come from F behind</text><text x="160" y="300" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="11">parallel rays meet at the focus F</text>
</svg>
</div>

### Worked example

**Radius of curvature of a concave mirror with f = 25 cm**  
r = 2f = 2 × 25 = **50 cm**.

### Images by a concave mirror

1. Object **outside F**, farther than F → **real, inverted** image.
2. Object **inside F**, between F and the mirror → **virtual, upright, magnified** image.

A large concave mirror shows both: a person standing far away sees a **small and inverted** image; a person close to the mirror, inside F, sees a **large and upright** image.

<div class="optics-diagram" role="img" aria-label="Ray diagram: concave mirror with the object beyond C gives a real, inverted, smaller image between C and F">
<svg viewBox="140 8 430 335" xmlns="http://www.w3.org/2000/svg" width="100%" style="height:auto;display:block;max-width:640px;margin:0.6rem auto">
<line x1="150" y1="130" x2="560" y2="130" stroke="var(--col-text-muted)" stroke-width="1.2" stroke-dasharray="4 4"/><path d="M532,30 Q548,130 532,260" fill="none" stroke="var(--accent-6)" stroke-width="5"/><line x1="230" y1="130" x2="230" y2="70" stroke="var(--accent-4)" stroke-width="3"/><polygon points="230,63.4 234.9,76.6 225.1,76.6" fill="var(--accent-4)"/><text x="230" y="58" text-anchor="middle" fill="var(--accent-4)" font-family="Outfit,sans-serif" font-size="12">object</text><line x1="392.4" y1="130" x2="392.4" y2="158.6" stroke="var(--accent-3)" stroke-width="3"/><polygon points="392.4,165.2 387.4,152 397.3,152" fill="var(--accent-3)"/><text x="392.4" y="178.6" text-anchor="middle" fill="var(--accent-3)" font-family="Outfit,sans-serif" font-size="12">real image</text><line x1="230" y1="70" x2="540" y2="70" stroke="var(--accent-0)" stroke-width="2"/><polygon points="389.8,70 380.2,73.6 380.2,66.4" fill="var(--accent-0)"/><line x1="540" y1="70" x2="322.4" y2="200.6" stroke="var(--accent-0)" stroke-width="2"/><polygon points="427.1,137.8 433.5,129.7 437.2,135.9" fill="var(--accent-0)"/><line x1="230" y1="70" x2="540" y2="158.6" stroke="var(--accent-1)" stroke-width="2"/><polygon points="389.6,115.6 379.4,116.4 381.4,109.5" fill="var(--accent-1)"/><line x1="540" y1="158.6" x2="322.4" y2="158.6" stroke="var(--accent-1)" stroke-width="2"/><polygon points="426.4,158.6 436,155 436,162.2" fill="var(--accent-1)"/><line x1="230" y1="70" x2="540" y2="239.1" stroke="var(--accent-2)" stroke-width="2"/><polygon points="389.2,156.8 379.1,155.4 382.5,149.1" fill="var(--accent-2)"/><line x1="540" y1="239.1" x2="352.4" y2="136.8" stroke="var(--accent-2)" stroke-width="1.6" stroke-dasharray="5 4"/><circle cx="340" cy="130" r="4" fill="var(--col-text-main)"/><text x="348" y="122" text-anchor="start" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="14" font-weight="700">C</text><circle cx="440" cy="130" r="4" fill="var(--col-text-main)"/><text x="448" y="122" text-anchor="start" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="14" font-weight="700">F</text><text x="150" y="300" text-anchor="start" fill="var(--accent-0)" font-family="Space Mono,monospace" font-size="11">1 · parallel → reflects through F</text><text x="150" y="316" text-anchor="start" fill="var(--accent-1)" font-family="Space Mono,monospace" font-size="11">2 · through F → reflects parallel</text><text x="150" y="332" text-anchor="start" fill="var(--accent-2)" font-family="Space Mono,monospace" font-size="11">3 · through C → reflects straight back</text><text x="526" y="278" text-anchor="end" fill="var(--col-text-muted)" font-family="Space Mono,monospace" font-size="11">concave mirror</text><text x="150" y="30" text-anchor="start" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12">object beyond C → image between C and F: real, inverted, smaller</text>
</svg>
</div>

### Concave Mirror Image Positions

| Object position | Image position | Real or virtual | Upright or inverted | Size |
|---|---|---|---|---|
| Very far away, at infinity | At F | Real | Inverted | Very small, a point |
| Beyond C | Between C and F | Real | Inverted | Smaller |
| At C | At C | Real | Inverted | Same size |
| Between C and F | Beyond C | Real | Inverted | Larger |
| At F | No image: the reflected rays are parallel, so the image is "at infinity" | — | — | — |
| Inside F, between F and mirror | Behind the mirror | Virtual | Upright | Larger, magnified |

**How to read it:** as the object walks **in** from far away towards F, the real image walks **out** from F towards infinity and keeps **growing**. Once the object passes **inside F**, the image jumps **behind** the mirror and becomes virtual and upright.

### Convex Mirror Images

| Object position | Image position | Real or virtual | Upright or inverted | Size |
|---|---|---|---|---|
| Anywhere in front | Behind the mirror, between the mirror and F | Virtual | Upright | Smaller |

**Car side mirrors are convex mirrors.** They give a **wider field of view**, so you see more of the road, but the image is **smaller, upright and virtual**. Because things look smaller, they look farther away, which is why the mirror says **"objects in mirror are closer than they appear"**.

---

## 4. Index of refraction

Light slows down a little when it travels through a material, called a medium. The **index of refraction**, also called the **refractive index**, compares its speed in vacuum to its speed in the medium:

```
n = c / v
c = speed of light in vacuum = 3 × 10⁸ m/s
v = speed of light in the medium
```

```example
Given v = 2.25 × 10⁸ m/s in water
n = (3 × 10⁸) / (2.25 × 10⁸) ≈ 1.33
```

**How n is made:** divide the vacuum speed by the speed in the medium. Light is never faster than c, so n ≥ 1, and vacuum is exactly 1. n has **no units**.

- **Higher n → slower light** in that medium, and lower n → faster light.
- Optically "denser" in this chapter means **higher n**; "rarer" means **lower n**.

### Indices of refraction at λ = 589 nm

| Medium | n = c/v |
|---|---|
| Vacuum | 1.0000 |
| Air at STP | 1.0003 |
| Water | 1.33 |
| Ethyl alcohol | 1.36 |
| Glass: fused quartz | 1.46 |
| Glass: crown glass | 1.52 |
| Glass: light flint | 1.58 |
| Lucite or Plexiglas | 1.51 |
| Sodium chloride | 1.53 |
| Diamond | 2.42 |

### Practice example

**Speed of light in water**  
v = c / n = 3 × 10⁸ / 1.33 ≈ **2.26 × 10⁸ m/s**, slower than in air, as expected.

---

## 5. Refraction & Snell's law

### What refraction is

Light **changes direction** when it crosses the boundary from one medium to another. This is **refraction**. The angle the outgoing ray makes with the **normal** is the **angle of refraction**.

- Going into a **higher n**, e.g. air → water with n₂ > n₁: the ray bends **toward** the normal.
- Going into a **lower n**, e.g. water → air with n₁ > n₂: the ray bends **away from** the normal.
- A small part of the light is also **reflected** at the boundary.

<div class="optics-diagram" role="img" aria-label="Refraction: entering a higher-index medium the ray bends toward the normal; leaving it, away from the normal">
<svg viewBox="0 0 640 295" xmlns="http://www.w3.org/2000/svg" width="100%" style="height:auto;display:block;max-width:640px;margin:0.6rem auto">
<rect x="10" y="150" width="300" height="110" fill="rgba(var(--accent-1-rgb),0.16)"/><line x1="10" y1="150" x2="310" y2="150" stroke="var(--accent-1)" stroke-width="1.5"/><line x1="160" y1="40" x2="160" y2="260" stroke="var(--col-text-muted)" stroke-width="1.3" stroke-dasharray="6 5"/><text x="160" y="34" text-anchor="middle" fill="var(--col-text-muted)" font-family="Space Mono,monospace" font-size="11">normal</text><line x1="68.1" y1="72.9" x2="160" y2="150" stroke="var(--accent-0)" stroke-width="2.5"/><polygon points="117.7,114.5 108,111.1 112.7,105.6" fill="var(--accent-0)"/><line x1="160" y1="150" x2="229.1" y2="248.1" stroke="var(--accent-0)" stroke-width="2.5"/><polygon points="197.3,203 188.9,197.2 194.7,193.1" fill="var(--accent-0)"/><path d="M160,104 A46,46 0 0 0 124.8,120.4" fill="none" stroke="var(--accent-2)" stroke-width="1.5"/><path d="M160,196 A46,46 0 0 0 186.5,187.6" fill="none" stroke="var(--accent-2)" stroke-width="1.5"/><text x="138" y="94" text-anchor="middle" fill="var(--accent-2)" font-family="Space Mono,monospace" font-size="12">50°</text><text x="182" y="218" text-anchor="middle" fill="var(--accent-2)" font-family="Space Mono,monospace" font-size="12">35°</text><text x="18" y="142" text-anchor="start" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12">air, n₁ = 1.00</text><text x="18" y="170" text-anchor="start" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12">water, n₂ = 1.33</text><text x="160" y="20" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="13" font-weight="600">a. air → water: n₂ > n₁</text><text x="160" y="285" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="11">bends TOWARD the normal</text><rect x="330" y="150" width="300" height="110" fill="rgba(var(--accent-1-rgb),0.16)"/><line x1="330" y1="150" x2="630" y2="150" stroke="var(--accent-1)" stroke-width="1.5"/><line x1="480" y1="40" x2="480" y2="260" stroke="var(--col-text-muted)" stroke-width="1.3" stroke-dasharray="6 5"/><text x="480" y="34" text-anchor="middle" fill="var(--col-text-muted)" font-family="Space Mono,monospace" font-size="11">normal</text><line x1="410.9" y1="248.1" x2="480" y2="150" stroke="var(--accent-0)" stroke-width="2.5"/><polygon points="448.2,195.1 445.6,205 439.7,200.9" fill="var(--accent-0)"/><line x1="480" y1="150" x2="571.9" y2="72.9" stroke="var(--accent-0)" stroke-width="2.5"/><polygon points="529.6,108.3 524.6,117.3 520,111.8" fill="var(--accent-0)"/><path d="M480,104 A46,46 0 0 1 515.2,120.4" fill="none" stroke="var(--accent-2)" stroke-width="1.5"/><path d="M480,196 A46,46 0 0 1 453.5,187.6" fill="none" stroke="var(--accent-2)" stroke-width="1.5"/><text x="502" y="94" text-anchor="middle" fill="var(--accent-2)" font-family="Space Mono,monospace" font-size="12">50°</text><text x="458" y="218" text-anchor="middle" fill="var(--accent-2)" font-family="Space Mono,monospace" font-size="12">35°</text><text x="338" y="142" text-anchor="start" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12">air, n₂ = 1.00</text><text x="338" y="170" text-anchor="start" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12">water, n₁ = 1.33</text><text x="480" y="20" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="13" font-weight="600">b. water → air: n₁ > n₂</text><text x="480" y="285" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="11">bends AWAY from the normal</text>
</svg>
</div>

### Snell's law

```
n₁ sin θ₁ = n₂ sin θ₂
```

**How Snell's law is made:** each side is "index × sine of the angle **from the normal**" for one medium. The product stays the same across the boundary. So if n goes up, sin θ must go down, so the ray bends toward the normal, and the other way round.

### Everyday examples

- **Fish in water:** light from the fish bends **away from the normal** as it leaves the water. Your eye traces the ray back in a straight line, so the fish **appears higher**, or shallower, than it really is. This is why spear-fishing aims **below** where the fish appears.
- **Glass slab in air, air → glass → air:** the ray bends toward the normal going in and away from the normal coming out. It leaves **parallel** to its original direction, only shifted sideways, so the object seems to be in a slightly different place. This "image" is where the object appears to be.

### Worked examples

**Air → water at 30°**  
For air n₁ = 1, and for water n₂ = 1.33.

```
n₁ sin θ₁ = n₂ sin θ₂
1 × sin 30° = 1.33 × sin θ₂
sin θ₂ = 0.5 / 1.33 = 0.376
θ₂ = sin⁻¹(0.376) ≈ 22.08°
```

The ray bends **toward** the normal (30° → 22.08°), as it should going into water.

**Index of the glass**: air → glass, θ₁ = 45°, θ₂ = 30°

```
n₁ sin θ₁ = n₂ sin θ₂
1 × sin 45° = n₂ × sin 30°
n₂ = 0.7071 / 0.5 = 1.414
```

---

## 6. Total internal reflection

Total internal reflection, **TIR**, traps light inside a denser medium.

### From denser to rarer

When light goes from a **denser** medium with a high n, such as water or glass, into a **rarer** one with a low n, such as air, it bends **away from the normal**: the angle of refraction is **larger** than the angle of incidence.

If we slowly increase the angle of incidence, the angle of refraction also increases. At one special angle of incidence, the angle of refraction becomes **90°**, so the refracted ray skims along the surface. This angle is the **critical angle, θc**:

```
n₁ sin θc = n₂ sin 90°
sin θc = n₂ / n₁   ← n₁ = denser, n₂ = rarer, n₁ > n₂
```

```example
Given glass n₁ = 1.5 to air n₂ = 1.0
sin θc = 1.0 / 1.5 ≈ 0.667
θc = sin⁻¹(0.667) ≈ 41.8°
```

**How the critical-angle formula is made:** it is just Snell's law with θ₂ = 90°, and sin 90° = 1.

### Total internal reflection

If the angle of incidence is **greater than the critical angle**, no light gets out: the ray **reflects back into the denser medium**. This is **total internal reflection**.

<div class="optics-diagram" role="img" aria-label="Total internal reflection: below, at and above the critical angle">
<svg viewBox="0 0 640 266" xmlns="http://www.w3.org/2000/svg" width="100%" style="height:auto;display:block;max-width:640px;margin:0.6rem auto">
<text x="8" y="112" text-anchor="start" fill="var(--col-text-muted)" font-family="Space Mono,monospace" font-size="11">air</text><text x="8" y="140" text-anchor="start" fill="var(--col-text-muted)" font-family="Space Mono,monospace" font-size="11">glass</text><rect x="20" y="120" width="200" height="110" fill="rgba(var(--accent-1-rgb),0.16)"/><line x1="20" y1="120" x2="220" y2="120" stroke="var(--accent-1)" stroke-width="1.5"/><line x1="125" y1="40" x2="125" y2="220" stroke="var(--col-text-muted)" stroke-width="1.2" stroke-dasharray="5 4"/><line x1="75" y1="206.6" x2="125" y2="120" stroke="var(--accent-0)" stroke-width="2.4"/><polygon points="102.4,159.1 100.7,169.3 94.5,165.7" fill="var(--accent-0)"/><line x1="125" y1="120" x2="200" y2="53.9" stroke="var(--accent-0)" stroke-width="2.4"/><polygon points="166.1,83.8 161.3,92.8 156.5,87.4" fill="var(--accent-0)"/><line x1="125" y1="120" x2="175" y2="206.6" stroke="var(--accent-0)" stroke-width="1.2"/><polygon points="152.4,167.5 144.5,160.9 150.7,157.3" fill="var(--accent-0)"/><text x="141" y="72" text-anchor="middle" fill="var(--accent-2)" font-family="Space Mono,monospace" font-size="11">49°</text><path d="M125,154 A34,34 0 0 1 108,149.4" fill="none" stroke="var(--accent-2)" stroke-width="1.5"/><text x="109" y="183.9" text-anchor="middle" fill="var(--accent-2)" font-family="Space Mono,monospace" font-size="10">30°</text><text x="120" y="22" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="13" font-weight="600">Case 1 · θ < θc</text><text x="120" y="40" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="10.5">refracts out, bends away</text><rect x="225" y="120" width="200" height="110" fill="rgba(var(--accent-1-rgb),0.16)"/><line x1="225" y1="120" x2="425" y2="120" stroke="var(--accent-1)" stroke-width="1.5"/><line x1="330" y1="40" x2="330" y2="220" stroke="var(--col-text-muted)" stroke-width="1.2" stroke-dasharray="5 4"/><line x1="263.3" y1="194.5" x2="330" y2="120" stroke="var(--accent-0)" stroke-width="2.4"/><polygon points="299.9,153.7 296.1,163.2 290.8,158.4" fill="var(--accent-0)"/><line x1="330" y1="120" x2="420" y2="119" stroke="var(--accent-0)" stroke-width="2.4"/><polygon points="379.8,119.4 370.2,123.2 370.2,116" fill="var(--accent-0)"/><text x="390" y="112" text-anchor="middle" fill="var(--accent-2)" font-family="Space Mono,monospace" font-size="11">90°</text><line x1="330" y1="120" x2="396.7" y2="194.5" stroke="var(--accent-0)" stroke-width="1.2"/><polygon points="366.5,160.8 357.5,156.1 362.8,151.3" fill="var(--accent-0)"/><path d="M330,154 A34,34 0 0 1 307.3,145.3" fill="none" stroke="var(--accent-2)" stroke-width="1.5"/><text x="307.9" y="181.9" text-anchor="middle" fill="var(--accent-2)" font-family="Space Mono,monospace" font-size="10">θc</text><text x="325" y="22" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="13" font-weight="600">Case 2 · θ = θc</text><text x="325" y="40" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="10.5">refracted ray skims the surface</text><rect x="430" y="120" width="200" height="110" fill="rgba(var(--accent-1-rgb),0.16)"/><line x1="430" y1="120" x2="630" y2="120" stroke="var(--accent-1)" stroke-width="1.5"/><line x1="535" y1="40" x2="535" y2="220" stroke="var(--col-text-muted)" stroke-width="1.2" stroke-dasharray="5 4"/><line x1="448.4" y1="170" x2="535" y2="120" stroke="var(--accent-0)" stroke-width="2.4"/><polygon points="495.9,142.6 489.3,150.5 485.7,144.3" fill="var(--accent-0)"/><line x1="535" y1="120" x2="621.6" y2="170" stroke="var(--accent-1)" stroke-width="2.6"/><polygon points="582.5,147.4 572.3,145.7 575.9,139.5" fill="var(--accent-1)"/><path d="M535,154 A34,34 0 0 1 505.6,137" fill="none" stroke="var(--accent-2)" stroke-width="1.5"/><text x="504" y="177.7" text-anchor="middle" fill="var(--accent-2)" font-family="Space Mono,monospace" font-size="10">60°</text><text x="530" y="22" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="13" font-weight="600">Case 3 · θ > θc</text><text x="530" y="40" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="10.5">total internal reflection</text><text x="320" y="256" text-anchor="middle" fill="var(--col-text-main)" font-family="Space Mono,monospace" font-size="12">glass n = 1.50 into air: sin θc = 1/1.50 → θc ≈ 41.8°</text>
</svg>
</div>

| Case | Angle of incidence | What happens |
|---|---|---|
| 1 | Less than θc | Refracts out, bending away from the normal; a little is reflected |
| 2 | Equal to θc | Refracted ray at 90°, along the surface |
| 3 | Greater than θc | Total internal reflection, all light reflects back inside |

**Two conditions for TIR:** (1) light travels from **higher n to lower n**, and (2) the angle of incidence is **greater than θc**.

### Applications

1. **Binoculars** often use total internal reflection, with prisms instead of mirrors.
2. **Mirages** and the **sparkle of diamonds** are due to total internal reflection.
3. Light is **guided through optical fibre (OF) cables** by total internal reflection.

### Practice examples

**Water → air:** sin θc = 1 / 1.33 = 0.752 → θc ≈ **48.8°**.  
**Diamond → air:** sin θc = 1 / 2.42 = 0.413 → θc ≈ **24.4°**. The very small critical angle traps light inside a cut diamond, so it bounces around and **sparkles**.

---

## 7. Optical fibres & medical endoscopes

### What an optical fibre is

An optical fibre (OF) cable is a **thin, long core (wire) of glassy material**:

- **Core:** the dense central part with a **high** index of refraction, **n₁**.
- **Cladding:** around the core, with a **low** index of refraction, **n₂**.
- **n₁ > n₂**, so light hitting the core–cladding wall at a large angle undergoes **TIR** again and again and travels along the fibre.
- Real cables add a coating, a strength member and an outer jacket for protection.

<div class="optics-diagram" role="img" aria-label="Optical fibre: light zig-zags along the high-index core by total internal reflection at the cladding">
<svg viewBox="0 0 640 248" xmlns="http://www.w3.org/2000/svg" width="100%" style="height:auto;display:block;max-width:640px;margin:0.6rem auto">
<rect x="30" y="70" width="580" height="120" rx="14" fill="rgba(var(--accent-6-rgb),0.14)" stroke="var(--accent-6)" stroke-width="2"/><rect x="30" y="100" width="580" height="60" fill="rgba(var(--accent-1-rgb),0.22)" stroke="var(--accent-1)" stroke-width="1.5"/><line x1="30" y1="145" x2="75" y2="100" stroke="var(--accent-0)" stroke-width="2.4"/><polygon points="55.9,119.1 51.7,128.4 46.6,123.3" fill="var(--accent-0)"/><line x1="75" y1="100" x2="165" y2="160" stroke="var(--accent-0)" stroke-width="2.4"/><polygon points="124,132.7 114,130.3 118,124.3" fill="var(--accent-0)"/><line x1="165" y1="160" x2="255" y2="100" stroke="var(--accent-0)" stroke-width="2.4"/><polygon points="214,127.3 208,135.7 204,129.7" fill="var(--accent-0)"/><line x1="255" y1="100" x2="345" y2="160" stroke="var(--accent-0)" stroke-width="2.4"/><polygon points="304,132.7 294,130.3 298,124.3" fill="var(--accent-0)"/><line x1="345" y1="160" x2="435" y2="100" stroke="var(--accent-0)" stroke-width="2.4"/><polygon points="394,127.3 388,135.7 384,129.7" fill="var(--accent-0)"/><line x1="435" y1="100" x2="525" y2="160" stroke="var(--accent-0)" stroke-width="2.4"/><polygon points="484,132.7 474,130.3 478,124.3" fill="var(--accent-0)"/><line x1="525" y1="160" x2="610" y2="103.3" stroke="var(--accent-0)" stroke-width="2.4"/><polygon points="571.5,129 565.5,137.3 561.5,131.3" fill="var(--accent-0)"/><line x1="610" y1="103.3" x2="632" y2="88.7" stroke="var(--accent-0)" stroke-width="2.4"/><polygon points="632,88.7 626,97 622,91" fill="var(--accent-0)"/><text x="320" y="90" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="11">cladding · low index n₂</text><text x="320" y="180" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="11">cladding · low index n₂</text><line x1="140" y1="52" x2="140" y2="100" stroke="var(--col-text-muted)" stroke-width="1.2" stroke-dasharray="3 3"/><text x="148" y="50" text-anchor="start" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12" font-weight="600">core · high index n₁</text><text x="320" y="236" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="11">n₁ > n₂ · the ray hits the wall above the critical angle → TIR at every bounce</text><text x="30" y="24" text-anchor="start" fill="var(--accent-0)" font-family="Outfit,sans-serif" font-size="12">light in</text><text x="610" y="24" text-anchor="end" fill="var(--accent-0)" font-family="Outfit,sans-serif" font-size="12">light out, even round bends</text>
</svg>
</div>

### Medical endoscopes

- **Endoscopes** are instruments used to **view the inside of the body** by inserting OF cables, because the fibres are **thin and flexible**.
- **Total internal reflection is the principle behind endoscopes.**
- **One bundle** of fibres carries **light** to the area, while **another bundle** carries the **image** of the area back to the monitor.
- Light is transmitted along the fibre **even if it is not straight**.
- An image can be formed using **multiple small fibres**. Each fibre carries one small part of the picture.
- Example: an endoscope passed through the oesophagus into the **stomach**, with the view shown on a TV monitor.

### Other medical uses

Optical fibres are used in **biomedical surgical lasers**, **endoscope lasers** and **microscope lasers**.

---

## 8. Thin lenses & ray tracing

### Thin lenses

Thin lenses are **transparent objects with refracting surfaces** whose **thickness is small** compared to their radius of curvature.

| | Convex, converging lens | Concave, diverging lens |
|---|---|---|
| Shape | **Thicker at the centre** | **Thinner at the centre**, thicker at the edge |
| Effect on rays | Brings rays **together**: converge | **Spreads** rays out: diverge |
| Focal length / power | Positive (+) | Negative (−) |
| Shapes | Double convex, planoconvex, convex meniscus | Double concave, planoconcave, concave meniscus |

### Focal point of a diverging lens

A diverging, concave lens makes parallel light **diverge**. Its focal point is the point where the diverging rays **would meet if projected back**, on the same side as the incoming light. That is why its focal length is negative.

### Power of a lens

```
P = 1 / f   ← f in metres
Unit: dioptre, D      1 D = 1 m⁻¹
Convex lens: P positive   ·   Concave lens: P negative
```

**How P is made:** power is just **one over the focal length in metres**. A short focal length bends light strongly, so it has a big power.

### Worked examples

**Power of a lens with f = 30 cm**

```
f = 30 cm = 0.30 m
P = 1 / 0.30 = 3.33 D   ← positive → convex lens
```

**Focal length of a concave lens with P = −5 D**

```
f = 1 / P = 1 / (−5) = −0.2 m   ← = −20 cm; negative → diverging
```

### Ray Tracing: The Three Key Rays

Ray tracing for thin lenses is like ray tracing for mirrors. Use the **top of the object** and draw:

1. A ray that comes in **parallel** to the axis → exits **through the focal point**.
2. A ray that comes in **through the focal point** → exits **parallel** to the axis.
3. A ray that goes **through the centre** of the lens → goes straight on, **undeflected**.

Where the rays meet, or seem to come from, is the top of the image.

<div class="optics-diagram" role="img" aria-label="Convex lens ray diagram with the three key rays; object beyond 2F gives a real, inverted, smaller image">
<svg viewBox="0 0 640 302" xmlns="http://www.w3.org/2000/svg" width="100%" style="height:auto;display:block;max-width:640px;margin:0.6rem auto">
<line x1="40" y1="150" x2="620" y2="150" stroke="var(--col-text-muted)" stroke-width="1.2" stroke-dasharray="4 4"/><path d="M330,55 Q352,150 330,245 Q308,150 330,55 Z" fill="rgba(var(--accent-6-rgb),0.2)" stroke="var(--accent-6)" stroke-width="2"/><line x1="130" y1="150" x2="130" y2="94" stroke="var(--accent-4)" stroke-width="3"/><polygon points="130,87.4 134.9,100.6 125,100.6" fill="var(--accent-4)"/><text x="130" y="82" text-anchor="middle" fill="var(--accent-4)" font-family="Outfit,sans-serif" font-size="12">object</text><line x1="463.3" y1="150" x2="463.3" y2="187.3" stroke="var(--accent-3)" stroke-width="3"/><polygon points="463.3,193.9 458.4,180.7 468.3,180.7" fill="var(--accent-3)"/><text x="463.3" y="207.3" text-anchor="middle" fill="var(--accent-3)" font-family="Outfit,sans-serif" font-size="12">real image</text><line x1="130" y1="94" x2="330" y2="94" stroke="var(--accent-0)" stroke-width="2"/><polygon points="234.8,94 225.2,97.6 225.2,90.4" fill="var(--accent-0)"/><line x1="330" y1="94" x2="600" y2="283" stroke="var(--accent-0)" stroke-width="2"/><polygon points="468.9,191.3 459,188.7 463.1,182.8" fill="var(--accent-0)"/><line x1="130" y1="94" x2="330" y2="187.3" stroke="var(--accent-1)" stroke-width="2"/><polygon points="234.3,142.7 224.1,141.9 227.2,135.4" fill="var(--accent-1)"/><line x1="330" y1="187.3" x2="600" y2="187.3" stroke="var(--accent-1)" stroke-width="2"/><polygon points="469.8,187.3 460.2,190.9 460.2,183.7" fill="var(--accent-1)"/><line x1="130" y1="94" x2="600" y2="225.6" stroke="var(--accent-2)" stroke-width="2"/><polygon points="369.6,161.1 359.4,162 361.3,155" fill="var(--accent-2)"/><circle cx="170" cy="150" r="3.5" fill="var(--col-text-main)"/><text x="170" y="170" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12" font-weight="600">2F</text><circle cx="250" cy="150" r="3.5" fill="var(--col-text-main)"/><text x="250" y="170" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12" font-weight="600">F</text><circle cx="410" cy="150" r="3.5" fill="var(--col-text-main)"/><text x="410" y="170" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12" font-weight="600">F′</text><circle cx="490" cy="150" r="3.5" fill="var(--col-text-main)"/><text x="490" y="170" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12" font-weight="600">2F′</text><text x="330" y="24" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="13" font-weight="600">Convex, converging lens · the three key rays</text><text x="40" y="262" text-anchor="start" fill="var(--accent-0)" font-family="Space Mono,monospace" font-size="11">1 · parallel → through F′</text><text x="40" y="278" text-anchor="start" fill="var(--accent-1)" font-family="Space Mono,monospace" font-size="11">2 · through F → parallel</text><text x="40" y="294" text-anchor="start" fill="var(--accent-2)" font-family="Space Mono,monospace" font-size="11">3 · through the centre → straight on</text>
</svg>
</div>

### Images formed by a convex lens

| Object position | Image position | Real or virtual | Upright or inverted | Size |
|---|---|---|---|---|
| Distant object | At F | Real | Inverted | Smaller |
| At 2F | At 2F, other side | Real | Inverted | Same size |
| Between 2F and F | Beyond 2F, other side | Real | Inverted | Larger |
| At F | No image: the refracted rays are parallel | — | — | — |
| Between F and the lens | Behind the object, on the same side of the lens | Virtual | Upright | Larger |

### Concave lens and convex mirror

For a diverging lens we use the **same three rays**. The image is **always virtual, upright and smaller**, between the object and the lens, wherever the object is.

<div class="optics-diagram" role="img" aria-label="Concave lens: the image is always virtual, upright, smaller, between the object and the lens">
<svg viewBox="0 0 640 302" xmlns="http://www.w3.org/2000/svg" width="100%" style="height:auto;display:block;max-width:640px;margin:0.6rem auto">
<line x1="40" y1="165" x2="620" y2="165" stroke="var(--col-text-muted)" stroke-width="1.2" stroke-dasharray="4 4"/><path d="M314,70 L346,70 Q333,165 346,260 L314,260 Q327,165 314,70 Z" fill="rgba(var(--accent-6-rgb),0.2)" stroke="var(--accent-6)" stroke-width="2"/><line x1="180" y1="165" x2="180" y2="105" stroke="var(--accent-4)" stroke-width="3"/><polygon points="180,98.4 184.9,111.6 175.1,111.6" fill="var(--accent-4)"/><text x="174" y="95" text-anchor="end" fill="var(--accent-4)" font-family="Outfit,sans-serif" font-size="12">object</text><line x1="270" y1="165" x2="270" y2="141" stroke="var(--accent-3)" stroke-width="3" stroke-dasharray="4 3"/><polygon points="270,134.4 274.9,147.6 265.1,147.6" fill="var(--accent-3)"/><text x="276" y="207" text-anchor="middle" fill="var(--accent-3)" font-family="Outfit,sans-serif" font-size="12">virtual image</text><line x1="270" y1="169" x2="274" y2="193" stroke="var(--accent-3)" stroke-width="1" stroke-dasharray="2 2"/><line x1="180" y1="105" x2="330" y2="105" stroke="var(--accent-0)" stroke-width="2"/><polygon points="259.8,105 250.2,108.6 250.2,101.4" fill="var(--accent-0)"/><line x1="330" y1="105" x2="411.7" y2="56" stroke="var(--accent-0)" stroke-width="2"/><polygon points="374.9,78 368.6,86.1 364.9,79.9" fill="var(--accent-0)"/><line x1="230" y1="165" x2="330" y2="105" stroke="var(--accent-0)" stroke-width="1.4" stroke-dasharray="5 4"/><line x1="180" y1="105" x2="600" y2="273" stroke="var(--accent-2)" stroke-width="2"/><polygon points="394.5,190.8 384.2,190.6 386.9,183.9" fill="var(--accent-2)"/><circle cx="230" cy="165" r="3.5" fill="var(--col-text-main)"/><text x="230" y="185" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12" font-weight="600">F</text><circle cx="430" cy="165" r="3.5" fill="var(--col-text-main)"/><text x="430" y="185" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12" font-weight="600">F′</text><text x="330" y="22" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="13" font-weight="600">Concave, diverging lens</text><text x="330" y="40" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="11">image: virtual, upright, smaller, between the object and the lens</text><text x="40" y="292" text-anchor="start" fill="var(--col-text-muted)" font-family="Space Mono,monospace" font-size="10.5">parallel ray leaves as if from F, dashed back-line · centre ray goes straight on</text>
</svg>
</div>

| Object position | Image position | Real or virtual | Upright or inverted | Size |
|---|---|---|---|---|
| Anywhere, concave lens | Between the object and the lens, same side | Virtual | Upright | Smaller |
| Anywhere, convex mirror | Behind the mirror | Virtual | Upright | Smaller |

**Concave lens and convex mirror always make a virtual, upright and small image**, as in the car side mirror.

### Mirrors and lenses side by side

| Converging | Diverging |
|---|---|
| Concave **mirror** · convex **lens** | Convex **mirror** · concave **lens** |
| f positive | f negative |
| Real inverted image when the object is beyond F | Always virtual, upright, smaller |
| Virtual, upright, larger image when the object is inside F | — |
| Mirror: C = 2f plays the role of the lens's 2F | — |

---

## 9. Thin lens equation & magnification

### The thin lens equation

The thin lens equation has the same form as the mirror equation:

```
1/do + 1/di = 1/f
do = object distance
di = image distance
f  = focal length
```

```example
Given do = 15 cm, f = 10 cm
1/di = 1/10 − 1/15 = 3/30 − 2/30 = 1/30
di = +30 cm
```

**How it is used:** put in the two distances you know, with their signs, and solve for the third. Use the **same units** for all three: all cm or all m.

### Magnification

The magnification is:

```
m = hi / ho = −di / do
hi = height of the image
ho = height of the object
```

```example
Given do = 15 cm, di = 30 cm, ho = 1 cm
m = −di / do = −30 / 15 = −2
hi = m × ho = −2 × 1 = −2 cm → inverted, twice the size
```

You may also see the simple size form:

```
M = size of image / size of object
```

**How they relate:** M is just the **size ratio**, with no sign: M = |m| = |hi| / |ho| = |di| / |do|. The **m** form **carries a sign** that also tells you the orientation:

- **m negative** → image **inverted**, and real for one lens or mirror.
- **m positive** → image **upright** and virtual.
- |m| > 1 → **larger**; |m| < 1 → **smaller**; |m| = 1 → **same size**.

### Sign conventions

For lenses, the conventions are slightly different from the mirror ones:

1. The **focal length** is **positive for converging** lenses and **negative for diverging** lenses.
2. The **height of the image** is **positive if the image is upright** and **negative** when it is inverted.

Also needed to use the equation:

- The **object distance do** is positive for a real object in front of the lens.
- The **image distance di** is **positive for a real image** on the opposite side of a lens and **negative for a virtual image** on the same side as the object.

For **mirrors**, the same equation works with f **positive for concave** and **negative for convex**, and di positive for a real image in front of the mirror, negative for a virtual image behind it.

### Worked examples

**Object 20 cm in front of a convex lens, f = 10 cm. Image distance?**

```
1/do + 1/di = 1/f
1/20 + 1/di = 1/10
1/di = 1/10 − 1/20 = 2/20 − 1/20 = 1/20
di = +20 cm
m = −di/do = −20/20 = −1
```

di is positive → **real image, 20 cm on the other side**. m = −1 → **inverted, same size**. This matches the table: the object is at **2F**, because 20 cm = 2 × 10 cm, so the image is at 2F, real, inverted, same size.

**Object 10 cm in front of a convex lens, image 20 cm from the lens. Focal length?**

```
1/f = 1/do + 1/di = 1/10 + 1/20 = 2/20 + 1/20 = 3/20
f = 20/3 ≈ 6.67 cm
```

f is positive → converging, as expected for a convex lens. This takes the image as **real**, on the other side, so di = +20 cm. Always follow the sign conventions: if the image were virtual, di would be −20 cm.

### Practice example: mirror

**Object 30 cm in front of a concave mirror, f = 10 cm**

```
1/di = 1/f − 1/do = 1/10 − 1/30 = 3/30 − 1/30 = 2/30
di = +15 cm
m = −di/do = −15/30 = −0.5
```

Real image 15 cm in front of the mirror, inverted, half the size. The object at 30 cm is beyond C, since r = 20 cm, so the image is between C and F, as the concave mirror table says.

---

## 10. Clinical / medical links

| Physics | Medicine |
|---------|----------|
| Total internal reflection in optical fibres | Endoscopes: view the stomach and other organs without open surgery |
| Two fibre bundles: light in, image out | Light to the area + picture to the monitor |
| Fibres carry light round bends | Flexible scopes follow the oesophagus, bowel, airways |
| Fibres carry laser light | Surgical lasers, endoscope lasers, microscope lasers |
| Lens power in dioptres: P = 1/f | Glasses and contact lens prescriptions: + for convex, − for concave |
| Concave mirror, object inside F → upright, magnified | Magnified view when the mirror is close, as in shaving or make-up mirrors |
| Convex mirror → wide view, smaller image | Car side mirrors and safety mirrors |

---

## 11. Formula sheet — Chapter 5

```
Reflection: θi = θr                     ← both measured from the normal, at 90° to the surface
Plane mirror: do = di                   ← virtual, upright, same size
Spherical mirror: f = r / 2             ← focus halfway to the centre of curvature
Refractive index: n = c / v             ← c = 3 × 10⁸ m/s; higher n → slower light
Snell's law: n₁ sin θ₁ = n₂ sin θ₂      ← angles from the normal
Critical angle: sin θc = n₂ / n₁        ← dense (n₁) → rare (n₂), θ₂ = 90°
TIR: n₁ > n₂ and θ > θc                 ← all light reflects back inside
Lens power: P = 1 / f                   ← f in metres; dioptre D = m⁻¹; convex +, concave −
Thin lens / mirror: 1/do + 1/di = 1/f   ← same equation for both
Magnification: m = hi / ho = −di / do   ← sign: − inverted, + upright
Size ratio: M = image size / object size = |m|
```

### Images at a glance

- Concave mirror / convex lens, object **beyond F** → **real, inverted**; beyond C (2F) smaller, at C (2F) same size, between C (2F) and F larger
- Concave mirror / convex lens, object **at F** → **no image**, because the rays leave parallel
- Concave mirror / convex lens, object **inside F** → **virtual, upright, larger**
- Convex mirror / concave lens, **anywhere** → **virtual, upright, smaller**
- Plane mirror → **virtual, upright, same size**, do = di

### Key Points to Remember
- Ray optics treats light as straight-line rays; wave optics treats light as a wave.  
- Every angle is measured from the **normal**, the line at 90° to the surface.  
- Entering a medium with a higher n, the ray bends **toward** the normal; entering a lower n, it bends **away**.  
- Total internal reflection needs light going from a **denser to a rarer** medium at an angle **larger than the critical angle**.  
- Concave **mirrors** and convex **lenses** converge; convex **mirrors** and concave **lenses** diverge.  
- **Converging: f and P are positive. Diverging: f and P are negative.**  
- **A negative m means the image is inverted**; a positive m means it is upright.  
- A convex car mirror gives a smaller image, so objects are closer than they appear.  

### Medical Applications
- An endoscope uses optical fibres, which work by **total internal reflection**.  
- One fibre bundle carries **light in**; another carries the **image out**.  
- Fibres are thin and flexible and still carry light round bends.  
- Fibres also deliver **surgical laser** light.  
- Lens prescriptions are given in **dioptres**: + for convex, − for concave lenses.  
