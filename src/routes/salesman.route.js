import express from "express";
import {
  punchIn,
  punchOut,
  getVisits,
  getVisitsByCompany,
} from "../controller/salesman.controller.js";
import { protect, protectAdmin } from "../middleware/authMiddleware.js";
import { uploadSalesmanPunch } from "../middleware/multer.middleware.js";

const router = express.Router();

// Updated routes with Cloudinary upload middleware
router.post(
  "/salesman/punch-in",
  protect,
  uploadSalesmanPunch.single("photo"),
  punchIn,
);
router.post(
  "/salesman/punch-out",
  protect,
  uploadSalesmanPunch.single("photo"),
  punchOut,
);

// ... rest of the routes remain unchanged
router.get("/salesman/visits", protect, getVisits);
router.get("/salesman/userVisits", protectAdmin, getVisitsByCompany);

export default router;
