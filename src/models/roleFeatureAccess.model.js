import mongoose from "mongoose";
const { Schema, model } = mongoose;

const RoleFeatureAccessSchema = new Schema(
    {
        companyId: {
            type: Schema.Types.ObjectId,
            ref: "CompanyRegistration",
            required: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        role: {
            type: String,
            enum: ["Manager", "TeamLeader", "HR", "Salesman"],
            required: true,
            // lowercase: true,
            trim: true,
        },
        features: {
            type: [String],
            required: true,
            validate: {
                validator: function (arr) {
                    return arr.length > 0;
                },
                message: "Features array must contain at least one feature.",
            },
        },
        maxFeatures: {
            type: [String],
            default: [],
        },
        addedBy: {
            type: Schema.Types.ObjectId,
            ref: "Admin", // Or "User" depending on who can assign
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Ensure one role per company
RoleFeatureAccessSchema.index({ companyId: 1, userId: 1, role: 1 }, { unique: true });

const RoleFeatureAccess = model("RoleFeatureAccess", RoleFeatureAccessSchema);

export default RoleFeatureAccess;
