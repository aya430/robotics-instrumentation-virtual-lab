/* =====================================================================
   The 18 laboratory practicals: catalogue page, practical page
   (26-part structure), MCQ engine, observation storage and the
   PDF report generator. All generated from RIL.labs (js/data/z-labs.js).
   ===================================================================== */
(function () {
  'use strict';
  const RIL = window.RIL, LK = RIL.LK, RM = RIL.RM; RIL.pages = RIL.pages || {};
  const { esc, f, $ } = LK; const R = () => RIL.root;
  const roman = n => ['', 'I', 'II', 'III', 'IV'][n];
  const strip = h => String(h || '').replace(/<[^>]+>/g, ' ').replace(/\\\(|\\\)|\\\[|\\\]/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
  const topicById = id => { for (const u of RIL.units) { const t = u.topics.find(x => x.id === id); if (t) return Object.assign({ unit: u.n }, t); } return null; };
  const topicUrl = t => `${R()}units/unit-${t.unit}/topic-${String(t.n).padStart(2, '0')}.html`;
  const simUrl = id => { const s = RIL.sims[id]; return s ? `${R()}simulations/${s.category}/${id}.html` : '#'; };
  LK.labUrl = l => `${R()}labs/${l.id}.html`;
  /** practical with any faculty override applied */
  LK.getLab = id => { const base = (RIL.labs || []).find(l => l.id === id); if (!base) return null; const o = Object.assign({}, (RIL.labOverrides || {})[id], LK.store.get('override:' + id, null)); return Object.assign({}, base, o); };
  LK.allLabs = () => (RIL.labs || []).map(l => LK.getLab(l.id));
  /** page references of a practical, from the supplied notes and slide decks */
  LK.labRefs = lab => (lab.sections || []).map(s => { const x = RIL.refs && RIL.refs.sections[s]; if (!x) return null; const unit = +s.split('.')[0]; return { sec: s, title: x.title, page: x.page, pdf: x.page + RIL.refs.notesOffset, slide: x.slide, unit }; }).filter(Boolean);
  LK.cite = r => `B. Bairwa, Robotics and Instrumentation – Lecture Notes, Sec. ${r.sec} “${r.title}”, p. ${r.page}`;
  const STUDIO = { assembly: ['assembly.html', 'Robot Assembly Studio', 'Build and inspect the robot used in this practical.'], workcell: ['workcell.html', 'Experimental Workcell', 'Run this practical on your assembled robot in the 3D cell.'], math: ['math.html', 'Mathematical Workspace', 'Check every matrix step by step.'], hardware: ['hardware.html', 'Hardware link (optional)', 'Monitor a real microcontroller over Web Serial.'] };
  LK.labProgress = lab => { const st = LK.labState(lab.id); const rows = Object.values(st.obs || {}).reduce((s, o) => s + (o.rows || []).length, 0); const steps = (st.steps || []).filter(Boolean).length; return { st, rows, steps, score: st.mcq ? st.mcq.score : null, done: !!(st.mcq && rows > 0), started: rows > 0 || !!st.mcq || steps > 0 }; };

  /* ---------------- catalogue ---------------- */
  RIL.pages.labs = function (main) {
    const labs = LK.allLabs();
    main.innerHTML = `<div class="crumbs"><a href="${R()}index.html">Home</a> / Virtual experiments</div>
      <header class="page-head"><h1>Virtual experiments: 18 laboratory practicals</h1><p>One practical for each block of the syllabus. Every practical has theory from the course notes, interactive stations, a procedure, an observation table you fill from the simulation, live graphs, five assessment questions and a downloadable report.</p>
      <p><a class="btn" href="${R()}flagship.html">Flagship practical: 6-DOF manipulator</a> <a class="btn ghost" href="${R()}experiments.html">Topic-level experiments (37)</a> <a class="btn ghost" href="${R()}reports.html">My reports</a></p></header>
      ${RIL.units.map(u => `<h2 class="unit-group-h">Unit ${u.roman} – ${esc(u.title)}</h2><div class="lab-grid">${labs.filter(l => l.unit === u.n).map(l => { const p = LK.labProgress(l); return `<a class="lab-card" href="${LK.labUrl(l)}"><span class="num">${String(l.n).padStart(2, '0')}</span><span class="body"><b>${esc(l.title)}</b><span class="muted">${esc(l.aim)}</span><span class="tags">${l.cos.map(c => `<i class="co">${c}</i>`).join('')}<i>${l.stations.length} stations</i>${p.done ? '<i class="ok">completed' + (p.score !== null ? ' · ' + p.score + '/5' : '') + '</i>' : p.started ? '<i class="warn">in progress</i>' : '<i>not started</i>'}</span></span></a>`; }).join('')}</div>`).join('')}`;
  };

  /* ---------------- practical page ---------------- */
  RIL.pages.lab = function (main) {
    const id = document.body.getAttribute('data-lab'); const lab = LK.getLab(id); if (!lab) { main.innerHTML = '<p>Practical not found.</p>'; return; }
    let st = LK.labState(id); st.steps = st.steps || []; st.nb = st.nb || {}; const save = () => LK.saveLab(id, st);
    const u = RIL.units[lab.unit - 1]; const topics = lab.topics.map(topicById).filter(Boolean); const refs = LK.labRefs(lab); const live = {}; // mounted stations
    let level = LK.store.get('level', 'intermediate');
    const prev = LK.getLab('lab-' + String(lab.n - 1).padStart(2, '0')), next = LK.getLab('lab-' + String(lab.n + 1).padStart(2, '0'));
    const secs = [['objectives', 'Objectives'], ['theory', 'Theory'], ['refs', 'Reference notes'], ['equipment', 'Equipment and connections'], ['equations', 'Equations'], ['simulation', 'Simulation'], ['procedure', 'Procedure'], ['observations', 'Observations and metrics'], ['mcq', 'Assessment (5 MCQs)'], ['results', 'Result and conclusion'], ['report', 'Report']];
    const eqHtml = (e, i) => `<article class="eq-card"><h3>${i + 1}. ${esc(e.name)}</h3><div class="eq-block">\\[${e.tex}\\]</div>
      <dl class="eq-dl"><dt>Physical interpretation</dt><dd>${e.phys}</dd>
      <dt>Variables and units</dt><dd><table class="data sm"><tr><th>Symbol</th><th>Meaning</th><th>Unit</th></tr>${e.vars.map(v => `<tr><td>\\(${v[0]}\\)</td><td>${v[1]}</td><td>${v[2] || '–'}</td></tr>`).join('')}</table></dd>
      <dt>Numerical substitution and result</dt><dd><div class="eq-block">\\[${e.sub}\\]</div></dd>
      <dt>Connection to the simulation</dt><dd>${e.sim}</dd><dt>Engineering application</dt><dd>${e.app}</dd></dl></article>`;
    const theory = topics.map(t => `<details class="th" ${topics.length === 1 ? 'open' : ''}><summary><b>${esc(t.title)}</b> <span class="muted">Unit ${roman(t.unit)}, topic ${t.n}${t.refs ? ' · notes ' + esc(t.refs) : ''}</span></summary><p>${t.intro || ''}</p><div class="lvl-int">${t.theory || ''}</div>
      <div class="lvl-adv">${(t.model || []).map(m => `${m.title ? `<h4>${m.title}</h4>` : ''}${m.text ? `<p>${m.text}</p>` : ''}${m.tex ? `<div class="eq-block">\\[${m.tex}\\]</div>` : ''}`).join('')}${(t.examples || []).map(e => `<div class="callout example"><b>${e.title}</b><br>${e.body}</div>`).join('')}</div>
      ${t.summary ? `<p class="lvl-beg"><b>In short:</b> ${t.summary}</p>` : ''}<p><a href="${topicUrl(t)}">Open the full topic module →</a></p></details>`).join('');
    main.innerHTML = `<div class="crumbs"><a href="${R()}index.html">Home</a> / <a href="${R()}labs.html">Virtual experiments</a> / Practical ${lab.n}</div>
      <header class="page-head"><span class="unit-tag">Experiment ${String(lab.n).padStart(2, '0')} · Unit ${u.roman}</span><h1>${esc(lab.title)}</h1><p>${esc(lab.aim)}</p>
      <div class="exp-meta">${lab.cos.map(c => { const o = (RIL.course.outcomes || []).find(x => x[0] === c); return `<span class="badge co" title="${esc(o ? o[1] : '')}">${c}</span>`; }).join('')}<span class="badge">Unit ${u.roman}: ${esc(u.title)}</span>${lab.flagship ? `<a class="badge" href="${R()}flagship.html">Flagship practical</a>` : ''}</div>
      <div class="levelbar" role="group" aria-label="Learning mode"><span>Learning mode</span>${[['beginner', 'Beginner', 'Guided: key ideas, hints in the procedure'], ['intermediate', 'Intermediate', 'Full theory and procedure'], ['advanced', 'Advanced', 'Adds derivations, worked examples and an extension task']].map(l => `<button type="button" data-level="${l[0]}" title="${l[2]}">${l[1]}</button>`).join('')}</div></header>
      <div class="topic-layout lab-layout"><aside class="topic-side"><div class="toc"><h4>Practical ${lab.n}</h4>${secs.map(s => `<a href="#${s[0]}">${s[1]}</a>`).join('')}</div><div class="prog-box" id="lab-prog"></div></aside>
      <article class="theory lab-body">
      <section id="objectives"><h2>Learning objectives</h2><ul class="objectives">${lab.objectives.map(o => `<li>${esc(o)}</li>`).join('')}</ul><h3>Prerequisite concepts</h3><ul>${lab.prereq.map(o => `<li>${esc(o)}</li>`).join('')}</ul></section>
      <section id="theory"><h2>Theoretical background</h2><p class="src">From the course notes, through the topic modules below. Expand a topic to read it here.</p>${theory}</section>
      <section id="refs"><h2>Reference notes for this practical</h2>${refs.length ? `<div class="table-scroll"><table class="data"><tr><th>Section</th><th>Title in the course notes</th><th>Notes page</th><th>Lecture slides</th></tr>${refs.map(r => `<tr><td>${r.sec}</td><td>${esc(r.title)}</td><td><a href="${R()}library.html#p=${r.pdf}" title="Open the notes PDF at this page">p. ${r.page}</a></td><td>${r.slide ? `<a href="${R()}notes.html#unit-${r.unit}/p${r.slide}">Unit ${roman(r.unit)}, slide ${r.slide}</a>` : '–'}</td></tr>`).join('')}</table></div><p class="src">Page numbers are the printed page numbers of “Unit Wise Detailed Notes.pdf” and the slide numbers of the unit decks supplied with this course.</p>` : '<p class="muted">No page mapping available for this practical. An instructor can add reference PDFs in the Reference Library.</p>'}</section>
      <section id="equipment"><h2>Virtual equipment</h2><ul>${lab.equipment.map(o => `<li>${esc(o)}</li>`).join('')}</ul>
        <h3>Connections</h3><div class="table-scroll"><table class="data"><tr><th>From</th><th>To</th><th>Signal</th></tr>${lab.connections.map(c => `<tr><td>${esc(c[0])}</td><td>${esc(c[1])}</td><td>${esc(c[2])}</td></tr>`).join('')}</table></div>
        ${lab.studio ? `<div class="studio-link"><div><b>${STUDIO[lab.studio][1]}</b><br><span class="muted">${STUDIO[lab.studio][2]} The 3D component library and assembly workspace are there; the robot is shared with this practical's report.</span></div><a class="btn" href="${R()}${STUDIO[lab.studio][0]}">Open</a></div>` : ''}</section>
      <section id="equations"><h2>Mathematical equations, explained</h2>${lab.eqs.map(eqHtml).join('')}<p class="lvl-adv"><b>Extension task:</b> ${esc(lab.challenge)}</p></section>
      <section id="simulation" class="wide"><h2>Interactive simulation stations</h2><p>Each station is a working model: change its parameters and the numbers and graphs are recomputed from the equations shown under it. Press <b>Record</b> in a station's toolbar to add the current values to your observation table.</p>
        <div class="tabs2 st-tabs" role="tablist">${lab.stations.map((s, i) => `<button role="tab" data-st="${s}">${i + 1}. ${esc((RIL.sims[s] || {}).title || s)}</button>`).join('')}</div><div id="st-host"></div></section>
      <section id="procedure"><h2>Experimental procedure</h2><ol class="proc">${lab.procedure.map((p, i) => `<li><label><input type="checkbox" data-step="${i}" ${st.steps[i] ? 'checked' : ''}> ${esc(p)}</label></li>`).join('')}</ol><p class="lvl-beg hint">Hint: work through the stations in tab order. After each change of a parameter, wait for the read-outs to settle, then press Record.</p></section>
      <section id="observations" class="wide"><h2>Observation tables</h2><div id="obs-host"></div><h3>Performance metrics from your observations</h3><div id="met-host"></div></section>
      <section id="mcq"><h2>Assessment: five questions</h2><div id="mcq-host"></div></section>
      <section id="results"><h2>Result and discussion</h2><p class="muted">Discuss: ${lab.discussion.map(esc).join(' ')}</p><textarea data-nb="discussion" rows="5" placeholder="Your results and discussion…">${esc(st.nb.discussion || '')}</textarea>
        <h2>Conclusion</h2><p class="muted">${esc(lab.conclusion)}</p><textarea data-nb="conclusion" rows="4" placeholder="Your conclusion…">${esc(st.nb.conclusion || '')}</textarea>
        <h3>Reflection</h3><textarea data-nb="reflection" rows="3" placeholder="What did you find difficult, and what would you try next?">${esc(st.nb.reflection || '')}</textarea><p class="hint">Saved automatically in this browser. The same text appears in the <a href="${R()}notebook.html#${id}">laboratory notebook</a>.</p></section>
      <section id="report"><h2>Experiment report</h2><div class="rep-form">${[['name', 'Student name'], ['id', 'Student ID / SRN'], ['semester', 'Semester'], ['dept', 'University / department']].map(k => `<label class="fld"><span>${k[1]}</span><input type="text" data-stu="${k[0]}" value="${esc(LK.student()[k[0]] || '')}"><em></em></label>`).join('')}</div>
        <p class="btn-row"><button class="btn" id="rep-pdf">Download PDF report</button> <button class="btn ghost" id="rep-csv">Download observations (CSV)</button> <button class="btn ghost" id="rep-png">Download graph images</button> <button class="btn ghost" id="rep-save">Save experiment</button> <button class="btn ghost" id="rep-print">Print this page</button></p>
        <p class="hint">The report contains what you actually recorded: observation rows, graphs from the stations you have opened, your MCQ responses and your written sections. Empty parts are marked “not recorded”.</p></section>
      <nav class="topic-nav">${prev ? `<a class="btn ghost" href="${LK.labUrl(prev)}">← Practical ${prev.n}</a>` : '<span></span>'}${next ? `<a class="btn ghost" href="${LK.labUrl(next)}">Practical ${next.n} →</a>` : `<a class="btn ghost" href="${R()}flagship.html">Flagship practical →</a>`}</nav>
      </article></div>`;
    const body = $('.lab-body', main);
    const setLevel = l => { level = l; LK.store.set('level', l); body.dataset.level = l; main.querySelectorAll('[data-level]').forEach(b => b.setAttribute('aria-pressed', b.dataset.level === l)); };
    main.querySelectorAll('[data-level]').forEach(b => b.onclick = () => setLevel(b.dataset.level)); setLevel(level);

    /* stations */
    const host = $('#st-host');
    function openStation(sid) {
      main.querySelectorAll('[data-st]').forEach(b => b.setAttribute('aria-selected', b.dataset.st === sid)); [...host.children].forEach(c => (c.hidden = c.dataset.sid !== sid));
      if (live[sid]) return; const box = document.createElement('div'); box.dataset.sid = sid; host.append(box);
      const S = RIL.mountSim(box, sid, { standalone: false }); if (!S) { box.innerHTML = '<p class="callout">This station could not be loaded.</p>'; return; } live[sid] = S;
      S.el.addEventListener('ril-record', ev => { const d = ev.detail || {}; const cols = (d.cols || S.obsColumns()).map(c => ({ key: c.key, label: c.label })); const o = st.obs[sid] = st.obs[sid] || { cols, rows: [] }; o.cols = cols; o.rows.push(d.row || S.obs[S.obs.length - 1]); if (o.rows.length > 60) o.rows.shift(); try { const c = S.el.querySelector('canvas'); const t = document.createElement('canvas'); t.width = 480; t.height = Math.round(480 * c.height / c.width); const g = t.getContext('2d'); g.fillStyle = '#0e1d38'; g.fillRect(0, 0, t.width, t.height); g.drawImage(c, 0, 0, t.width, t.height); st.shot = { sid, url: t.toDataURL('image/jpeg', 0.6) }; } catch (e) { } save(); drawObs(); drawProg(); });
      LK.typeset(box);
    }
    main.querySelectorAll('[data-st]').forEach(b => b.onclick = () => openStation(b.dataset.st)); openStation(lab.stations[0]);

    /* observations + metrics */
    function drawObs() {
      const ids = lab.stations.filter(s => st.obs[s] && st.obs[s].rows.length);
      $('#obs-host').innerHTML = ids.length ? ids.map(s => { const o = st.obs[s]; return `<h4>${esc(RIL.sims[s].title)} <button class="tbtn" data-clear="${s}">Clear this table</button></h4><div class="table-scroll"><table class="data sm"><tr><th>#</th>${o.cols.map(c => `<th>${esc(c.label)}</th>`).join('')}</tr>${o.rows.map((r, i) => `<tr><td>${i + 1}</td>${o.cols.map(c => `<td>${esc(r[c.key] ?? '—')}</td>`).join('')}</tr>`).join('')}</table></div>`; }).join('') : '<p class="muted">No observations recorded yet. Open a station above, set the parameters and press <b>Record</b>.</p>';
      $('#obs-host').querySelectorAll('[data-clear]').forEach(b => b.onclick = () => { delete st.obs[b.dataset.clear]; save(); drawObs(); drawProg(); });
      const M = LK.obsMetrics(lab, st);
      $('#met-host').innerHTML = M.length ? `<div class="table-scroll"><table class="data sm"><tr><th>Station</th><th>Quantity</th><th>n</th><th>Minimum</th><th>Maximum</th><th>Mean</th><th>Std. deviation</th></tr>${M.map(m => `<tr><td>${esc(m.station)}</td><td>${esc(m.label)}</td><td>${m.n}</td><td>${f(m.min, 4)}</td><td>${f(m.max, 4)}</td><td>${f(m.mean, 4)}</td><td>${f(m.sd, 4)}</td></tr>`).join('')}</table></div>` : '<p class="muted">Metrics are computed from the recorded rows (at least two rows of a numeric quantity).</p>';
      if (lab.studio === 'workcell') { const run = LK.runs.all()[0]; $('#met-host').insertAdjacentHTML('beforeend', run ? `<h4>Latest saved Workcell run: ${esc(run.name)}</h4><table class="kv2">${Object.entries(run.metrics).filter(e => e[1] !== null).map(e => `<tr><td>${esc(e[0])}</td><td>${f(e[1], 4)}</td></tr>`).join('')}</table>` : `<p class="muted">No Workcell run saved yet. In the <a href="${R()}workcell.html">Experimental Workcell</a>, run a task and press “Save this run”.</p>`); }
    }
    /* MCQs */
    function drawMcq() {
      const h = $('#mcq-host'); const done = st.mcq; const ans = done ? done.answers : [];
      h.innerHTML = `<form id="mcq-form">${lab.mcqs.map((q, i) => `<fieldset class="mcq ${done ? (ans[i] === q.a ? 'right' : 'wrong') : ''}"><legend><b>Q${i + 1}.</b> ${esc(q.q)} <span class="qmeta">${q.t} · ${q.lvl} · ${q.co} · ${q.marks} mark</span></legend>${q.o.map((o, k) => `<label class="${done && k === q.a ? 'correct' : ''}${done && ans[i] === k && k !== q.a ? ' chosen-wrong' : ''}"><input type="radio" name="q${i}" value="${k}" ${ans[i] === k ? 'checked' : ''} ${done ? 'disabled' : ''}> ${esc(o)}</label>`).join('')}${done ? `<p class="fb"><b>${ans[i] === q.a ? 'Correct.' : ans[i] === undefined || ans[i] === null ? 'Not answered.' : 'Not correct.'}</b> Answer: ${esc(q.o[q.a])}. ${esc(q.x)}</p>` : ''}</fieldset>`).join('')}
        ${done ? `<p class="verdict ${done.score >= 3 ? 'ok' : 'warn'}">Score ${done.score} / 5 · ${(done.score * 20).toFixed(0)} %</p><p><button type="button" class="btn ghost" id="mcq-retake">Retake</button></p>` : '<p><button type="submit" class="btn">Submit and evaluate</button></p>'}</form>
        ${st.attempts.length ? `<details><summary>Attempt history (${st.attempts.length})</summary><table class="data sm"><tr><th>#</th><th>Date</th><th>Score</th><th>%</th></tr>${st.attempts.map((a, i) => `<tr><td>${i + 1}</td><td>${esc(a.date)}</td><td>${a.score}/5</td><td>${a.score * 20}</td></tr>`).join('')}</table></details>` : ''}`;
      const form = $('#mcq-form');
      form.onsubmit = e => { e.preventDefault(); const answers = lab.mcqs.map((q, i) => { const c = form.querySelector(`input[name=q${i}]:checked`); return c ? +c.value : null; }); if (answers.some(a => a === null) && !confirm('Some questions are unanswered. Submit anyway?')) return; const score = answers.reduce((s, a, i) => s + (a === lab.mcqs[i].a ? 1 : 0), 0); st.mcq = { answers, score, date: new Date().toLocaleString() }; st.attempts.push({ date: st.mcq.date, score }); save(); drawMcq(); drawProg(); };
      const rt = $('#mcq-retake'); if (rt) rt.onclick = () => { st.mcq = null; save(); drawMcq(); drawProg(); };
    }
    function drawProg() { const p = LK.labProgress(lab); $('#lab-prog').innerHTML = `<h4>Your progress</h4><ul class="checks"><li class="${p.steps === lab.procedure.length ? 'ok' : ''}">${p.steps}/${lab.procedure.length} procedure steps</li><li class="${p.rows ? 'ok' : ''}">${p.rows} observation row${p.rows === 1 ? '' : 's'}</li><li class="${p.score !== null ? 'ok' : ''}">MCQs: ${p.score !== null ? p.score + '/5' : 'not attempted'}</li><li class="${(st.nb.conclusion || '').trim() ? 'ok' : ''}">Conclusion ${(st.nb.conclusion || '').trim() ? 'written' : 'pending'}</li></ul>`; }
    main.querySelectorAll('[data-step]').forEach(c => c.onchange = () => { st.steps[+c.dataset.step] = c.checked; save(); drawProg(); });
    main.querySelectorAll('[data-nb]').forEach(t => t.oninput = () => { st.nb[t.dataset.nb] = t.value; save(); drawProg(); });
    main.querySelectorAll('[data-stu]').forEach(t => t.onchange = () => { const s = LK.student(); s[t.dataset.stu] = t.value; LK.store.set('student', s); });
    const liveGraphs = () => { const out = []; Object.entries(live).forEach(([sid, S]) => { const title = RIL.sims[sid].title; S._render && S._render(); S.el.querySelectorAll('canvas').forEach((c, i) => { if (!c.width || !c.height) return; try { const t = document.createElement('canvas'); t.width = c.width; t.height = c.height; const g = t.getContext('2d'); g.fillStyle = '#0e1d38'; g.fillRect(0, 0, t.width, t.height); g.drawImage(c, 0, 0); const h5 = c.closest('.sim-chart') && c.closest('.sim-chart').querySelector('h5'); out.push({ title: title + (h5 ? ' – ' + h5.textContent : ' – simulation view'), url: t.toDataURL('image/png'), w: c.width, h: c.height, view: !h5 }); } catch (e) { } }); }); return out; };
    $('#rep-pdf').onclick = async e => { e.target.disabled = true; e.target.textContent = 'Building the report…'; try { await LK.report(id, { graphs: liveGraphs() }); } catch (err) { console.error(err); LK.toast('The report could not be generated: ' + err.message, 'bad'); } e.target.disabled = false; e.target.textContent = 'Download PDF report'; };
    $('#rep-csv').onclick = () => { const csv = LK.obsCsv(lab, st); if (!csv) return LK.toast('No observations recorded yet.'); LK.download(`${id}_observations.csv`, csv, 'text/csv'); };
    $('#rep-png').onclick = () => { const g = liveGraphs(); if (!g.length) return LK.toast('Open a station first.'); g.forEach((x, i) => setTimeout(() => LK.downloadDataUrl(`${id}_${String(i + 1).padStart(2, '0')}_${x.title.replace(/[^\w]+/g, '_').slice(0, 50)}.png`, x.url), i * 250)); };
    $('#rep-save').onclick = () => { save(); LK.toast('Experiment saved in this browser.', 'ok'); }; $('#rep-print').onclick = () => window.print();
    drawObs(); drawMcq(); drawProg(); document.title = `Practical ${lab.n}: ${lab.title} | Robotics & Instrumentation Virtual Lab`;
    RIL._lab = { lab, live, get st() { return st; } };
  };

  LK.obsMetrics = (lab, st) => { const out = []; lab.stations.forEach(s => { const o = st.obs[s]; if (!o) return; o.cols.forEach(c => { const v = o.rows.map(r => parseFloat(String(r[c.key]).replace(/[^\d.eE+-]/g, ''))).filter(Number.isFinite); if (v.length < 2 || v.length < o.rows.length * 0.6) return; const mean = v.reduce((a, b) => a + b, 0) / v.length; out.push({ station: RIL.sims[s].title, label: c.label, n: v.length, min: Math.min(...v), max: Math.max(...v), mean, sd: Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / (v.length - 1)) }); }); }); return out; };
  LK.obsCsv = (lab, st) => { const parts = []; lab.stations.forEach(s => { const o = st.obs[s]; if (!o || !o.rows.length) return; parts.push('"' + RIL.sims[s].title + '"'); parts.push(LK.csv(['#'].concat(o.cols.map(c => c.label)), o.rows.map((r, i) => [i + 1].concat(o.cols.map(c => { const v = r[c.key]; const n = Number(v); return v !== '' && v !== null && Number.isFinite(n) ? n : (v ?? ''); }))))); parts.push(''); }); return parts.join('\n'); };

  /* ---------------- PDF report ---------------- */
  const loadScript = src => new Promise((res, rej) => { if (document.querySelector(`script[data-src="${src}"]`)) return res(); const s = document.createElement('script'); s.src = R() + src; s.dataset.src = src; s.onload = res; s.onerror = () => rej(new Error('could not load ' + src)); document.head.append(s); });
  LK.report = async function (id, opts = {}) {
    const lab = LK.getLab(id); const st = LK.labState(id); const stu = LK.student(); const cfg = window.RIL_CONFIG || {}; const info = RIL.courseInfo || {};
    await loadScript('assets/vendor/jspdf.umd.min.js'); await loadScript('assets/vendor/jspdf.plugin.autotable.min.js'); await loadScript('assets/vendor/report-fonts.js');
    const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
    doc.addFileToVFS('DejaVuSans.ttf', window.RIL_FONTS.regular); doc.addFont('DejaVuSans.ttf', 'DejaVu', 'normal'); doc.addFileToVFS('DejaVuSans-Bold.ttf', window.RIL_FONTS.bold); doc.addFont('DejaVuSans-Bold.ttf', 'DejaVu', 'bold');
    const W = 210, H = 297, mx = 18, cw = W - 2 * mx; let y = 0, sectionTitle = '';
    const clean = s => String(s ?? '').replace(/[̀-ͯ]/g, m => m).replace(/‑/g, '-');
    const font = (b, size, color = 30) => { doc.setFont('DejaVu', b ? 'bold' : 'normal'); doc.setFontSize(size); doc.setTextColor(color); };
    const header = () => { doc.setFillColor(245, 247, 250); doc.rect(0, 0, W, 16, 'F'); font(true, 8.5, 70); doc.text(clean(`Experiment ${String(lab.n).padStart(2, '0')}: ${lab.title.length > 62 ? lab.title.slice(0, 60) + '…' : lab.title}`), mx, 10); font(false, 8, 110); doc.text(sectionTitle, W - mx, 10, { align: 'right' }); doc.setDrawColor(200); doc.line(0, 16, W, 16); y = 26; };
    const page = title => { doc.addPage(); sectionTitle = title; header(); font(true, 14, 20); doc.text(title, mx, y); y += 3; doc.setDrawColor(31, 111, 235); doc.setLineWidth(0.6); doc.line(mx, y, mx + 28, y); doc.setLineWidth(0.2); y += 8; };
    const room = h => { if (y + h > H - 18) { doc.addPage(); header(); } };
    const Hh = t => { room(14); y += 2; font(true, 11, 25); doc.text(clean(t), mx, y); y += 6; };
    const P = (t, o = {}) => { font(!!o.bold, o.size || 9.5, o.color || 45); const lines = doc.splitTextToSize(clean(t), cw - (o.indent || 0)); lines.forEach(l => { room(5); doc.text(l, mx + (o.indent || 0), y); y += (o.size || 9.5) * 0.48; }); y += 1.5; };
    const UL = (arr, ord) => arr.forEach((t, i) => { font(false, 9.5, 45); const lines = doc.splitTextToSize(clean(t), cw - 7); lines.forEach((l, k) => { room(5); if (!k) doc.text(ord ? (i + 1) + '.' : '•', mx + 1, y); doc.text(l, mx + 7, y); y += 4.6; }); y += 0.6; });
    const table = (head, body, o = {}) => { room(18); doc.autoTable(Object.assign({ head: [head], body, startY: y, margin: { left: mx, right: mx, top: 24, bottom: 18 }, styles: { font: 'DejaVu', fontSize: o.size || 8, cellPadding: 1.4, textColor: 40, lineColor: 210, lineWidth: 0.1, overflow: 'linebreak' }, headStyles: { fillColor: [236, 240, 245], textColor: 30, fontStyle: 'bold' }, theme: 'grid', didDrawPage: d => { if (d.pageNumber > 1 || d.cursor) { } } }, o.extra || {})); y = doc.lastAutoTable.finalY + 5; };
    const image = (url, w, h, fmt = 'PNG') => { room(h + 3); doc.addImage(url, fmt, mx + (cw - w) / 2, y, w, h); y += h + 3; };
    const eq = async tex => { const im = await LK.texImage(tex); if (!im) { P(tex, { size: 8.5, color: 80 }); return; } let w = im.w * 0.24, h = im.h * 0.24; if (w > cw) { h *= cw / w; w = cw; } y += 1.5; image(im.url, w, h); y += 2; };
    const none = t => P(t || 'Not recorded.', { color: 130 });
    const refs = LK.labRefs(lab); const topics = lab.topics.map(topicById).filter(Boolean); const robot = LK.twin.load(); const usesRobot = !!lab.studio && lab.studio !== 'hardware' && lab.studio !== 'math' || lab.unit === 3; const run = lab.studio === 'workcell' ? LK.runs.all()[0] : null;

    /* Page 1 — experiment information */
    sectionTitle = 'Experiment information'; doc.setFillColor(245, 247, 250); doc.rect(0, 0, W, 78, 'F'); doc.setFillColor(31, 111, 235); doc.rect(0, 78, W, 1.2, 'F');
    font(false, 10, 90); doc.text(clean(stu.dept || 'University / department: ____________________'), mx, 22); font(true, 12, 40); doc.text(clean(`${cfg.courseTitle || 'Robotics and Instrumentation'}${info.code ? ' (' + info.code + ')' : ''}`), mx, 31);
    font(false, 10, 90); doc.text('Virtual Laboratory · Experiment Report', mx, 38); font(true, 22, 15); doc.text(doc.splitTextToSize(clean(lab.title), cw), mx, 54); font(false, 11, 60); doc.text(`Experiment ${String(lab.n).padStart(2, '0')} · Unit ${roman(lab.unit)} · ${lab.cos.join(', ')}`, mx, 72);
    y = 92; table(['Field', 'Details'], [['Student name', stu.name || '____________________'], ['Student ID', stu.id || '____________________'], ['Semester', stu.semester || info.semester || ''], ['Date', LK.today()], ['Course instructor', cfg.instructor || ''], ['Unit', `Unit ${roman(lab.unit)}: ${RIL.units[lab.unit - 1].title}`], ['Course outcomes', lab.cos.map(c => { const o = (RIL.course.outcomes || []).find(x => x[0] === c); return c + ': ' + (o ? o[1] : ''); }).join('\n')]], { size: 9.5, extra: { columnStyles: { 0: { cellWidth: 42, fontStyle: 'bold' } } } });
    Hh('Aim'); P(lab.aim);
    const p0 = LK.labProgress(lab); Hh('Completion summary'); table(['Item', 'Status'], [['Procedure steps ticked', `${p0.steps} of ${lab.procedure.length}`], ['Observation rows recorded', String(p0.rows)], ['MCQ score', p0.score !== null ? `${p0.score} / 5` : 'not attempted'], ['Graphs captured in this report', String((opts.graphs || []).filter(g => !g.view).length + (run ? 3 : 0))]], { size: 9 });

    /* Page 2 — objectives and theory */
    page('Objectives and theory'); Hh('Learning objectives'); UL(lab.objectives); Hh('Theoretical background');
    topics.forEach(t => { P(t.title, { bold: true }); P(strip(t.intro)); if (t.summary) P(strip(t.summary), { color: 80 }); });
    Hh('Reference equations'); for (const e of lab.eqs) { P(e.name, { bold: true }); await eq(e.tex); P(strip(e.phys)); }
    Hh('Source references'); if (refs.length) UL(refs.map(r => LK.cite(r) + (r.slide ? `; lecture slides Unit ${roman(r.unit)}, slide ${r.slide}` : '') + '.')); else none('No page mapping available.');

    /* Page 3 — equipment and assembly */
    page('Virtual equipment and assembly'); Hh('Components used'); UL(lab.equipment); Hh('Connections'); table(['From', 'To', 'Signal'], lab.connections);
    if (usesRobot) {
      const mb = RM.mobility(robot); Hh('Robot configuration (shared digital twin)'); table(['Property', 'Value'], [['Robot', robot.name || ''], ['Configuration', RM.classify(robot).name], ['Degrees of freedom', String(mb.n)], ['Total mass', f(RM.totalMass(robot), 2) + ' kg'], ['End effector', robot.tool ? RM.TOOLS[robot.tool].name : 'none'], ['Controller and electronics', (robot.electronics || []).map(e => RM.ELECTRONICS[e].name).join(', ') || 'none']], { size: 9 });
      if (robot.joints.length) { Hh('Joint, motor and sensor details'); table(['Joint', 'Type', 'Limits', 'Motor', 'Gear', 'Sensor', 'Link mass (kg)'], robot.joints.map((j, i) => [i + 1, j.type === 'R' ? 'revolute' : 'prismatic', j.type === 'R' ? `${f(LK.deg(j.min), 0)}° … ${f(LK.deg(j.max), 0)}°` : `${f(j.min, 2)} … ${f(j.max, 2)} m`, j.motor ? RM.MOTORS[j.motor].name : 'none', j.motor ? (j.gear || RM.MOTORS[j.motor].gear) + ':1' : '–', j.sensor ? RM.SENSORS[j.sensor].name : 'none', f(RM.linkMass(j), 3)])); }
    }
    const shot = (opts.graphs || []).find(g => g.view) || (run && run.shot ? { url: run.shot, title: 'Workcell at the end of the saved run', jpg: true } : null) || (st.shot ? { url: st.shot.url, title: RIL.sims[st.shot.sid].title + ' (at the last recorded observation)', jpg: true, w: 480, h: 300 } : null);
    if (shot) room(95); Hh('Simulation / assembly screenshot'); if (shot) { const im = new Image(); await new Promise(r => { im.onload = r; im.onerror = r; im.src = shot.url; }); const w = Math.min(cw, 150), h = w * (im.height || 3) / (im.width || 4); const hh = Math.min(h, 85); image(shot.url, hh * (im.width || 4) / (im.height || 3), hh, shot.jpg ? 'JPEG' : 'PNG'); P(shot.title, { size: 8, color: 110 }); } else none('No screenshot captured. Open a station and press Record, or save a Workcell run.');

    /* Page 4 — procedure */
    page('Experimental procedure'); Hh('Steps performed'); lab.procedure.forEach((p, i) => { font(false, 9.5, 45); const lines = doc.splitTextToSize(clean(p), cw - 12); lines.forEach((l, k) => { room(5); if (!k) doc.text((st.steps && st.steps[i] ? '☑' : '☐') + ' ' + (i + 1) + '.', mx, y); doc.text(l, mx + 12, y); y += 4.6; }); y += 0.8; });
    Hh('Parameter settings and experimental conditions'); const used = lab.stations.filter(s => st.obs[s] && st.obs[s].rows.length);
    if (used.length) used.forEach(s => { const o = st.obs[s]; const last = o.rows[o.rows.length - 1]; P(RIL.sims[s].title + ' (values at the last recorded observation)', { bold: true }); table(['Quantity', 'Value'], o.cols.map(c => [c.label, String(last[c.key] ?? '—')]), { size: 8.5 }); }); else none('No station parameters recorded.');
    Hh('Simulation configuration'); UL([`Stations available: ${lab.stations.map(s => RIL.sims[s].title).join('; ')}.`, run ? `Workcell run: ${run.name}; model: ${run.mode === 'kin' ? 'kinematic' : 'dynamic (fixed step 3.33 ms)'}.` : 'Station simulations integrate their model with a fixed sub-step per frame.', 'All values are in SI units unless a unit is shown.']);
    if ((st.nb.procedure || '').trim()) { Hh('Student notes on the procedure'); P(st.nb.procedure); }

    /* Page 5 — calculations */
    page('Mathematical calculations'); for (const e of lab.eqs) { Hh(e.name); await eq(e.tex); table(['Symbol', 'Meaning', 'Unit'], e.vars.map(v => [v[0].replace(/\\(theta|alpha|omega|tau|mu|sigma|varepsilon|lambda|Delta|dot|ddot)/g, (m, g) => ({ theta: 'θ', alpha: 'α', omega: 'ω', tau: 'τ', mu: 'μ', sigma: 'σ', varepsilon: 'ε', lambda: 'λ', Delta: 'Δ', dot: 'd/dt ', ddot: 'd²/dt² ' }[g])).replace(/[\\{}]/g, ''), strip(v[1]), v[2] || '–']), { size: 8.5 }); P('Worked substitution:', { bold: true, size: 9 }); await eq(e.sub); }
    if (usesRobot && robot.joints.length) { Hh('DH parameters of the robot'); table(['i', 'type', 'a (m)', 'd (m)', 'α (°)', 'θ offset (°)'], robot.joints.map((j, i) => [i + 1, j.type, f(j.a), f(j.d), f(LK.deg(j.alpha), 1), f(LK.deg(j.offset || 0), 1)])); const q = run && run.qEnd && run.qEnd.length === robot.joints.length ? run.qEnd : RM.homeQ(robot); const { T } = RM.fk(robot, q); const Tn = T[T.length - 1]; Hh(`Forward kinematics T(0→n) at q = [${q.map((v, i) => robot.joints[i].type === 'P' ? f(v, 3) + ' m' : f(LK.deg(v), 1) + '°').join(', ')}]`); table(['', '', '', ''], Tn.map(r => r.map(v => f(v, 4))), { extra: { showHead: false, tableWidth: 90 } }); P(`End-effector position: x = ${f(Tn[0][3], 4)} m, y = ${f(Tn[1][3], 4)} m, z = ${f(Tn[2][3], 4)} m.`); }
    const mets = LK.obsMetrics(lab, st); Hh('Numerical results from the observations'); if (mets.length) table(['Station', 'Quantity', 'n', 'Min', 'Max', 'Mean', 'Std. dev.'], mets.map(m => [m.station, m.label, m.n, f(m.min, 4), f(m.max, 4), f(m.mean, 4), f(m.sd, 4)])); else none('No numeric observations recorded.');
    if ((st.nb.calculations || '').trim()) { Hh('Student calculations'); P(st.nb.calculations); }

    /* Page 6 — results and graphs */
    page('Results and graphs'); Hh('Observation tables'); if (used.length) used.forEach(s => { const o = st.obs[s]; P(RIL.sims[s].title, { bold: true }); table(['#'].concat(o.cols.map(c => c.label)), o.rows.map((r, i) => [i + 1].concat(o.cols.map(c => String(r[c.key] ?? '—')))), { size: o.cols.length > 8 ? 6.5 : 7.5 }); }); else none('No observations recorded.');
    Hh('Graphs'); const gs = (opts.graphs || []).filter(g => !g.view); let drew = 0;
    for (const g of gs) { const w = 120, h = w * g.h / g.w; P(g.title, { bold: true, size: 8.5 }); image(g.url, w, Math.min(h, 80)); drew++; }
    if (run) { const hold = document.createElement('div'); hold.style.cssText = 'position:fixed;left:-9999px;top:0;width:760px'; document.body.append(hold); const tt = run.series['t (s)']; const mk = (title, keys, ylab) => { const c = LK.chart(hold, { title, x: 'time (s)', y: ylab, series: keys.map(k => ({ label: k, dash: /desired/.test(k) ? [4, 3] : [] })), height: 300 }); keys.forEach((k, i) => c.set(i, run.series[k].map((v, j) => [tt[j], v]))); c.chart.resize(760, 300); c.flush(); return c.png(); };
      const jk = Object.keys(run.series).filter(k => /^q\d/.test(k)); const sets = [['Joint positions: desired (dashed) and actual', jk, 'rad | m'], ['Tool-tip position', ['x (m)', 'y (m)', 'z (m)'], 'm'], ['Tool-tip tracking error', ['tip error (mm)'], 'mm']]; if (run.series['tau1']) sets.push(['Joint torques', Object.keys(run.series).filter(k => /^tau/.test(k)), 'N·m | N']);
      for (const s of sets) { P(`${s[0]} — Workcell run “${run.name}”`, { bold: true, size: 8.5 }); image(mk(...s), 150, 59); drew++; } hold.remove(); }
    if (!drew) none('No graphs captured. Generate the report from the practical page with a station open, or save a Workcell run.');
    Hh('Performance metrics'); if (run) table(['Metric (Workcell run)', 'Value'], Object.entries(run.metrics).filter(e => e[1] !== null).map(e => [e[0], f(e[1], 4)]), { size: 9 }); else if (mets.length) P('See “Numerical results from the observations” on the previous page.'); else none();
    Hh('Theoretical versus simulated'); if (run) P(`Planned (theoretical) trajectory against simulated motion: joint RMSE ${Number(run.metrics['Joint RMSE (rad)']).toExponential(2)} rad, tool-tip RMSE ${f(run.metrics['Tip RMSE (mm)'], 3)} mm (${run.mode === 'kin' ? 'kinematic model: the joints follow the plan exactly' : 'dynamic model with joint controller'}).`); if ((st.nb.comparison || '').trim()) P(st.nb.comparison); else if (!run) none('Compare one observation row with the value given by the equations on the previous page and write the difference in the notebook field “Theory vs simulation”.');

    /* Page 7 — assessment and conclusion */
    page('Assessment and conclusion'); Hh('Multiple-choice assessment'); if (st.mcq) { table(['Q', 'Question', 'Your answer', 'Correct answer', 'Marks'], lab.mcqs.map((q, i) => { const a = st.mcq.answers[i]; return [i + 1, q.q, a === null || a === undefined ? '—' : q.o[a], q.o[q.a], a === q.a ? '1' : '0']; }), { size: 7.5, extra: { columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 62 }, 4: { cellWidth: 13 } } } }); P(`Marks obtained: ${st.mcq.score} / 5 (${st.mcq.score * 20} %), submitted ${st.mcq.date}. Attempts: ${st.attempts.length}.`, { bold: true }); } else none('The five MCQs have not been attempted.');
    Hh('Result and discussion'); (st.nb.discussion || '').trim() ? P(st.nb.discussion) : none(); Hh('Conclusion'); (st.nb.conclusion || '').trim() ? P(st.nb.conclusion) : none(); Hh('Student reflection'); (st.nb.reflection || '').trim() ? P(st.nb.reflection) : none();
    y = Math.max(y + 10, H - 50); room(24); font(false, 9, 60); doc.text('Student signature: ______________________', mx, y); doc.text('Faculty signature: ______________________', W - mx, y, { align: 'right' });
    const n = doc.getNumberOfPages(); for (let i = 1; i <= n; i++) { doc.setPage(i); font(false, 7.5, 130); doc.text(`Robotics and Instrumentation Virtual Laboratory · ${LK.today()} · values as recorded in the simulation`, mx, H - 8); doc.text(`Page ${i} of ${n}`, W - mx, H - 8, { align: 'right' }); }
    const name = `Experiment_${String(lab.n).padStart(2, '0')}_${(stu.name || 'report').replace(/[^\w]+/g, '_')}.pdf`; doc.save(name);
    const log = LK.store.get('reports', []); log.unshift({ lab: id, name, date: new Date().toLocaleString(), pages: n }); LK.store.set('reports', log.slice(0, 40)); LK.toast('Report downloaded: ' + name, 'ok'); return { pages: n, name };
  };
})();
