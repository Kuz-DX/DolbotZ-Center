# DOLBOT CENTER 실행 방법

이 문서는 다음과 같이 컴퓨터를 2대로 나누어 사용하는 구성을 기준으로 한다.

- **센서 PC**: 뎁스카메라 2대와 웹캠 2대가 연결되어 있고 ROS 2 토픽을 발행하는 컴퓨터
- **모니터링 PC**: 웹 UI를 실행하고 센서 PC의 상태와 카메라 영상을 보는 컴퓨터

> 이 저장소에는 센서 드라이버나 ROS 2 패키지가 포함되어 있지 않다. 따라서 센서 드라이버 실행 명령은 실제 로봇의 패키지에 맞게 별도로 실행해야 한다. 아래 절차에는 이 웹 UI가 요구하는 통신 구성과 실행 항목만 정리한다.

## 1. 현재 카메라 4대를 표시하는 방식

카메라 영상은 ROS 2 이미지 토픽이나 rosbridge를 통해 전송하지 않는다. 영상과 상태 토픽을 다음과 같이 분리한다.

```text
ROS 2 상태 토픽
  센서/로봇 노드 -> rosbridge WebSocket(:9090) -> roslibjs -> 웹 UI

카메라 영상 4개
  카메라 -> FFmpeg H.264 인코딩 -> RTSP(:8554) -> MediaMTX
  MediaMTX -> WebRTC/WHEP(:8889, :8189/udp) -> 웹 UI의 <video>
           -> WebRTC 실패 시 HLS(:8888) -> 웹 UI의 <video>
```

이 방식을 사용하는 이유는 카메라 영상을 `sensor_msgs/msg/CompressedImage`의 Base64 JSON으로 rosbridge에 전달할 때 생기는 대역폭 증가와 브라우저의 JSON 처리 부하를 피하기 위해서다.

웹 UI의 기본 스트림은 다음과 같다.

| UI 위치 | MediaMTX 경로 | WHEP 주소 형식 | HLS 주소 형식 |
|---|---|---|---|
| 메인 카메라 | `main` | `http://<센서-PC-IP>:8889/main/whep` | `http://<센서-PC-IP>:8888/main/index.m3u8` |
| 서브 카메라 1 | `sub1` | `http://<센서-PC-IP>:8889/sub1/whep` | `http://<센서-PC-IP>:8888/sub1/index.m3u8` |
| 서브 카메라 2 | `sub2` | `http://<센서-PC-IP>:8889/sub2/whep` | `http://<센서-PC-IP>:8888/sub2/index.m3u8` |
| 로봇팔 카메라 | `arm` | `http://<센서-PC-IP>:8889/arm/whep` | `http://<센서-PC-IP>:8888/arm/index.m3u8` |

코드에는 특정 경로가 뎁스카메라인지 웹캠인지에 대한 고정 정보가 없다. 네 카메라를 어느 경로에 연결할지는 FFmpeg 실행 명령으로 결정된다. 예를 들어 다음과 같이 매핑할 수 있다.

| 장치 | 예시 경로 |
|---|---|
| 뎁스카메라 1의 컬러 영상 | `main` |
| 뎁스카메라 2의 컬러 영상 | `sub1` |
| 웹캠 1 | `sub2` |
| 웹캠 2 | `arm` |

현재 UI가 표시하는 것은 각 뎁스카메라의 **컬러 영상**이다. Depth map, point cloud 등의 깊이 데이터는 현재 UI에서 구독하거나 시각화하지 않는다.

## 2. 사전 확인

두 PC가 같은 LAN 또는 VPN에 연결되어 있고 서로 통신할 수 있어야 한다. 먼저 IP를 확인한다.

```bash
hostname -I
```

이 문서의 `<센서-PC-IP>`는 브라우저에서 접근 가능한 센서 PC의 실제 IPv4 주소로 바꾼다. 예를 들어 센서 PC가 `192.168.0.20`이면 다음과 같이 사용한다.

```text
ws://192.168.0.20:9090
http://192.168.0.20:8889/main/whep
```

