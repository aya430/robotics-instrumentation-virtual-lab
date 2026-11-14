# Development Roadmap

## Done in this release

| Phase | Result |
|---|---|
| 1 Inspection and architecture | Audit, inventory, backup, white design system, grouped navigation, search |
| 2 Educational website | Course Overview, CO cards and dashboard, traceability matrix, Reference Library (existing topic pages kept) |
| 3 Interactive mathematics | Interactive Concepts index; Mathematical Workspace (FK, IK, Jacobian, dynamics, trajectory, transforms, matrices, numerical methods) |
| 4 Assembly Studio | Component library, drag and drop, snapping to the chain, properties, validation, undo/redo, save/load/export |
| 5 Workcell | Table, conveyor, bins, obstacle, camera, proximity sensor, safety boundary, teach pendant, IK target |
| 6 Simulation engine | Kinematic and dynamic models, three control laws, collision checks, four task programs |
| 7 Experiments | 18 practicals configured on the shared simulations |
| 8 Analytics | Live graphs in the Workcell; Simulation Analytics on saved runs |
| 9 Reference and assessment | Page-mapped notes, 90 MCQs, attempts, CO performance |
| 10 Reports | PDF report, CSV, graph PNG, notebook |
| 11 Advanced integrations | Web Serial monitor only |
| 12 Testing | 165 numeric checks, build checks, browser run of every page and of the main workflows |

## Next steps, in suggested order

1. **Instructor review of content**: the 90 MCQs and the 36 worked substitutions should be read once by the course instructor.
2. **Real-browser checks**: Firefox, Edge, a tablet; a low-end laboratory PC for 3D frame rate.
3. **Deployment**: push the folder to GitHub Pages or the university server; decide whether `reference/Unit-Wise-Detailed-Notes.pdf` should be public.
4. **Backend (optional)**: accounts, central storage of submissions and a faculty review queue (for example FastAPI + PostgreSQL). The export file format (`ril-student-work`) is the natural upload payload.
5. **AI learning assistant (optional)**: needs a server-side LLM key; ground it on `reference/notes-index.js` and let it call `RIL.RM` for every numeric answer.
6. **Physics (optional)**: Rapier for contact, friction grip and conveyor transport.
7. **Model import**: GLB/STL link meshes on the twin; URDF export.
8. **Vision**: render the Workcell camera view to an image and run the existing image-processing pipeline on it.
9. **Accessibility audit**: axe-core and Lighthouse runs; screen-reader pass of the studios.
