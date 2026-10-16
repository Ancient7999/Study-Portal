# Chapter 3 continued — Bernoulli, Viscosity & Surface Tension

---

## 1. Overview & learning map

### What this part covers

Periodic Test 1 covered the start of Chapter 3: what a fluid is, laminar and turbulent flow, mass and volume flow rate, and the equation of continuity. This part goes on from **Bernoulli's equation**: how pressure changes with speed; **viscosity**, why real fluids resist flow; **Poiseuille's law**, how much blood a vessel carries; **Laplace's law**, why big arteries feel more wall tension; the **Reynolds number**, which tells when flow turns turbulent; and **surface tension** with the **pulmonary surfactant** in the lungs. Each topic comes with its **medical applications** and **clinical cases**.

### Quick reminder from Periodic Test 1

```
Continuity: A₁ v₁ = A₂ v₂        ← smaller vessel area → higher velocity
Volume flow rate: Q = A v
Density changes:  ρ₁ A₁ v₁ = ρ₂ A₂ v₂   ← mass flow rate stays the same
```

```example
Given A₁ = 2 cm², v₁ = 0.3 m/s, A₂ = 0.5 cm²
v₂ = A₁v₁ / A₂ = 2 × 0.3 / 0.5 = 1.2 m/s
Q = A₁v₁ = 2 × 10⁻⁴ m² × 0.3 m/s = 6 × 10⁻⁵ m³/s
```

A₁v₁ = A₂v₂ holds when the density is constant, ρ₁ = ρ₂. When the density differs between the two sections, use ρ₁A₁v₁ = ρ₂A₂v₂.

### Topics map

| Topic | Core idea |
|-------|-----------|
| Bernoulli's equation | P + ½ρv² + ρgh = constant; faster → lower pressure |
| Viscosity η | Internal friction between layers; F = ηAv/y |
| Poiseuille's law | Q = πr⁴ΔP / (8ηL); flow depends on r⁴ |
| TIA | Narrow artery: v↑, P↓, Q↓ → too little blood to the brain |
| Laplace's law | T = P × r; bigger radius or pressure → more wall tension |
| Reynolds number | Re = ρvD/η; below 2000 laminar, above 2000 turbulent |
| Surface tension | T = F/L; force per unit length on the surface (N/m) |
| Pulmonary surfactant | Lowers surface tension → alveoli stay open |

**Study tip:** most questions here are "what happens if…?" questions. For each formula, know which way the answer moves when one quantity goes **up** or **down**, and which **medical example** goes with it.

---

## 2. Bernoulli's equation & its medical applications

### Why it matters

Bernoulli's equation is one of the most important principles in fluid dynamics. It links **pressure, velocity and height** in a moving fluid. In medicine it helps explain **blood flow through arteries and heart valves**, and it is the basis of diagnostic techniques such as **Doppler echocardiography**.

### Bernoulli's equation

An **ideal fluid** has **steady** flow, is **incompressible**, is **non-viscous** and moves in **streamline** flow. For an ideal fluid, the **total mechanical energy stays constant** throughout the flow:

```
P + ½ ρ v² + ρ g h = constant
P₁ + ½ ρ v₁² + ρ g h₁ = P₂ + ½ ρ v₂² + ρ g h₂
```

| Symbol | Meaning | Unit |
|---|---|---|
| P | Pressure, the pressure energy per unit volume | Pa |
| ρ | Density of the fluid | kg/m³ |
| v | Velocity of the fluid | m/s |
| g | Acceleration due to gravity (9.8) | m/s² |
| h | Height above a reference level | m |

**How Bernoulli's equation is made:** it is the sum of three energies, each **per unit volume**. Energy per unit volume has the unit J/m³, which is the same as Pa:
1. **P**: pressure energy, the push from the fluid behind.
2. **½ρv²**: kinetic energy. It is ½mv² with the mass per volume, ρ, in place of m.
3. **ρgh**: potential energy. It is mgh with ρ in place of m.
4. An ideal fluid loses no energy to friction, so the sum is the same at point 1 and point 2.

Bernoulli's equation is an **energy** statement:

```
pressure energy + kinetic energy + potential energy = constant
P₁ + ½ ρ v₁² + ρ g h₁ = P₂ + ½ ρ v₂² + ρ g h₂
```

```example
Given P₁ = 10 000 Pa, v₁ = 1 m/s, h₁ = 0, v₂ = 2 m/s, h₂ = 0.5 m, ρ = 1000 kg/m³
P₂ = P₁ + ½ρ(v₁² − v₂²) + ρg(h₁ − h₂)
P₂ = 10 000 + ½ × 1000 × (1 − 4) + 1000 × 9.8 × (0 − 0.5)
P₂ = 10 000 − 1500 − 4900 = 3600 Pa
```

Every term is **per unit volume**, so **KE = ½mv² becomes ½ρv²** and **PE = mgh becomes ρgh**. The mass m is replaced by the density ρ.

For an **ideal fluid**: **P + ½ρv² + ρgh = constant**. Where **v increases, P decreases**, and where v decreases, P increases: **P and v change in opposite directions**: P ↑ v ↓. This links to continuity: **A₁v₁ = A₂v₂** and the flow rate **Q = Av**.

### The key consequence

**As fluid velocity increases, fluid pressure decreases, and vice versa.**

Combined with continuity: where a tube **narrows**, the fluid goes **faster** because A₁v₁ = A₂v₂, so by Bernoulli's equation the pressure there is **lower**.

<div class="optics-diagram" role="img" aria-label="Bernoulli: in the narrow part the fluid moves faster and the pressure is lower">
<svg viewBox="0 0 640 280" xmlns="http://www.w3.org/2000/svg" width="100%" style="height:auto;display:block;max-width:640px;margin:0.6rem auto">
<path d="M40,150 L230,150 L300,176 L440,176 L510,150 L600,150 L600,230 L510,230 L440,204 L300,204 L230,230 L40,230 Z" fill="rgba(var(--accent-1-rgb),0.18)" stroke="var(--accent-1)" stroke-width="2"/><line x1="70" y1="190" x2="104" y2="190" stroke="var(--accent-0)" stroke-width="2.4"/><polygon points="109.4,190 98.6,194.1 98.6,185.9" fill="var(--accent-0)"/><line x1="150" y1="190" x2="184" y2="190" stroke="var(--accent-0)" stroke-width="2.4"/><polygon points="189.4,190 178.6,194.1 178.6,185.9" fill="var(--accent-0)"/><line x1="310" y1="190" x2="368" y2="190" stroke="var(--accent-0)" stroke-width="2.4"/><polygon points="373.4,190 362.6,194.1 362.6,185.9" fill="var(--accent-0)"/><line x1="370" y1="190" x2="428" y2="190" stroke="var(--accent-0)" stroke-width="2.4"/><polygon points="433.4,190 422.6,194.1 422.6,185.9" fill="var(--accent-0)"/><line x1="530" y1="190" x2="564" y2="190" stroke="var(--accent-0)" stroke-width="2.4"/><polygon points="569.4,190 558.6,194.1 558.6,185.9" fill="var(--accent-0)"/><rect x="127" y="62" width="16" height="88" fill="rgba(var(--accent-1-rgb),0.45)"/><line x1="127" y1="40" x2="127" y2="150" stroke="var(--col-text-muted)" stroke-width="1.5"/><line x1="143" y1="40" x2="143" y2="150" stroke="var(--col-text-muted)" stroke-width="1.5"/><rect x="362" y="122" width="16" height="54" fill="rgba(var(--accent-1-rgb),0.45)"/><line x1="362" y1="40" x2="362" y2="176" stroke="var(--col-text-muted)" stroke-width="1.5"/><line x1="378" y1="40" x2="378" y2="176" stroke="var(--col-text-muted)" stroke-width="1.5"/><rect x="547" y="62" width="16" height="88" fill="rgba(var(--accent-1-rgb),0.45)"/><line x1="547" y1="40" x2="547" y2="150" stroke="var(--col-text-muted)" stroke-width="1.5"/><line x1="563" y1="40" x2="563" y2="150" stroke="var(--col-text-muted)" stroke-width="1.5"/><line x1="150" y1="62" x2="362" y2="62" stroke="var(--col-text-muted)" stroke-width="1" stroke-dasharray="3 4"/><line x1="378" y1="122" x2="420" y2="122" stroke="var(--col-text-muted)" stroke-width="1" stroke-dasharray="3 4"/><text x="410" y="100" text-anchor="start" fill="var(--accent-2)" font-family="Space Mono,monospace" font-size="11">pressure drops</text><text x="135" y="252" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12">wide: A₁ large</text><text x="135" y="268" text-anchor="middle" fill="var(--accent-0)" font-family="Outfit,sans-serif" font-size="12">v₁ slow · P₁ high</text><text x="370" y="252" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12">narrow: A₂ small</text><text x="370" y="268" text-anchor="middle" fill="var(--accent-0)" font-family="Outfit,sans-serif" font-size="12">v₂ fast · P₂ low</text><text x="555" y="252" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12">wide again</text><text x="555" y="268" text-anchor="middle" fill="var(--accent-0)" font-family="Outfit,sans-serif" font-size="12">slow · high P</text><text x="320" y="24" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12">faster flow → lower pressure · columns show the pressure</text>
</svg>
</div>

