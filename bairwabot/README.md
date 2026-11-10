# BAIRWABOT – Humanoid Robotics Virtual Lab

An interactive 3D learning environment for humanoid robotics, artificial intelligence,
motion planning and human-robot interaction.

Concept and Educational Direction: **Dr. Bansilal Bairwa**

---

## 1. What is included

| Feature | Where |
|---|---|
| One reusable 3D humanoid (≈ 1.72 m, white/silver shell, dark joints, cyan LEDs, expressive face, five-finger hands) | `js/robot.js` |
| 46-DOF conceptual rig with named joints and limits (neck 3, torso 3, arms 2×8, hands 2×6, legs 2×6) | `js/robot.js` |
| Animation engine: state blending, gait generators (walk, jog, run, turn, side-step), footstep planner (stairs), damped-least-squares arm IK, flat-foot and no-slip stance constraints, ground contact | `js/motion.js` |
| CoM (21-segment mass model), CoP/ZMP, support polygon, foot pressure, IMU tilt, end-effector coordinates, gravity torques | `js/motion.js` |
| 30 working module simulations + interactive experiments, direct command actions | `js/scripts.js` |
| Environments: chair, stairs, table with 5 objects, people, obstacles, indoor map (A*), door, desk (switch, lamp, keyboard, phone, cup, screwdriver), care room, hospital corridor, whiteboard | `js/world.js` |
| Educational content for every module (15 sections each) and 150 quiz questions | `js/content-a.js`, `js/content-b.js` |
| Text-to-speech, speech recognition, voice commands (English + Hindi), knowledge base, optional AI backend hook | `js/voice.js`, `js/config.js` |
| UI: navigation, Learn / Live Data / Talk / Control / Quiz tabs, body-structure explorer with exploded view, DOF explorer, FK/IK lab, sensor cards, 2D engineering view | `js/ui.js`, `css/bairwabot.css` |

Everything runs in the browser. No build step, no server-side code and no external
CDN is needed – three.js (MIT licence) is bundled in `js/vendor/three.bundle.js`.

## 2. Running it locally

Speech recognition and the microphone only work on `https://` pages or on `localhost`,
so open the lab through a small local web server rather than by double-clicking the file:

```bash
cd bairwabot
python -m http.server 8000
# then open http://localhost:8000/
```

(Any static server works: `npx serve`, VS Code Live Server, XAMPP, etc.)

## 3. Adding it to an existing website

The lab is a self-contained folder. All paths inside it are relative, so it works in any
sub-folder of your site and does not touch any other page.

1. Upload the whole `bairwabot/` folder to your site, e.g. `https://your-site/bairwabot/`.
2. Link to it from your menu:

   ```html
   <a href="bairwabot/index.html">BAIRWABOT Virtual Lab</a>
   ```

3. **Or** embed it inside an existing page with an iframe (see `embed-example.html`):

   ```html
   <iframe src="bairwabot/index.html" title="BAIRWABOT – Humanoid Robotics Virtual Lab"
           style="width:100%;height:90vh;border:0;border-radius:12px"
           allow="microphone; autoplay; fullscreen" allowfullscreen></iframe>
   ```

   The `allow="microphone"` attribute is required for voice commands inside an iframe.

Hosting notes

* The site must be served over **HTTPS** for the microphone to work (GitHub Pages,
  Netlify, institutional web servers with TLS, etc.).
* No special MIME types or server configuration are needed.
* Total size ≈ 1 MB (three.js ≈ 0.75 MB). Gzip/Brotli compression on the server reduces it further.

## 4. Browser support

| Capability | Chrome / Edge | Safari | Firefox |
|---|---|---|---|
| 3D lab, all modules, quizzes | ✔ | ✔ | ✔ |
| Speech output (TTS) | ✔ | ✔ | ✔ |
| Voice commands (speech recognition) | ✔ | ✔ (macOS/iOS) | ✘ – use the text box |
| Hindi voice | if a Hindi voice is installed in the OS/browser | same | same |

