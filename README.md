# DOLBOT CENTER — ROS 2 Humble 모니터링 웹 UI

업로드된 배치도를 기준으로 다음 영역을 분리한 정적 웹 UI입니다.

- 상단: Sub Camera 1 / Main Camera / Sub Camera 2
- 좌측 메뉴: ROSBRIDGE 연결 설정, 이벤트 로그, 시스템 연결 상태
- 좌측 하단: 로봇 연결·충격·센서 상태, Odom/IMU/배터리
- 중앙 하단: 로봇팔 카메라, JointState 기반 2D 로봇팔 순기구학
- 우측 하단: 생성된 주행 경로, 관절 상태, 토픽 수신 상태
- HTML / CSS / JavaScript 완전 분리
- 실제 ROS 메시지를 받기 전에는 임의 데이터가 움직이지 않음
- DEMO 스위치를 직접 켠 경우에만 데모 데이터 표시

## 1. 파일 구성

```text
DolbotZ-Center/
├── index.html
├── styles.css
├── app.js
├── deploy/
│   ├── docker-compose.yml
│   ├── mediamtx.yml
│   └── .env.example
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
cd DolbotZ-Center
python3 -m http.server 8080
```

브라우저에서 다음 주소를 엽니다.

```text
http://localhost:8080
```

상단의 `연결` 버튼을 누르면 rosbridge에 연결하고 토픽 구독을 시작합니다.

## 4. 분리된 통신 구조

이 버전은 카메라 `CompressedImage`를 rosbridge에서 구독하지 않습니다.

```text
Odom / IMU / Battery / JointState / Path / 상태 플래그
  -> rosbridge :9090 -> app.js

카메라 4대(H.264 권장)
  -> RTSP publish -> MediaMTX
  -> WebRTC(WHEP) :8889 -> <video>
  -> 실패 시 HLS :8888 -> <video>
```

Base64는 원본 바이너리보다 약 33% 커지고 JSON 처리 비용도 추가됩니다. 영상이 미디어 서버로 이동하면 rosbridge에는 10개의 저대역폭 상태 토픽만 남습니다.

## 5. 기본 ROS 2 토픽 계약

| 용도 | 기본 토픽 | 메시지 타입 |
|---|---|---|
| 로봇팔 관절 | `/joint_states` | `sensor_msgs/msg/JointState` |
| 생성 경로 | `/plan` | `nav_msgs/msg/Path` |
| 오도메트리 | `/odom` | `nav_msgs/msg/Odometry` |
| IMU | `/imu/data` | `sensor_msgs/msg/Imu` |
| 배터리 | `/battery_state` | `sensor_msgs/msg/BatteryState` |
| 로봇 연결 | `/DOLbot/robot_connected` | `std_msgs/msg/Bool` |
| 충격/충돌 | `/DOLbot/collision` | `std_msgs/msg/Bool` |
| 센서 연결 | `/DOLbot/sensors_connected` | `std_msgs/msg/Bool` |
| 임무 상태 | `/DOLbot/mission_status` | `std_msgs/msg/String` |
| 진단 | `/diagnostics` | `diagnostic_msgs/msg/DiagnosticArray` |

톱니바퀴에서 ROS 토픽과 네 카메라의 WHEP/HLS 주소를 변경할 수 있습니다. 설정은 브라우저 `localStorage`에 저장됩니다.

## 6. MediaMTX 실행

로봇 PC 또는 같은 LAN의 미디어 PC에서 실행합니다.

```bash
cd deploy
cp .env.example .env
# .env의 MEDIA_SERVER_IP를 브라우저가 접근할 수 있는 실제 IP로 변경
docker compose up -d
```

사용 포트는 RTSP publish `8554/tcp`, HLS `8888/tcp`, WHEP signaling `8889/tcp`, WebRTC media `8189/udp`입니다.

카메라가 `/dev/video0`에서 raw 영상을 제공하는 예시는 다음과 같습니다. 실제 운영에서는 카메라 또는 GPU의 H.264 하드웨어 인코더를 우선 사용하십시오.

```bash
ffmpeg -f v4l2 -framerate 20 -video_size 1280x720 -i /dev/video0 \
  -an -c:v libx264 -preset veryfast -tune zerolatency -profile:v baseline \
  -g 20 -bf 0 -b:v 1500k -f rtsp rtsp://127.0.0.1:8554/main
```

나머지 장치는 경로를 각각 `sub1`, `sub2`, `arm`으로 바꿔 publish합니다. 카메라가 이미 브라우저 호환 H.264를 출력하면 `-c:v copy`로 재인코딩을 피할 수 있습니다. H.264 B-frame은 WebRTC 브라우저 호환성이 떨어지므로 비활성화해야 합니다.

웹 설정의 `localhost`는 웹과 MediaMTX가 같은 PC일 때만 유효합니다. 다른 PC라면 다음처럼 미디어 서버 IP로 변경합니다.

```text
http://192.168.0.20:8889/main/whep
http://192.168.0.20:8888/main/index.m3u8
```

WebRTC는 지연이 가장 낮고, HLS는 UDP/ICE 연결이 어려운 환경에서 자동 대체 경로로 사용됩니다. 대시보드에는 실제 디코딩 프레임 기준 FPS와 끊김 상태가 표시됩니다.

## 7. 테스트와 운영 주의사항

상태 토픽 테스트:

```bash
ros2 topic pub -r 1 /DOLbot/robot_connected std_msgs/msg/Bool "{data: true}"
ros2 topic pub -r 1 /DOLbot/sensors_connected std_msgs/msg/Bool "{data: true}"
ros2 topic pub -r 1 /DOLbot/collision std_msgs/msg/Bool "{data: false}"
```

- HTTPS로 UI를 제공하면 WHEP/HLS도 HTTPS여야 브라우저 혼합 콘텐츠 차단을 피할 수 있습니다.
- `9090`, `8888`, `8889`, `8189/udp`를 공용망에 직접 노출하지 말고 VPN, 방화벽, TLS, 인증을 적용하십시오.
- 제공한 MediaMTX 설정은 LAN 개발용으로 CORS가 열려 있습니다. 운영 환경에서는 UI origin으로 제한하십시오.
- 무선 대역폭은 해상도보다 네 카메라의 합산 비트레이트로 산정합니다. 예: 카메라당 1.5 Mbps이면 영상만 약 6 Mbps입니다.
- 충돌·비상정지는 웹 UI에 의존하지 않고 로봇 로컬 제어기에서 처리해야 합니다.
- `Path.header.frame_id`와 `Odometry.header.frame_id`가 다르면 경로 위 로봇 마커에 TF 변환이 필요합니다.


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
