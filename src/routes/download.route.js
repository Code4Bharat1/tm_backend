import express from "express";
import dotenv from "dotenv";
import { protect } from "../middleware/authMiddleware.js";

dotenv.config();
const router = express.Router();

const BUCKET = process.env.AWS_BUCKET_NAME;
const ENDPOINT = process.env.WASABI_ENDPOINT;

// GET /download/:wasabiKey - returns a public URL for a file
router.get("/download/:wasabiKey", protect, (req, res) => {
  const { wasabiKey } = req.params;

  if (!wasabiKey) {
    return res.status(400).json({ message: "wasabiKey is required" });
  }

  try {
    const publicUrl = `https://${BUCKET}.${ENDPOINT}/${wasabiKey}`;
    return res.status(200).json({ url: publicUrl });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to generate public URL",
      error: error.message,
    });
  }
});

export default router;
