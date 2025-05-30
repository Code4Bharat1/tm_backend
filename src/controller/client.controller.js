// controllers/clientController.js
import Client from '../models/client.model.js';
import bcrypt from 'bcrypt';

// Create new client account
export const registerClient = async (req, res) => {
    try {
        const { name, email, password, phone, country, projectId } = req.body;
        const {companyId} = req.user;
        // Basic validation
        if (!name || !companyId || !email || !password || !phone || !country) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Check if email already exists
        const existingClient = await Client.findOne({ email });
        if (existingClient) {
            return res.status(409).json({
                success: false,
                message: 'Email already registered'
            });
        }

        // Create new client
        const newClient = new Client({
            name,
            companyId,
            email,
            password, // Will be hashed by pre-save hook
            phone,
            country,
            projectId: projectId || [] // Handle optional field
        });

        // Save to database
        const savedClient = await newClient.save();

        // Return response without password
        const clientResponse = savedClient.toObject();
        delete clientResponse.password;

        res.status(201).json({
            success: true,
            message: 'Client account created successfully',
            client: clientResponse
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// controllers/clientController.js (continued)

// Get all clients
export const getAllClients = async (req, res) => {
    try {
        // Optional: Add pagination and filtering
        const clients = await Client.find({})
            .select('-password') // Exclude password field
            .populate('companyId', 'companyName') // Populate company name
            .populate('projectId', 'projectName'); // Populate project names

        res.status(200).json({
            success: true,
            count: clients.length,
            clients
        });

    } catch (error) {
        console.error('Get clients error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve clients',
            error: error.message
        });
    }
};

// Get single client by ID
export const getClientById = async (req, res) => {
    try {
        const client = await Client.findById(req.params.id)
            .select('-password')
            .populate('companyId', 'companyName')
            .populate('projectId', 'projectName');

        if (!client) {
            return res.status(404).json({
                success: false,
                message: 'Client not found'
            });
        }

        res.status(200).json({
            success: true,
            client
        });

    } catch (error) {
        console.error('Get client error:', error);

        if (error.kind === 'ObjectId') {
            return res.status(400).json({
                success: false,
                message: 'Invalid client ID format'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
  };