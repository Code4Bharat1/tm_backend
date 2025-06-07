import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

export let io;
export const userSocketMap = new Map();
const games = new Map();

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

  // Redis setup
  const pubClient = createClient({ url: process.env.REDIS_URL });
  const subClient = pubClient.duplicate();
  await pubClient.connect();
  await subClient.connect();
  io.adapter(createAdapter(pubClient, subClient));

  io.on("connection", (socket) => {
    const { userId } =socket.handshake.query || socket.handshake.auth;
    socket.data.userId = userId; // ✅ Persist userId across events

    if (userId) {
      userSocketMap.set(userId, socket.id);
      console.log(`🔌 User ${userId} connected (Socket ID: ${socket.id})`);
    }

    // --- TicTacToe Game Logic ---
    socket.on("tictactoe-join", ({ roomId, userName }) => {
      const userId = socket.data.userId; // ✅ use stored userId
      if (!roomId || !userName || !userId) {
        socket.emit("tictactoe-error", { message: "Invalid join data" });
        return;
      }

      console.log(`🎮 ${userName} (${userId}) joining room: ${roomId}`);
      socket.join(roomId);

      if (!games.has(roomId)) {
        games.set(roomId, {
          board: Array(9).fill(null),
          currentPlayer: "X",
          players: [],
          playerNames: {},
          gameStarted: false,
          gameOver: false,
        });
      }

      const game = games.get(roomId);

      if (!game.players.includes(userId)) {
        if (game.players.length < 2) {
          game.players.push(userId);
          game.playerNames[userId] = userName;

          if (game.players.length === 2) {
            game.gameStarted = true;
            io.to(roomId).emit("tictactoe-joined", {
              roomId,
              players: game.players.length,
              gameStarted: true,
            });
          } else {
            socket.emit("tictactoe-waiting", {
              roomId,
              players: game.players.length,
            });
          }
        } else {
          socket.emit("tictactoe-error", { message: "Room is full" });
          return;
        }
      }

      io.to(roomId).emit("tictactoe-state", {
        board: game.board,
        currentPlayer: game.currentPlayer,
        players: game.players,
        playerNames: game.playerNames,
        gameStarted: game.gameStarted,
        gameOver: game.gameOver,
        winner: null,
      });
    });

    socket.on("tictactoe-move", ({ roomId, index }) => {
      const userId = socket.data.userId; // ✅ use stored userId
      if (!roomId || index === undefined) {
        socket.emit("tictactoe-error", { message: "Invalid move data" });
        return;
      }

      const game = games.get(roomId);
      if (!game || !game.gameStarted || game.gameOver) {
        socket.emit("tictactoe-error", {
          message: !game
            ? "Game not found"
            : !game.gameStarted
              ? "Game hasn't started"
              : "Game is over",
        });
        return;
      }

      if (game.board[index] !== null) {
        socket.emit("tictactoe-error", { message: "Cell already occupied" });
        return;
      }

      const playerIndex = game.players.indexOf(userId);
      if (playerIndex === -1) {
        socket.emit("tictactoe-error", {
          message: "You're not a player in this game",
        });
        return;
      }

      const expectedPlayer = playerIndex === 0 ? "X" : "O";
      if (game.currentPlayer !== expectedPlayer) {
        socket.emit("tictactoe-error", { message: "Not your turn" });
        return;
      }

      game.board[index] = game.currentPlayer;

      const winner = checkWinner(game.board);
      const isDraw = !winner && game.board.every((cell) => cell !== null);
      game.gameOver = !!winner || isDraw;

      if (!game.gameOver) {
        game.currentPlayer = game.currentPlayer === "X" ? "O" : "X";
      }

      io.to(roomId).emit("tictactoe-state", {
        board: game.board,
        currentPlayer: game.currentPlayer,
        players: game.players,
        playerNames: game.playerNames,
        gameStarted: game.gameStarted,
        gameOver: game.gameOver,
        winner: winner || (isDraw ? "draw" : null),
      });
    });

    socket.on("tictactoe-reset", ({ roomId }) => {
      const game = games.get(roomId);
      if (!game) return;

      game.board = Array(9).fill(null);
      game.currentPlayer = "X";
      game.gameOver = false;

      io.to(roomId).emit("tictactoe-state", {
        board: game.board,
        currentPlayer: game.currentPlayer,
        players: game.players,
        playerNames: game.playerNames,
        gameStarted: game.gameStarted,
        gameOver: game.gameOver,
        winner: null,
      });
    });

    socket.on("disconnect", () => {
      const userId = socket.data.userId; // ✅ use stored userId
      if (userId) {
        userSocketMap.delete(userId);
        console.log(`❌ User ${userId} disconnected`);

        for (const [roomId, game] of games.entries()) {
          const playerIndex = game.players.indexOf(userId);
          if (playerIndex !== -1) {
            game.players.splice(playerIndex, 1);
            delete game.playerNames[userId];

            if (game.players.length === 0) {
              games.delete(roomId);
            } else {
              io.to(roomId).emit("player-disconnected", {
                disconnectedPlayer: userId,
                remainingPlayers: game.players.length,
              });

              io.to(roomId).emit("tictactoe-state", {
                board: game.board,
                currentPlayer: game.currentPlayer,
                players: game.players,
                playerNames: game.playerNames,
                gameStarted: false,
                gameOver: true,
                winner: null,
              });
            }
          }
        }
      }
    });
  });
};

// --- Utility function to check for winner ---
function checkWinner(board) {
  const winPatterns = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (const [a, b, c] of winPatterns) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}
