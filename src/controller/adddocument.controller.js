import { AddDocument } from '../models/adddocument.model.js'
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.utils.js";
import path from "path";
import fs from "fs";

/**
 * Add Document
 */
const addDocument = async (req, res) => {
  try {
    const { firstName, lastName, documentName } = req.body;

    // Check if a file was uploaded
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Multer with CloudinaryStorage already uploaded the file
    // `req.file.path` contains the Cloudinary file URL
    // `req.file.filename` contains the public ID in Cloudinary

    const newDocument = new AddDocument({
      firstName,
      lastName,
      documentName,
      documentFileUrl: req.file.path,    // Cloudinary URL
      publicId: req.file.filename,       // Cloudinary public ID
    });

    await newDocument.save();

    res.status(201).json({
      message: "Document added successfully",
      data: newDocument,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error adding document",
      error: error.message,
    });
  }
};

/**
 * Get All Documents
 */
const getDocuments = async (req, res) => {
    try {
        const documents = await AddDocument.find();
        res.status(200).json(documents);
    } catch (error) {
        res.status(500).json({ message: "Error fetching documents", error: error.message });
    }
};

/**
 * Delete Document
 */
const deleteDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const document = await AddDocument.findById(id);

        if (document) {
            // Delete from Cloudinary
            await deleteFromCloudinary(document.publicId);

            // Delete from Database
            await AddDocument.findByIdAndDelete(id);
            res.status(200).json({ message: "Document deleted successfully" });
        } else {
            res.status(404).json({ message: "Document not found" });
        }
    } catch (error) {
        res.status(500).json({ message: "Error deleting document", error: error.message });
    }
};

export { addDocument, getDocuments, deleteDocument };
