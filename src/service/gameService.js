import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

// Exported socket server and map to track connected users
export let io;
export const userSocketMap = new Map();

// Initialize Socket.IO server with Redis and room support
export const gameSocketService = async (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "https://task-tracker.code4bharat.com",
        "https://task-tracker-admin.code4bharat.com",
        "https://task-tracker-superadmin.code4bharat.com",
        "https://www.task-tracker.code4bharat.com",
        "https://www.task-tracker-admin.code4bharat.com",
        "https://www.task-tracker-superadmin.code4bharat.com",
      ],
      credentials: true,
    },
  });

  // Connect to Redis
  const pubClient = createClient({ url: process.env.REDIS_URL });
  const subClient = pubClient.duplicate();

  await pubClient.connect();
  await subClient.connect();

  io.adapter(createAdapter(pubClient, subClient));

  // Handle socket connections
  io.on("connection", (socket) => {
    const { userId } = socket.handshake.query;

    if (userId) {
      userSocketMap.set(userId, socket.id);
      console.log(`🔌 User ${userId} connected with socket ID: ${socket.id}`);
    }

    // Join a room
    socket.on("join-room", ({ roomId, userName }) => {
      socket.join(roomId);
      console.log(`✅ ${userName || userId} joined room: ${roomId}`);

      socket.to(roomId).emit("user-joined", {
        userId,
        userName,
        socketId: socket.id,
      });
    });

    // Leave a room
    socket.on("leave-room", ({ roomId, userName }) => {
      socket.leave(roomId);
      console.log(`🚪 ${userName || userId} left room: ${roomId}`);

      socket.to(roomId).emit("user-left", {
        userId,
        userName,
      });
    });

    // Send a message in a room
    socket.on("game-message", ({ roomId, message }) => {
      io.to(roomId).emit("game-message", {
        userId,
        message,
      });
    });

    // On disconnect
    socket.on("disconnect", () => {
      if (userId) {
        userSocketMap.delete(userId);
        console.log(`❌ User ${userId} disconnected`);
      }
    });
  });
};