### Example: rising tube

Fluid at point 1, with pressure P₁, speed v₁ and height h₁, flows up to point 2, with P₂, v₂ and h₂. The sum P + ½ρv² + ρgh is the same at both points.

<div class="optics-diagram" role="img" aria-label="Bernoulli along a rising pipe: pressure, kinetic and potential energy per volume add to the same total">
<svg viewBox="0 0 640 300" xmlns="http://www.w3.org/2000/svg" width="100%" style="height:auto;display:block;max-width:640px;margin:0.6rem auto">
<line x1="30" y1="262" x2="610" y2="262" stroke="var(--col-text-muted)" stroke-width="1.5"/><line x1="36" y1="262" x2="28" y2="272" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="52" y1="262" x2="44" y2="272" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="68" y1="262" x2="60" y2="272" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="84" y1="262" x2="76" y2="272" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="100" y1="262" x2="92" y2="272" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="116" y1="262" x2="108" y2="272" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="132" y1="262" x2="124" y2="272" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="148" y1="262" x2="140" y2="272" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="164" y1="262" x2="156" y2="272" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="180" y1="262" x2="172" y2="272" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="196" y1="262" x2="188" y2="272" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="212" y1="262" x2="204" y2="272" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="228" y1="262" x2="220" y2="272" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="244" y1="262" x2="236" y2="272" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="260" y1="262" x2="252" y2="272" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="276" y1="262" x2="268" y2="272" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="292" y1="262" x2="284" y2="272" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="308" y1="262" x2="300" y2="272" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="324" y1="262" x2="316" y2="272" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="340" y1="262" x2="332" y2="272" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="356" y1="262" x2="348" y2="272" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="372" y1="262" x2="364" y2="272" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="388" y1="262" x2="380" y2="272" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="404" y1="262" x2="396" y2="272" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="420" y1="262" x2="412" y2="272" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="436" y1="262" x2="428" y2="272" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="452" y1="262" x2="444" y2="272" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="468" y1="262" x2="460" y2="272" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="484" y1="262" x2="476" y2="272" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="500" y1="262" x2="492" y2="272" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="516" y1="262" x2="508" y2="272" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="532" y1="262" x2="524" y2="272" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="548" y1="262" x2="540" y2="272" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="564" y1="262" x2="556" y2="272" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="580" y1="262" x2="572" y2="272" stroke="var(--col-text-muted)" stroke-width="1"/><line x1="596" y1="262" x2="588" y2="272" stroke="var(--col-text-muted)" stroke-width="1"/><path d="M40,220 C250,220 330,90 600,90" fill="none" stroke="rgba(var(--accent-1-rgb),0.28)" stroke-width="46" stroke-linecap="butt"/><path d="M40,220 C250,220 330,90 600,90" fill="none" stroke="var(--accent-1)" stroke-width="1.2" stroke-dasharray="4 5"/><line x1="60" y1="220" x2="100" y2="220" stroke="var(--accent-0)" stroke-width="2.4"/><polygon points="105.4,220 94.6,224.1 94.6,215.9" fill="var(--accent-0)"/><line x1="520" y1="90" x2="580" y2="90" stroke="var(--accent-0)" stroke-width="3"/><polygon points="585.4,90 574.6,94 574.6,86" fill="var(--accent-0)"/><line x1="110" y1="226" x2="110" y2="262" stroke="var(--accent-2)" stroke-width="1.5"/><text x="118" y="250" text-anchor="start" fill="var(--accent-2)" font-family="Outfit,sans-serif" font-size="13">h₁</text><line x1="560" y1="96" x2="560" y2="262" stroke="var(--accent-2)" stroke-width="1.5"/><text x="552" y="200" text-anchor="end" fill="var(--accent-2)" font-family="Outfit,sans-serif" font-size="13">h₂</text><text x="60" y="176" text-anchor="start" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12">P₁, v₁: low point</text><text x="600" y="50" text-anchor="end" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12">P₂, v₂: high point</text><text x="320" y="292" text-anchor="middle" fill="var(--accent-0)" font-family="Outfit,sans-serif" font-size="13">P₁ + ½ρv₁² + ρgh₁ = P₂ + ½ρv₂² + ρgh₂ = constant</text>
</svg>
</div>

### Medical applications of Bernoulli's equation

- **Blood flow through narrowed arteries, called stenosis:** when an artery narrows because of **atherosclerosis**, the cross-sectional area **decreases**, blood velocity **increases**, and blood pressure in the narrowed region **decreases**: v↑ ⇒ P↓.
- **Venturi mask:** uses Bernoulli's principle to deliver a **controlled concentration of oxygen**. Fast oxygen flow through a narrow opening lowers the pressure, which pulls in room air in a fixed ratio.
- **Heart murmurs:** when blood velocity becomes high through a **narrowed valve**, **turbulent flow** develops. The turbulence makes audible **heart murmurs** that doctors hear with a **stethoscope**. The high velocity and low pressure come from Bernoulli's principle.
- **Doppler ultrasound and blood flow measurement:** Doppler ultrasound is a **non-invasive** imaging technique that measures the **velocity and direction** of blood flow in blood vessels. Other uses:
  - measuring blood flow in the **carotid arteries**;
  - detecting **deep vein thrombosis (DVT)**;
  - assessing **fetal blood circulation**;
  - assessing **heart valves** with **Doppler echocardiography**, which measures the pressure gradients across valves.

### Clinical case

A patient has **carotid artery stenosis**. Why does blood velocity **increase** at the stenotic region?
- A. Bernoulli principle
- B. Continuity equation
- C. Laplace law
- D. Viscosity

**Answer: B, the continuity equation.** The area gets smaller, so the speed must rise to keep A × v the same. Bernoulli's equation then explains the **pressure drop**, not the speed rise.

### Practice examples

**Horizontal pipe: speed goes up, pressure goes down**  
Water has a density of 1000 kg/m³. It speeds up from v₁ = 1 m/s to v₂ = 3 m/s in a horizontal pipe, so h₁ = h₂. Both points are at the same height, so the ρgh terms cancel.

```
P₁ + ½ρv₁² = P₂ + ½ρv₂²
P₁ − P₂ = ½ρ(v₂² − v₁²)
P₁ − P₂ = ½ × 1000 × (9 − 1) = 4000 Pa
```

The pressure in the fast part is **4000 Pa lower**.

**Same speed, higher up**  
Water flows at the same speed up to a point 2 m higher, so v₁ = v₂. The speeds are equal, so the ½ρv² terms cancel.

```
P₁ + ρgh₁ = P₂ + ρgh₂
P₁ − P₂ = ρg(h₂ − h₁) = 1000 × 9.8 × 2 = 19 600 Pa
```

**Stenosis**  
This example uses continuity and then Bernoulli. Blood has a density of about 1050 kg/m³. It flows from A₁ = 0.1 m² at v₁ = 0.5 m/s into a narrowing with A₂ = 0.01 m².

Step 1: use continuity.

```
v₂ = A₁v₁ / A₂ = (0.1 × 0.5) / 0.01 = 5 m/s
```

Step 2: use Bernoulli. Both points are at the same height, so the ρgh terms cancel.

```
P₁ − P₂ = ½ρ(v₂² − v₁²)
P₁ − P₂ = ½ × 1050 × (25 − 0.25) ≈ 1.3 × 10⁴ Pa
```

The narrowed part has **faster** blood and **lower** pressure.

---

## 3. Viscosity

### What viscosity is

Viscosity is the property of a fluid that describes its **resistance to flow** due to **internal friction between its layers**. In simple terms, viscosity is the **"thickness"** of a fluid: honey is more viscous than water.

**Definition:** viscosity (η) is the **resistance of a fluid to shear deformation or flow**, caused by **internal friction between adjacent fluid layers**.

### The two-plate picture

Two parallel plates, each of area **A**, are separated by a thin fluid layer of thickness **y**. The lower plate is held **still**. A force **F** is needed to move the upper plate at speed **v**, because of the fluid's viscosity.

- The layer touching the moving plate moves at **v**; the layer touching the fixed plate does not move. In between, the speed changes steadily: this is the **velocity gradient**, v/y.
- The greater the viscosity and the plate area, the larger the force F needed.
- **F is directly proportional to the plate area A and the plate velocity v**, and **inversely proportional to the plate separation y**: F ∝ Av / y.

