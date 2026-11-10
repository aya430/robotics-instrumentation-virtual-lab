/* BAIRWABOT – voice.js
   Text-to-speech (SpeechSynthesis), speech-to-text (Web Speech API), rule-based
   command parser, built-in knowledge base and optional AI backend hook. */
(function () {
  'use strict';
  const BB = window.BB;
  const V = (BB.Voice = {
    lang: 'en', muted: false, rate: 1, pitch: 1, queue: [], cur: null, last: '', listening: false, paused: false, fast: false, voices: [], supported: { tts: false, stt: false }, micStatus: 'idle',
    init() {
      V.lang = (BB.CONFIG && BB.CONFIG.LANGUAGE) || 'en';
      V.synth = window.speechSynthesis || null; V.supported.tts = !!V.synth;
      if (V.synth) { const load = () => { V.voices = V.synth.getVoices() || []; }; load(); if (V.synth.addEventListener) V.synth.addEventListener('voiceschanged', load); }
      V.SR = window.SpeechRecognition || window.webkitSpeechRecognition || null; V.supported.stt = !!V.SR;
    },
    pickVoice(lang) {
      const want = lang === 'hi' ? ['hi-IN', 'hi'] : ['en-IN', 'en-GB', 'en-US', 'en'];
      for (const w of want) { const v = V.voices.find(x => x.lang && x.lang.replace('_', '-').toLowerCase().startsWith(w.toLowerCase())); if (v) return v; }
      return null;
    },
    hasHindiVoice() { return !!V.voices.find(x => x.lang && x.lang.toLowerCase().startsWith('hi')); },
    say(text, o) {
      o = o || {}; if (!text) return;
      if (!o.keep) V.cancel(true);
      V.last = text; const lang = /[ऀ-ॿ]/.test(text) ? 'hi' : 'en';
      const parts = text.match(/[^.!?।]+[.!?।]*/g) || [text];
      parts.map(s => s.trim()).filter(Boolean).forEach(s => V.queue.push({ text: s, lang }));
      if (o.log !== false) BB.UI.chat('bot', text);
      if (o.expr) BB.robot.face.set(o.expr);
      V._next();
    },
    _next() {
      if (V.cur) return;
      const it = V.queue.shift();
      if (!it) { BB.robot.face.speaking = false; BB.UI.subtitle(''); BB.UI.voiceState(); return; }
      const words = it.text.split(/\s+/).length;
      const c = (V.cur = { text: it.text, el: 0, est: V.fast ? 0.04 : Math.max(0.9, (words * 0.38 + 0.25) / V.rate), mode: 'timer', started: false });
      BB.UI.subtitle(it.text); BB.robot.face.speaking = true; BB.UI.voiceState();
      if (!V.muted && V.synth && !V.fast) {
        try {
          const u = new SpeechSynthesisUtterance(it.text); const vc = V.pickVoice(it.lang);
          if (vc) u.voice = vc; u.lang = vc ? vc.lang : (it.lang === 'hi' ? 'hi-IN' : 'en-IN'); u.rate = V.rate; u.pitch = V.pitch;
          u.onstart = () => { c.started = true; };
          u.onboundary = () => { BB.robot.face.pulse = 1; };
          u.onend = () => V._finish(c); u.onerror = () => { if (c.started) V._finish(c); else c.mode = 'timer'; };
          c.mode = 'tts'; c.u = u; V.synth.speak(u);
        } catch (e) { c.mode = 'timer'; }
      }
    },
    _finish(c) { if (V.cur !== c) return; V.cur = null; V._next(); },
    update(dt) {
      const c = V.cur; if (!c || V.paused) return;
      c.el += dt;
      if (c.mode === 'tts') {
        if (!c.started && c.el > 1.6) { c.mode = 'timer'; c.el = 0; try { V.synth.cancel(); } catch (e) { } }   // speech blocked/unavailable → silent subtitles
        else if (c.started && c.el > c.est * 2.5 + 5) V._finish(c);
      } else if (c.el >= c.est) V._finish(c);
    },
    busy() { return !!V.cur || V.queue.length > 0; },
    cancel(silent) { V.queue = []; const c = V.cur; V.cur = null; if (c && c.mode === 'tts') { try { V.synth.cancel(); } catch (e) { } } if (BB.robot) BB.robot.face.speaking = false; if (!silent) { BB.UI.subtitle(''); BB.UI.voiceState(); } },
    pause(on) { V.paused = on; if (V.synth) { try { on ? V.synth.pause() : V.synth.resume(); } catch (e) { } } },
    setMuted(m) { V.muted = m; if (m && V.cur && V.cur.mode === 'tts') { try { V.synth.cancel(); } catch (e) { } V.cur.mode = 'timer'; } },
    repeat() { if (V.last) V.say(V.last, { log: false }); },
    /* ---------- speech recognition ---------- */
    listen() {
      if (!V.SR) { V.micStatus = 'unsupported'; BB.UI.mic('Speech recognition is not supported in this browser – please type your command below.', 'err'); return false; }
      if (V.listening) return true;
      V.cancel();
      try {
        const r = (V.rec = new V.SR()); r.lang = V.lang === 'hi' ? 'hi-IN' : 'en-IN'; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
        r.onstart = () => { V.listening = true; V.micStatus = 'listening'; BB.UI.mic('Listening… speak a command or question.', 'on'); BB.UI.voiceState(); };
        r.onresult = (e) => { let fin = '', inter = ''; for (let i = e.resultIndex; i < e.results.length; i++) { const t = e.results[i][0].transcript; if (e.results[i].isFinal) fin += t; else inter += t; } if (inter) BB.UI.mic('Heard: “' + inter + '”', 'on'); if (fin) { BB.UI.mic('Recognized: “' + fin.trim() + '”', 'ok'); BB.Brain.handle(fin.trim(), 'voice'); } };
        r.onerror = (e) => { const m = { 'not-allowed': 'Microphone permission was denied. Allow microphone access in the browser, or type your command below.', 'service-not-allowed': 'Speech service is blocked on this page (HTTPS is required). Type your command below.', 'no-speech': 'No speech detected. Press Start Listening and try again.', 'audio-capture': 'No microphone was found. Type your command below.', network: 'Speech recognition needs an internet connection. Type your command below.' }; V.micStatus = 'error'; BB.UI.mic(m[e.error] || ('Microphone error: ' + e.error), 'err'); };
        r.onend = () => { V.listening = false; if (V.micStatus === 'listening') { V.micStatus = 'idle'; BB.UI.mic('Microphone idle.', ''); } BB.UI.voiceState(); };
        r.start(); return true;
      } catch (e) { V.micStatus = 'error'; BB.UI.mic('Could not start the microphone: ' + e.message, 'err'); return false; }
    },
    stopListen() { if (V.rec) { try { V.rec.stop(); } catch (e) { } } V.listening = false; V.micStatus = 'idle'; BB.UI.mic('Microphone idle.', ''); BB.UI.voiceState(); }
  });

  /* ---------- knowledge base ---------- */
  const KB = [
    [['humanoid'], 'A humanoid robot is a robot designed with a human-like body structure. It typically includes a head, torso, two arms, two legs, sensors and actuators.', 'ह्यूमनॉइड रोबोट वह रोबोट है जिसकी शारीरिक संरचना मनुष्य जैसी होती है। इसमें सिर, धड़, दो हाथ, दो पैर, सेंसर और एक्चुएटर होते हैं।'],
    [['degree', 'freedom'], 'My conceptual configuration has 46 degrees of freedom, allowing me to perform different human-like movements. Three in the neck, three in the torso, eight in each arm, six in each hand and six in each leg.', 'मेरी संकल्पनात्मक संरचना में 46 डिग्री ऑफ फ्रीडम हैं। गर्दन में तीन, धड़ में तीन, प्रत्येक भुजा में आठ, प्रत्येक हाथ में छह और प्रत्येक पैर में छह।'],
    [['dof'], 'DOF means degrees of freedom: the number of independent joint motions. My conceptual configuration has 46 degrees of freedom.', 'डी ओ एफ का अर्थ है डिग्री ऑफ फ्रीडम, यानी स्वतंत्र जोड़ गतियों की संख्या। मेरे पास 46 हैं।'],
    [['imu'], 'An IMU is an Inertial Measurement Unit. It contains accelerometers and gyroscopes and helps estimate my orientation and motion.', 'आई एम यू यानी इनर्शियल मेज़रमेंट यूनिट। इसमें एक्सेलेरोमीटर और जाइरोस्कोप होते हैं जो मेरी दिशा और गति का अनुमान लगाते हैं।'],
    [['inverse', 'kinematic'], 'Inverse kinematics computes the joint angles needed to place my hand or foot at a desired position. I solve it numerically with a damped least squares method using the Jacobian.', 'इनवर्स काइनेमैटिक्स से वे जोड़ कोण निकाले जाते हैं जिनसे हाथ या पैर इच्छित स्थान पर पहुँचे।'],
    [['forward', 'kinematic'], 'Forward kinematics computes the position and orientation of the end effector from known joint angles by multiplying the homogeneous transformation matrices of each link.', 'फॉरवर्ड काइनेमैटिक्स में ज्ञात जोड़ कोणों से एंड इफेक्टर की स्थिति निकाली जाती है।'],
    [['kinematic'], 'Kinematics studies motion without considering forces. Forward kinematics maps joint angles to end effector pose, and inverse kinematics maps a desired pose back to joint angles.'],
    [['sensor'], 'I use an RGB camera, a depth camera, a microphone array, an inertial measurement unit, joint encoders, force and torque sensors, foot pressure sensors and a LiDAR. Together they let me see, hear, feel contact and keep my balance.', 'मेरे पास आर जी बी कैमरा, डेप्थ कैमरा, माइक्रोफोन, आई एम यू, जॉइंट एनकोडर, फोर्स सेंसर, प्रेशर सेंसर और लाइडार हैं।'],
    [['actuator'], 'An actuator converts electrical energy into motion. Each of my joints uses a brushless DC motor with a high ratio reducer, an encoder and a motor driver to produce controlled torque.', 'एक्चुएटर विद्युत ऊर्जा को गति में बदलता है। मेरे प्रत्येक जोड़ में ब्रशलेस डी सी मोटर, गियर रिड्यूसर और एनकोडर है।'],
    [['motor'], 'My joints are driven by brushless DC motors with harmonic or planetary reducers. The reducer multiplies torque and divides speed by the gear ratio.'],
    [['lidar'], 'LiDAR measures distance by timing laser pulses. Range equals the speed of light multiplied by the time of flight, divided by two. I use it for mapping and obstacle detection.'],
    [['camera'], 'My RGB camera captures colour images for recognition, and my stereo depth camera measures distance using triangulation: depth equals focal length times baseline divided by disparity.'],
    [['zmp'], 'The zero moment point is the point on the ground where the net moment of gravity and inertial forces has no horizontal component. I am dynamically balanced while it stays inside the support polygon.'],
    [['centre', 'mass'], 'The centre of mass is the mass weighted average position of all my links. For static balance its ground projection must stay inside the support polygon.'],
    [['center', 'mass'], 'The centre of mass is the mass weighted average position of all my links. For static balance its ground projection must stay inside the support polygon.'],
    [['support', 'polygon'], 'The support polygon is the convex hull of all contact points between my feet and the ground. Keeping the centre of pressure inside it prevents tipping.'],
    [['balance'], 'I balance by keeping my centre of pressure inside the support polygon. I use ankle, hip and stepping strategies, with feedback from my inertial measurement unit and foot force sensors.', 'मैं अपने सेंटर ऑफ प्रेशर को सपोर्ट पॉलीगॉन के अंदर रखकर संतुलन बनाता हूँ।'],
    [['gait'], 'A gait cycle has a stance phase, about sixty percent, and a swing phase, about forty percent. Walking always has at least one foot on the ground. Running has a flight phase with no ground contact.'],
    [['walk'], 'I walk by shifting my weight onto one foot, swinging the other leg forward, and repeating. The stance foot is constrained so it does not slip, and my arms swing opposite to my legs.', 'मैं अपना भार एक पैर पर लेकर दूसरा पैर आगे बढ़ाता हूँ, और यह क्रम दोहराता हूँ।'],
    [['battery'], 'My conceptual design uses a lithium ion battery pack in the torso with a battery management system for cell balancing, protection and state of charge estimation. The value shown on screen is simulated.', 'मेरे धड़ में लिथियम आयन बैटरी पैक और बैटरी मैनेजमेंट सिस्टम है। स्क्रीन पर दिखाया गया मान सिम्युलेटेड है।'],
    [['speech', 'synth'], 'Speech synthesis converts text into audio. The text is normalised, converted to phonemes, given rhythm and pitch, and finally a vocoder generates the waveform.'],
    [['speak'], 'I speak using text to speech. The browser speech synthesis engine converts my response text to audio while my mouth display is animated in sync.'],
    [['recogni', 'speech'], 'Speech recognition converts your voice to text. Audio features are extracted, an acoustic model predicts phonemes, and a language model selects the most probable words.'],
    [['voice'], 'You can talk to me with voice commands such as walk forward, turn left, sit down, wave your hand or start dancing. I convert your speech to text, match the command and respond.'],
    [['torque'], 'Torque is the turning effect of a force. Joint torque equals inertia times angular acceleration plus gravity and friction terms. Motors and reducers must supply this torque.'],
    [['jacobian'], 'The Jacobian relates joint velocities to end effector velocity. I use its damped pseudo inverse to solve inverse kinematics iteratively.'],
    [['control'], 'My control architecture is layered. A high level planner chooses behaviours, a whole body controller generates joint trajectories, and joint level servo loops track them using encoder feedback.'],
    [['path', 'plan'], 'Path planning finds a collision free route from start to goal. In my navigation module I use the A star algorithm on an occupancy grid.'],
    [['slam'], 'SLAM means simultaneous localization and mapping. The robot builds a map of an unknown environment while estimating its own position inside that map.'],
    [['artificial', 'intelligence'], 'Artificial intelligence lets me perceive, decide and learn. I use it for recognising speech and objects, planning motion and holding conversations.'],
    [['machine', 'learning'], 'Machine learning lets a system improve from data. Humanoid robots use it for vision, speech recognition and learning locomotion policies.'],
    [['applicat'], 'Humanoid robots are used in education, research, healthcare assistance, elderly care, logistics, hazardous environments, reception and customer service.'],
    [['height'], 'My conceptual height is about 1.72 metres, similar to an adult human.'],
    [['weight'], 'My conceptual mass model totals about 57 kilograms. It is a simulated value used for centre of mass calculations.'],
    [['who', 'made'], 'I am BAIRWABOT, the guide of this virtual laboratory. The concept and educational direction are by Doctor Bansilal Bairwa.'],
    [['creat'], 'I am BAIRWABOT, the guide of this virtual laboratory. The concept and educational direction are by Doctor Bansilal Bairwa.'],
    [['your', 'name'], 'My name is BAIRWABOT. I am your humanoid robotic assistant in this virtual laboratory.', 'मेरा नाम बैरवाबॉट है। मैं इस वर्चुअल प्रयोगशाला में आपका ह्यूमनॉइड रोबोटिक सहायक हूँ।'],
    [['who', 'you'], 'I am BAIRWABOT, a humanoid robot built for learning robotics. I can walk, speak, listen, recognise objects and explain engineering principles.', 'मैं बैरवाबॉट हूँ, रोबोटिक्स सीखने के लिए बनाया गया ह्यूमनॉइड रोबोट।'],
    [['what', 'can', 'do'], 'I can walk, run, sit, stand, dance, speak, listen, recognise objects, pick and place things, open doors and explain the engineering behind every action. Choose any of the thirty modules to see a demonstration.'],
    [['thank'], 'You are welcome! Keep exploring robotics.', 'आपका स्वागत है! रोबोटिक्स सीखते रहिए।'],
    [['how', 'are', 'you'], 'All my systems are working normally. Thank you for asking! What would you like to learn?', 'मेरी सभी प्रणालियाँ ठीक काम कर रही हैं। धन्यवाद!']
  ];
  const HI = {
    greet: 'नमस्ते! मैं बैरवाबॉट हूँ, आपका ह्यूमनॉइड रोबोटिक सहायक। ह्यूमनॉइड रोबोटिक्स वर्चुअल लैब में आपका स्वागत है।',
    fwd: 'मैं आगे चल रहा हूँ।', back: 'मैं पीछे चल रहा हूँ।', stop: 'मैं रुक गया हूँ।', left: 'मैं बाएँ मुड़ रहा हूँ।', right: 'मैं दाएँ मुड़ रहा हूँ।',
    raiseR: 'मैंने अपना दायाँ हाथ उठाया है।', raiseL: 'मैंने अपना बायाँ हाथ उठाया है।', wave: 'नमस्ते! मैं हाथ हिला रहा हूँ।', sit: 'मैं बैठ रहा हूँ।', stand: 'मैं खड़ा हो रहा हूँ।',
    dance: 'चलिए नाचते हैं!', run: 'मैं दौड़ रहा हूँ।', bend: 'मैं आगे झुक रहा हूँ।', squat: 'मैं स्क्वाट कर रहा हूँ।', pick: 'मैं वस्तु उठा रहा हूँ।', place: 'मैं वस्तु रख रहा हूँ।',
    body: 'मेरे शरीर में सिर, धड़, दो भुजाएँ, दो पाँच-उँगली वाले हाथ, श्रोणि और दो पैर हैं, कुल 46 डिग्री ऑफ फ्रीडम के साथ।', reset: 'मैं प्रारंभिक स्थिति में लौट आया हूँ।',
    unknown: 'क्षमा करें, मुझे यह समझ नहीं आया। कृपया कोई आदेश दें, जैसे आगे चलो, या रोबोटिक्स से जुड़ा प्रश्न पूछें।'
  };
  const CMDS = [
    [/stop|halt|रुक|ruk|ruko/, 'stop', 'Stopping. I am standing still.', 'stop'],
    [/(walk|go|move|step).*(back|reverse)|backward|पीछे|peeche|piche/, 'walkBack', 'Walking backward.', 'back'],
    [/(walk|go|move|step)\b.*(forward|ahead|straight)|^walk$|^(go |move )?forward$|आगे|aage/, 'walkFwd', 'Walking forward.', 'fwd'],
    [/turn.*left|left turn|बाएं|बाएँ|baye|baen/, 'turnL', 'Turning left.', 'left'],
    [/turn.*right|right turn|दाएं|दाएँ|daye|daen/, 'turnR', 'Turning right.', 'right'],
    [/(raise|lift).*left.*(hand|arm)|बायां हाथ|बायाँ हाथ/, 'raiseL', 'I have raised my left hand.', 'raiseL'],
    [/(raise|lift).*(hand|arm)|दायां हाथ|दायाँ हाथ|हाथ उठा/, 'raiseR', 'I have raised my right hand.', 'raiseR'],
    [/\bwave\b|हाथ हिला/, 'wave', 'Hello! I am waving my hand.', 'wave'],
    [/\bsit\b|बैठ|baith/, 'sit', 'Sitting down.', 'sit'],
    [/\bstand\b|खड़े|खड़ा|khade/, 'stand', 'Standing up.', 'stand'],
    [/danc|नाच|naach/, 'dance', 'Let us dance!', 'dance'],
    [/\brun|jog|दौड़|daud/, 'run', 'Running.', 'run'],
    [/\bbend\b|\bbow\b|झुक/, 'bend', 'Bending forward.', 'bend'],
    [/squat/, 'squat', 'Squatting.', 'squat'],
    [/\bpick\b|\bgrab\b|उठाओ/, 'pick', 'Picking up the object.', 'pick'],
    [/\bplace\b|\bput\b|रखो/, 'place', 'Placing the object.', 'place'],
    [/reset/, 'reset', 'Resetting to my home position.', 'reset'],
    [/(explain|describe|tell).*(body|structure)|body structure|शरीर/, 'body', 'My body has a head and neck with three degrees of freedom, a torso with three, two arms with eight each, two five finger hands with six each, a pelvis, and two legs with six each. That is forty six degrees of freedom in total. My frame carries the main computer, battery, sensors and joint actuators.', 'body'],
    [/^(hello|hi|hey|namaste|नमस्ते)\b.*|hello bairwabot|hi bairwabot/, 'greet', 'Hello! I am BAIRWABOT. It is nice to meet you. How can I help you today?', 'greet']
  ];
  BB.Brain = {
    KB, CMDS,
    handle(text, src) {
      const raw = text.trim(); if (!raw) return;
      BB.UI.chat('user', raw + (src === 'voice' ? '  🎤' : ''));
      BB.UI.cmdStatus('Processing: “' + raw + '”', 'busy');
      BB.robot.face.set('thinking');
      setTimeout(() => BB.Brain.respond(raw), V.fast ? 0 : 550);
    },
    respond(raw) {
      const s = raw.toLowerCase().replace(/[?.!,]/g, ' ').replace(/\s+/g, ' ').trim(), hi = V.lang === 'hi';
      const mm = s.match(/module\s*(\d{1,2})/);
      if (mm && +mm[1] >= 1 && +mm[1] <= 30) { BB.Lab.openModule(+mm[1]); BB.UI.cmdStatus('Opened module ' + mm[1], 'ok'); return; }
      for (const c of CMDS) {
        if (c[0].test(s)) {
          BB.robot.face.set('happy'); BB.UI.cmdStatus('Executing command: ' + c[1], 'ok');
          BB.Actions[c[1]](); V.say(hi && HI[c[3]] ? HI[c[3]] : c[2]); return;
        }
      }
      let best = null, bs = 0;
      for (const k of KB) { let sc = 0; for (const w of k[0]) if (s.includes(w)) sc++; if (sc === k[0].length && sc > bs) { bs = sc; best = k; } }
      if (best) { BB.robot.face.set('smile'); BB.UI.cmdStatus('Answered from the built-in knowledge base', 'ok'); BB.motion.pose = BB.POSES.present; setTimeout(() => { if (BB.motion.pose === BB.POSES.present) BB.motion.pose = {}; }, 3500); V.say(hi && best[2] ? best[2] : best[1]); return; }
      const ep = BB.CONFIG && BB.CONFIG.AI_ENDPOINT;
      if (ep) {
        BB.UI.cmdStatus('Asking the connected AI backend…', 'busy');
        fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: raw, language: V.lang }) })
          .then(r => r.json()).then(j => { BB.robot.face.set('smile'); BB.UI.cmdStatus('Answered by the AI backend', 'ok'); V.say(String(j.answer || j.text || 'I did not receive an answer.')); })
          .catch(() => { BB.robot.face.set('confusion'); BB.UI.cmdStatus('AI backend unavailable', 'err'); V.say('I could not reach my AI backend. Please ask me about humanoid robots, sensors, actuators, kinematics, gait or balance.'); });
        return;
      }
      BB.robot.face.set('confusion'); BB.UI.cmdStatus('No matching command or answer', 'err');
      V.say(hi ? HI.unknown : 'I am not sure about that yet. My built-in knowledge covers humanoid robots, degrees of freedom, sensors, actuators, kinematics, gait, balance and speech. Open-ended questions need an AI backend to be connected. You can also give me a command such as walk forward or wave your hand.');
    },
    greeting() { return V.lang === 'hi' ? HI.greet + ' आप मुझसे प्रश्न पूछ सकते हैं या आवाज़ से आदेश दे सकते हैं। आइए, साथ मिलकर रोबोटिक्स सीखें!' : "Hello! I am BAIRWABOT, your humanoid robotic assistant. Welcome to the Humanoid Robotics Virtual Lab. I am here to help you understand humanoid robots, their mechanical structure, sensors, actuators, movements, artificial intelligence and human-robot interaction. You can ask me questions or give me voice commands. Let's explore robotics together!"; }
  };
})();