If the microphone is unavailable or permission is denied, the lab shows the reason and
all commands can be typed in the Talk tab or clicked in the Control tab.

## 5. Optional AI backend for open-ended questions

Basic commands and the built-in knowledge base work without any AI service. To answer
open-ended questions, create your **own server-side endpoint** and put its URL in
`js/config.js`:

```js
AI_ENDPOINT: 'https://your-server.example/bairwabot-ask'
```

The page sends `POST {"question": "...", "language": "en"}` and expects `{"answer": "..."}`.
The endpoint calls the AI provider using a key stored on the server.
**Never put an API key in any file in this folder** – everything here is visible to visitors.

## 6. Controls

* Mouse: drag = rotate, wheel = zoom, right-drag = pan. Touch: one finger rotate, pinch zoom, two-finger pan.
* Bottom bar: Play, Pause (Space), Stop, Reset, Slow (0.25×), speed 0.25–2×, 2D/3D, Wireframe, Joints, Skeleton, Balance markers, X-ray, Mute.
* View buttons: Front, Side, Rear, 3/4, Top, Face, 360° orbit, Follow camera.
* Clicking the robot in the Body Structure page selects that assembly.
* Module 19: click on the floor to set a navigation goal.

## 7. About the values shown

* Values marked **MODEL** are computed every frame from the animated kinematic model
  (joint angles, angular velocity/acceleration, positions, velocities, CoM, CoP, contacts,
  end-effector coordinates).
* Values marked **SIM** are illustrative (battery level, segment masses and gravity
  torques of the conceptual mass model, detection confidence scores, grip force,
  sensor status). They are not measurements from a physical robot.
* The 46 DOF are conceptual articulation values. The hand rig is built with three
  phalanges per finger, so per-joint finger DOF (12 per hand) can be added in `robot.js`.

## 8. Implementation notes (honest scope)

* The robot is built procedurally in three.js from rounded primitives arranged in a
  named joint hierarchy (a rigid-body rig – each link is a child of its parent joint).
  It is not a GLTF/GLB file. The rig is equivalent to a skeletal rig for animation,
  IK and joint visualisation. To replace the body with a detailed Blender model,
  export a GLB with matching bone names and attach the meshes to the same joint nodes.
* Facial animation uses a parametric face (eyes, brows, segmented mouth) driven by
  blend weights – the same mathematics as morph targets.
* Lip sync follows the speech audio timing (sentence and word-boundary events) with a
  syllable-rate mouth envelope; it is not phoneme-accurate viseme mapping.
* Object recognition, person detection and confidence values are simulated; no neural
  network runs in the browser.
* Locomotion is kinematic (gait generator + contact constraints), not a full physics
  simulation; balance quantities are computed from the resulting motion.
* ROS 2 / hardware are not required.

## 9. File structure

```
bairwabot/
├── index.html              page layout
├── embed-example.html      how to embed the lab in another page
├── README.md
├── css/bairwabot.css       styles (dark navy / cyan theme, responsive)
└── js/
    ├── vendor/three.bundle.js   three.js r187 + OrbitControls, RoundedBoxGeometry, RoomEnvironment
    ├── vendor/THREE-LICENSE.txt
    ├── config.js           site settings (AI endpoint, greeting, default language)
    ├── robot.js            BAIRWABOT model, 46-DOF rig, face, sensors
    ├── motion.js           animation engine, gait, IK, balance computations
    ├── world.js            scene, environments, props, overlays
    ├── content-a.js        modules 01–15 content and quizzes
    ├── content-b.js        modules 16–30 content and quizzes
    ├── voice.js            speech synthesis / recognition, commands, knowledge base
    ├── scripts.js          module simulations, experiments, command actions
    └── ui.js               lab controller and user interface
```

## 10. Editing content

* Module text and quiz questions: `js/content-a.js`, `js/content-b.js`
  (quiz format: `[question, [A, B, C, D], indexOfCorrect, explanation]`).
* Knowledge-base answers and voice commands: `KB` and `CMDS` in `js/voice.js`.
* Footer and titles: `index.html`.
