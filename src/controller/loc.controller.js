import LOC from "../models/loc.model.js";
// import User from "../models/user.model.js";
// import { CompanyRegistration } from "../models/companyregistration.model.js";

export const getAllLOCs = async (req, res) => {
    try {
        const { companyId } = req.user;

        const locs = await LOC.find({ companyId })
            .populate("userId", "firstName lastName email position")
            .populate("companyId", "companyInfo.companyName adminInfo.fullName")
            .sort({ createdAt: -1 }); // sort if needed

        const formattedLOCs = locs.map(loc => ({
            fullName: `${loc.userId.firstName} ${loc.userId.lastName}`,
            email: loc.userId.email,
            position: loc.userId.position,
            companyName: loc.companyId.companyInfo.companyName,
            CEO: loc.companyId.adminInfo.fullName,
            performanceMarks: loc.performanceMarks,
            performanceStatus: loc.performanceStatus,
        }));

        res.status(200).json({
            message: "LOC entries retrieved successfully",
            count: formattedLOCs.length,
            data: formattedLOCs
        });
    } catch (error) {
        console.error("Error fetching LOC entries:", error);
        res.status(500).json({
            message: "Internal Server Error",
            error: error.message
        });
    }
};
