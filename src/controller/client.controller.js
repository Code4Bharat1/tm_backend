import crypto from "crypto";
import Client from "../models/client.model.js";
import bcrypt from "bcrypt";
import { sendMail } from "../service/nodemailerConfig.js";
import jwt from 'jsonwebtoken'
// Create new client account
export const registerClient = async (req, res) => {
  try {
    const { name, email, phone, country } = req.body;
    const { companyId } = req.user;

    if (!name || !companyId || !email || !phone || !country) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const existingClient = await Client.findOne({ email });
    if (existingClient) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    const randomNum = crypto.randomInt(1000, 9999);
    const rawPassword = `${name.split(" ")[0]}@${randomNum}`;

    const emailHTML = `
      <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 30px;">
        <div style="max-width: 600px; margin: auto; background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.05);">
          <h2 style="color: #333333;">Welcome to Task Tracker, ${
            name.split(" ")[0]
          }!</h2>
          <p style="font-size: 16px; color: #555555;">Your client account has been successfully created.</p>
          <p style="font-size: 16px; color: #555555;">Please use the credentials below to log in:</p>
          <table style="margin-top: 20px; font-size: 16px; color: #333;">
            <tr>
              <td style="padding: 8px 0;"><strong>Email:</strong></td>
              <td style="padding: 8px 0;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Password:</strong></td>
              <td style="padding: 8px 0;">${rawPassword}</td>
            </tr>
          </table>
          <p style="margin-top: 20px; font-size: 14px; color: #777777;">For security reasons, please log in and change your password at your earliest convenience.</p>
          <p style="font-size: 16px; color: #555555;">If you have any questions, feel free to reach out.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eaeaea;">
          <p style="font-size: 14px; color: #999999;">Thank you,<br>Task Tracker Team</p>
        </div>
      </div>
    `;

    const newClient = new Client({
      name,
      companyId,
      email,
      password: rawPassword,
      phone,
      country,
    });

    const savedClient = await newClient.save();
    await sendMail(email, "Your Login Credentials", emailHTML);
    const clientResponse = savedClient.toObject();
    delete clientResponse.password;

    res.status(201).json({
      success: true,
      message: "Client account created successfully",
      client: clientResponse,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const loginClient = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // 👇 Include password explicitly
    const client = await Client.findOne({ email }).select("+password");
    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    const isMatch = await bcrypt.compare(password, client.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      {
        clientId: client._id,
        email: client.email,
        companyId: client.companyId,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION },
    );

    const clientData = client.toObject();
    delete clientData.password;

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      client: clientData,
    });
  } catch (error) {
    console.error("Client login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const getAllClients = async (req, res) => {
  try {
    const { companyId } = req.user;
    const clients = await Client.find({ companyId })
      .select("-password") // Exclude password field
      .populate("companyId", "companyName") // Populate company name
      .populate("projectId", "bucketName"); // Populate project names

    res.status(200).json({
      success: true,
      count: clients.length,
      clients,
    });
  } catch (error) {
    console.error("Get clients error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve clients",
      error: error.message,
    });
  }
};

// Get single client by ID
export const getClientById = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id)
      .select("-password")
      .populate("companyId", "companyName")
      .populate("projectId", "projectName");

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    res.status(200).json({
      success: true,
      client,
    });
  } catch (error) {
    console.error("Get client error:", error);

    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid client ID format",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
