import axios from "axios"

export const getSudokuPuzzle = async (req, res) => {
    try {
        const response = await axios.get("https://you-do-sudoku-api.vercel.app/api");
        const puzzleStr = response.data?.puzzle;
        const solutionStr = response.data?.solution;

        if (!puzzleStr || puzzleStr.length !== 81) {
            return res.status(500).json({ error: "Invalid puzzle data from API" });
        }

        const board = [];
        for (let i = 0; i < 9; i++) {
            const row = puzzleStr
                .slice(i * 9, i * 9 + 9)
                .split("")
                .map((char) => (char === "0" ? "" : parseInt(char)));
            board.push(row);
        }
        const solution = [];
        for (let i = 0; i < 9; i++) {
            const row = solutionStr
                .slice(i * 9, i * 9 + 9)
                .split("")
                .map((char) => (char === "0" ? "" : parseInt(char)));
            solution.push(row);
        }

        res.json({ board,solution });
    } catch (error) {
        console.error("Error fetching puzzle:", error.message);
        res.status(500).json({ error: "Failed to fetch Sudoku puzzle" });
    }
  };
