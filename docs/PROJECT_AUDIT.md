# Project Audit (14 November 2026)

Scope: the folder `PG Robotics and Instrumentations` and the existing site `robotics-instrumentation-virtual-lab/`, inspected before any change. A full copy of the site as found is in `../_backup/virtual-lab-before-2026-11-14.tgz`.

## 1. What was found

| Item | Finding |
|---|---|
| Academic documents | Syllabus `.docx`, one 228-page notes PDF, four unit slide decks (318 slides). See `DOCUMENT_INVENTORY.md`. |
| Existing website | Static, data-driven site (vanilla JavaScript, no framework, no server): 184 generated pages, 64 topic modules, 73 simulations, 37 topic experiments, 82 quiz items, slide flipbook. |
| Libraries bundled | Three.js r147 + OrbitControls, Chart.js 4.4, MathJax 3 (tex-svg), GSAP 3.12. All local, so the site runs offline and from `file://`. |
| Mathematics | `js/equation-engine.js`: rotations, homogeneous transforms, DH forward kinematics, geometric Jacobian, DLS inverse kinematics, planar 2R dynamics, trajectories, instrumentation, actuator, signal and image-processing formulas. 129 unit tests against the worked examples of the notes. |
| 3D assets | No GLB/GLTF/OBJ/STL/FBX files. All 3D geometry is procedural (Three.js primitives). |
| Images / video | `assets/img/instructor.jpg`, favicon, 318 slide images (`notes/`). No video. |
| Build / deploy | `tools/build.js` writes every page shell and the bundles; relative links and `.nojekyll` for GitHub Pages. No package.json, no backend. |
| Empty folder | `Humonoid/` (nothing to reuse). |

## 2. Gap analysis against the laboratory brief

| Requirement | Before | Now |
|---|---|---|
| Four units, all syllabus topics | Present (64 topic modules) | Kept; traceability matrix added (Course Overview) |
| Course information, six COs, CO mapping | COs listed on the syllabus page | Course Overview page, CO cards, CO mapping dashboard, CO-tagged MCQs |
| 18 syllabus-aligned experiments with the 26-part page | 37 short topic experiments | 18 practicals (`js/data/z-labs.js`), each built from the existing simulations; the 37 remain as "Topic experiments" |
| Five MCQs per experiment, feedback, history | Unit quizzes only | 90 MCQs, scoring, retake, attempt history, CO-wise performance |
| Robot Assembly Studio | Absent | `assembly.html` |
| Experimental Workcell on the same robot | Fixed demo cells only | `workcell.html`, shared digital twin |
| Mathematical workspace | Absent | `math.html` (8 tools) |
| Analytics with selectable axes, overlay, export | Per-simulation charts | `analytics.html` on saved runs |
| Reference PDF integration with real page numbers | Slide flipbook; text references to sections | Notes PDF viewer, section → page map generated from the PDF, per-practical references, search |
| Laboratory notebook, saved work | Absent (session only) | `notebook.html`; work saved in the browser, export/import |
| PDF report generator | Absent (CSV only) | Seven-part PDF per practical (jsPDF) |
| Student / faculty dashboards | Absent | `dashboard.html` (file-based, no server) |
| Global search | Absent | Header search over topics, practicals, simulations, notes sections |
| White engineering design | Navy header and hero | White theme in `css/lab.css`; simulation panels keep their dark instrument style |
| Hardware integration | Absent | Optional Web Serial monitor (`hardware.html`) |

## 3. Decisions

1. **Keep the existing architecture.** The brief asks to prefer the framework already present. Migrating 73 working simulations to React/React Three Fiber would have risked them for no functional gain, so the new modules follow the same pattern: plain scripts, one build step, no server.
2. **One robot model for everything.** `js/lab/01-robot-math.js` defines the digital twin and all its mathematics; the Assembly Studio writes it, the Workcell, the Mathematical Workspace and the reports read it.
3. **Reuse, do not duplicate, simulation logic.** The 18 practicals mount the existing simulations as "stations"; no simulation was rewritten.
4. **Nothing overwritten destructively.** Existing files changed: `js/navigation.js`, `js/app.js` (routes, three text edits), `js/config.js` (one field), `tools/build.js`. Everything else is new files. Reference PDFs in the parent folder are untouched; a copy of the notes PDF is placed in `reference/`.

## 4. Not implemented (stated plainly)

- AI learning assistant (needs an LLM service and API key; no server exists).
- Rigid-body physics engine (Rapier): the Workcell has a kinematic and a dynamic (torque) model plus geometric collision checks and simple object drop, not contact physics.
- Python/FastAPI backend, database, user accounts; ROS 2, Gazebo, PyBullet, MuJoCo and similar integrations.
- OpenCV: machine vision uses the site's own image-processing functions (filters, Otsu, Sobel, blob analysis) on synthetic images.
- Import of GLB/GLTF/OBJ/STL models; first-person camera; Web Bluetooth, WebUSB, MQTT.
- PDF.js: the notes are shown with the browser's built-in PDF viewer.
