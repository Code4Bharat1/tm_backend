import express from "express";
import { addDocument, getDocuments, deleteDocument } from "../controller/adddocument.controller.js";
import {upload} from "../middleware/multer.middleware.js";
import  {protectUserOrAdmin} from "../middleware/authMiddleware.js";
const router = express.Router();

router.post("/adminaddDocument",protectUserOrAdmin, upload.single("documentFile"), addDocument);
router.get("/admingetDocuments",protectUserOrAdmin, getDocuments);
router.delete("/admindeleteDocument/:id",protectUserOrAdmin, deleteDocument);

export default router;
