/* quiz-engine.js — unit practice quizzes. Answers are revealed only after submission. */
(function () {
  'use strict';
  const RIL = window.RIL;
  function check(q, val) {
    if (q.type === 'num') {
      const v = parseFloat(String(val).replace(',', '.')); if (isNaN(v)) return false;
      const tol = q.tol ?? 0.02; return Math.abs(v - q.answer) <= Math.max(Math.abs(q.answer) * tol, q.abs ?? 1e-9);
    }
    return +val === q.answer;
  }
  RIL.quizEngine = {
    check,
    render(host, unit) {
      const qs = (RIL.quiz && RIL.quiz[unit]) || [];
      const u = RIL.units[unit - 1];
      const form = document.createElement('form'); form.className = 'quiz'; form.id = 'quiz-u' + unit; form.noValidate = true;
      const cats = {}; qs.forEach(q => (cats[q.cat] = (cats[q.cat] || 0) + 1));
      form.innerHTML = `<p class="muted">${qs.length} questions for Unit ${u.roman}: ${Object.entries(cats).map(([k, v]) => `${v} ${k.toLowerCase()}`).join(', ')}. Numerical answers are accepted within the stated tolerance.</p>` +
        qs.map((q, i) => `<div class="qcard" data-i="${i}"><div class="qh"><span>Question ${i + 1}</span><span>${q.cat}</span></div><div class="qt">${q.q}</div>
        ${q.type === 'num' ? `<label>Your answer${q.unit ? ' (' + q.unit + ')' : ''}: <input type="number" step="any" name="q${i}" inputmode="decimal"></label>` :
          q.options.map((o, j) => `<label class="opt"><input type="radio" name="q${i}" value="${j}"><span>${o}</span></label>`).join('')}
        <div class="fb" aria-live="polite"></div></div>`).join('') +
        `<div class="scorebar"><button class="btn amber" type="submit">Submit answers</button><button class="btn ghost" type="button" data-reset style="color:#fff;border-color:#2a4677">Clear and try again</button><span class="score" hidden></span><span class="scoremsg"></span></div>`;
      host.append(form);
      if (RIL.typeset) RIL.typeset(form);
      form.addEventListener('submit', ev => {
        ev.preventDefault(); let score = 0, answered = 0;
        qs.forEach((q, i) => {
          const card = form.querySelector(`.qcard[data-i="${i}"]`); const fb = card.querySelector('.fb');
          let val = null;
          if (q.type === 'num') { val = form.elements['q' + i].value; } else { const sel = form.querySelector(`input[name="q${i}"]:checked`); val = sel ? sel.value : null; }
          if (val !== null && val !== '') answered++;
          const ok = val !== null && val !== '' && check(q, val); if (ok) score++;
          card.classList.add('done');
          if (q.type !== 'num') card.querySelectorAll('label.opt').forEach((l, j) => { l.classList.toggle('correct', j === q.answer); l.classList.toggle('wrong', String(j) === val && j !== q.answer); });
          const correct = q.type === 'num' ? `${q.answer}${q.unit ? ' ' + q.unit : ''}` : q.options[q.answer];
          fb.innerHTML = `<b class="${ok ? 'ok' : 'bad'}">${ok ? 'Correct.' : (val === null || val === '' ? 'Not answered.' : 'Not correct.')}</b> ${ok ? '' : 'Correct answer: ' + correct + '. '}${q.explain || ''}`;
        });
        const sc = form.querySelector('.score'); sc.hidden = false; sc.textContent = `${score} / ${qs.length}`;
        form.querySelector('.scoremsg').textContent = `${Math.round(100 * score / qs.length)}% correct, ${answered} answered.`;
        if (RIL.typeset) RIL.typeset(form);
      });
      form.querySelector('[data-reset]').addEventListener('click', () => {
        form.reset(); form.querySelectorAll('.qcard').forEach(c => { c.classList.remove('done'); c.querySelector('.fb').innerHTML = ''; c.querySelectorAll('label.opt').forEach(l => l.classList.remove('correct', 'wrong')); });
        form.querySelector('.score').hidden = true; form.querySelector('.scoremsg').textContent = '';
      });
    }
  };
})();
