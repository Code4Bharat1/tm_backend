import Leave from "../models/leave.model.js";

// Apply for leave
 const applyLeave = async (req, res) => {
    try {
        const {
            
            fromDate,
            toDate,
            leaveType,
            managerId,
            reason,
        } = req.body;
        const userId = req.user.userId; 
        const attachment = req.file ? req.file.filename : null;

        const leave = new Leave({
            userId,
            fromDate,
            toDate,
            leaveType,
            managerId,
            reason,
            attachment,
        });

        await leave.save();

        res.status(201).json({
            success: true,
            message: "Leave applied successfully",
            leave,
        });
    } catch (error) {
        console.error("Error applying leave:", error);
        res.status(500).json({
            success: false,
            message: "Server error while applying for leave",
            error: error.message,
        });
    }
};

// Get all leaves (admin/manager view)
 const getAllLeaves = async (req, res) => {
    try {
        const userId = req.user.userId; // Get the user ID from the request
        const leaves = await Leave.find({userId})
            .populate("userId", "name email")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            leaves,
        });
    } catch (error) {
        console.error("Error fetching leaves:", error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching leaves",
            error: error.message,
        });
    }
};

// Update leave status (approve or reject)
 const updateLeaveStatus = async (req, res) => {
    try {
        const { leaveId } = req.params;
        const { status } = req.body;

        if (!["Approved", "Rejected"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status. Must be Approved or Rejected.",
            });
        }

        const leave = await Leave.findByIdAndUpdate(
            leaveId,
            { status },
            { new: true }
        );

        if (!leave) {
            return res.status(404).json({
                success: false,
                message: "Leave not found",
            });
        }

        res.status(200).json({
            success: true,
            message: `Leave ${status.toLowerCase()} successfully`,
            leave,
        });
    } catch (error) {
        console.error("Error updating leave status:", error);
        res.status(500).json({
            success: false,
            message: "Server error while updating leave status",
            error: error.message,
        });
    }
};

export { applyLeave, getAllLeaves, updateLeaveStatus };