import express from 'express';
import connectDB from './src/init/dbConnection.js';
import SignupRouter from './src/routes/signup.route.js';
import LoginRouter from './src/routes/login.route.js';
import ForgotPasswordRouter from './src/routes/forgotpassword.route.js';
import TimesheetRouter from './src/routes/timesheet.route.js';
import AttendanceRouter from './src/routes/attendance.route.js';
import LeaveRouter from './src/routes/leave.route.js';
import ProfileRouter from './src/routes/profile.route.js';
import AdminRouter from './src/routes/adminAuth.route.js';
import SuperAdminRouter from './src/routes/superAdminAuth.route.js';
import companyRegister from './src/routes/companyRegister.route.js'
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { logout } from './src/controller/logout.controller.js';
import CalendarRouter from './src/routes/calendaruser.route.js';

dotenv.config();
const Port = process.env.PORT;
const app = express();

const router = express.Router();

connectDB();

app.use(cors({
    origin: ['http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'https://task-tracker.code4bharat.com',
        'https://task-tracker-admin.code4bharat.com',
        'https://task-tracker-superadmin.code4bharat.com',
        'https://www.task-tracker.code4bharat.com',
        'https://www.task-tracker-admin.code4bharat.com',
        'https://www.task-tracker-superadmin.code4bharat.com'], // Frontend origin
    credentials: true,
}));

app.use(cookieParser()); // Middleware to parse cookies

app.use(express.json());

app.get('/', (req, res) => res.send('API is working'));

app.use('/api/user', SignupRouter);
app.use('/api/user', LoginRouter);
app.use('/api/forgotpassword', ForgotPasswordRouter);
app.use('/api/timesheet', TimesheetRouter);
app.use('/api/attendance', AttendanceRouter);
app.use('/api/leave', LeaveRouter);
app.use('/api/profile', ProfileRouter);
app.use('/api/admin', AdminRouter)
app.use('/api/logout', logout)
app.use('/api/superadmin', SuperAdminRouter);
app.use('/api/companyRegister', companyRegister)
app.use('/api/user', CalendarRouter);


app.listen(Port, () => {
    console.log(`Server running on http://localhost:${Port}`);
});