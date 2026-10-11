# Chapter 8 — Electricity & Magnetism

---

## 1. Overview & learning map

### What this chapter covers

Chapter 8 builds electricity from the ground up: **electric charge**, **Coulomb's law** for the force between charges, the **electric field** and the **electric potential**. It then covers **current**, **Ohm's law**, **resistance and resistivity** and **current density**. The body uses electricity too, so the chapter explains **nerve conduction**: the resting potential and the **action potential**. The last part is **magnetism**: the force on a moving charge, **MRI**, and **biomagnetism**, the weak magnetic fields the body makes.

### Topics map

| Topic | Core idea |
|-------|-----------|
| Electric charge | Two kinds; like repel, unlike attract; Q = n e |
| Coulomb's law | F = k Q₁ Q₂ / r² |
| Electric field | E = F / q = k Q / r²; unit N/C |
| Electric potential | V = W / q = k Q / r; 1 V = 1 J/C |
| Current | I = Q / t; unit ampere |
| Ohm's law | V = I R at constant temperature |
| Resistance | R = ρ L / A; resistivity ρ is a property of the material |
| Current density | J = I / A = σ E |
| Nerve conduction | Resting −70 mV; Na⁺ in for depolarization, K⁺ out for repolarization |
| Magnetism | F = q v B sin θ; 1 T = 10⁴ G |
| MRI | Strong magnet + radio waves; no ionizing radiation |
| Biomagnetism | MEG for the brain, MCG for the heart |

---

## 2. Electric charge

- There are **two types of charge**, **positive** and **negative**. **Like charges repel; opposite charges attract.**
- Charge is **conserved**: it cannot be created or destroyed, only moved from one body to another.
- The SI unit of charge is the **coulomb (C)**. Small charges are given in **microcoulombs**: 1 μC = 10⁻⁶ C.
- Charge is **quantized**: every charge is a whole number of electron charges:

```
Q = n e,   n = any whole number,   e = 1.602 × 10⁻¹⁹ C
```

- A body that **gains electrons** becomes **negative**; a body that **loses electrons** becomes **positive**.

### Worked examples

**Two million electrons are transferred to a body.**

```
Q = n e = 2 × 10⁶ × 1.602 × 10⁻¹⁹ = 3.204 × 10⁻¹³ C   ← negative
```

**One billion electrons are removed from a body.**

```
Q = 10⁹ × 1.602 × 10⁻¹⁹ = 1.602 × 10⁻¹⁰ C   ← positive, because electrons left
```

---

## 3. Coulomb's law

The electric force between two point charges is **directly proportional to the product of the charges** and **inversely proportional to the square of the distance** between them:

```
F = k Q₁ Q₂ / r²
k = 8.998 × 10⁹ N·m²/C²   ← in air; use 9 × 10⁹
```

<div class="optics-diagram" role="img" aria-label="Like charges repel and opposite charges attract">
<svg viewBox="0 0 640 240" xmlns="http://www.w3.org/2000/svg" width="100%" style="height:auto;display:block;max-width:640px;margin:0.6rem auto">
<circle cx="200" cy="40" r="18" fill="rgba(var(--accent-0-rgb),0.35)" stroke="var(--accent-0)" stroke-width="2"/><text x="200" y="46" text-anchor="middle" fill="var(--accent-0)" font-family="Outfit,sans-serif" font-size="18" font-weight="700">+</text><circle cx="330" cy="40" r="18" fill="rgba(var(--accent-0-rgb),0.35)" stroke="var(--accent-0)" stroke-width="2"/><text x="330" y="46" text-anchor="middle" fill="var(--accent-0)" font-family="Outfit,sans-serif" font-size="18" font-weight="700">+</text><line x1="178" y1="40" x2="138" y2="40" stroke="var(--col-text-main)" stroke-width="2.5"/><polygon points="133.2,40 142.8,36.4 142.8,43.6" fill="var(--col-text-main)"/><line x1="352" y1="40" x2="392" y2="40" stroke="var(--col-text-main)" stroke-width="2.5"/><polygon points="396.8,40 387.2,43.6 387.2,36.4" fill="var(--col-text-main)"/><text x="420" y="45" text-anchor="start" fill="var(--accent-1)" font-family="Outfit,sans-serif" font-size="12.5" font-weight="600">like charges repel</text><circle cx="200" cy="102" r="18" fill="rgba(var(--accent-4-rgb),0.35)" stroke="var(--accent-4)" stroke-width="2"/><text x="200" y="108" text-anchor="middle" fill="var(--accent-4)" font-family="Outfit,sans-serif" font-size="18" font-weight="700">−</text><circle cx="330" cy="102" r="18" fill="rgba(var(--accent-4-rgb),0.35)" stroke="var(--accent-4)" stroke-width="2"/><text x="330" y="108" text-anchor="middle" fill="var(--accent-4)" font-family="Outfit,sans-serif" font-size="18" font-weight="700">−</text><line x1="178" y1="102" x2="138" y2="102" stroke="var(--col-text-main)" stroke-width="2.5"/><polygon points="133.2,102 142.8,98.4 142.8,105.6" fill="var(--col-text-main)"/><line x1="352" y1="102" x2="392" y2="102" stroke="var(--col-text-main)" stroke-width="2.5"/><polygon points="396.8,102 387.2,105.6 387.2,98.4" fill="var(--col-text-main)"/><text x="420" y="107" text-anchor="start" fill="var(--accent-1)" font-family="Outfit,sans-serif" font-size="12.5" font-weight="600">like charges repel</text><circle cx="200" cy="164" r="18" fill="rgba(var(--accent-0-rgb),0.35)" stroke="var(--accent-0)" stroke-width="2"/><text x="200" y="170" text-anchor="middle" fill="var(--accent-0)" font-family="Outfit,sans-serif" font-size="18" font-weight="700">+</text><circle cx="330" cy="164" r="18" fill="rgba(var(--accent-4-rgb),0.35)" stroke="var(--accent-4)" stroke-width="2"/><text x="330" y="170" text-anchor="middle" fill="var(--accent-4)" font-family="Outfit,sans-serif" font-size="18" font-weight="700">−</text><line x1="222" y1="164" x2="252" y2="164" stroke="var(--col-text-main)" stroke-width="2.5"/><polygon points="256.8,164 247.2,167.6 247.2,160.4" fill="var(--col-text-main)"/><line x1="308" y1="164" x2="278" y2="164" stroke="var(--col-text-main)" stroke-width="2.5"/><polygon points="273.2,164 282.8,160.4 282.8,167.6" fill="var(--col-text-main)"/><text x="420" y="169" text-anchor="start" fill="var(--accent-2)" font-family="Outfit,sans-serif" font-size="12.5" font-weight="600">opposite charges attract</text><text x="320" y="226" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="13" font-weight="700">F = k Q₁ Q₂ / r²,   k ≈ 9 × 10⁹ N·m²/C²</text>
</svg>
</div>

