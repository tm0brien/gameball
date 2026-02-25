# Gameball Spec

> A declarative, JSON-first framework for 2D rendering, physics simulations, and sports visualizations — designed to be authored by humans and AI alike.

---

## Vision

Gameball is a layered simulation framework built on a simple premise: **describe what you want, not how to draw it.** A JSON config should be enough to produce a running simulation — an orbiting planet, a basketball fast break, a crowd evacuating a stadium.

The framework is designed with two authors in mind: humans who want to build simulations expressively, and LLMs that need a structured, unambiguous vocabulary to generate valid scenes without writing imperative code.

---

## Design Principles

**Declarative first.** State is data, not code. Simulations are defined as JSON configs, not draw loops.

**Layered abstractions.** The core handles geometry and rendering. Plugins provide domain vocabularies (sports, traffic, biology, etc.) that compile down to core primitives. Layers don't bleed into each other.

**LLM-legible.** The schema should be simple enough that a language model can generate valid configs from a natural language description. Ambiguity in the schema is a bug.

**Escape hatches, not workarounds.** Where declarative falls short (complex conditional logic, custom behaviors), the framework provides explicit, clean extension points rather than forcing users to abuse the declarative layer.

**Composable behaviors.** Agent behaviors are named, reusable primitives that can be composed — not monolithic scripts.

**Renderer-agnostic core.** The engine produces draw commands each frame; the renderer executes them. The core has no knowledge of Canvas, Skia, or any rendering API.

---

## Architecture

```
┌─────────────────────────────────────────┐
│           Plugin Layer                  │
│  (sports, traffic, biology, etc.)       │
│  Domain vocab → core primitives         │
├─────────────────────────────────────────┤
│           Core Layer                    │
│  Scene graph, formula evaluation,       │
│  physics, agent behaviors               │
│  Outputs: draw command list per frame   │
├─────────────────────────────────────────┤
│           Renderer                      │
│  Executes draw commands                 │
│  Web: Canvas 2D                         │
│  iOS: Swift / SpriteKit (native)        │
└─────────────────────────────────────────┘
```

An AI or human author works at the **plugin layer** or directly at the **core layer** depending on what they're building.

---

## Platform Strategy

Gameball targets two platforms with different renderer implementations but a shared schema and engine design.

**Web (v1):** TypeScript engine + Canvas 2D renderer. This is the reference implementation. The JSON schema, formula evaluator, physics system, and plugin compilers are all built and validated here first.

**iOS (long-term):** Native Swift engine + SpriteKit renderer. The engine is a deliberate rewrite of the TypeScript reference implementation in Swift — not a port of the web app. The JSON schema is identical across platforms. Plugin compilation can run server-side to avoid reimplementing it natively.

Because the iOS engine is a planned rewrite, the TypeScript implementation must be **precisely documented**. Steering force calculations, formula evaluation order, frame timing, and coordinate transforms should be unambiguous in the reference implementation so the Swift version can produce matching output.

### Project Structure

```
packages/
  core/              # Engine, formula eval, physics — pure TS, no DOM
  renderer-canvas/   # Canvas 2D renderer for web
  sports-plugin/     # Compiles sport configs → core scene configs
  app-web/           # Web app (React + Canvas renderer)
```

---

## Core Layer

### Top-Level Scene Config

```json
{
  "background": "#05050f",
  "width": 800,
  "height": 600,
  "fps": 60,
  "objects": []
}
```

| Field | Type | Description |
|---|---|---|
| `background` | color string | Canvas background color |
| `width` / `height` | number | Canvas dimensions (default: window size) |
| `fps` | number | Target frame rate (default: 60) |
| `objects` | array | List of scene objects |

---

### Objects

Every object has a `type` and a set of properties. Properties can be **static values** or **dynamic formulas**.

#### Supported Types

| Type | Description |
|---|---|
| `ellipse` | Circle or oval |
| `rect` | Rectangle |
| `line` | Line segment |
| `arc` | Arc / partial ellipse |
| `text` | Text label |
| `group` | Logical grouping (no visual) |
| `agent` | Physics-enabled entity with behaviors |

#### Common Properties

```json
{
  "id": "planet1",
  "type": "ellipse",
  "x": { "formula": "width / 2 + cos(frame * 0.015) * 120" },
  "y": { "formula": "height / 2 + sin(frame * 0.015) * 120" },
  "width": 20,
  "height": 20,
  "fill": "#4a9eff",
  "stroke": null,
  "opacity": 1.0,
  "parent": null,
  "visible": true,
  "layer": 0
}
```

