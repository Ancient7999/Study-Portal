# Chapter 2 — Fluids at Rest

---

## 1. Overview & learning map

### What this chapter covers

Foundational **hydrostatics**: fluids that are not flowing. Density describes how much mass sits in a volume; pressure rises with depth; atmosphere sets a baseline; manometers and barometers measure pressure with liquid columns; Pascal explains hydraulic machines; Archimedes explains floating and apparent weight.

### Topics map

| Topic | Core idea |
|-------|-----------|
| Fluids | Flow; continuously deform under shear |
| Density ρ | m / V |
| Specific gravity | ρ / ρ_water, no units |
| Pressure | F/A; at depth P = ρgh |
| Atmospheric pressure | ≈ 1.013 × 10⁵ Pa |
| Barometer | Torricelli; 76 cm Hg |
| Manometer | U-tube; P_abs = P_atm + ρgΔh |
| Absolute vs gauge | P_abs = P_atm + P_gauge |
| Pascal | Confined fluid transmits ΔP equally |
| Buoyancy | F_B = weight of fluid displaced |

**Study tip:** Formulas are simple — connect each one to the **picture**: a column of fluid, a U-tube, pistons or a submerged object.

---

## 2. Fluids

- Liquids and gases are called **fluids** because they **flow** from higher to lower pressure.
- A fluid is a substance that **continuously deforms under shear stress**. Solids, unlike fluids, can resist static shear.

**Medical fluids:** the liquids blood, lymph and plasma; the gases O₂, CO₂ and air in the respiratory system.

---

## 3. Density & specific gravity

### Density

```
ρ = m / V
SI unit: kg/m³
Lab unit: g/cm³
Conversion: (g/cm³) × 1000 = kg/m³
Example: 1 g/cm³ = 1000 kg/m³   ← water
```

**How density is made:** m is mass, how much matter; V is volume, how much space. Density is mass divided by volume — how tightly matter is packed. Same mass in a smaller volume means higher density.

### Specific gravity

```
Specific gravity = ρ_substance / ρ_water
```

**How specific gravity is made:** divide the substance’s density by water’s density. Both have the same units, so they cancel — SG is a pure number. Water: ρ = 1000 kg/m³ = 1 g/cm³ → SG = 1 by definition. SG = 2 means “twice as dense as water.”

### Worked examples

**Density of a wooden block**  
Dimensions 2.50 cm × 4.00 cm × 6.00 cm; mass 30.0 g.  
V = 60.0 cm³ → ρ = 30/60 = 0.500 g/cm³ = 500 kg/m³.

**Mass from density**  
Plastic 5 cm × 4 cm × 8 cm; ρ = 0.30 g/cm³.  
V = 160 cm³ → m = ρV = 48.0 g.

**Metal block**  
3 × 4 × 5 cm; m = 300 g → V = 60 cm³ → ρ = 5.0 g/cm³ = 5000 kg/m³ → SG = 5.0.

---

## 4. Pressure — definition & behaviour in a static fluid

### Definition

```
P = Force / Area
SI unit: pascal (Pa) = N/m²
```

**How pressure is made:** Force is the push, in newtons; Area is the surface that push spreads over (m²). Pressure = force ÷ area — same force on a smaller patch means higher pressure.

### Direction & depth behaviour

- At a given depth in a **static** fluid, pressure acts **equally in all directions**. If it did not, the fluid would flow.
- Force of the fluid on a submerged surface is **perpendicular** to that surface.
- Pressure **increases with depth**.

### Pressure at depth h

Pressure at depth h below the free surface is due to the weight of the liquid above:

```
P = F/A = (mg)/A = (ρ V g)/A = ρ g h
ΔP = ρ g Δh
```

**How P = ρgh is assembled, step by step:**
1. Pressure is force over area: P = F/A.
2. The force at depth is the weight of the liquid column above: F = mg.
3. Mass of that column is density × volume: m = ρV, so F = ρVg.
4. For a vertical column, V = A × h, so F/A = ρ(Ah)g / A = ρgh.
5. Symbols: ρ = fluid density, g = gravity, h = depth below the free surface.

**How ΔP = ρgΔh is made:** this is a separate variant. When depth changes by Δh, not necessarily from the free surface, the *pressure difference* between two levels is ρg times that height difference. Same building blocks, but Δh replaces h when you compare two depths.

Here P often means the **gauge** contribution from the liquid column; see absolute vs gauge below.

### Gauge pressure at depth

```
P_G = ρ g h
```