Because of the **r²**, **doubling the distance** makes the force **one quarter** as large; tripling it makes it one ninth.

<div class="optics-diagram" role="img" aria-label="Coulomb force falls with the square of the distance">
<svg viewBox="0 0 640 262" xmlns="http://www.w3.org/2000/svg" width="100%" style="height:auto;display:block;max-width:640px;margin:0.6rem auto">
<line x1="90" y1="210" x2="550" y2="210" stroke="var(--col-text-main)" stroke-width="1.4"/><line x1="90" y1="210" x2="90" y2="30" stroke="var(--col-text-main)" stroke-width="1.4"/><text x="310" y="250" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="11">distance r</text><text x="84" y="26" text-anchor="start" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="11">force F</text><path d="M200.0,50.0 L202.8,57.7 L205.5,64.9 L208.2,71.5 L211.0,77.8 L213.8,83.6 L216.5,89.0 L219.2,94.1 L222.0,98.9 L224.8,103.4 L227.5,107.6 L230.2,111.6 L233.0,115.3 L235.8,118.9 L238.5,122.2 L241.2,125.4 L244.0,128.4 L246.8,131.2 L249.5,133.9 L252.2,136.5 L255.0,138.9 L257.8,141.2 L260.5,143.4 L263.2,145.5 L266.0,147.5 L268.8,149.4 L271.5,151.2 L274.2,153.0 L277.0,154.6 L279.8,156.2 L282.5,157.8 L285.2,159.2 L288.0,160.6 L290.8,162.0 L293.5,163.3 L296.2,164.5 L299.0,165.7 L301.8,166.8 L304.5,167.9 L307.2,169.0 L310.0,170.0 L312.8,171.0 L315.5,171.9 L318.2,172.8 L321.0,173.7 L323.8,174.6 L326.5,175.4 L329.2,176.2 L332.0,176.9 L334.8,177.7 L337.5,178.4 L340.2,179.1 L343.0,179.8 L345.8,180.4 L348.5,181.0 L351.2,181.6 L354.0,182.2 L356.8,182.8 L359.5,183.3 L362.2,183.9 L365.0,184.4 L367.8,184.9 L370.5,185.4 L373.2,185.9 L376.0,186.3 L378.8,186.8 L381.5,187.2 L384.2,187.6 L387.0,188.1 L389.8,188.5 L392.5,188.8 L395.2,189.2 L398.0,189.6 L400.8,190.0 L403.5,190.3 L406.2,190.6 L409.0,191.0 L411.8,191.3 L414.5,191.6 L417.2,191.9 L420.0,192.2 L422.8,192.5 L425.5,192.8 L428.2,193.1 L431.0,193.4 L433.8,193.6 L436.5,193.9 L439.2,194.1 L442.0,194.4 L444.8,194.6 L447.5,194.9 L450.2,195.1 L453.0,195.3 L455.8,195.5 L458.5,195.7 L461.2,196.0 L464.0,196.2 L466.8,196.4 L469.5,196.6 L472.2,196.8 L475.0,196.9 L477.8,197.1 L480.5,197.3 L483.2,197.5 L486.0,197.7 L488.8,197.8 L491.5,198.0 L494.2,198.2 L497.0,198.3 L499.8,198.5 L502.5,198.6 L505.2,198.8 L508.0,198.9 L510.8,199.1 L513.5,199.2 L516.2,199.3 L519.0,199.5 L521.8,199.6 L524.5,199.7 L527.2,199.9 L530.0,200.0" fill="none" stroke="var(--accent-0)" stroke-width="3"/><circle cx="200" cy="50" r="5" fill="var(--accent-0)"/><line x1="200" y1="50" x2="200" y2="210" stroke="var(--col-text-muted)" stroke-width="1" stroke-dasharray="3 3"/><text x="210" y="42" text-anchor="start" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12" font-weight="600">F</text><text x="200" y="228" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="11">r</text><circle cx="310" cy="170" r="5" fill="var(--accent-0)"/><line x1="310" y1="170" x2="310" y2="210" stroke="var(--col-text-muted)" stroke-width="1" stroke-dasharray="3 3"/><text x="320" y="162" text-anchor="start" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12" font-weight="600">F / 4</text><text x="310" y="228" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="11">2r</text><circle cx="420" cy="192.2" r="5" fill="var(--accent-0)"/><line x1="420" y1="192.2" x2="420" y2="210" stroke="var(--col-text-muted)" stroke-width="1" stroke-dasharray="3 3"/><text x="430" y="184.2" text-anchor="start" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12" font-weight="600">F / 9</text><text x="420" y="228" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="11">3r</text><text x="332" y="98" text-anchor="start" fill="var(--accent-0)" font-family="Outfit,sans-serif" font-size="12">double the distance → ¼ of the force</text>
</svg>
</div>