방화벽 또는 네트워크 장비에서 다음 연결이 허용되어야 한다.

| 포트 | 프로토콜 | 용도 | 접속 방향 |
|---|---|---|---|
| `9090` | TCP | rosbridge WebSocket | 모니터링 PC -> 센서 PC |
| `8889` | TCP | WHEP signaling | 모니터링 PC -> 센서 PC |
| `8189` | UDP | WebRTC 영상 | 모니터링 PC <-> 센서 PC |
| `8888` | TCP | HLS 대체 영상 | 모니터링 PC -> 센서 PC |
| `8554` | TCP | FFmpeg의 RTSP publish | 센서 PC 내부에서만 사용 가능 |
| `8080` | TCP | 정적 웹 UI | 브라우저와 UI 서버가 다른 PC일 때만 필요 |

ROS 2 센서/로봇 노드가 여러 PC에 분산되어 있다면 그 ROS 2 PC들의 `ROS_DOMAIN_ID`와 RMW 설정도 같아야 한다. 다만 이 문서의 권장 구성처럼 rosbridge를 센서 PC에서 실행하면 모니터링 PC의 브라우저 자체는 DDS에 참여하지 않는다.

## 3. 센서 PC에서 실행할 것

### 3.1 필요한 프로그램 준비

최초 1회 다음 도구를 설치한다. ROS 2 Humble이 이미 설치되어 있다는 전제다.

```bash
sudo apt update
sudo apt install ros-humble-rosbridge-server ffmpeg v4l-utils
```

MediaMTX는 Docker Compose로 실행하므로 Docker Engine과 Compose 플러그인도 필요하다.

### 3.2 ROS 2 센서/로봇 노드 실행

새 터미널에서 ROS 2 환경을 설정하고 실제 센서 드라이버와 로봇 노드를 실행한다.

```bash
source /opt/ros/humble/setup.bash
export ROS_DOMAIN_ID=0
# 이 터미널에서 실제 센서 드라이버와 로봇 노드를 실행한다.
```

`ROS_DOMAIN_ID=0`은 예시이며 기존 시스템에서 다른 값을 사용한다면 그 값으로 바꾼다.

웹 UI가 기본으로 구독하는 토픽은 다음과 같다. 실제 토픽 이름이 다르면 나중에 웹 UI의 톱니바퀴 설정에서 변경할 수 있다.

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

발행 여부와 타입은 다음 명령으로 확인한다.

```bash
ros2 topic list -t
ros2 topic hz /odom
ros2 topic echo /DOLbot/sensors_connected --once
```

### 3.3 rosbridge 실행

새 터미널에서 실행한다.

```bash
source /opt/ros/humble/setup.bash
export ROS_DOMAIN_ID=0
ros2 launch rosbridge_server rosbridge_websocket_launch.xml
```

기본 포트는 `9090/tcp`이다. 이 프로세스를 종료하면 웹 UI의 모든 ROS 2 상태 데이터가 끊긴다.

### 3.4 MediaMTX 실행

이 저장소의 `deploy` 디렉터리에서 환경 파일을 만든다.

```bash
cd /path/to/DolbotZ-Center/deploy
cp .env.example .env
```

`.env`의 값을 센서 PC의 실제 IP로 수정한다.

```dotenv
MEDIA_SERVER_IP=192.168.0.20
```

MediaMTX를 실행한다.

```bash
docker compose up -d
docker compose ps
```

로그 확인이 필요하면 다음 명령을 사용한다.

```bash
docker compose logs -f mediamtx
```

### 3.5 카메라 장치 4개 확인

카메라 번호는 재부팅이나 연결 순서에 따라 달라질 수 있으므로 `/dev/video0` 같은 번호를 바로 고정하지 않는 것이 좋다.

`~/dolbotZ/src/dolbotz/config/realsense_cameras.yaml`에 등록된 뎁스카메라는 다음 두 대다.

