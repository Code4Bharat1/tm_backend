import { loginUser } from "../controller/login.controller.js";
import express from 'express';

const router = express.Router();
// Login route
router.post('/login', loginUser);

// Export the router
export default router;
