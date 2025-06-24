import express from "express";
import { upload } from "../middleware/multer.middleware.js";
import { uploadToWasabi, deleteFromWasabi } from "../utils/wasabi.utils.js";

const router = express.Router();

router.post("/", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  try {
    const result = await uploadToWasabi(
      req.file.buffer,
      req.file.originalname,
      undefined,
      req.file.mimetype,
    );
    res.status(200).json({
      message: "File uploaded successfully to Wasabi",
      fileName: req.file.originalname,
      fileUrl: result.fileUrl,
      wasabiKey: result.fileName,
      format: req.file.originalname.split(".").pop().toLowerCase(),
      fileResourceType: req.file.mimetype.split("/")[0],
    });
  } catch (error) {
    console.error("Wasabi upload error:", error);
    res.status(500).json({
      message: "Error uploading file to Wasabi",
      error: error.message,
      stack: error.stack,
    });
  }
});

// Profile image specific upload with better folder organization
router.post("/profile", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  if (!req.file.mimetype.startsWith("image/")) {
    return res
      .status(400)
      .json({ message: "Only image files are allowed for profile pictures" });
  }
  try {
    const result = await uploadToWasabi(
      req.file.buffer,
      req.file.originalname,
      "profile-images",
      req.file.mimetype,
    );
    res.status(200).json({
      message: "Profile image uploaded successfully to Wasabi",
      fileName: req.file.originalname,
      fileUrl: result.fileUrl,
      wasabiKey: result.fileName,
      format: req.file.originalname.split(".").pop().toLowerCase(),
      fileResourceType: "image",
    });
  } catch (error) {
    console.error("Wasabi profile upload error:", error);
    res.status(500).json({
      message: "Error uploading profile image to Wasabi",
      error: error.message,
      stack: error.stack,
    });
  }
});

// Delete file from Wasabi
router.delete("/:wasabiKey", async (req, res) => {
  try {
    const { wasabiKey } = req.params;
    await deleteFromWasabi(wasabiKey);
    res.status(200).json({ message: "File deleted successfully from Wasabi" });
  } catch (error) {
    console.error("Error deleting file from Wasabi:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
