/* Unit practice question banks prepared from the course notes. Answers are shown only after submission.
   type 'num' answers are checked within tol (relative) of answer. */
(function () {
  const RIL = window.RIL; const Q = RIL.quiz;
  const mc = (topic, cat, q, options, answer, explain) => ({ topic, cat, q, options, answer, explain });
  const num = (topic, q, answer, unit, explain, tol = 0.02) => ({ topic, cat: 'Numerical', type: 'num', q, answer, unit, tol, explain });
  Q[1] = [
    mc('u1t1', 'Multiple choice', 'According to ISO 8373, an industrial robot must be programmable in at least how many axes?', ['One', 'Two', 'Three', 'Six'], 2, 'The definition requires three or more programmable axes.'),
    mc('u1t1', 'Conceptual', 'A bottling line that produces one product at very high volume is an example of:', ['Fixed (hard) automation', 'Programmable automation', 'Flexible automation', 'Collaborative automation'], 0, 'Table 1.2: transfer and bottling lines are fixed automation.'),
    mc('u1t2', 'Multiple choice', 'In a six-axis articulated robot, which joints mainly orient the tool?', ['Joints 1–3', 'Joints 4–6', 'Joints 1 and 6', 'Only joint 6'], 1, 'The wrist (joints 4–6) orients the tool; joints 1–3 position the wrist centre.'),
    mc('u1t3', 'Application', 'Arc welding of a curved seam requires which motion-control class?', ['Non-servo', 'Servo point-to-point', 'Servo continuous path', 'Bang-bang'], 2, 'The torch path between points must be controlled.'),
    mc('u1t4', 'Multiple choice', 'Which configuration is selectively compliant in the horizontal plane and rigid vertically?', ['Cartesian', 'Spherical', 'SCARA', 'Articulated'], 2, 'SCARA = Selective Compliance Assembly Robot Arm.'),
    num('u1t5', 'Use Grübler\'s formula to find the DOF of a planar four-bar linkage (all revolute joints).', 1, 'DOF', 'DOF = 3(4 − 1 − 4) + 4 = 1.', 0.001),
    num('u1t6', 'A cylindrical robot has r_min = 0.25 m, r_max = 0.75 m, vertical stroke 0.6 m and base rotation 300°. Compute the work volume.', 0.785, 'm³', 'V = (Δθ/2)(r_max² − r_min²)h = 2.618 × 0.5 × 0.6 = 0.785 m³ (Example 1.4).'),
    num('u1t6', 'A planar 2R arm has l₁ = 0.5 m and l₂ = 0.3 m. What is its minimum reach?', 0.2, 'm', '|l₁ − l₂| = 0.2 m (Eq. 1.8).'),
    mc('u1t7', 'Conceptual', 'Re-teaching which frame relocates an entire palletising program to a new pallet?', ['Joint frame', 'Tool frame', 'User (work-object) frame', 'Base frame'], 2, 'Points are taught relative to the user frame.'),
    num('u1t8', 'A 1024-line incremental encoder is read with ×4 decoding. What is its resolution in degrees?', 0.0879, '°', '360°/(4 × 1024) = 0.0879° (Eq. 1.32).'),
    num('u1t8', 'A linear potentiometer (R_p = 10 kΩ, V_s = 10 V) feeds a 50 kΩ recorder with the wiper at x = 0.6. Find the output voltage.', 5.725, 'V', 'V_o = 10 × 0.6/(1 + 0.2 × 0.6 × 0.4) = 5.725 V (Example 1.15).'),
    num('u1t8', 'An ultrasonic echo returns after 5.83 ms in air at 35 °C. What is the true distance?', 1.028, 'm', 'v_s = 331.3 + 0.606 × 35 = 352.5 m/s; d = v_s t/2 = 1.028 m (Example 1.21).'),
    mc('u1t9', 'Conceptual', 'In a load-cell weighing system, the Wheatstone bridge is the:', ['Primary sensing element', 'Variable-conversion element', 'Data-presentation element', 'Measurand'], 1, 'It converts the resistance change into a voltage.'),
    num('u1t10', 'A thermometer with τ = 8 s at 25 °C is plunged into water at 100 °C. What does it read after 10 s?', 78.5, '°C', 'T = 25 + 75(1 − e^(−10/8)) = 78.5 °C (Example 1.12).', 0.01),
    num('u1t10', 'A voltmeter of 1 MΩ measures a source with V_Th = 6 V and R_Th = 50 kΩ. What does it read?', 5.714, 'V', 'V_m = 6 × 1000/1050 = 5.714 V (Example 1.10).'),
    mc('u1t10', 'Multiple choice', 'Eight readings have mean 101.125 °C in a 100.0 °C bath and s = 0.225 °C. The instrument is:', ['Accurate and precise', 'Precise but not accurate', 'Accurate but not precise', 'Neither'], 1, 'Small spread (precise) but 1.125 °C bias (not accurate) – Example 1.8.'),
    num('u1t11', 'Find the resistance of a Pt100 RTD at 150 °C using the Callendar–Van Dusen equation (A = 3.9083e-3, B = −5.775e-7).', 157.33, 'Ω', 'R = 100(1 + 0.58625 − 0.01299) = 157.33 Ω (Example 1.23).', 0.002),
    num('u1t11', 'A type K thermocouple reads 7.138 mV with the reference junction at 25 °C (E(25,0) = 1.000 mV, E(200,0) = 8.138 mV). What is the hot-junction temperature?', 200, '°C', 'E(T,0) = 7.138 + 1.000 = 8.138 mV → 200 °C (Example 1.25).', 0.005),
    num('u1t12', 'A mercury manometer (ρ = 13 546 kg/m³) shows h = 150 mm. Find Δp in kPa.', 19.93, 'kPa', 'Δp = ρgh = 13546 × 9.81 × 0.15 = 19.93 kPa (Example 1.26).'),
    num('u1t13', 'A full bridge with V_ex = 10 V, G_F = 2.0 measures 857 µε. What is the output in mV?', 17.14, 'mV', 'V_o = V_ex G_F ε = 10 × 2 × 857e-6 = 17.1 mV (Example 1.30).')
  ];
  Q[2] = [
    num('u2t1', 'A pneumatic cylinder has bore 50 mm, supply 6 bar gauge and efficiency 0.9. Find the extend force.', 1060, 'N', 'F = ηpA = 0.9 × 6e5 × 1.963e-3 = 1060 N (Example 2.1).'),
    num('u2t1', 'A hydraulic cylinder of 80 mm bore is supplied with 20 L/min. Find the piston speed.', 0.0663, 'm/s', 'v = Q/A = 3.333e-4/5.027e-3 = 0.066 m/s (Example 2.2).'),
    mc('u2t1', 'Application', 'Which actuator family is best for a 50 kN press stroke in a compact space?', ['Pneumatic', 'Hydraulic', 'Stepper motor', 'Solenoid'], 1, 'Hydraulics have the highest force density.'),
    num('u2t2', 'A DC motor (V_a = 24 V, R_a = 1.2 Ω, K_t = K_b = 0.05) drives 0.2 N·m. Find the steady speed in rad/s.', 384, 'rad/s', 'i_a = 4 A, E_b = 19.2 V, ω = 384 rad/s (Example 2.3).'),
    num('u2t2', 'Find the mechanical time constant of that motor with J = 2 × 10⁻⁵ kg·m² (in ms).', 9.6, 'ms', 'τ_m = JR_a/(K_tK_b) = 2e-5 × 1.2/0.0025 = 9.6 ms (Example 2.4).'),
    mc('u2t3', 'Conceptual', 'In a PID position servo with constant load torque, which term removes the steady-state error?', ['Proportional', 'Integral', 'Derivative', 'Feed-forward of velocity'], 1, 'Integral action accumulates error until it is zero.'),
    num('u2t3', 'What angle does an RC servo take for a 1.6 ms pulse?', 108, '°', 'θ = 180 × (1.6 − 1)/1 = 108° (Eq. 2.12).'),
    num('u2t4', 'A 3-phase VR stepper has 8 rotor teeth. Find the full-step angle.', 15, '°', 'θ_s = 360/(3 × 8) = 15° (Eq. 2.15).'),
    num('u2t4', 'A 200-step/rev stepper is pulsed at 1 kHz. Find its speed in rpm.', 300, 'rpm', 'n = 60f/S = 60 × 1000/200 = 300 rpm (Example 2.5).'),
    num('u2t5', 'An 8-pole BLDC motor runs at 3000 rpm. Find the electrical frequency.', 200, 'Hz', 'f_e = pn/60 = 4 × 3000/60 = 200 Hz (Example 2.6).'),
    num('u2t6', 'A solenoid has N = 1000, I = 0.5 A, A = 1 cm², g = 2 mm. Find the ideal force.', 3.93, 'N', 'F = (NI)²μ₀A/(2g²) = 3.9 N (Example 2.7).', 0.03),
    num('u2t7', 'A harmonic drive has 200 flexspline teeth and 202 circular-spline teeth. Find the ratio.', 100, ':1', 'n = N_f/(N_c − N_f) = 100 (Eq. 2.22).', 0.001),
    mc('u2t8', 'Multiple choice', 'Compared with a serial arm, a parallel (Delta) robot typically has:', ['Larger workspace and lower stiffness', 'Smaller workspace and higher stiffness', 'Easier forward kinematics', 'Motors on every moving link'], 1, 'Closed chains give stiffness and speed over a small workspace.'),
    num('u2t9', 'Find the per-finger gripping force for a 2 kg part, μ = 0.3, a = 5 m/s², two fingers, S = 2.', 98.7, 'N', 'F_g = 2 × 2 × (9.81 + 5)/(2 × 0.3) = 98.7 N (Example 2.10).'),
    num('u2t10', 'A shunt must give 50 mV at 100 A. Find its resistance in mΩ.', 0.5, 'mΩ', 'R_sh = 0.05/100 = 0.5 mΩ (Example 2.11).'),
    num('u2t12', 'An in-amp with R = 25 kΩ and R₃/R₂ = 1 must have a gain of 1000. Find R_G in Ω.', 50.05, 'Ω', 'R_G = 2R/(G − 1) = 50 000/999 = 50.05 Ω (Example 2.12).'),
    num('u2t13', 'Find the cut-off frequency of an RC low-pass with R = 10 kΩ and C = 100 nF.', 159.2, 'Hz', 'f_c = 1/(2πRC) = 159 Hz (Example 2.13).'),
    mc('u2t14', 'Conceptual', 'A cable shield for low-frequency analogue signals should normally be grounded:', ['At both ends', 'At the receiving end only', 'At the sensor end only', 'Not at all'], 1, 'Grounding at one end prevents ground-loop current in the shield.'),
    num('u2t15', 'A 12-bit ADC spans 0–5 V. Find the quantisation step in mV.', 1.221, 'mV', 'Q = 5/4096 = 1.22 mV (Example 2.14).'),
    num('u2t15', 'An 8-bit R–2R DAC (V_ref = 5 V) receives 10110100. Find the output voltage.', 3.516, 'V', 'D = 180; v_o = 5 × 180/256 = 3.516 V (Example 2.16).'),
    num('u2t16', 'Find the data rate of a DAQ with 8 channels × 10 kS/s × 16 bits in Mbit/s.', 1.28, 'Mbit/s', 'R_b = nf_sN = 1.28 Mbit/s (Example 2.17).')
  ];
  Q[3] = [
    mc('u3t2', 'Multiple choice', 'Which statement about a rotation matrix R is FALSE?', ['R⁻¹ = Rᵀ', 'det R = +1', 'Its columns are orthonormal', 'Rotations always commute'], 3, 'Composition of rotations is generally non-commutative.'),
    num('u3t2', 'Rotate ᴮp = (1, 2, 0) by 30° about z. What is the x-coordinate of ᴬp?', -0.134, 'm', 'x = 0.866 × 1 − 0.5 × 2 = −0.134 m (Example 3.1).', 0.01),
    num('u3t3', '{B} is rotated 90° about z with origin (3, 1, 0). Transform ᴮp = (1, 1, 0); give the x-coordinate of ᴬp.', 2, 'm', 'ᴬp = (0 − 1 + 3, 1 + 0 + 1, 0) = (2, 2, 0) (Example 3.3).', 0.001),
    mc('u3t4', 'Multiple choice', 'In the standard DH convention, the joint variable of a prismatic joint is:', ['a_i', 'α_i', 'd_i', 'θ_i'], 2, 'For prismatic joints d_i varies; θ_i is constant.'),
    num('u3t5', 'A 2R arm has l₁ = 0.5 m, l₂ = 0.3 m, θ₁ = 30°, θ₂ = 45°. Find x.', 0.5107, 'm', 'x = 0.5 cos30° + 0.3 cos75° = 0.5107 m (Example 3.4).', 0.003),
    num('u3t5', 'For the same arm find y.', 0.5398, 'm', 'y = 0.25 + 0.2898 = 0.5398 m.', 0.003),
    num('u3t5', 'Articulated arm d₁ = 0.4, a₂ = 0.5, a₃ = 0.4 m, θ = (30°, 45°, −60°). Find z.', 0.65, 'm', 'z = d₁ + a₂s₂ + a₃s₂₃ = 0.4 + 0.3536 − 0.1035 = 0.650 m (Example 3.5).', 0.003),
    num('u3t6', 'For l₁ = 0.5, l₂ = 0.3 m and target (0.5, 0.4) m, find c₂ = cos θ₂.', 0.2333, '', 'c₂ = (0.41 − 0.34)/0.3 = 0.2333 (Example 3.6).', 0.005),
    mc('u3t6', 'Conceptual', 'If the computed c₂ of a 2R arm is 1.4, the target is:', ['Reachable with two solutions', 'Reachable with one solution', 'Unreachable', 'A singular point inside the workspace'], 2, '|c₂| > 1 means no real θ₂ exists.'),
    num('u3t8', 'Find det J of a 2R arm with l₁ = 0.5 m, l₂ = 0.3 m at θ₂ = 45°.', 0.1061, 'm²', 'det J = l₁l₂ sin θ₂ = 0.1061 (Example 3.7).', 0.005),
    mc('u3t9', 'Multiple choice', 'A wrist singularity of a six-axis arm with spherical wrist occurs when:', ['θ₁ = 0', 'θ₅ = 0 (axes 4 and 6 aligned)', 'θ₂ = 90°', 'The TCP is at the base'], 1, 'Aligned axes 4 and 6 lose one rotational DOF.'),
    num('u3t10', 'Find the outer radius of the dexterous workspace of a planar 3R arm with L = (0.4, 0.3, 0.1) m.', 0.6, 'm', 'r_max,dex = L₁ + L₂ − L₃ = 0.6 m (Eq. 3.21).', 0.001),
    num('u3t11', 'A joint moves 10° → 70° in 3 s with a cubic polynomial. Find a₂ in °/s².', 20, '°/s²', 'a₂ = 3Δ/t_f² = 180/9 = 20 (Eq. 3.22).', 0.001),
    num('u3t11', 'An LSPB move of 60° in 3 s uses V = 25°/s. Find the blend time t_b.', 0.6, 's', 't_b = (θ₀ − θ_f + Vt_f)/V = (−60 + 75)/25 = 0.6 s (Example 3.9).', 0.001),
    num('u3t13', 'Find the minimum time for Δ = 90° with V_max = 60°/s and a_max = 120°/s².', 2, 's', 'Δ > V²/a = 30°, so t_f = 90/60 + 60/120 = 2.0 s (Eq. 3.26).', 0.001),
    mc('u3t12', 'Application', 'Which interpolation should be used to follow a straight sealing bead?', ['Joint interpolation (MOVJ)', 'Linear Cartesian interpolation (MOVL)', 'Non-servo end-stop motion', 'Random waypoints'], 1, 'Only Cartesian interpolation controls the tool path.'),
    num('u3t14', '2R arm (Example 3.7) at (30°, 45°) presses with F = (0, −20) N. Find τ₁ = (JᵀF)₁.', -10.21, 'N·m', 'τ₁ = 0.5107 × (−20) = −10.21 N·m (Example 3.10).', 0.01),
    num('u3t16', 'A uniform link (m = 2 kg, l = 0.5 m) is horizontal. Find the holding torque.', 4.905, 'N·m', 'τ = mg(l/2) = 2 × 9.81 × 0.25 = 4.905 N·m (Example 3.11).', 0.005),
    num('u3t16', 'Same link accelerating upward at 2 rad/s² from horizontal: find τ.', 5.24, 'N·m', 'τ = I_Oθ̈ + mgl_c = 0.1667 × 2 + 4.905 = 5.24 N·m.', 0.01),
    num('u3t17', 'A joint with J_eff = 3 × 10⁻⁴ kg·m² needs ω_n = 50 rad/s. Find K_p.', 0.75, 'N·m/rad', 'K_p = Jω_n² = 0.75 (Example 3.13).', 0.005),
    mc('u3t18', 'Conceptual', 'In Jacobian-transpose task-space control without gravity compensation, the steady-state result is:', ['Exact positioning', 'A static position error', 'Unbounded oscillation', 'Joint-limit violation always'], 1, 'The virtual spring must balance gravity, leaving an error.')
  ];
  Q[4] = [
    mc('u4t1', 'Multiple choice', 'At which level of the automation pyramid do PLCs and robot controllers operate?', ['Level 0', 'Level 1', 'Level 3', 'Level 4'], 1, 'Level 1 – real-time control.'),
    mc('u4t2', 'Conceptual', 'Opening an interlocked cell door during automatic operation should cause:', ['No change', 'A protective stop of the robot', 'An increase in speed', 'Only a warning lamp'], 1, 'Safety interlocks stop hazardous motion.'),
    num('u4t3', 'A PLC program has 4000 instructions of 0.05 µs; I/O update 0.5 ms; communication 0.3 ms. Find T_scan in ms.', 1.0, 'ms', 'T_scan = 0.2 + 0.5 + 0.3 = 1.0 ms (Example 4.1).', 0.001),
    num('u4t3', 'With a 3 ms input filter and 10 ms relay output, find the worst-case response time for T_scan = 1 ms.', 15, 'ms', 'T_filter + 2T_scan + T_out = 15 ms (Eq. 4.2).', 0.001),
    mc('u4t3', 'Conceptual', 'Why is the stop push-button wired normally closed?', ['To save wire', 'So a broken wire stops the machine', 'So the PLC scans faster', 'To allow analogue reading'], 1, 'Fail-safe design.'),
    mc('u4t4', 'Multiple choice', 'Cobots may work without fences mainly because they use:', ['Hydraulic drives', 'Power and force limiting', 'Larger payloads', 'Faster speeds'], 1, 'Table 4.3.'),
    mc('u4t5', 'Multiple choice', 'Which instruction moves the TCP along a straight line?', ['MOVJ', 'MOVL', 'WAIT', 'SET DO'], 1, 'Linear interpolation.'),
    mc('u4t6', 'Conceptual', 'In T1 mode, the TCP speed is limited to:', ['50 mm/s', '250 mm/s', '1000 mm/s', 'no limit'], 1, 'Section 4.6.'),
    num('u4t8', 'An LM35 (10 mV/°C) at 37.5 °C feeds a 12-bit ADC with V_ref = 3.3 V. Find D = round(v·4095/3.3).', 465, '', 'D = round(0.375 × 4095/3.3) = 465 (Example 4.2).', 0.001),
    num('u4t9', 'Find R_B in kΩ for a 60 mA relay coil, h_FE = 100, overdrive 5, V_OH = 5 V, V_BE = 0.7 V.', 1.433, 'kΩ', 'I_B = 3 mA; R_B = 4.3/0.003 = 1.43 kΩ (Example 4.3).'),
    num('u4t10', 'f_clk = 72 MHz, PSC = 71, ARR = 999. Find the PWM frequency in Hz.', 1000, 'Hz', 'f = 72e6/(72 × 1000) = 1 kHz (Example 4.4).', 0.001),
    num('u4t10', 'A 12 V supply is PWM-switched at 30 % duty. Find V_avg.', 3.6, 'V', 'V_avg = DV_dc = 3.6 V (Eq. 4.4).', 0.001),
    num('u4t11', 'Find the UART throughput in bytes/s at 115 200 baud with 8N1 framing.', 11520, 'bytes/s', '115200/10 = 11 520 (Eq. 4.6).', 0.001),
    mc('u4t11', 'Multiple choice', 'In CAN arbitration, which node wins?', ['Highest identifier', 'Lowest identifier', 'First to start', 'Random'], 1, 'Dominant 0 bits win; the lowest ID has the most leading zeros.'),
    num('u4t12', 'A 1280-pixel camera views a 256 mm field. Find the spatial resolution in mm/px.', 0.2, 'mm/px', 'r_s = W/N_px = 0.2 (Example 4.5).', 0.001),
    num('u4t12', 'A blob has μ₁₁ = 12, μ₂₀ = 20, μ₀₂ = 10.5. Find its orientation in degrees.', 34.2, '°', 'θ = ½ atan2(24, 9.5) = 34.2° (Example 4.6).', 0.01),
    mc('u4t12', 'Application', 'Which lighting technique best reveals fine scratches on a flat metal part?', ['Backlighting', 'Dark-field (low-angle)', 'Diffuse dome', 'Structured light'], 1, 'Scratches scatter grazing light into the camera.'),
    num('u4t13', 'Availability 0.9, performance 0.85 and quality 0.98. Find OEE in %.', 74.97, '%', 'OEE = 0.9 × 0.85 × 0.98 = 75 % (Eq. 4.15).', 0.01),
    num('u4t14', 'A conveyor moves at 0.3 m/s and the image-to-grasp latency is 0.2 s. Find the required target shift in mm.', 60, 'mm', 'Δx = v_cΔt = 60 mm (Example 4.7).', 0.001),
    num('u4t17', 'A differential-drive robot (r = 0.05 m, b = 0.3 m) has ω_R = 12, ω_L = 8 rad/s. Find v.', 0.5, 'm/s', 'v = r(ω_R + ω_L)/2 = 0.5 m/s (Eq. 4.17).', 0.001)
  ];
})();
