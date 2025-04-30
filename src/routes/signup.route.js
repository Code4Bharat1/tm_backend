// routes/userRoutes.js
import express from 'express';
import { createUser } from '../controller/signup.controller.js';

const router = express.Router();

router.post('/register', createUser);

export default router;