### Worked examples

**−3 μC and +6 μC, 50 cm apart in air. Find the force.**

```
F = 9 × 10⁹ × (3 × 10⁻⁶)(6 × 10⁻⁶) / (0.5)²
F = 9 × 10⁹ × 18 × 10⁻¹² / 0.25 = 0.648 N   ← attractive
```

**30 μC and 90 μC feel a force of 1.8 N. How far apart are they?**

```
r² = k Q₁ Q₂ / F = 9 × 10⁹ × (30 × 10⁻⁶)(90 × 10⁻⁶) / 1.8
r² = 24.3 / 1.8 = 13.5   →   r ≈ 3.67 m
```

---

## 4. The electric field

- The **electric field E** at a point is the **force on a small positive test charge divided by that charge**:

```
E = F / q   ← unit: newton per coulomb, N/C
E = k Q / r²   ← field of a point charge Q
F = q E   ← force on a charge q placed in a field
```

- **Field lines** point the way a positive charge would be pushed: **away from positive** charges and **toward negative** charges. Around a **negatively charged sphere** the lines **come inward from every direction**.

<div class="optics-diagram" role="img" aria-label="Electric field lines leave a positive charge and enter a negative charge">
<svg viewBox="0 0 640 250" xmlns="http://www.w3.org/2000/svg" width="100%" style="height:auto;display:block;max-width:640px;margin:0.6rem auto">
<line x1="196" y1="120" x2="260" y2="120" stroke="var(--accent-0)" stroke-width="1.8"/><polygon points="242.2,120 233.8,123.2 233.8,116.8" fill="var(--accent-0)"/><line x1="192.5" y1="133" x2="247.9" y2="165" stroke="var(--accent-0)" stroke-width="1.8"/><polygon points="232.5,156.1 223.7,154.6 226.8,149.2" fill="var(--accent-0)"/><line x1="183" y1="142.5" x2="215" y2="197.9" stroke="var(--accent-0)" stroke-width="1.8"/><polygon points="206.1,182.5 199.2,176.8 204.6,173.7" fill="var(--accent-0)"/><line x1="170" y1="146" x2="170" y2="210" stroke="var(--accent-0)" stroke-width="1.8"/><polygon points="170,192.2 166.8,183.8 173.2,183.8" fill="var(--accent-0)"/><line x1="157" y1="142.5" x2="125" y2="197.9" stroke="var(--accent-0)" stroke-width="1.8"/><polygon points="133.9,182.5 135.4,173.7 140.8,176.8" fill="var(--accent-0)"/><line x1="147.5" y1="133" x2="92.1" y2="165" stroke="var(--accent-0)" stroke-width="1.8"/><polygon points="107.5,156.1 113.2,149.2 116.3,154.6" fill="var(--accent-0)"/><line x1="144" y1="120" x2="80" y2="120" stroke="var(--accent-0)" stroke-width="1.8"/><polygon points="97.8,120 106.2,116.9 106.2,123.2" fill="var(--accent-0)"/><line x1="147.5" y1="107" x2="92.1" y2="75" stroke="var(--accent-0)" stroke-width="1.8"/><polygon points="107.5,83.9 116.3,85.4 113.2,90.8" fill="var(--accent-0)"/><line x1="157" y1="97.5" x2="125" y2="42.1" stroke="var(--accent-0)" stroke-width="1.8"/><polygon points="133.9,57.5 140.8,63.2 135.4,66.3" fill="var(--accent-0)"/><line x1="170" y1="94" x2="170" y2="30" stroke="var(--accent-0)" stroke-width="1.8"/><polygon points="170,47.8 173.2,56.2 166.8,56.2" fill="var(--accent-0)"/><line x1="183" y1="97.5" x2="215" y2="42.1" stroke="var(--accent-0)" stroke-width="1.8"/><polygon points="206.1,57.5 204.6,66.3 199.2,63.2" fill="var(--accent-0)"/><line x1="192.5" y1="107" x2="247.9" y2="75" stroke="var(--accent-0)" stroke-width="1.8"/><polygon points="232.5,83.9 226.8,90.8 223.7,85.4" fill="var(--accent-0)"/><circle cx="170" cy="120" r="22" fill="rgba(var(--accent-0-rgb),0.35)" stroke="var(--accent-0)" stroke-width="2"/><text x="170" y="126" text-anchor="middle" fill="var(--accent-0)" font-family="Outfit,sans-serif" font-size="18" font-weight="700">+</text><line x1="560" y1="120" x2="496" y2="120" stroke="var(--accent-4)" stroke-width="1.8"/><polygon points="513.8,120 522.2,116.8 522.2,123.2" fill="var(--accent-4)"/><line x1="547.9" y1="165" x2="492.5" y2="133" stroke="var(--accent-4)" stroke-width="1.8"/><polygon points="507.9,141.9 516.8,143.4 513.6,148.8" fill="var(--accent-4)"/><line x1="515" y1="197.9" x2="483" y2="142.5" stroke="var(--accent-4)" stroke-width="1.8"/><polygon points="491.9,157.9 498.8,163.6 493.4,166.8" fill="var(--accent-4)"/><line x1="470" y1="210" x2="470" y2="146" stroke="var(--accent-4)" stroke-width="1.8"/><polygon points="470,163.8 473.1,172.2 466.9,172.2" fill="var(--accent-4)"/><line x1="425" y1="197.9" x2="457" y2="142.5" stroke="var(--accent-4)" stroke-width="1.8"/><polygon points="448.1,157.9 446.6,166.8 441.2,163.6" fill="var(--accent-4)"/><line x1="392.1" y1="165" x2="447.5" y2="133" stroke="var(--accent-4)" stroke-width="1.8"/><polygon points="432.1,141.9 426.4,148.8 423.2,143.4" fill="var(--accent-4)"/><line x1="380" y1="120" x2="444" y2="120" stroke="var(--accent-4)" stroke-width="1.8"/><polygon points="426.2,120 417.8,123.2 417.8,116.8" fill="var(--accent-4)"/><line x1="392.1" y1="75" x2="447.5" y2="107" stroke="var(--accent-4)" stroke-width="1.8"/><polygon points="432.1,98.1 423.2,96.6 426.4,91.2" fill="var(--accent-4)"/><line x1="425" y1="42.1" x2="457" y2="97.5" stroke="var(--accent-4)" stroke-width="1.8"/><polygon points="448.1,82.1 441.2,76.4 446.6,73.2" fill="var(--accent-4)"/><line x1="470" y1="30" x2="470" y2="94" stroke="var(--accent-4)" stroke-width="1.8"/><polygon points="470,76.2 466.9,67.8 473.1,67.8" fill="var(--accent-4)"/><line x1="515" y1="42.1" x2="483" y2="97.5" stroke="var(--accent-4)" stroke-width="1.8"/><polygon points="491.9,82.1 493.4,73.2 498.8,76.4" fill="var(--accent-4)"/><line x1="547.9" y1="75" x2="492.5" y2="107" stroke="var(--accent-4)" stroke-width="1.8"/><polygon points="507.9,98.1 513.6,91.2 516.8,96.6" fill="var(--accent-4)"/><circle cx="470" cy="120" r="22" fill="rgba(var(--accent-4-rgb),0.35)" stroke="var(--accent-4)" stroke-width="2"/><text x="470" y="126" text-anchor="middle" fill="var(--accent-4)" font-family="Outfit,sans-serif" font-size="18" font-weight="700">−</text><text x="170" y="236" text-anchor="middle" fill="var(--accent-0)" font-family="Outfit,sans-serif" font-size="12" font-weight="600">positive: lines point outward</text><text x="470" y="236" text-anchor="middle" fill="var(--accent-4)" font-family="Outfit,sans-serif" font-size="12" font-weight="600">negative: lines point inward</text>
</svg>
</div>

