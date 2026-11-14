# Architecture

Static site, no server. Every page is a thin HTML shell written by `tools/build.js`; `<body data-page>` selects the renderer.

```
js/config.js                 course and instructor details
assets/vendor/               three.min.js, OrbitControls, chart.umd.js, tex-svg.js (MathJax), gsap,
                             jspdf + autotable + report-fonts.js (loaded only when a report is generated)
js/equation-engine.js        RIL.M   pure mathematics (Node-testable)
js/simulation-engine.js      RIL.defineSim / mountSim   the 73 simulations' runtime
js/three-kit.js              RIL.three   3D helpers of the simulations
js/bundle-data.js            js/data/*.js: course, units and topics, topic experiments, quizzes,
                             z-labs.js (18 practicals, concepts), z-refs.js (notes page map)
js/bundle-sims.js            js/sims/*.js
js/bundle-lab.js             js/lab/*.js:
    01-robot-math.js   RIL.RM  digital twin + kinematics, dynamics, IK, SVD, metrics (Node-testable)
    02-core.js         RIL.LK  storage, 3D viewport, twin renderer, charts, export helpers
    03-assembly.js     Robot Assembly Studio
    04-workcell.js     Experimental Workcell
    05-labs.js         practical catalogue and page, MCQ engine, PDF report
    06-tools.js        Mathematical Workspace, Simulation Analytics
    07-portal.js       course overview, concepts, library, assessment, notebook, reports,
                       dashboard, flagship, hardware, search, home sections
js/navigation.js             header (grouped menu, search), footer
js/app.js                    router; renderers of the original page types
css/global|dashboard|simulation|responsive.css   original styles
css/lab.css                  white theme and all laboratory modules
```

## Shared digital twin

```js
robot = { name, base, payload, tool, electronics[], sensors[], loose[],
  joints: [{ type:'R'|'P', alpha, a, d, offset, hasLink, min, max, material, w, mass,
             friction, damping, stiffness, tauMax, velMax, motor, gear, sensor, acc[] }] }
```
Stored as `ril:robot` in localStorage. `RM.tableOf(robot)` gives the classic DH table used by `M.fkDH`, so the studio, the workcell, the workspace and the report compute from one description.

## Simulation fidelity (Workcell)

| Mode | Model | Computed |
|---|---|---|
| 1 Kinematic | joints follow the planned trajectory exactly | q, q̇, q̈, A_i, T, J, ẋ, manipulability |
| 2 Dynamic | q̈ = M(q)⁻¹(τ − C q̇ − G − τ_f), τ from PID (+gravity) or computed torque, clipped at limits | adds τ, motor current/voltage, tracking error, energy |

Fixed step 1/300 s, decoupled from rendering. Dynamic model assumptions: links are point masses at their mid-points plus mL²/12 about their own joint, motors are point masses, rotor inertia reflected as N²J_m, tool and payload at the flange; C q̇ from finite differences of M(q). Contacts are not simulated: objects attach to the gripper when within tolerance and holding force suffices, and fall to the nearest support when released. Collision check: bounding spheres on the links against obstacle, table, floor and safety boundary.

## Storage

localStorage keys (prefix `ril:`): `robot`, `robots`, `cell`, `taught`, `runs` (last 8), `lab:<id>` (observations, MCQ answers, attempts, notebook), `student`, `reports`, `flags`, `bookmarks`, `override:<id>`, `class`. Uploaded PDFs: IndexedDB `ril-library`. Students move work between computers with Export/Import (JSON).

## Adding or editing content

- A practical: edit `js/data/z-labs.js` (or use Dashboard → Faculty and export `zz-overrides.js` into `js/data/`), then `node tools/build.js`.
- A component: add it to the catalogues at the top of `js/lab/01-robot-math.js` and to `LIB` in `03-assembly.js`.
- Reference pages after the notes change: `python3 tools/make_refs.py <notes.pdf> <unit1.pdf> … <unit4.pdf>`.

## Tests

`node tests/math.test.js` (129 checks, equation engine) · `node tests/lab.test.js` (36 checks, robot mathematics and content rules) · `node tools/build.js` (cross-reference checks; exit 1 on a broken reference) · `tests/smoke.js` (needs Playwright; loads every page).