| 용도 | 모델 | 시리얼 | Center 스트림 |
|---|---|---|---|
| 주행용 | D455 | `117222251401` | `main` |
| 로봇팔용 | D455 | `213622251385` | `sub1` |

```bash
v4l2-ctl --list-devices
ls -l /dev/v4l/by-id/
```

뎁스카메라는 한 대가 컬러, depth, infrared 등 여러 `/dev/video*` 노드를 만들 수 있다. 다음 명령으로 후보 장치가 지원하는 포맷과 해상도를 확인하고 **컬러 영상을 내는 노드**를 선택한다.

```bash
v4l2-ctl --device /dev/video0 --list-formats-ext
```

`/dev/video0`은 확인 방법을 보여 주기 위한 예시다. 가능하면 `/dev/v4l/by-id/...`의 고정 심볼릭 링크를 FFmpeg 입력으로 사용한다.

RealSense 한 대는 여러 V4L2 노드를 만들기 때문에 시리얼만 일치하는 첫 링크를 바로 쓰면 depth나 infrared 노드가 선택될 수 있다. 아래 함수는 해당 시리얼의 후보 중 `MJPG` 또는 `YUYV` 컬러 포맷을 제공하는 고정 심볼릭 링크를 선택한다. 카메라를 연결한 센서 PC 터미널에서 먼저 실행한다.

```bash
find_realsense_color_link() {
  local serial="$1"
  local device link

  for device in /dev/video*; do
    [[ -e "$device" ]] || continue
    udevadm info --query=property --name "$device" 2>/dev/null \
      | grep -Fq "$serial" || continue
    v4l2-ctl --device "$device" --list-formats-ext 2>/dev/null \
      | grep -Eq "'(MJPG|YUYV)'" || continue

    link="$(find -L /dev/v4l/by-id -maxdepth 1 -samefile "$device" \
      -print -quit 2>/dev/null)"
    if [[ -n "$link" ]]; then
      printf '%s\n' "$link"
    else
      printf '고정 링크가 없어 %s를 임시 사용합니다.\n' "$device" >&2
      printf '%s\n' "$device"
    fi
    return 0
  done

  printf '시리얼 %s의 컬러 V4L2 장치를 찾지 못했습니다.\n' "$serial" >&2
  return 1
}

DEPTH_CAM_1_COLOR="$(find_realsense_color_link 117222251401)"
DEPTH_CAM_2_COLOR="$(find_realsense_color_link 213622251385)"
printf 'drive: %s\narm:   %s\n' "$DEPTH_CAM_1_COLOR" "$DEPTH_CAM_2_COLOR"
```

두 출력이 모두 `/dev/v4l/by-id/...`로 나오고, 아래 명령이 컬러 포맷을 표시하는지 확인한다.

```bash
v4l2-ctl --device "$DEPTH_CAM_1_COLOR" --list-formats-ext
v4l2-ctl --device "$DEPTH_CAM_2_COLOR" --list-formats-ext
```

장치를 찾지 못하면 먼저 실제 연결 상태와 udev에 잡힌 시리얼을 확인한다. `ID_SERIAL` 또는 `ID_SERIAL_SHORT`에 위 시리얼이 없으면 케이블 연결 상태를 확인하고, `rs-enumerate-devices -s`의 실제 시리얼과 `~/dolbotZ` 설정이 일치하는지 비교한다.

```bash
rs-enumerate-devices -s
for device in /dev/video*; do
  echo "=== $device ==="
  udevadm info --query=property --name "$device" 2>/dev/null \
    | grep -E '^(ID_SERIAL|ID_SERIAL_SHORT|ID_V4L_PRODUCT)='
done
```

### 3.6 카메라 4개를 RTSP로 발행

각 명령은 계속 실행되어야 하므로 터미널 4개, `tmux`, 또는 운영용 systemd 서비스를 사용한다. 뎁스카메라 명령은 `~/dolbotZ`에서 가져온 시리얼로 컬러 심볼릭 링크를 자동 탐색한다. 웹캠 명령의 장치 경로는 3.5에서 확인한 실제 경로로 바꾼 후 실행한다.

