import express from "express";
import { addDocument, getDocuments, deleteDocument } from "../controller/adddocument.controller.js";
import {upload} from "../middleware/multer.middleware.js";

const router = express.Router();

router.post("/adminaddDocument", upload.single("documentFile"), addDocument);
router.get("/admingetDocuments", getDocuments);
router.delete("/admindeleteDocument/:id", deleteDocument);

export default router;
