// import { AddDocument } from "../models/adddocument.model.js";
// import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudnary.js";
// import path from "path";
// import fs from "fs";

// /**
//  * Add Document
//  */
// const addDocument = async (req, res) => {
//   try {
//     const { firstName, lastName, documentName } = req.body;

//     // If no file is uploaded, return an error
//     if (!req.file) {
//       return res.status(400).json({ message: "No file uploaded" });
//     }

//     // Convert buffer to base64 string
//     const fileBase64 = req.file.buffer.toString("base64");

//     // Create a data URI (Cloudinary expects this format if it's not a file path)
//     const dataUri = `data:${req.file.mimetype};base64,${fileBase64}`;

//     // Upload to Cloudinary directly from data URI
//     const result = await uploadOnCloudinary(dataUri);

//     if (!result) {
//       return res.status(500).json({ message: "Cloudinary upload failed" });
//     }

//     // Save the URL and Public ID to the database
//     const newDocument = new AddDocument({
//       firstName,
//       lastName,
//       documentName,
//       documentFileUrl: result.secure_url,
//       publicId: result.public_id,
//     });

//     await newDocument.save();
//     res.status(201).json({ message: "Document added successfully", data: newDocument });

//   } catch (error) {
//     res.status(500).json({ message: "Error adding document", error: error.message });
//   }
// };

// /**
//  * Get All Documents
//  */
// const getDocuments = async (req, res) => {
//   try {
//     const documents = await AddDocument.find();
//     res.status(200).json(documents);
//   } catch (error) {
//     res.status(500).json({ message: "Error fetching documents", error: error.message });
//   }
// };

// /**
//  * Delete Document
//  */
// const deleteDocument = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const document = await AddDocument.findById(id);

//     if (document) {
//       // Delete from Cloudinary
//       await deleteFromCloudinary(document.publicId);

//       // Delete from Database
//       await AddDocument.findByIdAndDelete(id);
//       res.status(200).json({ message: "Document deleted successfully" });
//     } else {
//       res.status(404).json({ message: "Document not found" });
//     }
//   } catch (error) {
//     res.status(500).json({ message: "Error deleting document", error: error.message });
//   }
// };

// export { addDocument, getDocuments, deleteDocument };
