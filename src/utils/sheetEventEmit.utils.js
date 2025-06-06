import { io, userSocketMap } from "../service/socket.js";

export function emitToSheetParticipants(sheet, event, payload) {
  const recipientIds = new Set();
  if (sheet.createdby_id) recipientIds.add(sheet.createdby_id.toString());

  if (Array.isArray(sheet.collaborators)) {
    sheet.collaborators.forEach((c) => {
      if (c.id) recipientIds.add(c.id.toString());
    });
  }

  recipientIds.forEach((userId) => {
    const socketId = userSocketMap.get(userId);
    console.log("event emitted to",recipientIds);
    if (socketId) {
      io.to(socketId).emit(event, payload);
    }
  });
  
}
