import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CompanyRegistration",
        required: false, // Optional if post isn't company-specific
    },
    message: {
        type: String,
        default: "",
    },
    note: {
        type: String,
        default: "",
    },
    attachments: [
        {
            fileName: { type: String },
            filePath: { type: String },
            mimeType: { type: String },
            size: { type: Number }, // in bytes
            uploadedAt: { type: Date, default: Date.now },
        },
    ],
    createdAt: {
        type: Date,
        default: Date.now,
    },
    visibility: {
        type: String,
        enum: ["Public", "Private", "CompanyOnly"],
        default: "Private",
    },
});

const Post = mongoose.model("Post", postSchema);

export default Post;
