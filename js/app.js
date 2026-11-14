/* app.js — renders every page type from the data files.
   Page type is taken from <body data-page>. */
(function () {
  'use strict';
  const RIL = window.RIL;
  const R = RIL.root;
  const body = document.body;
  const page = body.getAttribute('data-page');
  const main = document.getElementById('main');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const units = RIL.units || [];
  const allTopics = () => units.flatMap(u => u.topics.map(t => Object.assign({ unit: u.n }, t)));
  const topicUrl = (u, t) => `${R}units/unit-${u}/topic-${String(t.n).padStart(2, '0')}.html`;
  const simUrl = id => { const s = RIL.sims[id]; return s ? `${R}simulations/${s.category}/${id}.html` : '#'; };
  const expUrl = e => `${R}experiments/unit-${e.unit}/${e.id}.html`;
  const kindBadge = id => { const s = RIL.sims[id]; if (!s) return ''; return `<span class="badge ${s.kind === '3d' ? 'd3' : 'd2'}">${s.kind === '3d' ? '3D' : s.kind === 'html' ? 'Interactive' : '2D'}</span>`; };
  const typeset = el => { if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise(el ? [el] : undefined).catch(() => { }); };
  RIL.typeset = typeset;

  function unitSims(u) { const s = new Set(); u.topics.forEach(t => (t.sims || []).forEach(x => s.add(x))); return [...s]; }

  /* instructor card (photo, name, LinkedIn, e-mail) */
  function instructorCard() {
    const c = window.RIL_CONFIG || {}; if (!c.instructor) return '';
    return `<div class="inst-card">${c.instructorPhoto ? `<img src="${R}${c.instructorPhoto}" alt="${esc(c.instructor)}" width="120" height="120" loading="lazy">` : ''}
      <div><span class="eyebrow">Course instructor</span><h3>${window.RIL_INSTRUCTOR_HTML()}</h3><p class="muted">${esc(c.courseTitle)}</p>
      ${c.instructorEmail ? `<p><a class="mail" href="mailto:${c.instructorEmail}">${esc(c.instructorEmail)}</a></p>` : ''}
      ${c.instructorLinkedIn ? `<p><a class="btn ghost sm" href="${c.instructorLinkedIn}" target="_blank" rel="noopener noreferrer">LinkedIn profile</a></p>` : ''}</div></div>`;
  }
  const notesUrl = n => `${R}notes.html#unit-${n}`;
  function slidesSection() {
    const N = RIL.notes || []; if (!N.length) return '';
    return `<section class="home-section"><h2>Lecture slides</h2>
      <p class="muted">The unit slide decks as a page-turning flipbook. <b>For study purposes only.</b></p>
      <div class="slides-grid">${N.map(d => { const u = units.find(x => x.n === d.n) || {}; return `<a class="slide-card" href="${notesUrl(d.n)}"><img src="${R}notes/unit-${d.n}/p001.webp" alt="" loading="lazy" width="320" height="180"><span><b>Unit ${u.roman || d.n}</b> ${esc(d.title.replace(/^Unit [IVX]+:\s*/, ''))}<small>${d.pages} pages</small></span></a>`; }).join('')}</div></section>`;
  }

  /* ---------------- HOME ---------------- */
  function renderHome() {
    const hero = document.createElement('section'); hero.className = 'hero';
    const totalSims = Object.keys(RIL.sims).length, totalTopics = allTopics().length;
    hero.innerHTML = `<div class="wrap grid">
      <div>
        <h1>Robotics &amp; Instrumentation<span>Interactive Virtual Learning Laboratory</span></h1>
        <p class="tagline">Visualize | Simulate | Experiment | Understand</p>
        <p class="lead">Every topic of the four-unit syllabus is taught here through working models: move a joint and the forward-kinematics numbers change, raise the ADC resolution and the quantisation staircase shrinks, retune a PID gain and the response graph redraws. ${totalTopics} topic modules, ${totalSims} simulations and ${(RIL.labs || []).length} laboratory practicals with reports.</p>
        <div class="actions"><a class="btn amber" href="${R}units/unit-1/index.html">Start with Unit I</a><a class="btn ghost" href="${R}simulations.html">Browse all simulations</a><a class="btn ghost" href="${R}labs.html">18 virtual experiments</a><a class="btn ghost" href="${R}assembly.html">Build a robot</a></div>
        <p class="inst-line">Course: ${esc(RIL_CONFIG.courseTitle)}${RIL_CONFIG.instructor ? ' · Instructor: ' + window.RIL_INSTRUCTOR_HTML() : ''}</p>
      </div>
      <div class="hero-stage" id="hero-stage" aria-label="Live 6-DOF robot with forward kinematics readout"><div class="hero-readout" id="hero-ro"></div></div>
    </div>`;
    main.before(hero);
    main.innerHTML = `<section class="home-section"><h2>Course units</h2>
      <p class="muted">The units build on each other: sensing and measurement first, then actuation and signal processing, then the mathematics of manipulator motion, and finally complete automated systems.</p>
      <ol class="units-list">${units.map(u => `<li class="unit-row">
        <div class="unit-num" aria-hidden="true">${u.roman}</div>
        <div><h3><a href="${R}units/unit-${u.n}/index.html" style="color:inherit;text-decoration:none">Unit ${u.roman} – ${esc(u.title)}</a></h3><p>${u.desc}</p>
          <div class="unit-topics">${u.topics.map(t => `<a href="${topicUrl(u.n, t)}">${esc(t.title)}</a>`).join('')}</div></div>
        <div class="unit-stats"><div class="stat">Topics <b>${u.topics.length}</b></div><div class="stat">Simulations <b>${unitSims(u).length}</b></div><div class="stat">Experiments <b>${(RIL.experiments || []).filter(e => e.unit === u.n).length}</b></div><div class="stat">Practice questions <b>${(RIL.quiz && RIL.quiz[u.n] || []).length}</b></div>
          <a class="btn" href="${R}units/unit-${u.n}/index.html" style="justify-content:center;margin-top:6px">Explore Unit ${u.roman}</a></div>
      </li>`).join('')}</ol></section>
      <section class="home-section"><h2>How each topic is taught</h2><div class="how-grid">
        <div><h4>Theory from the notes</h4><p>Definitions, derivations and worked examples follow the course notes and keep their notation and equation numbers.</p></div>
        <div><h4>Working model</h4><p>Each simulation computes its outputs from the stated equations; the numbers on screen are the model's numbers.</p></div>
        <div><h4>Virtual experiment</h4><p>Record observations into a table, export them as CSV and compare with the theory.</p></div>
        <div><h4>Check yourself</h4><p>Unit quizzes with numerical problems give feedback and explanations only after you submit.</p></div>
      </div></section>
      ${slidesSection()}
      <section class="home-section"><h2>Humanoid Robot – BAIRWABOT Virtual Lab</h2>
        <p class="muted">A 3D 46-DOF humanoid with 30 modules on gait, inverse kinematics, balance (CoM and ZMP), perception and human-robot interaction, including voice commands in English and Hindi.</p>
        <div class="actions" style="display:flex;flex-wrap:wrap;gap:10px"><a class="btn amber" href="${R}humanoid-robot.html">Explore the humanoid robot</a><a class="btn ghost" href="${R}bairwabot/index.html">Open the lab full screen</a></div></section>
      <section class="home-section">${instructorCard()}</section>`;
    heroRobot();
  }
  function heroRobot() {
    const stage = document.getElementById('hero-stage'); if (!window.THREE || !RIL.three) return;
    const K = RIL.three, M = RIL.M;
    const tk = K.create(stage, { position: [1.9, -1.9, 1.35], target: [0.15, 0, 0.55], gridSize: 3, gridDiv: 15 });
    tk.controls.enableZoom = false;
    const rob = new K.DHRobot(tk.scene, K.ROBOTS.sixR.table, { radius: 0.05, frames: false });
    const tf = K.frame(0.18); tk.scene.add(tf);
    const trail = []; const line = K.polyline([[0, 0, 0]], 0xf2a516); tk.scene.add(line);
    const ro = document.getElementById('hero-ro');
    const resize = () => { const r = stage.getBoundingClientRect(); tk.resize(r.width, r.height); };
    resize(); new ResizeObserver(resize).observe(stage);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let t = 0, last = performance.now();
    function frame(now) {
      const dt = Math.max(0, Math.min(.05, (now - last) / 1000)); last = now; if (!reduce) t += dt;
      const q = [0.9 * Math.sin(0.35 * t), 0.5 + 0.35 * Math.sin(0.5 * t + 1), -0.4 + 0.45 * Math.sin(0.45 * t), 0.8 * Math.sin(0.6 * t), 0.7 + 0.5 * Math.sin(0.7 * t + 0.5), 1.2 * Math.sin(0.3 * t)];
      const T = rob.update(q); K.applyT(tf, T[6]);
      const p = M.pof(T[6]); trail.push(p); if (trail.length > 260) trail.shift(); if (trail.length > 2) K.updateLine(line, trail);
      ro.innerHTML = `<div style="color:#dbe5f5;font-weight:650;margin-bottom:4px">Live forward kinematics, 6-DOF arm</div>` + q.map((v, i) => `<div><span>θ<sub>${i + 1}</sub></span><b>${(v * M.R2D).toFixed(1)}°</b></div>`).join('') + `<div><span>TCP x, y, z</span><b>${p.map(v => v.toFixed(3)).join(', ')} m</b></div>`;
      tk.render(); requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---------------- UNIT LANDING ---------------- */
  function renderUnit() {
    const n = +body.getAttribute('data-unit'); const u = units.find(x => x.n === n); if (!u) return;
    const exps = (RIL.experiments || []).filter(e => e.unit === n);
    main.innerHTML = `<div class="crumbs"><a href="${R}index.html">Home</a> / Unit ${u.roman}</div>
      <header class="page-head"><span class="unit-tag">Unit ${u.roman}</span><h1>${esc(u.title)}</h1><p>${u.desc}</p>
      <p class="muted" style="font-size:.95rem">${u.topics.length} topics, ${unitSims(u).length} simulations, ${exps.length} virtual experiments. Syllabus text: <em>${esc(u.syllabus)}</em></p></header>
      <ol class="topic-list">${u.topics.map(t => `<li class="topic-item"><span class="n">${t.n}</span><div><h3><a href="${topicUrl(n, t)}">${esc(t.title)}</a></h3><p>${t.blurb || ''}</p><div class="sims">${(t.sims || []).map(id => RIL.sims[id] ? `<a href="${simUrl(id)}" class="badge ${RIL.sims[id].kind === '3d' ? 'd3' : 'd2'}" style="text-decoration:none">${esc(RIL.sims[id].title)}</a>` : '').join('')}</div></div><a class="btn ghost go" href="${topicUrl(n, t)}">Open topic</a></li>`).join('')}</ol>
      <h2 style="margin-top:36px">Virtual experiments for this unit</h2>
      <div class="catalog">${exps.map(e => expCard(e)).join('')}</div>
      <p style="margin-top:24px"><a class="btn" href="${R}practice.html#unit-${n}">Practice questions for Unit ${u.roman}</a> <a class="btn ghost" href="${notesUrl(n)}">Lecture slides for Unit ${u.roman}</a></p>`;
  }

  /* ---------------- TOPIC ---------------- */
  function renderTopic() {
    const n = +body.getAttribute('data-unit'); const tid = body.getAttribute('data-topic');
    const u = units.find(x => x.n === n); const t = u && u.topics.find(x => x.id === tid); if (!t) { main.innerHTML = '<p>Topic not found.</p>'; return; }
    const idx = u.topics.indexOf(t), prev = u.topics[idx - 1], next = u.topics[idx + 1];
    const S = [];
    const sec = (id, title, html, cls = '') => { if (!html) return; S.push({ id, title }); return `<section id="${id}" class="${cls}"><h2>${title}</h2>${html}</section>`; };
    const list = (a, cls = '') => a && a.length ? `<ul class="${cls}">${a.map(x => `<li>${x}</li>`).join('')}</ul>` : '';
    const sims = t.sims || [];
    let model = '';
    if (t.model && t.model.length) {
      model = t.model.map(m => `${m.title ? `<h3>${m.title}</h3>` : ''}${m.text ? `<p>${m.text}</p>` : ''}${m.tex ? `<div class="eq-block">\\[${m.tex}\\]</div>` : ''}${m.vars ? `<div class="table-scroll"><table class="data var-table"><tr><th>Symbol</th><th>Meaning</th><th>Unit</th></tr>${m.vars.map(v => `<tr><td>\\(${v[0]}\\)</td><td>${v[1]}</td><td>${v[2] || '–'}</td></tr>`).join('')}</table></div>` : ''}`).join('');
    }
    const examples = (t.examples || []).map(e => `<div class="callout example"><b>${e.title}</b><br>${e.body}</div>`).join('');
    const html = [
      sec('intro', 'Introduction', `<p>${t.intro}</p>${t.refs ? `<p class="src">Source in course notes: ${t.refs}</p>` : ''}`),
      sec('objectives', 'Learning objectives', list(t.objectives, 'objectives')),
      sec('theory', 'Fundamental theory', t.theory),
      sec('principle', 'Physical working principle', t.principle),
      sec('diagram', 'Engineering diagram', t.diagram ? `<figure class="diagram">${t.diagram}${t.diagramCaption ? `<figcaption>${t.diagramCaption}</figcaption>` : ''}</figure>` : ''),
      sec('model', 'Mathematical modelling', model + examples),
      sec('simulation', sims.length > 1 ? 'Animated visualisation and interactive simulations' : 'Animated visualisation and interactive simulation', sims.length ? `<p>${t.simIntro || 'Use the controls to change the parameters. All numbers and graphs are computed live from the model shown under each simulation.'}</p><div id="sim-host"></div>` : '', 'wide'),
      sec('analysis', 'Real-time results and graphical analysis', t.analysis),
      sec('applications', 'Practical applications', list(t.applications)),
      sec('observations', 'Engineering observations', t.observations && t.observations.length ? t.observations.map(o => `<div class="callout obs">${o}</div>`).join('') : ''),
      sec('supplementary', 'Supplementary material', t.supplementary ? `<div class="callout supp">${t.supplementary}</div>` : ''),
      sec('questions', 'Practice questions', t.questions && t.questions.length ? `<ol class="qa-list">${t.questions.map(q => `<li>${q.q}${q.a ? `<details><summary>Show answer</summary>${q.a}</details>` : ''}</li>`).join('')}</ol><p><a href="${R}practice.html#unit-${n}">Take the Unit ${u.roman} quiz</a></p>` : ''),
      sec('summary', 'Summary', t.summary ? `<p>${t.summary}</p>` : '')
    ].filter(Boolean).join('');
    const exps = (RIL.experiments || []).filter(e => (e.topics || []).includes(t.id));
    main.innerHTML = `<div class="crumbs"><a href="${R}index.html">Home</a> / <a href="${R}units/unit-${n}/index.html">Unit ${u.roman}</a> / Topic ${t.n}</div>
      <header class="page-head"><span class="unit-tag">Unit ${u.roman}, Topic ${t.n}</span><h1>${esc(t.title)}</h1><p>${t.blurb || ''}</p>
      ${exps.length ? `<p style="font-size:.92rem">Related virtual experiment${exps.length > 1 ? 's' : ''}: ${exps.map(e => `<a href="${expUrl(e)}">${esc(e.title)}</a>`).join(', ')}</p>` : ''}</header>
      <div class="topic-layout"><aside class="topic-side" aria-label="Unit topics">
        <h4>Unit ${u.roman} topics</h4><ol>${u.topics.map(x => `<li class="${x === t ? 'current' : ''}"><a href="${topicUrl(n, x)}">${esc(x.title)}</a></li>`).join('')}</ol>
        <div class="toc"><h4>On this page</h4>${S.map(s => `<a href="#${s.id}">${s.title}</a>`).join('')}</div></aside>
        <article class="theory">${html}
          <nav class="topic-nav">${prev ? `<a class="btn ghost" href="${topicUrl(n, prev)}">Previous: ${esc(prev.title)}</a>` : '<span></span>'}${next ? `<a class="btn ghost" href="${topicUrl(n, next)}">Next: ${esc(next.title)}</a>` : `<a class="btn ghost" href="${R}practice.html#unit-${n}">Unit ${u.roman} practice questions</a>`}</nav>
        </article></div>`;
    const host = document.getElementById('sim-host');
    if (host) sims.forEach(id => RIL.mountSim(host, id));
    document.title = `${t.title} | Unit ${u.roman} | Robotics & Instrumentation Virtual Lab`;
  }

  /* ---------------- SIMULATION CATALOG + STANDALONE ---------------- */
  function simTopics(id) { return allTopics().filter(t => (t.sims || []).includes(id)); }
  function renderSims() {
    const ids = RIL.simOrder.filter(id => RIL.sims[id]);
    main.innerHTML = `<div class="crumbs"><a href="${R}index.html">Home</a> / All simulations</div>
      <header class="page-head"><h1>All simulations</h1><p>${ids.length} interactive simulations. Each opens on its own page and also appears inside its topic module.</p></header>
      <div class="filters" role="group" aria-label="Filter simulations"><button type="button" data-f="all" aria-pressed="true">All units</button>${units.map(u => `<button type="button" data-f="${u.n}" aria-pressed="false">Unit ${u.roman}</button>`).join('')}<button type="button" data-f="3d" aria-pressed="false">3D only</button><input type="search" placeholder="Search simulations" aria-label="Search simulations"></div>
      <div id="sim-cat"></div>`;
    const cat = document.getElementById('sim-cat'); let f = 'all', q = '';
    const draw = () => {
      cat.innerHTML = units.map(u => {
        const list = ids.filter(id => RIL.sims[id].unit === u.n && (f === 'all' || f == u.n || (f === '3d' && RIL.sims[id].kind === '3d')) && (!q || (RIL.sims[id].title + ' ' + (RIL.sims[id].description || '')).toLowerCase().includes(q)));
        if (!list.length) return '';
        return `<h2 class="unit-group-h">Unit ${u.roman} – ${esc(u.title)}</h2><div class="catalog">${list.map(id => { const s = RIL.sims[id]; const tps = simTopics(id); return `<div class="cat-item"><h4><a href="${simUrl(id)}">${esc(s.title)}</a></h4><p>${s.description || ''}</p><div class="meta">${kindBadge(id)}${tps.map(t => `<a href="${topicUrl(t.unit, t)}">${esc(t.title)}</a>`).join(', ')}</div></div>`; }).join('')}</div>`;
      }).join('') || '<p>No simulation matches this filter.</p>';
    };
    main.querySelectorAll('.filters button').forEach(b => b.onclick = () => { f = b.dataset.f; main.querySelectorAll('.filters button').forEach(x => x.setAttribute('aria-pressed', x === b)); draw(); });
    main.querySelector('.filters input').oninput = e => { q = e.target.value.toLowerCase(); draw(); };
    draw();
  }
  function renderSim() {
    const id = body.getAttribute('data-sim'); const s = RIL.sims[id]; if (!s) { main.innerHTML = '<p>Simulation not found.</p>'; return; }
    const u = units.find(x => x.n === s.unit); const tps = simTopics(id);
    const exps = (RIL.experiments || []).filter(e => e.sim === id);
    main.innerHTML = `<div class="crumbs"><a href="${R}index.html">Home</a> / <a href="${R}simulations.html">Simulations</a> / ${esc(s.title)}</div>
      <header class="page-head"><span class="unit-tag">Unit ${u ? u.roman : ''} simulation</span><h1>${esc(s.title)}</h1><p>${s.description || ''}</p>
      <p style="font-size:.92rem">Topic${tps.length > 1 ? 's' : ''}: ${tps.map(t => `<a href="${topicUrl(t.unit, t)}">${esc(t.title)}</a>`).join(', ')}${exps.length ? ` · Experiment: ${exps.map(e => `<a href="${expUrl(e)}">${esc(e.title)}</a>`).join(', ')}` : ''}</p></header><div id="sim-host"></div>
      ${s.help ? `<section class="theory" style="margin-top:20px"><h2>How to use this simulation</h2><p>${s.help}</p></section>` : ''}`;
    RIL.mountSim(document.getElementById('sim-host'), id, { standalone: true });
    document.title = `${s.title} | Simulation | Robotics & Instrumentation Virtual Lab`;
  }

  /* ---------------- EXPERIMENTS ---------------- */
  function expCard(e) { return `<div class="cat-item"><h4><a href="${expUrl(e)}">${esc(e.title)}</a></h4><p>${e.aim}</p><div class="meta">${kindBadge(e.sim)}<span>Unit ${units[e.unit - 1].roman}</span></div></div>`; }
  function renderExps() {
    const ex = RIL.experiments || [];
    main.innerHTML = `<div class="crumbs"><a href="${R}index.html">Home</a> / Virtual experiments</div>
      <header class="page-head"><h1>Topic experiments</h1><p>The 18 graded laboratory practicals with reports are under <a href="${R}labs.html">Virtual experiments</a>. This page lists ${ex.length} shorter single-topic experiments. Each has an aim, theory, a live virtual setup, a procedure, an observation table you fill by pressing <b>Record</b> in the simulation, graphs, a conclusion guide and assessment questions.</p></header>
      ${units.map(u => `<h2 class="unit-group-h">Unit ${u.roman} – ${esc(u.title)}</h2><div class="catalog">${ex.filter(e => e.unit === u.n).map(expCard).join('')}</div>`).join('')}`;
  }
  function renderExp() {
    const id = body.getAttribute('data-exp'); const e = (RIL.experiments || []).find(x => x.id === id); if (!e) { main.innerHTML = '<p>Experiment not found.</p>'; return; }
    const u = units[e.unit - 1]; const s = RIL.sims[e.sim];
    const num = (RIL.experiments || []).filter(x => x.unit === e.unit).indexOf(e) + 1;
    main.innerHTML = `<div class="crumbs"><a href="${R}index.html">Home</a> / <a href="${R}experiments.html">Virtual experiments</a> / Unit ${u.roman}</div>
      <header class="page-head"><span class="unit-tag">Unit ${u.roman}, Experiment ${num}</span><h1>${esc(e.title)}</h1>
      <div class="exp-meta">${(e.topics || []).map(tid => { const t = u.topics.find(x => x.id === tid); return t ? `<a class="badge" href="${topicUrl(u.n, t)}" style="text-decoration:none">Topic: ${esc(t.title)}</a>` : ''; }).join('')}</div></header>
      <section class="exp-section"><h2>Aim</h2><p>${e.aim}</p></section>
      <section class="exp-section"><h2>Theory</h2>${e.theory}</section>
      <section class="exp-section wide"><h2>Virtual setup and animation</h2><p>${e.setup || ''}</p><div id="sim-host"></div></section>
      <section class="exp-section"><h2>Procedure</h2><ol>${e.procedure.map(p => `<li>${p}</li>`).join('')}</ol></section>
      <section class="exp-section"><h2>Interactive parameters</h2><ul>${(e.params || (s && s.controls || []).filter(c => c.label).map(c => c.label + (c.unit ? ` (${c.unit})` : ''))).map(p => `<li>${p}</li>`).join('')}</ul></section>
      <section class="exp-section wide"><h2>Observation table</h2><p>${e.observe || 'Press <b>Record</b> in the simulation toolbar after each setting; the row is added here.'}</p><div id="exp-obs"><p class="muted">No observations recorded yet.</p></div></section>
      <section class="exp-section"><h2>Graphical results</h2><p>${e.graphs || 'The graphs inside the simulation panel update in real time. Compare their shape with the theoretical curve described in the theory section.'}</p></section>
      <section class="exp-section"><h2>Conclusion</h2>${e.conclusion}</section>
      <section class="exp-section"><h2>Assessment questions</h2><ol class="qa-list">${e.questions.map(q => `<li>${q.q}${q.a ? `<details><summary>Show answer</summary>${q.a}</details>` : ''}</li>`).join('')}</ol></section>`;
    const S = RIL.mountSim(document.getElementById('sim-host'), e.sim, { standalone: false });
    if (S) {
      if (e.preset) Object.entries(e.preset).forEach(([k, v]) => S.setParam(k, v));
      S.el.addEventListener('ril-record', () => {
        const cols = S.obsColumns();
        document.getElementById('exp-obs').innerHTML = `<div class="table-scroll"><table class="data"><tr><th>#</th>${cols.map(c => `<th>${esc(c.label)}</th>`).join('')}</tr>${S.obs.map((r, i) => `<tr><td>${i + 1}</td>${cols.map(c => `<td>${r[c.key] ?? '—'}</td>`).join('')}</tr>`).join('')}</table></div><p><button class="btn ghost" type="button" id="exp-csv">Download observations (CSV)</button></p>`;
        document.getElementById('exp-csv').onclick = () => S.downloadObs();
      });
    }
    document.title = `${e.title} | Virtual Experiment | Robotics & Instrumentation Virtual Lab`;
  }

  /* ---------------- SYLLABUS ---------------- */
  function renderSyllabus() {
    const C = RIL.course || {};
    main.innerHTML = `<div class="crumbs"><a href="${R}index.html">Home</a> / Course syllabus</div>
      <header class="page-head"><h1>Course syllabus</h1><p>${esc(RIL_CONFIG.courseTitle)}.</p></header>
      <div class="theory">
      <section><h2>Course overview</h2><ol>${(C.overview || []).map(x => `<li>${x}</li>`).join('')}</ol></section>
      <section><h2>Course objectives</h2><ol>${(C.objectives || []).map(x => `<li>${x}</li>`).join('')}</ol></section>
      <section class="wide"><h2>Course outcomes</h2><div class="table-scroll"><table class="data"><tr><th>CO</th><th>Outcome</th><th>Bloom's level</th></tr>${(C.outcomes || []).map(o => `<tr><td>${o[0]}</td><td>${o[1]}</td><td>${o[2]}</td></tr>`).join('')}</table></div></section>
      <section class="wide"><h2>Course content and where it is taught</h2>
      ${units.map(u => `<h3>Unit ${u.roman} – ${esc(u.title)}</h3><p>${esc(u.syllabus)}</p><div class="table-scroll"><table class="data"><tr><th>#</th><th>Topic module</th><th>Simulations</th><th>Experiments</th></tr>${u.topics.map(t => `<tr><td>${t.n}</td><td><a href="${topicUrl(u.n, t)}">${esc(t.title)}</a></td><td>${(t.sims || []).map(id => RIL.sims[id] ? `<a href="${simUrl(id)}">${esc(RIL.sims[id].title)}</a>` : id).join('<br>')}</td><td>${(RIL.experiments || []).filter(e => (e.topics || []).includes(t.id)).map(e => `<a href="${expUrl(e)}">${esc(e.title)}</a>`).join('<br>') || '–'}</td></tr>`).join('')}</table></div>`).join('')}</section>
      <section><h2>Text books</h2><ol>${(C.textbooks || []).map(x => `<li>${x}</li>`).join('')}</ol></section>
      <section><h2>Reference books</h2><ol>${(C.references || []).map(x => `<li>${x}</li>`).join('')}</ol></section>
      <section><h2>NPTEL courses</h2><ol>${(C.nptel || []).map(x => `<li>${x}</li>`).join('')}</ol></section>
      </div>`;
  }

  /* ---------------- PRACTICE ---------------- */
  function renderPractice() {
    main.innerHTML = `<div class="crumbs"><a href="${R}index.html">Home</a> / Practice questions</div>
      <header class="page-head"><h1>Practice questions</h1><p>Unit-wise question bank prepared from the course notes: multiple-choice, conceptual, numerical and application questions. Answers and explanations appear only after you submit. Nothing is stored on a server and no login is needed.</p></header>
      <div class="tabs" role="tablist">${units.map(u => `<button role="tab" type="button" data-u="${u.n}" aria-selected="false">Unit ${u.roman}</button>`).join('')}</div>
      <div id="quiz-host"></div>`;
    const host = document.getElementById('quiz-host');
    const show = n => { main.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-selected', +b.dataset.u === n)); host.innerHTML = ''; RIL.quizEngine.render(host, n); history.replaceState(null, '', '#unit-' + n); };
    main.querySelectorAll('.tabs button').forEach(b => (b.onclick = () => show(+b.dataset.u)));
    const m = location.hash.match(/unit-(\d)/); show(m ? +m[1] : 1);
  }

  /* ---------------- ABOUT / 404 ---------------- */
  function renderAbout() {
    main.innerHTML = `<div class="crumbs"><a href="${R}index.html">Home</a> / About</div>
      <header class="page-head"><h1>About this laboratory</h1><p>An interactive companion to the course notes for ${esc(RIL_CONFIG.courseTitle)}.</p></header>
      ${instructorCard()}
      <div class="theory">${RIL.aboutHtml || ''}</div>`;
  }

  const P = RIL.pages || {};
  /* ---------------- HUMANOID ROBOT (BAIRWABOT lab, self-contained in bairwabot/) ---------------- */
  function renderHumanoid() {
    const lab = R + 'bairwabot/index.html';
    main.innerHTML = `<div class="crumbs"><a href="${R}index.html">Home</a> / Humanoid Robot</div>
      <header class="page-head"><h1>Humanoid Robot – BAIRWABOT Virtual Lab</h1><p>An interactive 3D learning environment for humanoid robotics, artificial intelligence, motion planning and human-robot interaction. Concept and educational direction: ${window.RIL_INSTRUCTOR_HTML() || 'Dr Bansilal Bairwa'}</p>
      <div class="actions" style="display:flex;flex-wrap:wrap;gap:10px;margin-top:14px"><a class="btn amber" href="${lab}">Open the lab full screen</a><a class="btn ghost" href="#humanoid-lab">Use it on this page</a></div></header>
      <section class="home-section"><h2>What the lab contains</h2><div class="how-grid">
        <div><h4>46-DOF humanoid</h4><p>A 1.72 m humanoid with named joints and limits: neck, torso, two 8-DOF arms, five-finger hands and two 6-DOF legs, with an expressive face.</p></div>
        <div><h4>Motion and balance</h4><p>Walk, jog, run, turn and side-step gaits, stair footstep planning, damped-least-squares arm IK, CoM, CoP/ZMP, support polygon and foot pressure.</p></div>
        <div><h4>30 modules</h4><p>Each module has a working simulation, 15 sections of learning content and quiz questions (150 in all), plus FK/IK lab, DOF and body-structure explorers.</p></div>
        <div><h4>Talk to the robot</h4><p>Text-to-speech and voice commands in English and Hindi. Where speech recognition is unavailable, commands can be typed or clicked.</p></div>
      </div></section>
      <section class="home-section" id="humanoid-lab"><h2>Live lab</h2>
        <p class="muted">Drag to rotate, scroll to zoom, right-drag to pan. Voice commands need microphone permission; for the best experience <a href="${lab}">open the lab full screen</a>.</p>
        <iframe src="${lab}" title="BAIRWABOT – Humanoid Robotics Virtual Lab" loading="lazy" allow="microphone; autoplay; fullscreen" allowfullscreen style="width:100%;height:min(90vh,860px);border:0;border-radius:12px;background:#070c18;box-shadow:0 6px 30px rgba(0,0,0,.25)"></iframe>
        <p class="muted" style="font-size:.9rem;margin-top:10px">Values marked MODEL are computed from the animated kinematic model; values marked SIM are illustrative. Object recognition and detection confidences are simulated, and locomotion is kinematic rather than a full physics simulation.</p>
      </section>`;
  }

  const routes = { course: () => P.course(main), concepts: () => P.concepts(main), labs: () => P.labs(main), lab: () => P.lab(main), assembly: () => P.assembly(main), workcell: () => P.workcell(main), math: () => P.math(main), analytics: () => P.analytics(main), library: () => P.library(main), assessment: () => P.assessment(main), notebook: () => P.notebook(main), reports: () => P.reports(main), dashboard: () => P.dashboard(main), flagship: () => P.flagship(main), hardware: () => P.hardware(main), home: () => { renderHome(); if (P.homeExtra) P.homeExtra(main); }, unit: renderUnit, topic: renderTopic, sims: renderSims, sim: renderSim, exps: renderExps, exp: renderExp, syllabus: renderSyllabus, practice: renderPractice, about: renderAbout, humanoid: renderHumanoid, notes: () => RIL.flipbook && RIL.flipbook(main) };
  try { (routes[page] || (() => { }))(); } catch (err) { console.error(err); main.insertAdjacentHTML('afterbegin', '<div class="callout">This page failed to render: ' + esc(err.message) + '</div>'); }
  if (window.gsap && page !== 'home' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) gsap.from('.page-head', { opacity: 0, y: 8, duration: .35, ease: 'power1.out' });
  typeset();
})();
