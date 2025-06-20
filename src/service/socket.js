import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import { Chess } from "chess.js";
import ChessScoreModel from "../models/ChessScore.model.js";
import TicTacToeScore from "../models/TicTacToeScore.model.js";

export let io;
export const userSocketMap = new Map();
const games = new Map();
const chessGames = new Map();

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
    const userId =
      socket.handshake.auth?.userId ||
      socket.handshake.query?.userId ||
      null;
    socket.data.userId = userId;

    if (userId) {
      userSocketMap.set(userId, socket.id);
      console.log(`🔌 User ${userId} connected (Socket ID: ${socket.id})`);
    }

    socket.on("tictactoe-join", ({ roomId, userName }) => {
      const userId = socket.data.userId;

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
              players: game.players,
              playerNames: game.playerNames,
              gameStarted: true,
            });
          } else {
            socket.emit("tictactoe-waiting", {
              roomId,
              players: game.players,
              playerNames: game.playerNames,
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


    socket.on("tictactoe-move", async ({ roomId, index }) => {
      const userId = socket.data.userId;
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
      const isDraw = !winner && game.board.every(cell => cell);

      // Only save if the game is over (winner or draw)
      if (winner || isDraw) {
        game.gameOver = true;

        const winnerSymbol = winner || null;
        const winnerIndex = winnerSymbol === "X" ? 0 : winnerSymbol === "O" ? 1 : -1;
        const winnerUserId = winnerIndex !== -1 ? game.players[winnerIndex] : null;

        try {
          const result = new TicTacToeScore({
            roomId,
            players: game.players,
            playerNames: game.playerNames,
            winner: winnerSymbol,
            winnerUserId,
            isDraw,
            movesCount: game.board.filter(Boolean).length,
          });

          await result.save(); // ✅ This will work!
          console.log("✅ Tic Tac Toe result saved:", result._id);
        } catch (err) {
          console.error("❌ Failed to save Tic Tac Toe result:", err);
        }

        io.to(roomId).emit("tictactoe-game-ended", {
          roomId,
          winner: winner !== "draw" ? winner : null,
          draw: winner === "draw",
          message: "Game has ended.",
        });

        games.delete(roomId);
      } else {
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

    socket.on("chess-create-room", ({ userName }) => {
      const userId = socket.data.userId;
      if (!userName || !userId) {
        socket.emit("chess-error", { message: "Invalid user data" });
        return;
      }

      const roomId = generateRoomId();
      console.log(`🏰 ${userName} (${userId}) creating chess room: ${roomId}`);

      const game = createChessGame();
      game.players.push(userId);
      game.playerNames[userId] = userName;
      game.playerColors[userId] = "white";

      chessGames.set(roomId, game);
      socket.join(roomId);

      socket.emit("chess-room-created", {
        roomId,
        playerColor: "white",
        playerName: userName,
        message: "Chess room created successfully!",
      });

      socket.emit("chess-state", {
        roomId,
        fen: game.chess.fen(),
        currentPlayer: game.currentPlayer,
        players: game.players,
        playerNames: game.playerNames,
        playerColors: game.playerColors,
        gameStarted: game.gameStarted,
        gameOver: game.gameOver,
        winner: game.winner,
        winnerUserId: game.winnerUserId, // Add winner userId for proper frontend handling
        check: game.chess.inCheck(),
        checkmate: game.chess.isCheckmate(),
        stalemate: game.chess.isStalemate(),
        waitingForPlayer: true,
      });
    });

    socket.on("chess-join-room", ({ roomId, userName }) => {
      const userId = socket.data.userId;
      if (!roomId || !userName || !userId) {
        socket.emit("chess-error", { message: "Invalid join data" });
        return;
      }

      console.log(`♟️ ${userName} (${userId}) joining chess room: ${roomId}`);

      if (!chessGames.has(roomId)) {
        socket.emit("chess-error", { message: "Room not found" });
        return;
      }

      const game = chessGames.get(roomId);
      socket.join(roomId);

      if (game.players.includes(userId)) {
        io.to(roomId).emit("chess-state", {
          roomId,
          fen: game.chess.fen(),
          currentPlayer: game.currentPlayer,
          players: game.players,
          playerNames: game.playerNames,
          playerColors: game.playerColors,
          gameStarted: game.gameStarted,
          gameOver: game.gameOver,
          winner: game.winner,
          winnerUserId: game.winnerUserId,
          check: game.chess.inCheck(),
          checkmate: game.chess.isCheckmate(),
          stalemate: game.chess.isStalemate(),
          waitingForPlayer: game.players.length < 2,
        });
        return;
      }

      if (game.players.length >= 2) {
        socket.emit("chess-error", { message: "Room is full" });
        return;
      }

      game.players.push(userId);
      game.playerNames[userId] = userName;
      game.playerColors[userId] = "black";
      game.gameStarted = true;

      io.to(roomId).emit("chess-game-started", {
        roomId,
        players: game.players,
        playerNames: game.playerNames,
        playerColors: game.playerColors,
        message: "Game started! White plays first.",
      });

      io.to(roomId).emit("chess-state", {
        roomId,
        fen: game.chess.fen(),
        currentPlayer: game.currentPlayer,
        players: game.players,
        playerNames: game.playerNames,
        playerColors: game.playerColors,
        gameStarted: game.gameStarted,
        gameOver: game.gameOver,
        winner: game.winner,
        winnerUserId: game.winnerUserId,
        check: game.chess.inCheck(),
        checkmate: game.chess.isCheckmate(),
        stalemate: game.chess.isStalemate(),
        waitingForPlayer: false,
      });
    });

    // Replace the chess-move handler in your socket.js with this fixed version

    socket.on("chess-move", async ({ roomId, from, to, piece, promotion }) => {
      const userId = socket.data.userId;
      if (!roomId || !from || !to) {
        socket.emit("chess-error", { message: "Invalid move data" });
        return;
      }

      const game = chessGames.get(roomId);
      if (!game || !game.gameStarted || game.gameOver) {
        socket.emit("chess-error", {
          message: !game
            ? "Game not found"
            : !game.gameStarted
              ? "Game hasn't started"
              : "Game is over",
        });
        return;
      }

      const playerColor = game.playerColors[userId];
      if (!playerColor || playerColor !== game.currentPlayer) {
        socket.emit("chess-error", { message: "Not your turn" });
        return;
      }

      const moveResult = validateAndExecuteMove(game, from, to, promotion);

      if (!moveResult.valid) {
        socket.emit("chess-error", { message: moveResult.error });
        return;
      }

      const currentMovingPlayer = playerColor;
      const currentMovingUserId = userId;

      game.moves.push({
        from,
        to,
        piece,
        player: playerColor,
        timestamp: Date.now(),
      });
      game.currentPlayer = game.currentPlayer === "white" ? "black" : "white";
      game.check = moveResult.check;
      game.checkmate = moveResult.checkmate;
      game.stalemate = moveResult.stalemate;
      game.gameOver = moveResult.checkmate || moveResult.stalemate;

      if (moveResult.checkmate) {
        game.winner = currentMovingPlayer;
        game.winnerUserId = currentMovingUserId;
      } else if (moveResult.stalemate) {
        game.winner = "draw";
        game.winnerUserId = null;
      }

      io.to(roomId).emit("chess-state", {
        roomId,
        fen: game.chess.fen(),
        currentPlayer: game.currentPlayer,
        players: game.players,
        playerNames: game.playerNames,
        playerColors: game.playerColors,
        gameStarted: game.gameStarted,
        gameOver: game.gameOver,
        winner: game.winner,
        winnerUserId: game.winnerUserId,
        check: game.chess.inCheck(),
        checkmate: game.chess.isCheckmate(),
        stalemate: game.chess.isStalemate(),
        lastMove: { from, to, piece, player: currentMovingPlayer },
        waitingForPlayer: false,
      });

      socket.emit("chess-move-confirmed", {
        from,
        to,
        piece,
        fen: game.chess.fen(),
        success: true,
      });

      if (moveResult.checkmate) {
        try {
          const loserId = game.players.find(id => id !== game.winnerUserId);
          const loserName = game.playerNames[loserId];

          const result = new ChessScoreModel({
            userId: game.winnerUserId,
            roomId,
            playerName: game.playerNames[game.winnerUserId],
            isWinner: true,
            gameName: 'Chess Multiplayer',
            gameType: 'multiplayer',
            isPlayed: true,
            winnerColor: game.winner,
            loserId,
            loserName,
            time: Math.floor(
              (game.moves.at(-1)?.timestamp - game.moves[0]?.timestamp) / 1000
            ) || 0,
            score: game.moves.length * 5,
          });

          await result.save();
          console.log("✅ Chess game result saved:", result._id);
        } catch (err) {
          console.error("❌ Failed to save chess result:", err);
        }
      }

      if (game.gameOver) {
        const winnerUserId =
          winner === "draw" ? null : game.players.find(
            (id, idx) => (winner === "X" && idx === 0) || (winner === "O" && idx === 1)
          );

        try {
          await TicTacToeScore.create({
            roomId,
            players: game.players,
            playerNames: game.playerNames,
            winner: game.winner, // 'X', 'O', or null
            winnerUserId: game.winnerUserId || null,
            isDraw: game.isDraw || false,
            movesCount: game.board.filter(Boolean).length,
            // gameName and gameType will use defaults
          });
          console.log("✅ TicTacToe game result saved:", roomId);
        } catch (err) {
          console.error("❌ Failed to save TicTacToe result:", err);
        }

        io.to(roomId).emit("tictactoe-game-ended", {
          roomId,
          winner: winner !== "draw" ? winner : null,
          draw: winner === "draw",
          message: "Game has ended.",
        });

        games.delete(roomId);
      }
    });

    socket.on("chess-reset", async ({ roomId }) => {
      const game = chessGames.get(roomId);
      if (!game) return;


      // 🔄 Reset game state
      game.chess = new Chess();
      game.currentPlayer = "white";
      game.gameOver = false;
      game.winner = null;
      game.winnerUserId = null;
      game.moves = [];
      game.check = false;
      game.checkmate = false;
      game.stalemate = false;

      io.to(roomId).emit("chess-state", {
        roomId,
        fen: game.chess.fen(),
        currentPlayer: game.currentPlayer,
        players: game.players,
        playerNames: game.playerNames,
        playerColors: game.playerColors,
        gameStarted: game.gameStarted,
        gameOver: game.gameOver,
        winner: game.winner,
        winnerUserId: game.winnerUserId,
        check: game.chess.inCheck(),
        checkmate: game.chess.isCheckmate(),
        stalemate: game.chess.isStalemate(),
        waitingForPlayer: game.players.length < 2,
      });
    });


    socket.on("disconnect", () => {
      const userId = socket.data.userId;
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

        for (const [roomId, game] of chessGames.entries()) {
          const playerIndex = game.players.indexOf(userId);
          if (playerIndex !== -1) {
            game.players.splice(playerIndex, 1);
            delete game.playerNames[userId];
            delete game.playerColors[userId];

            if (game.players.length === 0) {
              chessGames.delete(roomId);
              console.log(`🗑️ Deleted empty chess room: ${roomId}`);
            } else {
              io.to(roomId).emit("chess-player-disconnected", {
                disconnectedPlayer: userId,
                remainingPlayers: game.players.length,
                message: "Your opponent has disconnected",
              });

              game.gameStarted = false;
              io.to(roomId).emit("chess-state", {
                roomId,
                fen: game.chess.fen(),
                currentPlayer: game.currentPlayer,
                players: game.players,
                playerNames: game.playerNames,
                playerColors: game.playerColors,
                gameStarted: false,
                gameOver: false,
                winner: null,
                winnerUserId: null,
                check: game.chess.inCheck(),
                checkmate: game.chess.isCheckmate(),
                stalemate: game.chess.isStalemate(),
                waitingForPlayer: true,
              });
            }
          }
        }
      }
    });
  });
};

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function createChessGame() {
  return {
    chess: new Chess(),
    currentPlayer: "white",
    players: [],
    playerNames: {},
    playerColors: {},
    gameStarted: false,
    gameOver: false,
    winner: null,
    winnerUserId: null, // Add winner userId field
    moves: [],
    check: false,
    checkmate: false,
    stalemate: false,
  };
}

function validateAndExecuteMove(game, from, to, promotion) {
  try {
    const move = game.chess.move({
      from,
      to,
      promotion: promotion || undefined,
    });
    if (!move) {
      return {
        valid: false,
        error: "Invalid move",
      };
    }
    return {
      valid: true,
      check: game.chess.inCheck(),
      checkmate: game.chess.isCheckmate(),
      stalemate: game.chess.isStalemate(),
      error: null,
    };
  } catch (e) {
    return {
      valid: false,
      error: "Invalid move",
    };
  }
}

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
