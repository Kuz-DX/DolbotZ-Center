# JECS → DOLBOT CENTER

## 터미널 1 — CAN 인터페이스

```bash
ssh jecs@192.168.0.100
sudo ip link set down can_drive
sudo ip link set can_drive type can bitrate 1000000
sudo ip link set up can_drive
sudo ip link set down can_arm
sudo ip link set can_arm type can bitrate 1000000
sudo ip link set up can_arm
ip -br link | grep -E 'can_drive|can_arm'
```

## 터미널 2 — 주행용 D455 ROS

```bash
ssh jecs@192.168.0.100
source /opt/ros/humble/setup.bash
source ~/dolbotZ/install/setup.bash
export ROS_DOMAIN_ID=0
ros2 launch dolbotz drive_cam.launch.py
```

## 터미널 3 — 로봇팔용 D455 ROS

```bash
ssh jecs@192.168.0.100
source /opt/ros/humble/setup.bash
source ~/dolbotZ/install/setup.bash
export ROS_DOMAIN_ID=0
ros2 launch dolbotz arm_cam.launch.py
```

## 터미널 4 — 좌·우 사이드 카메라 ROS

```bash
ssh jecs@192.168.0.100
source /opt/ros/humble/setup.bash
source ~/dolbotZ/install/setup.bash
export ROS_DOMAIN_ID=0
LEFT_CAMERA="$(find /dev/v4l/by-id -maxdepth 1 -type l \
  -iname '*C920*video-index0' -print -quit)"
RIGHT_CAMERA="$(find /dev/v4l/by-id -maxdepth 1 -type l \
  -iname '*C922*video-index0' -print -quit)"
test -n "$LEFT_CAMERA"
test -n "$RIGHT_CAMERA"
ros2 launch dolbotz side_cameras.launch.py \
  left_device:="$LEFT_CAMERA" \
  right_device:="$RIGHT_CAMERA"
```

## 터미널 4-1 — Drive·좌·우 사람 추론

```bash
ssh jecs@192.168.0.100
source /opt/ros/humble/setup.bash
source ~/dolbotZ/install/setup.bash
export ROS_DOMAIN_ID=0
ros2 launch vision person_detection.launch.py
```

## 터미널 5 — 경로·주행 상태

```bash
ssh jecs@192.168.0.100
source /opt/ros/humble/setup.bash
source ~/dolbotZ/install/setup.bash
export ROS_DOMAIN_ID=0
ros2 launch dolbotz mission_winter.launch.py enable_visualizer:=false
```

## 터미널 6 — 오도메트리·IMU·진단

```bash
ssh jecs@192.168.0.100
source /opt/ros/humble/setup.bash
source ~/dolbotZ/install/setup.bash
export ROS_DOMAIN_ID=0
ros2 launch robot_bringup reduced_odom_bringup.launch.py
```

### 수동 주행·자동 복귀 운용 — 터미널 5·6 대체

`manual_return_bringup.launch.py`는 구동 드라이버와 오도메트리까지 포함하므로
위 터미널 5·6과 동시에 실행하지 않습니다. 수동 기록·RETURN 운용 시에는 둘 대신
다음 명령을 실행합니다.

```bash
ssh jecs@192.168.0.100
source /opt/ros/humble/setup.bash
source ~/ResKU/install/setup.bash
export ROS_DOMAIN_ID=0
ros2 launch robot_bringup manual_return_bringup.launch.py
```

UI의 `EMERGENCY` 버튼은 `/emergency_stop=true`를 발행합니다. 해당 launch의
`return_state_machine_node`가 우선 `/cmd_vel_safety`와 `/cmd_vel_return`에 0을
전달한 뒤 종료되며, launch 전체와 `rmd_x8_driver_node`도 함께 shutdown됩니다.
긴급정지 후 다시 운용하려면 위 launch 명령을 새로 실행해야 합니다. 이는 ROS와
네트워크에 의존하는 소프트웨어 정지이며 물리 비상정지 장치를 대체하지 않습니다.

