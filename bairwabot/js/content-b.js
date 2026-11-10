/* BAIRWABOT – content-b.js : educational content and quizzes for modules 16–30. */
(function () {
  'use strict';
  const BB = window.BB;
  const m = (o) => BB.MODULES.push(o);

  m({ id: 16, cat: 'C', t: 'Object Pick-and-Place',
    obj: ['List the ten stages of a pick-and-place task.', 'Apply inverse kinematics to reach a 3D target.', 'Choose a grasp type suited to an object shape.'],
    intro: 'Pick-and-place is the basic manipulation task. BAIRWABOT identifies an object on the table, estimates its coordinates, reaches by inverse kinematics, grasps, lifts, transports, places and releases it while its end-effector trajectory is drawn.',
    comp: 'RGB-D camera, neck, torso (pitch/yaw used by IK), arm (8 DOF), five-finger hand (6 DOF), table with bottle, book, cube, ball and cup.',
    principle: 'The camera gives the object position in the camera frame; a chain of homogeneous transforms converts it to the robot base frame. An IK solver computes shoulder, elbow and torso angles that bring the grip point to the object. Grasp type is selected from the object shape.',
    sensors: 'Depth camera (3D position), joint encoders, fingertip tactile sensors (contact confirmation), wrist force sensor (object weight).',
    actuators: 'Shoulder pitch/roll/yaw, elbow, torso pitch/yaw, finger and thumb actuators.',
    control: 'Cartesian-space trajectory: approach point above the object → descend → close fingers → lift → transport (arc) → descend → open → retreat. At each control cycle the damped-least-squares IK converts the Cartesian set-point to joint angles.',
    steps: ['1 Object identification (bounding box).', '2 Coordinate estimation in the world frame.', '3 Arm movement planned toward a pre-grasp point.', '4 Inverse kinematics computes the joint angles every frame.', '5 Finger closure with the chosen grasp.', '6 Grasping – object attached to the hand.', '7 Lifting.', '8 Transportation to the placing pad.', '9 Placement.', '10 Releasing and retreat.'],
    eq: ['Frame transform: ᵇp = ᵇT_c · ᶜp', 'Differential kinematics: ẋ = J(θ)·θ̇', 'DLS IK step: Δθ = Jᵀ(J·Jᵀ + λ²I)⁻¹·e', 'Friction grasp condition: 2·μ·F_n ≥ m·g'],
    apps: 'Warehouse order picking, manufacturing assembly, kitchen and household robots, laboratory automation.',
    narr: 'Now I will pick and place an object. I identify it, estimate its coordinates, move my arm using inverse kinematics, close my fingers, lift it, carry it and place it on the green pad. The cyan line shows the path of my hand.',
    exp: 'Select a different object and run pick-and-place. Read the object coordinates and the live end-effector coordinates in Live Data.',
    quiz: [
      ['Inverse kinematics computes:', ['Hand position from joint angles', 'Joint angles from a desired hand position', 'Motor current from torque', 'Speech from text'], 1, 'IK is the inverse mapping of FK.'],
      ['In Δθ = Jᵀ(JJᵀ + λ²I)⁻¹e, the damping λ is added to:', ['Increase speed', 'Avoid huge joint steps near singularities', 'Change the object', 'Measure force'], 1, 'Damping regularises the inverse near singular configurations.'],
      ['For a two-finger friction grasp the normal force must satisfy:', ['F_n ≥ m·g / (2μ)', 'F_n = 0', 'F_n ≤ m·g·μ', 'F_n = m·g·2μ'], 0, 'Friction on two faces must support the weight.'],
      ['Which grasp suits a ball?', ['Pinch', 'Spherical', 'Hook', 'Lateral key grip'], 1, 'Fingers wrap around a spherical surface.'],
      ['ᵇT_c in ᵇp = ᵇT_c·ᶜp is the transform from:', ['Base to hand', 'Camera frame to base frame', 'World to motor', 'Hand to object'], 1, 'It expresses camera measurements in the base frame.']
    ] });

  m({ id: 17, cat: 'C', t: 'Object Recognition',
    obj: ['Describe the detection and classification pipeline.', 'Interpret bounding boxes and confidence scores.', 'Estimate object distance from depth data.'],
    intro: 'BAIRWABOT scans the table, draws a bounding box around each object, names it and estimates its distance. The confidence scores are simulated values because no neural detector is connected in this browser lab.',
    comp: 'RGB camera, depth camera, neck (scanning), main computer (vision processor), objects on the table.',
    principle: 'A convolutional neural network (e.g. a YOLO-type single-stage detector) outputs boxes, class probabilities and confidence scores; non-maximum suppression removes duplicate boxes. The depth image provides the range to the box centre.',
    sensors: 'RGB camera (appearance), depth camera (distance), IMU (camera orientation).',
    actuators: 'Neck yaw/pitch to point the cameras at each object.',
    control: 'The head scans each region of interest; detections above a confidence threshold are reported with label, box and distance.',
    steps: ['Camera frame acquired.', 'Head turns to each object (active vision).', 'Box drawn with class label.', 'Confidence (simulated) and distance displayed.', 'Summary spoken.'],
    eq: ['Intersection over Union: IoU = |A ∩ B| / |A ∪ B|', 'Confidence = P(object)·P(class | object)', 'Pinhole projection: u = f·X/Z + c_x,  v = f·Y/Z + c_y', 'Precision = TP / (TP + FP);  Recall = TP / (TP + FN)'],
    apps: 'Sorting and picking, assistive robots finding household items, inspection, autonomous vehicles.',
    narr: 'Now I will recognise objects. For each object I draw a bounding box, show its name, its distance from my cameras and a confidence score. These scores are simulated values for this virtual lab.',
    exp: 'Shuffle the objects and run detection again; compare distances. Discuss what IoU threshold you would use for non-maximum suppression.',
    quiz: [
      ['IoU between two boxes is:', ['Area A + Area B', 'Intersection area / union area', 'Width × height', 'Distance between centres'], 1, 'Used to judge overlap and in NMS.'],
      ['Non-maximum suppression removes:', ['Correct detections', 'Duplicate overlapping boxes', 'The background', 'Colour'], 1, 'Only the highest-scoring box per object is kept.'],
      ['Distance to an object is best obtained from the:', ['Microphone', 'Depth camera', 'Speaker', 'Battery'], 1, 'Depth sensors give per-pixel range.'],
      ['Precision is defined as:', ['TP/(TP+FN)', 'TP/(TP+FP)', 'FP/(TP+FP)', 'TN/(TN+FP)'], 1, 'Fraction of detections that are correct.'],
      ['In this virtual lab the confidence scores are:', ['Measured by a real neural network', 'Simulated values', 'Random every frame', 'Battery readings'], 1, 'They are clearly labelled as simulated.']
    ] });

  m({ id: 18, cat: 'C', t: 'Obstacle Detection and Avoidance',
    obj: ['Explain range-based obstacle detection.', 'Apply the artificial potential field method.', 'Define safety distances and collision warnings.'],
    intro: 'Pillars stand between BAIRWABOT and its goal. It measures the distance to each obstacle, issues collision warnings and adjusts its path to reach the goal safely.',
    comp: 'LiDAR and depth camera, legs (walking and turning), navigation computer; four pillar obstacles, start ring (blue) and goal ring (green).',
    principle: 'The artificial potential field method adds an attractive force toward the goal and repulsive forces away from nearby obstacles. The robot heads along the resulting force vector; a tangential term helps it slide around obstacles instead of stopping in front of them.',
    sensors: 'LiDAR (360° range), depth camera, IMU/odometry.',
    actuators: 'Hip yaw (turning), leg actuators (walking speed).',
    control: 'Heading command = direction of F_att + ΣF_rep; walking amplitude is reduced near obstacles. A red ray shows the nearest detected obstacle; a warning appears below 0.45 m clearance.',
    steps: ['Scan: the nearest obstacle distance is measured continuously.', 'Detection: obstacles within 1 m generate repulsion.', 'Collision warning below the safety distance.', 'Path adjustment: heading turns away from the obstacle.', 'Safe navigation to the green goal.'],
    eq: ['Attractive force: F_att = k_a·(x_goal − x)/|x_goal − x|', 'Repulsive force: F_rep = k_r·(1/d − 1/d₀)·n̂   for d < d₀', 'LiDAR range: r = c·Δt / 2', 'Heading: ψ_cmd = atan2(F_x, F_z)'],
    apps: 'Mobile service robots, autonomous wheelchairs, warehouse AGVs, drones.',
    narr: 'Obstacles are in my path. I measure the distance to each one, warn when I get too close, and adjust my path to reach the green goal safely.',
    exp: 'Move the obstacles randomly and navigate again. Watch the nearest-obstacle distance and the steering command in Live Data.',
    quiz: [
      ['In the potential-field method the goal produces a(n):', ['Repulsive force', 'Attractive force', 'Magnetic field', 'Torque'], 1, 'The goal attracts the robot.'],
      ['A known weakness of pure potential fields is:', ['Local minima', 'Too much memory', 'No sensors needed', 'Infinite speed'], 0, 'Forces can cancel and trap the robot.'],
      ['LiDAR range is computed as:', ['c·Δt', 'c·Δt / 2', 'Δt / c', '2c / Δt'], 1, 'The pulse travels out and back.'],
      ['Repulsive force acts only when:', ['d > d₀', 'd < d₀', 'Always', 'Never'], 1, 'Obstacles beyond the influence distance are ignored.'],
      ['Reducing speed near obstacles helps because:', ['It lowers stopping distance', 'It increases battery voltage', 'It improves speech', 'It changes colour'], 0, 'd_stop = v²/(2a).']
    ] });

  m({ id: 19, cat: 'C', t: 'Autonomous Navigation',
    obj: ['Explain mapping, localisation, path planning and path following.', 'Apply the A* algorithm on an occupancy grid.', 'Interpret waypoints and path length.'],
    intro: 'In a small indoor environment BAIRWABOT plans a path from the start (blue) to the goal (green) through rooms and doorways and walks it. Click on the floor to set new goals.',
    comp: 'LiDAR, depth camera, IMU, leg odometry, navigation computer; walls forming rooms and corridors.',
    principle: 'The map is stored as an occupancy grid (0.25 m cells); walls are inflated by the robot radius. A* searches the grid using cost g (distance travelled) plus heuristic h (straight-line distance to goal). The resulting cell path is simplified to waypoints and followed by a heading controller.',
    sensors: 'LiDAR (mapping and localisation), IMU and joint encoders (odometry).',
    actuators: 'Leg actuators for walking and turning.',
    control: 'Global planner (A*) → waypoint list → local controller (turn toward waypoint, walk with speed reduced near it). Re-planning occurs when a new goal is given.',
    steps: ['Mapping: walls become occupied grid cells.', 'Localisation: the robot knows its start pose.', 'Path planning: A* finds the shortest collision-free path (yellow).', 'Navigation: the robot follows the waypoints.', 'Goal reached.'],
    eq: ['A* cost: f(n) = g(n) + h(n)', 'Admissible heuristic: h(n) ≤ true cost (Euclidean)', 'Odometry: x_{k+1} = x_k + v·Δt·sin ψ,  z_{k+1} = z_k + v·Δt·cos ψ', 'Bayes filter: bel(x_t) ∝ p(z_t | x_t)·∫p(x_t | u_t, x_{t−1})·bel(x_{t−1})'],
    apps: 'Delivery robots, hospital logistics, museum guides, autonomous vacuum cleaners.',
    narr: 'This is autonomous navigation. I use a map of the room, know where I am, plan the shortest safe path with the A star algorithm, and follow it to the goal. You can click on the floor to give me a new goal.',
    exp: 'Click different places in the room to set goals. Compare path length and the number of grid cells expanded by A*.',
    quiz: [
      ['In A*, f(n) = g(n) + h(n), h(n) is the:', ['Cost so far', 'Estimated cost to the goal', 'Robot height', 'Map resolution'], 1, 'The heuristic guides the search.'],
      ['A* returns the optimal path if the heuristic is:', ['Admissible (never overestimates)', 'Random', 'Always zero only', 'Negative'], 0, 'Admissibility guarantees optimality.'],
      ['Localisation means:', ['Building a map', 'Estimating the robot’s own pose in the map', 'Planning a path', 'Recognising speech'], 1, 'Where am I?'],
      ['Walls are “inflated” in the grid to:', ['Account for the robot’s size', 'Make them taller', 'Change colour', 'Save memory'], 0, 'The robot can then be treated as a point.'],
      ['SLAM stands for:', ['Simple Linear Arm Motion', 'Simultaneous Localisation And Mapping', 'Sensor Light And Mirror', 'Safe Leg Actuator Module'], 1, 'Building a map while localising in it.']
    ] });

  m({ id: 20, cat: 'C', t: 'Carrying and Delivering Objects',
    obj: ['Explain dual-arm (bimanual) grasping.', 'Describe how a carried load changes balance.', 'Sequence a complete delivery task.'],
    intro: 'BAIRWABOT picks up a parcel with both hands, holds it in front of the chest, walks to a person and hands it over.',
    comp: 'Both arms and hands, torso, legs, cameras; parcel on a table and a recipient.',
    principle: 'With two hands squeezing the parcel from both sides, friction on two faces supports the weight. The arms form a closed kinematic chain through the object, so both IK targets are attached to the parcel frame. The carried mass shifts the combined CoM forward; the gait compensates with a slight backward lean.',
    sensors: 'Cameras (parcel and person detection), wrist force sensors (load and squeeze force), IMU, foot pressure sensors.',
    actuators: 'Shoulder, elbow, wrist and finger actuators of both arms; leg actuators.',
    control: 'Bimanual IK with targets on opposite faces of the parcel; walking controller to the delivery point; hand-over when the recipient’s hand is detected near the object.',
    steps: ['Locate the parcel.', 'Both hands reach the sides of the parcel.', 'Squeeze grasp and lift to chest height.', 'Walk to the recipient while carrying.', 'Extend the parcel and release when the person holds it.'],
    eq: ['Squeeze grasp: 2·μ·F_squeeze ≥ m_obj·g', 'Combined CoM: x_c = (M·x_robot + m·x_obj) / (M + m)', 'Shoulder torque: τ ≈ (m_arm·l_arm/2 + m_obj·l_arm)·g', 'Closed chain: T_L,obj and T_R,obj fixed during carrying'],
    apps: 'Logistics, parcel delivery inside buildings, hospital supply transport, home assistance.',
    narr: 'Now I will deliver a parcel. I grasp it with both hands, hold it in front of my chest, walk to the person and hand it over.',
    exp: 'Run the delivery and watch the shoulder and elbow angles of both arms. Note how the robot keeps the parcel level while walking.',
    quiz: [
      ['Holding an object with both hands creates a:', ['Open kinematic chain', 'Closed kinematic chain', 'Parallel spring', 'Single DOF'], 1, 'The object links both arms.'],
      ['A carried load in front of the body moves the combined CoM:', ['Backward', 'Forward', 'Upward only', 'Nowhere'], 1, 'Its mass adds ahead of the trunk.'],
      ['Minimum squeeze force for a box of mass m with friction μ on two faces:', ['m·g·μ', 'm·g/(2μ)', '2μ/(m·g)', 'zero'], 1, '2μF ≥ mg.'],
      ['Which joint carries the largest torque when holding a box with straight arms?', ['Finger', 'Shoulder', 'Neck', 'Ankle roll'], 1, 'The moment arm is the full arm length.'],
      ['The hand-over is triggered when:', ['The battery is low', 'The recipient’s hand is near the object', 'A timer expires randomly', 'The robot sits'], 1, 'Perception of the receiver initiates release.']
    ] });

  m({ id: 21, cat: 'C', t: 'Opening and Closing Doors',
    obj: ['Sequence the sub-tasks of door opening.', 'Explain constrained (hinged) manipulation.', 'Describe compliant contact with articulated objects.'],
    intro: 'BAIRWABOT approaches a door, locates the handle, grasps and rotates it, pushes the door open, walks through, turns and closes the door.',
    comp: 'Cameras, right arm (8 DOF), right hand, wrist roll (handle rotation), legs; hinged door with lever handle.',
    principle: 'Once the handle is grasped the hand must follow a circle about the hinge axis – a constrained motion. Commanding the hand along the door’s arc (rather than a straight line) avoids large internal forces; compliance in the arm absorbs small model errors.',
    sensors: 'Depth camera (door and handle pose), wrist force/torque sensor (contact and constraint forces), encoders.',
    actuators: 'Arm and wrist actuators (handle rotation, pushing), finger actuators, legs.',
    control: 'Task sequence with hybrid position/force behaviour: position control in free space, compliant force-limited motion while coupled to the door. The hand trajectory is generated from the door angle: p_hand = p_hinge + R(φ)·r_handle.',
    steps: ['Approach the door.', 'Locate the handle (detection box).', 'Reach the handle by IK.', 'Grasp with a cylindrical grip.', 'Rotate the handle with wrist roll.', 'Push: the hand follows the door arc.', 'Pass through the doorway.', 'Turn, grasp the handle again and pull the door closed.'],
    eq: ['Hand on door arc: p(φ) = p_hinge + R_y(φ)·r', 'Door torque: τ_door = F·r_handle', 'Hybrid control: position along the arc, force normal to it', 'Handle rotation: θ_handle ≈ 30–40°'],
    apps: 'Building navigation for service robots, disaster response (DARPA Robotics Challenge), assistive robots.',
    narr: 'Let me open the door. I locate the handle, grasp it, rotate it, push the door open, pass through, and then close it behind me.',
    exp: 'Watch the right-hand trajectory while pushing: it follows the circular arc of the door about its hinge.',
    quiz: [
      ['While pushing a hinged door, the handle moves along a:', ['Straight line', 'Circular arc about the hinge', 'Random path', 'Vertical line'], 1, 'The hinge constrains it to a circle.'],
      ['Why is compliance useful when coupled to the door?', ['To reduce internal forces from small errors', 'To walk faster', 'To speak louder', 'To see better'], 0, 'A stiff arm on a constrained path creates large forces.'],
      ['Which wrist DOF turns a lever handle?', ['Wrist pitch', 'Wrist roll', 'Wrist yaw', 'Elbow'], 1, 'Roll about the forearm axis.'],
      ['Torque on a door equals:', ['F × distance from hinge', 'F / distance', 'mass × speed', 'F + r'], 0, 'τ = F·r.'],
      ['Which competition famously required humanoids to open doors?', ['RoboCup Junior', 'DARPA Robotics Challenge', 'FIRST Lego League', 'Formula Student'], 1, 'The 2013–2015 DRC included door opening.']
    ] });

  m({ id: 22, cat: 'C', t: 'Operating Everyday Objects',
    obj: ['Match hand postures to object affordances.', 'Explain fine positioning for pressing and typing.', 'Use wrist rotation for tool operation.'],
    intro: 'BAIRWABOT presses a light switch, types on a keyboard, picks up a mobile phone, handles a cup and turns a screwdriver.',
    comp: 'Both arms and hands, index-finger pointing posture, wrist roll, desk with switch, lamp, keyboard, phone, cup and screwdriver.',
    principle: 'Each object affords a particular interaction: a switch needs a pointed finger pressed normal to its face; keys need small precise vertical taps; a phone needs a pinch; a cup a cylindrical grasp kept upright; a screwdriver a power grasp and wrist rotation.',
    sensors: 'Cameras (object pose), fingertip tactile sensors (press detection), wrist force sensor, encoders.',
    actuators: 'Arm, wrist and finger actuators.',
    control: 'IK-driven Cartesian motions with short approach–contact–retract segments; the press depth is a few millimetres. Wrist roll oscillation turns the tool.',
    steps: ['Press the switch: the lamp toggles.', 'Type “HELLO”: alternate hands tap keys.', 'Pick up the phone with a pinch, view it, put it back.', 'Lift the cup with a cylindrical grasp, keep it upright, place it back.', 'Grasp the screwdriver and rotate it with wrist roll.'],
    eq: ['Key press: Δz ≈ 2–4 mm, F ≈ 0.5–1 N', 'Screw torque: τ = F_t·r_handle', 'Keeping a cup upright: orientation constraint R_hand·ẑ = ẑ', 'Fitts’ law (pointing time): T = a + b·log₂(1 + D/W)'],
    apps: 'Household robots, robots operating human-designed equipment, tele-operated maintenance.',
    narr: 'Humanoids can use objects designed for people. I will press a switch, type on a keyboard, pick up a phone, handle a cup and use a screwdriver.',
    exp: 'Run each task individually. Toggle the lamp several times and watch the end-effector coordinates during the press.',
    quiz: [
      ['Which hand posture suits pressing a switch?', ['Power grip', 'Pointing (index extended)', 'Spherical', 'Open palm'], 1, 'A single fingertip applies a localised force.'],
      ['Turning a screwdriver mainly uses:', ['Wrist roll', 'Knee pitch', 'Neck yaw', 'Hip roll'], 0, 'Rotation about the forearm/hand axis.'],
      ['An “affordance” is:', ['A price', 'An action an object makes possible', 'A sensor type', 'A gait phase'], 1, 'e.g. a handle affords grasping.'],
      ['Fitts’ law predicts pointing time from:', ['Distance and target width', 'Mass and gravity', 'Voltage and current', 'Speed and colour'], 0, 'T = a + b·log₂(1 + D/W).'],
      ['To carry a full cup the controller must constrain:', ['Hand orientation (upright)', 'Battery level', 'Walking speed only', 'Head colour'], 0, 'Tilting would spill the contents.']
    ] });

  m({ id: 23, cat: 'D', t: 'Dynamic Balance and Stability',
    obj: ['Define CoM, CoP/ZMP and support polygon.', 'Explain ankle and hip balance strategies.', 'Interpret foot pressure distribution.'],
    intro: 'This module visualises balance: the yellow sphere is the centre of mass, the dashed line its ground projection, the red disc the centre of pressure, and the cyan area the support polygon. Foot pressure is shown in the Live Data tab.',
    comp: 'Whole body (segment mass model), feet with four pressure cells each, ankle and hip joints, IMU.',
    principle: 'A biped is statically stable if the CoM projection lies inside the support polygon. Dynamically, the zero moment point (ZMP) – where the net ground reaction moment has no horizontal component – must stay inside the polygon. Small disturbances are corrected by ankle torque (ankle strategy) or by rapid hip motion (hip strategy).',
    sensors: 'Foot force/pressure sensors (CoP), IMU (tilt and tilt rate), joint encoders (CoM computation).',
    actuators: 'Ankle pitch/roll (ankle strategy), hip and torso pitch (hip strategy), legs for stepping.',
    control: 'Here the CoM is computed from the joint angles and a 21-segment mass model, the ZMP from the cart-table model x_zmp = x_c − (z_c/g)·ẍ_c (clipped to the polygon as the measured CoP would be), and foot pressure is distributed from the CoP position. A push is recovered by a damped ankle–hip response.',
    steps: ['Quiet standing: CoM centred.', 'Ankle strategy: forward and backward lean – the CoP follows.', 'Lateral weight shift: pressure moves to one foot.', 'Single support: the polygon shrinks to one foot.', 'External push: the body rotates and recovers.'],
    eq: ['CoM: r_c = Σmᵢrᵢ / Σmᵢ', 'Cart-table ZMP: x_zmp = x_c − (z_c / g)·ẍ_c', 'CoP from sensors: x_cop = Σ Fᵢ·xᵢ / Σ Fᵢ', 'Capture point: ξ = x_c + ẋ_c / ω₀,  ω₀ = √(g / z_c)'],
    apps: 'Bipedal locomotion control, exoskeletons, fall-prevention research, balance assessment in rehabilitation.',
    narr: 'Balance is everything for a humanoid. The yellow marker is my centre of mass, the red disc is my centre of pressure, and the cyan area is my support polygon. As long as the centre of pressure stays inside the polygon, I do not fall.',
    exp: 'Use the inclination slider and push buttons. Watch the CoP move toward the toes or heels and the pressure bars change. Stand on one leg and see the polygon shrink.',
    quiz: [
      ['The support polygon is:', ['The robot’s silhouette', 'The convex hull of the foot contact points', 'A circle around the head', 'The path of the CoM'], 1, 'It is the region the CoP can occupy.'],
      ['For dynamic balance the ZMP must lie:', ['Outside the polygon', 'Inside the support polygon', 'At the CoM', 'At the head'], 1, 'Otherwise the foot starts to rotate.'],
      ['In the cart-table model, accelerating the CoM forward moves the ZMP:', ['Forward', 'Backward', 'Up', 'Not at all'], 1, 'x_zmp = x_c − (z_c/g)·ẍ_c.'],
      ['The ankle strategy is mainly used for:', ['Large disturbances', 'Small disturbances', 'Falling', 'Running'], 1, 'Large ones need hip or stepping strategies.'],
      ['The CoP measured by foot sensors is:', ['Σ Fᵢxᵢ / Σ Fᵢ', 'Σ mᵢ / Σ xᵢ', 'F·d', 'm·g'], 0, 'The force-weighted average of sensor positions.']
    ] });

  m({ id: 24, cat: 'D', t: 'Fall Detection and Recovery',
    obj: ['Explain IMU-based fall detection.', 'Describe protective falling strategies.', 'Sequence a get-up motion from prone, supine and side positions.'],
    intro: 'In a controlled simulation BAIRWABOT loses balance forward, backward and sideways, detects the fall, braces with its arms and recovers to standing.',
    comp: 'IMU, all joints, arms (bracing), legs; segment mass model for CoM visualisation.',
    principle: 'When the CoM moves beyond the support polygon faster than the controller can correct, a fall is inevitable. The robot then switches to a protective strategy: arms extend to absorb impact and the knees flex to lower the CoM. After landing, a scripted get-up sequence uses contact on hands and knees to raise the body.',
    sensors: 'IMU (tilt > threshold and high angular rate), foot force sensors (loss of contact), encoders.',
    actuators: 'All major joints; shoulders and elbows absorb impact; hips and knees raise the body.',
    control: 'Fall detection: |tilt| > 45° or tilt rate > threshold → FALL state → protective posture → recovery state machine (roll to prone → push-up → hands and knees → kneel → stand).',
    steps: ['Loss of balance: CoM leaves the support polygon.', 'Fall direction detected (forward, backward or sideways).', 'Protective posture: arms brace.', 'Fall detected by the IMU (tilt shown in Live Data).', 'Recovery: re-orient, push up, kneel, step one foot forward.', 'Return to standing.'],
    eq: ['Fall detection: θ_tilt > θ_th  OR  |ω| > ω_th', 'Falling time (inverted pendulum): t ≈ √(l/g)·ln(…)  ≈ 0.6–1 s', 'Impact energy: E = m·g·Δh_CoM', 'Impulse: F_avg = m·Δv / Δt  (longer Δt → lower force)'],
    apps: 'Robust humanoids in unstructured environments, exoskeleton safety, elderly fall detection systems.',
    narr: 'Every humanoid must handle falls. I will lose balance in a controlled simulation, detect the fall with my inertial measurement unit, protect myself with my arms, and get back up.',
    exp: 'Trigger each fall direction and watch the IMU tilt angle and the ground-contact indicators in Live Data.',
    quiz: [
      ['Which sensor primarily detects a fall?', ['Microphone', 'IMU', 'RGB camera', 'Speaker'], 1, 'Tilt angle and angular rate.'],
      ['Extending the arms during a fall helps by:', ['Increasing impact time and reducing peak force', 'Increasing speed', 'Recognising speech', 'Saving the battery'], 0, 'F_avg = mΔv/Δt.'],
      ['Flexing the knees during a fall:', ['Raises the CoM', 'Lowers the CoM and impact energy', 'Has no effect', 'Increases the support polygon'], 1, 'E = mgΔh is reduced.'],
      ['A common recovery from prone (face-down) uses:', ['Hands and knees, then kneel, then stand', 'Jumping', 'Rolling continuously', 'Speaking'], 0, 'Contacts are added stepwise.'],
      ['A fall becomes unavoidable when:', ['The CoM leaves the support polygon beyond recovery', 'The robot speaks', 'The battery is full', 'The LED turns off'], 0, 'No corrective torque can restore balance.']
    ] });

  m({ id: 25, cat: 'D', t: 'Sensors and Actuators Visualization',
    obj: ['Locate each sensor on the humanoid.', 'Explain the working principle of each sensor.', 'Explain how a joint actuator produces torque.'],
    intro: 'The outer shell becomes translucent and each sensor and actuator is pointed out with its location, function and working principle.',
    comp: 'RGB camera, depth camera, microphone array, speaker, IMU, joint encoders, force/torque sensors, foot pressure sensors, LiDAR, motor actuators.',
    principle: 'Exteroceptive sensors (cameras, LiDAR, microphones) observe the environment; proprioceptive sensors (encoders, IMU, force sensors) observe the robot itself. Actuators convert electrical power into joint torque through a motor and reducer.',
    sensors: 'All ten sensor/actuator types listed – select one in the experiment list.',
    actuators: 'BLDC motor + harmonic/planetary reducer + encoder + driver in each joint.',
    control: 'Sensor data feed state estimation (pose, CoM, contacts) and perception; estimated states feed the controllers that command actuator currents.',
    steps: ['The shell turns translucent (X-ray view).', 'Each sensor is marked and explained in turn.', 'Select any sensor to repeat its explanation.'],
    eq: ['Stereo depth: Z = f·b / d', 'LiDAR: r = c·Δt / 2', 'Encoder resolution: Δθ = 360° / 2ⁿ', 'Strain gauge: ΔR/R = GF·ε', 'Motor torque: τ = K_t·I;  joint torque τ_j = N·η·τ'],
    apps: 'Sensor selection in robot design, maintenance training, sensor-fusion education.',
    narr: 'Let me show you my sensors and actuators, one by one.',
    exp: 'Select each sensor to see its location highlighted with a pointer and hear its principle. Compute the angular resolution of a 14-bit encoder.',
    quiz: [
      ['A 12-bit absolute encoder has an angular resolution of about:', ['1°', '0.088°', '0.5°', '12°'], 1, '360°/4096 ≈ 0.088°.'],
      ['Which is a proprioceptive sensor?', ['LiDAR', 'Joint encoder', 'RGB camera', 'Microphone'], 1, 'It measures the robot’s own state.'],
      ['Stereo depth is inversely proportional to:', ['Baseline', 'Focal length', 'Disparity', 'Exposure'], 2, 'Z = f·b/d.'],
      ['A strain gauge measures force through a change in:', ['Colour', 'Resistance', 'Temperature only', 'Light'], 1, 'ΔR/R = GF·ε.'],
      ['Joint output torque of a motor with reducer ratio N is approximately:', ['τ_m / N', 'N·η·τ_m', 'τ_m + N', 'τ_m'], 1, 'The reducer multiplies torque.']
    ] });

  m({ id: 26, cat: 'D', t: 'Forward and Inverse Kinematics',
    obj: ['Compute end-effector pose from joint angles (FK).', 'Use homogeneous transformation matrices.', 'Solve IK numerically with the Jacobian.'],
    intro: 'An engineering-level simulation of BAIRWABOT’s right arm. Move joint sliders to see the end-effector position and the live 4×4 transformation matrix (FK), or move a target and watch the IK solver find the joint angles.',
    comp: 'Right arm chain: shoulder pitch, roll, yaw, elbow pitch (positioning DOF), forearm and wrist (orientation DOF); torso frame as base.',
    principle: 'Each joint contributes a rotation and each link a translation. The pose of the hand in the shoulder frame is the product T = A₁·A₂·…·Aₙ. IK inverts this mapping numerically: the error e between target and current position is reduced iteratively using the Jacobian pseudo-inverse with damping.',
    sensors: 'Joint encoders (measured angles feed FK).',
    actuators: 'Arm joint actuators track the IK solution.',
    control: 'Joint-space control (FK mode, sliders set θ directly) versus Cartesian-space control (IK mode, the target sets x and the solver computes θ).',
    steps: ['FK: each joint is swept and the hand position follows.', 'The transformation matrix and coordinates update live.', 'IK: a red target moves in a circle; the hand follows it.', 'The cyan trail shows the hand trajectory.', 'Use the sliders yourself.'],
    eq: ['Homogeneous transform: T = [R  p; 0  1]', 'Chain: ⁰Tₙ = ⁰T₁·¹T₂·…·ⁿ⁻¹Tₙ', 'Planar 2-link FK: x = l₁cos θ₁ + l₂cos(θ₁+θ₂)', 'Planar 2-link IK: cos θ₂ = (x²+y²−l₁²−l₂²)/(2l₁l₂)', 'DLS IK: Δθ = Jᵀ(JJᵀ + λ²I)⁻¹(x_d − x)'],
    apps: 'Industrial robot programming, animation retargeting, prosthetics, surgical robots.',
    narr: 'Forward kinematics computes where my hand is from my joint angles. Inverse kinematics does the opposite: from a target position, it finds the joint angles. Watch my right arm.',
    exp: 'FK: move the shoulder and elbow sliders and read the matrix. IK: move the target sliders; check that the residual error stays small and observe what happens at the edge of the workspace.',
    quiz: [
      ['Forward kinematics maps:', ['Hand position → joint angles', 'Joint angles → hand pose', 'Torque → current', 'Image → label'], 1, 'FK is a direct calculation.'],
      ['In a homogeneous transform the upper-left 3×3 block is the:', ['Position vector', 'Rotation matrix', 'Jacobian', 'Mass matrix'], 1, 'T = [R p; 0 1].'],
      ['IK may have:', ['Exactly one solution always', 'Zero, one or many solutions', 'Only negative angles', 'No relation to FK'], 1, 'e.g. elbow-up vs elbow-down.'],
      ['A singularity occurs when the Jacobian:', ['Loses rank', 'Is the identity', 'Is very large', 'Is positive'], 0, 'Some Cartesian directions become unreachable instantaneously.'],
      ['For a planar 2-link arm with l₁ = l₂ = 0.3 m, the maximum reach is:', ['0.3 m', '0.6 m', '0.09 m', '0.42 m'], 1, 'Fully extended: l₁ + l₂.']
    ] });

  m({ id: 27, cat: 'D', t: 'Joint Movement and DOF Visualization',
    obj: ['Identify each of the 46 conceptual DOF.', 'Read joint axis, range, angle and angular velocity.', 'Relate each DOF to a body movement.'],
    intro: 'Every one of BAIRWABOT’s 46 conceptual DOF is highlighted and moved through its range in turn. Select any joint and drive it with a slider.',
    comp: 'Neck 3, torso 3, arms 2×8, hands 2×6, legs 2×6 = 46 DOF.',
    principle: 'A revolute joint has one rotational DOF about a fixed axis. Its state is described by angle θ (from the encoder) and angular velocity ω = dθ/dt; mechanical stops and software limits define the range of motion.',
    sensors: 'Joint encoders for each DOF.',
    actuators: 'One actuator per DOF (finger DOF use coupled tendon actuation).',
    control: 'Joint-space position control: θ_ref from the slider is tracked by each joint servo; the controller enforces θ_min ≤ θ ≤ θ_max.',
    steps: ['Each DOF is highlighted with its rotation axis (red arrows).', 'Angle, limits and angular velocity are displayed.', 'The joint sweeps through part of its range.', 'Select a DOF and use the slider to move it yourself.'],
    eq: ['Angular velocity: ω = dθ/dt ≈ (θ_k − θ_{k−1}) / Δt', 'Range of motion: ROM = θ_max − θ_min', 'Grübler count (spatial, serial): DOF = Σ fᵢ', 'Gravity torque: τ_g = Σ (rᵢ × mᵢg)·â'],
    apps: 'Robot specification and design, kinematic calibration, motion capture mapping.',
    narr: 'Here are all forty six of my conceptual degrees of freedom. Each one is highlighted and moved in turn. The red arrows show the rotation axis.',
    exp: 'Select a joint in the explorer, move its slider and read the static gravity torque (simulated mass model). Compare the shoulder pitch torque with the arm horizontal and hanging.',
    quiz: [
      ['A revolute joint has how many DOF?', ['0', '1', '3', '6'], 1, 'Rotation about one axis.'],
      ['Range of motion is:', ['θ_max − θ_min', 'θ_max + θ_min', 'ω·t', 'τ/θ'], 0, 'The span of allowed angles.'],
      ['How many DOF does each BAIRWABOT arm have?', ['6', '7', '8', '12'], 2, '3 shoulder + elbow + forearm + 3 wrist.'],
      ['Gravity torque at the shoulder is largest when the arm is:', ['Hanging down', 'Horizontal', 'Vertical up', 'Folded'], 1, 'The moment arm is maximal.'],
      ['Angular velocity is computed from encoder readings by:', ['Integration', 'Differentiation', 'Multiplication by mass', 'FFT'], 1, 'ω = dθ/dt.']
    ] });

  m({ id: 28, cat: 'E', t: 'Elderly and Disabled Person Assistance',
    obj: ['Identify assistive tasks suitable for humanoids.', 'Explain safe hand-over and guidance behaviour.', 'Recognise ethical limits of assistive robots.'],
    intro: 'BAIRWABOT brings a water bottle, picks up fallen keys, gives a simulated medicine reminder and guides a person – responding to assistance requests.',
    comp: 'Full body; cameras and microphones for requests; table with bottle and medicine box; resident with a chair.',
    principle: 'Assistive tasks combine navigation, manipulation and HRI. Hand-over waits until the person’s hand is in position; guidance uses slow walking and periodic checks of the person’s position. Reminders are a simulated service – the robot does not prescribe or administer medicine.',
    sensors: 'Microphone (requests), cameras (person, objects, hand position), LiDAR, force sensors (hand-over release).',
    actuators: 'Legs, arms, hands, speaker.',
    control: 'Request → task plan (navigate, pick, return, hand over) executed by the behaviour state machine; speed limits and force limits are applied near people.',
    steps: ['Request: “Please bring my water bottle.”', 'Navigate to the table, grasp, return, hand over.', 'Detect the fallen keys, crouch, pick up, hand over.', 'Simulated medicine reminder.', 'Guide the person at slow speed.'],
    eq: ['Safe speed near people (cobots): v ≤ 0.25 m/s typical', 'Hand-over: release when F_pull > threshold', 'Guidance distance: |x_robot − x_person| ≈ 1 m'],
    apps: 'Elderly care homes, home assistance, rehabilitation centres, support for people with disabilities.',
    narr: 'Assistive robots can help elderly and disabled people with everyday tasks. I will bring water, pick up a fallen object, give a reminder and guide a person. All services here are simulated.',
    exp: 'Run each task separately and observe the hand-over: the robot releases only when the person’s hand is in place.',
    quiz: [
      ['When handing an object to a person, the robot should release it:', ['Immediately', 'When the person holds it', 'After dropping it', 'Never'], 1, 'Release is triggered by the receiver’s grasp.'],
      ['A medicine reminder from this robot is:', ['A medical diagnosis', 'A simulated reminder service only', 'A prescription', 'A treatment'], 1, 'The robot does not diagnose or prescribe.'],
      ['Picking an object from the floor needs:', ['Crouching with balance control', 'Running', 'Jumping', 'Dancing'], 0, 'The CoM must stay over the feet.'],
      ['When guiding a person the robot should:', ['Walk fast', 'Walk slowly and monitor the person', 'Ignore the person', 'Run ahead'], 1, 'Safety and comfort.'],
      ['Which sensor captures an assistance request?', ['Microphone', 'Encoder', 'Battery monitor', 'Ankle torque sensor'], 0, 'Spoken requests.']
    ] });

  m({ id: 29, cat: 'E', t: 'Teaching and Educational Assistant',
    obj: ['Use a robot as an interactive instructor.', 'Review core robotics concepts.', 'Self-assess with spoken and on-screen quiz questions.'],
    intro: 'BAIRWABOT acts as a robotics instructor: it introduces robotics, explains sensors, actuators, DOF, forward and inverse kinematics with a whiteboard, demonstrates walking and conducts a short quiz.',
    comp: 'Full body, whiteboard display, speech system, quiz system.',
    principle: 'Robotics follows the sense–think–act loop: sensors measure, computation decides, actuators act. The lesson builds from components (sensors, actuators) to structure (DOF) to mathematics (FK, IK) and a demonstration.',
    sensors: 'Microphone and camera (student interaction).',
    actuators: 'Arm gestures for presenting, legs for the walking demonstration, speaker.',
    control: 'A lesson script sequences board slides, narration, gestures and demonstration; the quiz is read aloud and answered in the Quiz tab.',
    steps: ['Introduction to robotics (sense–think–act).', 'Sensors.', 'Actuators.', 'Degrees of freedom.', 'Forward kinematics.', 'Inverse kinematics.', 'Walking demonstration.', 'Spoken quiz questions.'],
    eq: ['Sense → Think → Act loop', 'τ_out = N·η·K_t·I', 'T = A₁·A₂·…·Aₙ', 'Δθ = Jᵀ(JJᵀ + λ²I)⁻¹e'],
    apps: 'Robot teaching assistants, STEM outreach, language and special-education support.',
    narr: 'Good day, students. I am BAIRWABOT, and today I will be your robotics instructor.',
    exp: 'Run the lesson, then answer the five questions in the Quiz tab. Ask follow-up questions in the Talk tab.',
    quiz: [
      ['The basic loop of every robot is:', ['Sense – think – act', 'Walk – run – stop', 'Charge – drive – park', 'Speak – listen – sleep'], 0, 'Perception, decision, action.'],
      ['Which converts electrical energy into motion?', ['Sensor', 'Actuator', 'Battery', 'Camera'], 1, 'Actuators produce motion.'],
      ['Inverse kinematics finds:', ['Joint angles for a target position', 'Battery state', 'Camera focus', 'Walking speed'], 0, 'From Cartesian goal to joint space.'],
      ['A degree of freedom is:', ['A sensor', 'An independent motion', 'A gear', 'A program'], 1, 'One independent coordinate of motion.'],
      ['During walking, the stance phase is about what fraction of the cycle?', ['10 %', '30 %', '60 %', '100 %'], 2, 'Stance ≈ 60 %.']
    ] });

  m({ id: 30, cat: 'E', t: 'Hospital and Emergency Assistance',
    obj: ['Describe non-clinical hospital tasks for robots.', 'Explain emergency detection and escalation to staff.', 'Recognise the boundary between assistance and medical decision-making.'],
    intro: 'In a hospital corridor BAIRWABOT guides a visitor to a ward, delivers supplies to the staff station, identifies a simulated emergency, alerts staff and provides information. It never diagnoses or treats patients.',
    comp: 'Full body, navigation sensors, cameras, speaker; corridor, reception desk, ward sign, supply table, staff station.',
    principle: 'Hospital robots perform logistics and guidance. Emergency handling is limited to detection (e.g. a person on the floor) and immediate escalation to human staff, who make all clinical decisions.',
    sensors: 'LiDAR and cameras (navigation, person detection), microphone (requests), IMU.',
    actuators: 'Legs, arms (carrying supplies), speaker and LEDs (alerts).',
    control: 'Behaviour state machine: guide → deliver → patrol; an emergency event pre-empts the current task, triggers an alert message to staff and keeps the area clear.',
    steps: ['Guide a visitor to Ward 3.', 'Navigate the corridor.', 'Deliver a supply box to the staff station.', 'Identify a simulated emergency.', 'Alert hospital staff (simulated message).', 'Provide information.'],
    eq: ['Task priority: emergency > delivery > guidance', 'Alert latency target: t_alert < 2 s', 'Corridor speed limit ≈ 0.5–1.0 m/s'],
    apps: 'Hospital logistics (medicines, linen, samples), reception and way-finding, disinfection, telepresence.',
    narr: 'Welcome to the hospital assistance scenario. I can guide visitors, deliver supplies and alert staff in an emergency. I do not diagnose or treat patients.',
    exp: 'Run the scenario and observe how the emergency event pre-empts the delivery task and how the alert status changes in Live Data.',
    quiz: [
      ['In an emergency the robot’s role is to:', ['Diagnose the patient', 'Detect and alert human staff', 'Prescribe treatment', 'Perform surgery'], 1, 'Clinical decisions belong to staff.'],
      ['Which task should have the highest priority?', ['Guidance', 'Delivery', 'Emergency alert', 'Idle'], 2, 'Safety-critical events pre-empt other tasks.'],
      ['A common non-clinical hospital robot task is:', ['Supply delivery', 'Diagnosis', 'Prescription', 'Anaesthesia'], 0, 'Logistics is a major use case.'],
      ['Which sensor helps navigate corridors?', ['LiDAR', 'Speaker', 'Battery', 'Face display'], 0, 'Range sensing for mapping and obstacles.'],
      ['When guiding a visitor the robot should:', ['Walk ahead at a comfortable pace and check the visitor follows', 'Run', 'Leave the visitor', 'Carry the visitor'], 0, 'Safe and comfortable guidance.']
    ] });
})();