**How gauge pressure at depth is made:** this is the same ρgh product, but named P_G to stress that it is the *extra* pressure from the liquid column alone — relative to the atmosphere at the free surface, not including atmospheric pressure. ρ, g, and h mean the same as above.

### Worked examples

**Force from room pressure**  
P = 1.05 × 10⁵ Pa on a table 1.5 m × 2 m → A = 3 m² → F = PA = 3.15 × 10⁵ N.

**Diver depth from gauge**  
P_G = 1.96 × 10⁵ Pa; fresh water ρ = 1000 kg/m³.  
h = P_G/(ρg) = 1.96×10⁵/(1000×9.8) = 20.0 m.

**Ocean at 800 m**  
ρ = 1000 kg/m³; h = 800 m; P_atm = 1.013 × 10⁵ Pa.  
P_G = ρgh = 1000×9.8×800 = 7.84 × 10⁶ Pa.  
P_abs = P_atm + P_G = 1.013×10⁵ + 7.84×10⁶ ≈ 7.94 × 10⁶ Pa.

---

## 5. Atmospheric pressure

At sea level:

```
1 atm = 1.013 × 10⁵ N/m² = 1.013 × 10⁵ Pa
1 bar = 1.00 × 10⁵ N/m²
1 atm ≈ 760 torr = 760 mmHg ≈ 14.7 lb/in²
```

Standard atmospheric pressure is just over 1 bar.  
Atmosphere does not crush us because body fluids/cells maintain an **internal pressure** that balances it.

### Clinical conversion

Approximate: **1 mmHg ≈ 133.3 Pa**.  
Systolic 135 mmHg → ≈ 135 × 133.3 ≈ 1.80 × 10⁴ Pa.

Blood pressures in mmHg look "small" because mmHg is a large unit relative to the pascal; clinically we still report in mmHg, the sphygmomanometer scale.

---

## 6. Torricelli's barometer

- Torricelli's mercury **barometer** measures atmospheric pressure.
- Height of Hg column ≈ **76 cm** at 1 atm. The column is supported by the atmosphere acting on the open mercury reservoir.
- Pressure often quoted in **mmHg** or inches of Hg.
- **Sphygmomanometer** uses the same mercury-column idea to measure blood pressure.

### Why Mercury Is Used Instead of Water

Any liquid can work, but denser liquids need shorter columns.

```
For water: h = P_atm / (ρ g) = (1.013×10⁵) / (1000 × 9.8) ≈ 10.33 m
```

**How this height is made:** rearrange P = ρgh to h = P/(ρg). Plug in atmospheric pressure, water’s density, and g — that is how tall a water column must be to match 1 atm. A water barometer would be > 10 m tall. Mercury is about 13.6 times denser than water, so it needs only ~0.76 m.

---

## 7. Open-tube manometer & absolute vs gauge

### Open-tube manometer

- **U-shaped** tube partly filled with liquid.
- Used to measure **gas pressure in a container**.
- One limb connected to the gas; the other open to atmosphere.
- Height difference Δh between levels relates the pressures.

### Equilibrium

At the same height in a continuous static fluid, pressures match. For the absolute pressure of the gas:

```
P_abs = P_atm + ρ g Δh
P_gauge = ρ g Δh
P_abs = P_atm + P_gauge
```

**How each variant is made:** keep them separate.
- **P_gauge = ρ g Δh:** the manometer’s height difference Δh tells you how much the gas pressure exceeds, or falls short of, the open-limb atmosphere. Multiply density × g × that height difference.
- **P_abs = P_atm + ρ g Δh:** absolute pressure of the gas is atmosphere plus that gauge contribution — you add the two because the open limb already sits at P_atm, and the liquid column accounts for the rest.
- **P_abs = P_atm + P_gauge:** same idea without writing ρgΔh — absolute always means “atmosphere plus whatever the gauge reads.”

| Term | Meaning |
|------|---------|
| **Gauge pressure** | Extra pressure from the fluid column / relative to atmosphere |
| **Absolute pressure** | Includes atmospheric pressure |
| If P_gauge = 0 | P_abs = P_atm |

### Worked examples

**Lake absolute pressure**  
h = 20 m; ρ = 1000; g = 9.8; P_atm = 1.013×10⁵ Pa.  
P_G = 1.96×10⁵ Pa; P_abs = 2.973×10⁵ Pa.

**Seawater 250 m**  
ρ = 1025 kg/m³ → P_G ≈ 2.51×10⁶ Pa; P_abs ≈ 2.61×10⁶ Pa.

---

## 8. Pascal's principle

### Statement

If an external pressure is applied to a **confined** fluid, the pressure at **every point** in the fluid increases by that amount.

