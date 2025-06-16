import { AddDocument } from '../models/adddocument.model.js';
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.utils.js";

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

    // Store document with companyId from authenticated user's companyId
    const newDocument = new AddDocument({ 
      companyId: req.user.companyId,
      firstName,
      lastName,
      documentName,
      documentFileUrl: req.file.path,    // Cloudinary URL
      publicId: req.file.filename,       // Cloudinary public ID
    });

    await newDocument.save();

    res.status(201).json({ message: "Document added successfully", data: newDocument });
  } catch (error) {
    res.status(500).json({ message: "Error adding document", error: error.message });
  }
};

/**
 * Get All Documents
 */
const getDocuments = async (req, res) => {
  try {
    // Filter by companyId to return only documents for the authenticated user's company
    const documents = await AddDocument.find({ companyId: req.user.companyId });
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

    // Find document by id and companyId
    const document = await AddDocument.findOne({ _id: id, companyId: req.user.companyId });

    if (document) {
      // Delete from Cloudinary first
      await deleteFromCloudinary(document.publicId);

      // Then delete from Database
      await AddDocument.findByIdAndDelete(id);
      res.status(200).json({ message: "Document deleted successfully" });
    } else {
      res.status(404).json({ message: "Document not found or not authorized" });
    }
  } catch (error) {
    res.status(500).json({ message: "Error deleting document", error: error.message });
  }
};

export { addDocument, getDocuments, deleteDocument };
