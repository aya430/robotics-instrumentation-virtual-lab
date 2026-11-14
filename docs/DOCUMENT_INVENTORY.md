# Document Inventory

All academic source documents found in the project folder. Page counts are from the files themselves.

| Filename | Format | Subject | Unit | Related practicals | Content | Page references |
|---|---|---|---|---|---|---|
| `Robotics and Instrumentation.docx` | DOCX | Course syllabus | all | all | Course title, code M26TJS01XX, 3 credits, II semester, 42 hours; overview, objectives, six COs with POs/PSOs and Bloom level, four units, text and reference books, NPTEL and MathWorks Onramp courses | not paginated |
| `Unit Wise Detailed Notes.pdf` | PDF, 228 pages | Lecture notes, Dr Bansilal Bairwa (dated 9 November 2026; cover carries code M26TJ511X) | I–IV | 1–18 | Sections 1.1–1.21, 2.1–2.23, 3.1–3.20, 4.1–4.28 with derivations, worked examples, algorithms, MATLAB programs, question banks | Printed pages 1–207; PDF page = printed page + 21. Unit I pp. 3–74, Unit II pp. 75–119, Unit III pp. 120–158, Unit IV pp. 159–207 |
| `R&I  Unit 1.pdf` | PDF, 109 slides | Lecture slides | I | 1–4 | Robotics fundamentals, anatomy, DOF, work envelope, measurement systems, static and dynamic characteristics, sensors, temperature, pressure, force and strain | slides 1–109 |
| `R&I  Unit 2.pdf` | PDF, 70 slides | Lecture slides | II | 5–7 | Actuators, motors, joints and transmissions, manipulators, grippers, signal conditioning, filters, ADC/DAC, DAQ | slides 1–70 |
| `R&I  Unit 3.pdf` | PDF, 65 slides | Lecture slides | III | 8–14 | Transformations, DH, forward and inverse kinematics, Jacobian, singularities, trajectories, statics, dynamics, control | slides 1–65 |
| `R&I  Unit 4.pdf` | PDF, 74 slides | Lecture slides | IV | 15–18 | Automation, workcells, PLC, robot programming, embedded systems, PWM, interfaces, machine vision, applications | slides 1–74 |

Not found in the folder: textbook extracts, experiment manuals, research papers, MATLAB/Simulink files, 3D models. The Reference Library has an upload facility for further PDFs.

## How the documents are used

- **Syllabus** → `js/data/00-course.js`, `RIL.courseInfo` in `js/data/z-labs.js`, the Course Overview page.
- **Notes** → topic modules (`js/data/u1.js`–`u4.js`, written earlier from these notes), the theory shown in each practical, and the page map `js/data/z-refs.js`.
- **Slides** → flipbook images in `notes/` and the slide number of each section in `js/data/z-refs.js`.

## Section-to-page map

`tools/make_refs.py` reads the table of contents of the notes PDF and the first line of every slide; it writes `js/data/z-refs.js` (92 sections: title, printed page, first slide) and `reference/notes-index.js` (page text for search). No page number is typed by hand. Sections 1.20, 1.21, 2.22, 2.23, 3.19, 3.20, 4.20, 4.27 and 4.28 have no slide whose title starts with their number, so they carry no slide link.

## Practical-to-source map

| Exp. | Notes sections | Printed pages (start) |
|---|---|---|
| 1 | 1.2–1.6 | 6, 10, 11, 13, 16 |
| 2 | 1.7–1.10, 1.12, 1.14 | 19, 21, 30, 34, 40, 43 |
| 3 | 1.11, 1.8 | 34, 21 |
| 4 | 1.18, 1.15 | 54, 45 |
| 5 | 2.4–2.7 | 80, 83, 84, 87 |
| 6 | 2.9–2.11, 2.8 | 90, 92, 92, 88 |
| 7 | 2.14–2.20 | 96, 98, 99, 101, 103, 105, 107 |
| 8 | 3.1–3.3 | 120, 121, 124 |
| 9 | 3.4 | 126 |
| 10 | 3.5, 3.9 | 128, 136 |
| 11 | 3.6, 3.9 | 130, 136 |
| 12 | 3.7, 3.8, 3.13 | 132, 135, 141 |
| 13 | 3.10–3.12 | 136, 139, 139 |
| 14 | 3.14–3.17 | 142, 143, 145, 146 |
| 15 | 4.7–4.12 | 169, 170, 170, 172, 173, 175 |
| 16 | 4.1–4.6 | 159, 160, 162, 166, 166, 167 |
| 17 | 4.13–4.20 | 176, 177, 179, 180, 181, 183, 185, 186 |
| 18 | 4.21–4.25, 4.2 | 187, 187, 189, 189, 190, 160 |
