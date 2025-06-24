import express from "express";
import { getWasabiSignedUrl } from "../utils/wasabi.utils.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /download/:wasabiKey - returns a signed URL for downloading a file
router.get("/download/:wasabiKey", protect, (req, res) => {
  const { wasabiKey } = req.params;
  if (!wasabiKey) {
    return res.status(400).json({ message: "wasabiKey is required" });
  }
  try {
    const signedUrl = getWasabiSignedUrl(wasabiKey);
    return res.status(200).json({ url: signedUrl });
  } catch (error) {
    return res.status(500).json({ message: "Failed to generate signed URL", error: error.message });
  }
});

export default router;