<div class="optics-diagram" role="img" aria-label="Viscosity: a force F drags the top plate at speed v over a fluid layer of thickness y; layers move slower near the fixed plate">
<svg viewBox="0 0 640 236" xmlns="http://www.w3.org/2000/svg" width="100%" style="height:auto;display:block;max-width:640px;margin:0.6rem auto">
<rect x="80" y="50" width="360" height="24" rx="3" fill="rgba(var(--accent-6-rgb),0.3)" stroke="var(--accent-6)" stroke-width="2"/><text x="260" y="67" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12">moving plate, area A</text><rect x="80" y="74" width="360" height="122" fill="rgba(var(--accent-1-rgb),0.14)"/><rect x="80" y="196" width="360" height="24" rx="3" fill="rgba(var(--accent-4-rgb),0.25)" stroke="var(--accent-4)" stroke-width="2"/><text x="260" y="213" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12">stationary plate</text><line x1="110" y1="86" x2="245.2" y2="86" stroke="var(--accent-0)" stroke-width="2"/><polygon points="250.6,86 239.8,90 239.8,82" fill="var(--accent-0)"/><line x1="110" y1="108" x2="218.2" y2="108" stroke="var(--accent-0)" stroke-width="2"/><polygon points="223.6,108 212.8,112 212.8,104" fill="var(--accent-0)"/><line x1="110" y1="130" x2="191.1" y2="130" stroke="var(--accent-0)" stroke-width="2"/><polygon points="196.5,130 185.7,134.1 185.7,126" fill="var(--accent-0)"/><line x1="110" y1="152" x2="164.1" y2="152" stroke="var(--accent-0)" stroke-width="2"/><polygon points="169.5,152 158.7,156.1 158.7,147.9" fill="var(--accent-0)"/><line x1="110" y1="174" x2="137" y2="174" stroke="var(--accent-0)" stroke-width="2"/><polygon points="142.4,174 131.6,178.1 131.6,169.9" fill="var(--accent-0)"/><line x1="440" y1="62" x2="520" y2="62" stroke="var(--accent-2)" stroke-width="3"/><polygon points="525.4,62 514.6,66 514.6,58" fill="var(--accent-2)"/><text x="528" y="66" text-anchor="start" fill="var(--accent-2)" font-family="Outfit,sans-serif" font-size="15" font-weight="700">F</text><text x="300" y="104" text-anchor="start" fill="var(--col-text-muted)" font-family="Space Mono,monospace" font-size="11">fluid layers slide over each other</text><line x1="462" y1="74" x2="462" y2="196" stroke="var(--col-text-main)" stroke-width="1.3"/><line x1="456" y1="74" x2="468" y2="74" stroke="var(--col-text-main)" stroke-width="1.3"/><line x1="456" y1="196" x2="468" y2="196" stroke="var(--col-text-main)" stroke-width="1.3"/><text x="472" y="140" text-anchor="start" fill="var(--col-text-main)" font-family="Space Mono,monospace" font-size="14">y</text><text x="110" y="40" text-anchor="start" fill="var(--accent-0)" font-family="Outfit,sans-serif" font-size="11">speed v at the top → 0 at the bottom · velocity gradient v/y</text><text x="560" y="140" text-anchor="middle" fill="var(--accent-0)" font-family="Space Mono,monospace" font-size="14">F = η A v / y</text><text x="560" y="160" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="10.5">more η, A or v → more F</text><text x="560" y="176" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="10.5">bigger gap y → less F</text>
</svg>
</div>

```
F = η A v / y
F / A = η × (v / y)
Shear stress (F/A) = coefficient of viscosity × velocity gradient
```

```example
Given η = 4 × 10⁻³ Pa·s, A = 0.01 m², v = 0.1 m/s, y = 2 × 10⁻³ m
F = (4 × 10⁻³ × 0.01 × 0.1) / (2 × 10⁻³) = 2 × 10⁻³ N
F / A = 2 × 10⁻³ / 0.01 = 0.2 Pa
```

**How F = ηAv/y is made:** start from F ∝ Av/y and put in a constant to make it an equation. That constant of proportionality, **η (eta)**, is the **viscosity**. Divide both sides by A to get the shear stress form.

**Three ways to write the same law**

```
F ∝ A,   F ∝ v,   F ∝ 1/y
(1) Force due to viscosity:   F = η A v / y
(2) Viscosity:                η = (F/A) / (v/y) = F y / (A v)
(3) Shear stress:             F/A = η × (v / y)
```

- In form (3), **F/A is shear stress**, not pressure. Both have the unit Pa (N/m²), but the force in shear stress acts **along** the surface, sideways, while pressure pushes **at right angles** to it.
- **Unit of η from form (2):** η = (F/A) × (y/v) → Pa × m ÷ (m/s) = **Pa·s**.
- **Blood vs an ideal fluid:** an **ideal fluid** ignores viscosity, so η = 0, as in Bernoulli's equation. **Blood is not ideal**: it has viscosity, so η, the viscous force F and the pressure P needed to push it all matter. This leads to Poiseuille's law.

### Units

```
SI unit of η: pascal-second (Pa·s)
1 Pa·s = 1 N·s·m⁻²
CGS unit: poise
```

### Factors affecting viscosity

The viscosity of a fluid depends on:
1. **Temperature**
2. **Internal friction** between layers
3. **Concentration of suspended particles**

For **blood**, viscosity is mainly affected by:
- **red blood cell concentration**;
- **plasma proteins**;
- **temperature**;
- **red blood cell deformability**, how easily the cells bend.

### Medical significance

- Higher viscosity → **lower blood flow**
- Higher viscosity → **greater vascular resistance**
- Higher viscosity → **higher workload on the heart**

Increased blood viscosity increases resistance to flow and needs **greater pressure** to keep the same blood flow rate. So when blood viscosity increases, blood flow becomes **slower**, blood pressure **may increase**, and the heart must **work harder**. Lower viscosity makes blood flow **easier**.

### Polycythemia and anemia

Blood viscosity depends strongly on the **number of red blood cells**.

| | Polycythemia | Anemia |
|---|---|---|
| Red blood cell count | Increased | Reduced |
| Blood viscosity | **Increased** | **Reduced** |
| Resistance to flow | Increased vascular resistance | Reduced |
| Other effects | Increased risk of **thrombosis** | **Faster** circulation, but **reduced oxygen-carrying capacity** |

### Practice example

A plate of area A = 0.5 m² slides at v = 0.2 m/s over a water layer y = 1.0 × 10⁻³ m thick. The viscosity of water is η = 1.0 × 10⁻³ Pa·s.

```
F = η A v / y
F = (1.0 × 10⁻³ × 0.5 × 0.2) / (1.0 × 10⁻³) = 0.1 N
```

---

## 4. Poiseuille's law & its medical applications

### What it describes

Poiseuille's law describes the **flow of a viscous fluid through a cylindrical tube**. It shows how **vessel radius, pressure difference, fluid viscosity and tube length** affect the flow rate. It is widely used in medicine to understand blood circulation through **arteries and veins**.

### Set-up

An **incompressible** fluid of constant viscosity **η** flows through a tube of length **L**, radius **r**, also written **R**, and cross-sectional area **A = πr²**. The pressure difference between the two ends is **ΔP = P₂ − P₁**, where P₂ is the higher pressure that drives the flow.

### Building the law

```
Average velocity:  v̄ = ΔP r² / (8 η L)
Flow rate:         Q = A × v̄ = πr² × ΔP r² / (8 η L)
Poiseuille's law:  Q = π r⁴ ΔP / (8 η L)
```

```example
Given r = 2 mm = 2 × 10⁻³ m, ΔP = 1000 Pa, η = 4 × 10⁻³ Pa·s, L = 0.1 m
v̄ = ΔP r² / (8ηL) = 1000 × 4 × 10⁻⁶ / (3.2 × 10⁻³) = 1.25 m/s
Q = π r⁴ ΔP / (8ηL) = π × 1.6 × 10⁻¹¹ × 1000 / (3.2 × 10⁻³) ≈ 1.57 × 10⁻⁵ m³/s
```

**How Q = πr⁴ΔP/(8ηL) is made, step by step:**
1. The volume flow rate is area × average speed: Q = A v̄, the same idea as Q = Av.
2. The area of a round tube is A = πr².
3. The average speed is v̄ = ΔPr² / (8ηL).
4. Multiply: πr² × ΔPr²/(8ηL) = πr⁴ΔP/(8ηL). The two r² make **r⁴**.

| Symbol | Meaning | Unit |
|---|---|---|
| Q | Volume flow rate | m³/s |
| r | Radius of the tube | m |
| ΔP | Pressure difference between the two ends | Pa |
| η | Viscosity of the fluid | Pa·s |
| L | Length of the tube | m |

