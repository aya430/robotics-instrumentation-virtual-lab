/* navigation.js — site header, footer, theme and relative-path handling.
   All links are relative to data-root on <body>, so the site works from a
   GitHub Pages project URL (https://user.github.io/repo/) and from file://. */
(function () {
  'use strict';
  const RIL = window.RIL = window.RIL || {};
  const body = document.body;
  RIL.root = body.getAttribute('data-root') || '';
  const R = RIL.root;
  const cfg = window.RIL_CONFIG || {};
  const page = body.getAttribute('data-page') || '';
  const unitN = body.getAttribute('data-unit') || '';

  /* grouped navigation: [label, [[title, href, description, page-keys]]] */
  const NAV = RIL.NAV = [
    { label: 'Home', href: 'index.html', keys: ['home'], items: [['Home', 'index.html', 'Start page with the live 3D robot']] },
    { label: 'Course', keys: ['course', 'syllabus', 'about'], items: [['Course Overview', 'course.html', 'Outcomes, CO mapping dashboard, traceability matrix'], ['Course Syllabus', 'syllabus.html', 'Units, topics and where each is taught'], ['About', 'about.html', 'About this laboratory and the instructor']] },
    { label: 'Learn Robotics', keys: ['concepts', 'unit', 'topic', 'notes', 'sims', 'sim'], items: [['Interactive Concepts', 'concepts.html', 'DOF, frames, DH, FK, IK, Jacobian, trajectories, control'], ['Unit I', 'units/unit-1/index.html', 'Fundamentals, sensors and instrumentation'], ['Unit II', 'units/unit-2/index.html', 'Actuators, mechanisms and measurement systems'], ['Unit III', 'units/unit-3/index.html', 'Kinematics, trajectory planning and control'], ['Unit IV', 'units/unit-4/index.html', 'Automation, embedded systems and machine vision'], ['Lecture Slides', 'notes.html', 'Unit-wise slide decks'], ['All Simulations', 'simulations.html', '73 interactive 2D and 3D simulations']] },
    { label: 'Virtual Experiments', keys: ['labs', 'lab', 'flagship', 'exps', 'exp'], items: [['Virtual Experiments', 'labs.html', '18 syllabus-aligned laboratory practicals'], ['Flagship Practical', 'flagship.html', '6-DOF manipulator: design, model, simulate, report'], ['Topic Experiments', 'experiments.html', '37 single-topic experiments']] },
    { label: 'Studios', keys: ['assembly', 'workcell', 'math', 'analytics', 'hardware', 'humanoid'], items: [['Robot Assembly Studio', 'assembly.html', 'Build a robot from 3D components'], ['Experimental Workcell', 'workcell.html', 'Operate your robot in a 3D cell'], ['Mathematical Workspace', 'math.html', 'Matrices, FK, IK, Jacobian, dynamics step by step'], ['Simulation Analytics', 'analytics.html', 'Graphs and metrics of saved runs'], ['Hardware Link', 'hardware.html', 'Optional: real boards over Web Serial'], ['Humanoid Robot', 'humanoid-robot.html', 'BAIRWABOT: 3D 46-DOF humanoid virtual lab']] },
    { label: 'Reference Library', href: 'library.html', keys: ['library'], items: [['Reference Library', 'library.html', 'Course notes viewer, books and courses']] },
    { label: 'Assessment', keys: ['assessment', 'practice', 'notebook', 'reports', 'dashboard'], items: [['Assessment Centre', 'assessment.html', 'MCQ scores, attempts, CO-wise performance'], ['Practice Questions', 'practice.html', 'Unit-wise question banks'], ['Student Laboratory Notebook', 'notebook.html', 'Your notes and data for each practical'], ['Experiment Reports', 'reports.html', 'Download PDF reports'], ['Dashboard', 'dashboard.html', 'Student progress and faculty tools']] }
  ];
  const isCur = it => { const f = location.pathname.split('/').slice(-(it[1].split('/').length)).join('/'); return f === it[1] || (it[1] === 'index.html' && page === 'home'); };

  const logo = `<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="1" y="1" width="38" height="38" rx="8" fill="#13264a" stroke="#2a4677"/><path d="M8 32h24" stroke="#8fa3c4" stroke-width="2"/><rect x="12" y="27" width="10" height="5" rx="1" fill="#3b4f75"/><path d="M17 27 L14 17 L26 11" stroke="#dbe5f5" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="17" cy="27" r="2.6" fill="#f2a516"/><circle cx="14" cy="17" r="2.6" fill="#f2a516"/><circle cx="26" cy="11" r="2.6" fill="#f2a516"/><path d="M28 8l3-2M28 14l3 2" stroke="#4cc2ff" stroke-width="2" stroke-linecap="round"/></svg>`;

  const head = document.getElementById('app-head');
  if (head) {
    head.outerHTML = `<header class="site-head"><div class="wrap bar">
      <a class="brand" href="${R}index.html">${logo}<span>Robotics &amp; Instrumentation<small>Interactive Virtual Laboratory</small></span></a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">Menu</button>
      <nav class="nav2" id="site-nav" aria-label="Main">
        ${NAV.map((g, i) => g.href ? `<a href="${R}${g.href}"${g.keys.includes(page) ? ' aria-current="page"' : ''}>${g.label}</a>` : `<div class="grp${g.keys.includes(page) ? ' cur' : ''}${i > 3 ? ' right' : ''}"><button type="button" aria-expanded="false" aria-haspopup="true">${g.label}</button><div class="menu">${g.items.map(it => `<a href="${R}${it[1]}"${isCur(it) || (page === 'unit' || page === 'topic') && it[1] === 'units/unit-' + unitN + '/index.html' ? ' aria-current="page"' : ''}>${it[0]}<small>${it[2]}</small></a>`).join('')}</div></div>`).join('')}
        <div class="search" role="search"><input type="search" id="site-search" placeholder="Search the laboratory" aria-label="Search topics, experiments, simulations and notes" autocomplete="off"><div class="results" id="search-results"></div></div>
      </nav>
      <button class="fs-toggle" type="button" title="Text size" aria-label="Change text size">A±</button>
      <button class="theme-toggle" type="button" title="Switch light/dark" aria-label="Toggle colour theme">◐</button>
    </div></header>`;
    const t = document.querySelector('.nav-toggle'), n = document.getElementById('site-nav');
    t.addEventListener('click', () => { const o = n.classList.toggle('open'); t.setAttribute('aria-expanded', o); });
    const closeAll = except => n.querySelectorAll('.grp > button').forEach(b => { if (b !== except) b.setAttribute('aria-expanded', 'false'); });
    n.querySelectorAll('.grp > button').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); const o = b.getAttribute('aria-expanded') !== 'true'; closeAll(b); b.setAttribute('aria-expanded', o); }));
    document.addEventListener('click', e => { if (!e.target.closest('.grp')) closeAll(); if (!e.target.closest('.search')) res.classList.remove('open'); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeAll(); res.classList.remove('open'); } if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) { e.preventDefault(); inp.focus(); } });
    /* global search */
    const inp = document.getElementById('site-search'), res = document.getElementById('search-results'); let selI = -1;
    const esc = s => String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
    inp.addEventListener('input', () => { const q = inp.value.trim(); selI = -1; if (q.length < 2 || !RIL.LK || !RIL.LK.search) { res.classList.remove('open'); return; } const hits = RIL.LK.search(q); res.innerHTML = hits.length ? hits.map(h => `<a href="${h.url}">${esc(h.title)}<small>${esc(h.type)}</small></a>`).join('') : '<p>No match. Try a topic name such as “Jacobian” or “strain gauge”.</p>'; res.classList.add('open'); });
    inp.addEventListener('keydown', e => { const as = [...res.querySelectorAll('a')]; if (!as.length) return; if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); selI = (selI + (e.key === 'ArrowDown' ? 1 : -1) + as.length) % as.length; as.forEach((a, i) => a.classList.toggle('sel', i === selI)); as[selI].scrollIntoView({ block: 'nearest' }); } else if (e.key === 'Enter') { (as[selI] || as[0]).click(); } });
    document.querySelector('.theme-toggle').addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('ril-theme', next); } catch (e) { }
    });
    document.querySelector('.fs-toggle').addEventListener('click', () => { const order = ['', 'l', 'xl']; const cur = document.documentElement.getAttribute('data-fs') || ''; const nx = order[(order.indexOf(cur) + 1) % 3]; if (nx) document.documentElement.setAttribute('data-fs', nx); else document.documentElement.removeAttribute('data-fs'); try { localStorage.setItem('ril-fs', nx); } catch (e) { } });
  }
  try { const th = localStorage.getItem('ril-theme'); if (th) document.documentElement.setAttribute('data-theme', th); const fs = localStorage.getItem('ril-fs'); if (fs) document.documentElement.setAttribute('data-fs', fs); } catch (e) { }

  const foot = document.getElementById('app-foot');
  if (foot) {
    const inst = '';
    foot.outerHTML = `<footer class="site-foot"><div class="wrap cols">
      <div><b>Robotics &amp; Instrumentation — Interactive Virtual Learning Laboratory</b>${cfg.instructor ? '<br>Course instructor: ' + window.RIL_INSTRUCTOR_HTML() : ''}${cfg.instructorEmail ? '<br>Contact: <a href="mailto:' + cfg.instructorEmail + '">' + cfg.instructorEmail + '</a>' : ''}${cfg.academicYear ? '<br>' + cfg.academicYear : ''}</div>
      <div>Built with HTML5, Canvas, SVG, Three.js, Chart.js, MathJax, GSAP and jsPDF.<br>Runs entirely in the browser; your work is stored on this device.<br><a href="${R}course.html">Course overview</a> · <a href="${R}library.html">Reference library</a> · <a href="${R}dashboard.html">Dashboard</a> · <a href="${R}about.html">About this laboratory</a> · <a href="${R}docs/SYLLABUS_CONTENT_MAPPING.md">Syllabus mapping</a></div>
    </div></footer>`;
  }
})();
