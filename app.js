(() => {
  "use strict";

  const CAMERA_TRANSPORT = new URLSearchParams(window.location.search).get("camera") === "compressed"
    ? "ros-compressed"
    : "media";
  document.body.dataset.cameraTransport = CAMERA_TRANSPORT;

  const DEFAULT_TOPICS = {
    jointStates: {
      label: "로봇팔 관절",
      name: "/joint_states",
      type: "sensor_msgs/msg/JointState",
      staleMs: 2000
    },
    gripperHoldFinished: {
      label: "파지 성공",
      name: "/gripper_hold_fin",
      type: "std_msgs/msg/Bool",
      staleMs: 5000
    },
    controlMode: {
      label: "제어 모드",
      name: "/control/mode",
      type: "std_msgs/msg/String",
      staleMs: 5000
    },
    armPose: {
      label: "로봇팔 실좌표(TF)",
      name: "/arm/joint_pose_array",
      type: "geometry_msgs/msg/PoseArray",
      staleMs: 2000
    },
    armTargetPointBase: {
      label: "로봇팔 목표 좌표",
      name: "/arm/target_point_base",
      type: "geometry_msgs/msg/PointStamped",
      staleMs: 3000
    },
    path: {
      label: "생성 경로",
      name: "/path",
      type: "nav_msgs/msg/Path",
      staleMs: 5000
    },
    odom: {
      label: "오도메트리",
      name: "/odometry/filtered",
      type: "nav_msgs/msg/Odometry",
      staleMs: 2500
    },
    imu: {
      label: "IMU",
      name: "/imu",
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
      label: "주행/임무 상태",
      name: "/drive/status",
      type: "std_msgs/msg/String",
      staleMs: 10000
    },
    diagnostics: {
      label: "진단",
      name: "/odometry/diagnostics",
      type: "diagnostic_msgs/msg/DiagnosticArray",
      staleMs: 10000
    }
  };

  const COMPRESSED_CAMERA_TOPICS = {
    mainCamera: {
      label: "메인 카메라 (주행 D455)",
      name: "/drive/camera/color/image_raw/compressed",
      type: "sensor_msgs/msg/CompressedImage",
      staleMs: 3000
    },
    subCamera1: {
      label: "서브 카메라 1 (좌측)",
      name: "/side/left/image_raw/compressed",
      type: "sensor_msgs/msg/CompressedImage",
      staleMs: 3000
    },
    subCamera2: {
      label: "서브 카메라 2 (우측)",
      name: "/side/right/image_raw/compressed",
      type: "sensor_msgs/msg/CompressedImage",
      staleMs: 3000
    },
    armCamera: {
      label: "로봇팔 카메라 (팔 D455)",
      name: "/arm/camera/color/image_raw/compressed",
      type: "sensor_msgs/msg/CompressedImage",
      staleMs: 3000
    }
  };

  const MAX_DETECTION_BOXES_PER_TOPIC = 80;
  const DETECTION_TOPICS = {
    springIfofLeftDetections: {
      label: "봄 IFOF 감지 (좌측)",
      name: "/mission/spring_ifof/left/detections",
      typeLabel: "ROS graph 자동 감지 (Detection2DArray 호환)",
      staleMs: 1200,
      throttleRate: 0,
      cameraKey: "subCamera1",
      overlayLabel: "SPRING IFOF",
      color: "#26d9ff"
    },
    springIfofRightDetections: {
      label: "봄 IFOF 감지 (우측)",
      name: "/mission/spring_ifof/right/detections",
      typeLabel: "ROS graph 자동 감지 (Detection2DArray 호환)",
      staleMs: 1200,
      throttleRate: 0,
      cameraKey: "subCamera2",
      overlayLabel: "SPRING IFOF",
      color: "#26d9ff"
    },
    fallMarkerLeftDetections: {
      label: "가을 마커 감지 (좌측)",
      name: "/mission/fall_marker/left/detections",
      typeLabel: "ROS graph 자동 감지 (Detection2DArray 호환)",
      staleMs: 1200,
      throttleRate: 0,
      cameraKey: "subCamera1",
      overlayLabel: "FALL MARKER",
      color: "#ffb84a"
    },
    fallMarkerRightDetections: {
      label: "가을 마커 감지 (우측)",
      name: "/mission/fall_marker/right/detections",
      typeLabel: "ROS graph 자동 감지 (Detection2DArray 호환)",
      staleMs: 1200,
      throttleRate: 0,
      cameraKey: "subCamera2",
      overlayLabel: "FALL MARKER",
      color: "#ffb84a"
    },
    summerTrafficLeftDetections: {
      label: "여름 신호등 감지 (좌측)",
      name: "/mission/summer_traffic/left/detections",
      typeLabel: "ROS graph 자동 감지 (Detection2DArray 호환)",
      staleMs: 1200,
      throttleRate: 0,
      cameraKey: "subCamera1",
      overlayLabel: "SUMMER TRAFFIC",
      color: "#68ef8b"
    },
    armSummerSupplyDetections: {
      label: "여름 보급품 감지 (로봇팔)",
      name: "/arm/summer_supply/detections",
      typeLabel: "ROS graph 자동 감지 (Detection2DArray 호환)",
      staleMs: 1200,
      throttleRate: 0,
      cameraKey: "armCamera",
      overlayLabel: "SUMMER SUPPLY",
      color: "#ff71d0"
    }
  };

  Object.values(DETECTION_TOPICS).forEach((config) => {
    config.trackHealth = false;
  });
  Object.assign(DEFAULT_TOPICS, DETECTION_TOPICS);

  if (CAMERA_TRANSPORT === "ros-compressed") {
    Object.assign(DEFAULT_TOPICS, COMPRESSED_CAMERA_TOPICS);
  }

  const DEFAULT_STREAMS = {
    mainCamera: {
      label: "메인 카메라",
      mode: "auto",
      whepUrl: "http://localhost:8889/main/whep",
      hlsUrl: "http://localhost:8888/main/index.m3u8"
    },
    subCamera1: {
      label: "서브 카메라 1",
      mode: "auto",
      whepUrl: "http://localhost:8889/sub1/whep",
      hlsUrl: "http://localhost:8888/sub1/index.m3u8"
    },
    subCamera2: {
      label: "서브 카메라 2",
      mode: "auto",
      whepUrl: "http://localhost:8889/sub2/whep",
      hlsUrl: "http://localhost:8888/sub2/index.m3u8"
    },
    armCamera: {
      label: "로봇팔 카메라",
      mode: "auto",
      whepUrl: "http://localhost:8889/arm/whep",
      hlsUrl: "http://localhost:8888/arm/index.m3u8"
    }
  };

  // army_manipulator 실측값(army_manipulator_macro.xacro의 L1/L2/L3 property,
  // ARM_JOINT_NAMES 순서)으로 맞춤 - base_joint(수직축 회전)는 이 UI가 가정하는
  // X-Z 평면 체인에 안 맞아 제외, shoulder/elbow/wrist 3개만 사용.
  // angleOffsetsDeg/angleDirections는 실측 없이 정할 수 없어 중립값(0/+1)으로
  // 두고 실기(또는 mock_bringup)로 관절을 움직여보면서 톱니바퀴 설정에서
  // 직접 맞출 것 - README 8절의 예시값(90,0,0 / 1,-1,1)은 이 로봇 것이 아님.
  const DEFAULT_ARM_MODEL = {
    jointOrder: ["shoulder_joint", "elbow_joint", "wrist_joint"],
    linkLengths: [0.18, 0.22, 0.15],
    angleOffsetsDeg: [0, 0, 0, 0, 0, 0],
    angleDirections: [1, 1, 1, 1, 1, 1],
    maxJoints: 8
  };

  const ARM_LOADOUT_KEYS = ["screwdriver", "drill", "gripper", "relief"];

  const state = {
    ros: null,
    connected: false,
    connecting: false,
    demo: false,
    pathCommandPublishers: new Map(),
    subscriptions: new Map(),
    topicConfig: loadTopicConfig(),
    streamConfig: loadStreamConfig(),
    mediaPlayers: new Map(),
    mediaStats: new Map(),
    armModel: loadArmModelConfig(),
    armLoadout: Object.fromEntries(ARM_LOADOUT_KEYS.map((key) => [key, "unknown"])),
    topicStats: new Map(),
    latestJointState: null,
    latestArmPose: null,
    latestArmPoseAt: 0,
    latestPath: null,
    latestOdom: null,
    latestImu: null,
    latestDetections: new Map(),
    detectionExpiryTimers: new Map(),
    pendingDetectionCameras: new Set(),
    detectionAnimationFrameId: null,
    controlMode: null,
    gripperHoldReceived: false,
    latestGripperHold: false,
    gripperHoldActive: false,
    gripperHoldFlashTimer: null,
    demoFrameId: null,
    demoStartedAt: 0,
    resizeObserver: null
  };

  const $ = (id) => document.getElementById(id);
  const TOP_CAMERA_LAYOUT_STORAGE_KEY = "dolbot.topCameraLayout";
  const DASHBOARD_LAYOUT_STORAGE_KEY = "dolbot.dashboardLayout";
  const PATH_PANEL_LAYOUT_STORAGE_KEY = "dolbot.pathPanelLayout";
  const TOP_CAMERA_MIN_WIDTHS = {
    left: 220,
    main: 420,
    right: 220
  };
  const DASHBOARD_MIN_SIZES = {
    left: 220,
    middle: 280,
    right: 260,
    top: 180,
    upper: 180,
    lower: 120
  };

  function setText(id, text) {
    const element = $(id);
    if (element) element.textContent = text;
  }

  function setStyleProperty(id, property, value) {
    const element = $(id);
    if (element) element.style.setProperty(property, value);
  }

  const dom = {
    rosbridgeUrl: $("rosbridgeUrl"),
    connectButton: $("connectButton"),
    disconnectButton: $("disconnectButton"),
    demoToggle: $("demoToggle"),
    settingsButton: $("settingsButton"),
    settingsDialog: $("settingsDialog"),
    topicSettingsGrid: $("topicSettingsGrid"),
    mediaSettingsGrid: $("mediaSettingsGrid"),
    armModelSettingsGrid: $("armModelSettingsGrid"),
    resetTopicsButton: $("resetTopicsButton"),
    saveTopicsButton: $("saveTopicsButton"),
    systemClock: $("systemClock"),
    connectionBadge: $("connectionBadge"),
    connectionText: $("connectionText"),
    footerMessage: $("footerMessage"),
    overallHealth: $("overallHealth"),
    activeTopicCount: $("activeTopicCount"),
    topicHealthList: $("topicHealthList"),
    armKinematicsCanvas: $("armKinematicsCanvas"),
    armKinematicsPanel: $("armKinematicsPanel"),
    pathCanvas: $("pathCanvas"),
    recordButton: $("recordButton"),
    returnButton: $("returnButton"),
    armPlaceholder: $("armPlaceholder"),
    gripperHoldFlash: $("gripperHoldFlash"),
    gripperHoldStatus: $("gripperHoldStatus"),
    gripperHoldUnavailable: $("gripperHoldUnavailable"),
    armTargetPosition: $("armTargetPosition"),
    jointStateList: $("jointStateList"),
    pathPlaceholder: $("pathPlaceholder")
  };

  const cameraBindings = {
    mainCamera: {
      video: $("mainCameraVideo"),
      image: $("mainCameraImage"),
      stage: $("mainCameraStage"),
      rate: $("mainCameraRate"),
      age: $("mainCameraAge"),
      topicLabel: $("mainCameraTopicLabel")
    },
    subCamera1: {
      video: $("subCamera1Video"),
      image: $("subCamera1Image"),
      detectionOverlay: $("subCamera1DetectionOverlay"),
      stage: $("subCamera1Stage"),
      rate: $("subCamera1Rate"),
      age: $("subCamera1Age"),
      topicLabel: $("subCamera1TopicLabel")
    },
    subCamera2: {
      video: $("subCamera2Video"),
      image: $("subCamera2Image"),
      detectionOverlay: $("subCamera2DetectionOverlay"),
      stage: $("subCamera2Stage"),
      rate: $("subCamera2Rate"),
      age: $("subCamera2Age"),
      topicLabel: $("subCamera2TopicLabel")
    },
    armCamera: {
      video: $("armCameraVideo"),
      image: $("armCameraImage"),
      detectionOverlay: $("armCameraDetectionOverlay"),
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

  function cloneDefaultStreams() {
    return JSON.parse(JSON.stringify(DEFAULT_STREAMS));
  }

  function loadStreamConfig() {
    const defaults = cloneDefaultStreams();
    try {
      const saved = JSON.parse(localStorage.getItem("DOLbotStreamConfig"));
      if (!saved || typeof saved !== "object") return defaults;

      Object.keys(defaults).forEach((key) => {
        const source = saved[key];
        if (!source || typeof source !== "object") return;
        if (["auto", "webrtc", "hls", "disabled"].includes(source.mode)) {
          defaults[key].mode = source.mode;
        }
        if (typeof source.whepUrl === "string") defaults[key].whepUrl = source.whepUrl.trim();
        if (typeof source.hlsUrl === "string") defaults[key].hlsUrl = source.hlsUrl.trim();
      });
      return defaults;
    } catch (error) {
      console.warn("미디어 스트림 설정을 불러오지 못했습니다.", error);
      return defaults;
    }
  }

  function saveStreamConfig() {
    localStorage.setItem("DOLbotStreamConfig", JSON.stringify(state.streamConfig));
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
    const method = level === "error" ? "error" : level === "warning" ? "warn" : "info";
    console[method]?.(`[${formatTime()}] ${message}`);
  }

  function setConnectionState(mode, message) {
    dom.connectionBadge.className = `connection-badge connection-badge--${mode}`;
    dom.connectionText.textContent = message;

    const online = mode === "online";
    const busy = mode === "connecting";
    dom.connectButton.disabled = online || busy || state.demo;
    dom.disconnectButton.disabled = !online && !busy;
    dom.rosbridgeUrl.disabled = online || busy || state.demo;
    dom.recordButton.disabled = !online;
    dom.returnButton.disabled = !online;

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
    Object.entries(state.topicConfig).forEach(([key, config]) => {
      if (config.trackHealth === false) return;
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
      state.pathCommandPublishers.clear();
      clearSubscriptions();
      clearDetectionData();
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
    clearDetectionData();
    clearPathCommandPublishers();
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

  function clearPathCommandPublishers() {
    state.pathCommandPublishers.forEach((publisher) => {
      try {
        publisher.unadvertise();
      } catch (error) {
        console.warn(error);
      }
    });
    state.pathCommandPublishers.clear();
  }

  function publishPathCommand(command) {
    const commands = {
      record: { topic: "/path/record", label: "RECORD", button: dom.recordButton },
      return: { topic: "/path/return", label: "RETURN", button: dom.returnButton }
    };
    const selected = commands[command];
    if (!selected) return;

    if (!state.connected || !state.ros || state.demo) {
      dom.footerMessage.textContent = `ROS 연결 후 ${selected.label} 명령을 발행할 수 있습니다.`;
      addLog(`${selected.label} 발행 실패: ROS가 연결되어 있지 않습니다.`, "warning");
      return;
    }

    try {
      let publisher = state.pathCommandPublishers.get(command);
      if (!publisher) {
        publisher = new ROSLIB.Topic({
          ros: state.ros,
          name: selected.topic,
          messageType: "std_msgs/msg/Bool"
        });
        state.pathCommandPublishers.set(command, publisher);
      }

      publisher.publish(new ROSLIB.Message({ data: true }));
      dom.footerMessage.textContent = `${selected.topic} = true 발행 완료`;
      selected.button.classList.add("is-published");
      window.setTimeout(() => selected.button.classList.remove("is-published"), 600);
      addLog(`${selected.topic} 토픽에 true를 발행했습니다.`);
    } catch (error) {
      dom.footerMessage.textContent = `${selected.label} 명령 발행 실패`;
      addLog(`${selected.label} 발행 실패: ${extractErrorMessage(error)}`, "error");
    }
  }

  function extractErrorMessage(error) {
    if (typeof error === "string") return error;
    if (error?.message) return error.message;
    if (error?.type) return error.type;
    return "알 수 없는 오류";
  }

  function subscribeAll() {
    clearSubscriptions();
    clearDetectionData();
    initTopicStats();

    subscribeTopic("controlMode", handleControlMode);
    subscribeTopic("jointStates", handleJointState);
    subscribeTopic("gripperHoldFinished", handleGripperHoldFinished);
    subscribeTopic("armPose", handleArmPose);
    subscribeTopic("armTargetPointBase", handleArmTargetPointBase);
    subscribeTopic("path", handlePath);
    subscribeTopic("odom", handleOdometry);
    subscribeTopic("imu", handleImu);
    subscribeTopic("battery", handleBattery);
    subscribeTopic("robotConnected", handleRobotConnected);
    subscribeTopic("collision", handleCollision);
    subscribeTopic("sensorsConnected", handleSensorsConnected);
    subscribeTopic("missionStatus", handleMissionStatus);
    subscribeTopic("diagnostics", handleDiagnostics);
    Object.keys(DETECTION_TOPICS).forEach((key) => {
      subscribeTopic(key, handleDetections);
    });
    if (CAMERA_TRANSPORT === "ros-compressed") {
      Object.keys(COMPRESSED_CAMERA_TOPICS).forEach((key) => {
        subscribeTopic(key, handleCompressedImage);
      });
    }
    updateTopicLabels();
    renderTopicHealth();
  }

  function subscribeTopic(key, handler) {
    const config = state.topicConfig[key];
    if (!config?.name || !state.ros) return;

    try {
      const topicOptions = {
        ros: state.ros,
        name: config.name,
        throttle_rate: config.throttleRate ?? 50,
        queue_length: 1,
        compression: "none"
      };
      if (config.type) topicOptions.messageType = config.type;
      const topic = new ROSLIB.Topic(topicOptions);

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

  function initMediaStats() {
    state.mediaStats.clear();
    Object.keys(state.streamConfig).forEach((key) => {
      state.mediaStats.set(key, {
        count: 0,
        lastSeen: 0,
        lastRateSampleAt: performance.now(),
        lastRateCount: 0,
        fps: 0
      });
    });
  }

  function markMediaFrame(key) {
    const stat = state.mediaStats.get(key);
    if (!stat) return;
    stat.count += 1;
    stat.lastSeen = Date.now();
  }

  function waitForIceGathering(peerConnection, timeoutMs = 4000) {
    if (peerConnection.iceGatheringState === "complete") return Promise.resolve();

    return new Promise((resolve) => {
      const timeout = window.setTimeout(finish, timeoutMs);
      function finish() {
        window.clearTimeout(timeout);
        peerConnection.removeEventListener("icegatheringstatechange", handleChange);
        resolve();
      }
      function handleChange() {
        if (peerConnection.iceGatheringState === "complete") finish();
      }
      peerConnection.addEventListener("icegatheringstatechange", handleChange);
    });
  }

  async function startWebRtc(player, config, binding) {
    if (!/^https?:\/\//i.test(config.whepUrl)) {
      throw new Error("WHEP URL은 http:// 또는 https://로 시작해야 합니다.");
    }

    const peerConnection = new RTCPeerConnection();
    player.peerConnection = peerConnection;
    peerConnection.addTransceiver("video", { direction: "recvonly" });
    peerConnection.ontrack = (event) => {
      if (player.stopped) return;
      binding.video.srcObject = event.streams[0] || new MediaStream([event.track]);
      binding.video.play().catch(() => {});
    };
    peerConnection.onconnectionstatechange = () => {
      if (player.stopped) return;
      if (peerConnection.connectionState === "failed") {
        player.forceHls = config.mode === "auto";
        scheduleMediaRetry(player, `${config.label} WebRTC 연결 끊김`);
      } else if (peerConnection.connectionState === "disconnected") {
        window.clearTimeout(player.disconnectTimer);
        player.disconnectTimer = window.setTimeout(() => {
          if (peerConnection.connectionState === "disconnected") {
            player.forceHls = config.mode === "auto";
            scheduleMediaRetry(player, `${config.label} WebRTC 응답 없음`);
          }
        }, 3000);
      }
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    await waitForIceGathering(peerConnection);
    if (player.stopped) return;

    player.abortController = new AbortController();
    const response = await fetch(config.whepUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/sdp",
        Accept: "application/sdp"
      },
      body: peerConnection.localDescription.sdp,
      signal: player.abortController.signal
    });

    if (!response.ok) throw new Error(`WHEP HTTP ${response.status}`);
    const location = response.headers.get("Location");
    if (location) player.sessionUrl = new URL(location, config.whepUrl).href;

    const answerSdp = await response.text();
    await peerConnection.setRemoteDescription({ type: "answer", sdp: answerSdp });
    player.connectTimer = window.setTimeout(() => {
      if (!binding.stage.classList.contains("has-signal")) {
        player.forceHls = config.mode === "auto";
        scheduleMediaRetry(player, `${config.label} WebRTC 연결 시간 초과`);
      }
    }, 8000);
    binding.rate.textContent = "WEBRTC";
  }

  function startHls(player, config, binding) {
    if (!/^https?:\/\//i.test(config.hlsUrl)) {
      throw new Error("HLS URL은 http:// 또는 https://로 시작해야 합니다.");
    }

    const video = binding.video;
    if (window.Hls?.isSupported()) {
      const hls = new window.Hls({
        lowLatencyMode: true,
        backBufferLength: 0,
        liveSyncDurationCount: 2,
        liveMaxLatencyDurationCount: 5
      });
      player.hls = hls;
      hls.on(window.Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(config.hlsUrl));
      hls.on(window.Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
      hls.on(window.Hls.Events.ERROR, (_event, data) => {
        if (data.fatal && !player.stopped) {
          player.forceHls = false;
          scheduleMediaRetry(player, `${config.label} HLS 오류: ${data.details}`);
        }
      });
      hls.attachMedia(video);
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.onerror = () => {
        if (!player.stopped) scheduleMediaRetry(player, `${config.label} HLS 재생 오류`);
      };
      video.src = config.hlsUrl;
      video.play().catch(() => {});
    } else {
      throw new Error("이 브라우저에서 HLS 재생기를 사용할 수 없습니다.");
    }
    binding.rate.textContent = "HLS";
  }

  async function connectMedia(player) {
    if (player.stopped || state.demo) return;
    const config = state.streamConfig[player.key];
    const binding = cameraBindings[player.key];
    const stat = state.mediaStats.get(player.key);
    if (stat) stat.lastSeen = 0;
    binding.stage.classList.remove("has-signal");
    binding.age.textContent = "연결 중";

    try {
      if (config.mode === "hls" || (config.mode === "auto" && player.forceHls)) {
        startHls(player, config, binding);
      } else {
        await startWebRtc(player, config, binding);
      }
    } catch (error) {
      if (player.stopped || error?.name === "AbortError") return;
      cleanupMediaTransport(player);
      if (config.mode === "auto" && !player.forceHls && config.hlsUrl) {
        player.forceHls = true;
        addLog(`${config.label}: WebRTC 실패, HLS로 전환`, "warning");
        try {
          startHls(player, config, binding);
          return;
        } catch (hlsError) {
          player.forceHls = false;
          scheduleMediaRetry(player, `${config.label}: ${extractErrorMessage(hlsError)}`);
          return;
        }
      }
      scheduleMediaRetry(player, `${config.label}: ${extractErrorMessage(error)}`);
    }
  }

  function cleanupMediaTransport(player) {
    window.clearTimeout(player.connectTimer);
    window.clearTimeout(player.disconnectTimer);
    player.connectTimer = null;
    player.disconnectTimer = null;
    player.abortController?.abort();
    player.abortController = null;
    player.hls?.destroy();
    player.hls = null;
    if (player.peerConnection) {
      player.peerConnection.ontrack = null;
      player.peerConnection.onconnectionstatechange = null;
      player.peerConnection.close();
    }
    player.peerConnection = null;
    if (player.sessionUrl) {
      fetch(player.sessionUrl, { method: "DELETE", keepalive: true }).catch(() => {});
      player.sessionUrl = "";
    }

    const binding = cameraBindings[player.key];
    binding.video.pause();
    binding.video.srcObject = null;
    binding.video.removeAttribute("src");
    binding.video.load();
  }

  function scheduleMediaRetry(player, message) {
    if (player.stopped || player.retryTimer) return;
    player.retryTimer = -1;
    cleanupMediaTransport(player);
    const binding = cameraBindings[player.key];
    binding.stage.classList.remove("has-signal");
    binding.age.textContent = "5초 후 재시도";
    binding.rate.textContent = "OFFLINE";
    addLog(message, "warning");
    player.retryTimer = window.setTimeout(() => {
      player.retryTimer = null;
      connectMedia(player);
    }, 5000);
  }

  function startMedia(key) {
    stopMedia(key);
    const config = state.streamConfig[key];
    const binding = cameraBindings[key];
    binding.video.style.display = "";
    binding.topicLabel.textContent = config.mode === "disabled"
      ? "MEDIA / DISABLED"
      : `MEDIA / ${config.mode.toUpperCase()}`;

    if (config.mode === "disabled" || state.demo) {
      binding.rate.textContent = "OFF";
      binding.age.textContent = "비활성";
      return;
    }

    const player = {
      key,
      stopped: false,
      forceHls: false,
      retryTimer: null,
      connectTimer: null,
      disconnectTimer: null,
      abortController: null,
      peerConnection: null,
      hls: null,
      sessionUrl: ""
    };
    state.mediaPlayers.set(key, player);

    binding.video.onplaying = () => {
      if (player.stopped) return;
      binding.stage.classList.add("has-signal");
      binding.age.textContent = "LIVE";
      scheduleDetectionOverlay(key);
      window.clearTimeout(player.connectTimer);
      player.connectTimer = null;
      if (!player.wasPlaying) addLog(`${config.label} 미디어 스트림 연결`);
      player.wasPlaying = true;
    };
    binding.video.onwaiting = () => {
      if (!player.stopped) binding.age.textContent = "버퍼링";
    };
    binding.video.onerror = null;

    const countFrame = () => {
      if (player.stopped) return;
      markMediaFrame(key);
      if (binding.detectionOverlay && hasFreshDetections(key)) scheduleDetectionOverlay(key);
      binding.video.requestVideoFrameCallback?.(countFrame);
    };
    binding.video.requestVideoFrameCallback?.(countFrame);
    connectMedia(player);
  }

  function stopMedia(key) {
    const player = state.mediaPlayers.get(key);
    if (player) {
      player.stopped = true;
      window.clearTimeout(player.retryTimer);
      cleanupMediaTransport(player);
      state.mediaPlayers.delete(key);
    }

    const binding = cameraBindings[key];
    if (binding) {
      binding.video.onplaying = null;
      binding.video.onwaiting = null;
      binding.video.onerror = null;
      binding.stage.classList.remove("has-signal");
    }
  }

  function startAllMedia() {
    if (state.demo || CAMERA_TRANSPORT === "ros-compressed") return;
    initMediaStats();
    Object.keys(state.streamConfig).forEach(startMedia);
  }

  function stopAllMedia() {
    if (CAMERA_TRANSPORT === "ros-compressed") return;
    Object.keys(state.streamConfig).forEach(stopMedia);
  }

  function isArmPoseFresh() {
    const staleMs = state.topicConfig.armPose?.staleMs ?? 2000;
    return state.latestArmPoseAt > 0 && (Date.now() - state.latestArmPoseAt) < staleMs;
  }

  function updateRmdDps(velocities) {
    const finiteVelocities = velocities
      .map((velocity) => Number(velocity))
      .filter((velocity) => Number.isFinite(velocity));
    if (!finiteVelocities.length) {
      setText("rmdDps", "-- deg/s");
      return;
    }

    const peakDps = radToDeg(Math.max(...finiteVelocities.map((velocity) => Math.abs(velocity))));
    setText("rmdDps", `${peakDps.toFixed(1)} deg/s`);
  }

  function handleJointState(message) {
    if (!Array.isArray(message?.name) || !Array.isArray(message?.position)) return;

    const resolved = resolveArmJointState(message);
    if (!resolved.names.length) {
      addLog("JointState에서 시각화할 관절을 찾지 못했습니다.", "warning");
      return;
    }

    state.latestJointState = resolved;
    updateRmdDps(Array.isArray(message.velocity) ? message.velocity : []);
    renderJointStateList(resolved);
    $("armJointCount").textContent = String(resolved.names.length);
    dom.armPlaceholder.classList.add("hidden");

    // /arm/joint_pose_array(TF 실측 좌표)가 최근에 들어오고 있으면 그쪽이
    // 실제 월드 X-Z 좌표라 더 정확함 - 캔버스/도달거리/EE 표시는 그쪽에
    // 맡기고 여기서는 각도 목록만 갱신한다. angleOffsetsDeg/angleDirections
    // 톱니바퀴 근사는 armPose 토픽이 없을 때의 폴백으로만 쓴다.
    if (isArmPoseFresh()) return;

    drawArmKinematics(resolved);
    $("armReach").textContent = `${resolved.reach.toFixed(2)} m`;
    $("endEffectorPosition").textContent =
      `EE X ${resolved.endEffector.x.toFixed(2)} / Z ${resolved.endEffector.z.toFixed(2)}`;
  }

  function handleGripperHoldFinished(message) {
    // rosbridge/중간 게이트웨이에 따라 Bool이 boolean, 0/1, 문자열로 전달되는
    // 경우까지 수용한다. false 계열 외의 임의 값은 성공으로 오인하지 않는다.
    const rawValue = message?.data;
    const isHolding = rawValue === true || rawValue === 1 || rawValue === "1" ||
      (typeof rawValue === "string" && rawValue.trim().toLowerCase() === "true");
    state.gripperHoldReceived = true;
    state.latestGripperHold = isHolding;

    // 파지 상태 표시는 MANUAL_EE에서만 유효하다. 모드 토픽이 아직 도착하지
    // 않았을 때의 값은 저장해 두었다가 MANUAL_EE 확인 후 반영한다.
    if (state.controlMode !== "MANUAL_EE") return;
    dom.gripperHoldUnavailable.classList.add("hidden");

    if (!isHolding) {
      if (state.gripperHoldActive) addLog("파지 성공 신호 해제");
      resetGripperHoldIndicator();
      return;
    }

    // Bool 토픽이 true를 반복 발행해도 중앙 알림은 상승 순간에 한 번만 표시한다.
    if (state.gripperHoldActive) return;
    state.gripperHoldActive = true;
    addLog("파지 성공 신호 수신");
    dom.armKinematicsPanel.classList.add("gripper-hold-active");
    dom.gripperHoldStatus.classList.remove("hidden");
    dom.gripperHoldFlash.classList.remove("hidden");

    window.clearTimeout(state.gripperHoldFlashTimer);
    state.gripperHoldFlashTimer = window.setTimeout(() => {
      dom.gripperHoldFlash.classList.add("hidden");
      dom.armKinematicsPanel.classList.remove("gripper-hold-active");
      state.gripperHoldFlashTimer = null;
    }, 500);
  }

  function handleControlMode(message) {
    const nextMode = typeof message?.data === "string"
      ? message.data.trim().toUpperCase()
      : "";
    const wasManualEe = state.controlMode === "MANUAL_EE";
    state.controlMode = nextMode;

    if (nextMode !== "MANUAL_EE") {
      state.gripperHoldReceived = false;
      state.latestGripperHold = false;
      resetGripperHoldIndicator();
      return;
    }

    if (!wasManualEe) addLog("MANUAL_EE 파지 상태 감시 시작");
    if (!state.gripperHoldReceived) {
      resetGripperHoldIndicator();
      dom.gripperHoldUnavailable.classList.remove("hidden");
      return;
    }

    handleGripperHoldFinished({ data: state.latestGripperHold });
  }

  function resetGripperHoldIndicator() {
    state.gripperHoldActive = false;
    window.clearTimeout(state.gripperHoldFlashTimer);
    state.gripperHoldFlashTimer = null;
    dom.armKinematicsPanel.classList.remove("gripper-hold-active");
    dom.gripperHoldFlash.classList.add("hidden");
    dom.gripperHoldStatus.classList.add("hidden");
    dom.gripperHoldUnavailable.classList.add("hidden");
  }

  function handleArmPose(message) {
    if (!Array.isArray(message?.poses) || !message.poses.length) return;

    const points = message.poses.map((pose) => ({
      x: Number(pose?.position?.x) || 0,
      z: Number(pose?.position?.z) || 0
    }));

    let totalLength = 0;
    for (let index = 1; index < points.length; index += 1) {
      totalLength += Math.hypot(
        points[index].x - points[index - 1].x,
        points[index].z - points[index - 1].z
      );
    }

    const endEffector = points[points.length - 1];
    const resolved = {
      points,
      linkAngles: [],
      totalLength,
      endEffector,
      reach: Math.hypot(endEffector.x, endEffector.z)
    };

    state.latestArmPose = resolved;
    state.latestArmPoseAt = Date.now();
    drawArmKinematics(resolved);
    dom.armPlaceholder.classList.add("hidden");

    $("armReach").textContent = `${resolved.reach.toFixed(2)} m`;
  }

  function handleArmTargetPointBase(message) {
    const x = Number(message?.point?.x);
    const z = Number(message?.point?.z);
    if (!Number.isFinite(x) || !Number.isFinite(z)) return;

    dom.armTargetPosition.textContent = `TARGET X ${x.toFixed(3)} m / Z ${z.toFixed(3)} m`;
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

  function firstFinite(...values) {
    for (const value of values) {
      if (value === null || value === undefined || value === "") continue;
      const number = Number(value);
      if (Number.isFinite(number)) return number;
    }
    return null;
  }

  function detectionItems(message) {
    const candidates = [
      message?.detections,
      message?.boxes,
      message?.bounding_boxes,
      message?.objects,
      message?.data
    ];
    return candidates.find(Array.isArray) || [];
  }

  function detectionResult(detection) {
    const results = Array.isArray(detection?.results) ? detection.results : [];
    const best = results.reduce((selected, result) => {
      const score = firstFinite(result?.hypothesis?.score, result?.score, result?.confidence, result?.probability);
      if (!selected || (score ?? -Infinity) > (selected.score ?? -Infinity)) {
        return { result, score };
      }
      return selected;
    }, null);
    const result = best?.result;
    const label = detection?.class_name
      ?? detection?.label
      ?? detection?.class_id
      ?? result?.hypothesis?.class_id
      ?? result?.class_id
      ?? detection?.id
      ?? result?.id
      ?? "";
    const score = best?.score ?? firstFinite(detection?.score, detection?.confidence, detection?.probability);
    return { label: String(label ?? "").trim(), score };
  }

  function parseDetectionBox(detection) {
    const box = detection?.bbox ?? detection?.bounding_box ?? detection?.box ?? detection;
    if (!box || typeof box !== "object") return null;

    const arrayBox = Array.isArray(box)
      ? box
      : Array.isArray(box.xyxy) ? box.xyxy
        : Array.isArray(detection?.xyxy) ? detection.xyxy : null;
    let x;
    let y;
    let width;
    let height;

    if (arrayBox?.length >= 4) {
      const [xMin, yMin, xMax, yMax] = arrayBox.map(Number);
      if ([xMin, yMin, xMax, yMax].every(Number.isFinite)) {
        x = xMin;
        y = yMin;
        width = xMax - xMin;
        height = yMax - yMin;
      }
    }

    if (![x, y, width, height].every(Number.isFinite)) {
      const xMin = firstFinite(box.xmin, box.x_min, box.left, box.x1);
      const yMin = firstFinite(box.ymin, box.y_min, box.top, box.y1);
      const xMax = firstFinite(box.xmax, box.x_max, box.right, box.x2);
      const yMax = firstFinite(box.ymax, box.y_max, box.bottom, box.y2);
      if ([xMin, yMin, xMax, yMax].every(Number.isFinite)) {
        x = xMin;
        y = yMin;
        width = xMax - xMin;
        height = yMax - yMin;
      }
    }

    if (![x, y, width, height].every(Number.isFinite)) {
      const center = box.center?.position ?? box.center;
      const centerX = firstFinite(center?.x, box.center_x, box.cx);
      const centerY = firstFinite(center?.y, box.center_y, box.cy);
      const sizeX = firstFinite(box.size_x, box.width, box.w, box.size?.x, box.size?.width);
      const sizeY = firstFinite(box.size_y, box.height, box.h, box.size?.y, box.size?.height);
      if ([centerX, centerY, sizeX, sizeY].every(Number.isFinite)) {
        x = centerX - sizeX / 2;
        y = centerY - sizeY / 2;
        width = sizeX;
        height = sizeY;
      }
    }

    if (![x, y, width, height].every(Number.isFinite)) {
      x = firstFinite(box.x, box.left);
      y = firstFinite(box.y, box.top);
      width = firstFinite(box.width, box.w);
      height = firstFinite(box.height, box.h);
    }

    if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return null;
    return { x, y, width, height, ...detectionResult(detection) };
  }

  function detectionSourceSize(message) {
    return {
      width: firstFinite(
        message?.image_width,
        message?.source_width,
        message?.image?.width,
        message?.source?.width
      ),
      height: firstFinite(
        message?.image_height,
        message?.source_height,
        message?.image?.height,
        message?.source?.height
      )
    };
  }

  function cameraSourceSize(binding, detectionState) {
    const width = detectionState?.sourceWidth
      || binding.image?.naturalWidth
      || binding.video?.videoWidth
      || 0;
    const height = detectionState?.sourceHeight
      || binding.image?.naturalHeight
      || binding.video?.videoHeight
      || 0;
    return { width, height };
  }

  function drawDetectionOverlay(cameraKey) {
    const binding = cameraBindings[cameraKey];
    if (!binding?.detectionOverlay) return;

    const { ctx, width, height } = prepareCanvas(binding.detectionOverlay, 1);
    ctx.clearRect(0, 0, width, height);
    if (state.demo || width <= 1 || height <= 1) return;

    const now = Date.now();
    Object.entries(DETECTION_TOPICS).forEach(([topicKey, config]) => {
      if (config.cameraKey !== cameraKey) return;
      const detectionState = state.latestDetections.get(topicKey);
      if (!detectionState || now - detectionState.receivedAt > config.staleMs) return;

      const source = cameraSourceSize(binding, detectionState);
      if (source.width <= 0 || source.height <= 0) return;

      const scale = Math.max(width / source.width, height / source.height);
      const offsetX = (width - source.width * scale) / 2;
      const offsetY = (height - source.height * scale) / 2;

      detectionState.boxes.forEach((box) => {
        const normalized = Math.max(
          Math.abs(box.x),
          Math.abs(box.y),
          Math.abs(box.width),
          Math.abs(box.height)
        ) <= 1.5;
        const sourceX = normalized ? box.x * source.width : box.x;
        const sourceY = normalized ? box.y * source.height : box.y;
        const sourceWidth = normalized ? box.width * source.width : box.width;
        const sourceHeight = normalized ? box.height * source.height : box.height;
        const x = offsetX + sourceX * scale;
        const y = offsetY + sourceY * scale;
        const boxWidth = sourceWidth * scale;
        const boxHeight = sourceHeight * scale;

        if (x + boxWidth < 0 || y + boxHeight < 0 || x > width || y > height) return;

        ctx.strokeStyle = config.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, boxWidth, boxHeight);

        const scoreText = Number.isFinite(box.score)
          ? ` ${box.score <= 1 ? Math.round(box.score * 100) : box.score.toFixed(1)}${box.score <= 1 ? "%" : ""}`
          : "";
        const classText = box.label ? ` · ${box.label}` : "";
        const text = `${config.overlayLabel}${classText}${scoreText}`;
        ctx.font = '10px "IBM Plex Mono", monospace';
        const labelWidth = Math.min(width, ctx.measureText(text).width + 10);
        const labelHeight = 18;
        const labelX = Math.max(0, Math.min(width - labelWidth, x));
        const labelY = y >= labelHeight ? y - labelHeight : Math.min(height - labelHeight, y);

        ctx.fillStyle = "rgba(4, 9, 13, 0.86)";
        ctx.fillRect(labelX, labelY, labelWidth, labelHeight);
        ctx.fillStyle = config.color;
        ctx.textBaseline = "middle";
        ctx.fillText(text, labelX + 5, labelY + labelHeight / 2, labelWidth - 10);
      });
    });
  }

  function hasFreshDetections(cameraKey) {
    const now = Date.now();
    return Object.entries(DETECTION_TOPICS).some(([topicKey, config]) => {
      const detectionState = state.latestDetections.get(topicKey);
      return config.cameraKey === cameraKey
        && detectionState?.boxes?.length > 0
        && now - detectionState.receivedAt <= config.staleMs;
    });
  }

  function scheduleDetectionOverlay(cameraKey) {
    if (!cameraBindings[cameraKey]?.detectionOverlay) return;
    state.pendingDetectionCameras.add(cameraKey);
    if (state.detectionAnimationFrameId !== null) return;

    state.detectionAnimationFrameId = window.requestAnimationFrame(() => {
      state.detectionAnimationFrameId = null;
      const cameraKeys = [...state.pendingDetectionCameras];
      state.pendingDetectionCameras.clear();
      cameraKeys.forEach(drawDetectionOverlay);
    });
  }

  function drawAllDetectionOverlays() {
    ["subCamera1", "subCamera2", "armCamera"].forEach(scheduleDetectionOverlay);
  }

  function clearDetectionData() {
    state.detectionExpiryTimers.forEach((timer) => window.clearTimeout(timer));
    state.detectionExpiryTimers.clear();
    state.latestDetections.clear();
    state.pendingDetectionCameras.clear();
    window.cancelAnimationFrame(state.detectionAnimationFrameId);
    state.detectionAnimationFrameId = null;
    Object.values(cameraBindings).forEach((binding) => {
      if (!binding.detectionOverlay) return;
      binding.detectionSourceWidth = 0;
      binding.detectionSourceHeight = 0;
      const { ctx, width, height } = prepareCanvas(binding.detectionOverlay, 1);
      ctx.clearRect(0, 0, width, height);
    });
  }

  function ensureDetectionExpiry(key, config) {
    if (state.detectionExpiryTimers.has(key)) return;

    const expire = () => {
      const current = state.latestDetections.get(key);
      if (!current) {
        state.detectionExpiryTimers.delete(key);
        return;
      }

      const remaining = config.staleMs - (Date.now() - current.receivedAt);
      if (remaining > 0) {
        const timer = window.setTimeout(expire, remaining + 20);
        state.detectionExpiryTimers.set(key, timer);
        return;
      }

      state.latestDetections.delete(key);
      state.detectionExpiryTimers.delete(key);
      scheduleDetectionOverlay(config.cameraKey);
    };

    const timer = window.setTimeout(expire, config.staleMs + 20);
    state.detectionExpiryTimers.set(key, timer);
  }

  function handleDetections(message, key) {
    const config = DETECTION_TOPICS[key];
    if (!config) return;
    const source = detectionSourceSize(message);
    const boxes = detectionItems(message)
      .slice(0, MAX_DETECTION_BOXES_PER_TOPIC)
      .map(parseDetectionBox)
      .filter(Boolean);
    const receivedAt = Date.now();
    state.latestDetections.set(key, {
      boxes,
      receivedAt,
      sourceWidth: source.width,
      sourceHeight: source.height
    });
    ensureDetectionExpiry(key, config);
    scheduleDetectionOverlay(config.cameraKey);
  }

  function compressedImageMimeType(format) {
    const normalized = String(format || "jpeg").toLowerCase();
    if (normalized.includes("compresseddepth")) return "";
    if (normalized.includes("png")) return "image/png";
    if (normalized.includes("webp")) return "image/webp";
    return "image/jpeg";
  }

  function handleCompressedImage(message, key) {
    const binding = cameraBindings[key];
    if (!binding?.image || typeof message?.data !== "string" || !message.data) return;

    const mimeType = compressedImageMimeType(message.format);
    if (!mimeType) {
      const stat = state.topicStats.get(key);
      if (stat && !stat.unsupportedFormatLogged) {
        stat.unsupportedFormatLogged = true;
        addLog(`${state.topicConfig[key].label}: compressedDepth는 컬러 영상으로 표시할 수 없습니다.`, "warning");
      }
      return;
    }

    binding.image.onload = () => {
      binding.stage.classList.add("has-signal");
      binding.age.textContent = "LIVE";
      binding.detectionSourceWidth = binding.image.naturalWidth;
      binding.detectionSourceHeight = binding.image.naturalHeight;
      if (hasFreshDetections(key)) scheduleDetectionOverlay(key);
    };
    binding.image.onerror = () => {
      binding.stage.classList.remove("has-signal");
      binding.age.textContent = "디코딩 오류";
    };
    binding.image.src = `data:${mimeType};base64,${message.data}`;
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

  function prepareCanvas(canvas, maxDpr = 2) {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
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

    // x는 좌우 반전해서 그린다 - RViz 3D 뷰와 대조해보니 반전 안 하면
    // 실제 팔 형상과 거울상으로 나왔음(2026-08-28 실기/RViz 비교로 확인).
    const toCanvas = (point) => ({
      x: originX - point.x * scale,
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
    ctx.fillText("+X", width - margin, originY - 7);
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

      const rateElement = $(`${key}Rate`);
      if (rateElement) {
        rateElement.textContent = `${stat.hz.toFixed(1)} Hz`;
      }

      if (CAMERA_TRANSPORT === "ros-compressed" && cameraBindings[key]) {
        const binding = cameraBindings[key];
        binding.age.textContent = stat.lastSeen
          ? age < 1500 ? "LIVE" : formatAge(age)
          : "대기 중";
        if (age > 5000) binding.stage.classList.remove("has-signal");
      }
    });

    state.mediaStats.forEach((stat, key) => {
      const elapsed = (nowPerf - stat.lastRateSampleAt) / 1000;
      if (elapsed >= 1) {
        stat.fps = (stat.count - stat.lastRateCount) / elapsed;
        stat.lastRateCount = stat.count;
        stat.lastRateSampleAt = nowPerf;
      }

      const binding = cameraBindings[key];
      const player = state.mediaPlayers.get(key);
      const age = stat.lastSeen ? now - stat.lastSeen : Infinity;
      if (stat.lastSeen && !state.demo) {
        binding.rate.textContent = `${stat.fps.toFixed(1)} FPS`;
        binding.age.textContent = age < 1500 ? "LIVE" : formatAge(age);
        if (age > 5000 && player && !player.retryTimer) {
          scheduleMediaRetry(player, `${state.streamConfig[key].label} 프레임 수신 중단`);
        }
      }
    });

    if (dom.activeTopicCount) {
      dom.activeTopicCount.textContent = `${active} / ${state.topicStats.size} ACTIVE`;
    }
    if (dom.topicHealthList) renderTopicHealth();

    if (!state.connected && !state.demo) {
      dom.overallHealth.textContent = "--";
    }
  }

  function formatAge(ageMs) {
    if (ageMs < 1000) return `${Math.round(ageMs)} ms`;
    return `${(ageMs / 1000).toFixed(1)} s`;
  }

  function renderTopicHealth() {
    if (!dom.topicHealthList) return;

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
      type.textContent = config.typeLabel || config.type || "ROS graph 자동 감지";
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
    buildMediaSettings();
    buildArmModelSettings();
  }

  function buildMediaSettings() {
    if (CAMERA_TRANSPORT === "ros-compressed") {
      dom.mediaSettingsGrid.replaceChildren();
      return;
    }
    const fragment = document.createDocumentFragment();

    Object.entries(state.streamConfig).forEach(([key, config]) => {
      const wrapper = document.createElement("div");
      wrapper.className = "media-setting";

      const heading = document.createElement("strong");
      heading.textContent = config.label;

      const mode = document.createElement("select");
      mode.dataset.streamKey = key;
      mode.dataset.streamField = "mode";
      [
        ["auto", "WebRTC → HLS"],
        ["webrtc", "WebRTC only"],
        ["hls", "HLS only"],
        ["disabled", "사용 안 함"]
      ].forEach(([value, label]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        option.selected = config.mode === value;
        mode.append(option);
      });

      const whep = document.createElement("input");
      whep.dataset.streamKey = key;
      whep.dataset.streamField = "whepUrl";
      whep.value = config.whepUrl;
      whep.placeholder = "http://media:8889/path/whep";
      whep.spellcheck = false;

      const hls = document.createElement("input");
      hls.dataset.streamKey = key;
      hls.dataset.streamField = "hlsUrl";
      hls.value = config.hlsUrl;
      hls.placeholder = "http://media:8888/path/index.m3u8";
      hls.spellcheck = false;

      wrapper.append(heading, mode, whep, hls);
      fragment.append(wrapper);
    });

    dom.mediaSettingsGrid.replaceChildren(fragment);
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

    dom.mediaSettingsGrid.querySelectorAll("[data-stream-key]").forEach((input) => {
      const { streamKey, streamField } = input.dataset;
      state.streamConfig[streamKey][streamField] = input.value.trim();
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
    saveStreamConfig();
    saveArmModelConfig();
    updateTopicLabels();
    initTopicStats();
    renderTopicHealth();
    dom.settingsDialog.close();
    addLog("통신 설정 저장 완료");

    if (!state.demo && CAMERA_TRANSPORT === "media") {
      stopAllMedia();
      startAllMedia();
      addLog("변경된 미디어 주소로 재연결했습니다.");
    }

    if (state.connected) {
      subscribeAll();
      addLog("변경된 토픽으로 재구독했습니다.");
    }
  }

  function resetTopicSettings() {
    state.topicConfig = cloneDefaultTopics();
    state.streamConfig = cloneDefaultStreams();
    state.armModel = cloneDefaultArmModel();
    buildSettingsForm();
  }

  function updateTopicLabels() {
    Object.entries(cameraBindings).forEach(([key, binding]) => {
      if (CAMERA_TRANSPORT === "ros-compressed") {
        binding.topicLabel.textContent = state.topicConfig[key]?.name || "ROS / 미설정";
        return;
      }
      const config = state.streamConfig[key];
      binding.topicLabel.textContent = config.mode === "disabled"
        ? "MEDIA / DISABLED"
        : `MEDIA / ${config.mode.toUpperCase()}`;
    });
  }

  function renderArmLoadout() {
    const labels = {
      unknown: "미확인",
      stored: "적재함",
      mounted: "로봇팔 장착"
    };

    document.querySelectorAll("[data-loadout-key]").forEach((item) => {
      const status = state.armLoadout[item.dataset.loadoutKey] || "unknown";
      item.dataset.status = status;
      const statusNode = item.querySelector(".loadout-state");
      if (statusNode) statusNode.textContent = labels[status];
      const itemName = item.querySelector("strong")?.textContent || item.dataset.loadoutKey;
      item.setAttribute("aria-label", `${itemName}: ${labels[status]}`);
    });
  }

  function setDemoArmLoadout(enabled) {
    ARM_LOADOUT_KEYS.forEach((key) => {
      state.armLoadout[key] = enabled
        ? key === "gripper" ? "mounted" : "stored"
        : "unknown";
    });
    renderArmLoadout();
  }

  function toggleDemo(enabled) {
    state.demo = enabled;
    setDemoArmLoadout(enabled);

    if (enabled) {
      if (state.connected || state.connecting) disconnectRos();
      stopAllMedia();
      setConnectionState("demo", "DEMO MODE");
      addLog("명시적 데모 모드를 시작했습니다.", "warning");
      startDemo();
    } else {
      stopDemo();
      resetDisplayedData();
      startAllMedia();
      setConnectionState("offline", "DISCONNECTED");
      addLog("데모 모드를 종료했습니다.");
    }
  }

  function startDemo() {
    stopDemo();
    initTopicStats();
    initMediaStats();
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
    handleArmTargetPointBase({
      point: {
        x: 0.42 + Math.sin(t * 0.4) * 0.05,
        z: 0.28 + Math.cos(t * 0.35) * 0.04
      }
    });

    const stat = state.topicStats.get("jointStates");
    const tick = Math.floor(t * 30);
    if (stat && tick !== stat._demoTick) {
      stat._demoTick = tick;
      stat.lastSeen = Date.now();
      stat.count += 1;
    }

    const targetStat = state.topicStats.get("armTargetPointBase");
    if (targetStat && tick !== targetStat._demoTick) {
      targetStat._demoTick = tick;
      targetStat.lastSeen = Date.now();
      targetStat.count += 1;
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
    binding.video.style.display = "none";
    if (binding.image) binding.image.style.display = "none";
    binding.rate.textContent = `${fps} FPS`;
    binding.age.textContent = "DEMO";

    const stat = CAMERA_TRANSPORT === "ros-compressed"
      ? state.topicStats.get(key)
      : state.mediaStats.get(key);
    const tick = Math.floor(t * fps);
    if (stat && tick !== stat._demoTick) {
      stat._demoTick = tick;
      stat.count += 1;
      stat.lastSeen = Date.now();
    }
  }

  function resetDisplayedData() {
    clearDetectionData();
    state.controlMode = null;
    state.gripperHoldReceived = false;
    state.latestGripperHold = false;
    resetGripperHoldIndicator();
    document.querySelectorAll("canvas.demo-camera").forEach((canvas) => canvas.remove());
    Object.values(cameraBindings).forEach((binding) => {
      binding.stage.classList.remove("has-signal");
      binding.video.pause();
      binding.video.srcObject = null;
      binding.video.removeAttribute("src");
      binding.video.style.display = "";
      if (binding.image) {
        binding.image.onload = null;
        binding.image.onerror = null;
        binding.image.removeAttribute("src");
        binding.image.style.display = "";
      }
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
    dom.armTargetPosition.textContent = "TARGET X -- / Z --";
    $("pathPoseCount").textContent = "0";
    $("pathLength").textContent = "0.0 m";
    $("pathFrame").textContent = "FRAME: --";
    $("odomX").textContent = "-- m";
    $("odomY").textContent = "-- m";
    $("odomYaw").textContent = "--°";
    $("linearSpeed").textContent = "-- m/s";
    $("hudSpeed").textContent = "0.00 m/s";
    setText("rmdDps", "-- deg/s");
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
    drawAllDetectionOverlays();
  }

  function applyTopCameraLayout(layout) {
    const row = $("topCameraRow");
    if (!row) return;

    ["left", "main", "right"].forEach((key) => {
      const value = Number(layout?.[key]);
      if (Number.isFinite(value) && value > 0) {
        row.style.setProperty(`--top-camera-${key}`, `${value}fr`);
      }
    });
  }

  function saveTopCameraLayout(layout) {
    try {
      localStorage.setItem(TOP_CAMERA_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    } catch (error) {
      console.warn("Failed to save camera layout", error);
    }
  }

  function loadTopCameraLayout() {
    try {
      const saved = JSON.parse(localStorage.getItem(TOP_CAMERA_LAYOUT_STORAGE_KEY) || "null");
      applyTopCameraLayout(saved);
    } catch (error) {
      console.warn("Failed to load camera layout", error);
    }
  }

  function getTopCameraWidths() {
    const left = document.querySelector(".grid-cam-1")?.getBoundingClientRect().width || 0;
    const main = document.querySelector(".grid-main-camera")?.getBoundingClientRect().width || 0;
    const right = document.querySelector(".grid-cam-2")?.getBoundingClientRect().width || 0;
    return { left, main, right };
  }

  function resizePair(first, second, delta, preferredFirstMin, preferredSecondMin) {
    const pairTotal = first + second;
    const preferredTotal = preferredFirstMin + preferredSecondMin;
    const minimumScale = Math.min(1, (pairTotal * 0.8) / preferredTotal);
    const firstMin = Math.max(24, preferredFirstMin * minimumScale);
    const secondMin = Math.max(24, preferredSecondMin * minimumScale);
    const nextFirst = Math.min(pairTotal - secondMin, Math.max(firstMin, first + delta));
    return [nextFirst, pairTotal - nextFirst];
  }

  function resizeTopCameraPair(handle, deltaX, startWidths) {
    const widths = { ...startWidths };

    if (handle === "left") {
      [widths.left, widths.main] = resizePair(
        startWidths.left,
        startWidths.main,
        deltaX,
        TOP_CAMERA_MIN_WIDTHS.left,
        TOP_CAMERA_MIN_WIDTHS.main
      );
    } else {
      [widths.main, widths.right] = resizePair(
        startWidths.main,
        startWidths.right,
        deltaX,
        TOP_CAMERA_MIN_WIDTHS.main,
        TOP_CAMERA_MIN_WIDTHS.right
      );
    }

    applyTopCameraLayout(widths);
    handleResize();
    return widths;
  }

  function bindTopCameraResizers() {
    const row = $("topCameraRow");
    if (!row) return;

    loadTopCameraLayout();

    row.querySelectorAll(".camera-column-resizer").forEach((resizer) => {
      let activeLayout = null;

      const applyKeyboardDelta = (deltaX) => {
        const layout = resizeTopCameraPair(resizer.dataset.cameraResizer, deltaX, getTopCameraWidths());
        saveTopCameraLayout(layout);
      };

      resizer.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        applyKeyboardDelta(event.key === "ArrowRight" ? 24 : -24);
      });

      resizer.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) return;

        const handle = resizer.dataset.cameraResizer;
        const startX = event.clientX;
        const startWidths = getTopCameraWidths();
        row.classList.add("is-resizing");
        document.body.classList.add("camera-column-resizing");
        resizer.setPointerCapture?.(event.pointerId);

        const onPointerMove = (moveEvent) => {
          activeLayout = resizeTopCameraPair(handle, moveEvent.clientX - startX, startWidths);
        };

        const onPointerUp = () => {
          row.classList.remove("is-resizing");
          document.body.classList.remove("camera-column-resizing");
          if (activeLayout) saveTopCameraLayout(activeLayout);
          window.removeEventListener("pointermove", onPointerMove);
          window.removeEventListener("pointerup", onPointerUp);
          window.removeEventListener("pointercancel", onPointerUp);
        };

        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
        window.addEventListener("pointercancel", onPointerUp);
      });
    });
  }

  function applyDashboardLayout(layout) {
    const shell = document.querySelector(".app-shell");
    if (!shell) return;

    ["left", "middle", "right", "top", "upper", "lower"].forEach((key) => {
      const value = Number(layout?.[key]);
      if (Number.isFinite(value) && value > 0) {
        shell.style.setProperty(`--dashboard-${key}`, `${value}fr`);
      }
    });
  }

  function saveDashboardLayout(layout) {
    try {
      localStorage.setItem(DASHBOARD_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    } catch (error) {
      console.warn("Failed to save dashboard layout", error);
    }
  }

  function loadDashboardLayout() {
    try {
      const saved = JSON.parse(localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY) || "null");
      applyDashboardLayout(saved);
    } catch (error) {
      console.warn("Failed to load dashboard layout", error);
    }
  }

  function getDashboardDimensions() {
    return {
      left: document.querySelector(".grid-arm-kinematics")?.getBoundingClientRect().width || 0,
      middle: document.querySelector(".grid-arm-camera")?.getBoundingClientRect().width || 0,
      right: document.querySelector(".grid-path")?.getBoundingClientRect().width || 0,
      top: $("topCameraRow")?.getBoundingClientRect().height || 0,
      upper: document.querySelector(".grid-arm-camera")?.getBoundingClientRect().height || 0,
      lower: 0
    };
  }

  function resizeDashboard(handle, delta, startLayout) {
    const layout = { ...startLayout };

    if (handle === "left") {
      [layout.left, layout.middle] = resizePair(
        startLayout.left,
        startLayout.middle,
        delta,
        DASHBOARD_MIN_SIZES.left,
        DASHBOARD_MIN_SIZES.middle
      );
    } else if (handle === "right") {
      [layout.middle, layout.right] = resizePair(
        startLayout.middle,
        startLayout.right,
        delta,
        DASHBOARD_MIN_SIZES.middle,
        DASHBOARD_MIN_SIZES.right
      );
    } else if (handle === "arm-row") {
      [layout.upper, layout.lower] = resizePair(
        startLayout.upper,
        startLayout.lower,
        delta,
        DASHBOARD_MIN_SIZES.upper,
        DASHBOARD_MIN_SIZES.lower
      );
    } else if (handle === "top") {
      const [nextTop, nextUpper] = resizePair(
        startLayout.top,
        startLayout.upper,
        delta,
        DASHBOARD_MIN_SIZES.top,
        DASHBOARD_MIN_SIZES.upper
      );
      layout.top = nextTop;
      layout.upper = nextUpper;
      layout.lower = 0;
    }

    applyDashboardLayout(layout);
    handleResize();
    return layout;
  }

  function bindDashboardResizers() {
    loadDashboardLayout();

    document.querySelectorAll(".dashboard-resizer").forEach((resizer) => {
      let activeLayout = null;
      const handle = resizer.dataset.dashboardResizer;
      const horizontal = handle === "top" || handle === "arm-row";

      resizer.addEventListener("keydown", (event) => {
        const negativeKey = horizontal ? "ArrowUp" : "ArrowLeft";
        const positiveKey = horizontal ? "ArrowDown" : "ArrowRight";
        if (event.key !== negativeKey && event.key !== positiveKey) return;
        event.preventDefault();
        const layout = resizeDashboard(
          handle,
          event.key === positiveKey ? 24 : -24,
          getDashboardDimensions()
        );
        saveDashboardLayout(layout);
      });

      resizer.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) return;

        const startPosition = horizontal ? event.clientY : event.clientX;
        const startLayout = getDashboardDimensions();
        const resizingClass = horizontal ? "dashboard-row-resizing" : "dashboard-column-resizing";
        resizer.classList.add("is-resizing");
        document.body.classList.add(resizingClass);
        resizer.setPointerCapture?.(event.pointerId);

        const onPointerMove = (moveEvent) => {
          const currentPosition = horizontal ? moveEvent.clientY : moveEvent.clientX;
          activeLayout = resizeDashboard(handle, currentPosition - startPosition, startLayout);
        };

        const onPointerUp = () => {
          resizer.classList.remove("is-resizing");
          document.body.classList.remove(resizingClass);
          if (activeLayout) saveDashboardLayout(activeLayout);
          window.removeEventListener("pointermove", onPointerMove);
          window.removeEventListener("pointerup", onPointerUp);
          window.removeEventListener("pointercancel", onPointerUp);
        };

        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
        window.addEventListener("pointercancel", onPointerUp);
      });
    });
  }

  function getPathPanelHeights() {
    return {
      canvas: document.querySelector(".path-panel > .canvas-stage")?.getBoundingClientRect().height || 0,
      controls: document.querySelector(".path-panel > .path-control-panel")?.getBoundingClientRect().height || 0
    };
  }

  function applyPathPanelLayout(layout) {
    const panel = document.querySelector(".path-panel");
    const canvas = Number(layout?.canvas);
    const controls = Number(layout?.controls);
    if (!panel || !Number.isFinite(canvas) || !Number.isFinite(controls) || canvas <= 0 || controls <= 0) return;

    panel.style.setProperty("--path-canvas-size", `${canvas}fr`);
    panel.style.setProperty("--path-control-size", `${controls}fr`);

    const resizer = panel.querySelector(".path-section-resizer");
    const total = canvas + controls;
    resizer?.setAttribute("aria-valuenow", String(Math.round((canvas / total) * 100)));
  }

  function savePathPanelLayout(layout) {
    try {
      localStorage.setItem(PATH_PANEL_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    } catch (error) {
      console.warn("Failed to save path panel layout", error);
    }
  }

  function loadPathPanelLayout() {
    try {
      const saved = JSON.parse(localStorage.getItem(PATH_PANEL_LAYOUT_STORAGE_KEY) || "null");
      applyPathPanelLayout(saved);
    } catch (error) {
      console.warn("Failed to load path panel layout", error);
    }
  }

  function resizePathPanel(deltaY, startHeights) {
    const [canvas, controls] = resizePair(
      startHeights.canvas,
      startHeights.controls,
      deltaY,
      180,
      132
    );
    const layout = { canvas, controls };
    applyPathPanelLayout(layout);
    handleResize();
    return layout;
  }

  function bindPathPanelResizer() {
    const resizer = document.querySelector(".path-section-resizer");
    if (!resizer) return;

    loadPathPanelLayout();

    resizer.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      event.preventDefault();
      const layout = resizePathPanel(
        event.key === "ArrowDown" ? 24 : -24,
        getPathPanelHeights()
      );
      savePathPanelLayout(layout);
    });

    resizer.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;

      const startY = event.clientY;
      const startHeights = getPathPanelHeights();
      let activeLayout = null;
      resizer.classList.add("is-resizing");
      document.body.classList.add("dashboard-row-resizing");
      resizer.setPointerCapture?.(event.pointerId);

      const onPointerMove = (moveEvent) => {
        activeLayout = resizePathPanel(moveEvent.clientY - startY, startHeights);
      };

      const onPointerUp = () => {
        resizer.classList.remove("is-resizing");
        document.body.classList.remove("dashboard-row-resizing");
        if (activeLayout) savePathPanelLayout(activeLayout);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);
    });
  }

  function bindEvents() {
    bindTopCameraResizers();
    bindDashboardResizers();
    bindPathPanelResizer();

    dom.connectButton.addEventListener("click", connectRos);
    dom.disconnectButton.addEventListener("click", disconnectRos);
    dom.demoToggle.addEventListener("change", (event) => toggleDemo(event.target.checked));
    dom.recordButton.addEventListener("click", () => publishPathCommand("record"));
    dom.returnButton.addEventListener("click", () => publishPathCommand("return"));

    dom.rosbridgeUrl.addEventListener("keydown", (event) => {
      if (event.key === "Enter") connectRos();
    });

    dom.settingsButton.addEventListener("click", () => {
      buildSettingsForm();
      dom.settingsDialog.showModal();
    });

    dom.saveTopicsButton.addEventListener("click", saveSettingsFromDialog);
    dom.resetTopicsButton.addEventListener("click", resetTopicSettings);
    document.querySelectorAll(".fullscreen-button").forEach((button) => {
      button.addEventListener("click", () => {
        const target = $(button.dataset.fullscreenTarget);
        if (!target) return;
        if (document.fullscreenElement) document.exitFullscreen();
        else target.requestFullscreen?.();
      });
    });

    window.addEventListener("beforeunload", () => {
      stopAllMedia();
      clearSubscriptions();
      clearPathCommandPublishers();
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

  function configureCameraTransportUi() {
    if (CAMERA_TRANSPORT !== "ros-compressed") return;

    document.title = "DOLBOT CENTER | ROS CompressedImage";
    const settingsDescription = $("settingsDescription");
    const mediaSettingsSection = $("mediaSettingsSection");
    if (settingsDescription) {
      settingsDescription.textContent =
        "상태 데이터와 카메라 영상 모두 rosbridge를 통해 ROS 2 토픽으로 수신합니다.";
    }
    if (mediaSettingsSection) mediaSettingsSection.hidden = true;
  }

  function initialize() {
    configureCameraTransportUi();
    initTopicStats();
    initMediaStats();
    updateTopicLabels();
    renderTopicHealth();
    renderArmLoadout();
    bindEvents();
    startUiLoops();
    setConnectionState("offline", "DISCONNECTED");
    handleResize();
    startAllMedia();
    addLog(CAMERA_TRANSPORT === "ros-compressed"
      ? "ROS CompressedImage 영상 모드 초기화 완료"
      : "UI 초기화 완료");
  }

  initialize();
})();
