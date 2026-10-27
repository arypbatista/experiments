# iso-city

Isometric city bowling: rigid-box buildings that topple, wobble back or knock each other over like dominoes when hit by a thrown ball.

## What it does

Three city layouts (Grid, Diagonal, Ring) are drawn in a 2:1 isometric projection on a 2D canvas. Buildings sit on lots, with streets kept clear between them, and cars drive two-way loops along the streets in their own lanes.

Drag anywhere to aim. The ball starts on whatever surface is under the pointer — street, roof or wall — and a dotted line previews its path. Release to throw.

A building hit hard enough tips over its bottom edge and crashes flat in a puff of dust. A glancing blow makes it rock back onto its base. Tall, thin towers fall easily; short, wide blocks shrug the ball off. A falling building that reaches a neighbour leans on it and pushes it over, so one good throw can start a chain. Cars caught under a falling building are crushed, and cars hit by the ball tumble away. Traffic stops behind wreckage and fallen buildings.

## Controls

| Input | Action |
|---|---|
| Drag, release | Aim (pull back like a slingshot) and throw |
| R / RESET | Rebuild the city |
| City selector | Grid / Diagonal / Ring layout |
| Ball speed | Throw strength (0.5× – 3×) |
| Ball mass | Ball weight relative to the buildings (0.5 – 4) |

## Physics / Algorithm

### Projection

```
sx = OX + (x − y) · K
sy = OY + (x + y) · K/2 − z · K
```

The camera looks along −(1,1,1). Faces whose outward normal points toward +(1,1,1) are visible. `K` and the origin are fitted to the screen so the whole city is visible.

### Buildings as hinged boxes

Each building is a box that can rotate about one bottom edge (the side it is pushed toward), with tilt `θ` from 0 (upright) to π/2 (flat). The centre of mass sits at `(−ha, h/2)` from the hinge, which gives:

```
θ'' = g · 3 · (h/2 · sinθ − ha · cosθ) / (4ha² + h²)
```

Below the tipping angle `atan(2ha / h)` gravity pulls the building back upright; past it, the building falls.

### Ball ↔ building

The ball is a sphere. It is transformed into the box's rotated frame, clamped to the box to find the closest point, then pushed out along the contact normal. A collision response happens only when the ball moves *into* the surface, so a ball resting on a box never piles up impulses. The impulse uses the hinge's moment of inertia `I = M(4ha² + h²)/3`:

```
j  = −(1 + e) · vₙ / (1/m_ball + lever² / I)
Δω = −j · lever / I
```

`lever` is the arm of the contact normal about the hinge, so low hits on tall buildings mostly slide the ball, while high hits tip them.

### Dominoes

For every falling building, the code computes the tilt at which its leading face first touches each neighbour in its path: either its top edge reaches the neighbour's face, or its face reaches the neighbour's top corner. At that angle the building stops, hands its angular velocity to the neighbour, and keeps pushing on it while gravity tips it further.

### Depth sorting

Objects are drawn with a topological painter's sort. For every pair whose screen rectangles overlap, A is drawn before B when their 3D bounds are separated along x, y or z with A on the far side. Pairs that intersect fall back to centre depth.

### Constants

| Constant | Value | Notes |
|---|---|---|
| `G` | 18 | Gravity for the ball, cars and toppling |
| `FLOOR_H` | 0.55 | World height per floor |
| `DENSITY` | 0.5 | Building mass per unit volume |
| `BALL_R` | 0.3 | Ball radius |
| `E_BUILDING` | 0.35 | Ball ↔ building restitution |
| `STEP` | 1/120 s | Fixed physics step, independent of frame rate |
| `LANE` | 0.24 | Lane offset from the street centreline |

## Tuning tips

- **Buildings too hard to knock over**: raise ball mass or lower `DENSITY`.
- **Everything falls at the slightest touch**: raise `DENSITY`. Tipping also depends on shape: make buildings wider (`hx`, `hy` in `fillBlock`) or shorter.
- **Domino chains too weak / too strong**: change the `0.7` momentum hand-over factor in `stepBuildings`.
- **Ball too bouncy off walls**: lower `E_BUILDING`.
- **Throws too strong**: lower the `4` drag-to-velocity factor or the `26` speed cap in `launchVelocity`.
