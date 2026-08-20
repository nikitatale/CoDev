import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { YSocketIO } from "y-socket.io/dist/server";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
});

// Yjs handles the actual code/document sync (monaco editor content)
const ySocketIO = new YSocketIO(io);
ySocketIO.initialize();

// ---- Presence system (kept separate from yjs awareness for reliability) ----
const roomUsers = new Map(); // socket.id -> { id, username }

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("join-room", ({ username }) => {
    roomUsers.set(socket.id, { id: socket.id, username });
    // broadcast full, authoritative list to everyone (including the new joiner)
    io.emit("users-update", Array.from(roomUsers.values()));
    console.log(`${username} joined. Total online: ${roomUsers.size}`);
  });

  socket.on("leave-room", () => {
    const user = roomUsers.get(socket.id);
    roomUsers.delete(socket.id);
    io.emit("users-update", Array.from(roomUsers.values()));
    if (user) console.log(`${user.username} left. Total online: ${roomUsers.size}`);
  });

  socket.on("disconnect", () => {
    const user = roomUsers.get(socket.id);
    roomUsers.delete(socket.id);
    io.emit("users-update", Array.from(roomUsers.values()));
    if (user) console.log(`${user.username} disconnected. Total online: ${roomUsers.size}`);
  });
});

app.get("/", (req, res) => {
  res.status(200).json({
    message: "OKAY :)",
    success: true,
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    message: "Health Check - All Good :)",
    success: true,
  });
});

httpServer.listen(5000, () => {
  console.log("Server is running on port 5000");
});