### Worked example

**A charge of +5 × 10⁻⁶ C sits in a field of 4 × 10⁵ N/C.**

```
F = q E = 5 × 10⁻⁶ × 4 × 10⁵ = 2.0 N
```

---

## 5. Electric potential

- The **electric potential V** at a point is the **work per unit charge** needed to bring a positive test charge **from infinity to that point**:

```
V = W / q = U / q   ← unit: volt
1 V = 1 J/C
V = k Q / r = Q / (4π ε₀ r)   ← potential of a point charge
```

- **How V = k Q / r is linked to the field:** multiply the field by the distance. Since W = F × r, V = E × r = k Q / r. This is a short-cut; it gives the right answer for a point charge, which strictly needs calculus.
- A potential difference of 550 V means **550 J for every coulomb** that moves. A high voltage is dangerous because of the **charge and energy** it can drive through the body.

### Worked examples

**10 V between two points; 2 × 10⁻² J of work moves a charge. Find the charge.**

```
q = W / V = 2 × 10⁻² / 10 = 2 × 10⁻³ C
```

**10 V; move 2 × 10⁻³ C. Find the work.**

```
W = q V = 2 × 10⁻³ × 10 = 2 × 10⁻² J
In electron-volts: 0.02 / 1.6 × 10⁻¹⁹ = 1.25 × 10¹⁷ eV
```

---

## 6. Electric current and Ohm's law

- **Electric current** is the **rate of flow of charge** through a conductor:

```
I = dq / dt = Q / t   ← unit: ampere, 1 A = 1 C/s
```

Example: **100 C** passing a point in **1 s** gives **I = 100 A**.

- **Ohm's law:** at **constant temperature**, the current through a conductor is **directly proportional to the potential difference** across it:

```
V = I R   ← R = resistance, unit ohm: 1 Ω = 1 V/A
```

### Worked examples

**2 mA flows when a wire is connected to a 5 V battery.**

```
R = V / I = 5 / (2 × 10⁻³) = 2500 Ω
```

**A 100 Ω wire is connected to a 5.5 V battery.**

```
I = V / R = 5.5 / 100 = 0.055 A = 55 mA
```

---

## 7. Resistance and resistivity

