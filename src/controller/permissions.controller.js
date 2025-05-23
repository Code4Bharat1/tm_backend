import RoleFeatureAccess from "../models/roleFeatureAccess.model.js";
import User from '../models/user.model.js';
import { userSocketMap, io } from "../service/socket.js";

export const updateUserFeaturesByRoleAccess = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { userId, roleAccessUpdates } = req.body;

        // Validate input
        if (!userId || !Array.isArray(roleAccessUpdates) || roleAccessUpdates.length === 0) {
            return res.status(400).json({ message: 'Invalid input: userId and roleAccessUpdates are required.' });
        }

        // Update each role's features
        const updatePromises = roleAccessUpdates.map(({ roleId, features }) => {
            if (!roleId || !Array.isArray(features) || features.length === 0) {
                return null; // Skip invalid role update
            }
            return RoleFeatureAccess.findOneAndUpdate(
                { _id: roleId, userId, companyId },
                { features },
                { new: true }
            );
        });

        const updatedRoles = (await Promise.all(updatePromises)).filter(role => role);

        if (updatedRoles.length === 0) {
            return res.status(404).json({ message: 'No roles were updated. Please check roleId, userId, and companyId.' });
        }

        // Aggregate updated features
        const allUpdatedFeatures = updatedRoles.flatMap(role => role.features);
        const roleIds = updatedRoles.map(role => role._id);

        // Real-time Socket.IO notification
        const socketId = userSocketMap.get(userId?.toString());
        if (socketId) {
            io.to(socketId).emit('permissions_updated', {
                roleIds,
                updatedFeatures: allUpdatedFeatures,
            });
            console.log(`✅ Sent permissions_updated to user ${userId}`);
        } else {
            console.warn(`⚠️ No active socket found for user ${userId}`);
        }

        res.status(200).json({
            message: 'User role features updated successfully.',
            updatedRoles,
        });
    } catch (error) {
        console.error('❌ Error updating user features:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
};


export const getUsersFeaturesByCompany = async (req, res) => {
    try {
        const { companyId } = req.user;

        // Fetch all users in the company
        const users = await User.find({ companyId }).select('firstName lastName position');

        if (users.length === 0) {
            return res.status(404).json({ message: 'No users found for this company' });
        }

        // For each user, get their features
        const usersWithFeatures = await Promise.all(
            users.map(async (user) => {
                const roleFeatures = await RoleFeatureAccess.find({ userId: user._id, companyId })
                    .select('features'); // DO NOT exclude _id

                if (roleFeatures.length === 0) {
                    return {
                        userName: `${user.firstName} ${user.lastName}`,
                        position: user.position,
                        features: [],
                        roleIds: [], // Empty array if no roles
                    };
                }

                const featureList = roleFeatures.flatMap(rf => rf.features);
                const roleIds = roleFeatures.map(rf => rf._id); // Collecting MongoDB ObjectIds

                return {
                    userName: `${user.firstName} ${user.lastName}`,
                    position: user.position,
                    features: featureList,
                    roleIds: roleIds, // Now includes all RoleFeatureAccess IDs for this user
                };
            })
        );

        res.status(200).json(usersWithFeatures);
    } catch (error) {
        console.error('❌ Error fetching users features:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
};