<div class="optics-diagram" role="img" aria-label="Poiseuille flow through a tube of radius R and length L, and how halving R cuts the flow to one sixteenth">
<svg viewBox="0 0 640 274" xmlns="http://www.w3.org/2000/svg" width="100%" style="height:auto;display:block;max-width:640px;margin:0.6rem auto">
<rect x="70" y="90" width="340" height="120" fill="rgba(var(--accent-1-rgb),0.16)"/><line x1="70" y1="90" x2="410" y2="90" stroke="var(--accent-1)" stroke-width="2"/><line x1="70" y1="210" x2="410" y2="210" stroke="var(--accent-1)" stroke-width="2"/><ellipse cx="70" cy="150" rx="14" ry="60" fill="rgba(var(--accent-1-rgb),0.25)" stroke="var(--accent-1)" stroke-width="2"/><ellipse cx="410" cy="150" rx="14" ry="60" fill="none" stroke="var(--accent-1)" stroke-width="2" stroke-dasharray="4 4"/><line x1="180" y1="100" x2="219.7" y2="100" stroke="var(--accent-0)" stroke-width="2"/><polygon points="225.1,100 214.3,104 214.3,96" fill="var(--accent-0)"/><line x1="180" y1="114" x2="263.2" y2="114" stroke="var(--accent-0)" stroke-width="2"/><polygon points="268.6,114 257.8,118 257.8,110" fill="var(--accent-0)"/><line x1="180" y1="128" x2="292.5" y2="128" stroke="var(--accent-0)" stroke-width="2"/><polygon points="297.9,128 287.1,132.1 287.1,124" fill="var(--accent-0)"/><line x1="180" y1="142" x2="307.7" y2="142" stroke="var(--accent-0)" stroke-width="2"/><polygon points="313.1,142 302.3,146.1 302.3,137.9" fill="var(--accent-0)"/><line x1="180" y1="156" x2="308.7" y2="156" stroke="var(--accent-0)" stroke-width="2"/><polygon points="314.1,156 303.3,160.1 303.3,151.9" fill="var(--accent-0)"/><line x1="180" y1="170" x2="295.6" y2="170" stroke="var(--accent-0)" stroke-width="2"/><polygon points="301,170 290.2,174.1 290.2,165.9" fill="var(--accent-0)"/><line x1="180" y1="184" x2="268.3" y2="184" stroke="var(--accent-0)" stroke-width="2"/><polygon points="273.7,184 262.9,188.1 262.9,179.9" fill="var(--accent-0)"/><line x1="180" y1="198" x2="226.8" y2="198" stroke="var(--accent-0)" stroke-width="2"/><polygon points="232.2,198 221.4,202.1 221.4,193.9" fill="var(--accent-0)"/><line x1="110" y1="150" x2="110" y2="90" stroke="var(--accent-2)" stroke-width="1.6"/><polygon points="110,89.2 113.6,98.8 106.4,98.8" fill="var(--accent-2)"/><circle cx="110" cy="150" r="3" fill="var(--accent-2)"/><text x="118" y="122" text-anchor="start" fill="var(--accent-2)" font-family="Space Mono,monospace" font-size="14">r</text><text x="48" y="155" text-anchor="end" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="14" font-weight="700">P₂</text><text x="432" y="155" text-anchor="start" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="14" font-weight="700">P₁</text><text x="240" y="78" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12">viscosity η · flow Q →</text><line x1="70" y1="230" x2="410" y2="230" stroke="var(--col-text-main)" stroke-width="1.3"/><text x="240" y="248" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="14" font-style="italic">L</text><text x="240" y="28" text-anchor="middle" fill="var(--accent-0)" font-family="Outfit,sans-serif" font-size="15">Q = π r⁴ ΔP / (8 η L)</text><text x="240" y="262" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="11">fastest in the centre, slowest at the wall</text><line x1="470" y1="230" x2="630" y2="230" stroke="var(--col-text-muted)" stroke-width="1.3"/><rect x="490" y="80" width="44" height="150" fill="rgba(var(--accent-0-rgb),0.45)" stroke="var(--accent-0)"/><rect x="560" y="220.625" width="44" height="9.375" fill="rgba(var(--accent-0-rgb),0.45)" stroke="var(--accent-0)"/><text x="512" y="248" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="11">radius r</text><text x="582" y="248" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="11">radius r/2</text><text x="512" y="72" text-anchor="middle" fill="var(--accent-0)" font-family="Outfit,sans-serif" font-size="13" font-weight="700">Q</text><text x="582" y="210" text-anchor="middle" fill="var(--accent-0)" font-family="Outfit,sans-serif" font-size="13" font-weight="700">Q/16</text><text x="550" y="262" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="11">half the radius → 1/16 of the flow</text>
</svg>
</div>

### What the law tells us

| Relationship | Meaning |
|---|---|
| **Q ∝ r⁴**: flow and radius | Radius **doubles** → flow **× 16**. Radius **halves** → flow **÷ 16** (1/16). Small changes in vessel diameter make **very large** changes in blood flow. |
| **Q ∝ ΔP**: flow and pressure | A higher pressure difference gives **greater** blood flow. |
| **Q ∝ 1/η**: flow and viscosity | Higher viscosity gives **lower** blood flow. |
| **Q ∝ 1/L**: flow and length | **Longer** vessels give more resistance and **reduce** flow. |

### Medical significance

Poiseuille's law explains why:
- **narrowed arteries reduce blood supply**;
- **increased blood viscosity makes the heart work harder**: to keep Q the same when η rises, ΔP must rise;
- **small changes in vessel diameter** have **major effects** on circulation.

A **narrow blood vessel** needs **high blood pressure** to carry the normal amount of blood. In medicine the law is essential for understanding **blood flow, hypertension, atherosclerosis, IV infusion systems, polycythemia** and vascular physiology. Because flow ∝ r⁴, even small changes in arterial diameter can change **tissue perfusion** dramatically.

### Clinical case study

A 65-year-old patient has **severe narrowing of the carotid artery** due to atherosclerosis. Which physical changes occur in the narrowed segment?
- A. Velocity decreases and pressure increases.
- B. Velocity increases and pressure decreases.
- C. Velocity decreases and flow increases.
- D. Pressure increases and resistance decreases.

**Answer: B.** Because the vessel radius decreases:
- blood **velocity increases**, by the continuity equation;
- local **pressure decreases**, by the Bernoulli principle;
- **resistance increases**, by Poiseuille's law.

Together these effects **reduce blood supply** to the tissues.

### Practice examples

**Radius halved**

```
Q ∝ r⁴
New Q / old Q = (r/2)⁴ / r⁴ = 1/16
```

The flow drops to **1/16**. To keep the same flow, ΔP must be **16 times** larger.

**Radius doubled**

```
New Q / old Q = (2r)⁴ / r⁴ = 16
```

**Radius reduced by 20 %**: r → 0.8r

```
New Q / old Q = 0.8⁴ = 0.41
```

A vessel only 20 % narrower carries just **41 %** of the flow.

---

## 5. Applications of Bernoulli and Poiseuille: TIA

**Transient ischemic attack (TIA)** is a **temporary lack of blood to the brain**. The carotid and vertebral arteries in the neck carry blood to the brain. A person with **constricted** arteries there can have a TIA:

1. **Continuity:** at the constriction the cross-sectional area **decreases**, so the blood **speeds up** to get past it: A₁v₁ = A₂v₂ (A↓ → v↑).
2. **Poiseuille's law:** Q ∝ r⁴, so a smaller radius gives **very little blood flow** (r↓ → Q↓).
3. **Bernoulli's principle:** faster flow means **lower pressure** (v↑ → P↓).

The blood flow is **weak** and the pressure is **low**, so not enough blood **reaches the brain**.

<div class="optics-diagram" role="img" aria-label="Constricted artery: faster flow and lower pressure at the narrowing, and much less flow overall, can cause a TIA">
<svg viewBox="0 0 640 262" xmlns="http://www.w3.org/2000/svg" width="100%" style="height:auto;display:block;max-width:640px;margin:0.6rem auto">
<path d="M30,96 L200,96 C240,96 250,128 290,128 L350,128 C390,128 400,96 440,96 L610,96 L610,204 L440,204 C400,204 390,172 350,172 L290,172 C250,172 240,204 200,204 L30,204 Z" fill="rgba(var(--accent-1-rgb),0.16)"/><path d="M200,96 C240,96 250,128 290,128 L350,128 C390,128 400,96 440,96 Z" fill="rgba(var(--accent-3-rgb),0.4)"/><path d="M200,204 C240,204 250,172 290,172 L350,172 C390,172 400,204 440,204 Z" fill="rgba(var(--accent-3-rgb),0.4)"/><path d="M30,96 L200,96 C240,96 250,128 290,128 L350,128 C390,128 400,96 440,96 L610,96" fill="none" stroke="var(--accent-1)" stroke-width="2"/><path d="M30,204 L200,204 C240,204 250,172 290,172 L350,172 C390,172 400,204 440,204 L610,204" fill="none" stroke="var(--accent-1)" stroke-width="2"/><text x="320" y="118" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="11">plaque</text><text x="320" y="192" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="11">plaque</text><line x1="60" y1="150" x2="100" y2="150" stroke="var(--accent-0)" stroke-width="2.4"/><polygon points="105.4,150 94.6,154.1 94.6,145.9" fill="var(--accent-0)"/><line x1="120" y1="150" x2="160" y2="150" stroke="var(--accent-0)" stroke-width="2.4"/><polygon points="165.4,150 154.6,154.1 154.6,145.9" fill="var(--accent-0)"/><line x1="270" y1="150" x2="350" y2="150" stroke="var(--accent-0)" stroke-width="3"/><polygon points="355.4,150 344.6,154.1 344.6,145.9" fill="var(--accent-0)"/><line x1="480" y1="150" x2="502" y2="150" stroke="var(--accent-0)" stroke-width="1.6"/><polygon points="507.4,150 496.6,154.1 496.6,145.9" fill="var(--accent-0)"/><line x1="540" y1="150" x2="562" y2="150" stroke="var(--accent-0)" stroke-width="1.6"/><polygon points="567.4,150 556.6,154.1 556.6,145.9" fill="var(--accent-0)"/><text x="320" y="30" text-anchor="middle" fill="var(--accent-0)" font-family="Outfit,sans-serif" font-size="12">① A↓ → v↑ · continuity A₁v₁ = A₂v₂</text><text x="320" y="48" text-anchor="middle" fill="var(--accent-2)" font-family="Outfit,sans-serif" font-size="12">② v↑ → P↓ · Bernoulli</text><text x="320" y="66" text-anchor="middle" fill="var(--accent-4)" font-family="Outfit,sans-serif" font-size="12">③ r↓ → Q↓↓ · Poiseuille, Q ∝ r⁴</text><text x="90" y="236" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="11">from the heart</text><text x="540" y="236" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="11">to the brain: weak flow,</text><text x="540" y="252" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="11">low pressure → TIA</text>
</svg>
</div>