- The **resistance** of a wire is **proportional to its length L** and **inversely proportional to its cross-section area A**:

```
R = ρ L / A        ρ = R A / L
```

- **ρ (rho)** is the **resistivity**: the **resistance of a unit cube of the material measured between opposite faces**. Its SI unit is the **ohm-metre (Ω·m)**.
- **Resistance** depends on the **size and shape** of the object, and on temperature. **Resistivity** is a **property of the material itself**.
- Example: a **copper** wire and an **iron** wire of the **same length and area** pass **different currents** at the same voltage, because their **resistivities** differ.

<div class="optics-diagram" role="img" aria-label="Resistance of a wire grows with length and falls with cross-section area">
<svg viewBox="0 0 640 244" xmlns="http://www.w3.org/2000/svg" width="100%" style="height:auto;display:block;max-width:640px;margin:0.6rem auto">
<rect x="120" y="70" width="380" height="60" fill="rgba(var(--accent-1-rgb),0.3)" stroke="var(--accent-1)" stroke-width="2"/><ellipse cx="120" cy="100" rx="14" ry="30" fill="rgba(var(--accent-1-rgb),0.55)" stroke="var(--accent-1)" stroke-width="2"/><ellipse cx="500" cy="100" rx="14" ry="30" fill="rgba(var(--accent-1-rgb),0.2)" stroke="var(--accent-1)" stroke-width="2"/><text x="120" y="58" text-anchor="middle" fill="var(--accent-1)" font-family="Outfit,sans-serif" font-size="12" font-weight="600">area A</text><line x1="120" y1="150" x2="500" y2="150" stroke="var(--col-text-main)" stroke-width="1.4"/><polygon points="504.8,150 495.2,153.6 495.2,146.4" fill="var(--col-text-main)"/><polygon points="115.2,150 124.8,146.4 124.8,153.6" fill="var(--col-text-main)"/><text x="310" y="168" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12">length L</text><line x1="30" y1="100" x2="100" y2="100" stroke="var(--accent-0)" stroke-width="2.5"/><polygon points="104.8,100 95.2,103.6 95.2,96.4" fill="var(--accent-0)"/><text x="30" y="90" text-anchor="start" fill="var(--accent-0)" font-family="Outfit,sans-serif" font-size="12" font-weight="600">current I</text><text x="310" y="206" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="15" font-weight="700">R = ρ L / A</text><text x="310" y="230" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="11.5">longer wire → more R;  thicker wire → less R;  ρ depends only on the material</text>
</svg>
</div>

### Worked examples

**A wire 20 m long, area 5 × 10⁻⁶ m², resistance 30 Ω. Find ρ.**

```
ρ = R A / L = 30 × 5 × 10⁻⁶ / 20 = 7.5 × 10⁻⁶ Ω·m
```

**A tungsten filament: ρ = 6.0 × 10⁻⁸ Ω·m, L = 0.1 m, R = 20 Ω. Find the area.**

```
A = ρ L / R = 6.0 × 10⁻⁸ × 0.1 / 20 = 3 × 10⁻¹⁰ m²
```

---

## 8. Current density

- **Current density J** is the **current per unit area of cross-section**:

```
J = I / A   ← unit: A/m²
J = σ E   ← σ = conductivity = 1/ρ
E = V / L   ← field along a wire of length L
ρ = E / J
```

---

## 9. Nerve conduction

### The neuron

- A **neuron**, or nerve cell, has a **cell body**, **dendrites**, an **axon** and **synapses**.
- Signals are **received by the dendrites**, **carried along the axon**, and **passed on at the synapse** to the next cell.
- Many axons are wrapped in a fatty **myelin sheath** with small gaps called **nodes of Ranvier**. The signal jumps from node to node, so **myelin speeds up the transmission** of the action potential.