## 터미널 7 — 로봇팔 관절

```bash
ssh jecs@192.168.0.100
source /opt/ros/humble/setup.bash
source ~/dolbotZ/install/setup.bash
export ROS_DOMAIN_ID=0
ros2 launch rmd_joint_state_bridge joint_state_bridge.launch.py
```

## 터미널 8 — rosbridge·UI 포트 포워딩

```bash
ssh \
  -L 9090:localhost:9090 \
  -L 8888:localhost:8888 \
  -L 8889:localhost:8889 \
  jecs@192.168.0.100
source /opt/ros/humble/setup.bash
source ~/dolbotZ/install/setup.bash
export ROS_DOMAIN_ID=0
ros2 launch rosbridge_server rosbridge_websocket_launch.xml
```

## 터미널 9 — MediaMTX

```bash
ssh jecs@192.168.0.100
cd ~/DolbotZ-Center/deploy
cp -n .env.example .env
sed -i 's/^MEDIA_SERVER_IP=.*/MEDIA_SERVER_IP=192.168.0.100/' .env
docker compose up
```

## 터미널 10 — 메인 카메라 ROS → `main`

```bash
ssh jecs@192.168.0.100
source /opt/ros/humble/setup.bash
source ~/dolbotZ/install/setup.bash
export ROS_DOMAIN_ID=0
python3 ~/dolbotZ/util/ros_compressed_to_rtsp.py --ros-args \
  -r __node:=drive_camera_rtsp_bridge \
  -p image_topic:=/drive/camera/color/image_raw/compressed \
  -p rtsp_url:=rtsp://127.0.0.1:8554/main \
  -p fps:=15 -p bitrate_kbps:=1500 -p keyframe_interval:=15
```

## 터미널 11 — 좌측 카메라 ROS → `sub1`

```bash
ssh jecs@192.168.0.100
source /opt/ros/humble/setup.bash
source ~/dolbotZ/install/setup.bash
export ROS_DOMAIN_ID=0
python3 ~/dolbotZ/util/ros_compressed_to_rtsp.py --ros-args \
  -r __node:=left_camera_rtsp_bridge \
  -p image_topic:=/side/left/image_raw/compressed \
  -p rtsp_url:=rtsp://127.0.0.1:8554/sub1 \
  -p fps:=15 -p bitrate_kbps:=1500 -p keyframe_interval:=15
```

## 터미널 12 — 우측 카메라 ROS → `sub2`

```bash
ssh jecs@192.168.0.100
source /opt/ros/humble/setup.bash
source ~/dolbotZ/install/setup.bash
export ROS_DOMAIN_ID=0
python3 ~/dolbotZ/util/ros_compressed_to_rtsp.py --ros-args \
  -r __node:=right_camera_rtsp_bridge \
  -p image_topic:=/side/right/image_raw/compressed \
  -p rtsp_url:=rtsp://127.0.0.1:8554/sub2 \
  -p fps:=15 -p bitrate_kbps:=1500 -p keyframe_interval:=15
```

## 터미널 13 — 로봇팔 카메라 ROS → `arm`

```bash
ssh jecs@192.168.0.100
source /opt/ros/humble/setup.bash
source ~/dolbotZ/install/setup.bash
export ROS_DOMAIN_ID=0
python3 ~/dolbotZ/util/ros_compressed_to_rtsp.py --ros-args \
  -r __node:=arm_camera_rtsp_bridge \
  -p image_topic:=/arm/camera/color/image_raw/compressed \
  -p rtsp_url:=rtsp://127.0.0.1:8554/arm \
  -p fps:=15 -p bitrate_kbps:=1500 -p keyframe_interval:=15
```

## 모니터링 PC 터미널 — UI

```bash
cd /home/kuzdx/DolbotZ-Center
python3 -m http.server 8080
xdg-open http://localhost:8080/index.html
```
