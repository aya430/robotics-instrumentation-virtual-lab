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

  const links = [
    ['home', 'Home', 'index.html'],
    ['syllabus', 'Course Syllabus', 'syllabus.html'],
    ['u1', 'Unit I', 'units/unit-1/index.html'],
    ['u2', 'Unit II', 'units/unit-2/index.html'],
    ['u3', 'Unit III', 'units/unit-3/index.html'],
    ['u4', 'Unit IV', 'units/unit-4/index.html'],
    ['notes', 'Lecture Slides', 'notes.html'],
    ['sims', 'All Simulations', 'simulations.html'],
    ['exps', 'Virtual Experiments', 'experiments.html'],
    ['practice', 'Practice Questions', 'practice.html'],
    ['humanoid', 'Humanoid Robot', 'humanoid-robot.html'],
    ['about', 'About', 'about.html']
  ];
  const cur = page === 'home' ? 'home' : (page === 'unit' || page === 'topic') ? 'u' + unitN : page === 'sim' || page === 'sims' ? 'sims' : page === 'exp' || page === 'exps' ? 'exps' : page;

  const logo = `<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="1" y="1" width="38" height="38" rx="8" fill="#13264a" stroke="#2a4677"/><path d="M8 32h24" stroke="#8fa3c4" stroke-width="2"/><rect x="12" y="27" width="10" height="5" rx="1" fill="#3b4f75"/><path d="M17 27 L14 17 L26 11" stroke="#dbe5f5" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="17" cy="27" r="2.6" fill="#f2a516"/><circle cx="14" cy="17" r="2.6" fill="#f2a516"/><circle cx="26" cy="11" r="2.6" fill="#f2a516"/><path d="M28 8l3-2M28 14l3 2" stroke="#4cc2ff" stroke-width="2" stroke-linecap="round"/></svg>`;

  const head = document.getElementById('app-head');
  if (head) {
    head.outerHTML = `<header class="site-head"><div class="wrap bar">
      <a class="brand" href="${R}index.html">${logo}<span>Robotics &amp; Instrumentation<small>Interactive Virtual Learning Laboratory</small></span></a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">Menu</button>
      <nav class="nav" id="site-nav" aria-label="Main">${links.map(([k, l, h]) => `<a href="${R}${h}"${k === cur ? ' aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
      <button class="theme-toggle" type="button" title="Switch light/dark theory pages" aria-label="Toggle colour theme">◐</button>
    </div></header>`;
    const t = document.querySelector('.nav-toggle'), n = document.getElementById('site-nav');
    t.addEventListener('click', () => { const o = n.classList.toggle('open'); t.setAttribute('aria-expanded', o); });
    document.querySelector('.theme-toggle').addEventListener('click', () => {
      const curT = document.documentElement.getAttribute('data-theme');
      const dark = curT ? curT === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
      const next = dark ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('ril-theme', next); } catch (e) { }
    });
  }
  try { const th = localStorage.getItem('ril-theme'); if (th) document.documentElement.setAttribute('data-theme', th); } catch (e) { }

  const foot = document.getElementById('app-foot');
  if (foot) {
    const inst = '';
    foot.outerHTML = `<footer class="site-foot"><div class="wrap cols">
      <div><b>Robotics &amp; Instrumentation — Interactive Virtual Learning Laboratory</b>${cfg.instructor ? '<br>Course instructor: ' + window.RIL_INSTRUCTOR_HTML() : ''}${cfg.instructorEmail ? '<br>Contact: <a href="mailto:' + cfg.instructorEmail + '">' + cfg.instructorEmail + '</a>' : ''}${cfg.academicYear ? '<br>' + cfg.academicYear : ''}</div>
      <div>Built with HTML5, Canvas, SVG, Three.js, Chart.js, MathJax and GSAP.<br>Runs entirely in the browser; no login or server needed.<br><a href="${R}notes.html">Lecture slides</a> · <a href="${R}about.html">About this laboratory</a> · <a href="${R}docs/SYLLABUS_CONTENT_MAPPING.md">Syllabus mapping</a></div>
    </div></footer>`;
  }
})();