<div class="optics-diagram" role="img" aria-label="A neuron: dendrites, cell body, myelinated axon and synapse">
<svg viewBox="0 0 640 236" xmlns="http://www.w3.org/2000/svg" width="100%" style="height:auto;display:block;max-width:640px;margin:0.6rem auto">
<path d="M110,110 Q78.1,85.8 44.2,86.1" fill="none" stroke="var(--accent-3)" stroke-width="2.5"/><path d="M110,110 Q104.6,70.4 80.4,46.6" fill="none" stroke="var(--accent-3)" stroke-width="2.5"/><path d="M110,110 Q141.9,134.2 175.8,133.9" fill="none" stroke="var(--accent-3)" stroke-width="2.5"/><path d="M110,110 Q115.4,149.6 139.6,173.4" fill="none" stroke="var(--accent-3)" stroke-width="2.5"/><path d="M110,110 Q85.8,141.9 86.1,175.8" fill="none" stroke="var(--accent-3)" stroke-width="2.5"/><path d="M110,110 Q70.4,115.4 46.6,139.6" fill="none" stroke="var(--accent-3)" stroke-width="2.5"/><circle cx="110" cy="110" r="28" fill="rgba(var(--accent-3-rgb),0.4)" stroke="var(--accent-3)" stroke-width="2"/><circle cx="110" cy="110" r="7" fill="var(--accent-3)"/><line x1="138" y1="110" x2="560" y2="110" stroke="var(--accent-3)" stroke-width="3"/><rect x="170" y="98" width="54" height="24" rx="12" fill="rgba(var(--accent-4-rgb),0.4)" stroke="var(--accent-4)" stroke-width="1.6"/><rect x="240" y="98" width="54" height="24" rx="12" fill="rgba(var(--accent-4-rgb),0.4)" stroke="var(--accent-4)" stroke-width="1.6"/><rect x="310" y="98" width="54" height="24" rx="12" fill="rgba(var(--accent-4-rgb),0.4)" stroke="var(--accent-4)" stroke-width="1.6"/><rect x="380" y="98" width="54" height="24" rx="12" fill="rgba(var(--accent-4-rgb),0.4)" stroke="var(--accent-4)" stroke-width="1.6"/><rect x="450" y="98" width="54" height="24" rx="12" fill="rgba(var(--accent-4-rgb),0.4)" stroke="var(--accent-4)" stroke-width="1.6"/><line x1="560" y1="110" x2="590" y2="90" stroke="var(--accent-3)" stroke-width="2.5"/><circle cx="592" cy="90" r="5" fill="var(--accent-3)"/><line x1="560" y1="110" x2="590" y2="110" stroke="var(--accent-3)" stroke-width="2.5"/><circle cx="592" cy="110" r="5" fill="var(--accent-3)"/><line x1="560" y1="110" x2="590" y2="130" stroke="var(--accent-3)" stroke-width="2.5"/><circle cx="592" cy="130" r="5" fill="var(--accent-3)"/><text x="60" y="28" text-anchor="start" fill="var(--accent-3)" font-family="Outfit,sans-serif" font-size="11.5">dendrites: receive</text><text x="60" y="206" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="11.5">cell body</text><text x="330" y="82" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="11.5">axon: carries the signal</text><text x="407" y="142" text-anchor="middle" fill="var(--accent-4)" font-family="Outfit,sans-serif" font-size="11.5">myelin sheath</text><line x1="232" y1="112" x2="232" y2="160" stroke="var(--col-text-muted)" stroke-width="1" stroke-dasharray="2 2"/><text x="238" y="170" text-anchor="start" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="11">node of Ranvier: gap</text><text x="590" y="160" text-anchor="end" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="11.5">synapse</text><line x1="200" y1="200" x2="480" y2="200" stroke="var(--accent-0)" stroke-width="2.5"/><polygon points="484.8,200 475.2,203.6 475.2,196.4" fill="var(--accent-0)"/><text x="340" y="222" text-anchor="middle" fill="var(--accent-0)" font-family="Outfit,sans-serif" font-size="11.5">direction of the nerve impulse</text>
</svg>
</div>

### The resting potential

- At rest the inside of the cell is **negative**: the **resting potential is about −70 mV**. Values near −75 mV are also quoted, but −70 mV is the usual value.
- It comes from **ionic concentration differences** and the membrane being **selectively permeable, mainly to K⁺**. There is more **K⁺ and Cl⁻ inside** and more **Na⁺ outside**.
- The **sodium–potassium pump** pushes **Na⁺ out** and **K⁺ in**, keeping these differences.

### Gated channels

The membrane has **three types of gated channels**:

| Channel | Opens when |
|---|---|
| **Chemical gated** | A **chemical**, a neurotransmitter, **binds** to it |
| **Mechanical gated** | The membrane is **stretched or pressed** |
| **Voltage gated** | The **membrane voltage changes** |

### The action potential, step by step

| Phase | What happens |
|---|---|
| **Resting** | About **−70 mV**; the cell is ready |
| **Graded potential** | A stimulus lets a little **Na⁺ in**; the potential rises toward the threshold of about −55 to −60 mV |
| **Depolarization** | Voltage-gated **Na⁺ channels open**, **Na⁺ rushes in**, the inside becomes positive, about +30 mV |
| **Repolarization** | **Na⁺ channels close** and **K⁺ moves out**; the potential falls again |
| **Hyperpolarization** | **K⁺ channels stay open longer**, so extra K⁺ leaves; the potential dips **below −70 mV** |
| **Refractory period** | A short time when a new stimulus **cannot** fire the cell, the **absolute** period, or must be **much stronger**, the **relative** period |

<div class="optics-diagram" role="img" aria-label="Action potential: resting, depolarization, repolarization, hyperpolarization">
<svg viewBox="0 0 640 300" xmlns="http://www.w3.org/2000/svg" width="100%" style="height:auto;display:block;max-width:640px;margin:0.6rem auto">
<line x1="80" y1="50" x2="80" y2="274" stroke="var(--col-text-main)" stroke-width="1.3"/><line x1="80" y1="274" x2="580" y2="274" stroke="var(--col-text-main)" stroke-width="1.3"/><line x1="76" y1="76" x2="580" y2="76" stroke="var(--col-text-muted)" stroke-width="0.8" stroke-dasharray="3 4"/><text x="72" y="80" text-anchor="end" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="10.5">30</text><line x1="76" y1="124" x2="580" y2="124" stroke="var(--col-text-muted)" stroke-width="0.8" stroke-dasharray="3 4"/><text x="72" y="128" text-anchor="end" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="10.5">0</text><line x1="76" y1="212" x2="580" y2="212" stroke="var(--col-text-muted)" stroke-width="0.8" stroke-dasharray="3 4"/><text x="72" y="216" text-anchor="end" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="10.5">-55</text><line x1="76" y1="236" x2="580" y2="236" stroke="var(--col-text-muted)" stroke-width="0.8" stroke-dasharray="3 4"/><text x="72" y="240" text-anchor="end" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="10.5">-70</text><line x1="76" y1="268" x2="580" y2="268" stroke="var(--col-text-muted)" stroke-width="0.8" stroke-dasharray="3 4"/><text x="72" y="272" text-anchor="end" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="10.5">-90</text><text x="72" y="46" text-anchor="end" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="10.5">mV</text><text x="580" y="290" text-anchor="end" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="10.5">time, ms</text><path d="M80,236.0 L140,236.0 L165,223.2 L185,212.0 L205,124.0 L220,76.0 L240,124.0 L265,212.0 L285,252.0 L320,260.0 L380,244.0 L420,236.0 L580,236.0" fill="none" stroke="var(--accent-0)" stroke-width="3"/><text x="100" y="228" text-anchor="start" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="11">resting −70</text><text x="196" y="100" text-anchor="end" fill="var(--accent-1)" font-family="Outfit,sans-serif" font-size="11">depolarization: Na⁺ in</text><text x="250" y="100" text-anchor="start" fill="var(--accent-4)" font-family="Outfit,sans-serif" font-size="11">repolarization: K⁺ out</text><text x="410" y="255.2" text-anchor="start" fill="var(--accent-5)" font-family="Outfit,sans-serif" font-size="11">hyperpolarization: below −70</text><text x="191" y="228" text-anchor="start" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="10.5">threshold −55</text><line x1="205" y1="58" x2="380" y2="58" stroke="var(--accent-6)" stroke-width="1.5"/><text x="292" y="52" text-anchor="middle" fill="var(--accent-6)" font-family="Outfit,sans-serif" font-size="11">refractory period</text>
</svg>
</div>

