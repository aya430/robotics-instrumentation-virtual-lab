/* BAIRWABOT – content-a.js : educational content and quizzes for modules 01–15.
   Fields: t title · cat category · obj learning objectives · intro · comp components · principle (mechanical
   working principle) · sensors · actuators · control · steps (animation explanation) · eq equations ·
   apps applications · narr voice narration · exp interactive experiment · quiz [question, options, answer, explanation] */
(function () {
  'use strict';
  const BB = (window.BB = window.BB || {});
  BB.CATS = { A: 'Basic Human-Like Movements', B: 'Speaking, Listening and Human Interaction', C: 'Intelligent Actions and Object Manipulation', D: 'Advanced Humanoid Robotics', E: 'Human Assistance and Real-World Applications' };
  BB.MODULES = [];
  const m = (o) => BB.MODULES.push(o);

  m({ id: 1, cat: 'A', t: 'Standing and Self-Introduction',
    obj: ['Identify the main body assemblies of a humanoid robot.', 'Explain how a humanoid keeps an upright standing posture.', 'Relate a simple gesture (waving) to the joints that produce it.'],
    intro: 'Standing still is the first skill of any biped. BAIRWABOT holds an upright posture, looks at the user, blinks, waves its right hand and introduces itself by voice.',
    comp: 'Head and neck (3 DOF), torso (3 DOF), right arm (8 DOF), right hand (6 DOF), both legs (12 DOF) holding posture, face display, speaker.',
    principle: 'In quiet standing the leg joints are held near full extension so that the load path passes almost straight through the links and the motors need little torque. The body behaves like an inverted pendulum pivoting about the ankles; small ankle torques keep the centre of mass (CoM) above the feet.',
    sensors: 'IMU (trunk tilt), joint encoders (posture), foot force sensors (centre of pressure), RGB camera (finding the user).',
    actuators: 'Ankle and hip actuators for posture; shoulder roll/yaw and elbow actuators for waving; neck yaw/pitch for gaze; eye and mouth display.',
    control: 'Joint-space PD position control holds each joint at its reference angle; an ankle-strategy balance loop adds a correction proportional to the measured tilt. The wave is a sinusoidal elbow trajectory superimposed on a fixed raised-arm posture.',
    steps: ['The balance controller holds the standing posture with both feet flat (double support).', 'The neck turns the head so the cameras face the user; the eyes blink.', 'Shoulder roll lifts the right upper arm sideways and shoulder yaw turns the forearm upward.', 'The elbow oscillates at about 1.4 Hz to produce the wave.', 'The speech synthesiser plays the greeting while the mouth display is driven in sync.'],
    eq: ['Inverted pendulum: τ_ankle = m·g·l·sin θ  (torque needed to hold a lean angle θ)', 'PD joint control: τ = K_p(θ_ref − θ) + K_d(θ̇_ref − θ̇)', 'Wave trajectory: θ_elbow(t) = θ₀ + A·sin(2πft)'],
    apps: 'Reception and guide robots, exhibition hosts, classroom assistants, human-robot interaction research.',
    narr: 'Hello everyone! My name is BAIRWABOT. Welcome to the Humanoid Robotics Virtual Lab. I am your intelligent robotic assistant. I can walk, run, speak, listen, recognize objects and interact with humans. Let me demonstrate my capabilities!',
    exp: 'Trigger the wave and the blink separately and watch which joint angles change in the Live Data tab while the legs stay still.',
    quiz: [
      ['During quiet standing a humanoid is most often modelled as:', ['A rolling wheel', 'An inverted pendulum', 'A simple spring', 'A rigid cube'], 1, 'The body pivots about the ankles with its mass high above them – an inverted pendulum.'],
      ['Which sensor directly measures the tilt of the trunk?', ['Joint encoder', 'Microphone', 'IMU', 'RGB camera'], 2, 'The IMU fuses gyroscope and accelerometer data into orientation.'],
      ['Which joint oscillates to produce BAIRWABOT’s wave?', ['Knee', 'Elbow', 'Ankle', 'Hip'], 1, 'The upper arm is held raised while the elbow swings the forearm.'],
      ['Why are the knees kept nearly straight when standing?', ['To look taller', 'To reduce the joint torque needed', 'To cool the motors by airflow', 'To increase friction'], 1, 'With the load line close to the joint axes the gravity moment arm, and therefore the torque, is small.'],
      ['Standing with both feet on the ground is called:', ['Flight phase', 'Single support', 'Double support', 'Swing phase'], 2, 'Two feet in contact = double support.']
    ] });

  m({ id: 2, cat: 'A', t: 'Human-Like Walking',
    obj: ['Describe the phases of the walking gait cycle.', 'Distinguish single-support from double-support.', 'Relate step length and step frequency to walking speed.'],
    intro: 'Walking is a periodic motion in which the legs alternate between supporting the body (stance) and moving forward (swing). BAIRWABOT walks forward, backward and sideways with coordinated arm swing.',
    comp: 'Both legs (hip pitch/roll/yaw, knee, ankle pitch/roll – 12 DOF), pelvis, torso yaw, both shoulders and elbows for arm swing, feet with heel and toe.',
    principle: 'Each leg works as a two-link chain. In stance the foot is fixed to the ground and the hip extends, moving the pelvis forward over the foot. In swing the knee flexes to clear the ground and the hip flexes to bring the foot ahead. The arms swing opposite to the legs to cancel the yaw moment of the legs.',
    sensors: 'Joint encoders, IMU, foot force/pressure sensors for heel-strike and toe-off detection.',
    actuators: 'Hip pitch and knee actuators provide most of the power; ankle pitch gives push-off; hip roll and ankle roll shift the weight sideways.',
    control: 'A gait generator produces periodic joint trajectories as a function of the gait phase. The stance foot is constrained not to slip, so the body speed follows from the leg motion. Balance feedback keeps the centre of pressure inside the support polygon.',
    steps: ['Heel strike: the leading heel touches the ground (0 %).', 'Foot flat / loading: the whole sole contacts and the knee flexes slightly to absorb the load.', 'Mid-stance: the body passes over the supporting foot – single support.', 'Heel-off and toe-off: the ankle plantar-flexes to push the body forward (≈ 60 %).', 'Swing: the knee flexes for clearance and the hip swings the leg forward for the next heel strike.', 'Twice per cycle both feet are on the ground: double support.'],
    eq: ['Walking speed: v = step length × step frequency', 'Stance ≈ 60 % and swing ≈ 40 % of the gait cycle', 'Flat-foot condition: θ_ankle = θ_knee − θ_hip + θ_pelvis-pitch', 'Froude number: Fr = v² / (g·L_leg)   (walking for Fr < 0.5)'],
    apps: 'Service robots in human environments, exoskeleton and prosthesis design, gait rehabilitation analysis.',
    narr: 'This is human-like walking. Watch the gait cycle: heel strike, foot flat, mid stance, heel off, toe off and swing. My arms swing opposite to my legs, and at every step there is a short double support phase.',
    exp: 'Change the step length and step frequency sliders, then read the measured walking speed, step length and cadence in Live Data. Verify v ≈ step length × step frequency.',
    quiz: [
      ['Approximately what fraction of the walking gait cycle is the stance phase?', ['20 %', '40 %', '60 %', '90 %'], 2, 'Stance ≈ 60 %, swing ≈ 40 %.'],
      ['Double support means:', ['Both feet are in the air', 'Both feet are on the ground', 'Both arms support the body', 'Two robots walk together'], 1, 'It occurs twice per walking cycle.'],
      ['Walking speed equals:', ['Step length ÷ step frequency', 'Step length × step frequency', 'Leg length × knee angle', 'Mass × gravity'], 1, 'Distance per step times steps per second.'],
      ['Why do the arms swing opposite to the legs?', ['To cool the actuators', 'To cancel the yaw moment produced by the legs', 'To increase step length', 'For appearance only'], 1, 'Counter-swing reduces the net angular momentum about the vertical axis.'],
      ['Which event ends the stance phase of a leg?', ['Heel strike', 'Mid-stance', 'Toe-off', 'Foot flat'], 2, 'After toe-off the foot leaves the ground and swing begins.']
    ] });

  m({ id: 3, cat: 'A', t: 'Running and Jogging',
    obj: ['Explain the flight phase that distinguishes running from walking.', 'Compare joint ranges and cadence in walking, jogging and running.', 'Describe energy storage in the spring-mass running model.'],
    intro: 'In running there is a phase in which neither foot touches the ground. BAIRWABOT accelerates from a walk to a jog and a run, then decelerates and stops.',
    comp: 'Legs (12 DOF), torso pitch (forward lean), shoulders and elbows (arms bent about 90°), feet.',
    principle: 'Running is modelled by a spring-loaded inverted pendulum (SLIP): the leg compresses like a spring at landing, stores energy and returns it at push-off. Stance time falls below 50 % of the cycle, so the two stance phases no longer overlap and a flight phase appears.',
    sensors: 'IMU (body pitch and vertical acceleration), foot force sensors (landing impact, contact detection), joint encoders.',
    actuators: 'High-power knee and hip actuators, ankle push-off actuators; high torque density and back-drivability are needed to absorb landing impacts.',
    control: 'The gait generator raises cadence and joint amplitude with speed. Landing is controlled with low joint impedance (compliance); flight-phase leg placement determines the next step and regulates speed.',
    steps: ['The robot starts walking, then increases cadence – jogging.', 'The trunk leans forward and the elbows flex to about 90°.', 'Push-off: ankle and knee extend and the body leaves the ground.', 'Flight phase: no ground contact; the swing leg is brought forward.', 'Landing: the knee flexes to absorb the impact.', 'Deceleration: amplitude and cadence fall until double support returns.'],
    eq: ['Duty factor β = stance time / stride time;  walking β > 0.5, running β < 0.5', 'SLIP leg force: F = k·(l₀ − l)', 'Flight time: t_f = 2·v_z / g', 'Peak landing force ≈ 2–3 × body weight'],
    apps: 'Dynamic legged robots, sports biomechanics, search-and-rescue robots that must move quickly.',
    narr: 'Now I will jog and run. The difference between walking and running is the flight phase. In running, both of my feet leave the ground between steps, and my knees bend to absorb each landing.',
    exp: 'Switch between Walk, Jog and Run. In Live Data watch the ground-contact indicators: only in running do both show “no contact” at the same time.',
    quiz: [
      ['What distinguishes running from walking?', ['Longer arms', 'A flight phase with no ground contact', 'A double-support phase', 'Straight knees'], 1, 'Running has no double support; instead it has flight.'],
      ['In running the duty factor (stance/stride time) is:', ['Greater than 0.5', 'Exactly 1', 'Less than 0.5', 'Zero'], 2, 'Each foot is on the ground for less than half the stride.'],
      ['The SLIP model represents the leg as:', ['A rigid rod', 'A spring', 'A wheel', 'A damper only'], 1, 'Spring-Loaded Inverted Pendulum.'],
      ['Why does the knee flex at landing?', ['To absorb impact energy', 'To increase speed', 'To reduce friction', 'To switch off the motor'], 0, 'Flexion lengthens the deceleration distance and lowers peak force.'],
      ['Flight time for vertical take-off speed v_z is:', ['v_z / g', '2·v_z / g', 'g / v_z', 'v_z² / g'], 1, 'Up and down each take v_z / g.']
    ] });

  m({ id: 4, cat: 'A', t: 'Sitting and Standing',
    obj: ['Describe the sit-to-stand joint sequence.', 'Explain why the trunk leans forward before rising.', 'Read hip and knee angles during the transition.'],
    intro: 'Sitting down and standing up require coordinated hip, knee and ankle motion while the centre of mass moves between the seat and the feet. BAIRWABOT approaches a chair, turns, sits, waits and stands up.',
    comp: 'Hips, knees and ankles of both legs, torso pitch, pelvis, arms for counter-balance, chair of seat height ≈ 0.43 m.',
    principle: 'To stand, the CoM must be brought over the feet before the legs extend. The trunk flexes forward (momentum transfer), then hips and knees extend together. Sitting is the reverse with the knee extensors lowering the body under control (eccentric work).',
    sensors: 'Joint encoders (hip, knee angles), IMU (trunk pitch), foot force sensors (load transfer from seat to feet), depth camera (chair location).',
    actuators: 'Knee and hip pitch actuators – peak torque occurs at seat-off when the knee moment arm is largest.',
    control: 'A state machine sequences approach → turn → pre-sit lean → sit → wait → lean → rise. Each state provides joint targets that are blended smoothly; the feet remain planted by the stance constraint.',
    steps: ['Approach: walk to a point just in front of the chair.', 'Turn 180° so the back faces the seat.', 'Lean the torso forward and flex hips and knees – the pelvis moves back and down.', 'Seat contact: thighs horizontal, knees near 90°.', 'To rise, lean forward until the CoM is over the feet, then extend knees and hips.'],
    eq: ['Knee torque at seat-off: τ_k ≈ m_upper·g·d   (d = horizontal distance from knee to upper-body CoM)', 'Static condition for rising: x_CoM inside the foot support length', 'Work to stand: W = m·g·Δh'],
    apps: 'Assistive robots, sit-to-stand rehabilitation devices, humanoids using vehicles or workstations.',
    narr: 'I will now sit down and stand up. I approach the chair, turn around, lean my torso forward and bend my hips and knees. To stand up, I first move my centre of mass over my feet.',
    exp: 'Use Sit down and Stand up, and watch the hip-pitch and knee angles approach 90° in Live Data. Turn on the balance markers in Module 23 view to see the CoM move.',
    quiz: [
      ['Why does the trunk lean forward before standing up?', ['To see the floor', 'To move the CoM over the feet', 'To lock the knees', 'To reduce battery use'], 1, 'Rising is only stable when the CoM projection lies over the foot support.'],
      ['When seated upright the knee angle is approximately:', ['0°', '45°', '90°', '180°'], 2, 'Thigh horizontal, shank vertical.'],
      ['Peak knee torque in sit-to-stand occurs:', ['When fully standing', 'At seat-off', 'While waiting seated', 'After standing'], 1, 'The moment arm of body weight about the knee is largest at seat-off.'],
      ['Lowering the body slowly onto the seat requires the knee extensors to do:', ['No work', 'Eccentric (braking) work', 'Only isometric work', 'Electrical work only'], 1, 'They resist gravity while lengthening.'],
      ['The sequence controller used here is a:', ['Finite state machine', 'Random generator', 'Fourier filter', 'Lookup of images'], 0, 'Approach, turn, sit, wait and stand are discrete states.']
    ] });

  m({ id: 5, cat: 'A', t: 'Hand Gestures and Greetings',
    obj: ['Name the joints of a five-finger robotic hand.', 'Classify grasp types (power, precision, pinch…).', 'Explain thumb opposition.'],
    intro: 'Gestures are non-verbal communication. BAIRWABOT waves, shows thumbs-up, points, shows an open palm, a victory sign, a handshake pose and counts on its fingers.',
    comp: 'Right arm (8 DOF) and five-finger hand: thumb (opposition + flexion) and four fingers with three coupled joints each (6 conceptual DOF, expandable to 12).',
    principle: 'Each finger is a serial chain of three phalanges. In an under-actuated design one tendon or linkage flexes all three joints together, so one actuator closes the whole finger. The thumb has an extra opposition axis that swings it across the palm to face the fingers.',
    sensors: 'Finger joint encoders or tendon-position sensors, fingertip tactile sensors, wrist force/torque sensor.',
    actuators: 'Miniature geared DC motors or linear servo actuators in the palm/forearm, with tendon or linkage transmission.',
    control: 'Each gesture is a stored joint-space posture for the arm and a finger-flexion vector for the hand; the controller interpolates between postures.',
    steps: ['Wave: arm raised, elbow oscillates, palm open.', 'Thumbs-up: four fingers fully flexed, thumb extended.', 'Pointing: index extended, other fingers flexed, arm straight forward.', 'Open palm: all fingers extended.', 'Victory: index and middle extended.', 'Handshake pose: arm forward, fingers partly flexed.', 'Counting: fingers extend one by one.'],
    eq: ['Coupled finger: θ_PIP ≈ 0.95·θ_MCP, θ_DIP ≈ 0.7·θ_MCP', 'Tendon travel: Δl = r·Δθ   (pulley radius r)', 'Fingertip force: F = τ / l_moment-arm'],
    apps: 'Sign-language robots, social robots, prosthetic hands, tele-operation.',
    narr: 'Gestures help me communicate without words. Watch my five finger hand: waving, thumbs up, pointing, open palm, victory sign, a handshake pose, and counting from one to five.',
    exp: 'Select different grasp modes (power, precision, pinch, cylindrical, spherical) and observe the six finger DOF values of the right hand in the DOF dashboard.',
    quiz: [
      ['Thumb opposition allows the thumb to:', ['Extend backwards', 'Face and touch the other fingers', 'Rotate the wrist', 'Lock the elbow'], 1, 'Opposition is what makes precision grasps possible.'],
      ['A grasp that wraps all fingers around a hammer handle is a:', ['Pinch grip', 'Precision grip', 'Power grip', 'Open palm'], 2, 'Power grasps use the palm and all fingers for high force.'],
      ['An under-actuated finger has:', ['More motors than joints', 'Fewer motors than joints', 'No joints', 'Only one phalanx'], 1, 'Coupling lets one actuator drive several joints.'],
      ['How many conceptual DOF does each BAIRWABOT hand have?', ['3', '6', '10', '20'], 1, 'Thumb opposition, thumb flexion and four finger flexions.'],
      ['Holding a pen tip between thumb and index is a:', ['Spherical grip', 'Cylindrical grip', 'Pinch / precision grip', 'Hook grip'], 2, 'Only fingertips are in contact.']
    ] });

  m({ id: 6, cat: 'A', t: 'Bending, Squatting and Kneeling',
    obj: ['Explain multi-joint coordination in the sagittal plane.', 'Track the centre of mass during bending and squatting.', 'Describe how a humanoid picks an object from the ground.'],
    intro: 'Bending, squatting and kneeling lower the body to reach the ground. The joints must be coordinated so that the centre of mass stays above the feet.',
    comp: 'Hips, knees, ankles, torso pitch, pelvis, right arm and hand, foot soles.',
    principle: 'When the trunk flexes forward its mass moves ahead of the ankles; the hips shift backward to compensate. In a squat the hip, knee and ankle flex together – the “triple flexion” – so the CoM descends almost vertically above the feet.',
    sensors: 'Joint encoders, IMU, foot pressure sensors (CoP moves toward toes or heels), depth camera for the object.',
    actuators: 'Hip and knee pitch actuators carry the largest torques (knee torque peaks in deep squat); ankle pitch keeps the sole flat.',
    control: 'Whole-body postures are defined as coordinated joint targets; the ankle angle is computed from the flat-foot constraint. The arm reaches the object by inverse kinematics while the legs hold the crouch.',
    steps: ['Forward bend: hips flex, pelvis pitches forward, arms hang.', 'Backward bend: a small extension of hips and spine.', 'Squat: hips ≈ 118°, knees ≈ 122°, trunk inclined for balance.', 'Kneel: one knee is lowered to the ground and the other foot stays flat.', 'Ground pick-up: crouch, reach by IK, close fingers, lift, stand.'],
    eq: ['CoM: r_CoM = Σ mᵢ·rᵢ / Σ mᵢ', 'Static balance: x_heel ≤ x_CoM ≤ x_toe', 'Knee torque in squat: τ_k ≈ m·g·l_thigh·sin θ_thigh', 'Flat foot: θ_ankle = θ_knee − θ_hip + θ_pelvis'],
    apps: 'Warehouse picking, household assistance, maintenance tasks at floor level, ergonomic lifting studies.',
    narr: 'Now I will bend, squat and kneel. Watch the yellow marker: it is my centre of mass. In every posture I coordinate my hips, knees and ankles so that it stays above my feet. Finally I pick up a ball from the ground.',
    exp: 'Move the squat-depth slider and watch the yellow CoM marker and red CoP marker. Note how the CoM height in Live Data falls while its ground projection stays within the support polygon.',
    quiz: [
      ['For static balance the ground projection of the CoM must lie:', ['Outside the feet', 'Inside the support polygon', 'At the head', 'At the knee'], 1, 'Otherwise gravity creates an unbalanced tipping moment.'],
      ['“Triple flexion” in a squat refers to flexion of:', ['Neck, shoulder, elbow', 'Hip, knee, ankle', 'Wrist, fingers, thumb', 'Torso yaw, roll, pitch'], 1, 'All three leg joints flex together.'],
      ['When the trunk bends forward, the hips move:', ['Forward', 'Backward', 'Upward', 'Not at all'], 1, 'They shift back to keep the CoM over the feet.'],
      ['Where is knee torque greatest?', ['Standing straight', 'Deep squat', 'Lying down', 'During flight'], 1, 'The thigh is near horizontal so the moment arm is largest.'],
      ['The CoM of a multi-link body is the:', ['Geometric centre of the torso', 'Mass-weighted mean of link positions', 'Position of the IMU', 'Midpoint of the feet'], 1, 'r = Σmᵢrᵢ / Σmᵢ.']
    ] });

  m({ id: 7, cat: 'A', t: 'Stair Climbing',
    obj: ['Explain footstep planning on stairs.', 'Compare joint demands of stair ascent and level walking.', 'Describe balance adjustment during single support on a step.'],
    intro: 'Stairs require precise foot placement and much larger knee and hip flexion than level walking. BAIRWABOT climbs four steps, crosses a landing and descends.',
    comp: 'Legs (12 DOF), feet, pelvis, torso pitch, arms; staircase with 0.16 m rise and 0.30 m tread.',
    principle: 'Each step lifts the body by one rise. The leading foot is placed fully on the next tread; the leading knee then extends, raising the CoM – positive work m·g·h. In descent the trailing knee flexes under control, absorbing the same energy.',
    sensors: 'Depth camera / LiDAR (step edge detection, rise and tread measurement), foot force sensors (contact confirmation), IMU, encoders.',
    actuators: 'Knee and hip pitch actuators (highest torque in ascent), ankle pitch for foot levelling.',
    control: 'A footstep planner chooses footholds on successive treads. The swing foot follows a planned arc that clears the step nose; leg inverse kinematics converts foot and pelvis positions to hip and knee angles, and the ankle keeps the foot flat.',
    steps: ['Footholds are planned on each tread, 9 cm behind the step edge.', 'The swing foot rises first, then moves forward over the nose of the step.', 'Weight shifts to the leading foot; its knee (flexed ≈ 60–70°) extends to lift the body.', 'On the landing the robot takes level steps.', 'In descent the foot moves forward first, then lowers; the stance knee flexes to lower the body.'],
    eq: ['Work per step: W = m·g·h_rise', 'Leg IK (2-link): cos θ_knee = (L² − l₁² − l₂²) / (2·l₁·l₂)', 'Mean power: P = m·g·h_rise·f_step', 'Stair slope: α = atan(rise / tread) ≈ 28°'],
    apps: 'Robots operating in buildings, disaster response, delivery robots, stair-climbing assistive devices.',
    narr: 'Stairs need careful foot placement. For each step I lift my foot, place it on the next tread, and then straighten my knee to raise my body. Going down, my knee bends to lower me under control.',
    exp: 'Change the step cadence and compare peak knee angle here (Live Data) with level walking in Module 02.',
    quiz: [
      ['Compared with level walking, stair ascent needs:', ['Less knee flexion', 'More knee and hip flexion', 'No ankle motion', 'No single support'], 1, 'The foot must be lifted a full rise higher.'],
      ['The work done against gravity per step is:', ['m·g·h', 'm·v²', 'k·x', 'Zero'], 0, 'h is the step rise.'],
      ['During stair descent the stance knee:', ['Extends to lift the body', 'Flexes to lower the body under control', 'Stays locked', 'Is unloaded'], 1, 'It absorbs energy (eccentric work).'],
      ['Which sensor is best for measuring step height before climbing?', ['Microphone', 'Depth camera / LiDAR', 'Speaker', 'Encoder'], 1, 'Range sensors measure the stair geometry.'],
      ['Foot placement on stairs is decided by the:', ['Footstep planner', 'Speech recogniser', 'Battery monitor', 'Face display'], 0, 'It selects safe footholds on each tread.']
    ] });

  m({ id: 8, cat: 'A', t: 'Dancing and Coordinated Movements',
    obj: ['Explain whole-body coordination and synchronisation.', 'Describe how rhythmic trajectories are generated.', 'Recognise the balance constraints that limit expressive motion.'],
    intro: 'Dancing combines rhythmic movements of almost every joint while the robot stays balanced. It is an excellent demonstration of whole-body coordination.',
    comp: 'Shoulders, elbows, wrists, torso (yaw/roll), hips (roll/yaw), knees, ankles, neck – over 30 DOF move together.',
    principle: 'All joints follow periodic trajectories locked to a common beat. Knee bounce moves the CoM vertically, hip sway moves it sideways within the support polygon, and arm movements are chosen so that their reaction moments are counteracted by the torso.',
    sensors: 'IMU and foot pressure sensors (balance), joint encoders (tracking), microphone (beat detection in a real system).',
    actuators: 'All limb actuators; smooth sinusoidal references keep velocity and acceleration within motor limits.',
    control: 'A central pattern generator supplies phase-locked sinusoids θᵢ(t) = θ₀ᵢ + Aᵢ·sin(2πf·t + φᵢ). Sections of the dance change the amplitudes and phases; the state blender guarantees smooth transitions.',
    steps: ['Knees bounce at twice the beat frequency.', 'Hips sway sideways, shifting weight from foot to foot.', 'Section 1: arms raised, alternating elbow flexion and wrist rolls.', 'Section 2: arms out, shoulder yaw and torso twist.', 'Section 3: alternating diagonal pointing with hip yaw.', 'The head nods and turns with the beat.'],
    eq: ['θᵢ(t) = θ₀ᵢ + Aᵢ·sin(2πf·t + φᵢ)', 'Peak joint velocity: ω_max = 2πf·A', 'Peak joint acceleration: α_max = (2πf)²·A', 'Balance: CoP must remain inside the support polygon'],
    apps: 'Entertainment robots, demonstrations of actuator performance, motion-retargeting research.',
    narr: 'Time to dance! Every joint follows the same beat.',
    exp: 'Change the tempo and note in Live Data how peak angular velocity scales with frequency (ω_max = 2πfA).',
    quiz: [
      ['A central pattern generator produces:', ['Random motions', 'Phase-locked rhythmic signals', 'Camera images', 'Speech'], 1, 'CPGs output coordinated periodic trajectories.'],
      ['If the dance tempo doubles (same amplitude) peak joint velocity:', ['Halves', 'Stays the same', 'Doubles', 'Quadruples'], 2, 'ω_max = 2πfA is proportional to f.'],
      ['And the peak joint acceleration:', ['Halves', 'Stays the same', 'Doubles', 'Quadruples'], 3, 'α_max = (2πf)²A is proportional to f².'],
      ['The main constraint on expressive whole-body motion is:', ['Camera resolution', 'Keeping the CoP inside the support polygon', 'Speaker volume', 'LED colour'], 1, 'Otherwise the robot would tip over.'],
      ['Phase offset φ between two joints determines:', ['Their relative timing', 'Their mass', 'Their gear ratio', 'Their colour'], 0, 'It sets which joint leads or lags.']
    ] });

  m({ id: 9, cat: 'B', t: 'Speaking and Voice Generation',
    obj: ['Describe the stages of text-to-speech synthesis.', 'Explain lip synchronisation.', 'Identify the hardware of a robot’s voice output.'],
    intro: 'BAIRWABOT really speaks: the browser’s SpeechSynthesis engine converts its response text to audio while the mouth, eyes and head are animated in synchrony.',
    comp: 'Speaker and audio amplifier, mouth display, eye display, neck (3 DOF), main computer running the TTS engine.',
    principle: 'Text-to-speech has four stages: text normalisation (numbers, abbreviations), grapheme-to-phoneme conversion, prosody generation (duration, pitch, stress) and waveform generation by a vocoder. The amplified signal drives the loudspeaker cone.',
    sensors: 'None are required for speaking; the microphone can be used for echo cancellation and volume adaptation.',
    actuators: 'Loudspeaker (voice-coil actuator), neck actuators for head gestures, LED face display for mouth shapes.',
    control: 'The dialogue manager sends sentences to the TTS queue. Word-boundary events from the synthesiser trigger mouth closures, and a syllable-rate envelope (≈ 4–6 Hz) drives the mouth opening between them.',
    steps: ['The response text is split into sentences (natural pauses).', 'Each sentence is synthesised and played; the subtitle shows it.', 'While audio plays, the mouth opening follows a syllable-rate envelope.', 'Word boundaries briefly close the mouth.', 'Eyes blink and the head moves slightly to appear natural.'],
    eq: ['Speech rate ≈ 150 words/min ≈ 4–6 syllables/s', 'Sampling theorem: f_s ≥ 2·f_max  (16–24 kHz for speech)', 'Fundamental frequency (pitch) F₀ ≈ 85–255 Hz for human-like voices', 'Sound pressure level: L = 20·log₁₀(p / p₀) dB'],
    apps: 'Voice assistants, guide robots, accessibility tools, language teaching.',
    narr: 'I speak using text to speech synthesis. My words are first converted into phonemes, then rhythm and pitch are added, and finally a waveform is generated and played through my speaker.',
    exp: 'Type any sentence and press Speak. Change rate and pitch and listen to the difference; watch the mouth animation follow the speech.',
    quiz: [
      ['Which stage converts letters to speech sounds?', ['Prosody generation', 'Grapheme-to-phoneme conversion', 'Amplification', 'Echo cancellation'], 1, 'Graphemes (letters) are mapped to phonemes.'],
      ['Prosody refers to:', ['Rhythm, stress and intonation', 'Loudspeaker size', 'Microphone gain', 'Text spelling'], 0, 'It makes speech sound natural.'],
      ['To represent speech up to 8 kHz the minimum sampling rate is:', ['4 kHz', '8 kHz', '16 kHz', '1 kHz'], 2, 'Nyquist: f_s ≥ 2·f_max.'],
      ['Lip synchronisation matches mouth motion to:', ['Battery level', 'The audio timing of speech', 'Walking speed', 'Camera frame rate'], 1, 'Mouth shapes must follow the spoken syllables.'],
      ['Which browser API produces BAIRWABOT’s voice?', ['WebGL', 'SpeechSynthesis', 'Geolocation', 'WebSocket'], 1, 'window.speechSynthesis performs TTS.']
    ] });

  m({ id: 10, cat: 'B', t: 'Voice Command Recognition',
    obj: ['Describe the speech-recognition pipeline.', 'Explain rule-based command parsing.', 'Understand graceful handling of recognition failures.'],
    intro: 'BAIRWABOT listens through the microphone, converts speech to text, matches the text to a command, executes the animation and answers verbally.',
    comp: 'Microphone array, audio front end, speech recogniser (Web Speech API), command parser, animation state machine, TTS.',
    principle: 'The acoustic signal is converted to features (e.g. mel-spectrogram); an acoustic model estimates phonemes or characters; a language model selects the most probable word sequence. The recognised sentence is then matched to an intent.',
    sensors: 'Microphone array (speech capture and direction of arrival).',
    actuators: 'All motion actuators (executing the command) and the speaker (verbal confirmation).',
    control: 'Pipeline: listen → recognise → parse (keyword rules) → execute state transition → respond. Basic commands work without any external AI service; unknown sentences fall back to the knowledge base.',
    steps: ['The microphone indicator lights and the head tilts slightly: listening.', 'Recognised text is displayed.', 'A thinking expression is shown while the command is parsed.', 'The matching animation state is triggered.', 'BAIRWABOT confirms verbally, with subtitles.'],
    eq: ['Recognition: W* = argmax_W P(X | W)·P(W)', 'Word error rate: WER = (S + D + I) / N', 'Signal-to-noise ratio: SNR = 10·log₁₀(P_signal / P_noise) dB'],
    apps: 'Hands-free robot control, smart-home assistants, industrial voice picking, accessibility.',
    narr: 'You can control me with your voice. Say: walk forward, walk backward, stop walking, turn left, turn right, raise your right hand, wave your hand, sit down, stand up, start dancing, or explain your body structure.',
    exp: 'Press Start Listening and speak a command (Chrome or Edge, microphone permission required). If the microphone is unavailable, click a command button or type it in the Talk tab.',
    quiz: [
      ['In W* = argmax P(X|W)·P(W), the term P(W) is the:', ['Acoustic model', 'Language model', 'Noise model', 'Motor model'], 1, 'It gives the prior probability of the word sequence.'],
      ['WER counts substitutions, deletions and:', ['Insertions', 'Reflections', 'Rotations', 'Translations'], 0, 'WER = (S + D + I) / N.'],
      ['Rule-based command parsing works by:', ['Training a neural network online', 'Matching keywords or patterns in the text', 'Measuring joint torque', 'Sampling the IMU'], 1, 'Patterns such as “walk … forward” map to actions.'],
      ['If microphone permission is denied, a well-designed system should:', ['Crash', 'Offer a text-input fallback', 'Ignore the user', 'Reload repeatedly'], 1, 'Graceful degradation keeps the lab usable.'],
      ['A microphone array (rather than one microphone) allows:', ['Colour vision', 'Estimating the direction of the speaker', 'Higher battery voltage', 'Faster walking'], 1, 'Time differences of arrival give direction.']
    ] });

  m({ id: 11, cat: 'B', t: 'Facial Expressions',
    obj: ['Explain how expressions are parameterised (blend shapes).', 'List the facial features that convey emotion.', 'Describe eye-tracking behaviour.'],
    intro: 'A social robot communicates its internal state through its face. BAIRWABOT’s face display shows happy, sad, surprised, thinking, confused, excited and neutral expressions, blinking and eye tracking.',
    comp: 'Face display with two eyes, two eyebrows and a segmented mouth; neck joints; eye cameras for gaze targets.',
    principle: 'Each expression is a vector of weights – mouth curvature, mouth opening, brow height, brow tilt, eye widening, gaze offset. The displayed face is a smooth interpolation between weight vectors, exactly as morph-target (blend-shape) animation mixes mesh shapes.',
    sensors: 'RGB camera (face detection for gaze), microphone (sound direction), touch sensors in some robots.',
    actuators: 'LED / LCD face display; in mechanical faces, micro-servos move eyelids, brows and lips.',
    control: 'The behaviour layer selects an expression according to the dialogue state (listening, thinking, speaking, success, failure). Parameters are low-pass filtered so the face changes smoothly. Blinks are generated at random 2.5–5 s intervals.',
    steps: ['Neutral: slight smile, level brows.', 'Happy / smile: mouth corners up, eyes slightly narrowed.', 'Sad: mouth corners down, inner brows raised.', 'Surprise: eyes wide, brows high, mouth open.', 'Thinking: gaze up and to the side, one brow raised.', 'Confusion: asymmetric brows.', 'Excitement: wide smile, open mouth.', 'Eye tracking: eyes and head follow the pointer.'],
    eq: ['Blend shapes: S = S₀ + Σ wᵢ·(Sᵢ − S₀),  0 ≤ wᵢ ≤ 1', 'First-order smoothing: w(t+Δt) = w + (w_target − w)·(1 − e^(−Δt/τ))', 'Gaze angle: θ = atan2(x_target, z_target)'],
    apps: 'Social and companion robots, therapy robots, animated avatars, HRI research.',
    narr: 'My face shows how I feel. Here are my expressions: neutral, happy, sad, surprised, thinking, confused, excited and smiling.',
    exp: 'Click each expression. Enable eye tracking and move the pointer over the 3D view: the eyes shift first and the neck follows.',
    quiz: [
      ['A blend shape (morph target) animation computes the face as:', ['A weighted sum of shape offsets', 'A random mesh', 'A physics simulation of muscles', 'A video recording'], 0, 'S = S₀ + Σwᵢ(Sᵢ − S₀).'],
      ['Raised inner eyebrows with down-turned mouth indicate:', ['Happiness', 'Sadness', 'Excitement', 'Neutral'], 1, 'This is the typical sad configuration.'],
      ['Why are expression parameters low-pass filtered?', ['To save memory', 'To make transitions smooth', 'To increase brightness', 'To detect faces'], 1, 'Abrupt changes look unnatural.'],
      ['Natural human blink intervals are roughly:', ['Every 0.1 s', 'Every 2–6 s', 'Every 60 s', 'Never'], 1, 'Spontaneous blinks occur several times per minute.'],
      ['Eye tracking in HRI helps the robot to:', ['Charge its battery', 'Show attention to the person', 'Walk faster', 'Lift heavier loads'], 1, 'Gaze is a strong social attention cue.']
    ] });

  m({ id: 12, cat: 'B', t: 'Two-Way Human Conversation',
    obj: ['Describe the architecture of a spoken dialogue system.', 'Distinguish rule-based answers from AI-model answers.', 'Explain why API keys must stay on a server.'],
    intro: 'Students can ask BAIRWABOT questions by voice or text. A built-in knowledge base answers common robotics questions; open-ended questions can be routed to an optional AI backend.',
    comp: 'Microphone, speech recogniser, dialogue manager, knowledge base, optional AI service, TTS, face display, conversation history.',
    principle: 'A dialogue system chains automatic speech recognition (ASR), natural-language understanding (NLU), dialogue management, response generation and text-to-speech (TTS). Here NLU is keyword matching against a curated knowledge base.',
    sensors: 'Microphone array; camera for attention to the speaker.',
    actuators: 'Speaker, face display, neck and arm actuators for conversational gestures.',
    control: 'Listening → thinking → speaking states. If a command pattern matches it is executed; otherwise the best knowledge-base entry is spoken; otherwise, if an AI endpoint is configured, the question is sent to that server.',
    steps: ['The question appears in the conversation panel.', 'Thinking expression while the answer is selected.', 'BAIRWABOT answers with speech, subtitles and a presenting gesture.', 'The exchange is stored in the session history.'],
    eq: ['Keyword score: s(q, k) = |words(q) ∩ keywords(k)|', 'Answer selection: k* = argmax_k s(q, k)', 'Response latency: t = t_ASR + t_NLU + t_generation + t_TTS'],
    apps: 'Tutoring robots, information kiosks, customer service, language learning.',
    narr: 'Let us have a conversation. You can ask me about humanoid robots, degrees of freedom, sensors, actuators, kinematics, gait, balance and more. Here are three examples.',
    exp: 'Ask your own questions in the Talk tab. Try rephrasing a question and see whether the keyword matcher still finds the answer.',
    quiz: [
      ['The correct order of a spoken dialogue pipeline is:', ['TTS → ASR → NLU', 'ASR → NLU → dialogue manager → TTS', 'NLU → ASR → TTS', 'TTS → NLU → ASR'], 1, 'Speech in, meaning, decision, speech out.'],
      ['Why must an AI service API key never be placed in frontend JavaScript?', ['It slows rendering', 'Anyone can read and misuse it', 'It breaks WebGL', 'Browsers forbid long strings'], 1, 'Frontend code is fully visible to users; keys belong on a server.'],
      ['How many degrees of freedom does BAIRWABOT’s conceptual configuration have?', ['12', '30', '46', '100'], 2, '3 + 3 + 16 + 12 + 12 = 46.'],
      ['An IMU contains:', ['Cameras and lasers', 'Accelerometers and gyroscopes', 'Microphones and speakers', 'Encoders and brakes'], 1, 'Inertial Measurement Unit.'],
      ['A rule-based system fails mainly when:', ['The question is outside its stored patterns', 'The battery is full', 'The robot is standing', 'Audio is muted'], 0, 'It cannot generalise beyond its rules.']
    ] });

  m({ id: 13, cat: 'B', t: 'Self-Introduction and Technical Presentation',
    obj: ['Summarise the subsystems of a humanoid robot.', 'Explain the layered control architecture.', 'Relate each subsystem to its engineering discipline.'],
    intro: 'BAIRWABOT presents its own design: mechanical architecture, frame, joints, DOF, sensors, actuators, battery, control architecture and applications – highlighting each part while explaining with hand gestures.',
    comp: 'All assemblies: head, torso, arms, hands, pelvis, legs, feet, electronics (computer, battery, power distribution, cooling).',
    principle: 'A humanoid is a mechatronic system: a mechanical structure of links and joints, driven by actuators, measured by sensors, powered by a battery and coordinated by embedded computers running perception, planning and control software.',
    sensors: 'RGB and depth cameras, microphones, LiDAR, IMUs, joint encoders, force/torque and pressure sensors.',
    actuators: 'BLDC motors with harmonic or planetary reducers at the major joints; miniature actuators in the hands and neck.',
    control: 'Three layers: (1) perception and task planning (≈ 10 Hz), (2) whole-body motion generation and balance (≈ 100–500 Hz), (3) joint servo loops (≈ 1–10 kHz) on the motor drivers, connected by a real-time bus such as EtherCAT or CAN-FD.',
    steps: ['Architecture overview with presenting gesture.', 'Frame: torso and pelvis are highlighted.', 'Joints: actuator housings glow.', 'DOF summary: 46 conceptual DOF.', 'Sensors: head assembly highlighted.', 'Actuators: legs highlighted.', 'Battery and control: electronics highlighted.', 'Applications.'],
    eq: ['DOF total: 3 + 3 + 2×8 + 2×6 + 2×6 = 46', 'Actuator output: τ_out = N·η·K_t·I', 'Battery energy: E = V·Q  (Wh);  run time ≈ E / P_mean', 'Servo bandwidth must be ≫ motion bandwidth'],
    apps: 'Design reviews, robotics education, public demonstrations.',
    narr: 'Let me present my own design, one subsystem at a time.',
    exp: 'Click each topic to hear that part of the presentation again and see the related assembly highlighted.',
    quiz: [
      ['Which control layer runs at the highest frequency?', ['Task planning', 'Whole-body motion generation', 'Joint servo loops', 'Speech dialogue'], 2, 'Current/position loops run at kHz rates.'],
      ['A harmonic reducer is used in a joint to:', ['Increase speed', 'Increase torque and reduce speed', 'Measure angle', 'Store energy'], 1, 'τ_out ≈ N·η·τ_motor.'],
      ['Battery energy in watt-hours equals:', ['Voltage × capacity (Ah)', 'Voltage ÷ current', 'Current × resistance', 'Power ÷ time'], 0, 'E = V·Q.'],
      ['Which subsystem measures the robot’s own joint positions?', ['LiDAR', 'Encoders', 'Speaker', 'Battery'], 1, 'Encoders are proprioceptive sensors.'],
      ['A humanoid robot is best described as a:', ['Purely mechanical system', 'Purely software system', 'Mechatronic system', 'Chemical system'], 2, 'It integrates mechanics, electronics and software.']
    ] });

  m({ id: 14, cat: 'B', t: 'Human Handshake and Greeting',
    obj: ['Describe the perception-to-action sequence of a handshake.', 'Explain force-limited (compliant) grasping.', 'Recognise safety requirements in physical HRI.'],
    intro: 'A handshake is physical human-robot interaction: the robot must detect the person, orient to them, extend its arm, grip gently, shake and release.',
    comp: 'Head cameras, neck, right arm (8 DOF), right hand (6 DOF), wrist force/torque sensor, tactile palm pad.',
    principle: 'The arm is moved by inverse kinematics to the meeting point. During contact the arm behaves as a programmed spring-damper (impedance control) so that it yields to the person’s motion, and the finger force is limited to a comfortable value.',
    sensors: 'RGB-D camera (person and hand detection), wrist force/torque sensor, tactile sensors, joint encoders.',
    actuators: 'Shoulder, elbow and wrist actuators (compliant control), finger actuators with current (force) limiting.',
    control: 'State machine: detect → look → extend → position palm → grip (force-limited) → shake (≈ 2 Hz vertical oscillation) → release → retract.',
    steps: ['Human detection: a bounding box marks the person.', 'Head orientation: the neck turns the cameras to the person’s face.', 'Arm extension by IK to the meeting point.', 'Palm positioning – palm vertical, fingers open.', 'Grip: fingers close until the force limit.', 'Handshake: small vertical oscillation.', 'Release and retract.'],
    eq: ['Impedance control: F = K·(x_d − x) + D·(ẋ_d − ẋ)', 'Grip force limit: F_grip ≤ F_max  (≈ 10–20 N for comfort)', 'Motor current ↔ torque: τ = K_t·I', 'Shake: z(t) = z₀ + A·sin(2πft), A ≈ 3–4 cm, f ≈ 2 Hz'],
    apps: 'Reception robots, social robots, collaborative robots (ISO/TS 15066 force limits), prosthetics.',
    narr: 'Hello! Nice to meet you. I am BAIRWABOT.',
    exp: 'Run the handshake and watch the right-arm joint angles and end-effector coordinates. The grip-force value is simulated and labelled as such.',
    quiz: [
      ['Impedance control makes the arm behave like a:', ['Rigid wall', 'Spring-damper system', 'Free pendulum', 'Random walker'], 1, 'F = K·Δx + D·Δẋ.'],
      ['Why is grip force limited in a handshake?', ['To save energy only', 'For human safety and comfort', 'To move faster', 'To improve vision'], 1, 'Physical HRI must never injure the person.'],
      ['Which sensor measures the contact force at the hand?', ['IMU', 'Wrist force/torque sensor', 'LiDAR', 'Microphone'], 1, 'It measures forces and moments at the wrist.'],
      ['The arm reaches the person’s hand using:', ['Forward dynamics', 'Inverse kinematics', 'Speech synthesis', 'A* search'], 1, 'IK converts the target hand position to joint angles.'],
      ['The first step of the handshake sequence is:', ['Releasing', 'Gripping', 'Human detection', 'Shaking'], 2, 'Perception precedes action.']
    ] });

  m({ id: 15, cat: 'B', t: 'Human Following Behaviour',
    obj: ['Explain person tracking and distance estimation.', 'Design a simple following controller.', 'Explain the need for a safe separation distance.'],
    intro: 'BAIRWABOT detects a person, tracks them, estimates the distance and follows – stopping, turning and keeping a safe gap.',
    comp: 'RGB-D camera, LiDAR, neck, legs (walking and turning), navigation computer.',
    principle: 'The person’s position relative to the robot is expressed as a range d and bearing φ. The walking speed is commanded in proportion to the distance error (d − d_safe) and the turning rate in proportion to the bearing error.',
    sensors: 'RGB camera (person detection), depth camera or LiDAR (range), IMU and odometry (own motion).',
    actuators: 'Leg actuators (walk, turn), neck actuators (keep the person in view).',
    control: 'Proportional following controller with a dead band: walk if d > d_safe + δ, stop if within the band, turn in place if the bearing error is large. This prevents oscillation around the set-point.',
    steps: ['Person detection: bounding box on the target.', 'Target tracking: the head follows the person.', 'Distance estimation shown live.', 'Following: walking speed proportional to distance error.', 'Stopping when the person stops.', 'Turning when the person changes direction.', 'Safe distance maintained.'],
    eq: ['Range: d = √(Δx² + Δz²);  bearing: φ = atan2(Δx, Δz) − ψ_robot', 'Speed command: v = K_v·(d − d_safe)', 'Turn-rate command: ω = K_ω·φ', 'Stopping distance: d_stop = v² / (2·a_max)'],
    apps: 'Luggage and shopping-cart robots, hospital porters, elderly companions, warehouse followers.',
    narr: 'I can follow a person. I detect the person, estimate the distance and direction, and walk so that I keep a safe distance. When the person stops, I stop.',
    exp: 'Change the safe-distance slider and stop/start the person. Compare the live distance with the set-point.',
    quiz: [
      ['A proportional following controller sets speed proportional to:', ['Battery level', 'Distance error (d − d_safe)', 'Camera resolution', 'Head angle'], 1, 'v = K_v(d − d_safe).'],
      ['Why is a dead band used around the safe distance?', ['To avoid start-stop oscillation', 'To increase speed', 'To save memory', 'To detect faces'], 0, 'Without it the robot would chatter around the set-point.'],
      ['Bearing error is corrected by commanding:', ['Forward speed', 'Turning rate', 'Grip force', 'Speech rate'], 1, 'ω = K_ω·φ.'],
      ['Which sensor directly gives distance to the person?', ['Depth camera / LiDAR', 'Microphone', 'Encoder', 'Speaker'], 0, 'Range sensors measure distance.'],
      ['The minimum safe gap must exceed the robot’s:', ['Height', 'Stopping distance', 'Battery voltage', 'Arm length only'], 1, 'd_stop = v²/(2a) must fit inside the gap.']
    ] });
})();