뎁스카메라 1의 컬러 영상 -> `main`:

```bash
DEPTH_CAM_1_COLOR="$(
  for device in /dev/video*; do
    [[ -e "$device" ]] || continue
    udevadm info --query=property --name "$device" 2>/dev/null |
      grep -Fq '117222251401' || continue
    v4l2-ctl --device "$device" --list-formats-ext 2>/dev/null |
      grep -Eq "'(MJPG|YUYV)'" || continue
    link="$(find -L /dev/v4l/by-id -maxdepth 1 -samefile "$device" -print -quit 2>/dev/null)"
    printf '%s\n' "${link:-$device}"
    break
  done
)"
if [[ -z "$DEPTH_CAM_1_COLOR" ]]; then
  echo '주행용 D455(117222251401) 컬러 장치를 찾지 못했습니다.' >&2
else
  echo "주행용 D455 입력: $DEPTH_CAM_1_COLOR"
  ffmpeg -f v4l2 -framerate 20 -video_size 1280x720 -i "$DEPTH_CAM_1_COLOR" \
    -an -c:v libx264 -preset veryfast -tune zerolatency -profile:v baseline \
    -g 20 -bf 0 -b:v 1500k -f rtsp rtsp://127.0.0.1:8554/main
fi
```

뎁스카메라 2의 컬러 영상 -> `sub1`:

```bash
DEPTH_CAM_2_COLOR="$(
  for device in /dev/video*; do
    [[ -e "$device" ]] || continue
    udevadm info --query=property --name "$device" 2>/dev/null |
      grep -Fq '213622251385' || continue
    v4l2-ctl --device "$device" --list-formats-ext 2>/dev/null |
      grep -Eq "'(MJPG|YUYV)'" || continue
    link="$(find -L /dev/v4l/by-id -maxdepth 1 -samefile "$device" -print -quit 2>/dev/null)"
    printf '%s\n' "${link:-$device}"
    break
  done
)"
if [[ -z "$DEPTH_CAM_2_COLOR" ]]; then
  echo '로봇팔용 D455(213622251385) 컬러 장치를 찾지 못했습니다.' >&2
else
  echo "로봇팔용 D455 입력: $DEPTH_CAM_2_COLOR"
  ffmpeg -f v4l2 -framerate 20 -video_size 1280x720 -i "$DEPTH_CAM_2_COLOR" \
    -an -c:v libx264 -preset veryfast -tune zerolatency -profile:v baseline \
    -g 20 -bf 0 -b:v 1500k -f rtsp rtsp://127.0.0.1:8554/sub1
fi
```

웹캠 1 -> `sub2`:

```bash
WEBCAM_1=/dev/v4l/by-id/웹캠1의-실제-심볼릭링크
ffmpeg -f v4l2 -framerate 20 -video_size 1280x720 -i "$WEBCAM_1" \
  -an -c:v libx264 -preset veryfast -tune zerolatency -profile:v baseline \
  -g 20 -bf 0 -b:v 1500k -f rtsp rtsp://127.0.0.1:8554/sub2
```

웹캠 2 -> `arm`:

```bash
WEBCAM_2=/dev/v4l/by-id/웹캠2의-실제-심볼릭링크
ffmpeg -f v4l2 -framerate 20 -video_size 1280x720 -i "$WEBCAM_2" \
  -an -c:v libx264 -preset veryfast -tune zerolatency -profile:v baseline \
  -g 20 -bf 0 -b:v 1500k -f rtsp rtsp://127.0.0.1:8554/arm
```

장치가 위 입력 조건을 지원하지 않으면 `--list-formats-ext` 결과에 맞춰 `-framerate`, `-video_size`를 바꾼다. MJPEG 출력 장치라면 입력 옵션에 `-input_format mjpeg`가 필요할 수 있다. 네 개의 소프트웨어 H.264 인코더는 CPU 부하가 크므로 실제 운영에서는 카메라 또는 GPU가 지원하는 H.264 하드웨어 인코더 사용을 권장한다.