---

## 10. Magnetism

- A **moving charge** produces **both an electric field and a magnetic field**. The spinning electron makes each atom a tiny magnet.
- A charge **q** moving with velocity **v** through a magnetic field **B** feels a force:

```
F = q v B sin θ   ← θ = angle between v and B
B = F / (q v)   ← when v is perpendicular to B
```

- The force is **perpendicular to the velocity** and **perpendicular to the field**. It is largest when v ⟂ B and zero when v is parallel to B.
- The SI unit of B is the **tesla**: **1 T = 1 N/(A·m)**, one newton per ampere-metre. **1 T = 10⁴ gauss (G)**.

<div class="optics-diagram" role="img" aria-label="Magnetic force on a moving positive charge is perpendicular to both v and B">
<svg viewBox="0 0 640 262" xmlns="http://www.w3.org/2000/svg" width="100%" style="height:auto;display:block;max-width:640px;margin:0.6rem auto">
<text x="100" y="30" text-anchor="start" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="11">magnetic field B into the page</text><text x="70" y="70" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="14">×</text><text x="70" y="120" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="14">×</text><text x="70" y="170" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="14">×</text><text x="70" y="220" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="14">×</text><text x="160" y="170" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="14">×</text><text x="160" y="220" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="14">×</text><text x="250" y="170" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="14">×</text><text x="250" y="220" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="14">×</text><text x="340" y="70" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="14">×</text><text x="340" y="120" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="14">×</text><text x="340" y="170" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="14">×</text><text x="340" y="220" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="14">×</text><text x="430" y="70" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="14">×</text><text x="430" y="120" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="14">×</text><text x="430" y="170" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="14">×</text><text x="430" y="220" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="14">×</text><text x="520" y="70" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="14">×</text><text x="520" y="120" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="14">×</text><text x="520" y="170" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="14">×</text><text x="520" y="220" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="14">×</text><circle cx="220" cy="150" r="16" fill="rgba(var(--accent-0-rgb),0.35)" stroke="var(--accent-0)" stroke-width="2"/><text x="220" y="156" text-anchor="middle" fill="var(--accent-0)" font-family="Outfit,sans-serif" font-size="18" font-weight="700">+</text><line x1="240" y1="150" x2="380" y2="150" stroke="var(--accent-2)" stroke-width="3"/><polygon points="384.8,150 375.2,153.6 375.2,146.4" fill="var(--accent-2)"/><text x="390" y="155" text-anchor="start" fill="var(--accent-2)" font-family="Outfit,sans-serif" font-size="12" font-weight="600">velocity v</text><line x1="220" y1="130" x2="220" y2="60" stroke="var(--accent-0)" stroke-width="3"/><polygon points="220,55.2 223.6,64.8 216.4,64.8" fill="var(--accent-0)"/><text x="230" y="72" text-anchor="start" fill="var(--accent-0)" font-family="Outfit,sans-serif" font-size="12" font-weight="600">force F</text><text x="320" y="250" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12">F = q v B sin θ;  F ⟂ v and F ⟂ B;  1 T = 1 N/(A·m) = 10⁴ G</text>
</svg>
</div>

---

## 11. MRI: magnetic resonance imaging

- Magnetic resonance imaging, **MRI**, uses a **strong magnetic field and radio waves** to make detailed pictures of the inside of the body.
- **How it works:** the strong field **lines up the hydrogen nuclei**, which are protons, in the body's water; **radio waves** knock them out of line; as they **relax back** they give off **signals**; a computer turns the signals into **images**.
- **Field strength:** usually **1.5 T to 3 T**. Compare the **Earth's field**, about 50 μT, and a **fridge magnet**, about 0.005 T.
- **Advantages:** **no ionizing radiation**, and **excellent soft-tissue contrast**: brain, spinal cord, muscles, joints.
- **Safety:** **no metal objects** in the MRI room. The strong field **pulls them in with great force**.

