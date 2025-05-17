import Leave from "../models/leave.model.js";
import Admin from '../models/admin.model.js';
import User from '../models/user.model.js';

export const getApprovers = async (req, res) => {
    try {
        const { companyId } = req.user;

        if (!companyId) {
            return res.status(401).json({ success: false, message: 'Unauthorized. Company ID missing.' });
        }

        // 1. Get all admins for this company
        const admins = await Admin.find({ companyId }).select('_id fullName');

        // 2. Get all managers from users for this company
        // const managers = await User.find({ companyId, position: 'Manager' }).select('_id firstName lastName');

        // 3. Format both results
        const formattedAdmins = admins.map(admin => ({
            id: admin._id,
            name: admin.fullName,
            role: 'admin',
        }));

        // const formattedManagers = managers.map(manager => ({
        //     id: manager._id,
        //     name: `${manager.firstName} ${manager.lastName}`,
        //     role: 'manager',
        // }));

        // 4. Merge and send
        // const approvers = [...formattedAdmins, ...formattedManagers];
        const approvers = [...formattedAdmins];
        res.status(200).json({ success: true, data: approvers });
    } catch (error) {
        console.error('Error fetching approvers:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

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
        const companyId = req.user.companyId;
        const attachment = req.file ? req.file.filename : null;

        const leave = new Leave({
            userId,
            fromDate,
            toDate,
            leaveType,
            managerId,
            reason,
            attachment,
            companyId,
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
        const leaves = await Leave.find({ userId })
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

const getCompanyLeaves = async (req, res) => {
    try {
        // companyId should come from JWT middleware
        const { companyId } = req.user;
        console.log('Company ID from token:', companyId); // Debugging line

        if (!companyId) {
            return res.status(401).json({ message: 'Unauthorized. Company ID missing.' });
        }

        // Step 1: Get all users under this company
        const users = await User.find({ companyId }).select('_id');
        const userIds = users.map(user => user._id);

        // Step 2: Fetch leaves belonging to these users and include username
        const leaves = await Leave.find({ userId: { $in: userIds } })
            .populate('userId', 'firstName lastName email position username')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, count: leaves.length, data: leaves });
    } catch (error) {
        console.error('Error fetching company leaves:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getSingleLeave = async (req, res) => {
    try {
        const leave = await Leave.findById(req.params.id).populate("userId", "firstName lastName email position");

        if (!leave) {
            return res.status(404).json({ success: false, message: "Leave not found" });
        }

        res.status(200).json({ success: true, data: leave });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};


// Update leave status (approve or reject)
export const getLeaveDetailsById = async (req, res) => {
    try {
        const { companyId } = req.user; // Extracted from JWT
        const { leaveId } = req.params;

        if (!companyId) {
            return res.status(401).json({ message: 'Unauthorized. Company ID missing.' });
        }

        // Step 1: Fetch the leave with user details
        const leave = await Leave.findById(leaveId).populate('userId', 'firstName lastName email position companyId');

        if (!leave) {
            return res.status(404).json({ message: 'Leave not found.' });
        }

        // Step 2: Ensure the user associated with the leave belongs to the requesting company
        if (leave.userId.companyId.toString() !== companyId) {
            return res.status(403).json({ message: 'You are not authorized to view this leave.' });
        }

        res.status(200).json({ success: true, data: leave });
    } catch (error) {
        console.error('Error fetching leave details:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const updateLeaveStatus = async (req, res) => {
    try {
        const { leaveId } = req.params;
        const { status } = req.body;

        // Validate status
        const validStatuses = ['Approved', 'Rejected', 'Pending'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status value' });
        }

        // Find the leave application
        const leave = await Leave.findById(leaveId);
        if (!leave) {
            return res.status(404).json({ success: false, message: 'Leave application not found' });
        }

        // Update status only if current status is pending (optional)
        if (leave.status !== 'Pending') {
            return res.status(400).json({ success: false, message: 'Leave status cannot be updated once processed' });
        }

        // Update leave status
        leave.status = status;
        await leave.save();

        return res.status(200).json({ success: true, message: `Leave ${status.toLowerCase()} successfully`, data: leave });
    } catch (error) {
        console.error('Error updating leave status:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};



export { applyLeave, getAllLeaves, updateLeaveStatus, getCompanyLeaves, getSingleLeave };