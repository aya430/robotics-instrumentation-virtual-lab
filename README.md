# Robotics & Instrumentation – Interactive Virtual Learning Laboratory

*Visualize | Simulate | Experiment | Understand*

An interactive, browser-based laboratory for the four-unit course **Robotics and Instrumentation**. Every syllabus topic has a learning module (theory from the course notes, equations, worked examples, applications, observations, practice questions) and at least one working simulation whose numbers are computed from the same equations.

| Content | Count |
|---|---|
| Topic modules (Units I–IV) | 64 |
| Interactive simulations (2D Canvas and 3D Three.js) | 73 |
| Virtual experiments | 37 |
| Practice-quiz items (MCQ, conceptual, numerical, application) | 82 |
| Engine checks against worked examples of the notes | 129 (all passing) |
| Generated pages | 184 |

The site is fully static: no server, database, login or build step is needed to *view* it. All libraries are bundled in `assets/vendor/`, so it also runs offline (web fonts fall back to system fonts).

## Humanoid Robot – BAIRWABOT Virtual Lab

`humanoid-robot.html` (menu: **Humanoid Robot**) introduces and embeds the BAIRWABOT lab, a 3D 46-DOF humanoid with 30 modules (gait, IK, CoM/ZMP balance, perception, voice interaction in English and Hindi, 150 quiz questions). The lab itself is the self-contained folder `bairwabot/` (open `bairwabot/index.html` for full screen); see `bairwabot/README.md` for its details. It does not depend on the rest of the site.

## Run it locally

Any static web server works, for example:

```bash
cd robotics-instrumentation-virtual-lab
python3 -m http.server 8000      # then open http://localhost:8000/
```

Opening `index.html` directly from disk (`file://`) also works in Chrome, Edge and Firefox.

## Deploy on GitHub Pages

1. Create a repository (for example `robotics-instrumentation-virtual-lab`) and push the **contents** of this folder to the `main` branch so that `index.html` is at the repository root.
   ```bash
   git init && git add . && git commit -m "Robotics & Instrumentation virtual lab"
   git branch -M main
   git remote add origin https://github.com/<your-user>/robotics-instrumentation-virtual-lab.git
   git push -u origin main
   ```
2. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, branch `main`, folder `/ (root)`, **Save**.
3. After a minute the site is live at `https://<your-user>.github.io/robotics-instrumentation-virtual-lab/`.

All internal links are relative (each page carries `data-root`), so the site works under a project sub-path. A `.nojekyll` file is included so GitHub serves every file unchanged; `404.html` returns visitors to the home page.

## Course and instructor details

Edit `js/config.js` (course title, instructor name, e-mail, photo, LinkedIn URL, academic year, optional logo path). The site shows no course code and no school or university details. The instructor photo is `assets/img/instructor.jpg`.

## Lecture slides (flipbook)

`notes.html` shows the four unit slide decks as a page-turning flipbook (unit tabs, page turn, page number and slider, thumbnails, zoom, full screen, keyboard and swipe; deep links such as `notes.html#unit-2/p14`). Pages are pre-rendered images in `notes/unit-N/pNNN.webp`; the PDFs themselves are not published. When rendering, the institution name and course code were removed from every slide footer, and the title and closing slides were replaced with neutral versions (no logo, campus photo, school or university). The slides are marked *for study purposes only*. To update after editing the slides, re-run `python3 tools/make_notes.py` (needs poppler `pdftoppm` and Pillow) with the four PDFs named `u1.pdf`…`u4.pdf` in the working folder, then `node tools/build.js`.

## Editing content

| What | Where |
|---|---|
| Topic theory, equations, examples, questions | `js/data/u1.js` … `u4.js` |
| Virtual experiments | `js/data/x-experiments.js` |
| Quiz question banks | `js/data/y-quiz.js` (also exported to `quizzes/unit-N.json`) |
| Course overview, outcomes, books, About page | `js/data/00-course.js` |
| Simulations | `js/sims/*.js` |
| Equations shared by all simulations | `js/equation-engine.js` |

After editing, regenerate the bundles, page shells and documentation tables:

```bash
node tools/build.js          # writes js/bundle-*.js, all HTML pages, quizzes/*.json, docs/*_MAPPING.md and *_CATALOG.md
node tests/math.test.js      # engine vs. worked examples of the notes
node tests/smoke.js          # optional: headless browser test of every page (needs Node + Playwright)
```

Node.js is needed only for these maintenance scripts, not for viewing or hosting.

## Folder structure

```
index.html, syllabus.html, simulations.html, experiments.html, practice.html, about.html, 404.html
assets/vendor/        three.js r147, OrbitControls, Chart.js 4, MathJax 3, GSAP 3 (with licences)
assets/icons/         favicon
css/                  global, dashboard, simulation, responsive
js/                   config, navigation, app (page renderer), simulation-engine, three-kit,
                      equation-engine, quiz-engine, bundle-data.js, bundle-sims.js (generated)
js/data/              course content (units, experiments, quizzes)
js/sims/              simulation definitions
units/unit-N/         unit landing page + topic-NN.html
simulations/<category>/<sim>.html   one page per simulation
experiments/unit-N/   one page per virtual experiment
quizzes/unit-N.json   question banks
docs/                 SYLLABUS_CONTENT_MAPPING, SIMULATION_CATALOG, TECHNICAL_DOCUMENTATION, QUALITY_ASSURANCE_REPORT
tools/build.js        generator
tests/                math.test.js, smoke.js, functional.js, shot.js
```

## Using a simulation

Every simulation panel has **Start/Pause/Resume**, **Reset**, **Step**, a **speed** selector (0.1×–4×), **Manual/Automatic** where meaningful, **Full screen**, **Record** (adds the current parameters and results to an observation table, downloadable as CSV) and, for 3D views, **Reset camera**. Sliders have matching number boxes for exact input. 3D views: left-drag rotates, right-drag pans, wheel/pinch zooms.

## Academic notes

* Theory and notation follow the course lecture notes (Units I–IV) and the syllabus; equation numbers such as (3.14) refer to the notes. Additional explanations not in the notes are marked **Supplementary**.
* Teaching models are labelled as such: the 6-axis arm is an educational DH model (not a vendor robot), the robot language is generic, vision classification is rule-based (no trained AI model), illustrative numbers (automation cycle times, noise-coupling magnitudes, smart-factory wear) are flagged in the simulations.
* See `docs/QUALITY_ASSURANCE_REPORT.md` for what was tested and the known limitations.