---

## 6. Laplace's law — tension in vessel walls

### What it describes

Laplace's law links the **pressure inside a vessel**, its **radius**, and the **tension in its wall**.

```
Cylindrical blood vessel:   T = P × r

Thin-walled vessel, wall stress:   σ = P r / t
σ = wall stress,  t = wall thickness

Using transmural pressure:   σ = Pₜ R / μ
Pₜ = transmural pressure Pᵢ − Pₑ,  R = radius,  μ = wall thickness, same as t
```

```example
Given P = 16 000 Pa, r = 0.01 m, t = 1 mm = 1 × 10⁻³ m
T = P × r = 16 000 × 0.01 = 160 N/m
σ = P r / t = 160 / (1 × 10⁻³) = 1.6 × 10⁵ Pa
With Pᵢ = 16 000 Pa and Pₑ = 1000 Pa: Pₜ = 15 000 Pa
σ = Pₜ R / μ = 15 000 × 0.01 / (1 × 10⁻³) = 1.5 × 10⁵ Pa
```

**How these fit together:** **wall tension** T = P × r is a force **per unit length** of wall (N/m). Dividing it by the wall thickness spreads it through the wall and gives the **wall stress** σ = Pr/t, a force per area in Pa. So **Pₜ × R / μ is a wall stress**: it is σ = Pr/t with the **transmural pressure** Pₜ, the pressure difference across the wall, as P and μ as the thickness.

- **Larger vessel radius → greater wall tension** (T ∝ r).
- **Higher blood pressure → greater wall tension** (T ∝ P).
- **Thicker vessel wall → lower wall stress.**

So wall tension **increases directly with pressure and radius**. For the same pressure and wall thickness, **doubling the radius doubles the wall tension**.

<div class="optics-diagram" role="img" aria-label="Laplace law in a vessel: wall tension grows with pressure and radius; an aneurysm bulges out on one side of the wall with a much larger radius">
<svg viewBox="0 0 640 282" xmlns="http://www.w3.org/2000/svg" width="100%" style="height:auto;display:block;max-width:640px;margin:0.6rem auto">
<circle cx="150" cy="150" r="82" fill="rgba(var(--accent-3-rgb),0.35)" stroke="var(--accent-3)" stroke-width="2"/><circle cx="150" cy="150" r="62" fill="rgba(var(--accent-1-rgb),0.18)" stroke="var(--accent-3)" stroke-width="2"/><line x1="150" y1="150" x2="200.8" y2="114.4" stroke="var(--accent-2)" stroke-width="1.8"/><polygon points="201.4,114 195.6,122.4 191.5,116.5" fill="var(--accent-2)"/><text x="180" y="122" text-anchor="start" fill="var(--accent-2)" font-family="Space Mono,monospace" font-size="14">R</text><text x="144" y="172" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12">Pᵢ inside</text><line x1="44.8" y1="111.7" x2="67.3" y2="119.9" stroke="var(--col-text-muted)" stroke-width="1.5"/><polygon points="71.3,121.3 62.3,121.4 64.4,115.5" fill="var(--col-text-muted)"/><line x1="111.7" y1="44.8" x2="119.9" y2="67.3" stroke="var(--col-text-muted)" stroke-width="1.5"/><polygon points="121.3,71.3 115.5,64.4 121.4,62.3" fill="var(--col-text-muted)"/><line x1="188.3" y1="44.8" x2="180.1" y2="67.3" stroke="var(--col-text-muted)" stroke-width="1.5"/><polygon points="178.7,71.3 178.6,62.3 184.5,64.4" fill="var(--col-text-muted)"/><line x1="255.2" y1="111.7" x2="232.7" y2="119.9" stroke="var(--col-text-muted)" stroke-width="1.5"/><polygon points="228.7,121.3 235.6,115.5 237.7,121.4" fill="var(--col-text-muted)"/><line x1="255.2" y1="188.3" x2="232.7" y2="180.1" stroke="var(--col-text-muted)" stroke-width="1.5"/><polygon points="228.7,178.7 237.7,178.6 235.6,184.5" fill="var(--col-text-muted)"/><line x1="44.8" y1="188.3" x2="67.3" y2="180.1" stroke="var(--col-text-muted)" stroke-width="1.5"/><polygon points="71.3,178.7 64.4,184.5 62.3,178.6" fill="var(--col-text-muted)"/><text x="46" y="40" text-anchor="start" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="11">Pₑ outside</text><line x1="150" y1="212" x2="150" y2="232" stroke="var(--col-text-main)" stroke-width="2"/><text x="158" y="250" text-anchor="start" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="11">wall thickness μ</text><text x="150" y="270" text-anchor="middle" fill="var(--accent-0)" font-family="Outfit,sans-serif" font-size="12">Pₜ = Pᵢ − Pₑ   ·   σ = Pₜ R / μ</text><text x="150" y="22" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="13" font-weight="600">Normal vessel, cross-section</text><path d="M448,40 L448,250 L492,250 L492,195 A52,52 0 1 0 492,105 L492,40 Z" fill="rgba(var(--accent-3-rgb),0.3)" stroke="var(--accent-3)" stroke-width="2"/><line x1="470" y1="62" x2="492" y2="62" stroke="var(--accent-2)" stroke-width="1.6"/><polygon points="493.2,62 484.8,65.2 484.8,58.9" fill="var(--accent-2)"/><text x="498" y="66" text-anchor="start" fill="var(--accent-2)" font-family="Outfit,sans-serif" font-size="13">Rₒ</text><line x1="518.1" y1="150" x2="570.1" y2="150" stroke="var(--accent-0)" stroke-width="1.8"/><polygon points="571.9,150 562.3,153.6 562.3,146.4" fill="var(--accent-0)"/><text x="540.1" y="138" text-anchor="middle" fill="var(--accent-0)" font-family="Outfit,sans-serif" font-size="13">Rₐ ≫ Rₒ</text><text x="500" y="221" text-anchor="start" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="11">one-sided bulge</text><text x="500" y="235" text-anchor="start" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="11">of the wall: a sac</text><text x="470" y="22" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="13" font-weight="600">Aneurysm: bulge</text><text x="470" y="270" text-anchor="middle" fill="var(--accent-0)" font-family="Outfit,sans-serif" font-size="12">R ↑ → T ↑ → wall weakens → rupture risk</text>
</svg>
</div>

### Medical applications of Laplace's law

- **Aorta:** the aorta has a **large radius**, so its wall tension is **very high**. The aortic wall must be **thick and strong** to withstand it.
- **Hypertension:** increased blood pressure means P↑ ⇒ T↑: arterial **wall stress increases** and **cardiovascular complications** become more likely.
- **Aneurysm:** in an aneurysm the wall bulges out and the vessel is dilated, so the radius grows from **Rₒ** to a much larger **Rₐ**: Rₐ ≫ Rₒ. The wall tension rises a lot, which weakens the wall further: **larger radius → greater wall tension → higher risk of aneurysm rupture**.

### Sphere version

For a **sphere**, such as a balloon end, the same idea gives T = P r / 2, which is the same as **P = 2T / r**. The alveoli in the lungs are tiny spheres, so this law applies to them: for the same surface tension T, a **smaller alveolus needs a higher pressure** to stay open. Without surfactant, small alveoli would collapse. This is the "alveolar stability" formula in section 8.

### Practice examples

**Radius doubles**, with the same P and wall thickness: T = P × r, so T **doubles**.

**Aneurysm with Rₐ = 3Rₒ**, with the same Pₜ and μ:

```
Tₐ / Tₒ = Rₐ / Rₒ = 3      → three times the wall tension
```

If the bulging wall also becomes **half as thick**, the wall stress rises **3 × 2 = 6 times**.

---

## 7. Reynolds number

The Reynolds number, **Re**, tells you the **type of flow** in a vessel or tube: smooth **streamline or laminar** flow in parallel layers, or **turbulent** flow with swirls and eddies. Example: the type of blood flow in an artery.

```
Re = inertial force / viscous force
Re = ρ v D / η
ρ = density of the fluid,  v = velocity,  D = diameter of the tube,  η = viscosity
```

```example
Given water: ρ = 1000 kg/m³, v = 0.1 m/s, D = 0.01 m, η = 1 × 10⁻³ Pa·s
Re = 1000 × 0.1 × 0.01 / (1 × 10⁻³) = 1000
Re below 2000 → laminar flow
```

**Reading the symbols:** **ρ** is the Greek letter **rho** and means **density**; it is easily misread as the Latin p. **η** is the Greek letter **eta** and means **viscosity**; it looks like the Latin n. The numerator ρvD reflects the **inertial force** and η the **viscous force**.

