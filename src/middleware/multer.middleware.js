import multer from "multer";

const storage = multer.memoryStorage(); // Store in memory, not in file system

export const upload = multer({
    storage,
});
