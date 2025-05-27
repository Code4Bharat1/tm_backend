import express from "express";
import http from "http";
import cron from "node-cron";
import connectDB from "./src/init/dbConnection.js";
import SignupRouter from "./src/routes/signup.route.js";
import LoginRouter from "./src/routes/login.route.js";
import ForgotPasswordRouter from "./src/routes/forgotpassword.route.js";
import TimesheetRouter from "./src/routes/timesheet.route.js";
import AttendanceRouter from "./src/routes/attendance.route.js";
import LeaveRouter from "./src/routes/leave.route.js";
import ProfileRouter from "./src/routes/profile.route.js";
import AdminRouter from "./src/routes/adminAuth.route.js";
import SuperAdminRouter from "./src/routes/superAdminAuth.route.js";
import companyRegister from "./src/routes/companyRegister.route.js";
import BankDetailsRouter from "./src/routes/bankDetails.route.js";
import Task from "./src/routes/task.route.js";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { logout } from "./src/controller/logout.controller.js";
import CalendarRouter from "./src/routes/calendaruser.route.js";
import CalendarAdminRouter from "./src/routes/calendaradmin.route.js";
import CreatePost from "./src/routes/createpost.route.js";
import Expenses from "./src/routes/expense.route.js";
import UploadRouter from "./src/routes/upload.route.js";
import adddocument from "./src/routes/adddocument.route.js";
import Performance from "./src/routes/performance.route.js";
import Ticket from './src/routes/raiseTicket.route.js'
import { processAbsentees } from "./src/controller/attendance.controller.js";
import salaryRoute from "./src/routes/salaryslip.route.js"

import { initSocketServer } from "./src/service/socket.js";
import permissionsRoute from "./src/routes/permissions.route.js";
import letterOfConfirmation from "./src/routes/loc.route.js";

dotenv.config();
const Port = process.env.PORT;
const app = express();

const router = express.Router();

connectDB();

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
      "https://task-tracker.code4bharat.com",
      "https://task-tracker-admin.code4bharat.com",
      "https://task-tracker-superadmin.code4bharat.com",
      "https://www.task-tracker.code4bharat.com",
      "https://www.task-tracker-admin.code4bharat.com",
      "https://www.task-tracker-superadmin.code4bharat.com",
    ], // Frontend origin
    credentials: true,
  }),
);

app.use(cookieParser()); // Middleware to parse cookies

app.use(express.json());

app.get("/", (req, res) => res.send("API is working"));

app.use("/api/user", SignupRouter);
app.use("/api/user", LoginRouter);
app.use("/api/user", CalendarRouter);
app.use("/api/user", BankDetailsRouter);
app.use("/api/forgotpassword", ForgotPasswordRouter);
app.use("/api/timesheet", TimesheetRouter);
app.use("/api/attendance", AttendanceRouter);
app.use("/api/leave", LeaveRouter);
app.use("/api/profile", ProfileRouter);
app.use("/api/admin", AdminRouter);
app.use("/api/logout", logout);
app.use("/api/superadmin", SuperAdminRouter);
app.use("/api/companyRegister", companyRegister);
app.use("/api/admin", CalendarAdminRouter);
app.use("/api/admin", CreatePost);
app.use("/api/tasks", Task);
app.use("/api/expense", Expenses);
app.use("/api/upload", UploadRouter);
app.use("/api/adddocument", adddocument);
app.use("/api/permissions", permissionsRoute);
app.use("/api/performance", Performance);
app.use("/api/admin", letterOfConfirmation);
app.use("/api/salary",salaryRoute);
app.use('/api/ticket', Ticket)

cron.schedule("29 18 * * *", async () => {
  try {
    console.log("✅ Cron job is runns at 11:59 pm IST");

    // Call your actual logic
    await processAbsentees();
  } catch (err) {
    console.error("❌ Cron job error:", err.message);
  }
});

const server = http.createServer(app);
initSocketServer(server); // pass HTTP server to socket setup

server.listen(Port, () => {
  console.log(`🚀Socket Server running at http://localhost:${Port}`);
});

app.listen(Port, () => {
  console.log(`Server running on http://localhost:${Port}`);
});
