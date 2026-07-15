# POLBOT CENTER — ROS 2 Humble 모니터링 웹 UI

업로드된 배치도를 기준으로 다음 영역을 분리한 정적 웹 UI입니다.

- 상단: Sub Camera 1 / Main Camera / Sub Camera 2
- 좌측 하단: 로봇 연결·충격·센서 상태, Odom/IMU/배터리, 이벤트 로그
- 중앙 하단: 로봇팔 카메라, 생성된 주행 경로
- 우측 하단: JointState 기반 2D 로봇팔 순기구학, 관절 상태, 토픽 수신 상태
- HTML / CSS / JavaScript 완전 분리
- 실제 ROS 메시지를 받기 전에는 임의 데이터가 움직이지 않음
- DEMO 스위치를 직접 켠 경우에만 데모 데이터 표시

## 1. 파일 구성

```text
polbot_ros2_monitoring_ui/
├── index.html
├── styles.css
├── app.js
└── README.md
```

## 2. Ubuntu 22.04 / ROS 2 Humble 준비

```bash
sudo apt update
sudo apt install ros-humble-rosbridge-server
source /opt/ros/humble/setup.bash
ros2 launch rosbridge_server rosbridge_websocket_launch.xml
```

기본 WebSocket 포트는 `9090`입니다.

다른 PC의 브라우저에서 로봇 PC에 접속할 경우 UI의 ROSBRIDGE 주소를 다음처럼 입력합니다.

```text
ws://<로봇-PC-IP>:9090
```

HTTPS 페이지에서 접속하는 운영 환경은 혼합 콘텐츠 차단을 피하기 위해 `wss://` 구성이 필요합니다.

## 3. 웹 UI 실행

파일을 직접 더블클릭하는 대신 HTTP 서버로 실행하는 방식을 권장합니다.

```bash
cd polbot_ros2_monitoring_ui
python3 -m http.server 8080
```

브라우저에서 다음 주소를 엽니다.

```text
http://localhost:8080
```

상단의 `연결` 버튼을 누르면 rosbridge에 연결하고 토픽 구독을 시작합니다.

## 4. 기본 ROS 2 토픽 계약

| 용도 | 기본 토픽 | 메시지 타입 |
|---|---|---|
| 메인 카메라 | `/camera/main/image/compressed` | `sensor_msgs/msg/CompressedImage` |
| 서브 카메라 1 | `/camera/sub1/image/compressed` | `sensor_msgs/msg/CompressedImage` |
| 서브 카메라 2 | `/camera/sub2/image/compressed` | `sensor_msgs/msg/CompressedImage` |
| 로봇팔 카메라 | `/camera/robot_arm/image/compressed` | `sensor_msgs/msg/CompressedImage` |
| 로봇팔 관절 | `/joint_states` | `sensor_msgs/msg/JointState` |
| 생성 경로 | `/plan` | `nav_msgs/msg/Path` |
| 오도메트리 | `/odom` | `nav_msgs/msg/Odometry` |
| IMU | `/imu/data` | `sensor_msgs/msg/Imu` |
| 배터리 | `/battery_state` | `sensor_msgs/msg/BatteryState` |
| 로봇 연결 | `/polbot/robot_connected` | `std_msgs/msg/Bool` |
| 충격/충돌 | `/polbot/collision` | `std_msgs/msg/Bool` |
| 센서 연결 | `/polbot/sensors_connected` | `std_msgs/msg/Bool` |
| 임무 상태 | `/polbot/mission_status` | `std_msgs/msg/String` |
| 진단 | `/diagnostics` | `diagnostic_msgs/msg/DiagnosticArray` |

우측 상단 톱니바퀴에서 토픽명을 변경할 수 있으며 브라우저 `localStorage`에 저장됩니다.

## 5. 테스트 발행 예시

### 연결 상태

```bash
ros2 topic pub -r 1 /polbot/robot_connected std_msgs/msg/Bool "{data: true}"
ros2 topic pub -r 1 /polbot/sensors_connected std_msgs/msg/Bool "{data: true}"
ros2 topic pub -r 1 /polbot/collision std_msgs/msg/Bool "{data: false}"
ros2 topic pub -r 1 /polbot/mission_status std_msgs/msg/String "{data: 'PATROL READY'}"
```

