import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

export let io;
export const userSocketMap = new Map();

export const initSocketServer = async (server) => {
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

  const pubClient = createClient({ url: process.env.REDIS_URL });
  const subClient = pubClient.duplicate();

  await pubClient.connect();
  await subClient.connect();

  io.adapter(createAdapter(pubClient, subClient));

  io.on("connection", (socket) => {
    const { userId } = socket.handshake.query;
    if (userId) {
      userSocketMap.set(userId, socket.id);
      console.log(`🔌 User ${userId} connected with socket ID: ${socket.id}`);
      }

    socket.on("disconnect", () => {
      if (userId) {
        userSocketMap.delete(userId);
        console.log(`❌ User ${userId} disconnected`);
      }
    });
  });
};