## 4. 모니터링 PC에서 실행할 것

### 4.1 웹 UI 서버 실행

저장소 루트에서 정적 HTTP 서버를 실행한다.

```bash
cd /path/to/DolbotZ-Center
python3 -m http.server 8080
```

이 터미널을 유지하고 모니터링 PC의 브라우저에서 다음 주소를 연다.

```text
http://localhost:8080
```

`index.html`은 `hls.js`와 `roslibjs`를 CDN에서 불러오므로 현재 구성 그대로라면 모니터링 PC의 브라우저가 인터넷에 접속할 수 있어야 한다.

### 4.2 웹 UI 통신 주소 설정

1. 상단의 `ROSBRIDGE` 입력란에 `ws://<센서-PC-IP>:9090`을 입력한다.
2. 톱니바퀴 버튼을 열어 카메라 4개의 WHEP/HLS 주소에서 `localhost`를 센서 PC IP로 바꾼다.
3. 각 스트림 모드는 기본값인 `auto`로 둔다.
4. `저장 및 재연결`을 누른다.
5. 상단의 `연결` 버튼을 눌러 rosbridge에 연결한다.

센서 PC IP가 `192.168.0.20`일 때 입력할 카메라 주소는 다음과 같다.

```text
Main WHEP: http://192.168.0.20:8889/main/whep
Main HLS:  http://192.168.0.20:8888/main/index.m3u8

Sub1 WHEP: http://192.168.0.20:8889/sub1/whep
Sub1 HLS:  http://192.168.0.20:8888/sub1/index.m3u8

Sub2 WHEP: http://192.168.0.20:8889/sub2/whep
Sub2 HLS:  http://192.168.0.20:8888/sub2/index.m3u8

Arm WHEP:  http://192.168.0.20:8889/arm/whep
Arm HLS:   http://192.168.0.20:8888/arm/index.m3u8
```

설정은 브라우저의 `localStorage`에 저장된다. 다른 브라우저나 시크릿 창에서는 다시 설정해야 한다.

## 5. 권장 실행 순서 요약

### 센서 PC

1. 실제 ROS 2 센서/로봇 노드를 실행한다.
2. rosbridge를 `9090` 포트로 실행한다.
3. Docker Compose로 MediaMTX를 실행한다.
4. FFmpeg 4개를 실행하여 `main`, `sub1`, `sub2`, `arm`으로 영상을 발행한다.

### 모니터링 PC

1. `python3 -m http.server 8080`으로 웹 UI를 실행한다.
2. 브라우저에서 `http://localhost:8080`을 연다.
3. ROSBRIDGE와 카메라 주소를 센서 PC IP로 설정한다.
4. `연결` 버튼을 누르고 토픽 상태와 카메라 4개가 모두 활성화되는지 확인한다.

## 6. 문제 확인 방법

### ROSBRIDGE가 연결되지 않을 때

센서 PC에서 rosbridge가 실행 중인지 확인한다.

```bash
ss -lnt | grep 9090
```

모니터링 PC에서 센서 PC의 포트에 도달 가능한지 확인한다.

```bash
nc -vz 192.168.0.20 9090
```

`192.168.0.20`은 센서 PC의 실제 IP로 바꾼다.

연결은 되지만 값이 표시되지 않으면 센서 PC에서 `ros2 topic list -t`로 토픽 이름과 타입을 확인하고, 웹 UI 톱니바퀴 설정의 토픽 이름을 일치시킨다.

### 카메라가 표시되지 않을 때

센서 PC에서 MediaMTX와 FFmpeg 로그를 확인한다.

```bash
cd /path/to/DolbotZ-Center/deploy
docker compose ps
docker compose logs --tail=100 mediamtx
```

모니터링 PC 브라우저에서 HLS 주소를 직접 열거나 다음 명령으로 HTTP 응답을 확인한다.

```bash
curl -v -o /dev/null http://192.168.0.20:8888/main/index.m3u8
```