**How Re is made:** the top (ρvD) grows with how much **momentum** the fluid carries, since inertia keeps it going and swirling; the bottom (η) is the **internal friction** that smooths the flow into layers. Re has **no units**.

| Re | Type of flow |
|---|---|
| Less than 2000 | Laminar, also called streamline |
| More than 2000 | Turbulent |
| Between 1000 and 2000 | Unsteady, see the note below |

- **Low Re → viscous forces dominate → smooth, laminar flow.**
- **High Re → inertial forces dominate → greater tendency toward turbulent flow.**

| Reynolds number increases with | Reynolds number decreases with |
|---|---|
| Higher blood **velocity** | Higher **viscosity** |
| Larger vessel **diameter** | |
| Higher fluid **density** | |

> **Note:** the "unsteady" range of 1000–2000 overlaps the "laminar" range below 2000. Many textbooks put the unsteady, or transition, range just **above** 2000, at about 2000–3000. The safe rule to remember is: **below 2000 laminar, above 2000 turbulent**.

<div class="optics-diagram" role="img" aria-label="Reynolds number scale: below 2000 laminar, above 2000 turbulent">
<svg viewBox="0 0 640 208" xmlns="http://www.w3.org/2000/svg" width="100%" style="height:auto;display:block;max-width:640px;margin:0.6rem auto">
<rect x="50.0" y="120" width="270.0" height="26" fill="rgba(var(--accent-2-rgb),0.35)" stroke="var(--accent-2)"/><rect x="320.0" y="120" width="270.0" height="26" fill="rgba(var(--accent-0-rgb),0.35)" stroke="var(--accent-0)"/><line x1="50" y1="146" x2="50" y2="154" stroke="var(--col-text-main)" stroke-width="1.2"/><text x="50" y="170" text-anchor="middle" fill="var(--col-text-main)" font-family="Space Mono,monospace" font-size="11">0</text><line x1="185" y1="146" x2="185" y2="154" stroke="var(--col-text-main)" stroke-width="1.2"/><text x="185" y="170" text-anchor="middle" fill="var(--col-text-main)" font-family="Space Mono,monospace" font-size="11">1000</text><line x1="320" y1="146" x2="320" y2="154" stroke="var(--col-text-main)" stroke-width="1.2"/><text x="320" y="170" text-anchor="middle" fill="var(--col-text-main)" font-family="Space Mono,monospace" font-size="11">2000</text><line x1="455" y1="146" x2="455" y2="154" stroke="var(--col-text-main)" stroke-width="1.2"/><text x="455" y="170" text-anchor="middle" fill="var(--col-text-main)" font-family="Space Mono,monospace" font-size="11">3000</text><line x1="590" y1="146" x2="590" y2="154" stroke="var(--col-text-main)" stroke-width="1.2"/><text x="590" y="170" text-anchor="middle" fill="var(--col-text-main)" font-family="Space Mono,monospace" font-size="11">4000</text><text x="185" y="138" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12" font-weight="600">Re < 2000 · laminar</text><text x="455" y="138" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="12" font-weight="600">Re > 2000 · turbulent</text><line x1="70.2" y1="62" x2="279.5" y2="62" stroke="var(--accent-2)" stroke-width="1.6"/><polygon points="284.9,62 274.1,66 274.1,58" fill="var(--accent-2)"/><line x1="70.2" y1="74" x2="279.5" y2="74" stroke="var(--accent-2)" stroke-width="1.6"/><polygon points="284.9,74 274.1,78 274.1,70" fill="var(--accent-2)"/><line x1="70.2" y1="86" x2="279.5" y2="86" stroke="var(--accent-2)" stroke-width="1.6"/><polygon points="284.9,86 274.1,90 274.1,82" fill="var(--accent-2)"/><line x1="70.2" y1="98" x2="279.5" y2="98" stroke="var(--accent-2)" stroke-width="1.6"/><polygon points="284.9,98 274.1,102 274.1,94" fill="var(--accent-2)"/><path d="M360.5,95 c10,-30 30,-30 30,-8 c0,14 -18,14 -16,0" fill="none" stroke="var(--accent-0)" stroke-width="1.8"/><path d="M408.5,95 c10,-30 30,-30 30,-8 c0,14 -18,14 -16,0" fill="none" stroke="var(--accent-0)" stroke-width="1.8"/><path d="M456.5,95 c10,-30 30,-30 30,-8 c0,14 -18,14 -16,0" fill="none" stroke="var(--accent-0)" stroke-width="1.8"/><path d="M504.5,95 c10,-30 30,-30 30,-8 c0,14 -18,14 -16,0" fill="none" stroke="var(--accent-0)" stroke-width="1.8"/><path d="M552.5,95 c10,-30 30,-30 30,-8 c0,14 -18,14 -16,0" fill="none" stroke="var(--accent-0)" stroke-width="1.8"/><text x="320" y="24" text-anchor="middle" fill="var(--accent-0)" font-family="Space Mono,monospace" font-size="13">Re = ρ v D / η  =  inertial force / viscous force</text><text x="185" y="196" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="11">viscous forces win → smooth layers</text><text x="455" y="196" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="11">inertia wins → swirls, eddies</text>
</svg>
</div>

### Practice example

Blood: ρ = 1050 kg/m³, v = 0.3 m/s, D = 0.02 m, η = 4.0 × 10⁻³ Pa·s.

```
Re = ρ v D / η = (1050 × 0.3 × 0.02) / (4.0 × 10⁻³) = 6.3 / 0.004 ≈ 1575
```

Re < 2000 → **laminar**. If the speed doubles (for example through a narrowing), Re ≈ 3150 > 2000 → **turbulent**. This is how a stenosis or narrowed valve makes a **murmur**.

---

## 8. Surface tension & its medical applications

### Surface tension

Surface tension is the property of a liquid surface that makes it behave like a **stretched elastic membrane**, like a rubber sheet. It comes from the **attractive, cohesive forces between liquid molecules**.

- A molecule **inside** the liquid is pulled **equally in all directions**. A molecule **at the surface** has no liquid above it, so it is pulled **sideways and down** only. The surface acts like a skin and tries to keep the **smallest possible area**. This is why **mosquitoes can stand on water**.

**Definition:** surface tension is the **force acting per unit length along the surface** of a liquid.

```
T = F / L
```

```example
Given F = 0.0146 N acting along L = 0.2 m
T = 0.0146 / 0.2 = 0.073 N/m
```

**How T = F/L is made:** take a line of length L on the surface; the surface pulls along the surface on that line with force F. Force per unit length is the surface tension. Some books write it as **γ**, the Greek letter **gamma**: γ = F/L. Do not mix it up with the **wall tension T** of Laplace's law, which also has units N/m.

