// import express from 'express';
// import uploadS3 from '../middleware/multer-s3.middleware.js';
// import {
//   createSheet,
//   getAllSheetsByUser,
//   updateSheet,
//   deleteSheet,
//   shareSheetwithEmployee,
//   downloadSheet,
// } from '../controller/sheet.controller.js';
// import { uploadFileToS3 } from '../utils/s3.utils.js';
// import multer from 'multer';
// import { protectAdmin } from '../middleware/authMiddleware.js';
// const router = express.Router();

// // // Create a new sheet (with file upload)
// // router.post('/create', uploadS3.single('file'), createSheet);
// //  console.log('File:', req.file); // should show file info
// //   console.log('Body:', req.body); // should show userId, etc.
// // // Get all sheets uploaded by a specific user

// router.post('/create',protectAdmin,uploadS3.single('file'),createSheet);
// router.get('/user',protectAdmin, getAllSheetsByUser);
// // Update sheet metadata (e.g., title, description, etc.)
// router.put('/update/:sheetId', updateSheet);

// // Delete a sheet by ID
// router.delete('/delete/:sheetId', deleteSheet);

// // Share sheet with employee(s)
// router.post('/share/:sheetId', shareSheetwithEmployee);

// // Download sheet file
// router.get('/download/:sheetId', downloadSheet);

// export default router;
// src/routes/sheet.route.js
import express from "express";
import { protectUserOrAdmin } from "../middleware/authMiddleware.js";
import {
  createCells,
  createSheet,
  deleteSheet,
  getCells,
  getSheets,
  updateCollaborators,
  updateSheetName,
} from "../controller/sheet.controller.js";

const router = express.Router();

router.post("/createSheet", protectUserOrAdmin, createSheet);
router.patch("/updateCollaborators", protectUserOrAdmin, updateCollaborators);
router.delete("/deleteSheet/:sheet_id", protectUserOrAdmin, deleteSheet);
router.get("/getSheets", protectUserOrAdmin, getSheets);
router.post("/createCells", protectUserOrAdmin, createCells);
router.get("/getCells/:sheet_id", protectUserOrAdmin, getCells);
router.patch("/updateSheetName", protectUserOrAdmin, updateSheetName);
export default router;
