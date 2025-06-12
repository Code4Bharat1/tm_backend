import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import http from "http";
import cron from "node-cron";

import connectDB from "./src/init/dbConnection.js";
import pool from "./src/init/pgConnection.js";
import { createSchemaAndTables } from "./src/models/sheet.schema.js";

import { logout } from "./src/controller/logout.controller.js";
import { processAbsentees } from "./src/controller/attendance.controller.js";
import adddocument from "./src/routes/adddocument.route.js";
import AdminRouter from "./src/routes/adminAuth.route.js";
import AttendanceRouter from "./src/routes/attendance.route.js";
import BankDetailsRouter from "./src/routes/bankDetails.route.js";
import CalendarAdminRouter from "./src/routes/calendaradmin.route.js";
import CalendarRouter from "./src/routes/calendaruser.route.js";
import companyRegister from "./src/routes/companyRegister.route.js";
import CreatePost from "./src/routes/createpost.route.js";
import Expenses from "./src/routes/expense.route.js";
import ForgotPasswordRouter from "./src/routes/forgotpassword.route.js";
import LeaveRouter from "./src/routes/leave.route.js";
import LoginRouter from "./src/routes/login.route.js";
import meetingRoute from "./src/routes/meeting.route.js";
import notificationRouter from './src/routes/notification.router.js';
import Performance from "./src/routes/performance.route.js";
import ProfileRouter from "./src/routes/profile.route.js";
import Ticket from './src/routes/raiseTicket.route.js';
import SignupRouter from "./src/routes/signup.route.js";
import SuperAdminRouter from "./src/routes/superAdminAuth.route.js";
import Task from "./src/routes/task.route.js";
import TimesheetRouter from "./src/routes/timesheet.route.js";
import UploadRouter from "./src/routes/upload.route.js";
import LocationRouter from "./src/routes/location.routes.js"
import client from './src/routes/client.route.js';
import loc from "./src/routes/loc.route.js";
import permissionsRoute from "./src/routes/permissions.route.js";
import salesmanRoute from "./src/routes/salesman.route.js"
import team from './src/routes/team.route.js';
import { initSocketServer } from "./src/service/socket.js";
import Sheets from './src/routes/sheet.route.js';
import SalaryRoute from './src/routes/salary.route.js';
import EventRouter from './src/routes/event.route.js';
import gameScoreRouter from './src/routes/gameScore.route.js';
import sudokuRoute from "./src/routes/sudoku.route.js"

dotenv.config();
const Port = process.env.PORT;
const app = express();

const startServer = async () => {
  try {
    // Connect to MongoDB or any other DB if needed
    await connectDB();

    // Initialize PostgreSQL schema and tables
    await createSchemaAndTables();

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
          'https://tt-chatapp.code4bharat.com',
          'https://www.tt-chatapp.code4bharat.com',
        ],
        credentials: true,
      }),
    );
    app.use(cookieParser());
    app.use(express.json({ limit: '20mb' }));

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
    app.use("/api/salary", SalaryRoute);
    app.use('/api/ticket', Ticket);
    app.use("/api/admin/loc", loc);
    app.use("/api/meeting", meetingRoute);
    app.use("/api/admin/member", team);
    app.use("/api/admin/client", client);
    app.use("/api", notificationRouter);
    app.use("/api", salesmanRoute);
    app.use("/api/location", LocationRouter);
    app.use("/api/event", EventRouter);
    app.use('/api/sheets', Sheets);
    app.use('/api/gamescore', gameScoreRouter);
    app.use('/api/sudoku',sudokuRoute)

    //automate the absenting who din't punchin at 11:59pm 
    cron.schedule(
      "59 23 * * *", // 11:59 PM
      async () => {
        try {
          console.log("✅ Cron job is running at 11:59 PM IST");
          await processAbsentees();
        } catch (err) {
          console.error("❌ Cron job error:", err.message);
        }
      },
      {
        timezone: "Asia/Kolkata", // IST timezone
        scheduled: true,
      }
    );

    const server = http.createServer(app);
    initSocketServer(server);

    server.listen(Port, () => {
      console.log(`🚀Socket Server running at http://localhost:${Port}`);
    });

  } catch (err) {
    console.error("❌ Server failed to start:", err);
    process.exit(1);
  }
};

startServer();