<div class="optics-diagram" role="img" aria-label="How MRI makes an image in four steps">
<svg viewBox="0 0 640 216" xmlns="http://www.w3.org/2000/svg" width="100%" style="height:auto;display:block;max-width:640px;margin:0.6rem auto">
<rect x="20" y="50" width="140" height="90" rx="10" fill="rgba(var(--accent-2-rgb),0.3)" stroke="var(--accent-2)" stroke-width="1.8"/><text x="90" y="86" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12.5" font-weight="700">1. strong magnet</text><text x="90" y="112" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="11">hydrogen nuclei line up</text><line x1="162" y1="95" x2="173" y2="95" stroke="var(--col-text-muted)" stroke-width="2"/><polygon points="177.8,95 168.2,98.6 168.2,91.4" fill="var(--col-text-muted)"/><rect x="175" y="50" width="140" height="90" rx="10" fill="rgba(var(--accent-6-rgb),0.3)" stroke="var(--accent-6)" stroke-width="1.8"/><text x="245" y="86" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12.5" font-weight="700">2. radio waves</text><text x="245" y="112" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="11">knock them out of line</text><line x1="317" y1="95" x2="328" y2="95" stroke="var(--col-text-muted)" stroke-width="2"/><polygon points="332.8,95 323.2,98.6 323.2,91.4" fill="var(--col-text-muted)"/><rect x="330" y="50" width="140" height="90" rx="10" fill="rgba(var(--accent-3-rgb),0.3)" stroke="var(--accent-3)" stroke-width="1.8"/><text x="400" y="86" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12.5" font-weight="700">3. nuclei relax</text><text x="400" y="112" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="11">they give off signals</text><line x1="472" y1="95" x2="483" y2="95" stroke="var(--col-text-muted)" stroke-width="2"/><polygon points="487.8,95 478.2,98.6 478.2,91.4" fill="var(--col-text-muted)"/><rect x="485" y="50" width="140" height="90" rx="10" fill="rgba(var(--accent-4-rgb),0.3)" stroke="var(--accent-4)" stroke-width="1.8"/><text x="555" y="86" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12.5" font-weight="700">4. computer</text><text x="555" y="112" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="11">turns signals into images</text><text x="320" y="178" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12">field 1.5–3 T · Earth ≈ 50 μT · fridge magnet ≈ 0.005 T</text><text x="320" y="202" text-anchor="middle" fill="var(--accent-0)" font-family="Outfit,sans-serif" font-size="12">no ionizing radiation · great soft-tissue contrast · no metal in the room</text>
</svg>
</div>

---

## 12. Biomagnetism

- **Biomagnetism:** the body makes **weak magnetic fields** because of the **electrical activity of its organs**.
- **Magnetoencephalography (MEG)** measures the fields of the **brain**; **magnetocardiography (MCG)** measures those of the **heart**.
- Uses: studying **brain disorders** and **abnormal nerve activity**, and checking **heart function**.

---

## 13. Clinical / medical links

| Physics | Medicine |
|---------|----------|
| Charge and potential | ECG, EEG and nerve signals are potential differences |
| High voltage = charge and energy | Electric shock danger |
| Ohm's law, resistance | Body tissue resistance; electrode contact |
| Resting −70 mV, Na⁺ / K⁺ | How nerves and muscles fire |
| Myelin speeds conduction | Demyelinating disease, e.g. multiple sclerosis, slows signals |
| Magnetic force | MRI, and the danger of metal near the scanner |
| MRI | Brain, spinal cord, joint imaging without ionizing radiation |
| MEG / MCG | Brain and heart activity measured magnetically |

---

## 14. Formula sheet — Chapter 8

```
Charge:            Q = n e,   e = 1.602 × 10⁻¹⁹ C
Coulomb's law:     F = k Q₁ Q₂ / r²,   k ≈ 9 × 10⁹ N·m²/C²
Electric field:    E = F / q = k Q / r²   (N/C);   F = q E
Potential:         V = W / q = k Q / r   (1 V = 1 J/C);   W = q V
Current:           I = Q / t   ← 1 A = 1 C/s
Ohm's law:         V = I R   ← 1 Ω = 1 V/A
Resistance:        R = ρ L / A;   ρ = R A / L   ← Ω·m
Current density:   J = I / A = σ E;   E = V / L
Magnetic force:    F = q v B sin θ
Units:             1 T = 1 N/(A·m) = 10⁴ G;   1 eV = 1.6 × 10⁻¹⁹ J
```

### Key numbers at a glance

- e = **1.602 × 10⁻¹⁹ C**; k ≈ **9 × 10⁹ N·m²/C²**  
- Resting potential **−70 mV**; peak about **+30 mV**  
- MRI **1.5–3 T**; Earth **50 μT**; fridge magnet **0.005 T**  
- **1 T = 10⁴ G**  

### Key Points to Remember
- Like charges repel and opposite charges attract. Doubling the distance r makes the force ¼ as large.  
- Electric field lines point **away from + charges** and **toward − charges**.  
- Ohm's law: **V = I R**.  
- **Resistance** depends on the object's size and shape; **resistivity** is a property of the material.  
- In an action potential, **Na⁺ flowing in** causes depolarization and **K⁺ flowing out** causes repolarization.  
- The magnetic force on a moving charge is perpendicular to both v and B.  

### Medical Applications
- **Myelin** makes nerve signals travel faster.  
- **MRI** uses no ionizing radiation and is best for **soft tissue**; metal must be kept away from the scanner.  
- **MEG** measures the magnetic field of the brain; **MCG** measures that of the heart.  
