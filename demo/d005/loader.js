(() => {
  // demo-artifact/mock/kinematics.ts
  var D2R = Math.PI / 180;
  var R2D = 180 / Math.PI;
  var JOINTS = [
    { origin: [0, 0, 0.1692], axis: [0, 0, 1] },
    // base
    { origin: [0, -0.1484, 0], axis: [0, 1, 0] },
    // shoulder
    { origin: [0, 0, 0.13], axis: [0, 0, 1] },
    // arm_angle
    { origin: [0, 0, 0.2945], axis: [0, 1, 0] },
    // elbow
    { origin: [0, 0.1484, 0.392], axis: [0, 1, 0] },
    // wrist1
    { origin: [0, -0.1107, 0], axis: [0, 0, 1] },
    // wrist2
    { origin: [0, 0, 0.1107], axis: [0, 1, 0] }
    // wrist3
  ];
  var TCP_ORIGIN = [0, -0.0967, 0];
  var AA_INDEX = 2;
  var mul = (a, b) => {
    const o = new Array(9).fill(0);
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        for (let k = 0; k < 3; k++) o[i * 3 + j] += a[i * 3 + k] * b[k * 3 + j];
    return o;
  };
  var apply = (r, v) => [
    r[0] * v[0] + r[1] * v[1] + r[2] * v[2],
    r[3] * v[0] + r[4] * v[1] + r[5] * v[2],
    r[6] * v[0] + r[7] * v[1] + r[8] * v[2]
  ];
  var transpose = (r) => [r[0], r[3], r[6], r[1], r[4], r[7], r[2], r[5], r[8]];
  var cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
  var IDENT = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  var axisAngle = (axis, a) => {
    const [x, y, z] = axis;
    const c = Math.cos(a), s = Math.sin(a), t = 1 - c;
    return [
      t * x * x + c,
      t * x * y - s * z,
      t * x * z + s * y,
      t * x * y + s * z,
      t * y * y + c,
      t * y * z - s * x,
      t * x * z - s * y,
      t * y * z + s * x,
      t * z * z + c
    ];
  };
  var chain = (qDeg) => {
    let R = IDENT;
    let p = [0, 0, 0];
    const pos = [];
    const axis = [];
    JOINTS.forEach((j, i) => {
      const o2 = apply(R, j.origin);
      p = [p[0] + o2[0], p[1] + o2[1], p[2] + o2[2]];
      pos.push(p);
      axis.push(apply(R, j.axis));
      R = mul(R, axisAngle(j.axis, (qDeg[i] ?? 0) * D2R));
    });
    const o = apply(R, TCP_ORIGIN);
    return { pos, axis, tcp: { p: [p[0] + o[0], p[1] + o[1], p[2] + o[2]], R } };
  };
  var forward = (qDeg) => chain(qDeg).tcp;
  var flangePose = (qDeg) => {
    const { pos, tcp } = chain(qDeg);
    return { p: pos[pos.length - 1], R: tcp.R };
  };
  var rotToEulerZYXDeg = (R) => {
    const sy = Math.max(-1, Math.min(1, -R[6]));
    const ry = Math.asin(sy);
    const rx = Math.atan2(R[7], R[8]);
    const rz = Math.atan2(R[3], R[0]);
    return [rx * R2D, ry * R2D, rz * R2D];
  };
  var eulerZYXDegToRot = (rx, ry, rz) => mul(mul(axisAngle([0, 0, 1], rz * D2R), axisAngle([0, 1, 0], ry * D2R)), axisAngle([1, 0, 0], rx * D2R));
  var carteX = (qDeg) => {
    const { p, R } = forward(qDeg);
    const [rx, ry, rz] = rotToEulerZYXDeg(R);
    return [p[0] * 1e3, p[1] * 1e3, p[2] * 1e3, rx, ry, rz, qDeg[AA_INDEX] ?? 0];
  };
  var jacobian = (qDeg) => {
    const { pos, axis, tcp } = chain(qDeg);
    const J = Array.from({ length: 7 }, () => new Array(7).fill(0));
    for (let i = 0; i < 7; i++) {
      const r = [tcp.p[0] - pos[i][0], tcp.p[1] - pos[i][1], tcp.p[2] - pos[i][2]];
      const lin = cross(axis[i], r);
      for (let k = 0; k < 3; k++) {
        J[k][i] = lin[k];
        J[3 + k][i] = axis[i][k];
      }
    }
    J[6][AA_INDEX] = 1;
    return J;
  };
  var solve = (A, b) => {
    const n = b.length;
    const M = A.map((r, i) => [...r, b[i]]);
    for (let c = 0; c < n; c++) {
      let piv = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
      [M[c], M[piv]] = [M[piv], M[c]];
      const d = M[c][c] || 1e-12;
      for (let r = c + 1; r < n; r++) {
        const f = M[r][c] / d;
        for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
      }
    }
    const x = new Array(n).fill(0);
    for (let r = n - 1; r >= 0; r--) {
      let s = M[r][n];
      for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k];
      x[r] = s / (M[r][r] || 1e-12);
    }
    return x;
  };
  var cartesianToJointVel = (qDeg, tar, frame, userR = IDENT) => {
    const J = jacobian(qDeg);
    let v = [(tar[0] ?? 0) / 1e3, (tar[1] ?? 0) / 1e3, (tar[2] ?? 0) / 1e3];
    let w2 = [(tar[3] ?? 0) * D2R, (tar[4] ?? 0) * D2R, (tar[5] ?? 0) * D2R];
    if (frame === "local") {
      const R = forward(qDeg).R;
      v = apply(R, v);
      w2 = apply(R, w2);
    } else if (frame === "user") {
      v = apply(userR, v);
      w2 = apply(userR, w2);
    }
    const b = [...v, ...w2, (tar[6] ?? 0) * D2R];
    const lambda = 0.02;
    const JT = transpose7(J);
    const A = JT.map(
      (row, i) => row.map((_, j) => J.reduce((s, _r, k) => s + JT[i][k] * J[k][j], 0) + (i === j ? lambda * lambda : 0))
    );
    const rhs = JT.map((row) => row.reduce((s, x, k) => s + x * b[k], 0));
    return solve(A, rhs).map((x) => x * R2D);
  };
  var transpose7 = (J) => J[0].map((_, j) => J.map((r) => r[j]));
  var poseError = (qDeg, target) => {
    const cur = forward(qDeg);
    const dp = [
      (target[0] ?? 0) / 1e3 - cur.p[0],
      (target[1] ?? 0) / 1e3 - cur.p[1],
      (target[2] ?? 0) / 1e3 - cur.p[2]
    ];
    const Rt = eulerZYXDegToRot(target[3] ?? 0, target[4] ?? 0, target[5] ?? 0);
    const Re = mul(Rt, transpose(cur.R));
    const tr = Re[0] + Re[4] + Re[8];
    const ang = Math.acos(Math.max(-1, Math.min(1, (tr - 1) / 2)));
    let axis = [Re[7] - Re[5], Re[2] - Re[6], Re[3] - Re[1]];
    const n = Math.hypot(axis[0], axis[1], axis[2]);
    axis = n < 1e-9 ? [0, 0, 0] : [axis[0] / n, axis[1] / n, axis[2] / n];
    const dAA = (target[6] ?? qDeg[AA_INDEX] ?? 0) - (qDeg[AA_INDEX] ?? 0);
    return {
      vec: [dp[0] * 1e3, dp[1] * 1e3, dp[2] * 1e3, axis[0] * ang * R2D, axis[1] * ang * R2D, axis[2] * ang * R2D, dAA],
      posMm: Math.hypot(dp[0], dp[1], dp[2]) * 1e3,
      rotDeg: ang * R2D
    };
  };
  var userFrameRot = (eulerDeg) => eulerZYXDegToRot(eulerDeg[0] ?? 0, eulerDeg[1] ?? 0, eulerDeg[2] ?? 0);
  var tcpInUserFrame = (qDeg, offsetMm, eulerDeg) => {
    const { p, R } = forward(qDeg);
    const Ru = userFrameRot(eulerDeg);
    const RuT = transpose(Ru);
    const d = [p[0] - (offsetMm[0] ?? 0) / 1e3, p[1] - (offsetMm[1] ?? 0) / 1e3, p[2] - (offsetMm[2] ?? 0) / 1e3];
    const pu = apply(RuT, d);
    const [rx, ry, rz] = rotToEulerZYXDeg(mul(RuT, R));
    return [pu[0] * 1e3, pu[1] * 1e3, pu[2] * 1e3, rx, ry, rz];
  };
  var rotMul = mul;
  var rotT = transpose;

  // demo-artifact/mock/snapshot-data.ts
  var cloneData = (value) => structuredClone(value);

  // demo-artifact/mock/c500920.ts
  var ROBOT_MODEL = "C500920";
  var ALIAS = "SB5-920E";
  var BE_SERVICE = "manipulate";
  var JOINT_NAMES = [
    "base",
    "shoulder",
    "arm_angle",
    "elbow",
    "wrist1",
    "wrist2",
    "wrist3"
  ];
  var robotInfo = {
    info: {
      serialNumber: "SB5920E-DEMO-0001",
      robotModel: ROBOT_MODEL,
      robotName: "Demo Robot",
      programId: null,
      components: [ROBOT_MODEL]
    },
    modelInfo: {
      model: ROBOT_MODEL,
      alias: ALIAS,
      be_service: BE_SERVICE,
      battery_component: null,
      gamepad: null,
      components: [ROBOT_MODEL]
    }
  };
  var systemState = () => ({
    ip: "192.168.0.10",
    all_connected: "CONNECTED",
    cpu_usage: 12.4,
    core_sw_list: [
      {
        sw_name: ROBOT_MODEL,
        model: ROBOT_MODEL,
        alias: ALIAS,
        battery_component: null,
        gamepad: null,
        be_service: BE_SERVICE,
        connected: "CONNECTED"
      }
    ]
  });
  var jointStates = () => {
    const real = {};
    JOINT_NAMES.forEach((n, i) => real[n] = robotState.jointDeg[i]);
    return { real, simulate: { ...real } };
  };
  var batteryState = { batteryPercent: 100, charging: false };
  var speedbar = () => ({ speedbar: robotState.speedBar });
  var playStateIdle = { playState: "idle", stepMode: false, error: null };
  var urdfLinkMap = {
    urdfFileName: "rb5_850e_7axis.urdf",
    components: {
      [ROBOT_MODEL]: {
        type: "array",
        beService: BE_SERVICE,
        tcpJointName: ["tcp_joint"],
        mapper: JOINT_NAMES
      }
    }
  };
  var range = (n) => Array.from({ length: n }, (_, i) => i);
  var v3 = { v: [0, 0, 0] };
  var userFrame = (userfName, off, eul) => ({
    userfName,
    userfOffset: { v: off },
    userfEuler: { v: eul }
  });
  var USER_FRAMES = [
    userFrame("Robot base", [0, 0, 0], [0, 0, 0]),
    userFrame("Work table", [400, 0, 150], [0, 0, 0]),
    userFrame("Fixture A", [350, -200, 200], [0, 0, 45]),
    userFrame("Conveyor", [500, 300, 100], [0, 0, -90]),
    userFrame("Pallet", [300, -350, 50], [0, 0, 30]),
    userFrame("Tilted jig", [450, 0, 300], [0, 30, 0]),
    userFrame("user_frame_6", [0, 0, 0], [0, 0, 0]),
    userFrame("user_frame_7", [0, 0, 0], [0, 0, 0])
  ];
  var controlBoxData = {
    doutSpecialFunc: { b: range(16).map(() => 0) },
    dinSpecialFunc: { b: range(16).map(() => 0) },
    dinFilterCount: { u: range(16).map(() => 0) },
    eoutSpecialFunc: { b: range(16).map(() => 0) },
    einSpecialFunc: { b: range(16).map(() => 0) },
    einFilterCount: { u: range(16).map(() => 0) },
    ...Object.fromEntries(
      range(8).map((i) => [
        `areaConfigs${i}`,
        {
          areaName: `area_${i}`,
          areaType: 0,
          areaOffset: v3,
          areaEuler: v3,
          areaPara: { v: [0, 0, 0, 0, 0, 0] }
        }
      ])
    ),
    ...Object.fromEntries(USER_FRAMES.map((f, i) => [`userFrame${i}`, f])),
    // After Action 16칸(0=Do nothing, 1~16=Run User Script 0~15). nexus constants/action.c.ts, 코어 NO_OF_AFTERACTION=16
    afterActionList: range(16).map(() => 0),
    userScriptList: []
  };
  var robotArm = {
    outCollOnoff: 0,
    outCollReact: 0,
    outCollLimit: 1,
    selfCollMode: 0,
    selfCollDistanceInter: 1,
    selfCollDistanceExter: 1
  };
  var weldConfig = {
    devId: 0,
    devIp0: 127,
    devIp1: 0,
    devIp2: 1,
    devIp3: 1,
    devPort: 6e4,
    outPnoArc: -1,
    outPnoTouch: -1,
    outPnoGas: -1,
    outPnoInch: -1,
    outPnoReinch: -1,
    outPnoCurrent: -1,
    outPnoVoltage: -1,
    inPnoReady: -1,
    inPnoArc: -1,
    inPnoTouch: -1,
    inPnoGas: -1,
    inPnoFeeder: -1,
    inPnoError: -1,
    inPnoCurrent: -1,
    inPnoVoltage: -1,
    hwProcessType: 0,
    hwWireType: 0,
    hwWireSize: 0,
    hwGasType: 0,
    currentMapValue: [],
    currentMapOutput: [],
    voltageMapValue: [],
    voltageMapOutput: []
  };
  var controlBox = controlBoxData;
  var tool = (toolName, comMass, com, tcp, euler) => ({
    toolName,
    comMass,
    comOffset: { v: com },
    tcpOffset: { v: tcp },
    tcpEuler: { v: euler },
    boxType: 0,
    boxParameter: { f: range(9).map(() => 0) }
  });
  var TOOLS = [
    tool("Gripper", 1.2, [0, 0, 45], [0, 0, 120], [0, 0, 0]),
    tool("Welding torch", 2.4, [0, 25, 80], [0, 30, 260], [0, 45, 0]),
    tool("Vacuum pad", 0.8, [0, 0, 30], [0, 0, 95], [0, 0, 0]),
    tool("Screwdriver", 1.5, [5, 0, 70], [0, 0, 185], [0, 0, 90]),
    tool("Camera mount", 0.6, [40, 0, 20], [60, 0, 55], [0, -30, 0]),
    tool("Sander", 3.1, [0, 0, 90], [0, 0, 210], [180, 0, 0]),
    tool("tool_7", 0, [0, 0, 0], [0, 0, 0], [0, 0, 0]),
    tool("tool_8", 0, [0, 0, 0], [0, 0, 0], [0, 0, 0])
  ];
  var toolList = Object.fromEntries(TOOLS.map((t, i) => [`tConfigs${i}`, t]));
  var selectTool = (no) => {
    if (Number.isInteger(no) && no >= 0 && no < TOOLS.length) robotState.toolNo = no;
  };
  var userFrames = { user_frames: USER_FRAMES };
  var selectUserFrame = (no) => {
    if (Number.isInteger(no) && no >= 0 && no < USER_FRAMES.length) robotState.userNo = no;
  };
  var userRot = () => userFrameRot(USER_FRAMES[robotState.userNo].userfEuler.v);
  var INITIAL_JOINT_DEG = [0, 0, 0, 90, 0, 90, 0];
  var bits = (on, n = 16) => range(n).map((i) => on.includes(i) ? 1 : 0);
  var initialIo = () => ({
    cboxDin: bits([0, 2, 6, 9]),
    cboxDout: bits([0, 3]),
    cboxAin: [3.3, 0, 1.5, 0.4],
    cboxAout: [0, 0, 2.5, 0],
    extDin: bits([1, 4, 5]),
    extDout: bits([2]),
    extAin: [0.8, 4.2, 0, 0],
    extAout: [0, 1, 0, 0],
    toolDin: [1, 0],
    toolDout: [0, 1],
    toolAin: [2.1, 0],
    toolVoltage: 24
  });
  var robotState = {
    jointDeg: [...INITIAL_JOINT_DEG],
    speedBar: 0.5,
    toolNo: 0,
    userNo: 0,
    io: initialIo()
  };
  var zeros = (n) => range(n).map(() => 0);
  var curTool = () => TOOLS[robotState.toolNo];
  var stateCore = () => ({
    heartBeat: Math.floor(Date.now() / 1e3) % 1e5,
    timestampUsecMono: Math.floor(performance.now() * 1e3),
    jointQRef: [...robotState.jointDeg],
    jointQEnc: [...robotState.jointDeg],
    jointTEsti: zeros(7),
    jointTMeas: zeros(7),
    jointTemper: range(7).map(() => 35),
    carteXRef: carteX(robotState.jointDeg),
    carteXEnc: carteX(robotState.jointDeg),
    carteSpeedRef: zeros(6),
    carteSpeedEnc: zeros(6),
    userfSelectionNo: robotState.userNo,
    userfXRef: tcpInUserFrame(robotState.jointDeg, USER_FRAMES[robotState.userNo].userfOffset.v, USER_FRAMES[robotState.userNo].userfEuler.v),
    toolSelectionNo: robotState.toolNo,
    toolName: curTool().toolName,
    toolTcpX: curTool().tcpOffset.v[0],
    toolTcpY: curTool().tcpOffset.v[1],
    toolTcpZ: curTool().tcpOffset.v[2],
    toolTcpRx: curTool().tcpEuler.v[0],
    toolTcpRy: curTool().tcpEuler.v[1],
    toolTcpRz: curTool().tcpEuler.v[2],
    toolComM: curTool().comMass,
    toolComX: curTool().comOffset.v[0],
    toolComY: curTool().comOffset.v[1],
    toolComZ: curTool().comOffset.v[2],
    cboxDigitalInput: { u: [...robotState.io.cboxDin] },
    cboxDigitalOutput: { u: [...robotState.io.cboxDout] },
    cboxAnalogInput: { f: [...robotState.io.cboxAin] },
    cboxAnalogOutput: { f: [...robotState.io.cboxAout] },
    exDigitalInput: { u: [...robotState.io.extDin] },
    exDigitalOutput: { u: [...robotState.io.extDout] },
    exAnalogInput: { f: [...robotState.io.extAin] },
    exAnalogOutput: { f: [...robotState.io.extAout] },
    toolDigitalInput: { u: [...robotState.io.toolDin] },
    toolDigitalOutput: { u: [...robotState.io.toolDout] },
    toolAnalogInput: { f: [...robotState.io.toolAin] },
    toolAnalogOutput: { f: zeros(2) },
    toolVoltageOutput: robotState.io.toolVoltage,
    motionMode: 0,
    motionExecutionResult: 0,
    motionSpeedBar: robotState.speedBar,
    motionIsPause: 0,
    statusLan2can: 1,
    statusSwitchEmg: 0,
    statusPowerOut: 1,
    statusServoNum: 7,
    statusIsRefon: 1,
    statusOutColl: 0,
    statusSelfColl: 0,
    statusDtMode: 0,
    statusPyfmState: 0,
    forcetorqueExtX: 0,
    forcetorqueExtY: 0,
    forcetorqueExtZ: 0,
    forcetorqueExtRx: 0,
    forcetorqueExtRy: 0,
    forcetorqueExtRz: 0,
    forcetorqueIntX: 0,
    forcetorqueIntY: 0,
    forcetorqueIntZ: 0,
    forcetorqueIntRx: 0,
    forcetorqueIntRy: 0,
    forcetorqueIntRz: 0,
    ...Object.fromEntries(range(7).map((i) => [`extAxisRef${i}`, 0])),
    ...Object.fromEntries(range(7).map((i) => [`extAxisEnc${i}`, 0])),
    ...Object.fromEntries(range(6).map((i) => [`additionalSystemInfo${i}`, 0])),
    weldInfoTxChunk: 0,
    weldInfoTxCurrent: 0,
    weldInfoTxVoltage: 0,
    weldInfoTxFeedrate: 0,
    weldInfoRxChunk: 0,
    weldInfoRxCurrent: 0,
    weldInfoRxVoltage: 0,
    weldInfoRxFeedrate: 0,
    safetyRawDataA0: 0,
    safetyRawDataA1: 0,
    safetyRawDataB0: 0,
    safetyRawDataB1: 0,
    realtimeFeedback: 0
  });
  var PIN_SEEDS = [
    ["Home", [0, 0, 0, 90, 0, 90, 0]],
    ["Pick ready", [30, 10, 0, 80, 0, 80, 0]],
    ["Pick", [30, 30, 0, 80, 0, 70, 0]],
    ["Place ready", [-40, 10, 0, 80, 0, 80, 0]],
    ["Place", [-40, 30, 0, 80, 0, 70, 0]],
    ["Inspection", [0, -20, 0, 100, 0, 100, 45]]
  ];
  var pinSlot = (q) => ({
    pinJ: { tarValues: [...q], tarFrame: -1, tarUnit: 0 },
    pinL: { tarValues: carteX(q), tarFrame: 0, tarUnit: 0 }
  });
  var emptySlot = () => ({
    pinJ: { tarValues: range(7).map(() => 0), tarFrame: -1, tarUnit: 0 },
    pinL: { tarValues: range(7).map(() => 0), tarFrame: 0, tarUnit: 0 }
  });
  var slots = range(16).map((i) => PIN_SEEDS[i] ? pinSlot(PIN_SEEDS[i][1]) : emptySlot());
  var globalPinPointList = {
    name: range(16).map((i) => PIN_SEEDS[i]?.[0] ?? `pp_${i}`),
    pinJ: slots.map((s) => s.pinJ),
    pinL: slots.map((s) => s.pinL)
  };
  var savePinPoint = (pinNum, pinName) => {
    if (!Number.isInteger(pinNum) || pinNum < 0 || pinNum >= globalPinPointList.name.length) return;
    const slot = pinSlot(robotState.jointDeg);
    globalPinPointList.name[pinNum] = pinName;
    globalPinPointList.pinJ[pinNum] = slot.pinJ;
    globalPinPointList.pinL[pinNum] = slot.pinL;
  };
  var setDout = (where, args) => {
    const arr = where === "cbox" ? robotState.io.cboxDout : where === "ext" ? robotState.io.extDout : robotState.io.toolDout;
    args.forEach((a) => {
      if (a.port_num >= 0 && a.port_num < arr.length && (a.desired_out === 0 || a.desired_out === 1)) arr[a.port_num] = a.desired_out;
    });
  };
  var setAout = (where, args) => {
    const arr = where === "cbox" ? robotState.io.cboxAout : robotState.io.extAout;
    args.forEach((a) => {
      if (a.port_num >= 0 && a.port_num < arr.length && Number.isFinite(a.desired_voltage)) arr[a.port_num] = a.desired_voltage;
    });
  };
  var captureRobot = () => {
    const { programId: _loaded, ...info2 } = robotInfo.info;
    return cloneData({
      robotState,
      info: info2,
      modelInfo: robotInfo.modelInfo,
      batteryState,
      controlBox,
      toolList,
      userFrames,
      globalPinPointList,
      robotArm,
      weldConfig
    });
  };
  var initialRobot = captureRobot();
  var rebaseRobot = () => {
    initialRobot = captureRobot();
  };

  // demo-artifact/mock/logs.ts
  var C = ROBOT_MODEL;
  var TEMPLATES = [
    { level: 0, swName: C, text: (n) => `Robot state updated: all axes servo on. (seq ${n})` },
    { level: 0, swName: "RRS", text: (n) => `Speed bar set to ${[30, 50, 70, 100][n % 4]}%.` },
    { level: 3, swName: "RRS", text: (n) => `User connected from 192.168.0.${20 + n % 9}.` },
    { level: 0, swName: C, text: () => "Move to home pose finished." },
    { level: 4, swName: "RRS", text: (n) => `Heartbeat OK (latency ${2 + n % 5} ms).` },
    { level: 0, swName: C, text: () => "Collision sensitivity loaded from config." },
    { level: 0, swName: C, text: (n) => `Jog started: joint J${n % 7}.` },
    { level: 0, swName: C, text: (n) => `Jog stopped: joint J${n % 7}.` },
    { level: 1, swName: C, text: () => "Tool center point is the default (no tool configured)." },
    { level: 1, swName: "RRS", text: (n) => `CPU usage ${70 + n % 20}% for 10 s.` },
    { level: 4, swName: C, text: (n) => `Joint ${n % 7} position error ${(0.01 * (n % 9)).toFixed(2)} deg.` },
    { level: 5, swName: "RRS", text: () => "Configuration saved." },
    { level: 2, swName: C, text: (n) => `Target is outside the reachable area (request ${n}).` },
    { level: 2, swName: "RRS", text: () => "Request to core timed out." }
  ];
  var FIXED = { 0: 0, 1: 1, 2: 2, 5: 8, 8: 12, 14: 9, 23: 13, 31: 8, 47: 12, 60: 9, 78: 8, 90: 13 };
  var FILLER = [0, 6, 3, 7, 2, 0, 5, 4, 6, 11, 7, 0, 2, 10, 6, 3, 4, 1].map((i) => TEMPLATES[i]);
  var COUNT = 100;
  var SEEDS = (() => {
    let ago = 4;
    let x = 7;
    return Array.from({ length: COUNT }, (_, i) => {
      const t = i in FIXED ? TEMPLATES[FIXED[i]] : FILLER[(i * 5 + 3) % FILLER.length];
      const seed = { agoSec: ago, level: t.level, swName: t.swName, contents: t.text(COUNT - i) };
      x = (x * 1103515245 + 12345) % 2147483648;
      ago += 8 + x % 150;
      return seed;
    });
  })();
  var build = (now) => SEEDS.map((s, i) => {
    const iso = new Date(now - s.agoSec * 1e3).toISOString();
    return { _id: `demo-log-${i}`, swName: s.swName, level: s.level, contents: s.contents, timestamp: iso, createdAt: iso };
  });
  var errorCount24h = () => build(Date.now()).filter((l) => l.level === 2).length;
  var toLevels = (v) => v.flatMap((s) => s.split(",")).filter(Boolean).map(Number);
  var logList = (query) => {
    const levels = toLevels(query.getAll("level"));
    const sw = query.get("swName");
    const text = (query.get("searchText") ?? "").toLowerCase();
    const all = build(Date.now()).filter(
      (l) => (!levels.length || levels.includes(l.level)) && (!sw || sw === "RRS" || l.swName === sw) && (!text || l.contents.toLowerCase().includes(text))
    );
    const limit = Number(query.get("limit")) || all.length;
    const page = Math.max(1, Number(query.get("pageNum")) || 1);
    const items = all.slice((page - 1) * limit, page * limit);
    return { items, totalCount: all.length, hasNext: page * limit < all.length };
  };

  // demo-artifact/mock/workspace.ts
  var T0 = "2026-10-01T09:00:00.000Z";
  var seq = 0;
  var nextId = () => `demo-model-${(++seq).toString(16).padStart(8, "0")}`;
  var shape = (workspace, name, shapeType, scale, pose, isLoaded) => ({
    modelId: nextId(),
    fileId: null,
    shapeType,
    modelType: "base",
    isLoaded,
    scale,
    name,
    workspace: { name: workspace },
    pose,
    attachment: null,
    fileInfo: null,
    createdAt: T0,
    updatedAt: T0
  });
  var P = (x, y, z, rz = 0) => ({ x, y, z, rx: 0, ry: 0, rz });
  var S = (x, y, z) => ({ x, y, z });
  var initial = () => [
    shape("Welding cell", "Table", "box", S(10, 8, 0.5), P(0.7, 0, -0.03), true),
    shape("Welding cell", "Fixture", "box", S(2, 2, 1), P(0.7, 0.1, 0.05, 30), true),
    shape("Welding cell", "Column", "cylinder", S(1, 1, 10), P(-0.4, -0.4, 0.5), true),
    shape("Pallet cell", "Pallet", "box", S(6, 4, 1.5), P(0.5, -0.4, 0.075), false),
    shape("Pallet cell", "Safety post", "cylinder", S(0.8, 0.8, 8), P(0.9, -0.4, 0.4), false),
    shape("Pallet cell", "Ball marker", "sphere", S(1, 1, 1), P(0.5, -0.4, 0.3), false)
  ];
  var preset = "empty";
  var models = [];
  var configureWorkspace = (value) => {
    if (value !== "empty" && value !== "examples") throw new Error("Invalid workspace preset");
    preset = value;
    resetWorkspace();
  };
  var resetWorkspace = () => {
    seq = 0;
    models = preset === "examples" ? initial() : [];
  };
  var listModels = () => ({ models: cloneData(models), totalCount: models.length, result: 0 });
  var createModel = (body) => {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const doc = {
      modelId: nextId(),
      fileId: null,
      shapeType: body.shapeType ?? "box",
      modelType: body.modelType ?? "base",
      isLoaded: true,
      scale: body.scale ?? S(1, 1, 1),
      name: body.name ?? null,
      workspace: body.workspace ?? null,
      pose: body.pose ?? P(0, 0, 0),
      attachment: body.attachment ?? null,
      fileInfo: null,
      createdAt: now,
      updatedAt: now
    };
    models.push(cloneData(doc));
    return { modelId: doc.modelId };
  };
  var updateModel = (id, body) => {
    const m = models.find((x) => x.modelId === id);
    if (!m) return { result: 1, message: "not found" };
    if (body.name !== void 0) m.name = body.name;
    if (body.workspace !== void 0) m.workspace = cloneData(body.workspace);
    if (body.pose) m.pose = cloneData(body.pose);
    if (body.scale) m.scale = cloneData(body.scale);
    m.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    return { result: 0, message: null };
  };
  var deleteModel = (id) => {
    models = models.filter((x) => x.modelId !== id);
    return { modelId: id, message: "deleted" };
  };
  var changeLoaded = (list) => {
    list.forEach((c) => {
      const m = models.find((x) => x.modelId === c.modelId);
      if (m) m.isLoaded = c.isLoaded;
    });
    return { result: 0 };
  };

  // demo-artifact/mock/sim.ts
  var TICK_MS = 20;
  var JOINT_LIMIT_DEG = 360;
  var REACH_M = 0.92;
  var SHOULDER = [0, 0, 0.1692];
  var reachOf = (qDeg) => {
    const [x, y, z] = forward(qDeg).p;
    return Math.hypot(x - SHOULDER[0], y - SHOULDER[1], z - SHOULDER[2]);
  };
  var velDeg = robotState.jointDeg.map(() => 0);
  var cart = null;
  var approach = null;
  var traj = null;
  var trajDone = null;
  var APPROACH_JOINT_DPS = 120;
  var APPROACH_LIN_MMPS = 400;
  var APPROACH_ROT_DPS = 90;
  var timer = null;
  var last = 0;
  var suspendedActive = false;
  var clamp = (v) => Math.max(-JOINT_LIMIT_DEG, Math.min(JOINT_LIMIT_DEG, v));
  var commit = (next) => {
    if (reachOf(next) > REACH_M && reachOf(next) > reachOf(robotState.jointDeg)) return false;
    robotState.jointDeg = next;
    return true;
  };
  var approachNext = (dt) => {
    const a = approach;
    const s = robotState.speedBar;
    if (a.kind === "j") {
      const err = robotState.jointDeg.map((q, i) => (a.target[i] ?? q) - q);
      const far = Math.max(...err.map(Math.abs));
      if (far < 0.05) return null;
      const step = Math.min(far, APPROACH_JOINT_DPS * s * dt);
      return robotState.jointDeg.map((q, i) => clamp(q + err[i] / far * step));
    }
    const e = poseError(robotState.jointDeg, a.target);
    if (e.posMm < 0.3 && e.rotDeg < 0.1 && Math.abs(e.vec[6]) < 0.1) return null;
    const k = 4 * Math.min(1, APPROACH_LIN_MMPS * s / Math.max(e.posMm * 4, 1e-6), APPROACH_ROT_DPS * s / Math.max(e.rotDeg * 4, 1e-6));
    const v = cartesianToJointVel(robotState.jointDeg, e.vec.map((x) => x * k), "global");
    return robotState.jointDeg.map((q, i) => clamp(q + v[i] * dt));
  };
  var stopTimer = () => {
    clearInterval(timer);
    timer = null;
  };
  var ensureTimer = () => {
    suspendedActive = false;
    if (timer) return;
    last = performance.now();
    timer = setInterval(() => {
      const now = performance.now();
      const dtMs = Math.min(100, now - last);
      last = now;
      const dt = dtMs / 1e3;
      if (traj) {
        const { plan, t } = traj;
        const r = plan.at(t, robotState.jointDeg, dt);
        if (!r) return endTraj({ ok: false, error: "IK \uB97C \uD480\uC9C0 \uBABB\uD574 \uC774\uB3D9\uC744 \uBA48\uCDC4\uC2B5\uB2C8\uB2E4." });
        robotState.jointDeg = r.q.map(clamp);
        traj.t = t + dt * robotState.speedBar * (r.scale ?? 1);
        if (r.done) endTraj({ ok: true });
        return;
      }
      if (approach) {
        const next2 = approachNext(dt);
        if (!next2 || !commit(next2)) {
          approach = null;
          stopTimer();
        }
        return;
      }
      if (cart) velDeg = cartesianToJointVel(robotState.jointDeg, cart.tar, cart.frame, userRot());
      if (!cart && velDeg.every((v) => v === 0)) {
        stopTimer();
        return;
      }
      const s = robotState.speedBar;
      const next = robotState.jointDeg.map((q, i) => clamp(q + velDeg[i] * s * dt));
      if (!commit(next)) {
        cart = null;
        velDeg = velDeg.map(() => 0);
      }
    }, TICK_MS);
  };
  var approachStart = (kind, tarValues) => {
    cart = null;
    velDeg = velDeg.map(() => 0);
    approach = { kind, target: tarValues.map(Number) };
    ensureTimer();
  };
  var endTraj = (r) => {
    const done = trajDone;
    traj = null;
    trajDone = null;
    stopTimer();
    done?.(r);
  };
  var runPlan = (plan) => new Promise((resolve) => {
    cart = null;
    approach = null;
    velDeg = velDeg.map(() => 0);
    trajDone = resolve;
    traj = { plan, t: 0 };
    ensureTimer();
  });
  var cancelMove = () => {
    trajDone = null;
    traj = null;
  };
  var approachStop = () => {
    approach = null;
  };
  var jogJoint = (tarValues) => {
    approach = null;
    cart = null;
    velDeg = robotState.jointDeg.map((_, i) => tarValues[i] ?? 0);
    ensureTimer();
  };
  var FRAMES = ["global", "local", "user"];
  var jogCartesian = (tarValues, tarFrame) => {
    approach = null;
    cart = { tar: [...tarValues], frame: FRAMES[tarFrame] ?? "global" };
    ensureTimer();
  };
  var jogStop = () => {
    suspendedActive = false;
    cart = null;
    approach = null;
    velDeg = velDeg.map(() => 0);
  };
  var onManipulateEmit = (suffix, payload) => {
    switch (suffix) {
      case "call_smoothjog_j":
        jogJoint(payload?.target?.tar_values ?? []);
        return true;
      case "call_smoothjog_l":
        jogCartesian(payload?.target?.tar_values ?? [], payload?.target?.tar_frame ?? 0);
        return true;
      case "call_smoothjog_stop":
        jogStop();
        return true;
      default:
        return false;
    }
  };

  // demo-artifact/mock/trajectory.ts
  var NJ = 7;
  var R2D2 = 180 / Math.PI;
  var D2R2 = Math.PI / 180;
  var MOTOR_LIMIT_VEL = 181 * 0.99;
  var MOTOR_HWMAX_ACC = 450;
  var ARM = { posVel: 1e3, posAcc: 2e4, rotVel: 360, rotAcc: 2e3 };
  var clamp2 = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  var norm3 = (v) => Math.hypot(v[0], v[1], v[2]);
  var trapezoid = (maxV, maxA, dist) => {
    const V = Math.max(maxV, 1e-9), A = Math.max(maxA, 1e-9);
    const tt = V / A;
    const tSS = tt * V;
    if (dist > tSS) return { t1: tt, t2: (dist - tSS) / V, t3: tt };
    const vp = Math.sqrt(2 * A * dist / 2);
    return { t1: vp / A, t2: 0, t3: vp / A };
  };
  var trace = (R) => R[0] + R[4] + R[8];
  var rotToRcv = (R) => {
    const ang = Math.acos(clamp2((trace(R) - 1) / 2, -1, 1));
    if (ang < 1e-9) return [0, 0, 0];
    let ax;
    if (Math.PI - ang < 1e-6) {
      const x = Math.sqrt(Math.max(0, (R[0] + 1) / 2)), y = Math.sqrt(Math.max(0, (R[4] + 1) / 2)), z = Math.sqrt(Math.max(0, (R[8] + 1) / 2));
      ax = [x, R[1] >= 0 ? y : -y, R[2] >= 0 ? z : -z];
    } else {
      const s = 2 * Math.sin(ang);
      ax = [(R[7] - R[5]) / s, (R[2] - R[6]) / s, (R[3] - R[1]) / s];
    }
    return [ax[0] * ang, ax[1] * ang, ax[2] * ang];
  };
  var rcvToRot = (v) => {
    const ang = Math.hypot(v[0], v[1], v[2]);
    if (ang < 1e-12) return [1, 0, 0, 0, 1, 0, 0, 0, 1];
    const x = v[0] / ang, y = v[1] / ang, z = v[2] / ang, c = Math.cos(ang), s = Math.sin(ang), t = 1 - c;
    return [t * x * x + c, t * x * y - s * z, t * x * z + s * y, t * x * y + s * z, t * y * y + c, t * y * z - s * x, t * x * z - s * y, t * y * z + s * x, t * z * z + c];
  };
  var jointSpeed = (mode, velPara, accPara) => {
    const v = mode === 0 ? MOTOR_LIMIT_VEL * Math.min(velPara, 1) : velPara;
    const a = mode === 0 ? MOTOR_HWMAX_ACC * Math.min(accPara, 1) : accPara;
    return { vel: new Array(NJ).fill(Math.min(v, MOTOR_LIMIT_VEL)), acc: new Array(NJ).fill(Math.min(a, MOTOR_HWMAX_ACC)) };
  };
  var cartSpeed = (mode, velPara, accPara) => {
    if (mode === 0) {
      const v = Math.min(velPara, 1), a = Math.min(accPara, 1);
      return { pv: v * ARM.posVel, pa: a * ARM.posAcc, ov: v * ARM.rotVel, oa: a * ARM.rotAcc };
    }
    const va = Math.min(velPara / ARM.posVel, 1), aa = Math.min(accPara / ARM.posAcc, 1);
    return { pv: velPara, pa: accPara, ov: va * ARM.rotVel, oa: aa * ARM.rotAcc };
  };
  var solveIk = (q0, target, maxIter = 8, tolMm = 0.02, tolDeg = 0.02) => {
    let q = q0.slice();
    for (let i = 0; i < maxIter; i++) {
      const e2 = poseError(q, target);
      if (e2.posMm < tolMm && e2.rotDeg < tolDeg && Math.abs(e2.vec[6]) < tolDeg) return q;
      const dq = cartesianToJointVel(q, e2.vec, "global");
      q = q.map((v, k) => clamp2(v + dq[k], -360, 360));
    }
    const e = poseError(q, target);
    return e.posMm < 2 && e.rotDeg < 2 ? q : null;
  };
  function planJ(qSta, qTar, vel, acc) {
    let t1 = 1e-6, t2 = 1e-6, t3 = 1e-6;
    for (let k = 0; k < NJ; k++) {
      const t = trapezoid(vel[k], acc[k], Math.abs(qTar[k] - qSta[k]));
      t1 = Math.max(t1, t.t1);
      t2 = Math.max(t2, t.t2);
      t3 = Math.max(t3, t.t3);
    }
    const total = t1 + t2 + t3;
    if (total < 2e-3) return null;
    const v = qTar.map((x, k) => (x - qSta[k]) / (t1 + t2)), a = v.map((x) => x / t1);
    return {
      duration: total,
      at: (t) => {
        let q;
        if (t < t1) q = qSta.map((s, k) => s + 0.5 * a[k] * t * t);
        else if (t < t1 + t2) q = qSta.map((s, k) => s + 0.5 * a[k] * t1 * t1 + v[k] * (t - t1));
        else if (t < total) q = qTar.map((x, k) => x - 0.5 * a[k] * (total - t) * (total - t));
        else q = qTar.slice();
        return { q, done: t >= total };
      }
    };
  }
  var normalizeBlend = (bOpt, bPar) => bOpt === 0 ? { bOpt, bPar: clamp2(bPar, 0, 1) } : bOpt === 1 ? { bOpt, bPar: Math.max(bPar, 0) } : { bOpt: 0, bPar: 1 };
  function planJB(qSta, points, limitVel = new Array(NJ).fill(MOTOR_LIMIT_VEL)) {
    if (points.length < 1) return null;
    if (points.length === 1) return planJ(qSta, points[0].tar, points[0].vel, points[0].acc);
    const zero = new Array(NJ).fill(0);
    const lines = [
      { tar: qSta.slice(), vel: zero, acc: zero, bOpt: 0, bPar: 0, tseg: [0, 0, 0], pvel: zero, pacc: zero },
      ...points.map((p) => ({ ...p, tseg: [0, 0, 0], pvel: zero, pacc: zero }))
    ];
    for (let i = 1; i < lines.length; i++) {
      const prev = lines[i - 1], cur = lines[i];
      let t1 = 1e-6, t2 = 1e-6, t3 = 1e-6;
      for (let k = 0; k < NJ; k++) {
        const t = trapezoid(cur.vel[k], cur.acc[k], Math.abs(cur.tar[k] - prev.tar[k]));
        t1 = Math.max(t1, t.t1);
        t2 = Math.max(t2, t.t2);
        t3 = Math.max(t3, t.t3);
      }
      cur.tseg = [t1, t2, t3];
      cur.pvel = cur.tar.map((x, k) => (x - prev.tar[k]) / (t1 + t2));
      cur.pacc = cur.pvel.map((v) => v / t1);
    }
    const rt = Array.from({ length: NJ }, () => []);
    const JLast = lines[0].tar.slice(), TLast = new Array(NJ).fill(0);
    for (let i = 1; i < lines.length; i++) {
      const c = lines[i], n = i !== lines.length - 1 ? lines[i + 1] : lines[i];
      const [c1, c2, c3] = c.tseg, [n1, n2] = n.tseg;
      let overlapMax = false;
      for (let k = 0; k < NJ; k++) if (Math.abs(c.pvel[k] + n.pvel[k]) > Math.abs(limitVel[k])) overlapMax = true;
      let cMax = c2 / 2 + c3, nMax = n1 + n2 / 2;
      if (overlapMax) {
        cMax = c3;
        nMax = n1;
      }
      const blendTime = Math.min(cMax, nMax) * (c.bOpt === 0 ? 0.95 * c.bPar : 0.95 * 0.5);
      for (let k = 0; k < NJ; k++) {
        const cA = c.pacc[k], cV = c.pvel[k], nA = n.pacc[k], nV = n.pvel[k];
        const pushBlend = (base2) => {
          const st = c2 / 2 + c3 - blendTime;
          const timing = [c2 / 2, c2 / 2 + c3, st, st + n1, st + n1 + n2 / 2].sort((x, y) => x - y);
          for (let ss = 0; ss < timing.length; ss++) {
            const ts = ss !== 0 ? timing[ss - 1] : 0, te = timing[ss], tm = (ts + te) / 2;
            let A1 = 0, B1 = 0, A2 = 0, B2 = 0;
            if (tm < c2 / 2) {
              A1 = 0;
              B1 = cV;
            } else if (tm < c2 / 2 + c3) {
              A1 = -cA;
              B1 = cV - A1 * (c2 / 2);
            }
            if (tm < st) {
              A2 = 0;
              B2 = 0;
            } else if (tm < st + n1) {
              A2 = nA;
              B2 = -A2 * st;
            } else {
              A2 = 0;
              B2 = nV - A2 * (st + n1);
            }
            const AT = A1 + A2, BT = B1 + B2;
            const vvv = AT * ts + BT, ppp = JLast[k];
            rt[k].push({ tSta: ts + base2, tEnd: te + base2, A: AT, V: vvv, P: ppp, seg: ss < 2 ? i : i + 1 });
            JLast[k] = 0.5 * AT * (te - ts) * (te - ts) + vvv * (te - ts) + ppp;
          }
          return timing[timing.length - 1];
        };
        if (i === 1) {
          rt[k].push({ tSta: 0, tEnd: c1, A: cA, V: 0, P: JLast[k], seg: i });
          JLast[k] += 0.5 * cA * c1 * c1;
          rt[k].push({ tSta: c1, tEnd: c1 + c2 / 2, A: 0, V: cV, P: JLast[k], seg: i });
          JLast[k] += cV * c2 / 2;
          const toff = c1 + c2 / 2;
          TLast[k] = pushBlend(toff) + toff;
        } else if (i === lines.length - 1) {
          rt[k].push({ tSta: TLast[k], tEnd: TLast[k] + c2 / 2, A: 0, V: cV, P: JLast[k], seg: i });
          JLast[k] += cV * c2 / 2;
          rt[k].push({ tSta: TLast[k] + c2 / 2, tEnd: TLast[k] + c2 / 2 + c3, A: -cA, V: cV, P: JLast[k], seg: i });
          JLast[k] += cV * c3 + 0.5 * -cA * c3 * c3;
          TLast[k] += c2 / 2 + c3;
        } else {
          TLast[k] += pushBlend(TLast[k]);
        }
      }
    }
    const last2 = lines[lines.length - 1].tar;
    for (let k = 0; k < NJ; k++) {
      if (Math.abs(JLast[k] - last2[k]) > 0.03) throw new Error("\uB3D9\uC791 JB \uACBD\uB85C\uB97C \uB9CC\uB4E4\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4(\uB05D \uC790\uC138 \uBD88\uC77C\uCE58).");
      if (Math.abs(TLast[0] - TLast[k]) > 1e-3) throw new Error("\uB3D9\uC791 JB \uACBD\uB85C\uB97C \uB9CC\uB4E4\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4(\uB05D \uC2DC\uAC01 \uBD88\uC77C\uCE58).");
    }
    const total = TLast.slice(0, 6).reduce((s, x) => s + x, 0) / 6;
    if (total < 2e-3) return null;
    const segs0 = rt[0];
    return {
      duration: total,
      at: (t) => {
        const idx = segs0.findIndex((s) => t <= s.tEnd);
        if (idx < 0) return { q: JLast.slice(), done: true };
        const st = t - segs0[idx].tSta;
        return { q: rt.map((r) => 0.5 * r[idx].A * st * st + r[idx].V * st + r[idx].P), done: false };
      }
    };
  }
  var cartProfile = (cSta, cTar, pv, pa, ov, oa) => {
    const p0 = cSta.slice(0, 3), p1 = cTar.slice(0, 3);
    const dp = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
    const R0 = eulerZYXDegToRot(cSta[3], cSta[4], cSta[5]), R1 = eulerZYXDegToRot(cTar[3], cTar[4], cTar[5]);
    const rcv = rotToRcv(rotMul(rotT(R0), R1));
    let rotDist = Math.hypot(rcv[0], rcv[1], rcv[2]);
    if (rotDist < 1e-6) rotDist = 1e-6;
    const redun0 = cSta[6] ?? 0, redun1 = cTar[6] ?? 0;
    let t1 = 1e-6, t2 = 1e-6, t3 = 1e-6;
    for (const t of [trapezoid(ov, oa, Math.abs(redun1 - redun0)), trapezoid(pv, pa, norm3(dp)), trapezoid(ov, oa, rotDist * R2D2)]) {
      t1 = Math.max(t1, t.t1);
      t2 = Math.max(t2, t.t2);
      t3 = Math.max(t3, t.t3);
    }
    return { t1, t2, t3, p0, dp, R0, rcv, rotDist, redun0, redun1 };
  };
  var ratioAt = (st, t1, t2, t3) => {
    const total = t1 + t2 + t3, v = 1 / (t1 + t2);
    const a = v / t1;
    if (st <= 0) return 0;
    if (st < t1) return 0.5 * a * st * st;
    if (st < t1 + t2) return 0.5 * a * t1 * t1 + v * (st - t1);
    if (st < total) return 1 - 0.5 * a * (total - st) * (total - st);
    return 1;
  };
  var poseAt = (pf, r) => {
    const p = pf.p0.map((x, i) => x + pf.dp[i] * r);
    const R = rotMul(pf.R0, rcvToRot(pf.rcv.map((x) => x * r)));
    const e = rotToEulerZYXDeg(R);
    return [p[0], p[1], p[2], e[0], e[1], e[2], pf.redun0 + (pf.redun1 - pf.redun0) * r];
  };
  var limitScale = (q, next, dt) => {
    const step = Math.max(...next.map((v, k) => Math.abs(v - q[k])));
    const lim = MOTOR_LIMIT_VEL * Math.max(dt, 1e-6);
    return step > lim ? lim / step : 1;
  };
  function planL(qSta, cTar, sp2) {
    const cSta = carteX(qSta);
    const pf = cartProfile(cSta, cTar, sp2.pv, sp2.pa, sp2.ov, sp2.oa);
    const total = pf.t1 + pf.t2 + pf.t3;
    if (total < 2e-3) return null;
    return {
      duration: total,
      at: (t, q, dt) => {
        const target = poseAt(pf, ratioAt(t, pf.t1, pf.t2, pf.t3));
        const next = solveIk(q, target);
        if (!next) return null;
        return { q: next, done: t >= total, scale: limitScale(q, next, dt) };
      }
    };
  }
  var xOf = (q) => carteX(q);
  function planXB(qSta, points, mode) {
    if (!points.length) return null;
    const zero = new Array(NJ).fill(0);
    const segs = [{ type: 0, jTar: qSta.slice(), jVel: zero, jAcc: zero, xTar: xOf(qSta), xv: [0, 0], xa: [0, 0], bOpt: 0, bPar: 0, dist: 0, time: [0, 0, 0], mix: 0, tSta: 0, tEnd: 0, accum: zero }];
    let lastJ = qSta.slice();
    for (const p of points) {
      const b = normalizeBlend(p.bOpt, p.bPar);
      if (p.type === 0) {
        lastJ = p.tar.slice();
        segs.push({ type: 0, jTar: p.tar.slice(), jVel: p.vel, jAcc: p.acc, xTar: xOf(p.tar), xv: [0, 0], xa: [0, 0], ...b, dist: 0, time: [0, 0, 0], mix: 0, tSta: 0, tEnd: 0, accum: zero });
      } else {
        const q = solveIk(lastJ, p.tar, 100, 0.02, 0.02);
        if (!q) throw new Error("\uB3D9\uC791 XB \uACBD\uB85C\uC758 IK \uB97C \uD480\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
        lastJ = q;
        segs.push({ type: 1, jTar: q, jVel: zero, jAcc: zero, xTar: p.tar.slice(), xv: [p.sp.pv, p.sp.ov], xa: [p.sp.pa, p.sp.oa], ...b, dist: 0, time: [0, 0, 0], mix: 0, tSta: 0, tEnd: 0, accum: zero });
      }
    }
    for (let i = 1; i < segs.length; i++) {
      const prev = segs[i - 1], s = segs[i];
      let t1 = 1e-6, t2 = 1e-6, t3 = 1e-6;
      const acc = (t) => {
        t1 = Math.max(t1, t.t1);
        t2 = Math.max(t2, t.t2);
        t3 = Math.max(t3, t.t3);
      };
      const dpos = norm3(s.xTar.slice(0, 3).map((x, k) => x - prev.xTar[k]));
      if (s.type === 0) {
        for (let k = 0; k < NJ; k++) acc(trapezoid(s.jVel[k], s.jAcc[k], Math.abs(s.jTar[k] - prev.jTar[k])));
      } else {
        acc(trapezoid(s.xv[0], s.xa[0], dpos));
        const rcv = rotToRcv(rotMul(rotT(eulerZYXDegToRot(prev.xTar[3], prev.xTar[4], prev.xTar[5])), eulerZYXDegToRot(s.xTar[3], s.xTar[4], s.xTar[5])));
        acc(trapezoid(s.xv[1], s.xa[1], Math.hypot(rcv[0], rcv[1], rcv[2]) * R2D2));
        acc(trapezoid(s.xv[1], s.xa[1], Math.abs((s.xTar[6] ?? 0) - (prev.xTar[6] ?? 0))));
      }
      s.dist = dpos;
      s.time = [t1, t2, t3];
    }
    for (let i = 1; i < segs.length - 1; i++) {
      const sync = Math.max(segs[i].time[2], segs[i + 1].time[0]);
      segs[i].time[2] = segs[i + 1].time[0] = sync;
    }
    for (let i = 1; i < segs.length - 1; i++) {
      const pre = segs[i], nex = segs[i + 1];
      const preHt = pre.time[1] * 0.5 + pre.time[2], nexHt = nex.time[0] + nex.time[1] * 0.5;
      let sync = Math.min(preHt, nexHt);
      if (pre.bOpt === 0) {
        pre.mix = sync * 0.99 * pre.bPar;
      } else {
        const preNet = pre.time[0] * 0.5 + pre.time[1] + pre.time[2] * 0.5, nexNet = nex.time[0] * 0.5 + nex.time[1] + nex.time[2] * 0.5;
        if (preNet < 1e-4 || nexNet < 1e-4) sync = 0;
        else {
          const bD = Math.abs(pre.bPar), preV = pre.dist / preNet, nexV = nex.dist / nexNet;
          const pd1 = preV * pre.time[2] * 0.5, pd2 = pd1 + preV * pre.time[1] * 0.5;
          const nd1 = nexV * nex.time[0] * 0.5, nd2 = nd1 + nexV * nex.time[1] * 0.5;
          let preEq = preHt;
          if (preV > 1e-3) preEq = bD < pd1 ? Math.sqrt(2 * bD * pre.time[2] / preV) : bD < pd2 ? (bD - pd1) / preV + pre.time[2] : preHt;
          let nexEq = nexHt;
          if (nexV > 1e-3) nexEq = bD < nd1 ? Math.sqrt(2 * bD * nex.time[0] / nexV) : bD < nd2 ? (bD - nd1) / nexV + nex.time[0] : nexHt;
          sync = Math.min(Math.min(preEq, preHt), Math.min(nexEq, nexHt));
        }
        pre.mix = sync;
      }
      if (i === segs.length - 2) nex.mix = 0;
    }
    let total = 0, tsum = 0;
    for (let i = 1; i < segs.length; i++) {
      const s = segs[i], len = s.time[0] + s.time[1] + s.time[2];
      total += len - s.mix;
      s.tSta = tsum;
      s.tEnd = tsum + len;
      tsum = s.tEnd - s.mix;
    }
    if (total < 2e-3) return null;
    const tLast = segs[segs.length - 1].tEnd;
    const smooth = (x) => {
      const c = clamp2(x, 0, 1);
      return c * c * (3 - 2 * c);
    };
    const segQ = (old, s, st) => {
      const [t1, t2, t3] = s.time, len = t1 + t2 + t3;
      if (s.type === 0) return old.jTar.map((o, k) => o + (s.jTar[k] - o) * profileRatio(st, t1, t2, t3, len));
      const pf = cartProfile(old.xTar, s.xTar, s.xv[0], s.xa[0], s.xv[1], s.xa[1]);
      const target = poseAt(pf, profileRatio(st, t1, t2, t3, len));
      const start = old.jTar.map((o, k) => o + s.accum[k]);
      const q = solveIk(start, target);
      if (!q) return null;
      s.accum = q.map((v, k) => v - old.jTar[k]);
      return q;
    };
    const ctlLimit = MOTOR_LIMIT_VEL;
    return {
      duration: total,
      at: (t, q, dt) => {
        let ref;
        if (t > tLast) {
          ref = segs[segs.length - 1].jTar.slice();
        } else if (mode === 1) {
          ref = new Array(NJ).fill(0);
          let related = 0;
          for (let i = 1; i < segs.length; i++) {
            const s = segs[i], old = segs[i - 1];
            if (t < s.tSta || t > s.tEnd) continue;
            related++;
            const st = t - s.tSta, len = s.time[0] + s.time[1] + s.time[2];
            let alpha = 1;
            if (related === 1) {
              const mixing = len - s.mix;
              if (st > mixing) alpha = 1 - (st - mixing) / Math.max(s.mix, 1e-9);
            } else if (related === 2 && st < old.mix) alpha = st / Math.max(old.mix, 1e-9);
            alpha = smooth(alpha);
            const sq = segQ(old, s, st);
            if (!sq) return null;
            for (let k = 0; k < NJ; k++) ref[k] += sq[k] * alpha;
          }
          if (related === 0) ref = q.slice();
        } else {
          ref = qSta.slice();
          for (let i = 1; i < segs.length; i++) {
            const s = segs[i], old = segs[i - 1];
            let disp;
            if (t >= s.tEnd) {
              const sq = s.type === 0 ? s.jTar : segQ(old, s, s.tEnd - s.tSta) ?? s.jTar;
              disp = sq.map((v, k) => v - old.jTar[k]);
            } else if (t >= s.tSta) {
              const sq = segQ(old, s, t - s.tSta);
              if (!sq) return null;
              disp = sq.map((v, k) => v - old.jTar[k]);
            } else continue;
            for (let k = 0; k < NJ; k++) ref[k] += disp[k];
          }
        }
        let conv = true;
        const lim = ctlLimit * Math.max(dt, 1e-6);
        const out = q.map((v, k) => {
          const d = ref[k] - v;
          if (Math.abs(d) > 5e-4) conv = false;
          return v + clamp2(d, -lim, lim);
        });
        return { q: out, done: t > tLast && conv };
      }
    };
  }
  var profileRatio = (st, t1, t2, t3, len) => {
    if (st <= 0) return 0;
    if (st >= len) return 1;
    const d = 0.5 * t1 + t2 + 0.5 * t3;
    const v = 1 / d, a1 = t1 > 1e-7 ? v / t1 : 0, a3 = t3 > 1e-7 ? -v / t3 : 0;
    if (st <= t1) return 0.5 * a1 * st * st;
    if (st <= t1 + t2) return 0.5 * a1 * t1 * t1 + v * (st - t1);
    const s3 = st - t1 - t2;
    return 0.5 * a1 * t1 * t1 + v * t2 + v * s3 + 0.5 * a3 * s3 * s3;
  };

  // demo-artifact/mock/run.ts
  var ROBOT = "C500920";
  var STEP_MS = 450;
  var publish = () => {
  };
  var setRunPublisher = (fn) => {
    publish = fn;
  };
  var Stopped = class extends Error {
  };
  var BreakSignal = class extends Error {
  };
  var RunError = class extends Error {
  };
  var run = null;
  var seq2 = 0;
  var stepStates = {};
  var pendingSelect = null;
  var pendingInput = null;
  var pyToJs = (src) => src.replace(/\bTrue\b/g, "true").replace(/\bFalse\b/g, "false").replace(/\bNone\b/g, "null").replace(/\band\b/g, "&&").replace(/\bor\b/g, "||").replace(/\bnot\b/g, "!").replace(/\/\//g, "/");
  var evalExpr = (src, vars) => {
    const names = Object.keys(vars);
    try {
      return new Function(...names, `"use strict"; return (${pyToJs(src)});`)(...names.map((n) => vars[n]));
    } catch (e) {
      throw new RunError(`\uC2DD\uC744 \uACC4\uC0B0\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4: ${src} (${e.message})`);
    }
  };
  var execStatement = (line, vars) => {
    const m = /^\s*([A-Za-z_]\w*)\s*(\+=|-=|\*=|\/=|%=|=)(?!=)\s*(.+)$/.exec(line);
    if (!m) {
      evalExpr(line, vars);
      return;
    }
    const [, name, op, rhs] = m;
    const value = evalExpr(rhs, vars);
    if (op === "=") vars[name] = value;
    else {
      if (!(name in vars)) throw new RunError(`\uC815\uC758\uB418\uC9C0 \uC54A\uC740 \uBCC0\uC218: ${name}`);
      const cur = vars[name];
      vars[name] = op === "+=" ? cur + value : op === "-=" ? cur - value : op === "*=" ? cur * value : op === "/=" ? cur / value : cur % value;
    }
  };
  var truthy = (v) => Array.isArray(v) ? v.length > 0 : !!v;
  var pyText = (v) => {
    if (typeof v === "string") return `'${v}'`;
    if (v === true) return "True";
    if (v === false) return "False";
    if (v === null || v === void 0) return "None";
    if (Array.isArray(v)) return `[${v.map(pyText).join(", ")}]`;
    if (typeof v === "object") return `{${Object.entries(v).map(([k, x]) => `'${k}': ${pyText(x)}`).join(", ")}}`;
    return String(v);
  };
  var jsonText = (v) => {
    if (typeof v === "number") return jsonNumber(v);
    if (Array.isArray(v)) return `[${v.map(jsonText).join(", ")}]`;
    if (v && typeof v === "object") return `{${Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${jsonText(x)}`).join(", ")}}`;
    return v === void 0 ? "null" : JSON.stringify(v);
  };
  var userText = (v) => typeof v === "string" ? v : pyText(v);
  var jsonNumber = (n) => Number.isInteger(n) ? `${n}.0` : String(n);
  var debugValue = (v) => {
    if (typeof v === "number") return jsonNumber(Math.round(v * 1e3) / 1e3);
    if (Array.isArray(v) && v.length && v.every((x) => typeof x === "number")) return `[${v.map((x) => jsonNumber(Math.round(x * 1e3) / 1e3)).join(", ")}]`;
    return jsonText(v);
  };
  var initValue = (type, raw, vars) => {
    if (typeof raw === "number" || typeof raw === "boolean") return raw;
    const text = String(raw ?? "");
    if (type === "STRING") {
      const m = /^"(.*)"$|^'(.*)'$/.exec(text);
      return m ? m[1] ?? m[2] : text;
    }
    if (type === "NUMERIC") return Number(text);
    try {
      return evalExpr(text, vars);
    } catch {
      return text;
    }
  };
  var playState = () => run?.state ?? "idle";
  var playStateValue = () => ({ playState: playState(), stepMode: false, error: run?.error ?? null });
  var broadcastPlay = () => publish("common/program/play_state", playStateValue());
  var broadcastVars = () => run && publish(`common/program/${ROBOT}/change-variables`, variablesValue());
  var variablesValue = () => ({
    variables: Object.fromEntries(Object.entries(run?.variables ?? lastVariables).map(([k, v]) => [k, { value: v, type: "local" }]))
  });
  var lastVariables = {};
  var setState = (state) => {
    if (run) {
      run.state = state;
      broadcastPlay();
    }
  };
  var stepState = (step, state) => {
    const payload = { stepId: step.stepId, state };
    stepStates[step.taskId] = payload;
    publish(`common/program/task/${step.taskId}/update_state`, payload);
  };
  var stepStateValue = (taskId) => stepStates[taskId];
  var currentStates = () => {
    if (!run) return { states: {} };
    const state = run.state === "pause" ? "paused" : run.state === "stop" ? "stopped" : "running";
    return {
      states: {
        [run.taskId]: {
          state,
          simpleState: run.state,
          current_step_id: run.currentStepId ?? "",
          robot_model: ROBOT,
          category: "manipulate",
          generation: run.id,
          step_mode: false,
          is_ui_execution: true,
          current_step_name: "",
          total_repeat: run.totalRepeat,
          current_repeat: run.currentRepeat,
          condition_map: {},
          is_alive: true,
          step: null
        }
      }
    };
  };
  var executorState = () => {
    if (!run) return { byTaskId: {}, byRobotModel: {} };
    const s = {
      isUiExecution: true,
      category: "manipulate",
      robotModel: ROBOT,
      taskId: run.taskId,
      stepMode: false,
      variables: variablesValue().variables,
      state: currentStates().states[run.taskId].state,
      totalRepeat: run.totalRepeat,
      currentRepeat: run.currentRepeat,
      isMainTask: true
    };
    return { byTaskId: { [run.taskId]: s }, byRobotModel: { [ROBOT]: { [run.taskId]: s } } };
  };
  var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  var checkStop = (r) => {
    if (r.stopped) throw new Stopped();
  };
  var waitDialog = async (r, title, content) => {
    setState("pause");
    publish("common/muscat/program/dialog", { task_id: r.taskId, robot_model: ROBOT, title, content });
    await new Promise((resolve) => {
      r.paused = { resolve };
    });
    r.paused = null;
    checkStop(r);
    setState("play");
  };
  var waitPlan = async (r, plan) => {
    if (!plan) return;
    const res = await Promise.race([runPlan(plan), new Promise((resolve) => {
      r.cancelMove = () => resolve({ ok: true });
    })]);
    r.cancelMove = null;
    checkStop(r);
    if (!res.ok) throw new RunError(res.error ?? "\uC774\uB3D9\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
  };
  var abortMove = (r) => {
    r.cancelMove?.();
    cancelMove();
  };
  var runSteps = async (r, steps) => {
    const matched = /* @__PURE__ */ new Map();
    for (const step of steps) {
      checkStop(r);
      if (step.disabled || step.method === "Empty") continue;
      r.currentStepId = step.stepId;
      stepState(step, "running");
      await sleep(STEP_MS);
      checkStop(r);
      await runStep(r, step, matched);
      stepState(step, "completed");
    }
  };
  var demoOnly = (what) => new RunError(`\uB370\uBAA8\uB294 \uC9C1\uC811 \uC785\uB825\uD55C ${what} \uD3EC\uC778\uD2B8\uB9CC \uC2E4\uD589\uD569\uB2C8\uB2E4.`);
  var pointTarget = (p, kind) => {
    const a = p.args ?? {};
    const tar = (a.tar_values ?? []).map(Number);
    const frame = kind === "joint" ? -1 : 0;
    if (a.input_method !== 0 || a.tar_frame !== frame || (a.tar_unit ?? 0) !== 0 || tar.length < 7 || !tar.slice(0, 7).every(Number.isFinite))
      throw demoOnly(kind === "joint" ? "\uC870\uC778\uD2B8 \uACF5\uAC04(deg)" : "\uC804\uC5ED \uC88C\uD45C\uACC4(mm, deg)");
    return tar.slice(0, 7);
  };
  var pointSpeed = (p) => {
    const a = p.args ?? {};
    return { mode: Number(a.spd_mode ?? 0), vel: Number(a.spd_vel_para ?? 0), acc: Number(a.spd_acc_para ?? 0) };
  };
  var pointBlend = (p) => {
    const a = p.args ?? {};
    const type = Number(a.pnt_type ?? 0), para = Number(a.pnt_para ?? 0);
    return normalizeBlend(type, type === 0 ? para / 100 : para);
  };
  var runMove = async (r, step) => {
    const points = (step.children ?? []).filter((c) => c.method === "Point" && !c.disabled);
    const mark = (state) => points.forEach((p) => stepState(p, state));
    const start = () => [...robotState.jointDeg];
    if (step.method === "MoveJ" || step.method === "MoveL") {
      for (const p of points) {
        checkStop(r);
        r.currentStepId = p.stepId;
        stepState(p, "running");
        const sp2 = pointSpeed(p);
        if (step.method === "MoveJ") {
          const j = jointSpeed(sp2.mode, sp2.vel, sp2.acc);
          await waitPlan(r, planJ(start(), pointTarget(p, "joint"), j.vel, j.acc));
        } else await waitPlan(r, planL(start(), pointTarget(p, "cart"), cartSpeed(sp2.mode, sp2.vel, sp2.acc)));
        stepState(p, "completed");
      }
      return;
    }
    if (!points.length) return;
    mark("running");
    if (step.method === "MoveJB") {
      const pts = points.map((p) => {
        const sp2 = pointSpeed(p);
        return { tar: pointTarget(p, "joint"), ...jointSpeed(sp2.mode, sp2.vel, sp2.acc), ...pointBlend(p) };
      });
      await waitPlan(r, planJB(start(), pts));
    } else {
      const pts = points.map((p) => {
        const sp2 = pointSpeed(p), isL = Number(p.args?.method ?? 0) === 1;
        return isL ? { type: 1, tar: pointTarget(p, "cart"), sp: cartSpeed(sp2.mode, sp2.vel, sp2.acc), ...pointBlend(p) } : { type: 0, tar: pointTarget(p, "joint"), ...jointSpeed(sp2.mode, sp2.vel, sp2.acc), ...pointBlend(p) };
      });
      await waitPlan(r, planXB(start(), pts, Number(step.args?.running_mode ?? 0)));
    }
    mark("completed");
  };
  var runStep = async (r, step, matched) => {
    const a = step.args ?? {};
    const vars = r.variables;
    switch (step.method) {
      case "Variables":
        for (const v of a.variables ?? []) vars[v.name] = initValue(v.type, v.init_value, vars);
        broadcastVars();
        return;
      case "Script":
        if (a.mode === "GENERAL") {
          for (const line of a.general_contents ?? []) if (String(line).trim()) execStatement(String(line), vars);
        }
        broadcastVars();
        return;
      case "Break":
        throw new BreakSignal();
      case "Condition": {
        const key = step.groupId ?? step.stepId;
        const type = a.condition_type;
        if (type === "If") matched.set(key, false);
        if (matched.get(key)) return;
        const ok = type === "Else" ? true : truthy(evalExpr(String(a.condition ?? ""), vars));
        if (!ok) return;
        matched.set(key, true);
        await runSteps(r, step.children ?? []);
        return;
      }
      case "Repeat": {
        const body = step.children ?? [];
        const count = a.count, whileCond = a.while_cond, doWhile = a.do_while;
        r.totalRepeat = typeof count === "number" ? count : 0;
        try {
          if (whileCond) {
            while (truthy(evalExpr(String(whileCond), vars))) {
              checkStop(r);
              await runSteps(r, body);
            }
          } else if (doWhile) {
            do {
              checkStop(r);
              await runSteps(r, body);
            } while (truthy(evalExpr(String(doWhile), vars)));
          } else {
            for (let i = 0; count < 0 || i < Number(count ?? 1); i++) {
              r.currentRepeat = i + 1;
              checkStop(r);
              await runSteps(r, body);
            }
          }
        } catch (e) {
          if (!(e instanceof BreakSignal)) throw e;
        }
        return;
      }
      case "Wait": {
        const ms = Number(a.second) * 1e3;
        if (Number.isFinite(ms) && ms > 0) {
          await Promise.race([sleep(ms), new Promise((resolve) => {
            r.cancelMove = resolve;
          })]);
          r.cancelMove = null;
          checkStop(r);
        }
        return;
      }
      case "MoveJ":
      case "MoveL":
      case "MoveJB":
      case "MoveXB": {
        await runMove(r, step);
        return;
      }
      case "Debug": {
        if (a.option === "LOG") return;
        const names = a.variables ?? [];
        if (!names.length) return;
        const content = names.map((n) => n in vars ? `${n}: ${debugValue(vars[n])}` : `${n}: Undefined`).join("\n") + "\n";
        await waitDialog(r, "Debug Variables", content);
        return;
      }
      default:
        break;
    }
    if (step.funcName === "rb_program_sdk.user_input") {
      const name = String(a.var_selection ?? ""), form = String(a.var_form ?? "STRING");
      if (!name) {
        return;
      }
      pendingInput = null;
      await waitDialog(r, `USER_INPUT_${form}`, `${name} (${userText(vars[name])})`);
      if (pendingInput) {
        vars[pendingInput.name] = pendingInput.value;
        broadcastVars();
        pendingInput = null;
      }
      return;
    }
    if (step.funcName === "rb_program_sdk.user_select") {
      const name = String(a.var_name ?? "");
      pendingSelect = null;
      await waitDialog(r, `USER_SELECT_${a.ask_ment ?? ""}`, JSON.stringify([name, a.timeout ?? 60, String(a.disconn_timeout ?? 0), a.content ?? []]));
      if (pendingSelect) {
        vars[name] = pendingSelect.value;
        broadcastVars();
        pendingSelect = null;
      }
      return;
    }
  };
  var finish = (r, error) => {
    if (run?.id !== r.id) return;
    lastVariables = r.variables;
    r.error = error;
    run = null;
    publish("common/program/play_state", { playState: error ? "stop" : "idle", stepMode: false, error });
    publish(`common/program/${ROBOT}/change-variables`, variablesValue());
  };
  var startRun = (body) => {
    const script = body.scripts?.[0];
    if (!script) return { status: "fail" };
    stopRun();
    const r = { id: ++seq2, taskId: script.taskId, state: "play", variables: {}, currentStepId: null, paused: null, cancelMove: null, stopped: false, totalRepeat: script.repeatCount, currentRepeat: 0, error: null };
    run = r;
    stepStates = {};
    broadcastPlay();
    void (async () => {
      try {
        for (let i = 0; i < Math.max(1, script.repeatCount); i++) {
          r.currentRepeat = i + 1;
          await runSteps(r, script.steps);
        }
        finish(r, null);
      } catch (e) {
        if (e instanceof Stopped) finish(r, null);
        else finish(r, e instanceof RunError ? e.message : String(e));
      }
    })();
    return { status: "success" };
  };
  var controlRun = (type) => {
    if (!run) return { status: "success" };
    if (type === "stop") {
      run.stopped = true;
      run.paused?.resolve();
      abortMove(run);
      setState("stop");
    } else if (type === "resume") run.paused?.resolve();
    else if (type === "pause" && run.state === "play") setState("pause");
    return { status: "success" };
  };
  var stopRun = () => {
    if (!run) return;
    const r = run;
    r.stopped = true;
    r.paused?.resolve();
    abortMove(r);
    run = null;
    stepStates = {};
  };
  var setUserSelectValue = (body) => {
    pendingSelect = { name: String(body.current_value ?? ""), value: Number(body.selected_num ?? 0) };
    publish(`common/program/${ROBOT}/set_user_select_value`, { is_ok: true, timestamp: Date.now() });
    return { is_ok: true };
  };
  var changeUserInputValue = (body) => {
    const type = String(body.var_type ?? "STRING"), raw = body.applied_value;
    const text = String(raw ?? "").trim();
    let value = raw;
    if (type === "NUMERIC") value = Number(text);
    else if (type === "BOOLEAN") value = text === "True";
    else if (type === "STRING") {
      const m = /^"(.*)"$/s.exec(text);
      value = m ? m[1] : text;
    } else {
      try {
        value = evalExpr(text, {});
      } catch {
        value = text;
      }
    }
    pendingInput = { name: String(body.current_value ?? ""), value };
    publish(`common/program/${ROBOT}/change_user_input_value`, { is_ok: true, timestamp: Date.now() });
    return { is_ok: true };
  };

  // demo-artifact/mock/program.ts
  var programs = [];
  var tasks = [];
  var seq3 = 0;
  var publicTask = (task) => {
    const { steps: _steps, ...rest } = task;
    return rest;
  };
  var treeOf = (task) => Array.isArray(task.steps) ? task.steps : [];
  var loadedProgram = () => programs.find((p) => p.programId === robotInfo.info.programId) ?? null;
  var createProgram = (body) => {
    const name = String(body?.name ?? "");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const programId = `demo-program-${++seq3}`;
    const program = {
      programId,
      robotModel: ROBOT_MODEL,
      name,
      repeatCnt: Number(body?.repeatCnt ?? 1),
      state: "idle",
      lastLoadedAt: now,
      createdAt: now,
      updatedAt: now
    };
    programs.push(program);
    const created = robotInfo.info.components.map((component, i) => ({
      taskId: `${programId}-task-${i + 1}`,
      programId,
      parentTaskId: null,
      robotModel: component,
      type: "MAIN",
      name: `${component}_${name}`,
      scriptName: `${component}_${name}`,
      scriptPath: "",
      begin: { is_enable: true, position: [...robotState.jointDeg] },
      extension: "py",
      disablePause: false,
      state: "idle",
      createdAt: now,
      updatedAt: now
    }));
    tasks.push(...created);
    return { program, mainTasks: created.map(publicTask), subTasks: [], mainSteps: Object.fromEntries(created.map((t) => [t.taskId, []])), subSteps: null };
  };
  var seedSteps = (programId, specs) => {
    const task = tasks.find((t) => t.programId === programId && t.type === "MAIN");
    if (!task) throw new Error(`Unknown program: ${programId}`);
    let n = 0;
    const build2 = (spec, parentStepId) => {
      const stepId = `${task.taskId}-step-${++n}`;
      return {
        ...spec.extra ? cloneData(spec.extra) : {},
        stepId,
        taskId: task.taskId,
        programId,
        parentStepId,
        method: spec.method,
        ...spec.name !== void 0 && { name: spec.name },
        summary: spec.summary ?? "",
        ...spec.funcName !== void 0 && { funcName: spec.funcName },
        ...spec.args !== void 0 && { args: cloneData(spec.args) },
        ...spec.children && { children: spec.children.map((c) => build2(c, stepId)) }
      };
    };
    task.steps = specs.map((s) => build2(s, null));
  };
  var editProgram = (body) => {
    const p = programs.find((x) => x.programId === body.programId);
    if (p) {
      if (body.name !== void 0) p.name = body.name;
      if (body.repeatCnt !== void 0) p.repeatCnt = body.repeatCnt;
      p.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    }
    return { program: p ?? null };
  };
  var updateTasks = (body) => {
    for (const nt of body.tasks ?? []) {
      const t = tasks.find((x) => x.taskId === nt.taskId);
      if (t) Object.assign(t, nt, { steps: t.steps });
    }
    return { updated_count: body.tasks?.length ?? 0 };
  };
  var upsertSteps = (body) => {
    const byTask = /* @__PURE__ */ new Map();
    for (const s of body.steps ?? []) {
      if (!byTask.has(s.taskId)) byTask.set(s.taskId, []);
      byTask.get(s.taskId).push(s);
    }
    let count = 0;
    for (const [taskId, flat] of byTask) {
      const task = tasks.find((x) => x.taskId === taskId);
      if (!task) continue;
      const nodes = new Map(flat.map((s) => {
        const { children: _c, icon: _i, ...rest } = s;
        return [s.stepId, { ...cloneData(rest), children: [] }];
      }));
      const roots = [];
      for (const s of [...flat].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
        const node = nodes.get(s.stepId);
        const parent = s.parentStepId ? nodes.get(s.parentStepId) : null;
        (parent ? parent.children : roots).push(node);
      }
      const strip = (list) => list.map((n) => {
        const o = n;
        return o.children.length ? { ...o, children: strip(o.children) } : (({ children: _c, ...r }) => r)(o);
      });
      task.steps = strip(roots);
      count += flat.length;
    }
    return { inserted_count: 0, matched_count: count, upserted_count: count, modified_count: count, deleted_count: 0, upserted_ids: [] };
  };
  var programInfo = (programId) => {
    const program = programs.find((p) => p.programId === programId) ?? null;
    const mainTasks2 = tasks.filter((t) => t.programId === programId && t.type === "MAIN");
    return {
      program,
      mainTasks: program ? mainTasks2.map(publicTask) : null,
      mainSteps: program ? Object.fromEntries(mainTasks2.map((t) => [t.taskId, treeOf(t)])) : null,
      subTasks: program ? [] : null,
      subSteps: null
    };
  };
  var taskInfo = (taskId) => {
    const task = tasks.find((t) => t.taskId === taskId) ?? null;
    const program = task ? programs.find((p) => p.programId === task.programId) : null;
    return { task: task ? publicTask(task) : null, programName: program?.name ?? null };
  };
  var mainTasks = () => {
    const p = loadedProgram();
    return { tasks: p ? tasks.filter((t) => t.programId === p.programId && t.type === "MAIN").map(publicTask) : [] };
  };
  var setLoadedProgram = (programId) => {
    if (programId != null && !programs.some((p) => p.programId === programId)) {
      throw new Error(`Unknown program: ${programId}`);
    }
    robotInfo.info.programId = programId ?? null;
    return robotInfo;
  };
  var captureProgram = () => cloneData({ programs, tasks, seq: seq3, loadedProgramId: robotInfo.info.programId, playState: playStateIdle });
  var initialProgram = captureProgram();
  var rebaseProgram = () => {
    initialProgram = captureProgram();
  };

  // demo-artifact/mock/calibration.ts
  var MSG_LEVEL_INFO = 0;
  var MSG_LEVEL_WARN = 1;
  var MSG_OK = 0;
  var MSG_DESIRED_VALUE_IS_OVER_BOUND = 6;
  var MSG_DESIRED_OPTION_IS_OVER_BOUND = 7;
  var MSG_MOVE_POINT_NUM_ERR = 303;
  var NAMES = {
    6: "MSG_DESIRED_VALUE_IS_OVER_BOUND",
    7: "MSG_DESIRED_OPTION_IS_OVER_BOUND",
    303: "MSG_MOVE_POINT_NUM_ERR"
  };
  var warn = (code) => ({ sw_name: ROBOT_MODEL, type: MSG_LEVEL_WARN, code, subStr: NAMES[code], isToast: false });
  var info = (text) => ({ sw_name: ROBOT_MODEL, type: MSG_LEVEL_INFO, code: MSG_OK, subStr: text, isToast: false });
  var sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  var norm = (a) => Math.hypot(a[0], a[1], a[2]);
  var mulV = (R, v) => [
    R[0] * v[0] + R[1] * v[1] + R[2] * v[2],
    R[3] * v[0] + R[4] * v[1] + R[5] * v[2],
    R[6] * v[0] + R[7] * v[1] + R[8] * v[2]
  ];
  var trace2 = (R) => R[0] + R[4] + R[8];
  var frob = (R) => Math.sqrt(R.reduce((s, x) => s + x * x, 0));
  var lstsq3 = (A, b) => {
    const M = [0, 1, 2].map((i) => [0, 1, 2].map((j) => A.reduce((s, r) => s + r[i] * r[j], 0)).concat(A.reduce((s, r, k) => s + r[i] * b[k], 0)));
    for (let c = 0; c < 3; c++) {
      let piv = c;
      for (let r = c + 1; r < 3; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
      [M[c], M[piv]] = [M[piv], M[c]];
      const d = M[c][c] || 1e-12;
      for (let r = c + 1; r < 3; r++) {
        const f = M[r][c] / d;
        for (let k = c; k < 4; k++) M[r][k] -= f * M[c][k];
      }
    }
    const x = [0, 0, 0];
    for (let r = 2; r >= 0; r--) {
      let s = M[r][3];
      for (let k = r + 1; k < 3; k++) s -= M[r][k] * x[k];
      x[r] = s / (M[r][r] || 1e-12);
    }
    return x;
  };
  var autoTcpPosition = (joints) => {
    const n = joints.length;
    if (n < 4) return warn(MSG_MOVE_POINT_NUM_ERR);
    const P2 = [];
    const R = [];
    joints.forEach((q) => {
      const f2 = flangePose(q);
      P2.push([f2.p[0] * 1e3, f2.p[1] * 1e3, f2.p[2] * 1e3]);
      R.push(f2.R);
    });
    let pairs = [];
    for (let i = 0; i < n - 1; i++) for (let j = i + 1; j < n; j++) pairs.push([i, j]);
    let tcp = [0, 0, 0];
    for (let iter = 0; iter < 5; iter++) {
      const A = [];
      const b = [];
      for (const [i, j] of pairs) {
        const dR = R[j].map((x, k) => x - R[i][k]);
        const dP = sub(P2[i], P2[j]);
        if (trace2(rotMul(rotT(R[i]), R[j])) > 2.99) continue;
        if (frob(dR) < 1e-3) continue;
        for (let k = 0; k < 3; k++) {
          A.push([dR[k * 3], dR[k * 3 + 1], dR[k * 3 + 2]]);
          b.push(dP[k]);
        }
      }
      if (A.length < 6) return warn(MSG_DESIRED_VALUE_IS_OVER_BOUND);
      tcp = lstsq3(A, b);
      const next = [];
      for (let i = 0; i < n - 1; i++)
        for (let j = i + 1; j < n; j++) {
          const a = sub([P2[i][0] + mulV(R[i], tcp)[0], P2[i][1] + mulV(R[i], tcp)[1], P2[i][2] + mulV(R[i], tcp)[2]], [P2[j][0] + mulV(R[j], tcp)[0], P2[j][1] + mulV(R[j], tcp)[1], P2[j][2] + mulV(R[j], tcp)[2]]);
          if (norm(a) < 2) next.push([i, j]);
        }
      if (next.length < 3) break;
      pairs = next;
    }
    let sq = 0;
    let cnt = 0;
    for (let i = 0; i < n - 1; i++)
      for (let j = i + 1; j < n; j++) {
        const pi = mulV(R[i], tcp);
        const pj = mulV(R[j], tcp);
        const e = norm([P2[i][0] + pi[0] - P2[j][0] - pj[0], P2[i][1] + pi[1] - P2[j][1] - pj[1], P2[i][2] + pi[2] - P2[j][2] - pj[2]]);
        sq += e * e;
        cnt++;
      }
    const rmse = Math.sqrt(sq / cnt);
    const f = (v) => v.toFixed(6);
    return info(`Auto TCP Result
X: ${f(tcp[0])}
Y: ${f(tcp[1])}
Z: ${f(tcp[2])}
RMSE: ${f(rmse)}`);
  };
  var autoTcpOrientation = (frameOpt) => {
    if (![0, 1, 2].includes(frameOpt)) return warn(MSG_DESIRED_OPTION_IS_OVER_BOUND);
    const q = robotState.jointDeg;
    const Rframe = frameOpt === 1 ? forward(q).R : frameOpt === 2 ? userRot() : [1, 0, 0, 0, 1, 0, 0, 0, 1];
    const Rtfc = flangePose(q).R;
    const [rx, ry, rz] = rotToEulerZYXDeg(rotMul(rotT(Rtfc), Rframe));
    const f = (v) => v.toFixed(6);
    return info(`Auto TCP Orientation Result
Rx: ${f(rx)}
Ry: ${f(ry)}
Rz: ${f(rz)}`);
  };

  // demo-artifact/mock/topics.ts
  var seen = /* @__PURE__ */ new Set();
  var topics = {
    "common/robot_system_state": { get: systemState, intervalMs: 1e3 },
    "common/battery_state": { get: () => batteryState },
    "common/program/play_state": { get: playStateValue },
    "common/speedbar": { get: speedbar, intervalMs: 1e3 },
    "common/get_joint_states": { get: jointStates, intervalMs: 33 },
    "manipulate/C500920/state_core": { get: stateCore, intervalMs: 33 },
    "log/error_log_count_for_24h": { get: () => ({ count: errorCount24h() }) }
  };
  var dynamicTopics = [
    [/^common\/program\/task\/([^/]+)\/update_state$/, (hit) => ({ get: () => stepStateValue(hit[1]) })],
    [/^common\/program\/[^/]+\/change-variables$/, () => ({ get: variablesValue })]
  ];
  var topicSource = (topic) => {
    if (!topics[topic]) for (const [re, make] of dynamicTopics) {
      const hit = re.exec(topic);
      if (hit) return make(hit);
    }
    if (!topics[topic] && !seen.has(topic)) {
      seen.add(topic);
      console.warn("[demo] unmocked socket topic:", topic);
    }
    return topics[topic];
  };
  var handleEmit = (ev, payload, push) => {
    const hit = /^manipulate\/[^/]+\/(.+)$/.exec(ev);
    if (hit && onManipulateEmit(hit[1], payload)) return;
    if (payload === void 0) return;
    console.info("[demo] emit(unhandled)", ev, payload);
    void push;
  };

  // demo-artifact/shims/runtime.ts
  var StaleWorkError = class extends Error {
    code = "ERR_CANCELED";
    __CANCEL__ = true;
    constructor() {
      super("Demo work belongs to an inactive restore generation");
      this.name = "CanceledError";
    }
  };
  var DemoRuntime = class {
    generation = 0;
    phase = "running";
    settled = true;
    restoreReads = false;
    pending = Promise.resolve();
    controller = new AbortController();
    listeners = /* @__PURE__ */ new Set();
    resources = /* @__PURE__ */ new Set();
    timers = /* @__PURE__ */ new Map();
    token = () => ({ generation: this.generation, signal: this.controller.signal, phase: this.phase });
    getPhase = () => this.phase;
    getStamp = () => `${this.generation}:${this.phase}`;
    subscribe = (fn) => {
      this.listeners.add(fn);
      return () => {
        this.listeners.delete(fn);
      };
    };
    isCurrent = (token, allowRestore = false) => token.generation === this.generation && token.signal === this.controller.signal && !token.signal.aborted && (this.phase === "running" && (allowRestore || token.phase === "running") || allowRestore && this.phase === "restoring");
    assertCurrent(token, allowRestore = false) {
      if (!this.isCurrent(token, allowRestore)) throw new StaleWorkError();
    }
    assertRequest(token, read) {
      this.assertCurrent(token, read && (this.phase === "running" || this.restoreReads));
    }
    enableRestoreReads(context) {
      this.assertCurrent(context, true);
      if (this.phase !== "restoring") throw new Error("No restore in progress");
      if (!this.settled) throw new Error("Await runtime.whenQuiescent before allowing restore reads");
      this.restoreReads = true;
    }
    registerResource(resource) {
      this.resources.add(resource);
      if (this.phase !== "running") {
        const result = resource.suspend();
        if (result && typeof result.then === "function") {
          const generation = this.generation;
          this.settled = false;
          const pending = Promise.all([this.pending, result]).then(() => {
            if (generation === this.generation && this.pending === pending) this.settled = true;
          }, (error) => {
            if (generation === this.generation) {
              this.phase = "failed";
              this.controller.abort();
              this.notify();
            }
            throw error;
          });
          this.pending = pending;
          void pending.catch(() => {
          });
        }
      }
      return () => {
        this.resources.delete(resource);
      };
    }
    notify() {
      for (const listener of [...this.listeners]) listener();
    }
    beginRestore() {
      this.phase = "restoring";
      this.restoreReads = false;
      this.generation++;
      this.controller.abort();
      this.controller = new AbortController();
      for (const cancel of this.timers.values()) cancel();
      this.timers.clear();
      const cancellations = [];
      const errors = [];
      for (const resource of [...this.resources]) {
        try {
          const result = resource.suspend();
          if (result && typeof result.then === "function") cancellations.push(result);
        } catch (error) {
          errors.push(error);
        }
      }
      this.settled = cancellations.length === 0;
      const generation = this.generation;
      const pending = Promise.allSettled(cancellations).then((results) => {
        if (generation !== this.generation) return;
        for (const result of results) if (result.status === "rejected") errors.push(result.reason);
        if (this.pending === pending) this.settled = true;
        if (errors.length) {
          this.phase = "failed";
          this.controller.abort();
          this.notify();
          throw new AggregateError(errors, "Demo runtime could not quiesce");
        }
      });
      this.pending = pending;
      void this.pending.catch(() => {
      });
      if (errors.length) {
        this.phase = "failed";
        this.controller.abort();
        this.notify();
        throw new AggregateError(errors, "Demo runtime could not quiesce");
      }
      this.notify();
      return this.token();
    }
    async whenQuiescent(context) {
      let pending;
      do {
        pending = this.pending;
        await pending;
      } while (pending !== this.pending);
      this.assertCurrent(context, true);
    }
    finishRestore(context) {
      this.assertCurrent(context, true);
      if (this.phase !== "restoring") throw new Error("No restore in progress");
      if (!this.settled) throw new Error("Await runtime.whenQuiescent before finishing restore");
      this.phase = "running";
      try {
        for (const resource of [...this.resources]) resource.resume?.();
      } catch (error) {
        this.phase = "failed";
        this.controller.abort();
        for (const resource of [...this.resources]) {
          try {
            void Promise.resolve(resource.suspend()).catch(() => {
            });
          } catch {
          }
        }
        throw error;
      } finally {
        this.notify();
      }
    }
    failRestore(context) {
      this.assertCurrent(context, true);
      if (this.phase !== "restoring") throw new Error("No restore in progress");
      this.phase = "failed";
      this.controller.abort();
      this.notify();
    }
    guard(fn, token = this.token()) {
      return (...args) => this.isCurrent(token) ? fn(...args) : void 0;
    }
    setTimeout(fn, delay) {
      const token = this.token();
      const handle = setTimeout(() => {
        this.timers.delete(handle);
        if (this.isCurrent(token)) fn();
      }, delay);
      if (this.isCurrent(token)) this.timers.set(handle, () => clearTimeout(handle));
      else clearTimeout(handle);
      return handle;
    }
    clearTimeout(handle) {
      clearTimeout(handle);
      this.timers.delete(handle);
    }
  };
  var demoRuntime = new DemoRuntime();

  // demo-artifact/shims/socket.io-client.ts
  var Emitter = class {
    map = /* @__PURE__ */ new Map();
    on(ev, fn) {
      if (!this.map.has(ev)) this.map.set(ev, /* @__PURE__ */ new Set());
      this.map.get(ev).add(fn);
      return this;
    }
    off(ev, fn) {
      if (!fn) this.map.delete(ev);
      else this.map.get(ev)?.delete(fn);
      return this;
    }
    hasListeners(ev) {
      return (this.map.get(ev)?.size ?? 0) > 0;
    }
    fire(ev, ...args) {
      [...this.map.get(ev) ?? []].forEach((fn) => fn(...args));
    }
  };
  var sockets = /* @__PURE__ */ new Set();
  var demoPublish = (topic, payload) => {
    sockets.forEach((s) => s.deliver(topic, payload));
  };
  setRunPublisher((topic, payload) => demoPublish(topic, payload));
  var FakeSocket = class extends Emitter {
    id = "demo-socket";
    connected = false;
    io = new Emitter();
    disposed = false;
    subscriptions = /* @__PURE__ */ new Set();
    timers = /* @__PURE__ */ new Map();
    pending = /* @__PURE__ */ new Map();
    unregister;
    deliver(topic, payload) {
      if (!this.disposed && demoRuntime.getPhase() === "running") this.fire(topic, structuredClone(payload));
    }
    constructor() {
      super();
      sockets.add(this);
      this.unregister = demoRuntime.registerResource({
        suspend: () => this.suspend(),
        resume: () => this.resume()
      });
      this.resume();
    }
    suspend() {
      for (const handle of this.pending.values()) demoRuntime.clearTimeout(handle);
      this.pending.clear();
      for (const handle of this.timers.values()) clearInterval(handle);
      this.timers.clear();
    }
    schedule(key, fn) {
      const previous = this.pending.get(key);
      if (previous !== void 0) demoRuntime.clearTimeout(previous);
      this.pending.set(key, demoRuntime.setTimeout(() => {
        this.pending.delete(key);
        if (!this.disposed) fn();
      }, 0));
    }
    resume() {
      if (this.disposed || demoRuntime.getPhase() !== "running") return;
      if (!this.connected) this.schedule("connect", () => {
        this.connected = true;
        this.fire("connect");
      });
      for (const topic of this.subscriptions) this.startTopic(topic);
    }
    push(topic) {
      if (this.disposed || !this.subscriptions.has(topic) || demoRuntime.getPhase() !== "running") return;
      const src = topicSource(topic);
      if (src) this.deliver(topic, src.get());
    }
    startTopic(topic) {
      const src = topicSource(topic);
      if (!src || demoRuntime.getPhase() !== "running") return;
      this.schedule(topic, () => this.push(topic));
      if (src.intervalMs && !this.timers.has(topic)) {
        const token = demoRuntime.token();
        this.timers.set(topic, setInterval(() => {
          if (demoRuntime.isCurrent(token)) this.push(topic);
        }, src.intervalMs));
      }
    }
    emit(ev, payload) {
      if (this.disposed) return this;
      if (ev === "subscribe") {
        const topic = payload?.topic;
        if (!topicSource(topic)) return this;
        this.subscriptions.add(topic);
        this.startTopic(topic);
      } else if (ev === "unsubscribe") {
        const topic = payload?.topic;
        const interval = this.timers.get(topic);
        if (interval !== void 0) clearInterval(interval);
        const pending = this.pending.get(topic);
        if (pending !== void 0) demoRuntime.clearTimeout(pending);
        this.timers.delete(topic);
        this.pending.delete(topic);
        this.subscriptions.delete(topic);
      } else if (demoRuntime.getPhase() === "running") {
        handleEmit(ev, payload, (topic) => this.push(topic));
      }
      return this;
    }
    disconnect() {
      this.disposed = true;
      this.suspend();
      this.subscriptions.clear();
      this.unregister();
      sockets.delete(this);
      this.connected = false;
      return this;
    }
  };
  var io = (..._args) => new FakeSocket();

  // demo-artifact/mock/unsupported-request.ts
  var UnsupportedDemoRequestError = class extends Error {
    constructor(method, path) {
      super("\uC774 \uC2E4\uC2B5\uC5D0\uC11C \uC544\uC9C1 \uC9C0\uC6D0\uD558\uC9C0 \uC54A\uB294 \uAE30\uB2A5\uC785\uB2C8\uB2E4.");
      this.method = method;
      this.path = path;
      this.name = "UnsupportedDemoRequestError";
    }
    method;
    path;
    code = "DEMO_UNSUPPORTED_REQUEST";
  };

  // demo-artifact/mock/rest.ts
  var routes = [
    // 슬라이더가 보내는 속도바(0~1). 요청 {speedbar, components}·응답 {returnValue}: nexus hooks/mutation/common/program/useMutateAllSpeedBar.ts
    // (BE 라우트는 Muscat features/config/config_router.py 의 change-speedbar)
    ["POST", /^\/common\/change-speedbar$/, ({ body }) => {
      const v = Number(body?.speedbar);
      if (Number.isFinite(v)) robotState.speedBar = Math.max(0, Math.min(1, v));
      return { returnValue: 0 };
    }],
    // 툴 선택. 요청 {robotModel, targetToolNum}·응답 {returnValue}: nexus hooks/mutation/manipulate/config/useMutateToolSelect.ts
    ["POST", /^\/manipulate\/[^/]+\/set_toollist_num$/, ({ body }) => {
      selectTool(Number(body?.targetToolNum));
      return { returnValue: 0 };
    }],
    // 유저 프레임 선택. 요청 {user_frame_num}: nexus hooks/mutation/manipulate/config/useMutateUserFrameSelect.ts
    ["POST", /^\/manipulate\/[^/]+\/set_userframe_num$/, ({ body }) => {
      selectUserFrame(Number(body?.user_frame_num));
      return { returnValue: 0 };
    }],
    // 핀포인트 저장(현재 자세를 pin_num 칸에). 요청 {pin_num, pin_name}·응답 {return_value}: hooks/mutation/manipulate/config/useMutateManiGlobalPinPointParameter.ts
    ["POST", /^\/manipulate\/[^/]+\/save_globpin_parameter$/, ({ body }) => {
      const b = body;
      savePinPoint(Number(b?.pin_num), String(b?.pin_name ?? ""));
      return { return_value: 0 };
    }],
    // After Action 저장. 요청 {after_no, after_option}·응답 {return_value}: hooks/mutation/manipulate/config/useMutateManiAfterAction.ts.
    // 범위 밖 번호·옵션은 코어(Save_AfterAction)처럼 실패 코드로 거절한다. 목록은 GET call_config_controlbox 가 같은 객체로 읽는다.
    ["POST", /^\/manipulate\/[^/]+\/save_after_action$/, ({ body }) => {
      const { after_no, after_option } = body ?? {};
      const list = controlBox.afterActionList;
      if (!Number.isInteger(after_no) || after_no < 0 || after_no >= list.length || !Number.isInteger(after_option) || after_option < 0 || after_option > 16) {
        return { return_value: 1 };
      }
      list[after_no] = after_option;
      return { return_value: 0 };
    }],
    // 외부 충돌 저장. 요청 {onoff, react, threshold}·응답 {return_value}: hooks/mutation/manipulate/config/useMutateManiCollisionParameter.ts.
    // 코어 Save_Out_Coll_Para 는 threshold 를 0~1 로 제한한다. onoff 는 0/1, react 는 0(일시 정지)/1(회피 정지)만 받는다(UI 선택지).
    ["POST", /^\/manipulate\/[^/]+\/save_collision_parameter$/, ({ body }) => {
      const { onoff, react, threshold } = body ?? {};
      if (onoff !== 0 && onoff !== 1 || react !== 0 && react !== 1 || typeof threshold !== "number" || !Number.isFinite(threshold)) return { return_value: 1 };
      robotArm.outCollOnoff = onoff;
      robotArm.outCollReact = react;
      robotArm.outCollLimit = Math.max(0, Math.min(1, threshold));
      return { return_value: 0 };
    }],
    // 자가 충돌 저장. 요청 {mode, dist_internal, dist_external}: hooks/mutation/manipulate/config/useMutateManiSelfCollParameter.ts.
    // 코어 Save_Self_Coll_Para 는 거리를 0 이상으로 제한한다. mode 는 0(직전 멈춤)/1(속도 제어)만 받는다(UI 선택지).
    ["POST", /^\/manipulate\/[^/]+\/save_selfcoll_parameter$/, ({ body }) => {
      const { mode, dist_internal, dist_external } = body ?? {};
      if (mode !== 0 && mode !== 1 || typeof dist_internal !== "number" || !Number.isFinite(dist_internal) || typeof dist_external !== "number" || !Number.isFinite(dist_external)) return { return_value: 1 };
      robotArm.selfCollMode = mode;
      robotArm.selfCollDistanceInter = Math.max(0, dist_internal);
      robotArm.selfCollDistanceExter = Math.max(0, dist_external);
      return { return_value: 0 };
    }],
    // 용접 장치 설정 저장. 요청은 ReqWelding(hooks/mutation/manipulate/config/useMutateManiWelding.ts)·응답 {return_value}.
    // 검증은 코어 rb_welding::Save_Welding_Para 를 따른다: 장치 0~3, IP 각 0~255, 포트 0~65535(Miller/Aotai M.Bus 는 502 로 고정),
    // 디지털 포트 -1~15, 아날로그 포트 -1~3, 변환 맵은 X·Y 길이가 같고 10개 이하. 저장 뒤 맵은 코어처럼 값(X) 오름차순으로 정렬해 돌려준다.
    ["POST", /^\/manipulate\/[^/]+\/save_weld_parameter$/, ({ body }) => {
      const b = body ?? {};
      const int = (k, lo, hi) => Number.isInteger(b[k]) && b[k] >= lo && b[k] <= hi;
      const list = (k) => Array.isArray(b[k]) && b[k].every((v) => typeof v === "number" && Number.isFinite(v));
      const D = 15, A = 3;
      const ok = int("dev_id", 0, 3) && ["dev_ip_0", "dev_ip_1", "dev_ip_2", "dev_ip_3"].every((k) => int(k, 0, 255)) && int("dev_port", 0, 65535) && [
        "out_pno_arc",
        "out_pno_touch",
        "out_pno_gas",
        "out_pno_inch",
        "out_pno_reinch",
        "in_pno_ready",
        "in_pno_arc",
        "in_pno_touch",
        "in_pno_gas",
        "in_pno_feeder",
        "in_pno_error"
      ].every((k) => int(k, -1, D)) && ["out_pno_current", "out_pno_voltage", "in_pno_current", "in_pno_voltage"].every((k) => int(k, -1, A)) && ["hw_process_type", "hw_wire_type", "hw_wire_size", "hw_gas_type"].every((k) => int(k, 0, 1e3)) && ["current_map_value", "current_map_output", "voltage_map_value", "voltage_map_output"].every(list);
      if (!ok) return { return_value: 1 };
      const cv = b.current_map_value, co = b.current_map_output;
      const vv = b.voltage_map_value, vo = b.voltage_map_output;
      if (cv.length !== co.length || vv.length !== vo.length || cv.length > 10 || vv.length > 10) return { return_value: 1 };
      const sorted = (x, y) => {
        const rows = x.map((v, i) => [v, y[i]]).sort((a, c) => a[0] - c[0]);
        return [rows.map((r) => r[0]), rows.map((r) => r[1])];
      };
      const w2 = weldConfig;
      w2.devId = b.dev_id;
      w2.devIp0 = b.dev_ip_0;
      w2.devIp1 = b.dev_ip_1;
      w2.devIp2 = b.dev_ip_2;
      w2.devIp3 = b.dev_ip_3;
      w2.devPort = w2.devId === 2 || w2.devId === 3 ? 502 : b.dev_port;
      w2.outPnoArc = b.out_pno_arc;
      w2.outPnoTouch = b.out_pno_touch;
      w2.outPnoGas = b.out_pno_gas;
      w2.outPnoInch = b.out_pno_inch;
      w2.outPnoReinch = b.out_pno_reinch;
      w2.outPnoCurrent = b.out_pno_current;
      w2.outPnoVoltage = b.out_pno_voltage;
      w2.inPnoReady = b.in_pno_ready;
      w2.inPnoArc = b.in_pno_arc;
      w2.inPnoTouch = b.in_pno_touch;
      w2.inPnoGas = b.in_pno_gas;
      w2.inPnoFeeder = b.in_pno_feeder;
      w2.inPnoError = b.in_pno_error;
      w2.inPnoCurrent = b.in_pno_current;
      w2.inPnoVoltage = b.in_pno_voltage;
      w2.hwProcessType = b.hw_process_type;
      w2.hwWireType = b.hw_wire_type;
      w2.hwWireSize = b.hw_wire_size;
      w2.hwGasType = b.hw_gas_type;
      [w2.currentMapValue, w2.currentMapOutput] = sorted(cv, co);
      [w2.voltageMapValue, w2.voltageMapOutput] = sorted(vv, vo);
      return { return_value: 0 };
    }],
    // 접근 이동(핀포인트·영점). 요청 {target:{tar_values,...}, speed}·중지 {stoptime}: hooks/mutation/manipulate/program/useMutateApproach*.ts
    ["POST", /^\/manipulate\/[^/]+\/call_approach_([jl])$/, ({ body, params: params2 }) => {
      approachStart(params2[0], body?.target?.tar_values ?? []);
      return { returnValue: 0 };
    }],
    ["POST", /^\/manipulate\/[^/]+\/call_approach_stop$/, () => {
      approachStop();
      return { returnValue: 0 };
    }],
    // 조그 입력칸·키패드의 절대 목표 이동. FE useMutateManipulateMove.ts → BE call_move_j/l.
    // 기존 접근 이동 시뮬레이션을 재사용한다. 실제 코어의 궤적·가감속 계획을 재현하지는 않는다.
    ["POST", /^\/manipulate\/[^/]+\/call_move_([jl])$/, ({ body, params: params2 }) => {
      const kind = params2[0];
      const { target, ext_axis } = body ?? {};
      const values = target?.tar_values;
      if (!Array.isArray(values) || values.length !== 7 || !values.every(Number.isFinite) || target?.tar_unit !== 0 || target.tar_frame !== (kind === "j" ? -1 : 0) || kind === "j" && values.some((v) => Math.abs(v) > 360) || ext_axis !== void 0 && (!Array.isArray(ext_axis) || ext_axis.some((v) => v !== 0))) {
        return { returnValue: 1 };
      }
      approachStart(kind, values);
      return { returnValue: 0 };
    }],
    // 입출력 명령. 요청·응답 형태: nexus hooks/mutation/manipulate/io/useMutateMani{SideDout,SideAout,MultiFlangeOut,FlangePower}.ts
    // 사이드 출력의 위치는 URL(call_multiple_side_dout=컨트롤박스, call_multiple_ext_dout=확장 보드)로 구분된다.
    ["POST", /^\/manipulate\/[^/]+\/call_multiple_(side|ext)_dout$/, ({ body, params: params2 }) => {
      setDout(params2[0] === "ext" ? "ext" : "cbox", body?.side_dout_args ?? []);
      return { return_value: 0 };
    }],
    ["POST", /^\/manipulate\/[^/]+\/call_multiple_(side|ext)_aout$/, ({ body, params: params2 }) => {
      setAout(params2[0] === "ext" ? "ext" : "cbox", body?.side_aout_args ?? []);
      return { return_value: 0 };
    }],
    ["POST", /^\/manipulate\/[^/]+\/call_multiple_flange_dout$/, ({ body }) => {
      setDout("tool", body?.flange_dout_args ?? []);
      return { returnValue: 0 };
    }],
    ["POST", /^\/manipulate\/[^/]+\/call_flange_power$/, ({ body }) => {
      const v = Number(body?.desired_voltage);
      if (Number.isFinite(v)) robotState.io.toolVoltage = v;
      return { return_value: 0 };
    }],
    // 화면에 상태를 남기지 않는 일회성 명령은 성공 응답만 준다 (마스터 모드, 용접 와이어/가스, 동작 녹화 시작/중지).
    ["POST", /^\/manipulate\/[^/]+\/(set_master_mode|call_weld_wire|call_weld_gas|call_replay_motion_rec_start|call_replay_motion_rec_stop)$/, () => ({
      returnValue: 0,
      return_value: 0
    })],
    // 워크스페이스 모델 저장소 (형태는 workspace.ts 머리말 참고)
    ["GET", /^\/common\/model\/robot\/[^/]+\/detail\/[^/]*$/, () => listModels()],
    ["POST", /^\/common\/model\/?$/, ({ body }) => createModel(body)],
    ["PATCH", /^\/common\/model\/loaded\/change$/, ({ body }) => changeLoaded(body?.models ?? [])],
    ["PATCH", /^\/common\/model\/([^/]+)$/, ({ body, params: params2 }) => updateModel(params2[0], body)],
    ["DELETE", /^\/common\/model\/([^/]+)$/, ({ params: params2 }) => deleteModel(params2[0])],
    // 교정 명령. 요청·응답 형태는 nexus hooks/mutation/manipulate/service/calibration/*.ts. 유저 프레임·부가 축 교정은 결과가 어떻게 반영되는지
    // 확인하지 않아 성공 응답만 준다. TCP 위치·회전 교정은 컨트롤러가 메시지로 결과만 알리고 값은 저장하지 않는다(calibration.cpp).
    // TCP 위치·회전 교정은 컨트롤러의 계산(calibration.ts)을 따라 결과/경고 메시지를 common/message 로 알린다.
    ["POST", /^\/manipulate\/[^/]+\/call_calib_tcp_position$/, ({ body }) => {
      const joints = (body?.joints ?? []).map((j) => j.tar_values);
      demoPublish("common/message", autoTcpPosition(joints));
      return { returnValue: 0 };
    }],
    ["POST", /^\/manipulate\/[^/]+\/call_calib_tcp_orientation$/, ({ body }) => {
      demoPublish("common/message", autoTcpOrientation(Number(body?.frame_option)));
      return { returnValue: 0 };
    }],
    ["POST", /^\/manipulate\/[^/]+\/(set_userframe_3points|set_userframe_tcp|call_extaxis_calib_[a-z_]+)$/, () => ({
      returnValue: 0
    })],
    ["GET", /^\/common\/get-robot-info$/, () => robotInfo],
    ["GET", /^\/common\/system_state$/, () => systemState()],
    ["GET", /^\/common\/robot-category-list$/, () => [BE_SERVICE]],
    ["GET", /^\/common\/battery_state$/, () => batteryState],
    ["GET", /^\/common\/plugin\/installed\/list$/, () => ({ plugins: [], totalCount: 0 })],
    // 프로그램 저장: 변경한 뒤 실행하면 앱이 '저장 후 실행'으로 이 세 요청을 차례로 보낸다(program.ts)
    ["PUT", /^\/common\/program\/edit$/, ({ body }) => editProgram(body)],
    ["POST", /^\/common\/program\/tasks\/update$/, ({ body }) => updateTasks(body)],
    ["POST", /^\/common\/program\/steps\/upsert$/, ({ body }) => upsertSteps(body)],
    // 프로그램 실행(run.ts): 미리보기 실행 시작·제어, 실행 상태·변수 조회, 사용자 입력·선택 값 적용
    ["GET", /^\/common\/program\/current\/state$/, () => currentStates()],
    ["GET", /^\/common\/program\/executor\/state$/, () => executorState()],
    ["POST", /^\/common\/program\/preview\/start$/, ({ body }) => startRun(body)],
    ["POST", /^\/common\/program\/preview\/(pause|resume|stop)$/, ({ params: params2 }) => controlRun(params2[0])],
    ["GET", /^\/common\/program\/[^/]+\/variables$/, () => variablesValue()],
    ["POST", /^\/common\/program\/[^/]+\/set_user_select_value$/, ({ body }) => setUserSelectValue(body)],
    ["POST", /^\/common\/program\/[^/]+\/change_user_input_value$/, ({ body }) => changeUserInputValue(body)],
    ["GET", /^\/common\/program\/main-tasks\/.*$/, () => mainTasks()],
    // 프로그램 생성·조회 (형태는 program.ts 머리말 참고). 로드된 프로그램은 robotInfo.info.programId.
    ["POST", /^\/common\/program\/create$/, ({ body }) => createProgram(body)],
    ["POST", /^\/common\/upsert-robot-info$/, ({ body }) => setLoadedProgram(body?.programId)],
    ["GET", /^\/common\/program\/task\/([^/]+)$/, ({ params: params2 }) => taskInfo(params2[0])],
    ["GET", /^\/common\/program\/task\/([^/]+)\/state$/, ({ params: params2 }) => ({ state: "idle", taskId: params2[0], robotModel: "C500920" })],
    ["GET", /^\/common\/program\/task\/[^/]+\/sub-task-list$/, () => ({ subTaskList: [] })],
    ["GET", /^\/common\/program\/steps\/[^/]+$/, () => ({ steps: [], stepTree: [] })],
    ["GET", /^\/common\/program\/(?!current|main-tasks|task|steps)([^/]+)$/, ({ params: params2 }) => programInfo(params2[0])],
    ["GET", /^\/common\/get_joint_states$/, () => jointStates()],
    ["GET", /^\/common\/[^/]+\/robot-urdf-link-map$/, () => urdfLinkMap],
    ["GET", /^\/manipulate\/[^/]+\/call_config_controlbox$/, () => controlBox],
    ["GET", /^\/manipulate\/[^/]+\/call_config_robotarm$/, () => robotArm],
    ["GET", /^\/manipulate\/[^/]+\/call_config_weld$/, () => weldConfig],
    ["GET", /^\/manipulate\/[^/]+\/call_config_toollist$/, () => toolList],
    ["GET", /^\/manipulate\/[^/]+\/call_config_globpinlist$/, () => globalPinPointList],
    ["GET", /^\/manipulate\/[^/]+\/rb_api\/user_frames$/, () => userFrames],
    ["GET", /^\/manipulate\/[^/]+\/state_core$/, () => stateCore()],
    ["GET", /^\/log\/error_log_count_for_24h$/, () => ({ count: errorCount24h() })],
    ["GET", /^\/log\/list$/, ({ query }) => logList(query)]
  ];
  var seen2 = /* @__PURE__ */ new Set();
  var routeRest = (method, path, query, body) => {
    const M = method.toUpperCase();
    if (M !== "GET") console.info("[demo] req", M, path, JSON.stringify(body));
    for (const [rm, re, h] of routes) {
      const hit = rm === M && re.exec(path);
      if (hit) return h({ query, body, params: hit.slice(1) });
    }
    const key = `${M} ${path}`;
    if (!seen2.has(key)) {
      seen2.add(key);
      console.warn("[demo] unmocked REST:", key, Object.fromEntries(query), body);
    }
    if (!["GET", "HEAD", "OPTIONS"].includes(M)) throw new UnsupportedDemoRequestError(M, path);
    return {};
  };

  // demo-artifact/mock/initial-state.ts
  var IO_LENGTH = {
    cboxDin: 16,
    cboxDout: 16,
    cboxAin: 4,
    cboxAout: 4,
    extDin: 16,
    extDout: 16,
    extAin: 4,
    extAout: 4,
    toolDin: 2,
    toolDout: 2,
    toolAin: 2
  };
  var DIGITAL = /* @__PURE__ */ new Set(["cboxDin", "cboxDout", "extDin", "extDout", "toolDin", "toolDout"]);
  var TOP_KEYS = ["workspace", "joints", "speedBar", "tool", "userFrame", "robotName", "io", "tools", "userFrames", "pinPoints", "programs", "loadedProgram"];
  var isRecord2 = (v) => !!v && typeof v === "object" && !Array.isArray(v);
  var finite = (v) => typeof v === "number" && Number.isFinite(v);
  function validateSeedSteps(where, v, errors) {
    if (!Array.isArray(v)) return void errors.push(`${where}: \uBC30\uC5F4\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4`);
    v.forEach((s, i) => {
      const w2 = `${where}[${i}]`;
      if (!isRecord2(s)) return void errors.push(`${w2}: \uAC1D\uCCB4\uC5EC\uC57C \uD569\uB2C8\uB2E4`);
      for (const k of Object.keys(s)) if (!["method", "name", "summary", "funcName", "args", "children", "extra"].includes(k)) errors.push(`${w2}.${k}: \uC54C \uC218 \uC5C6\uB294 \uD56D\uBAA9\uC785\uB2C8\uB2E4 (\uAC00\uB2A5: method, name, summary, funcName, args, children, extra)`);
      if (typeof s.method !== "string" || !s.method) errors.push(`${w2}.method: \uBE48 \uBB38\uC790\uC5F4\uC774 \uC544\uB2CC \uBB38\uC790\uC5F4\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4`);
      for (const k of ["name", "summary", "funcName"]) if (s[k] !== void 0 && typeof s[k] !== "string") errors.push(`${w2}.${k}: \uBB38\uC790\uC5F4\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4`);
      if (s.args !== void 0 && !isRecord2(s.args)) errors.push(`${w2}.args: \uAC1D\uCCB4\uC5EC\uC57C \uD569\uB2C8\uB2E4`);
      if (s.extra !== void 0 && !isRecord2(s.extra)) errors.push(`${w2}.extra: \uAC1D\uCCB4\uC5EC\uC57C \uD569\uB2C8\uB2E4`);
      if (s.children !== void 0) validateSeedSteps(`${w2}.children`, s.children, errors);
    });
  }
  function validateInitialState(raw) {
    if (raw === void 0) return [];
    const errors = [];
    if (!isRecord2(raw)) return ["initialState: \uAC1D\uCCB4\uC5EC\uC57C \uD569\uB2C8\uB2E4"];
    const unknown = (where, o, allowed) => {
      for (const k of Object.keys(o)) if (!allowed.includes(k)) errors.push(`${where}.${k}: \uC54C \uC218 \uC5C6\uB294 \uD56D\uBAA9\uC785\uB2C8\uB2E4 (\uAC00\uB2A5: ${allowed.join(", ")})`);
    };
    const nums = (where, v, len, check = () => true, hint = "\uC22B\uC790") => {
      if (!Array.isArray(v) || v.length !== len || !v.every((n) => finite(n) && check(n))) errors.push(`${where}: ${hint} ${len}\uAC1C\uC758 \uBC30\uC5F4\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4`);
    };
    const slot = (where, key, count) => {
      if (!/^\d+$/.test(key) || Number(key) >= count) errors.push(`${where}.${key}: \uCE78 \uBC88\uD638\uB294 0~${count - 1} \uC785\uB2C8\uB2E4`);
    };
    unknown("initialState", raw, TOP_KEYS);
    if (raw.workspace !== void 0 && raw.workspace !== "empty" && raw.workspace !== "examples") errors.push('initialState.workspace: "empty" \uB610\uB294 "examples" \uC5EC\uC57C \uD569\uB2C8\uB2E4');
    if (raw.joints !== void 0) nums("initialState.joints", raw.joints, 7);
    if (raw.speedBar !== void 0 && !(finite(raw.speedBar) && raw.speedBar >= 0 && raw.speedBar <= 1)) errors.push("initialState.speedBar: 0~1 \uC0AC\uC774 \uC22B\uC790\uC5EC\uC57C \uD569\uB2C8\uB2E4");
    for (const [key, count] of [["tool", 8], ["userFrame", 8]]) {
      const v = raw[key];
      if (v !== void 0 && !(Number.isInteger(v) && v >= 0 && v < count)) errors.push(`initialState.${key}: 0~${count - 1} \uC815\uC218\uC5EC\uC57C \uD569\uB2C8\uB2E4`);
    }
    if (raw.robotName !== void 0 && (typeof raw.robotName !== "string" || !raw.robotName)) errors.push("initialState.robotName: \uBE48 \uBB38\uC790\uC5F4\uC774 \uC544\uB2CC \uBB38\uC790\uC5F4\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4");
    if (raw.io !== void 0) {
      if (!isRecord2(raw.io)) errors.push("initialState.io: \uAC1D\uCCB4\uC5EC\uC57C \uD569\uB2C8\uB2E4");
      else {
        unknown("initialState.io", raw.io, [...Object.keys(IO_LENGTH), "toolVoltage"]);
        for (const [key, len] of Object.entries(IO_LENGTH)) {
          if (raw.io[key] !== void 0) nums(`initialState.io.${key}`, raw.io[key], len, DIGITAL.has(key) ? (n) => n === 0 || n === 1 : () => true, DIGITAL.has(key) ? "0/1" : "\uC22B\uC790");
        }
        if (raw.io.toolVoltage !== void 0 && !finite(raw.io.toolVoltage)) errors.push("initialState.io.toolVoltage: \uC22B\uC790\uC5EC\uC57C \uD569\uB2C8\uB2E4");
      }
    }
    const records = (name, count, fields, each) => {
      const v = raw[name];
      if (v === void 0) return;
      if (!isRecord2(v)) return void errors.push(`initialState.${name}: \uAC1D\uCCB4\uC5EC\uC57C \uD569\uB2C8\uB2E4`);
      for (const [key, item] of Object.entries(v)) {
        const where = `initialState.${name}.${key}`;
        slot(`initialState.${name}`, key, count);
        if (!isRecord2(item)) {
          errors.push(`${where}: \uAC1D\uCCB4\uC5EC\uC57C \uD569\uB2C8\uB2E4`);
          continue;
        }
        unknown(where, item, fields);
        each(where, item);
      }
    };
    const text = (where, v) => {
      if (v !== void 0 && (typeof v !== "string" || !v)) errors.push(`${where}: \uBE48 \uBB38\uC790\uC5F4\uC774 \uC544\uB2CC \uBB38\uC790\uC5F4\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4`);
    };
    records("tools", 8, ["toolName", "comMass", "comOffset", "tcpOffset", "tcpEuler"], (where, o) => {
      text(`${where}.toolName`, o.toolName);
      if (o.comMass !== void 0 && !(finite(o.comMass) && o.comMass >= 0)) errors.push(`${where}.comMass: 0 \uC774\uC0C1 \uC22B\uC790\uC5EC\uC57C \uD569\uB2C8\uB2E4`);
      for (const k of ["comOffset", "tcpOffset", "tcpEuler"]) if (o[k] !== void 0) nums(`${where}.${k}`, o[k], 3);
    });
    records("userFrames", 8, ["name", "offset", "euler"], (where, o) => {
      text(`${where}.name`, o.name);
      for (const k of ["offset", "euler"]) if (o[k] !== void 0) nums(`${where}.${k}`, o[k], 3);
    });
    records("pinPoints", 16, ["name", "joints"], (where, o) => {
      text(`${where}.name`, o.name);
      if (o.joints !== void 0) nums(`${where}.joints`, o.joints, 7);
    });
    const names = /* @__PURE__ */ new Set();
    if (raw.programs !== void 0) {
      if (!Array.isArray(raw.programs)) errors.push("initialState.programs: \uBC30\uC5F4\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4");
      else raw.programs.forEach((p, i) => {
        const where = `initialState.programs[${i}]`;
        if (!isRecord2(p)) return void errors.push(`${where}: \uAC1D\uCCB4\uC5EC\uC57C \uD569\uB2C8\uB2E4`);
        unknown(where, p, ["name", "repeatCnt", "steps"]);
        if (p.steps !== void 0) validateSeedSteps(`${where}.steps`, p.steps, errors);
        if (typeof p.name !== "string" || !p.name) errors.push(`${where}.name: \uBE48 \uBB38\uC790\uC5F4\uC774 \uC544\uB2CC \uBB38\uC790\uC5F4\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4`);
        else if (names.has(p.name)) errors.push(`${where}.name: \uC774\uB984\uC774 \uACB9\uCE69\uB2C8\uB2E4 (${p.name})`);
        else names.add(p.name);
        if (p.repeatCnt !== void 0 && !(Number.isInteger(p.repeatCnt) && p.repeatCnt >= 1)) errors.push(`${where}.repeatCnt: 1 \uC774\uC0C1 \uC815\uC218\uC5EC\uC57C \uD569\uB2C8\uB2E4`);
      });
    }
    if (raw.loadedProgram !== void 0 && !names.has(raw.loadedProgram)) errors.push("initialState.loadedProgram: programs \uC5D0 \uC788\uB294 \uC774\uB984\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4");
    return errors;
  }
  function applyInitialState(raw) {
    const errors = validateInitialState(raw);
    if (errors.length) return errors;
    const s = raw ?? {};
    configureWorkspace(s.workspace ?? "empty");
    const rs = robotState;
    if (s.joints) rs.jointDeg = [...s.joints];
    if (s.speedBar !== void 0) rs.speedBar = s.speedBar;
    if (s.tool !== void 0) rs.toolNo = s.tool;
    if (s.userFrame !== void 0) rs.userNo = s.userFrame;
    if (s.robotName) robotInfo.info.robotName = s.robotName;
    for (const [key, value] of Object.entries(s.io ?? {})) {
      if (key === "toolVoltage") rs.io.toolVoltage = value;
      else rs.io[key] = [...value];
    }
    for (const [no, t] of Object.entries(s.tools ?? {})) {
      const dst = toolList[`tConfigs${no}`];
      if (t.toolName !== void 0) dst.toolName = t.toolName;
      if (t.comMass !== void 0) dst.comMass = t.comMass;
      if (t.comOffset) dst.comOffset.v = [...t.comOffset];
      if (t.tcpOffset) dst.tcpOffset.v = [...t.tcpOffset];
      if (t.tcpEuler) dst.tcpEuler.v = [...t.tcpEuler];
    }
    for (const [no, f] of Object.entries(s.userFrames ?? {})) {
      const dst = userFrames.user_frames[Number(no)];
      if (f.name !== void 0) dst.userfName = f.name;
      if (f.offset) dst.userfOffset.v = [...f.offset];
      if (f.euler) dst.userfEuler.v = [...f.euler];
    }
    const pins = globalPinPointList;
    for (const [no, p] of Object.entries(s.pinPoints ?? {})) {
      const i = Number(no);
      if (p.name !== void 0) pins.name[i] = p.name;
      if (p.joints) {
        pins.pinJ[i] = { tarValues: [...p.joints], tarFrame: -1, tarUnit: 0 };
        pins.pinL[i] = { tarValues: carteX(p.joints), tarFrame: 0, tarUnit: 0 };
      }
    }
    const ids = /* @__PURE__ */ new Map();
    for (const p of s.programs ?? []) {
      const id = createProgram({ name: p.name, repeatCnt: p.repeatCnt }).program.programId;
      ids.set(p.name, id);
      if (p.steps) seedSteps(id, p.steps);
    }
    if (s.loadedProgram) setLoadedProgram(ids.get(s.loadedProgram));
    rebaseRobot();
    rebaseProgram();
    return [];
  }

  // demo-artifact/runtime/loader.ts
  var demoId = "d005";
  var base = new URL("./", document.currentScript ? document.currentScript.src : location.href);
  var w = window;
  var log = (...a) => console.info("[artifact-loader]", ...a);
  var params = new URLSearchParams(location.search);
  var session = params.get("s") || Math.random().toString(36).slice(2, 8);
  w.__ARTIFACT_SESSION__ = session;
  var prefix = `${demoId}:${session}:`;
  var ownPrefix = `${demoId}:`;
  var lockName = `artifact-session:${prefix}`;
  if (navigator.locks) navigator.locks.request(lockName, () => new Promise(() => {
  }));
  var idbOpen = IDBFactory.prototype.open;
  IDBFactory.prototype.open = function(name, v) {
    return v === void 0 ? idbOpen.call(this, prefix + name) : idbOpen.call(this, prefix + name, v);
  };
  var idbDel = IDBFactory.prototype.deleteDatabase;
  IDBFactory.prototype.deleteDatabase = function(name) {
    return idbDel.call(this, prefix + name);
  };
  var ls = window.localStorage;
  var sp = Storage.prototype;
  var orig = { get: sp.getItem, set: sp.setItem, rm: sp.removeItem };
  sp.getItem = function(k) {
    return this === ls ? orig.get.call(this, prefix + k) : orig.get.call(this, k);
  };
  sp.setItem = function(k, v) {
    return this === ls ? orig.set.call(this, prefix + k, v) : orig.set.call(this, k, v);
  };
  sp.removeItem = function(k) {
    return this === ls ? orig.rm.call(this, prefix + k) : orig.rm.call(this, k);
  };
  async function cleanStale() {
    if (!navigator.locks) return;
    const sessions = /* @__PURE__ */ new Set();
    for (const d of await indexedDB.databases()) {
      const m = d.name?.startsWith(ownPrefix) && /^[^:]+:([^:]+):/.exec(d.name);
      if (m) sessions.add(m[1]);
    }
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      const m = k.startsWith(ownPrefix) && /^[^:]+:([^:]+):/.exec(k);
      if (m) sessions.add(m[1]);
    }
    sessions.delete(session);
    for (const sid of sessions) {
      await navigator.locks.request(`artifact-session:${ownPrefix}${sid}:`, { ifAvailable: true }, async (lock) => {
        if (!lock) return;
        for (const d of await indexedDB.databases()) if (d.name?.startsWith(`${ownPrefix}${sid}:`)) idbDel.call(indexedDB, d.name);
        const del = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k.startsWith(`${ownPrefix}${sid}:`)) del.push(k);
        }
        del.forEach((k) => orig.rm.call(localStorage, k));
      });
    }
  }
  navigator.serviceWorker.addEventListener("message", (ev) => {
    const d = ev.data;
    if (d?.type !== "rest" || !ev.ports[0]) return;
    try {
      const data = routeRest(d.method, d.path, new URLSearchParams(d.query), d.body);
      ev.ports[0].postMessage({ status: 200, body: JSON.stringify(data) });
    } catch (e) {
      ev.ports[0].postMessage({ status: 501, body: JSON.stringify({ error: String(e?.message ?? e) }) });
    }
  });
  var restBase = new URL("__rest/", base);
  var toRest = (input) => {
    try {
      const raw = String(input instanceof Request ? input.url : input);
      if (/^\/\/[^/.:?#]+(?:[/?#]|$)/.test(raw)) return new URL(raw.slice(2), restBase).href;
      const u = new URL(raw, location.href);
      if (u.protocol !== "http:" || u.port !== "3000") return null;
      return new URL(u.pathname.replace(/^\//, "") + u.search, restBase).href;
    } catch {
      return null;
    }
  };
  var xhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    return xhrOpen.call(this, method, toRest(url) ?? url, ...rest);
  };
  var nativeFetch = window.fetch.bind(window);
  window.fetch = ((input, init) => {
    const to = toRest(input);
    return nativeFetch(to ? input instanceof Request ? new Request(to, input) : to : input, init);
  });
  var sentExternal = w.__ARTIFACT_WS_LOG__ = [];
  var FakeWebSocket = class extends EventTarget {
    constructor(url) {
      super();
      this.url = url;
      sentExternal.push(url);
      const isSio = /\/common\/socket\.io\//.test(url);
      setTimeout(() => {
        if (!isSio) {
          this.dispatch("error", new Event("error"));
          this.finish(1006);
          return;
        }
        this.readyState = 1;
        this.dispatch("open", new Event("open"));
        this.out("0" + JSON.stringify({ sid: "artifact", upgrades: [], pingInterval: 25e3, pingTimeout: 2e4, maxPayload: 1e6 }));
        this.ping = setInterval(() => this.out("2"), 25e3);
        this.sock = io();
      }, 0);
    }
    url;
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
    CONNECTING = 0;
    OPEN = 1;
    CLOSING = 2;
    CLOSED = 3;
    readyState = 0;
    binaryType = "blob";
    protocol = "";
    extensions = "";
    bufferedAmount = 0;
    onopen = null;
    onmessage = null;
    onclose = null;
    onerror = null;
    sock = null;
    topics = /* @__PURE__ */ new Set();
    ping;
    dispatch(type, ev) {
      this["on" + type]?.call(this, ev);
      this.dispatchEvent(ev);
    }
    out(data) {
      setTimeout(() => this.readyState === 1 && this.dispatch("message", new MessageEvent("message", { data })), 0);
    }
    finish(code) {
      this.readyState = 3;
      clearInterval(this.ping);
      this.sock?.disconnect();
      this.dispatch("close", new CloseEvent("close", { code }));
    }
    send(raw) {
      if (this.readyState !== 1) return;
      if (raw === "3") return;
      if (raw === "2") return this.out("3");
      if (raw.startsWith("40")) return this.out("40" + JSON.stringify({ sid: "artifact" }));
      const m = /^42(\d*)(\[.*\])$/s.exec(raw);
      if (!m) return;
      const [ev, payload] = JSON.parse(m[2]);
      if (ev === "subscribe" || ev === "unsubscribe") {
        const topic = payload?.topic;
        if (ev === "subscribe" && !this.topics.has(topic)) {
          this.topics.add(topic);
          this.sock.on(topic, (data) => this.out("42" + JSON.stringify([topic, data])));
        }
        this.sock.emit(ev, payload);
      } else this.sock.emit(ev, payload);
      if (m[1]) this.out("43" + m[1] + "[]");
    }
    close() {
      if (this.readyState < 2) this.finish(1e3);
    }
  };
  w.WebSocket = FakeWebSocket;
  w.__RB_ASSETS_BASE_URL__ = new URL("svc-assets", base).href;
  var lang = params.get("lang") === "en" ? "en" : "ko";
  var scenariosBase = (() => {
    const raw = params.get("scenarios");
    if (!raw) return new URL("scenarios/", base);
    if (!/^\/[\w\-./]*$/.test(raw) || raw.includes("..") || raw.includes("//")) throw new Error("scenarios \uB294 \uAC19\uC740 \uCD9C\uCC98\uC758 \uC808\uB300 \uACBD\uB85C\uC5EC\uC57C \uD569\uB2C8\uB2E4");
    return new URL(raw.endsWith("/") ? raw : raw + "/", location.origin);
  })();
  var scenarioUrl = (id) => new URL(`${id}.json`, scenariosBase).href;
  localStorage.setItem("nexus_Language", lang);
  async function prepareState(scenarioId) {
    if (!scenarioId) {
      applyInitialState({ workspace: "empty" });
      return null;
    }
    if (!/^[\w-]+$/.test(scenarioId)) throw new Error("\uC2DC\uB098\uB9AC\uC624 ID\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4");
    const res = await fetch(scenarioUrl(scenarioId));
    if (!res.ok) throw new Error(`\uC2DC\uB098\uB9AC\uC624\uB97C \uC77D\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4: ${scenarioId} (${res.status})`);
    const sc = await res.json();
    const errors = applyInitialState(sc.initialState);
    if (errors.length) {
      console.error(`[artifact-loader] initialState \uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC544 \uC2DC\uC791\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4:
${errors.join("\n")}`);
      throw new Error("initialState \uC624\uB958");
    }
    return { route: typeof sc.route === "string" && sc.route.startsWith("/muscat/app/") ? sc.route : "/muscat/app/dashboard" };
  }
  async function boot() {
    const scenarioId = params.get("scenario");
    const prepared = await prepareState(scenarioId);
    const reg = await navigator.serviceWorker.register(new URL("sw.js", base).href, { scope: base.href });
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((res) => {
        navigator.serviceWorker.addEventListener("controllerchange", () => res(), { once: true });
        reg.active?.postMessage({ type: "claim" });
        setTimeout(res, 3e3);
      });
    }
    if (!navigator.serviceWorker.controller) throw new Error("\uC11C\uBE44\uC2A4 \uC6CC\uCEE4\uAC00 \uD398\uC774\uC9C0\uB97C \uC81C\uC5B4\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4");
    const html = await (await fetch(new URL("app/index.html", base).href)).text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    try {
      sessionStorage.setItem("artifact-entry", location.href);
    } catch {
    }
    history.replaceState(null, "", prepared?.route ?? "/muscat/app/dashboard");
    document.title = doc.title;
    const root = document.createElement("div");
    root.id = "root";
    document.body.append(root);
    for (const el of Array.from(doc.head.children)) {
      if (el.tagName === "SCRIPT" || el.tagName === "LINK" && el.getAttribute("rel") !== "icon") {
        const n = document.createElement(el.tagName.toLowerCase());
        for (const a of Array.from(el.attributes)) n.setAttribute(a.name, a.value);
        n.textContent = el.textContent;
        document.head.append(n);
      }
    }
    log("app injected", demoId, session);
    void cleanStale();
    if (scenarioId) await startTour(scenarioId);
  }
  function loadScript(src) {
    return new Promise((res, rej) => {
      const el = document.createElement("script");
      el.src = src;
      el.onload = () => res();
      el.onerror = () => rej(new Error("\uC2A4\uD06C\uB9BD\uD2B8\uB97C \uC77D\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4: " + src));
      document.head.append(el);
    });
  }
  async function startTour(id) {
    if (!/^[\w-]+$/.test(id)) throw new Error("\uC2DC\uB098\uB9AC\uC624 ID\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4");
    await loadScript(new URL("tour.js", base).href);
    const T = w.DemoTour;
    const scenario = await T.load(scenarioUrl(id), lang);
    const t0 = Date.now();
    while (Date.now() - t0 < 3e4 && !document.body.innerText.includes("CONNECTED")) await new Promise((r) => setTimeout(r, 200));
    T.start({
      scenario,
      shot: params.get("shot") === "1",
      // 스크린샷 촬영(shoot-scenarios.mjs): 카드·차단막 없이 강조와 번호 배지만
      onRestart: () => {
        const u = new URL("./", base);
        u.searchParams.set("scenario", id);
        u.searchParams.set("lang", lang);
        const sc = params.get("scenarios");
        if (sc) u.searchParams.set("scenarios", sc);
        location.assign(u.href);
      }
    });
    log("tour started", id);
  }
  boot().catch((e) => {
    log("boot failed", e);
    document.body.textContent = "DEMO \uC2DC\uC791 \uC2E4\uD328: " + e.message;
  });
})();
