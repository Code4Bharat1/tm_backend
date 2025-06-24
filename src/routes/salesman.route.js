import express from "express";
import {
  punchIn,
  punchOut,
  getVisits,
  getVisitsByCompany,
} from "../controller/salesman.controller.js";
import { protect, protectAdmin } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/multer.middleware.js";

const router = express.Router();

// Updated routes with Wasabi upload middleware
router.post("/salesman/punch-in", protect, upload.single("photo"), punchIn);
router.post("/salesman/punch-out", protect, upload.single("photo"), punchOut);

// ... rest of the routes remain unchanged
router.get("/salesman/visits", protect, getVisits);
router.get("/salesman/userVisits", protectAdmin, getVisitsByCompany);

export default router;
