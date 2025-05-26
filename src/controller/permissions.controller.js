import RoleFeatureAccess from "../models/roleFeatureAccess.model.js";
import User from '../models/user.model.js';
import { userSocketMap, io } from "../service/socket.js";

export const updateUserFeaturesByRoleAccess = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { userId, roleAccessUpdates } = req.body;

        //console.log('📥 Received request to update user features:', { userId, roleAccessUpdates });

        // Validate input
        if (!userId || !Array.isArray(roleAccessUpdates) || roleAccessUpdates.length === 0) {
            return res.status(400).json({
                message: 'Invalid input: userId and roleAccessUpdates array are required.',
            });
        }

        const updateResults = [];

        for (const update of roleAccessUpdates) {
            const { roleId, features = [], maxFeature = [] } = update;

            //console.log('🔄 Processing role access update:', { roleId, features, maxFeature });

            if (!roleId || !Array.isArray(features) || !Array.isArray(maxFeature)) {
                return res.status(400).json({
                    message: 'Each roleAccessUpdate must include roleId, features array, and maxFeature array.',
                });
            }

            const query = {
                _id: roleId,
                userId,
                companyId,
            };

            const updateData = {
                features: features || [],
                maxFeatures: maxFeature || [],
            };
            //console.log('🔍 Querying for role feature access:', updateData.maxFeatures);
            const updatedRole = await RoleFeatureAccess.findOneAndUpdate(query, updateData, {
                new: true,
                upsert: false,
            });

            if (!updatedRole) {
                console.warn(`⚠️ No matching document found for roleId: ${roleId}, userId: ${userId}, companyId: ${companyId}`);
                return res.status(404).json({
                    message: `No role updated for roleId ${roleId}. Check IDs.`,
                });
            }

            //console.log('✅ Updated role document:', updatedRole);

            // Emit update via socket if user is connected
            const socketId = userSocketMap.get(userId.toString());
            if (socketId) {
                console.log(`📡 Emitting socket event to socket ID: ${socketId}`);
                io.to(socketId).emit('permissions_updated', {
                    roleId,
                    updatedFeatures: updatedRole.features,
                    updatedMaxFeatures: updatedRole.maxFeature,
                });
            } else {
                console.warn(`⚠️ No active socket found for userId ${userId}`);
            }

            updateResults.push(updatedRole);
        }

        return res.status(200).json({
            message: '✅ User role features updated successfully.',
            updatedRoles: updateResults,
        });

    } catch (error) {
        console.error('❌ Error updating user features:', error);
        return res.status(500).json({ message: 'Internal server error' });
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

        const usersWithFeatures = await Promise.all(
            users.map(async (user) => {
                const roleFeatures = await RoleFeatureAccess.find({ userId: user._id, companyId })
                    .select('features maxFeatures');

                // 🔍 Debugging line to log what is returned
                // console.log(`🔎 Role Features for user ${user._id}:`, roleFeatures);

                const featureList = roleFeatures.flatMap(rf => rf.features).filter(f => f);
                const maxFeatureList = roleFeatures.flatMap(rf => rf.maxFeatures).filter(f => f);
                const roleIds = roleFeatures.map(rf => rf._id);

                return {
                    userId: user._id,
                    userName: `${user.firstName} ${user.lastName}`,
                    position: user.position,
                    features: featureList,
                    maxFeatures: maxFeatureList,
                    roleIds
                };
            })
        );

        res.status(200).json(usersWithFeatures);
    } catch (error) {
        console.error('❌ Error fetching users features:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getUsersFeatures = async (req, res) => {
    try {
        const { companyId, userId } = req.user;
         // Pass userId as query param if needed

        // Build user filter
        const userFilter = { companyId };
        if (userId) userFilter._id = userId;

        // Fetch users
        const users = await User.find(userFilter).select('firstName lastName position');

        if (users.length === 0) {
            return res.status(404).json({ message: 'No users found for this company' });
        }

        const usersWithFeatures = await Promise.all(
            users.map(async (user) => {
                const roleFeatures = await RoleFeatureAccess.find({ userId: user._id, companyId })
                    .select('features maxFeatures');

                const featureList = roleFeatures.flatMap(rf => rf.features).filter(f => f);
                const maxFeatureList = roleFeatures.flatMap(rf => rf.maxFeatures).filter(f => f);
                const roleIds = roleFeatures.map(rf => rf._id);

                return {
                    userId: user._id,
                    userName: `${user.firstName} ${user.lastName}`,
                    position: user.position,
                    features: featureList,
                    maxFeatures: maxFeatureList,
                    roleIds
                };
            })
        );

        res.status(200).json(usersWithFeatures);
    } catch (error) {
        console.error('❌ Error fetching users features:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
};