<div class="optics-diagram" role="img" aria-label="Surface tension from unbalanced pulls on surface molecules, and capillary rise of water and fall of mercury">
<svg viewBox="0 0 640 274" xmlns="http://www.w3.org/2000/svg" width="100%" style="height:auto;display:block;max-width:640px;margin:0.6rem auto">
<rect x="30" y="70" width="250" height="170" fill="rgba(var(--accent-1-rgb),0.16)" stroke="var(--accent-1)" stroke-width="1.5"/><line x1="30" y1="70" x2="280" y2="70" stroke="var(--accent-1)" stroke-width="3"/><circle cx="60" cy="86" r="8" fill="none" stroke="var(--col-text-main)" stroke-width="1.5"/><circle cx="60" cy="130" r="8" fill="none" stroke="var(--col-text-main)" stroke-width="1.5"/><circle cx="60" cy="174" r="8" fill="none" stroke="var(--col-text-main)" stroke-width="1.5"/><circle cx="60" cy="218" r="8" fill="none" stroke="var(--col-text-main)" stroke-width="1.5"/><circle cx="108" cy="86" r="8" fill="none" stroke="var(--col-text-main)" stroke-width="1.5"/><circle cx="108" cy="130" r="8" fill="none" stroke="var(--col-text-main)" stroke-width="1.5"/><circle cx="108" cy="174" r="8" fill="none" stroke="var(--col-text-main)" stroke-width="1.5"/><circle cx="108" cy="218" r="8" fill="none" stroke="var(--col-text-main)" stroke-width="1.5"/><circle cx="156" cy="86" r="8" fill="none" stroke="var(--col-text-main)" stroke-width="1.5"/><circle cx="156" cy="130" r="8" fill="none" stroke="var(--col-text-main)" stroke-width="1.5"/><circle cx="156" cy="174" r="8" fill="none" stroke="var(--col-text-main)" stroke-width="1.5"/><circle cx="156" cy="218" r="8" fill="none" stroke="var(--col-text-main)" stroke-width="1.5"/><circle cx="204" cy="86" r="8" fill="none" stroke="var(--col-text-main)" stroke-width="1.5"/><circle cx="204" cy="130" r="8" fill="none" stroke="var(--col-text-main)" stroke-width="1.5"/><circle cx="204" cy="174" r="8" fill="none" stroke="var(--col-text-main)" stroke-width="1.5"/><circle cx="204" cy="218" r="8" fill="none" stroke="var(--col-text-main)" stroke-width="1.5"/><circle cx="252" cy="86" r="8" fill="none" stroke="var(--col-text-main)" stroke-width="1.5"/><circle cx="252" cy="130" r="8" fill="none" stroke="var(--col-text-main)" stroke-width="1.5"/><circle cx="252" cy="174" r="8" fill="none" stroke="var(--col-text-main)" stroke-width="1.5"/><circle cx="252" cy="218" r="8" fill="none" stroke="var(--col-text-main)" stroke-width="1.5"/><line x1="165" y1="174" x2="186" y2="174" stroke="var(--accent-0)" stroke-width="1.6"/><polygon points="190.2,174 181.8,177.2 181.8,170.8" fill="var(--accent-0)"/><line x1="162.4" y1="180.4" x2="177.2" y2="195.2" stroke="var(--accent-0)" stroke-width="1.6"/><polygon points="180.2,198.2 172,194.5 176.5,190" fill="var(--accent-0)"/><line x1="156" y1="183" x2="156" y2="204" stroke="var(--accent-0)" stroke-width="1.6"/><polygon points="156,208.2 152.8,199.8 159.2,199.8" fill="var(--accent-0)"/><line x1="149.6" y1="180.4" x2="134.8" y2="195.2" stroke="var(--accent-0)" stroke-width="1.6"/><polygon points="131.8,198.2 135.5,190 140,194.5" fill="var(--accent-0)"/><line x1="147" y1="174" x2="126" y2="174" stroke="var(--accent-0)" stroke-width="1.6"/><polygon points="121.8,174 130.2,170.8 130.2,177.2" fill="var(--accent-0)"/><line x1="149.6" y1="167.6" x2="134.8" y2="152.8" stroke="var(--accent-0)" stroke-width="1.6"/><polygon points="131.8,149.8 140,153.5 135.5,158" fill="var(--accent-0)"/><line x1="156" y1="165" x2="156" y2="144" stroke="var(--accent-0)" stroke-width="1.6"/><polygon points="156,139.8 159.2,148.2 152.8,148.2" fill="var(--accent-0)"/><line x1="162.4" y1="167.6" x2="177.2" y2="152.8" stroke="var(--accent-0)" stroke-width="1.6"/><polygon points="180.2,149.8 176.5,158 172,153.5" fill="var(--accent-0)"/><line x1="165" y1="86" x2="186" y2="86" stroke="var(--accent-2)" stroke-width="1.6"/><polygon points="190.2,86 181.8,89.2 181.8,82.8" fill="var(--accent-2)"/><line x1="162.4" y1="92.4" x2="177.2" y2="107.2" stroke="var(--accent-2)" stroke-width="1.6"/><polygon points="180.2,110.2 172,106.5 176.5,102" fill="var(--accent-2)"/><line x1="156" y1="95" x2="156" y2="116" stroke="var(--accent-2)" stroke-width="1.6"/><polygon points="156,120.2 152.8,111.8 159.2,111.8" fill="var(--accent-2)"/><line x1="149.6" y1="92.4" x2="134.8" y2="107.2" stroke="var(--accent-2)" stroke-width="1.6"/><polygon points="131.8,110.2 135.5,102 140,106.5" fill="var(--accent-2)"/><line x1="147" y1="86" x2="126" y2="86" stroke="var(--accent-2)" stroke-width="1.6"/><polygon points="121.8,86 130.2,82.8 130.2,89.2" fill="var(--accent-2)"/><text x="155" y="46" text-anchor="middle" fill="var(--accent-2)" font-family="Outfit,sans-serif" font-size="11">surface molecule: pulled sideways and down</text><text x="155" y="60" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="10.5">→ the surface acts like a stretched skin</text><text x="155" y="262" text-anchor="middle" fill="var(--accent-0)" font-family="Outfit,sans-serif" font-size="11">inside: pulled equally in all directions</text><rect x="340" y="150" width="120" height="90" fill="rgba(var(--accent-1-rgb),0.3)"/><path d="M340,110 L340,240 L460,240 L460,110" fill="none" stroke="var(--col-text-muted)" stroke-width="1.5"/><rect x="392" y="104" width="16" height="136" fill="rgba(var(--accent-1-rgb),0.55)"/><line x1="392" y1="70" x2="392" y2="232" stroke="var(--col-text-main)" stroke-width="1.4"/><line x1="408" y1="70" x2="408" y2="232" stroke="var(--col-text-main)" stroke-width="1.4"/><path d="M392,104 Q400,112 408,104" fill="none" stroke="var(--col-text-main)" stroke-width="1.4"/><text x="400" y="262" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="11">water rises, concave top</text><rect x="490" y="150" width="120" height="90" fill="rgba(var(--accent-4-rgb),0.3)"/><path d="M490,110 L490,240 L610,240 L610,110" fill="none" stroke="var(--col-text-muted)" stroke-width="1.5"/><rect x="542" y="184" width="16" height="56" fill="rgba(var(--accent-4-rgb),0.55)"/><line x1="542" y1="70" x2="542" y2="232" stroke="var(--col-text-main)" stroke-width="1.4"/><line x1="558" y1="70" x2="558" y2="232" stroke="var(--col-text-main)" stroke-width="1.4"/><path d="M542,184 Q550,176 558,184" fill="none" stroke="var(--col-text-main)" stroke-width="1.4"/><text x="550" y="262" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="11">mercury falls, convex top</text><text x="475" y="40" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="13" font-weight="600">Capillarity in thin tubes</text><text x="155" y="22" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="13" font-weight="600">Surface tension: T = F/L</text>
</svg>
</div>

**Units of surface tension:**

```
SI unit:   N/m, the same as J/m², energy per unit area
CGS unit:  dyne/cm
1 dyne/cm = 10⁻³ N/m
```

**Cohesive and adhesive forces:**
- **Cohesive force** is the attraction between molecules of the **same** liquid or substance. It causes surface tension.
- **Adhesive force** is the attraction between molecules of **different** substances, such as a liquid and its container wall.

**Contact angle θ:** the angle between the liquid surface and the solid wall. It shows how well the liquid **wets** the solid, that is, adhesion compared with cohesion. A small θ means good wetting. It is used when measuring surface tension by the capillary rise method:

```
h = 2γ cos θ / (ρ g r)
h = rise in the tube,  r = tube radius,  ρ = liquid density
```

```example
Given water: γ = 0.072 N/m, θ = 0 so cos θ = 1, ρ = 1000 kg/m³, r = 0.5 mm = 5 × 10⁻⁴ m
h = 2 × 0.072 × 1 / (1000 × 9.8 × 5 × 10⁻⁴) = 0.144 / 4.9
h ≈ 0.029 m ≈ 2.9 cm
```

### Factors affecting surface tension

| Surface tension increases with | Surface tension decreases with |
|---|---|
| **Strong intermolecular forces** | **Higher temperature** |
| **Lower temperature** | **Detergents or surfactants** |

### Capillarity

Capillarity, also called **capillary action**, happens in a **thin tube** called a capillary. Surface tension plus **adhesion**, the attraction to the tube wall, moves the liquid:
- **Water rises** and its top curves **up at the edges** into a concave surface, because water is attracted to the glass.
- **Mercury falls** below the outside level and its top **bulges up** into a convex surface, because mercury is attracted more to itself than to the glass.

Medical use: **blood collection** in thin capillary tubes and **microfluidic devices**.

### Pulmonary surfactant and alveolar stability

- **Without surfactant:** **high surface tension** promotes **alveolar collapse**.
- **With surfactant:** **reduced surface tension** keeps the alveoli **open and stable**.
- **Respiratory distress syndrome (RDS):** **surfactant deficiency** causes **breathing difficulty in premature infants**. This is neonatal RDS.

```
Alveolar stability:  P = 2T / r
P = pressure needed to keep the alveolus open,  T = surface tension,  r = alveolar radius
```

```example
Given T = 0.05 N/m, r = 0.2 mm = 2 × 10⁻⁴ m
P = 2 × 0.05 / (2 × 10⁻⁴) = 500 Pa
Halving r doubles P → 1000 Pa
```

**How P = 2T/r is used:** a **higher** surface tension T needs a **higher** pressure to keep an alveolus open, and a **smaller** alveolus, with a smaller r, needs **more** pressure too. Surfactant lowers T, so much less pressure is needed and the alveoli do not collapse.

