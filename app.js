(() => {
  "use strict";

  const DEFAULT_TOPICS = {
    mainCamera: {
      label: "메인 카메라",
      name: "/camera/main/image/compressed",
      type: "sensor_msgs/msg/CompressedImage",
      staleMs: 3000
    },
    subCamera1: {
      label: "서브 카메라 1",
      name: "/camera/sub1/image/compressed",
      type: "sensor_msgs/msg/CompressedImage",
      staleMs: 3000
    },
    subCamera2: {
      label: "서브 카메라 2",
      name: "/camera/sub2/image/compressed",
      type: "sensor_msgs/msg/CompressedImage",
      staleMs: 3000
    },
    armCamera: {
      label: "로봇팔 카메라",
      name: "/camera/robot_arm/image/compressed",
      type: "sensor_msgs/msg/CompressedImage",
      staleMs: 3000
    },
    jointStates: {
      label: "로봇팔 관절",
      name: "/joint_states",
      type: "sensor_msgs/msg/JointState",
      staleMs: 2000
    },
    path: {
      label: "생성 경로",
      name: "/plan",
      type: "nav_msgs/msg/Path",
      staleMs: 5000
    },
    odom: {
      label: "오도메트리",
      name: "/odom",
      type: "nav_msgs/msg/Odometry",
      staleMs: 2500
    },
    imu: {
      label: "IMU",
      name: "/imu/data",
      type: "sensor_msgs/msg/Imu",
      staleMs: 2500
    },
    battery: {
      label: "배터리",
      name: "/battery_state",
      type: "sensor_msgs/msg/BatteryState",
      staleMs: 10000
    },
    robotConnected: {
      label: "로봇 연결",
      name: "/DOLbot/robot_connected",
      type: "std_msgs/msg/Bool",
      staleMs: 5000
    },
    collision: {
      label: "충격/충돌",
      name: "/DOLbot/collision",
      type: "std_msgs/msg/Bool",
      staleMs: 3000
    },
    sensorsConnected: {
      label: "센서 연결",
      name: "/DOLbot/sensors_connected",
      type: "std_msgs/msg/Bool",
      staleMs: 5000
    },
    missionStatus: {
      label: "임무 상태",
      name: "/DOLbot/mission_status",
      type: "std_msgs/msg/String",
      staleMs: 10000
    },
    diagnostics: {
      label: "진단",
      name: "/diagnostics",
      type: "diagnostic_msgs/msg/DiagnosticArray",
      staleMs: 10000
    }
  };

  const DEFAULT_ARM_MODEL = {
    jointOrder: [],
    linkLengths: [0.35, 0.30, 0.24, 0.16, 0.10, 0.08],
    angleOffsetsDeg: [90, 0, 0, 0, 0, 0],
    angleDirections: [1, 1, 1, 1, 1, 1],
    maxJoints: 8
  };

  const state = {
    ros: null,
    connected: false,
    connecting: false,
    demo: false,
    subscriptions: new Map(),
    topicConfig: loadTopicConfig(),
    armModel: loadArmModelConfig(),
    topicStats: new Map(),
    latestJointState: null,
    latestPath: null,
    latestOdom: null,
    latestImu: null,
    demoFrameId: null,
    demoStartedAt: 0,
    resizeObserver: null
  };

  const $ = (id) => document.getElementById(id);

  const dom = {
    rosbridgeUrl: $("rosbridgeUrl"),
    connectButton: $("connectButton"),
    disconnectButton: $("disconnectButton"),
    demoToggle: $("demoToggle"),
    settingsButton: $("settingsButton"),
    settingsDialog: $("settingsDialog"),
    topicSettingsGrid: $("topicSettingsGrid"),
    armModelSettingsGrid: $("armModelSettingsGrid"),
    resetTopicsButton: $("resetTopicsButton"),
    saveTopicsButton: $("saveTopicsButton"),
    systemClock: $("systemClock"),
    connectionBadge: $("connectionBadge"),
    connectionText: $("connectionText"),
    footerMessage: $("footerMessage"),
    eventLog: $("eventLog"),
    clearLogButton: $("clearLogButton"),
    overallHealth: $("overallHealth"),
    activeTopicCount: $("activeTopicCount"),
    topicHealthList: $("topicHealthList"),
    armKinematicsCanvas: $("armKinematicsCanvas"),
    pathCanvas: $("pathCanvas"),
    armPlaceholder: $("armPlaceholder"),
    jointStateList: $("jointStateList"),
    pathPlaceholder: $("pathPlaceholder")
  };

  const cameraBindings = {
    mainCamera: {
      image: $("mainCameraImage"),
      stage: $("mainCameraStage"),
      rate: $("mainCameraRate"),
      age: $("mainCameraAge"),
      topicLabel: $("mainCameraTopicLabel")
    },
    subCamera1: {
      image: $("subCamera1Image"),
      stage: $("subCamera1Stage"),
      rate: $("subCamera1Rate"),
      age: $("subCamera1Age"),
      topicLabel: $("subCamera1TopicLabel")
    },
    subCamera2: {
      image: $("subCamera2Image"),
      stage: $("subCamera2Stage"),
      rate: $("subCamera2Rate"),
      age: $("subCamera2Age"),
      topicLabel: $("subCamera2TopicLabel")
    },
    armCamera: {
      image: $("armCameraImage"),
      stage: $("armCameraStage"),
      rate: $("armCameraRate"),
      age: $("armCameraAge"),
      topicLabel: $("armCameraTopicLabel")
    }
  };

  function cloneDefaultTopics() {
    return JSON.parse(JSON.stringify(DEFAULT_TOPICS));
  }

  function loadTopicConfig() {
    try {
      const saved = JSON.parse(localStorage.getItem("DOLbotTopicConfig"));
      if (!saved || typeof saved !== "object") return cloneDefaultTopics();

      const merged = cloneDefaultTopics();
      Object.keys(merged).forEach((key) => {
        if (saved[key]?.name) merged[key].name = saved[key].name;
      });
      return merged;
    } catch (error) {
      console.warn("토픽 설정을 불러오지 못했습니다.", error);
      return cloneDefaultTopics();
    }
  }

  function saveTopicConfig() {
    localStorage.setItem("DOLbotTopicConfig", JSON.stringify(state.topicConfig));
  }

  function cloneDefaultArmModel() {
    return JSON.parse(JSON.stringify(DEFAULT_ARM_MODEL));
  }

  function loadArmModelConfig() {
    try {
      const saved = JSON.parse(localStorage.getItem("DOLbotArmModel"));
      if (!saved || typeof saved !== "object") return cloneDefaultArmModel();

      const model = cloneDefaultArmModel();
      if (Array.isArray(saved.jointOrder)) model.jointOrder = saved.jointOrder.map(String);
      if (Array.isArray(saved.linkLengths)) model.linkLengths = saved.linkLengths.map(Number).filter(Number.isFinite);
      if (Array.isArray(saved.angleOffsetsDeg)) model.angleOffsetsDeg = saved.angleOffsetsDeg.map(Number).filter(Number.isFinite);
      if (Array.isArray(saved.angleDirections)) model.angleDirections = saved.angleDirections.map(Number).map((value) => value < 0 ? -1 : 1);
      if (Number.isFinite(Number(saved.maxJoints))) model.maxJoints = Math.max(1, Math.min(16, Number(saved.maxJoints)));
      return model;
    } catch (error) {
      console.warn("로봇팔 모델 설정을 불러오지 못했습니다.", error);
      return cloneDefaultArmModel();
    }
  }

  function saveArmModelConfig() {
    localStorage.setItem("DOLbotArmModel", JSON.stringify(state.armModel));
  }

  function formatTime(date = new Date()) {
    return new Intl.DateTimeFormat("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).format(date);
  }

  function addLog(message, level = "info") {
    const item = document.createElement("li");
    item.dataset.level = level;
    const time = document.createElement("time");
    const text = document.createElement("span");
    time.textContent = formatTime();
    text.textContent = message;
    item.append(time, text);
    dom.eventLog.prepend(item);

    while (dom.eventLog.children.length > 80) {
      dom.eventLog.lastElementChild?.remove();
    }
  }

  function setConnectionState(mode, message) {
    dom.connectionBadge.className = `connection-badge connection-badge--${mode}`;
    dom.connectionText.textContent = message;

    const online = mode === "online";
    const busy = mode === "connecting";
    dom.connectButton.disabled = online || busy || state.demo;
    dom.disconnectButton.disabled = !online && !busy;
    dom.rosbridgeUrl.disabled = online || busy || state.demo;

    if (mode === "online") {
      dom.footerMessage.textContent = "ROS 토픽 수신 중";
    } else if (mode === "demo") {
      dom.footerMessage.textContent = "명시적 데모 모드: 실제 장비 데이터가 아닙니다.";
    } else if (mode === "connecting") {
      dom.footerMessage.textContent = "rosbridge WebSocket 연결 시도 중";
    } else {
      dom.footerMessage.textContent = "실제 장비 토픽을 수신하기 전까지 값은 생성되지 않습니다.";
    }
  }

  function initTopicStats() {
    state.topicStats.clear();
    Object.keys(state.topicConfig).forEach((key) => {
      state.topicStats.set(key, {
        count: 0,
        lastSeen: 0,
        lastRateSampleAt: performance.now(),
        lastRateCount: 0,
        hz: 0
      });
    });
  }

  function markTopic(key) {
    const stat = state.topicStats.get(key);
    if (!stat) return;
    stat.count += 1;
    stat.lastSeen = Date.now();
  }

  function connectRos() {
    if (state.connected || state.connecting || state.demo) return;

    const url = dom.rosbridgeUrl.value.trim();
    if (!/^wss?:\/\//i.test(url)) {
      addLog("ROSBRIDGE 주소는 ws:// 또는 wss://로 시작해야 합니다.", "error");
      return;
    }

    if (typeof window.ROSLIB === "undefined") {
      addLog("roslibjs를 불러오지 못했습니다. 네트워크 또는 CDN을 확인하십시오.", "error");
      setConnectionState("offline", "ROSLIB LOAD ERROR");
      return;
    }

    state.connecting = true;
    setConnectionState("connecting", "CONNECTING");
    addLog(`${url} 연결 시도`);

    const ros = new ROSLIB.Ros();
    state.ros = ros;

    ros.on("connection", () => {
      state.connected = true;
      state.connecting = false;
      setConnectionState("online", "ROS CONNECTED");
      addLog("rosbridge 연결 성공");
      subscribeAll();
    });

    ros.on("error", (error) => {
      console.error(error);
      addLog(`rosbridge 오류: ${extractErrorMessage(error)}`, "error");
      state.connecting = false;
      if (!state.connected) setConnectionState("offline", "CONNECTION ERROR");
    });

    ros.on("close", () => {
      const wasConnected = state.connected;
      state.connected = false;
      state.connecting = false;
      clearSubscriptions();
      setConnectionState("offline", "DISCONNECTED");
      if (wasConnected) addLog("rosbridge 연결 종료", "warning");
    });

    try {
      ros.connect(url);
    } catch (error) {
      state.connecting = false;
      setConnectionState("offline", "CONNECTION ERROR");
      addLog(`연결 예외: ${extractErrorMessage(error)}`, "error");
    }
  }

  function disconnectRos() {
    clearSubscriptions();
    if (state.ros) {
      try {
        state.ros.close();
      } catch (error) {
        console.warn(error);
      }
    }
    state.ros = null;
    state.connected = false;
    state.connecting = false;
    setConnectionState("offline", "DISCONNECTED");
    addLog("사용자가 연결을 해제했습니다.");
  }

  function extractErrorMessage(error) {
    if (typeof error === "string") return error;
    if (error?.message) return error.message;
    if (error?.type) return error.type;
    return "알 수 없는 오류";
  }

  function subscribeAll() {
    clearSubscriptions();
    initTopicStats();

    subscribeTopic("mainCamera", handleCompressedImage);
    subscribeTopic("subCamera1", handleCompressedImage);
    subscribeTopic("subCamera2", handleCompressedImage);
    subscribeTopic("armCamera", handleCompressedImage);
    subscribeTopic("jointStates", handleJointState);
    subscribeTopic("path", handlePath);
    subscribeTopic("odom", handleOdometry);
    subscribeTopic("imu", handleImu);
    subscribeTopic("battery", handleBattery);
    subscribeTopic("robotConnected", handleRobotConnected);
    subscribeTopic("collision", handleCollision);
    subscribeTopic("sensorsConnected", handleSensorsConnected);
    subscribeTopic("missionStatus", handleMissionStatus);
    subscribeTopic("diagnostics", handleDiagnostics);
    updateTopicLabels();
    renderTopicHealth();
  }

  function subscribeTopic(key, handler) {
    const config = state.topicConfig[key];
    if (!config?.name || !state.ros) return;

    try {
      const topic = new ROSLIB.Topic({
        ros: state.ros,
        name: config.name,
        messageType: config.type,
        throttle_rate: key.includes("Camera") ? 0 : 50,
        queue_length: 1,
        compression: "none"
      });

      topic.subscribe((message) => {
        markTopic(key);
        handler(message, key);
      });

      state.subscriptions.set(key, topic);
    } catch (error) {
      addLog(`${config.label} 구독 실패: ${extractErrorMessage(error)}`, "error");
    }
  }

  function clearSubscriptions() {
    state.subscriptions.forEach((topic) => {
      try {
        topic.unsubscribe();
      } catch (error) {
        console.warn(error);
      }
    });
    state.subscriptions.clear();
  }

  function handleCompressedImage(message, key) {
    const binding = cameraBindings[key];
    if (!binding || !message?.data) return;

    const format = String(message.format || "jpeg").toLowerCase();
    const mime = format.includes("png") ? "image/png" : "image/jpeg";
    const src = toImageDataUrl(message.data, mime);
    if (!src) return;

    binding.image.onload = () => {
      binding.stage.classList.add("has-signal");
    };
    binding.image.onerror = () => {
      binding.stage.classList.remove("has-signal");
      addLog(`${state.topicConfig[key].label} 이미지 디코딩 실패`, "warning");
    };
    binding.image.src = src;
  }

  function toImageDataUrl(data, mime) {
    if (typeof data === "string") {
      if (data.startsWith("data:image/")) return data;
      return `data:${mime};base64,${data}`;
    }

    if (Array.isArray(data) || ArrayBuffer.isView(data)) {
      try {
        const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
        let binary = "";
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
          binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
        }
        return `data:${mime};base64,${btoa(binary)}`;
      } catch (error) {
        console.warn("이미지 변환 실패", error);
      }
    }
    return null;
  }

  function handleJointState(message) {
    if (!Array.isArray(message?.name) || !Array.isArray(message?.position)) return;

    const resolved = resolveArmJointState(message);
    if (!resolved.names.length) {
      addLog("JointState에서 시각화할 관절을 찾지 못했습니다.", "warning");
      return;
    }

    state.latestJointState = resolved;
    drawArmKinematics(resolved);
    renderJointStateList(resolved);
    dom.armPlaceholder.classList.add("hidden");

    $("armJointCount").textContent = String(resolved.names.length);
    $("armReach").textContent = `${resolved.reach.toFixed(2)} m`;
    $("endEffectorPosition").textContent =
      `EE X ${resolved.endEffector.x.toFixed(2)} / Z ${resolved.endEffector.z.toFixed(2)}`;
  }

  function resolveArmJointState(message) {
    const incomingNames = message.name.map(String);
    const indexByName = new Map(incomingNames.map((name, index) => [name, index]));
    const configuredOrder = state.armModel.jointOrder.filter((name) => indexByName.has(name));
    const names = (configuredOrder.length ? configuredOrder : incomingNames)
      .slice(0, state.armModel.maxJoints);

    const positions = names.map((name) => {
      const value = Number(message.position[indexByName.get(name)]);
      return Number.isFinite(value) ? value : 0;
    });

    const velocities = names.map((name) => {
      const index = indexByName.get(name);
      const value = Number(message.velocity?.[index]);
      return Number.isFinite(value) ? value : null;
    });

    let x = 0;
    let z = 0;
    let cumulativeAngle = 0;
    const points = [{ x, z }];
    const linkAngles = [];
    const linkLengths = [];

    names.forEach((name, index) => {
      const length = getArmArrayValue(state.armModel.linkLengths, index, 0.15, true);
      const offsetRad = degToRad(getArmArrayValue(state.armModel.angleOffsetsDeg, index, 0));
      const direction = getArmArrayValue(state.armModel.angleDirections, index, 1) < 0 ? -1 : 1;
      cumulativeAngle += direction * positions[index] + offsetRad;

      x += length * Math.cos(cumulativeAngle);
      z += length * Math.sin(cumulativeAngle);
      points.push({ x, z });
      linkAngles.push(cumulativeAngle);
      linkLengths.push(length);
    });

    const endEffector = points[points.length - 1];
    return {
      names,
      positions,
      velocities,
      points,
      linkAngles,
      linkLengths,
      endEffector,
      reach: Math.hypot(endEffector.x, endEffector.z),
      totalLength: linkLengths.reduce((sum, value) => sum + value, 0)
    };
  }

  function getArmArrayValue(values, index, fallback, positiveOnly = false) {
    const direct = Number(values[index]);
    const last = Number(values[values.length - 1]);
    const value = Number.isFinite(direct) ? direct : Number.isFinite(last) ? last : fallback;
    if (positiveOnly && value <= 0) return fallback;
    return value;
  }

  function renderJointStateList(model) {
    const fragment = document.createDocumentFragment();

    model.names.forEach((name, index) => {
      const row = document.createElement("div");
      row.className = "joint-state-row";

      const nameNode = document.createElement("span");
      nameNode.className = "joint-name";
      nameNode.title = name;
      nameNode.textContent = name;

      const angleNode = document.createElement("span");
      angleNode.className = "joint-angle";
      angleNode.textContent = `${radToDeg(model.positions[index]).toFixed(1)}°`;

      const velocityNode = document.createElement("span");
      velocityNode.className = "joint-velocity";
      const velocity = model.velocities[index];
      velocityNode.textContent = velocity === null ? "-- rad/s" : `${velocity.toFixed(2)} rad/s`;

      row.append(nameNode, angleNode, velocityNode);
      fragment.append(row);
    });

    dom.jointStateList.replaceChildren(fragment);
  }

  function handlePath(message) {
    if (!Array.isArray(message?.poses)) return;
    state.latestPath = message;
    drawPath(message);
    dom.pathPlaceholder.classList.add("hidden");

    $("pathPoseCount").textContent = String(message.poses.length);
    $("pathLength").textContent = `${calculatePathLength(message.poses).toFixed(1)} m`;
    $("pathFrame").textContent = `FRAME: ${message.header?.frame_id || "--"}`;
  }

  function handleOdometry(message) {
    const pose = message?.pose?.pose;
    const twist = message?.twist?.twist;
    if (!pose?.position || !pose?.orientation) return;

    const rpy = quaternionToRpy(pose.orientation);
    const vx = Number(twist?.linear?.x || 0);
    const vy = Number(twist?.linear?.y || 0);
    const speed = Math.hypot(vx, vy);

    state.latestOdom = {
      x: Number(pose.position.x || 0),
      y: Number(pose.position.y || 0),
      yaw: rpy.yaw,
      speed,
      frameId: message.header?.frame_id || ""
    };

    $("odomX").textContent = `${state.latestOdom.x.toFixed(2)} m`;
    $("odomY").textContent = `${state.latestOdom.y.toFixed(2)} m`;
    $("odomYaw").textContent = `${radToDeg(rpy.yaw).toFixed(1)}°`;
    $("linearSpeed").textContent = `${speed.toFixed(2)} m/s`;
    $("hudSpeed").textContent = `${speed.toFixed(2)} m/s`;
    $("cameraAzimuth").textContent = `${normalizeDegrees(radToDeg(rpy.yaw)).toFixed(1).padStart(5, "0")}°`;

    if (state.latestPath) drawPath(state.latestPath);
  }

  function handleImu(message) {
    if (!message?.orientation) return;
    const rpy = quaternionToRpy(message.orientation);
    state.latestImu = rpy;
    $("imuRoll").textContent = `${radToDeg(rpy.roll).toFixed(1)}°`;
    $("imuPitch").textContent = `${radToDeg(rpy.pitch).toFixed(1)}°`;
    $("cameraElevation").textContent = `${signedNumber(radToDeg(rpy.pitch), 1)}°`;
  }

  function handleBattery(message) {
    let percentage = Number(message?.percentage);
    if (Number.isFinite(percentage)) {
      if (percentage <= 1.01) percentage *= 100;
      percentage = Math.max(0, Math.min(100, percentage));
      $("batteryPercentage").textContent = `${percentage.toFixed(0)}%`;
      $("batteryGauge").style.setProperty("--battery", `${percentage}%`);
    }

    const voltage = Number(message?.voltage);
    const current = Number(message?.current);
    $("batteryVoltage").textContent = Number.isFinite(voltage) ? `${voltage.toFixed(1)} V` : "-- V";
    $("batteryCurrent").textContent = Number.isFinite(current) ? `${current.toFixed(1)} A` : "-- A";
  }

  function handleRobotConnected(message) {
    const connected = Boolean(message?.data);
    updateStatusCard(
      "robotConnectedCard",
      "robotConnectedValue",
      connected ? "연결 정상" : "연결 끊김",
      connected ? "ok" : "danger"
    );
  }

  function handleCollision(message) {
    const collision = Boolean(message?.data);
    updateStatusCard(
      "collisionCard",
      "collisionValue",
      collision ? "충격 감지" : "정상",
      collision ? "danger" : "ok"
    );

    if (collision) addLog("충격 또는 충돌 신호 감지", "error");
  }

  function handleSensorsConnected(message) {
    const connected = Boolean(message?.data);
    updateStatusCard(
      "sensorConnectedCard",
      "sensorConnectedValue",
      connected ? "센서 정상" : "센서 이상",
      connected ? "ok" : "danger"
    );
  }

  function handleMissionStatus(message) {
    const text = String(message?.data || "").trim();
    if (text) $("missionStatus").textContent = text.toUpperCase();
  }

  function handleDiagnostics(message) {
    if (!Array.isArray(message?.status)) return;

    const levels = message.status.map((status) => Number(status.level || 0));
    const worst = levels.length ? Math.max(...levels) : 0;
    const score = worst <= 0 ? 100 : worst === 1 ? 75 : 35;
    dom.overallHealth.textContent = `${score}%`;

    message.status
      .filter((status) => Number(status.level || 0) >= 1)
      .slice(0, 4)
      .forEach((status) => {
        const level = Number(status.level || 0) >= 2 ? "error" : "warning";
        addLog(`[DIAG] ${status.name || "unknown"}: ${status.message || "상태 이상"}`, level);
      });
  }

  function updateStatusCard(cardId, valueId, text, mode) {
    const card = $(cardId);
    card.className = `status-card status-card--${mode}`;
    $(valueId).textContent = text;
  }

  function quaternionToRpy(q) {
    const x = Number(q.x || 0);
    const y = Number(q.y || 0);
    const z = Number(q.z || 0);
    const w = Number(q.w ?? 1);

    const sinrCosp = 2 * (w * x + y * z);
    const cosrCosp = 1 - 2 * (x * x + y * y);
    const roll = Math.atan2(sinrCosp, cosrCosp);

    const sinp = 2 * (w * y - z * x);
    const pitch = Math.abs(sinp) >= 1 ? Math.sign(sinp) * Math.PI / 2 : Math.asin(sinp);

    const sinyCosp = 2 * (w * z + x * y);
    const cosyCosp = 1 - 2 * (y * y + z * z);
    const yaw = Math.atan2(sinyCosp, cosyCosp);

    return { roll, pitch, yaw };
  }

  function radToDeg(rad) {
    return rad * 180 / Math.PI;
  }

  function degToRad(deg) {
    return deg * Math.PI / 180;
  }

  function normalizeDegrees(deg) {
    return ((deg % 360) + 360) % 360;
  }

  function signedNumber(value, digits = 1) {
    const fixed = Math.abs(value).toFixed(digits);
    return `${value >= 0 ? "+" : "-"}${fixed}`;
  }

  function calculatePathLength(poses) {
    let total = 0;
    for (let i = 1; i < poses.length; i += 1) {
      const a = poses[i - 1]?.pose?.position;
      const b = poses[i]?.pose?.position;
      if (!a || !b) continue;
      total += Math.hypot(Number(b.x) - Number(a.x), Number(b.y) - Number(a.y));
    }
    return total;
  }

  function prepareCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, width: rect.width, height: rect.height };
  }

  function drawArmKinematics(model) {
    const { ctx, width, height } = prepareCanvas(dom.armKinematicsCanvas);
    ctx.clearRect(0, 0, width, height);

    if (!model?.points?.length) return;

    const totalLength = Math.max(model.totalLength, 0.1);
    const margin = 32;
    const scale = Math.max(
      10,
      Math.min((width - margin * 2) / (totalLength * 2), (height - margin * 2) / (totalLength * 2))
    );
    const originX = width / 2;
    const originY = height / 2 + 10;

    const toCanvas = (point) => ({
      x: originX + point.x * scale,
      y: originY - point.z * scale
    });

    ctx.save();

    ctx.strokeStyle = "rgba(77, 163, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin, originY);
    ctx.lineTo(width - margin, originY);
    ctx.moveTo(originX, margin);
    ctx.lineTo(originX, height - margin);
    ctx.stroke();

    const ringStep = totalLength / 4;
    ctx.setLineDash([4, 5]);
    for (let index = 1; index <= 4; index += 1) {
      ctx.beginPath();
      ctx.arc(originX, originY, ringStep * index * scale, Math.PI, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    const canvasPoints = model.points.map(toCanvas);

    ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
    ctx.lineWidth = 13;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    canvasPoints.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();

    ctx.strokeStyle = "#4da3ff";
    ctx.shadowColor = "rgba(77, 163, 255, 0.46)";
    ctx.shadowBlur = 8;
    ctx.lineWidth = 7;
    ctx.beginPath();
    canvasPoints.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;

    canvasPoints.forEach((point, index) => {
      ctx.fillStyle = index === canvasPoints.length - 1 ? "#e8ad55" : "#0b1118";
      ctx.strokeStyle = index === canvasPoints.length - 1 ? "#e8ad55" : "#e7eef5";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(point.x, point.y, index === 0 ? 8 : 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (index > 0) {
        ctx.fillStyle = "#8092a4";
        ctx.font = '10px "IBM Plex Mono", monospace';
        ctx.fillText(`J${index}`, point.x + 8, point.y - 8);
      }
    });

    const base = canvasPoints[0];
    ctx.fillStyle = "#111a23";
    ctx.strokeStyle = "#4da3ff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(base.x - 20, base.y + 18);
    ctx.lineTo(base.x + 20, base.y + 18);
    ctx.lineTo(base.x + 13, base.y + 5);
    ctx.lineTo(base.x - 13, base.y + 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (model.linkAngles.length) {
      const end = canvasPoints[canvasPoints.length - 1];
      const angle = model.linkAngles[model.linkAngles.length - 1];
      ctx.save();
      ctx.translate(end.x, end.y);
      ctx.rotate(-angle);
      ctx.fillStyle = "#e8ad55";
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-5, -6);
      ctx.lineTo(-5, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = "rgba(231, 238, 245, 0.68)";
    ctx.font = '10px "IBM Plex Mono", monospace';
    ctx.fillText("+X", width - 31, originY - 7);
    ctx.fillText("+Z", originX + 7, margin + 8);

    ctx.restore();
  }

  function drawPath(pathMessage) {
    const { ctx, width, height } = prepareCanvas(dom.pathCanvas);
    ctx.clearRect(0, 0, width, height);

    const points = pathMessage.poses
      .map((entry) => entry?.pose?.position)
      .filter(Boolean)
      .map((position) => ({ x: Number(position.x), y: Number(position.y) }))
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));

    if (points.length < 1) return;

    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    let minX = Math.min(...xs);
    let maxX = Math.max(...xs);
    let minY = Math.min(...ys);
    let maxY = Math.max(...ys);

    if (Math.abs(maxX - minX) < 0.5) {
      minX -= 0.25;
      maxX += 0.25;
    }
    if (Math.abs(maxY - minY) < 0.5) {
      minY -= 0.25;
      maxY += 0.25;
    }

    const padding = 24;
    const scaleX = (width - padding * 2) / (maxX - minX);
    const scaleY = (height - padding * 2) / (maxY - minY);
    const scale = Math.min(scaleX, scaleY);

    const toCanvas = (point) => ({
      x: padding + (point.x - minX) * scale,
      y: height - padding - (point.y - minY) * scale
    });

    ctx.lineWidth = 3;
    ctx.strokeStyle = "#4da3ff";
    ctx.shadowColor = "rgba(77, 163, 255, 0.46)";
    ctx.shadowBlur = 7;
    ctx.beginPath();

    points.forEach((point, index) => {
      const p = toCanvas(point);
      if (index === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;

    const start = toCanvas(points[0]);
    const end = toCanvas(points[points.length - 1]);

    ctx.fillStyle = "#65c7f7";
    ctx.beginPath();
    ctx.arc(start.x, start.y, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#e8ad55";
    ctx.beginPath();
    ctx.arc(end.x, end.y, 6, 0, Math.PI * 2);
    ctx.fill();

    const pathFrame = pathMessage.header?.frame_id || "";
    if (state.latestOdom && pathFrame && state.latestOdom.frameId === pathFrame) {
      const robot = toCanvas({ x: state.latestOdom.x, y: state.latestOdom.y });
      ctx.save();
      ctx.translate(robot.x, robot.y);
      ctx.rotate(-state.latestOdom.yaw + Math.PI / 2);
      ctx.fillStyle = "#e7eef5";
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(-6, 7);
      ctx.lineTo(6, 7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function updateRatesAndAges() {
    const nowPerf = performance.now();
    const now = Date.now();
    let active = 0;

    state.topicStats.forEach((stat, key) => {
      const elapsed = (nowPerf - stat.lastRateSampleAt) / 1000;
      if (elapsed >= 1) {
        stat.hz = (stat.count - stat.lastRateCount) / elapsed;
        stat.lastRateCount = stat.count;
        stat.lastRateSampleAt = nowPerf;
      }

      const age = stat.lastSeen ? now - stat.lastSeen : Infinity;
      const isActive = age <= state.topicConfig[key].staleMs;
      if (isActive) active += 1;

      if (cameraBindings[key]) {
        cameraBindings[key].rate.textContent = `${stat.hz.toFixed(1)} Hz`;
        cameraBindings[key].age.textContent = stat.lastSeen ? formatAge(age) : "대기 중";
        if (!isActive && stat.lastSeen) {
          cameraBindings[key].stage.classList.remove("has-signal");
        }
      }

      const rateElement = $(`${key}Rate`);
      if (rateElement && !cameraBindings[key]) {
        rateElement.textContent = `${stat.hz.toFixed(1)} Hz`;
      }
    });

    dom.activeTopicCount.textContent = `${active} / ${state.topicStats.size} ACTIVE`;
    renderTopicHealth();

    if (!state.connected && !state.demo) {
      dom.overallHealth.textContent = "--";
    }
  }

  function formatAge(ageMs) {
    if (ageMs < 1000) return `${Math.round(ageMs)} ms`;
    return `${(ageMs / 1000).toFixed(1)} s`;
  }

  function renderTopicHealth() {
    const fragment = document.createDocumentFragment();
    const now = Date.now();

    state.topicStats.forEach((stat, key) => {
      const row = document.createElement("div");
      const age = stat.lastSeen ? now - stat.lastSeen : Infinity;
      const active = age <= state.topicConfig[key].staleMs;
      row.className = `topic-health-row ${active ? "active" : stat.lastSeen ? "stale" : ""}`;

      const dot = document.createElement("span");
      dot.className = "topic-dot";

      const name = document.createElement("span");
      name.className = "topic-name";
      name.title = state.topicConfig[key].name;
      name.textContent = state.topicConfig[key].name;

      const ageNode = document.createElement("span");
      ageNode.className = "topic-age";
      ageNode.textContent = stat.lastSeen ? formatAge(age) : "--";

      row.append(dot, name, ageNode);
      fragment.append(row);
    });

    dom.topicHealthList.replaceChildren(fragment);
  }

  function buildSettingsForm() {
    const fragment = document.createDocumentFragment();

    Object.entries(state.topicConfig).forEach(([key, config]) => {
      const wrapper = document.createElement("div");
      wrapper.className = "topic-setting";

      const label = document.createElement("label");
      const title = document.createElement("strong");
      const type = document.createElement("small");
      title.textContent = config.label;
      type.textContent = config.type;
      label.append(title, type);

      const input = document.createElement("input");
      input.id = `topicInput-${key}`;
      input.dataset.topicKey = key;
      input.value = config.name;
      input.spellcheck = false;

      wrapper.append(label, input);
      fragment.append(wrapper);
    });

    dom.topicSettingsGrid.replaceChildren(fragment);
    buildArmModelSettings();
  }

  function buildArmModelSettings() {
    const fields = [
      {
        key: "jointOrder",
        label: "관절 순서",
        help: "쉼표 구분. 비워두면 JointState 수신 순서 사용",
        value: state.armModel.jointOrder.join(", ")
      },
      {
        key: "linkLengths",
        label: "링크 길이 [m]",
        help: "베이스부터 엔드이펙터 방향",
        value: state.armModel.linkLengths.join(", ")
      },
      {
        key: "angleOffsetsDeg",
        label: "영점 오프셋 [deg]",
        help: "각 관절에 누적 적용. 첫 값 90이면 위쪽 시작",
        value: state.armModel.angleOffsetsDeg.join(", ")
      },
      {
        key: "angleDirections",
        label: "회전 방향",
        help: "관절별 1 또는 -1",
        value: state.armModel.angleDirections.join(", ")
      },
      {
        key: "maxJoints",
        label: "최대 관절 수",
        help: "화면에 사용할 최대 관절 개수",
        value: String(state.armModel.maxJoints)
      }
    ];

    const fragment = document.createDocumentFragment();
    fields.forEach((field) => {
      const wrapper = document.createElement("div");
      wrapper.className = "arm-model-setting";

      const label = document.createElement("label");
      const title = document.createElement("strong");
      const help = document.createElement("small");
      title.textContent = field.label;
      help.textContent = field.help;
      label.append(title, help);

      const input = document.createElement("input");
      input.id = `armModelInput-${field.key}`;
      input.dataset.armModelKey = field.key;
      input.value = field.value;
      input.spellcheck = false;

      wrapper.append(label, input);
      fragment.append(wrapper);
    });

    dom.armModelSettingsGrid.replaceChildren(fragment);
  }

  function parseCsvStrings(value) {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }

  function parseCsvNumbers(value) {
    return value
      .split(",")
      .map((item) => Number(item.trim()))
      .filter(Number.isFinite);
  }

  function saveSettingsFromDialog() {
    dom.topicSettingsGrid.querySelectorAll("input[data-topic-key]").forEach((input) => {
      const key = input.dataset.topicKey;
      const value = input.value.trim();
      if (value) state.topicConfig[key].name = value.startsWith("/") ? value : `/${value}`;
    });

    const jointOrderInput = $("armModelInput-jointOrder");
    const linkLengthsInput = $("armModelInput-linkLengths");
    const offsetsInput = $("armModelInput-angleOffsetsDeg");
    const directionsInput = $("armModelInput-angleDirections");
    const maxJointsInput = $("armModelInput-maxJoints");

    state.armModel.jointOrder = parseCsvStrings(jointOrderInput?.value || "");
    state.armModel.linkLengths = parseCsvNumbers(linkLengthsInput?.value || "")
      .filter((value) => value > 0);
    state.armModel.angleOffsetsDeg = parseCsvNumbers(offsetsInput?.value || "");
    state.armModel.angleDirections = parseCsvNumbers(directionsInput?.value || "")
      .map((value) => value < 0 ? -1 : 1);
    state.armModel.maxJoints = Math.max(1, Math.min(16, Number(maxJointsInput?.value) || 8));

    if (!state.armModel.linkLengths.length) {
      state.armModel.linkLengths = cloneDefaultArmModel().linkLengths;
    }

    saveTopicConfig();
    saveArmModelConfig();
    updateTopicLabels();
    initTopicStats();
    renderTopicHealth();
    dom.settingsDialog.close();
    addLog("토픽 설정 저장 완료");

    if (state.connected) {
      subscribeAll();
      addLog("변경된 토픽으로 재구독했습니다.");
    }
  }

  function resetTopicSettings() {
    state.topicConfig = cloneDefaultTopics();
    state.armModel = cloneDefaultArmModel();
    buildSettingsForm();
  }

  function updateTopicLabels() {
    Object.entries(cameraBindings).forEach(([key, binding]) => {
      binding.topicLabel.textContent = state.topicConfig[key].name;
    });
  }

  function toggleDemo(enabled) {
    state.demo = enabled;

    if (enabled) {
      if (state.connected || state.connecting) disconnectRos();
      setConnectionState("demo", "DEMO MODE");
      addLog("명시적 데모 모드를 시작했습니다.", "warning");
      startDemo();
    } else {
      stopDemo();
      resetDisplayedData();
      setConnectionState("offline", "DISCONNECTED");
      addLog("데모 모드를 종료했습니다.");
    }
  }

  function startDemo() {
    stopDemo();
    initTopicStats();
    state.demoStartedAt = performance.now();

    const animate = (now) => {
      if (!state.demo) return;
      const t = (now - state.demoStartedAt) / 1000;

      demoTelemetry(t);
      demoArm(t);
      demoPath(t);
      demoCamera("mainCamera", t, "PRIMARY OPTICAL FEED", 48);
      demoCamera("subCamera1", t, "FRONT-LEFT", 30);
      demoCamera("subCamera2", t, "FRONT-RIGHT", 30);
      demoCamera("armCamera", t, "END-EFFECTOR VIEW", 24);

      state.demoFrameId = requestAnimationFrame(animate);
    };

    state.demoFrameId = requestAnimationFrame(animate);
  }

  function stopDemo() {
    if (state.demoFrameId) cancelAnimationFrame(state.demoFrameId);
    state.demoFrameId = null;
  }

  function demoTelemetry(t) {
    const x = 2.5 + t * 0.06;
    const y = 1.2 + Math.sin(t * 0.22) * 0.4;
    const yaw = Math.sin(t * 0.18) * 0.2;
    const speed = 0.6 + Math.sin(t * 0.5) * 0.08;

    state.latestOdom = { x, y, yaw, speed, frameId: "map" };
    $("odomX").textContent = `${x.toFixed(2)} m`;
    $("odomY").textContent = `${y.toFixed(2)} m`;
    $("odomYaw").textContent = `${radToDeg(yaw).toFixed(1)}°`;
    $("linearSpeed").textContent = `${speed.toFixed(2)} m/s`;
    $("hudSpeed").textContent = `${speed.toFixed(2)} m/s`;
    $("imuRoll").textContent = `${(Math.sin(t) * 1.1).toFixed(1)}°`;
    $("imuPitch").textContent = `${(Math.cos(t * 0.8) * 0.8).toFixed(1)}°`;
    $("cameraAzimuth").textContent = `${normalizeDegrees(radToDeg(yaw)).toFixed(1).padStart(5, "0")}°`;
    $("cameraElevation").textContent = `${signedNumber(Math.cos(t * 0.8) * 0.8, 1)}°`;
    $("batteryPercentage").textContent = "84%";
    $("batteryVoltage").textContent = "48.7 V";
    $("batteryCurrent").textContent = "6.2 A";
    $("batteryGauge").style.setProperty("--battery", "84%");
    $("missionStatus").textContent = "PATROL / DEMO";
    dom.overallHealth.textContent = "98%";

    updateStatusCard("robotConnectedCard", "robotConnectedValue", "데모 연결", "ok");
    updateStatusCard("collisionCard", "collisionValue", "정상", "ok");
    updateStatusCard("sensorConnectedCard", "sensorConnectedValue", "센서 정상", "ok");

    ["odom", "imu", "battery", "robotConnected", "collision", "sensorsConnected", "missionStatus", "diagnostics"].forEach((key) => {
      const stat = state.topicStats.get(key);
      if (stat) stat.lastSeen = Date.now();
    });
  }

  function demoArm(t) {
    const message = {
      name: ["shoulder_joint", "elbow_joint", "wrist_joint", "tool_joint"],
      position: [
        0.32 * Math.sin(t * 0.55),
        0.70 * Math.sin(t * 0.42 + 0.7),
        0.52 * Math.sin(t * 0.68 + 1.4),
        0.28 * Math.cos(t * 0.75)
      ],
      velocity: [
        0.176 * Math.cos(t * 0.55),
        0.294 * Math.cos(t * 0.42 + 0.7),
        0.354 * Math.cos(t * 0.68 + 1.4),
        -0.21 * Math.sin(t * 0.75)
      ]
    };

    handleJointState(message);

    const stat = state.topicStats.get("jointStates");
    const tick = Math.floor(t * 30);
    if (stat && tick !== stat._demoTick) {
      stat._demoTick = tick;
      stat.lastSeen = Date.now();
      stat.count += 1;
    }
  }

  function demoPath(t) {
    const poses = [];
    for (let index = 0; index < 60; index += 1) {
      const x = index * 0.16;
      const y = Math.sin(index * 0.12) * 1.1 + Math.sin(t * 0.05) * 0.1;
      poses.push({ pose: { position: { x, y, z: 0 } } });
    }

    const path = { header: { frame_id: "map" }, poses };
    state.latestPath = path;
    drawPath(path);
    dom.pathPlaceholder.classList.add("hidden");
    $("pathPoseCount").textContent = String(poses.length);
    $("pathLength").textContent = `${calculatePathLength(poses).toFixed(1)} m`;
    $("pathFrame").textContent = "FRAME: map";

    const stat = state.topicStats.get("path");
    if (stat && Math.floor(t * 2) !== stat._demoTick) {
      stat._demoTick = Math.floor(t * 2);
      stat.lastSeen = Date.now();
      stat.count += 1;
    }
  }

  function demoCamera(key, t, label, fps) {
    const binding = cameraBindings[key];
    const width = Math.max(320, Math.round(binding.stage.clientWidth));
    const height = Math.max(180, Math.round(binding.stage.clientHeight));
    let canvas = binding.stage.querySelector("canvas.demo-camera");

    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.className = "demo-camera";
      Object.assign(canvas.style, {
        position: "absolute",
        inset: "0",
        width: "100%",
        height: "100%",
        zIndex: "1"
      });
      binding.stage.prepend(canvas);
    }

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const ctx = canvas.getContext("2d");
    const phase = key.length * 0.7;
    const horizon = height * (0.52 + Math.sin(t * 0.2 + phase) * 0.015);

    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, "#1d2d3b");
    sky.addColorStop(1, "#465d70");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, horizon);

    const ground = ctx.createLinearGradient(0, horizon, 0, height);
    ground.addColorStop(0, "#26343e");
    ground.addColorStop(1, "#0c1217");
    ctx.fillStyle = ground;
    ctx.fillRect(0, horizon, width, height - horizon);

    ctx.fillStyle = "rgba(5, 10, 14, 0.76)";
    for (let index = 0; index < 8; index += 1) {
      const x = ((index * 170 - t * 28 + phase * 90) % (width + 220)) - 110;
      const treeHeight = 45 + (index % 3) * 26;
      ctx.fillRect(x, horizon - treeHeight, 15, treeHeight);
      ctx.beginPath();
      ctx.arc(x + 7, horizon - treeHeight, 28 + (index % 2) * 9, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = "rgba(231, 238, 245, 0.42)";
    ctx.lineWidth = 2;
    ctx.setLineDash([14, 14]);
    ctx.beginPath();
    ctx.moveTo(width * 0.46, height);
    ctx.lineTo(width * 0.49, horizon);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(width * 0.54, height);
    ctx.lineTo(width * 0.51, horizon);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "rgba(4, 8, 12, 0.74)";
    ctx.fillRect(8, 8, 180, 24);
    ctx.fillStyle = "#4da3ff";
    ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.fillText(`DEMO / ${label}`, 16, 24);

    binding.stage.classList.add("has-signal");
    binding.image.style.display = "none";
    binding.age.textContent = "DEMO";

    const stat = state.topicStats.get(key);
    const tick = Math.floor(t * fps);
    if (stat && tick !== stat._demoTick) {
      stat._demoTick = tick;
      stat.count += 1;
      stat.lastSeen = Date.now();
    }
  }

  function resetDisplayedData() {
    document.querySelectorAll("canvas.demo-camera").forEach((canvas) => canvas.remove());
    Object.values(cameraBindings).forEach((binding) => {
      binding.stage.classList.remove("has-signal");
      binding.image.removeAttribute("src");
      binding.image.style.display = "";
      binding.rate.textContent = "0.0 Hz";
      binding.age.textContent = "대기 중";
    });

    state.latestJointState = null;
    state.latestPath = null;
    state.latestOdom = null;
    state.latestImu = null;

    const arm = prepareCanvas(dom.armKinematicsCanvas);
    arm.ctx.clearRect(0, 0, arm.width, arm.height);
    const path = prepareCanvas(dom.pathCanvas);
    path.ctx.clearRect(0, 0, path.width, path.height);
    dom.armPlaceholder.classList.remove("hidden");
    dom.pathPlaceholder.classList.remove("hidden");
    dom.jointStateList.innerHTML = '<div class="joint-state-empty">관절 데이터 미수신</div>';

    $("armJointCount").textContent = "0";
    $("armReach").textContent = "0.00 m";
    $("endEffectorPosition").textContent = "EE X -- / Z --";
    $("pathPoseCount").textContent = "0";
    $("pathLength").textContent = "0.0 m";
    $("pathFrame").textContent = "FRAME: --";
    $("odomX").textContent = "-- m";
    $("odomY").textContent = "-- m";
    $("odomYaw").textContent = "--°";
    $("linearSpeed").textContent = "-- m/s";
    $("hudSpeed").textContent = "0.00 m/s";
    $("imuRoll").textContent = "--°";
    $("imuPitch").textContent = "--°";
    $("batteryPercentage").textContent = "--%";
    $("batteryVoltage").textContent = "-- V";
    $("batteryCurrent").textContent = "-- A";
    $("batteryGauge").style.setProperty("--battery", "0%");
    $("missionStatus").textContent = "MISSION STANDBY";

    updateStatusCard("robotConnectedCard", "robotConnectedValue", "미수신", "unknown");
    updateStatusCard("collisionCard", "collisionValue", "미수신", "unknown");
    updateStatusCard("sensorConnectedCard", "sensorConnectedValue", "미수신", "unknown");

    initTopicStats();
    renderTopicHealth();
  }

  function handleResize() {
    if (state.latestJointState) drawArmKinematics(state.latestJointState);
    if (state.latestPath) drawPath(state.latestPath);
  }

  function bindEvents() {
    dom.connectButton.addEventListener("click", connectRos);
    dom.disconnectButton.addEventListener("click", disconnectRos);
    dom.demoToggle.addEventListener("change", (event) => toggleDemo(event.target.checked));

    dom.rosbridgeUrl.addEventListener("keydown", (event) => {
      if (event.key === "Enter") connectRos();
    });

    dom.settingsButton.addEventListener("click", () => {
      buildSettingsForm();
      dom.settingsDialog.showModal();
    });

    dom.saveTopicsButton.addEventListener("click", saveSettingsFromDialog);
    dom.resetTopicsButton.addEventListener("click", resetTopicSettings);
    dom.clearLogButton.addEventListener("click", () => dom.eventLog.replaceChildren());

    document.querySelectorAll(".fullscreen-button").forEach((button) => {
      button.addEventListener("click", () => {
        const target = $(button.dataset.fullscreenTarget);
        if (!target) return;
        if (document.fullscreenElement) document.exitFullscreen();
        else target.requestFullscreen?.();
      });
    });

    window.addEventListener("beforeunload", () => {
      clearSubscriptions();
      if (state.ros) state.ros.close();
    });

    if ("ResizeObserver" in window) {
      state.resizeObserver = new ResizeObserver(handleResize);
      state.resizeObserver.observe(dom.armKinematicsCanvas.parentElement);
      state.resizeObserver.observe(dom.pathCanvas.parentElement);
    } else {
      window.addEventListener("resize", handleResize);
    }
  }

  function startUiLoops() {
    setInterval(() => {
      dom.systemClock.textContent = formatTime();
    }, 250);

    setInterval(updateRatesAndAges, 500);
  }

  function initialize() {
    initTopicStats();
    updateTopicLabels();
    renderTopicHealth();
    bindEvents();
    startUiLoops();
    setConnectionState("offline", "DISCONNECTED");
    handleResize();
    addLog("UI 초기화 완료");
  }

  initialize();
})();