| Property | Type | Description |
|---|---|---|
| `id` | string | Unique identifier, used for parent refs and behavior targets |
| `parent` | string (id) | If set, `parent.x` and `parent.y` are available in formulas |
| `layer` | number | Draw order (higher = on top) |
| `visible` | boolean or formula | Whether to render this object |

---

### Formulas

Any numeric or boolean property can be replaced with a formula object:

```json
{ "formula": "<expression>" }
```

Formulas are evaluated using **[mathjs](https://mathjs.org/)** in a scoped variable environment. This avoids `eval()` and provides a safe, sandboxed expression evaluator.

#### Available Variables

| Variable | Description |
|---|---|
| `frame` | Current frame count (integer, starts at 0) |
| `t` | Elapsed time in seconds |
| `width` | Canvas width |
| `height` | Canvas height |
| `objects.<id>.x` | X position of named object |
| `objects.<id>.y` | Y position of named object |
| `objects.<id>.<prop>` | Any property of a named object |
| `parent.x` / `parent.y` | Shorthand when `parent` is set |

#### Available Functions

Standard math: `sin`, `cos`, `tan`, `abs`, `floor`, `ceil`, `round`, `sqrt`, `pow`, `min`, `max`, `PI`

Note: `random` is available but produces a different value each frame. For reproducible simulations, avoid `random` in formulas or use a seeded approach via `onFrame`.

#### Examples

```json
// Orbit
"x": { "formula": "width / 2 + cos(frame * 0.015) * 120" }

// Follow another object
"x": { "formula": "objects.planet2.x + cos(frame * 0.06) * 45" }

// Pulse opacity
"opacity": { "formula": "0.5 + 0.5 * sin(frame * 0.05)" }

// Conditional visibility
"visible": { "formula": "frame > 120" }
```

---

### Scene Graph & Parent References

Objects can declare a `parent` by referencing another object's `id`. When a parent is set:

- `parent.x` and `parent.y` are available in formulas
- The object's rendered position is **not** automatically offset — the author controls the relationship explicitly via formulas
- Parents are resolved before children each frame

Parent transforms do **not** automatically offset child coordinates. This is an intentional design decision: explicit formulas are more LLM-legible than implicit transform inheritance. `"x": { "formula": "parent.x + 10" }` is always unambiguous regardless of nesting depth.

---

### Agents

Agents are physics-enabled objects that move according to **behaviors** rather than explicit formulas.

```json
{
  "id": "defender1",
  "type": "agent",
  "x": 300,
  "y": 200,
  "width": 16,
  "height": 16,
  "fill": "#e07040",
  "mass": 1.0,
  "maxSpeed": 4.0,
  "maxForce": 0.3,
  "behaviors": [
    { "type": "pursue", "target": "ball", "weight": 1.0 },
    { "type": "separate", "radius": 30, "weight": 0.8 }
  ]
}
```

#### Core Behavior Primitives

| Behavior | Description | Key Params |
|---|---|---|
| `seek` | Move toward a position | `target` (id or `{x, y}`) |
| `flee` | Move away from a position | `target`, `radius` |
| `pursue` | Intercept a moving target | `target` |
| `evade` | Evade a moving target | `target` |
| `wander` | Random organic movement | `strength`, `speed` |
| `arrive` | Seek with deceleration near target | `target`, `slowRadius` |
| `separate` | Avoid nearby agents | `radius`, `weight` |
| `align` | Match velocity of nearby agents | `radius` |
| `cohere` | Move toward center of nearby agents | `radius` |
| `follow_path` | Follow a defined path | `path` (array of points), `loop` |
| `maintain_zone` | Stay within a defined region | `zone` (rect or circle) |

**Behavior composition:** Behaviors are weighted and summed as steering forces each frame. A `priority` mode (where the highest-weighted applicable behavior wins outright) is planned but not in v1.

---

### Trails

Any object can emit a trail:

```json
{
  "trail": {
    "length": 40,
    "color": "#4a9eff",
    "opacity": 0.4,
    "width": 2
  }
}
```

---

## Plugin Layer

Plugins provide a **domain-specific schema** that compiles to core primitives. A plugin is a named module that:

1. Defines its own JSON schema (the "plugin config")
2. Provides a synchronous `compile(pluginConfig) → SceneConfig` function that outputs valid core JSON
3. Optionally registers custom behavior primitives

Compilation is **deterministic** — the same plugin config always produces the same scene config. LLM interpretation of natural language (e.g. a scenario description) happens upstream before the config is passed to the plugin, not inside the compiler.

### Plugin Config Shape

```json
{
  "plugin": "<plugin-name>",
  "config": { ... }
}
```

This can be embedded in a scene or used standalone (the plugin layer wraps it in a scene automatically).

### Plugin Discovery

Plugins are registered via a **static import map** in v1:

```js
const plugins = {
  sports: sportsPlugin,
  traffic: trafficPlugin,
}
```

A runtime registry (for dynamically loaded or user-defined plugins) is a future concern.

---

## Sports Plugin

The sports plugin is the flagship plugin. It provides court/field rendering and team/player/ball abstractions for basketball, baseball, and football.

### Schema

```json
{
  "plugin": "sports",
  "config": {
    "sport": "basketball",
    "court": {
      "variant": "full",
      "orientation": "landscape",
      "color": "#c8a96e",
      "lineColor": "#ffffff",
      "coordinateSystem": "real-world"
    },
    "teams": [
      {
        "id": "home",
        "color": "#4a9eff",
        "players": 5,
        "formation": "man-to-man"
      },
      {
        "id": "away",
        "color": "#e07040",
        "players": 5,
        "formation": "zone-2-3"
      }
    ],
    "ball": {
      "id": "ball",
      "color": "#ff8c00",
      "possession": "home.player1"
    }
  }
}
```

#### Supported Sports

| Sport | Court Variants |
|---|---|
| `basketball` | `full`, `half` |
| `baseball` | `full` |
| `football` | `full`, `redzone` |
| `soccer` | `full`, `half` |
| `tennis` | `full`, `singles`, `doubles` |
| `hockey` | `full`, `half` |
| `volleyball` | `full` |

#### Coordinate Systems

The sports plugin uses **real-world units** by default. The court compiler handles the transform to canvas pixels.

| Value | Description |
|---|---|
| `real-world` | Coordinates in sport-native units (feet, yards). Default. |
| `canvas` | Coordinates in canvas pixels. For hand-authored configs. |

Origin and axis orientation are sport-specific and defined in each sport's section below.

#### Sports-Specific Behavior Primitives

| Behavior | Description |
|---|---|
| `guard` | Mark a specific opposing player |
| `defend_zone` | Stay in a defined court region |
| `run_route` | Execute a named route pattern |
| `set_screen` | Move to screen position relative to ball handler |
| `fast_break` | Sprint toward target basket |
| `press` | Apply full-court pressure to ball carrier |

---

## Data-Driven Playback

Gameball supports two modes of data-driven animation that can be mixed within a single scene.

### Events

The `events` array defines a sequence of timestamped occurrences that drive agent behavior and state changes. Between events, agents execute their assigned steering behaviors.

```json
"events": [
  {
    "frame": 0,
    "type": "possession",
    "agent": "home.player1",
    "ball": "ball"
  },
  {
    "frame": 60,
    "type": "pass",
    "from": "home.player1",
    "to": "home.player3"
  },
  {
    "frame": 120,
    "type": "shot",
    "from": "home.player3",
    "x": 22.5,
    "y": 8.0,
    "result": "made"
  }
]
```

| Field | Type | Description |
|---|---|---|
| `frame` | number | Frame at which the event fires |
| `type` | string | Event type (sport-specific, enumerated below) |
| All other fields | varies | Event-specific payload |

### Keyframes

The `keyframes` array provides exact per-agent positions at specific frames, sourced from player tracking data (e.g. SportVU, Statcast, Next Gen Stats). When keyframes are present for an agent, the engine interpolates position directly rather than using steering behaviors.

```json
"keyframes": [
  { "frame": 0,  "agent": "home.player1", "x": 47.0, "y": 25.0 },
  { "frame": 1,  "agent": "home.player1", "x": 47.3, "y": 25.1 },
  { "frame": 2,  "agent": "home.player1", "x": 47.7, "y": 25.3 }
]
```

Keyframe coordinates use the same `coordinateSystem` as the court config.

### Fidelity Model

If keyframes exist for an agent at a given frame, they take precedence over steering behaviors. If keyframes run out or are absent, the agent falls back to its `behaviors` array. This allows mixing exact tracking replay with simulated fill-in.

```
Keyframes present → interpolate exact position
Keyframes absent  → run steering behaviors, driven by events
```

---

## Basketball

**Coordinate system:** Origin at center court. X axis runs baseline to baseline (−47ft to +47ft). Y axis runs sideline to sideline (−25ft to +25ft). Units: feet. Court dimensions: 94ft × 50ft (NBA).

### Shot Chart Schema

The `shotChart` field is an object with optional playback configuration and a `shots` array.

```json
"shotChart": {
  "playbackSpeed": 10,
  "shots": [
    {
      "x": 22.5,
      "y": 8.0,
      "made": true,
      "shotType": "mid-range",
      "player": "home.player3",
      "quarter": 2,
      "gameClock": "10:42"
    },
    {
      "x": -18.0,
      "y": -12.0,
      "made": false,
      "shotType": "three-pointer",
      "player": "home.player3",
      "quarter": 2,
      "gameClock": "9:55"
    }
  ]
}
```

#### Shot Chart Config Fields

| Field | Type | Description |
|---|---|---|
| `playbackSpeed` | number | How many real game-seconds elapse per playback second. Default: `10`. |
| `shots` | array | Ordered list of shot attempts |

#### Shot Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `x` / `y` | number | Yes | Shot location in feet from center court |
| `made` | boolean | Yes | Whether the shot was made |
| `shotType` | string | No | `layup`, `mid-range`, `three-pointer`, `floater`, `dunk`, `free-throw` |
| `player` | string | No | Agent id |
| `quarter` | number | No | 1–4 (or 5+ for OT) |
| `gameClock` | string | No | `"MM:SS"` remaining in the quarter |

#### Timing Behavior

When `quarter` and `gameClock` are provided, shots are spaced by real game time, compressed by `playbackSpeed`:

```
game_seconds_elapsed = (quarter - 1) * 720 + (720 - gameClock_in_seconds)
playback_frame = game_seconds_elapsed / playbackSpeed * fps
```

When `quarter` and `gameClock` are absent, shots are spaced evenly at a fixed interval (default: 90 frames).

#### NBA Stats API Compatibility

The NBA Stats API returns shot locations as `LOC_X` / `LOC_Y` in tenths of feet, measured from the basket (not center court). Apply this transform before passing to the plugin:

```
x = LOC_X / 10          // tenths of feet → feet
y = LOC_Y / 10 - 4.75   // offset from basket to center court origin
```

### Event Vocabulary

| Event | Key Fields | Description |
|---|---|---|
| `possession` | `agent`, `ball` | Agent gains possession |
| `pass` | `from`, `to` | Ball passed between agents |
| `dribble` | `agent`, `direction` | Agent begins dribbling drive |
| `shot` | `from`, `x`, `y`, `shotType`, `result` | Shot attempt |
| `rebound` | `agent`, `type` | `offensive` or `defensive` rebound |
| `turnover` | `agent`, `type` | `steal`, `out-of-bounds`, `shot-clock` |
| `foul` | `agent`, `on`, `type` | `shooting`, `personal`, `technical` |
| `free-throw` | `agent`, `result` | `made` or `missed` |
| `timeout` | `team` | Stoppage; agents hold position |
| `score` | `team`, `points` | Score update |

---

## Baseball

**Coordinate system:** Origin at home plate. X axis runs third base line to first base line. Y axis runs home plate toward center field. Units: feet. Standard basepaths: 90ft. Pitcher's mound: 60.5ft from home plate.

> Note: Statcast uses a different origin convention (center field, Y inverted). When ingesting Statcast data, apply a coordinate transform before passing to the plugin.

### Spray Chart Schema

```json
"sprayChart": [
  {
    "x": 120.0,
    "y": 180.0,
    "hitType": "line-drive",
    "exitVelocity": 103.4,
    "launchAngle": 12,
    "result": "single",
    "batter": "home.player3",
    "inning": 4,
    "outs": 1
  }
]
```

| Field | Type | Description |
|---|---|---|
| `x` / `y` | number | Landing location in feet from home plate |
| `hitType` | string | `ground-ball`, `line-drive`, `fly-ball`, `pop-up`, `bunt` |
| `exitVelocity` | number | mph |
| `launchAngle` | number | Degrees |
| `result` | string | `single`, `double`, `triple`, `home-run`, `out`, `error` |
| `batter` | string | Agent id |
| `inning` | number | |
| `outs` | number | Outs at time of hit |

### Event Vocabulary

| Event | Key Fields | Description |
|---|---|---|
| `pitch` | `pitcher`, `type`, `velocity`, `x`, `y` | Pitch thrown; `x`/`y` are plate location |
| `hit` | `batter`, `hitType`, `x`, `y`, `exitVelocity`, `launchAngle` | Ball in play |
| `fielded` | `fielder`, `x`, `y` | Fielder reaches ball |
| `throw` | `from`, `to`, `target` | Fielder throws to base or agent |
| `catch` | `agent` | Ball caught (fly out or basepath) |
| `out` | `agent`, `type` | `strikeout`, `fly-out`, `ground-out`, `tag`, `force` |
| `run` | `agent`, `from`, `to` | Runner advances bases (`1b`, `2b`, `3b`, `home`) |
| `score` | `agent` | Runner crosses home plate |
| `stolen-base` | `agent`, `base` | Stolen base attempt |
| `walk` | `batter` | Batter takes first base |
| `strikeout` | `batter` | Batter strikes out |

---

## Football

**Coordinate system:** Origin at the visiting team's goal line (left endzone). X axis runs goal line to goal line (0–100 yards). Y axis runs bottom sideline to top sideline (0–53.3 yards). Units: yards. Total field including endzones: 120 yards.

### Formation Schema

Pre-snap positioning can be declared as a named formation string or as explicit per-agent positions:

```json
// Named formation
"formation": {
  "offense": "shotgun-trips-right",
  "defense": "4-3-cover-2"
}

// Explicit positions (real-world coordinates)
"formation": {
  "offense": {
    "home.qb": { "x": 33.0, "y": 26.0 },
    "home.rb": { "x": 31.0, "y": 26.0 }
  }
}
```

### Event Vocabulary

| Event | Key Fields | Description |
|---|---|---|
| `snap` | `center`, `qb`, `formation` | Play begins |
| `handoff` | `from`, `to` | QB hands off to rusher |
| `pass` | `from`, `to`, `x`, `y`, `depth`, `result` | Pass attempt; `result`: `complete`, `incomplete`, `intercepted` |
| `rush` | `agent`, `gainedYards` | Running play result |
| `catch` | `agent`, `x`, `y` | Pass caught |
| `tackle` | `agent`, `by`, `x`, `y` | Ball carrier stopped |
| `sack` | `agent`, `by` | QB sacked |
| `penalty` | `agent`, `type`, `yards` | |
| `touchdown` | `agent`, `team` | |
| `field-goal` | `kicker`, `distance`, `result` | `made` or `missed` |
| `punt` | `kicker`, `distance`, `hangTime` | |
| `turnover` | `agent`, `type` | `fumble`, `interception` |
| `first-down` | `agent`, `x`, `y` | First down gained |

---

## Other Planned Plugins

| Plugin | Core Abstraction |
|---|---|
| `traffic` | Roads, intersections, vehicles with lane-following and signal behavior |
| `crowd` | Pedestrians with destination-seeking and social force avoidance |
| `ecosystem` | Predator/prey agents with energy, reproduction, and death |
| `fluid` | Particle-based fluid simulation (smoke, fire, water) |
| `orbital` | N-body gravity with mass-based attraction |
| `urban` | Grid-based city with shadow, noise, and sight-line propagation |

---

## AI Authoring

Gameball is designed so that LLMs can generate valid scene configs from natural language. The recommended prompting pattern:

1. Provide the Gameball spec (this document) as context
2. Describe the desired simulation in natural language
3. Request output as a valid Gameball JSON config
4. Optionally specify the target layer: core, plugin, or a specific plugin schema

### Example Prompt

> "Using the Gameball sports plugin, create a basketball half-court scenario showing a pick and roll play with 3 offensive players and 2 defenders. The ball carrier should drive toward the basket after the screen."

### LLM Output Contract

A model generating Gameball configs should:

- Always include `plugin` and `config` keys when using a plugin
- Always include `id` on any object referenced by another object or behavior
- Use formula strings only for continuously animated values; use static values for initial state
- Prefer named behavior primitives over raw formulas for agent movement
- Not invent behavior types not listed in the spec
- Use real-world coordinates when authoring sports plugin configs (`coordinateSystem: "real-world"` is the default)
- Not use the `scenario` free-text field — describe plays via explicit `formation`, `behaviors`, and `events` instead

---

## Escape Hatches

When declarative isn't enough:

| Mechanism | When to Use |
|---|---|
| `formula` strings | Continuous animation, derived positions |
| `behaviors` array | Agent movement and steering |
| `onFrame` callback (JS only) | Complex per-frame imperative logic |
| Custom plugin | Reusable domain logic that doesn't fit core |

The `onFrame` callback is the explicit escape hatch for situations where JSON can't express the needed logic. It receives the scene state and can mutate object properties directly.

---

## Milestones

### M1 — Core Engine ✅ Complete

The thing that runs. Goal: an orbiting planet demo driven entirely by formulas.

- ✅ Scene config parser — `SceneConfig`, `SceneObject` TypeScript types
- ✅ Object types: `ellipse`, `rect`, `line`, `text` (rendered); `arc`, `group` stubbed
- ✅ Formula evaluation via mathjs — sandboxed, scoped to `frame`, `t`, `width`, `height`, `objects.<id>.*`
- ✅ Frame loop — `FrameLoop` class with `requestAnimationFrame` and fps throttling
- ✅ Canvas 2D renderer — draw command abstraction; core emits commands, renderer executes them
- ✅ Basic web app shell — split-pane JSON editor with debounced live preview, ⌘↵ to run, error banner
- ✅ Three built-in demos: Solar System, Lissajous, Ripples

**Implementation notes:**
- Engine lives in `src/engine/` (pure TS, zero DOM). Renderer in `src/renderer/`. React components in `src/components/`.
- Trail rendering was also completed here (ahead of M5 schedule) — trail history managed in `Gameball.tsx`, rendered as fading `TrailCommand` draw commands.
- All objects use center-point coordinates (x, y = center) for consistency across types.
- `random` in formulas is available but unseeded — avoid in configs where reproducibility matters.

---

### M2 — Scene Graph + Agents 🔲 Not started

Goal: a flock of agents steering around each other.

- ✅ Parent references; `parent.x` / `parent.y` in formula scope *(completed in M1)*
- 🔲 `agent` type with `mass`, `maxSpeed`, `maxForce`
- 🔲 Physics integration — velocity + steering force accumulation per frame
- 🔲 Steering behavior primitives: `seek`, `flee`, `arrive`, `wander`, `separate`
- 🔲 Remaining behaviors: `pursue`, `evade`, `cohere`, `align`, `follow_path`, `maintain_zone`
- 🔲 Basic demo: boids / flocking simulation

---

### M3 — Sports Plugin (Basketball) 🔲 Not started

Goal: a recognizable basketball half-court simulation.

- 🔲 Basketball court renderer (full + half variants)
- 🔲 Team / player / ball compilation from plugin config → core scene
- 🔲 Sports behavior primitives: `guard`, `defend_zone`, `fast_break`, `set_screen`
- 🔲 Real-world coordinate transform (feet → canvas pixels)
- 🔲 Basic demo: 5v5 half-court with a simple play

---

### M3.5 — Data-Driven Playback 🔲 Not started

Goal: feed a shot chart or play-by-play and watch it play out.

- 🔲 `events` array support — behavior switching triggered at specific frames
- 🔲 `keyframes` array support — exact positional replay from tracking data
- 🔲 Fidelity model: keyframes override behaviors; behaviors fill gaps
- 🔲 Shot chart visualization (static + animated)
- 🔲 Basketball play-by-play demo
- 🔲 NBA Stats API coordinate transform (`LOC_X`/`LOC_Y` → Gameball feet)

---

### M4 — Baseball + Football 🔲 Not started

Goal: all three flagship sports are playable.

- 🔲 Baseball field renderer
- 🔲 Baseball event vocabulary + spray chart schema
- 🔲 Football field renderer (yard lines, hash marks, endzones)
- 🔲 Football event vocabulary + formation schema
- 🔲 Demos for each sport

---

### M5 — Polish + Remaining Primitives 🔲 Not started

- ✅ Trail rendering *(completed in M1)*
- 🔲 `arc` and `group` object types (rendering implementation)
- 🔲 `onFrame` escape hatch
- 🔲 Soccer, hockey, tennis court variants
- 🔲 Performance profiling (target: 22 agents at 60fps without frame drops)

---

### M6 — DX + AI Authoring 🔲 Not started

- 🔲 JSON Schema file published for LLM context
- 🔲 Schema docs site
- 🔲 Validated example configs for each sport (usable as LLM few-shot examples)
- 🔲 Engine internals doc (for Swift port reference)

---

### M7 — iOS (Swift) 🔲 Not started

- 🔲 Native Swift engine rewrite (frame loop, formula eval, steering behaviors)
- 🔲 SpriteKit renderer
- 🔲 Sports plugin compiler running server-side; iOS app consumes compiled scene configs
- 🔲 Feature parity with web on basketball, baseball, football