```
P_in = P_out
F_in / A_in = F_out / A_out
```

**How each Pascal form is made:**
- **P_in = P_out:** a confined fluid transmits an applied pressure change equally, so pressure at the input piston equals pressure at the output piston.
- **F_in / A_in = F_out / A_out:** write each pressure as force ÷ area. Same P on both sides means the forces scale with their areas. Small force on a small piston → same pressure → large force on a large piston.

### Applications

- Hydraulic lifts  
- Dentist chair  
- Hydraulic brakes  
- Hydraulic presses  

### Dentist Chair Example

Press small pedal piston → pressure transmits uniformly through the liquid → large piston raises the chair.

### Worked examples

**Hydraulic lift**  
A_out = 0.20 m²; A_in = 0.02 m²; lift 1800 N.  
F_in = F_out × (A_in/A_out) = 1800 × (0.02/0.20) = **180 N**.

**Another lift**  
A_out = 0.40 m²; A_in = 0.02 m²; load 2400 N → F_in = 120 N, a 20× advantage.

**Press**  
A_in = 0.025 m²; A_out = 1.5 m²; F_in = 200 N → F_out = 12,000 N (60×).

---

## 9. Buoyancy & Archimedes' principle

### Why buoyancy exists

A submerged object feels higher pressure on its **bottom** than on its **top**, because pressure increases with depth. Net force is **upward** — the **buoyant force** F_B.

### Archimedes' principle

```
F_B = weight of the fluid displaced by the object
F_B = m_fluid g = ρ_fluid × V_displaced × g
```

**How buoyancy is assembled:**
- Words first: buoyant force equals the **weight of the fluid displaced**, not the weight of the object.
- Weight is mass × g, so F_B = m_fluid g.
- Mass of displaced fluid is density × displaced volume: m_fluid = ρ_fluid × V_displaced.
- Combine: F_B = ρ_fluid × V_displaced × g.

### Apparent weight

```
Apparent weight = Actual weight − F_B
```

**How apparent weight is made:** actual weight pulls down; buoyant force pushes up. What a scale or your hand feels underwater is the difference: W − F_B. Subtracting F_B from weight is why submerged objects feel lighter.

- If F_B > weight → object rises or floats, displacing fluid until equilibrium.  
- If F_B < weight → object sinks, but still feels lighter by F_B.  
- If equal → neutrally buoyant.

### Worked example

Fully submerged box V = 0.40 m³ in fresh water ρ = 1000 kg/m³.  
F_B = ρVg = 1000 × 0.40 × 9.8 = **3920 N**.

### Absolute pressure on a swimmer

10 m below fresh water surface; P_atm = 1.013×10⁵ Pa.  
P_G = ρgh = 1000×9.8×10 = 9.80×10⁴ Pa.  
P_abs = P_atm + P_G ≈ 1.99×10⁵ Pa.

---

## 10. Clinical / medical links

| Physics | Medicine |
|---------|----------|
| Pressure units mmHg | Sphygmomanometer / BP reporting |
| Gauge vs absolute | Clinical BP is gauge-like, measured relative to atmosphere |
| Pascal | Hydraulic systems in equipment such as chairs, lifts and brakes |
| Buoyancy | Immersion, body composition / underwater weighing concepts |
| Density of blood / tissues | Context for later flow and imaging physics |

---

## 11. Formula sheet — Chapter 2

```
ρ = m / V                              ← mass ÷ volume
SG = ρ / ρ_water                       ← density ÷ water’s density, a pure number
P = F / A                              ← force ÷ area
P_G at depth h = ρ g h                ← liquid-column gauge only
ΔP = ρ g Δh                            ← pressure difference for height change Δh
1 atm = 1.013 × 10⁵ Pa = 760 mmHg ≈ 760 torr
≈ 1 mmHg ≈ 133.3 Pa
P_abs = P_atm + P_gauge                ← absolute = atmosphere + gauge
Manometer: P_abs = P_atm + ρ g Δh      ← open U-tube form of the same idea
Pascal: F_in/A_in = F_out/A_out        ← equal pressures → forces scale with area
F_B = ρ_fluid V_displaced g            ← weight of displaced fluid
Apparent weight = W − F_B              ← true weight minus buoyancy
Water barometer height ≈ 10.33 m; Hg ≈ 0.76 m
```

### Key Points to Remember
- Pressure increases with depth.  
- Gauge pressure does not include atmospheric pressure; absolute pressure does.  
- In a confined fluid, Pascal's principle multiplies force by the ratio of the piston areas.  
- The buoyant force equals the weight of the **displaced** fluid, not the weight of the object.  