### 카메라

UI는 브라우저에서 바로 표시할 수 있도록 `sensor_msgs/msg/CompressedImage`를 사용합니다.

예를 들어 카메라 드라이버가 raw image만 내보내는 경우 `image_transport` 압축 토픽을 사용하거나 별도 republish 노드를 둡니다.

```bash
ros2 topic list | grep compressed
```

### 경로 프레임 주의

경로의 로봇 위치 마커는 다음 조건에서만 함께 표시됩니다.

```text
Path.header.frame_id == Odometry.header.frame_id
```

`map` 경로와 `odom` 위치를 함께 표시하려면 실제 구현에서는 TF(`map -> odom`)를 적용한 좌표 변환이 필요합니다. 현재 정적 웹 UI는 TF 보간을 수행하지 않습니다.

## 6. 주요 구현 위치

`app.js` 상단의 `DEFAULT_TOPICS`:

- 기본 토픽명
- 메시지 타입
- 토픽별 stale 판정 시간

핵심 콜백:

- `handleCompressedImage()`: 카메라 영상
- `handleJointState()`: 관절명·각도·속도 수신
- `resolveArmJointState()`: 링크 길이와 관절각으로 X-Z 평면 순기구학 계산
- `drawArmKinematics()`: 계산된 관절 점을 선으로 연결해 로봇팔 표시
- `handlePath()`: 생성 경로
- `handleOdometry()`: 위치·Yaw·속도
- `handleImu()`: Roll·Pitch
- `handleBattery()`: 배터리
- `handleDiagnostics()`: DiagnosticArray

## 7. 실제 운용 전 보완 권고

- rosbridge `9090` 포트를 공용망에 직접 노출하지 않기
- 방화벽/VPN/리버스 프록시/TLS/인증 적용
- 허용 토픽을 최소화하고 명령 토픽과 모니터링 토픽 분리
- 카메라 4개를 고해상도·고FPS로 rosbridge Base64 전송하면 CPU·대역폭 사용량이 커질 수 있음
- 실전 영상은 WebRTC/HLS, 상태·명령만 rosbridge로 분리하는 구조 검토
- 충돌·비상정지 같은 안전 기능은 웹 UI 단독 판단에 의존하지 않고 로봇 로컬 제어기에서 처리


## 8. 로봇팔 시각화 방식

이 버전은 `/joint_states`의 `name`, `position`, `velocity`를 구독합니다.

각 링크 끝점은 X-Z 평면 직렬 로봇팔로 계산합니다.

```text
theta_i = theta_(i-1) + direction_i * q_i + offset_i
x_i = x_(i-1) + L_i * cos(theta_i)
z_i = z_(i-1) + L_i * sin(theta_i)
```

톱니바퀴 설정에서 다음 값을 실제 로봇팔에 맞게 입력해야 합니다.

- 관절 순서: `shoulder_joint, elbow_joint, wrist_joint`
- 링크 길이: `0.35, 0.30, 0.18`
- 영점 오프셋: `90, 0, 0`
- 회전 방향: `1, -1, 1`

관절 순서를 비워두면 `JointState.name` 수신 순서를 그대로 사용합니다.

### 정확도 제한

`JointState`에는 관절각은 있지만 링크 길이, 관절축, 고정 변환 정보는 포함되지 않습니다.
따라서 이 UI의 2D 계산은 설정한 링크 길이와 평면 회전축 가정에 의존합니다.

실제 로봇팔이 3차원 다축 구조이거나 관절축이 서로 다르면 다음 구조가 더 정확합니다.

```text
/joint_states
  -> robot_state_publisher + URDF
  -> /tf, /tf_static
  -> 관절 프레임의 실제 좌표를 웹 UI로 전달
```

또는 ROS 2 노드에서 TF를 조회해 각 관절의 위치를 `geometry_msgs/msg/PoseArray`로 발행하고,
웹 UI는 계산 없이 해당 좌표를 그리는 방식이 가장 단순하고 안정적입니다.


## 9. 테마 변경

- 기본 배경을 국방 카키 계열로 조정함
- 전체 페이지에 은은한 카모 패턴 오버레이 적용함
- 패널/입력창/캔버스 배경도 올리브-카키 톤으로 통일함
