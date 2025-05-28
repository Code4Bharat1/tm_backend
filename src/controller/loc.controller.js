import LOC from "../models/loc.model.js";
import User from "../models/user.model.js";
import { CompanyRegistration } from "../models/companyregistration.model.js";

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

export const getAllUserName = async (req, res) => {
    try {
        const { companyId } = req.user;

        // Fetch users with required fields
        const users = await User.find(
            { companyId },
            "firstName lastName email _id position"
        ).sort({ firstName: 1 });

        // Fetch company registration details
        const company = await CompanyRegistration.findById(companyId)
            .select('companyInfo.companyName adminInfo.fullName')
            .lean();

        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }

        // Add fullName first and maintain proper order
        const updatedUsers = users.map(user => ({
            fullName: `${user.firstName} ${user.lastName}`,
            email: user.email,
            position: user.position,
            companyName: company.companyInfo.companyName,
            CEO: company.adminInfo.fullName,
            userId: user._id
        }));

        res.status(200).json({
            message: "User details retrieved successfully",
            count: updatedUsers.length,
            data: updatedUsers
        });
    } catch (error) {
        console.error("Error fetching user details:", error);
        res.status(500).json({
            message: "Internal Server Error",
            error: error.message
        });
    }
};

export const createLOC = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { userId,  performanceMarks, performanceStatus } = req.body;
console.log("Creating LOC with data:", req.body);
        // Validate required fields
        if (!userId || !companyId || performanceMarks == null || !performanceStatus) {
            return res.status(400).json({ message: "All fields are required." });
        }

        // Create new LOC entry
        const newLOC = new LOC({
            userId,
            companyId,
            performanceMarks,
            performanceStatus
        });

        await newLOC.save();

        res.status(201).json({
            message: "LOC record created successfully",
            data: newLOC
        });
    } catch (error) {
        console.error("Error creating LOC:", error);
        res.status(500).json({
            message: "Internal Server Error",
            error: error.message
        });
    }
};