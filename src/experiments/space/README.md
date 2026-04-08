# space

WebGL orbital mechanics simulation using Three.js and custom Newtonian gravity.

## What it does

Earth sits at the origin. The Moon orbits Earth kinematically (stable parametric circle — not physics-driven). Ships are launched from Earth's surface and fly under N-body Newtonian gravity from both Earth and Moon. Ships are destroyed on collision with Earth or Moon, or when they leave the screen.

An auto-ship relaunches continuously using Hohmann transfer geometry. Multiple user-launched ships can coexist. The auto-ship waits for all other ships to die before relaunching.

## Controls

| Input | Action |
|---|---|
| Click + drag | Slingshot: spawn ship at click point, velocity = (start − end) × 3.3 |
| A / D | Rotate last active ship's heading (not velocity) |
| B | Burn: thrust last active ship in its heading direction (+50 px/s) |
| L | Auto-launch a ship with current parameters |
| C | Crash oldest active ship |

On mobile, only slingshot (tap + drag) is available.

## Physics

Pure Newtonian gravity — same formula for both bodies, different masses:

```
ax = G * M * (body.x - ship.x) / r³
ay = G * M * (body.y - ship.y) / r³
```

Integrated with Euler at 8 sub-steps per frame. The Moon is kinematic (parametric position), not physics-driven, for stability.

### Constants

| Constant | Value | Notes |
|---|---|---|
| `G` | 1 | Scaled gravitational constant |
| `M_EARTH` | 1,500,000 | Gives Moon a ~20 s orbital period at r=250 |
| `M_MOON` | 350,000 | Tuned for visible gravity influence — much larger than realistic ratio |
| `R_EARTH` | 25 px | Visual + collision radius |
| `R_MOON` | 12 px | Visual + collision radius |
| `MOON_ORBIT_R` | 250 px | Moon's orbital radius from Earth |

## Auto-launch geometry

For the **Moon orbit** preset, the launch uses Hohmann transfer geometry:

1. Predict where Moon will be after `T_XFER_HALF` seconds (half the Hohmann transfer ellipse period).
2. Add a small angular offset (`launchAngleOffset`) so the ship arrives slightly ahead of Moon — avoids a dead-center collision and lets Moon's gravity deflect the trajectory.
3. Launch from the antipodal point on Earth's surface, tangentially (CCW). This creates the transfer ellipse whose apoapsis lands near Moon.

```
futureMoonAngle = moonAngle + MOON_OMEGA * T_XFER_HALF + launchAngleOffset
launchAngle     = futureMoonAngle + π
velocity        = tangential at launchAngle × V_LAUNCH_BASE × launchImpulse
```

For **Earth orbit** presets, `launchAngleDeg` directly sets the departure point on Earth's surface. Impulse < 1.0 keeps the ship in an elliptical Earth orbit (apoapsis well below Moon's radius).

### Preset reference

| Preset | Impulse | Notes |
|---|---|---|
| Earth low orbit | 0.91 | Apoapsis ~80 px |
| Earth high orbit | 0.97 | Apoapsis ~150 px |
| Moon orbit | 1.05 | Hohmann transfer; uses moon angle offset |

## Ship rendering

The ship is a `THREE.LineSegments` diamond (square pre-rotated −45°) with a tail line extending along the `−x` local axis. `mesh.rotation.z = ship.heading` — heading is independent of velocity and rotated by A/D. Burn particles (yellow, expanding, fading) spawn at the tail tip.

## Tuning tips

- **Moon gravity too strong / weak**: adjust `M_MOON`. Higher values create more dramatic orbital deflections; lower values make Moon barely felt.
- **Ship keeps crashing into Moon**: increase `launchAngleOffset` (wider miss) or decrease `launchImpulse` (less energy at apoapsis).
- **Ship doesn't reach Moon**: increase `launchImpulse` toward 1.1.
- **Burn strength**: change `BURN = 50` in the `burn()` function.
- **Slingshot sensitivity**: change `SLING_SCALE = 3.3` (px drag → px/s).
