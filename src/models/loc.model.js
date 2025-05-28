import mongoose from "mongoose";

const LOCSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CompanyRegistration",
            required: true,
        },
        performanceMarks: {
            type: Number,
            required: true,
        },
        performanceStatus: {
            type: String,
            enum: [
                "Exceeds Expectations",
                "Meets Expectations",
                "Below Expectations",
                "Under Performance Improvement Plan (PIP)"
            ],
            required: true,
        }
    },
    {
        timestamps: true,
    }
);

LOCSchema.index({ companyId: 1, userId: 1 });

export default mongoose.model("LOC", LOCSchema);