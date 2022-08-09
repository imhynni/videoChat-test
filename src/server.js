import express from "express";
import http from "http";
import { Server } from "socket.io";
import { instrument } from "@socket.io/admin-ui";

// variable
const app = express();
const PORT = 4000;

// middleware
app.set("view engine", "pug"); // 템플릿 설정 및 경로지정
app.set("views", __dirname + "/views");

app.use("/public", express.static(__dirname + "/public"));

// routing
app.get("/", (req, res) => res.render("home"));
app.get("/*", (req, res) => res.redirect("home"));

// server 구동
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["https://admin.socket.io"],
    credentials: true,
  },
});
instrument(io, {
  auth: false,
});

// adapter
const publicRooms = () => {
  const {
    sockets: {
      adapter: { sids, rooms },
    },
  } = io;
  const publicRooms = [];
  rooms.forEach((_, key) => {
    if (sids.get(key) === undefined) {
      publicRooms.push(key);
    }
  });
  return publicRooms;
};

// 채팅방 유저 수
const countUser = (room) => {
  return io.sockets.adapter.rooms.get(room)?.size;
};

// 유저 정보
const sockets = [];

// socketIO 연결
io.on("connection", (socket) => {
  // init
  socket["nickname"] = "Anon";

  // 채팅방 접속
  socket.on("enter_room", (room, done) => {
    socket.join(room);
    done(room, countUser(room));
    socket.to(room).emit("welcome", socket.nickname, countUser(room));
    io.sockets.emit("rooms", publicRooms()); // 방 정보
  });

  // 채팅방 퇴장
  socket.on("disconnecting", () => {
    socket.rooms.forEach((room) =>
      socket.to(room).emit("bye", socket.nickname, countUser(room) - 1)
    );
  });
  socket.on("disconnect", () => {
    io.sockets.emit("rooms", publicRooms()); // 방 정보
  });

  // 닉네임
  socket.on("nickname", (nickname, done) => {
    socket["nickname"] = nickname;
    done();
  });

  // 화생채팅
  socket.on("offer", (offer, room) => {
    socket.to(room).emit("offer", offer, socket.nickname);
  });
  socket.on("answer", (answer, room) => {
    socket.to(room).emit("answer", answer);
  });
  socket.on("ice", (ice, room) => {
    socket.to(room).emit("ice", ice);
  });
});

server.listen(PORT, () => console.log(`✅ Listening on http://localhost:4000`));
