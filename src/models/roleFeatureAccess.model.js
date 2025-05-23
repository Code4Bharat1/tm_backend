import mongoose from "mongoose";

const { Schema, model } = mongoose;

const RoleFeatureAccessSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    companyId: {
        type: Schema.Types.ObjectId,
        ref: "CompanyRegistration",
        required: true,
    },
    role: {
        type: String,
        enum: ["admin", "manager", "employee", "teamleader", "hr"],
        required: true,
    },
        featureKey: {
            type: String,
            required: true,
        },
    addedBy: {
        type: Schema.Types.ObjectId,
        ref: "Admin",
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Unique index: one featureKey per role per company
RoleFeatureAccessSchema.index(
    { companyId: 1, role: 1, featureKey: 1 },
    { unique: true }
);

const RoleFeatureAccess = model("RoleFeatureAccess", RoleFeatureAccessSchema);
export default RoleFeatureAccess;