`192.168.0.20`은 센서 PC의 실제 IP로 바꾼다.

- WHEP만 실패하고 HLS는 보이면 `8189/udp` 방화벽과 `MEDIA_SERVER_IP` 값을 확인한다.
- `404 Not Found`가 나오면 해당 경로의 FFmpeg publisher가 실행 중인지 확인한다.
- FFmpeg가 입력 장치를 열지 못하면 `/dev/v4l/by-id/` 경로와 장치 권한을 확인한다.
- 영상이 심하게 끊기면 네 카메라 합산 비트레이트와 센서 PC의 인코딩 CPU/GPU 사용량을 확인한다.

## 7. 운영 시 주의사항

- `localhost`는 브라우저가 실행되는 모니터링 PC 자신을 뜻한다. MediaMTX가 센서 PC에 있으면 반드시 센서 PC IP를 입력해야 한다.
- HTTPS로 웹 UI를 제공하면 브라우저의 혼합 콘텐츠 차단을 피하기 위해 rosbridge는 `wss://`, WHEP/HLS는 `https://`로 제공해야 한다.
- `9090`, `8888`, `8889`, `8189/udp`를 공용 인터넷에 직접 노출하지 말고 LAN/VPN, 방화벽, TLS와 인증을 사용한다.
- 충돌 감지나 비상정지는 웹 UI에 의존하지 않고 로봇의 로컬 제어기에서 처리해야 한다.
- 카메라 4대의 합산 비트레이트가 네트워크 대역폭보다 낮아야 한다. 예시 설정은 영상만 약 `1.5 Mbps x 4 = 6 Mbps`를 사용한다.

## 8. PC별 터미널 실행문 모음

아래 명령은 `ROS_DOMAIN_ID=0`, 센서 PC IP는 `192.168.0.20`인 예시다. 기존 시스템의 값이 다르면 두 값을 실제 환경에 맞게 바꾼다. 뎁스카메라는 `~/dolbotZ`에 등록된 시리얼로 컬러 심볼릭 링크를 자동 탐색한다. 웹캠 장치 경로는 `v4l2-ctl --list-devices`와 `/dev/v4l/by-id/`에서 확인한 실제 경로로 교체해야 한다.

### 메인 PC(센서가 연결된 PC)

#### 터미널 1 — ROS 2 센서 및 로봇 노드

```bash
source /opt/ros/humble/setup.bash
export ROS_DOMAIN_ID=0
# 이 위치에서 기존 센서 드라이버/로봇 통합 launch 명령을 실행한다.
```

> 센서 드라이버와 로봇 노드가 하나의 launch로 묶여 있지 않다면 필요한 만큼 터미널을 추가한다. 이 저장소에는 해당 ROS 2 패키지가 없으므로 실제 launch 명령은 로봇 프로젝트의 실행 명령을 사용한다.

#### 터미널 2 — rosbridge

```bash
source /opt/ros/humble/setup.bash
export ROS_DOMAIN_ID=0
ros2 launch rosbridge_server rosbridge_websocket_launch.xml
```

#### 터미널 3 — MediaMTX

`.env`의 `MEDIA_SERVER_IP`가 메인 PC의 실제 IP로 설정되어 있어야 한다.

```bash
cd /home/kuzdx/DolbotZ-Center/deploy
docker compose up
```

#### 터미널 4 — 뎁스카메라 1 컬러 영상(`main`)

```bash
DEPTH_CAM_1_COLOR="$(
  for device in /dev/video*; do
    [[ -e "$device" ]] || continue
    udevadm info --query=property --name "$device" 2>/dev/null |
      grep -Fq '117222251401' || continue
    v4l2-ctl --device "$device" --list-formats-ext 2>/dev/null |
      grep -Eq "'(MJPG|YUYV)'" || continue
    link="$(find -L /dev/v4l/by-id -maxdepth 1 -samefile "$device" -print -quit 2>/dev/null)"
    printf '%s\n' "${link:-$device}"
    break
  done
)"
if [[ -z "$DEPTH_CAM_1_COLOR" ]]; then
  echo '주행용 D455(117222251401) 컬러 장치를 찾지 못했습니다.' >&2
else
  echo "주행용 D455 입력: $DEPTH_CAM_1_COLOR"
  ffmpeg -f v4l2 -framerate 20 -video_size 1280x720 -i "$DEPTH_CAM_1_COLOR" \
    -an -c:v libx264 -preset veryfast -tune zerolatency -profile:v baseline \
    -g 20 -bf 0 -b:v 1500k -f rtsp rtsp://127.0.0.1:8554/main
fi
```

