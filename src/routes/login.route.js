import { loginUser, auth } from "../controller/login.controller.js";
import express from 'express';

const router = express.Router();
// Login route
router.post('/login', loginUser);
router.get('/auth/me', auth);
// Export the router
export default router;