<div class="optics-diagram" role="img" aria-label="Pulmonary surfactant lowers surface tension so alveoli stay open; without it high surface tension collapses them">
<svg viewBox="0 0 640 298" xmlns="http://www.w3.org/2000/svg" width="100%" style="height:auto;display:block;max-width:640px;margin:0.6rem auto">
<line x1="170" y1="186" x2="170" y2="262" stroke="var(--accent-6)" stroke-width="10"/><circle cx="170" cy="140" r="46" fill="rgba(var(--accent-0-rgb),0.22)" stroke="var(--accent-0)" stroke-width="2.5"/><line x1="232.4" y1="176" x2="215" y2="166" stroke="var(--accent-0)" stroke-width="2"/><polygon points="210.9,163.6 221,165.3 217.4,171.5" fill="var(--accent-0)"/><line x1="170" y1="212" x2="170" y2="192" stroke="var(--accent-0)" stroke-width="2"/><polygon points="170,187.2 173.6,196.8 166.4,196.8" fill="var(--accent-0)"/><line x1="107.6" y1="176" x2="125" y2="166" stroke="var(--accent-0)" stroke-width="2"/><polygon points="129.1,163.6 122.6,171.5 119,165.3" fill="var(--accent-0)"/><line x1="107.6" y1="104" x2="125" y2="114" stroke="var(--accent-0)" stroke-width="2"/><polygon points="129.1,116.4 119,114.7 122.6,108.5" fill="var(--accent-0)"/><line x1="170" y1="68" x2="170" y2="88" stroke="var(--accent-0)" stroke-width="2"/><polygon points="170,92.8 166.4,83.2 173.6,83.2" fill="var(--accent-0)"/><line x1="232.4" y1="104" x2="215" y2="114" stroke="var(--accent-0)" stroke-width="2"/><polygon points="210.9,116.4 217.4,108.5 221,114.7" fill="var(--accent-0)"/><text x="170" y="30" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="13" font-weight="600">Without surfactant</text><text x="170" y="48" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="11">high surface tension → alveolus collapses</text><line x1="470" y1="210" x2="470" y2="262" stroke="var(--accent-6)" stroke-width="10"/><circle cx="470" cy="140" r="70" fill="rgba(var(--accent-1-rgb),0.22)" stroke="var(--accent-1)" stroke-width="2.5"/><circle cx="534.0" cy="140.0" r="2.6" fill="var(--accent-2)"/><circle cx="530.1" cy="161.9" r="2.6" fill="var(--accent-2)"/><circle cx="519.0" cy="181.1" r="2.6" fill="var(--accent-2)"/><circle cx="502.0" cy="195.4" r="2.6" fill="var(--accent-2)"/><circle cx="481.1" cy="203.0" r="2.6" fill="var(--accent-2)"/><circle cx="458.9" cy="203.0" r="2.6" fill="var(--accent-2)"/><circle cx="438.0" cy="195.4" r="2.6" fill="var(--accent-2)"/><circle cx="421.0" cy="181.1" r="2.6" fill="var(--accent-2)"/><circle cx="409.9" cy="161.9" r="2.6" fill="var(--accent-2)"/><circle cx="406.0" cy="140.0" r="2.6" fill="var(--accent-2)"/><circle cx="409.9" cy="118.1" r="2.6" fill="var(--accent-2)"/><circle cx="421.0" cy="98.9" r="2.6" fill="var(--accent-2)"/><circle cx="438.0" cy="84.6" r="2.6" fill="var(--accent-2)"/><circle cx="458.9" cy="77.0" r="2.6" fill="var(--accent-2)"/><circle cx="481.1" cy="77.0" r="2.6" fill="var(--accent-2)"/><circle cx="502.0" cy="84.6" r="2.6" fill="var(--accent-2)"/><circle cx="519.0" cy="98.9" r="2.6" fill="var(--accent-2)"/><circle cx="530.1" cy="118.1" r="2.6" fill="var(--accent-2)"/><text x="470" y="30" text-anchor="middle" fill="var(--col-text-main)" font-family="Outfit,sans-serif" font-size="13" font-weight="600">With surfactant</text><text x="470" y="48" text-anchor="middle" fill="var(--col-text-muted)" font-family="Outfit,sans-serif" font-size="11">low surface tension → alveolus stays open</text><text x="560" y="236" text-anchor="start" fill="var(--accent-2)" font-family="Outfit,sans-serif" font-size="11">surfactant layer</text><line x1="556" y1="232" x2="520" y2="200" stroke="var(--accent-2)" stroke-width="1" stroke-dasharray="3 3"/><text x="320" y="286" text-anchor="middle" fill="var(--accent-0)" font-family="Outfit,sans-serif" font-size="12">alveolar stability: P = 2T / r · lower T → less pressure needed to keep it open</text>
</svg>
</div>

### Medical applications of surface tension

| Concept | Relationship | Medical importance |
|---|---|---|
| Surface tension | T = F/L | Tendency of the liquid surface to contract |
| Pulmonary surfactant | Decreases surface tension | Prevents alveolar collapse |
| Respiratory distress syndrome | Surfactant deficiency | Breathing difficulty in premature infants |
| Capillary action | Surface tension + adhesion | Blood collection and microfluidic devices |
| Alveolar stability | P = 2T/r | Explains lung mechanics |

### Practice examples

**Force on a line of water surface**  
The surface tension of water is T ≈ 0.072 N/m, and the line is L = 5 cm = 0.05 m long.

```
F = T × L = 0.072 × 0.05 = 3.6 × 10⁻³ N
```

**Alveolus with and without surfactant**  
The alveolus has a radius r = 0.1 mm = 1 × 10⁻⁴ m.

```
Without surfactant (T ≈ 0.07 N/m):  P = 2T/r = 2 × 0.07 / 1×10⁻⁴ = 1400 Pa
With surfactant (T ≈ 0.025 N/m):    P = 2 × 0.025 / 1×10⁻⁴ = 500 Pa
```

Surfactant cuts the pressure needed to keep the alveolus open to about a **third**.

---

## 9. Clinical / medical links

### Summary of clinical applications

| Concept | Medical example |
|---------|-----------------|
| Continuity | Arterial stenosis |
| Bernoulli | Venturi mask |
| Poiseuille | Blood pressure |
| Viscosity | Polycythemia |
| Reynolds | Heart murmur |
| Laplace | Aneurysm |
| Surface tension | Neonatal RDS |

### More links

| Physics | Medicine |
|---------|----------|
| Bernoulli: v↑ → P↓ | Lower pressure in an artery narrowed by atherosclerosis |
| Doppler ultrasound | Blood speed and direction: carotids, DVT, fetal circulation, heart valves |
| Continuity + Bernoulli + Poiseuille | TIA: temporary lack of blood to the brain |
| Viscosity η ↑ | Slower flow, more resistance, harder work for the heart |
| Poiseuille: Q ∝ r⁴ | Small narrowing → big drop in perfusion; IV infusion systems |
| Laplace: T ∝ P and T ∝ r | Hypertension raises wall stress; the aorta needs a thick wall |
| Surface tension + surfactant | Alveoli stay open; deficiency → RDS in premature babies |

---

## 10. Formula sheet — Chapter 3 continued

```
Bernoulli: P + ½ρv² + ρgh = constant          ← energy per volume stays the same
P₁ + ½ρv₁² + ρgh₁ = P₂ + ½ρv₂² + ρgh₂          ← two points on one streamline
Same height: P₁ − P₂ = ½ρ(v₂² − v₁²)           ← faster → lower pressure
Viscous force: F = η A v / y                   ← η = viscosity [Pa·s]; CGS poise
Shear stress: F/A = η (v / y)                  ← viscosity × velocity gradient
Average speed in a tube: v̄ = ΔP r² / (8ηL)
Poiseuille: Q = π r⁴ ΔP / (8 η L)              ← Q ∝ r⁴, Q ∝ ΔP, Q ∝ 1/η, Q ∝ 1/L
Laplace, cylinder:  T = P × r                  ← wall tension [N/m]
Wall stress: σ = P r / t = Pₜ R / μ   ← Pₜ = Pᵢ − Pₑ, μ = thickness
Reynolds: Re = ρ v D / η                       ← inertia ÷ viscosity, no units
Surface tension: T = γ = F / L                ← [N/m]; 1 dyne/cm = 10⁻³ N/m
Capillary rise: h = 2γ cos θ / (ρ g r)         ← θ = contact angle
Alveolar stability: P = 2T / r                 ← sphere version of Laplace
```

### Cause and Effect Summary

- Artery narrows → v ↑ by continuity → P ↓ by Bernoulli → resistance ↑ and Q ↓↓ by Poiseuille  
- Viscosity ↑, as in polycythemia → Q ↓, resistance ↑, heart works harder  
- Radius × 2 → flow × 16; radius × ½ → flow × 1/16  
- Longer vessel → less flow; bigger ΔP → more flow  
- Pressure ↑ or radius ↑ → wall tension ↑; thicker wall → less stress  
- Velocity, diameter or density ↑ → Re ↑, towards turbulent; viscosity ↑ → Re ↓  
- Temperature ↑ or surfactant added → surface tension ↓  

### Key Points to Remember
- Bernoulli: where the fluid moves faster, the pressure is lower.  
- The three energy terms per unit volume are P, ½ρv² and ρgh.  
- Viscosity is internal friction between fluid layers.  
- Poiseuille: flow is proportional to r⁴, so the radius has the largest effect on flow.  
- Laplace: wall tension increases with pressure and with radius.  
- Reynolds number is the ratio of inertial to viscous forces; above about 2000 the flow becomes turbulent.  
- Surface tension is force per unit length, measured in N/m.  

### Medical Applications
- Carotid stenosis: blood speeds up by **continuity**, pressure drops by **Bernoulli**, and resistance rises by **Poiseuille**.  
- A Venturi mask uses Bernoulli's principle to deliver a controlled oxygen concentration.  
- A heart murmur is caused by turbulent flow through a narrowed valve.  
- Polycythemia makes blood more viscous; anemia makes it less viscous but it carries less oxygen.  
- The aorta needs a thick wall; an aneurysm has a high risk of rupture.  
- Without surfactant, alveoli collapse; this causes neonatal RDS.  