#### 터미널 5 — 뎁스카메라 2 컬러 영상(`sub1`)

```bash
DEPTH_CAM_2_COLOR="$(
  for device in /dev/video*; do
    [[ -e "$device" ]] || continue
    udevadm info --query=property --name "$device" 2>/dev/null |
      grep -Fq '213622251385' || continue
    v4l2-ctl --device "$device" --list-formats-ext 2>/dev/null |
      grep -Eq "'(MJPG|YUYV)'" || continue
    link="$(find -L /dev/v4l/by-id -maxdepth 1 -samefile "$device" -print -quit 2>/dev/null)"
    printf '%s\n' "${link:-$device}"
    break
  done
)"
if [[ -z "$DEPTH_CAM_2_COLOR" ]]; then
  echo '로봇팔용 D455(213622251385) 컬러 장치를 찾지 못했습니다.' >&2
else
  echo "로봇팔용 D455 입력: $DEPTH_CAM_2_COLOR"
  ffmpeg -f v4l2 -framerate 20 -video_size 1280x720 -i "$DEPTH_CAM_2_COLOR" \
    -an -c:v libx264 -preset veryfast -tune zerolatency -profile:v baseline \
    -g 20 -bf 0 -b:v 1500k -f rtsp rtsp://127.0.0.1:8554/sub1
fi
```

#### 터미널 6 — 웹캠 1(`sub2`)

```bash
WEBCAM_1=/dev/v4l/by-id/웹캠1의-실제-심볼릭링크
ffmpeg -f v4l2 -framerate 20 -video_size 1280x720 -i "$WEBCAM_1" \
  -an -c:v libx264 -preset veryfast -tune zerolatency -profile:v baseline \
  -g 20 -bf 0 -b:v 1500k -f rtsp rtsp://127.0.0.1:8554/sub2
```

#### 터미널 7 — 웹캠 2(`arm`)

```bash
WEBCAM_2=/dev/v4l/by-id/웹캠2의-실제-심볼릭링크
ffmpeg -f v4l2 -framerate 20 -video_size 1280x720 -i "$WEBCAM_2" \
  -an -c:v libx264 -preset veryfast -tune zerolatency -profile:v baseline \
  -g 20 -bf 0 -b:v 1500k -f rtsp rtsp://127.0.0.1:8554/arm
```

메인 PC에서는 **터미널 1 -> 2 -> 3 -> 4~7** 순서로 실행한다. 터미널 4~7은 MediaMTX가 준비된 다음 실행하며, 네 FFmpeg 터미널의 순서는 서로 바뀌어도 된다.

### 모니터링 PC

#### 터미널 1 — 웹 UI 서버

```bash
cd /home/kuzdx/DolbotZ-Center
python3 -m http.server 8080
```

모니터링 PC에서는 추가 터미널이 필요하지 않다. 브라우저에서 다음 주소를 연다.

```text
http://localhost:8080
```

웹 UI에서 다음과 같이 설정한다.

```text
ROSBRIDGE: ws://192.168.0.20:9090

Main: http://192.168.0.20:8889/main/whep
Sub1: http://192.168.0.20:8889/sub1/whep
Sub2: http://192.168.0.20:8889/sub2/whep
Arm:  http://192.168.0.20:8889/arm/whep
```

각 카메라의 HLS 주소도 같은 IP의 `8888` 포트로 설정한다. 설정 저장 후 상단 `연결` 버튼을 누른다.
