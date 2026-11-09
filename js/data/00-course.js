/* Course information — from the course syllabus document (Robotics and Instrumentation.docx) */
(function () {
  const RIL = window.RIL = window.RIL || {};
  RIL.units = RIL.units || [];
  RIL.quiz = RIL.quiz || {};
  RIL.experiments = RIL.experiments || [];
  RIL.course = {
    overview: [
      'Familiarize students with the fundamental concepts, components, configurations, and applications of robotics and automation.',
      'Develop an understanding of sensors, transducers, measurement systems, actuators, and robot mechanisms.',
      'Introduce robot kinematics, trajectory planning, dynamics, and basic control techniques.',
      'Explore industrial automation, embedded systems, and machine vision for robotic applications.'
    ],
    objectives: [
      'To understand the fundamentals, components, classification, and applications of robotic systems.',
      'To understand the principles and applications of sensors, transducers, actuators, and measurement systems.',
      'To analyze robot kinematics, trajectory planning, dynamics, and basic control methods.',
      'To understand the integration of embedded systems, PLCs, and communication interfaces in robotics.',
      'To introduce machine vision and industrial robotic applications for smart manufacturing and automation.'
    ],
    outcomes: [
      ['CO1', 'Explain the fundamentals of robotics, robot configurations, sensors, transducers, and measurement systems used in robotic applications.', 'Understand (L2)'],
      ['CO2', 'Analyze the characteristics and selection of sensors, actuators, measurement systems, signal conditioning, and data acquisition systems for robotic applications.', 'Analyze (L4)'],
      ['CO3', 'Apply coordinate transformations, DH parameters, forward and inverse kinematics, Jacobian, and trajectory planning techniques to robotic manipulators.', 'Apply (L3)'],
      ['CO4', 'Analyze robot dynamics and implement basic control techniques, embedded systems, PLCs, and sensor–actuator interfaces for robotic systems.', 'Apply (L3)'],
      ['CO5', 'Apply machine vision and image-processing concepts for object detection, recognition, inspection, and robotic automation applications.', 'Apply (L3)'],
      ['CO6', 'Integrate robotics, instrumentation, embedded systems, automation, and machine vision concepts for industrial robotic applications.', 'Create (L6)']
    ],
    textbooks: [
      'R. K. Mittal and I. J. Nagrath, <i>Robotics and Control</i>, 1st ed. New Delhi, India: Tata McGraw-Hill Education, 2017.',
      'S. B. Niku, <i>Introduction to Robotics: Analysis, Control, Applications</i>, 3rd ed. Hoboken, NJ, USA: Wiley, 2020.',
      'R. K. Jain, <i>Mechanical and Industrial Measurements</i>, 12th ed. New Delhi, India: Khanna Publishers, 2018.',
      'K. Sawhney and A. K. Sawhney, <i>A Course in Electrical and Electronic Measurements and Instrumentation</i>, 19th ed. New Delhi, India: Dhanpat Rai &amp; Co., 2018.',
      'R. K. Rajput, <i>Robotics and Industrial Automation</i>, 1st ed. New Delhi, India: S. Chand Publishing, 2018.'
    ],
    references: [
      'J. J. Craig, <i>Introduction to Robotics: Mechanics and Control</i>, 4th ed. Boston, MA, USA: Pearson, 2018.',
      'B. Siciliano, L. Sciavicco, L. Villani, and G. Oriolo, <i>Robotics: Modelling, Planning and Control</i>. London, U.K.: Springer, 2009.',
      'M. W. Spong, S. Hutchinson, and M. Vidyasagar, <i>Robot Modeling and Control</i>. Hoboken, NJ, USA: Wiley, 2006.',
      'D. A. Bradley, D. W. Seward, D. Dawson, and S. Burge, <i>Mechatronics and the Design of Intelligent Machines</i>. Cheltenham, U.K.: Stanley Thornes, 2000.',
      'W. Bolton, <i>Mechatronics: Electronic Control Systems in Mechanical and Electrical Engineering</i>, 7th ed. Harlow, U.K.: Pearson, 2021.'
    ],
    nptel: [
      'Introduction to Robotics, IIT Kanpur – Prof. Ashish Dutta.',
      'Introduction to Robotics, IIT Madras – Prof. Asokan T., Prof. Balaraman Ravindran and Prof. Krishna Vasudevan.',
      'Measurement and Instrumentation, IIT Guwahati – Prof. Ravindra Kumar Jha.',
      'Industrial Automation and Control, IIT Kharagpur – Prof. S. Mukhopadhyay and Prof. S. Sen.',
      'Industrial Robotics: Theories for Implementation, IIT (ISM) Dhanbad – Prof. Arun Dayal Udai.'
    ]
  };
  /* unit slide decks rendered as page images in notes/unit-N/pNNN.webp (tools: notes-build/make.py) */
  RIL.notes = [{"n": 1, "title": "Unit I: Fundamentals of Robotics, Sensors and Instrumentation", "pages": 109}, {"n": 2, "title": "Unit II: Actuators, Robot Mechanisms and Measurement Systems", "pages": 70}, {"n": 3, "title": "Unit III: Robot Kinematics, Trajectory Planning and Control", "pages": 65}, {"n": 4, "title": "Unit IV: Industrial Automation, Embedded Systems and Machine Vision", "pages": 74}];
  RIL.aboutHtml = `
  <section><h2>Purpose</h2><p>This laboratory turns the four-unit Robotics and Instrumentation syllabus into working models. Each topic module follows the course notes for its definitions, notation, derivations and worked examples, and pairs them with a simulation whose numbers are computed from the same equations.</p></section>
  <section><h2>Sources</h2><p>Academic content follows the course lecture notes (Units I–IV), the unit slide decks and the course syllabus. Equation numbers such as (3.11) refer to the notes. Where the notes do not cover a detail that a simulation needs, the extra explanation is marked <span class="badge supp">Supplementary</span> and shown in a purple box.</p></section>
  <section><h2>Modelling assumptions</h2><p>Simulations use the idealised models of the notes: rigid links, point masses where stated, linear sensor models unless a non-linear equation is given, ideal converters and simplified motor electrical dynamics. Teaching models (for example the six-axis arm, the educational robot language and the mobile robot planner) are labelled as such and are not manufacturer controllers.</p></section>
  <section><h2>Technology</h2><p>HTML5, CSS3 and JavaScript with Three.js r147 (3D), the Canvas API (2D), SVG diagrams, Chart.js 4 (graphs), MathJax 3 (equations) and GSAP 3 (transitions). All libraries are bundled in <code>assets/vendor</code>, so the site runs without a server and without internet access (web fonts fall back to system fonts offline).</p></section>
  <section><h2>Using the simulations</h2><p>Every simulation has Start/Pause/Resume, Reset, Step, a speed selector, Full screen and Record. 3D views rotate with the mouse (left drag), pan (right drag) and zoom (wheel or pinch); <b>Reset camera</b> restores the view. Record adds the current parameters and results to an observation table that can be downloaded as CSV.</p></section>`;
})();
