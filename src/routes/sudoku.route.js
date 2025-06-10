import { getSudokuPuzzle } from "../controller/sudoku.controller.js"
import express from "express"

const router = express.Router();

router.get("/",getSudokuPuzzle);

export default router;