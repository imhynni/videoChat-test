# videoChat

화상회의 및 채팅 구현해보기! 뚜🤛따🤜

## Preview

https://user-images.githubusercontent.com/27759684/179451166-9208fe86-a505-48a9-b619-2e9202b916aa.mp4

---

## 기능 기획

- 닉네임
- 채팅
  - 방 생성 및 접속
- 비디오
  - mute, camera on / off
  - 카메라 기기 선택

통신은 socketIo, webRTC, DataChannel 활용

---

## Tech

- Server
  - NodeJS / express
  - SocketIO
  - webRTC
  - DataChannel
- Client
  - pug
  - css

---

## 구현내용

<br>

### 틀

```pug
<!-- home.pug -->
body
    header
        h1 Video Chat
    main
        #nickname
            h4 Write your nickname
            form
                input(placeholder="Nickname", required, type="text")
        #welcome
            #welcome_div
                div
                    h4 참여 및 만들기
                    form
                        input(placeholder="room name", type="text", required)
                div
                    h4 Open Rooms:
                    ul
        #mainRoom
            #mainRoom_div
                #call
                    #stream
                        video#myFace(autoplay, playsinline, width="400", height="400")
                        video#peerFace(autoplay, playsinline, width="400", height="400")
                    #controller
                        div
                            button#mute Mute
                            button#camera Camera Off
                        div
                            select#cameras
                #room
                    h3
                    ul
                    form
                        input(placeholder="message", required, type="text")
                        button Send
```

위에서부터 닉네임을 설정하고 방을 선택한 뒤 mainRoom이 나올 수 있도록 틀을 생성

---

### 닉네임 설정

```javascript
// app.js
const handleNickSubmit = (event) => {
  event.preventDefault();
  const input = nickname.querySelector("input");
  socket.emit("nickname", input.value, showRoom);
};

form.addEventListener("submit", handleNickSubmit);
```

닉네임 Input의 submit 진행 시 서버에input.value와 메서드를 인자로 보냄

```javascript
// server.js
socket.on("nickname", (nickname, done) => {
  socket["nickname"] = nickname;
  done();
});
```

서버는 해당 input.value를 닉네임에 등록하고 전달 받은 메서드를 실행

---

### 방 생성 및 접속

```javascript
//video.js
const initCall = async () => {
  welcome.hidden = true;
  mainRoom.hidden = false;
  await getMidea();
  makeConnection();
};
```

```javascript
// app.js
const handleRoomSubmit = async (event) => {
  event.preventDefault();
  const input = welcome.querySelector("input");
  await initCall();
  socket.emit("enter_room", input.value, showChat);
  roomName = input.value;
  input.value = "";
};

const showRoom = () => {
  const form = welcome.querySelector("form");
  nickname.hidden = true;
  welcome.hidden = false;
  form.addEventListener("submit", handleRoomSubmit);
};
```

닉네임 설정에서 서버가 showRoom 메서드를 실행 시키면 닉네임 페이지는 사라지고 방 선택 페이지가 출력 <br>
방 정보를 입력 받으면 handleRoomSubmit이 실행하게 되어 채팅과 화상캠을 실행

---

### 채팅

```javascript
// video.js
const getCameras = async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((device) => device.kind === "videoinput");
    const currentCamera = myStream.getVideoTracks()[0];
    cameras.forEach((camera) => {
      const option = document.createElement("option");
      option.value = camera.deviceId;
      option.innerText = camera.label;
      if (currentCamera.label === camera.label) {
        option.selected = true;
      }
      cameraSelect.appendChild(option);
    });
  } catch (e) {
    console.log(e);
  }
};
const getMidea = async (deviceId) => {
  const initialConstrains = {
    audio: true,
    video: { facingMode: "user" },
  };
  const cameraConstrains = {
    audio: true,
    video: { deviceId: { exact: deviceId } },
  };
  try {
    myStream = await navigator.mediaDevices.getUserMedia(
      deviceId ? cameraConstrains : initialConstrains
    );
    myFace.srcObject = myStream;
    if (!deviceId) {
      await getCameras();
    }
  } catch (e) {
    console.log(e);
  }
};

socket.on("offer", async (offer, nickname) => {
  // chat
  myPeerConnection.addEventListener("datachannel", (event) => {
    myDataChannel = event.channel;
    myDataChannel.addEventListener("message", (event) =>
      addMessage(`${nickname}: ${event.data}`)
    );
  });
  myPeerConnection.setRemoteDescription(offer);
  const answer = await myPeerConnection.createAnswer();
  myPeerConnection.setLocalDescription(answer);
  socket.emit("answer", answer, roomName);
});

socket.on("answer", (answer) => {
  myPeerConnection.setRemoteDescription(answer);
});

socket.on("ice", (ice) => {
  myPeerConnection.addIceCandidate(ice);
});

// RTC (화상채팅)
const makeConnection = () => {
  myPeerConnection = new RTCPeerConnection({
    iceServers: [
      {
        urls: [
          "stun:stun.l.google.com:19302",
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
          "stun:stun3.l.google.com:19302",
          "stun:stun4.l.google.com:19302",
        ],
      },
    ],
  });
  myPeerConnection.addEventListener("icecandidate", handleIce);
  myPeerConnection.addEventListener("addstream", handleAddStream);
  myStream
    .getTracks()
    .forEach((track) => myPeerConnection.addTrack(track, myStream));
};
```

```javascript
//app.js
socket.on("welcome", async (nick, countUser) => {
  // chat
  myDataChannel = myPeerConnection.createDataChannel("chat");
  myDataChannel.addEventListener("message", (event) =>
    addMessage(`${nick}: ${event.data}`)
  );
  const offer = await myPeerConnection.createOffer();
  myPeerConnection.setLocalDescription(offer);
  socket.emit("offer", offer, roomName);
  roomTitle(roomName, countUser);
  addMessage(`${nick} Joined😍`);
});
```

mediaDevice를 통해 video, audio 정보를 받아오고 **webRTC**를 통해 데이터를 주고받는다. <br>
실시간 채팅 또한 socketIO 대신 DataChannel을 이용하여 더욱 간단하게 구현하였다.

---
