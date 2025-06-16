import xlsx from 'xlsx';
import axios from 'axios';
import Attendance from '../models/attendance.model.js';
import User from '../models/user.model.js';
import Admin from '../models/admin.model.js';
import {CompanyRegistration} from '../models/companyregistration.model.js';

import ReportLog from '../models/reportLog.model.js';
import { uploadFileToS3 } from '../utils/s3.utils.js'; 

export const sendDailyAttendanceReports = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const companies = await CompanyRegistration.find();

    for (const company of companies) {
      const companyId = company._id;
      const companyName = company.companyInfo?.companyName || 'Unknown Company';
      const admin = await Admin.findOne({ companyId });
      if (!admin?.phone) continue;

      const users = await User.find({ companyId });
      const attendanceRecords = await Attendance.find({ companyId, date: today });

      const attendanceMap = new Map();
      attendanceRecords.forEach(record => {
        attendanceMap.set(record.userId.toString(), record);
      });

      const finalData = users.map((user, index) => {
        const record = attendanceMap.get(user._id.toString());
        return {
          SNo: index + 1,
          Name: `${user.firstName} ${user.lastName}`,
          PunchIn: record?.punchIn ? new Date(record.punchIn).toLocaleTimeString() : '-',
          PunchOut: record?.punchOut ? new Date(record.punchOut).toLocaleTimeString() : '-',
          WorkedHours: record?.totalWorkedHours || 0,
          Overtime: record?.overtime || 0,
          Status: record?.status || 'Absent',
          Remark: record?.remark || 'Absent',
        };
      });

      // Generate Excel buffer
      const wb = xlsx.utils.book_new();
      const ws = xlsx.utils.json_to_sheet(finalData);
      xlsx.utils.book_append_sheet(wb, ws, 'Attendance');
      const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

      // Safe filename without spaces or special characters
      const dateForFileName = today.toISOString().split('T')[0]; // e.g., 2025-06-15
      const fileName = `Attendance-${dateForFileName}.xlsx`;

      const fakeFile = {
        originalname: fileName,
        buffer,
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };

      // Upload to S3
      const { Location: reportUrl } = await uploadFileToS3(fakeFile);
      if (!reportUrl) throw new Error('Upload to S3 failed');

      // Format phone
      const phone = admin.phone.startsWith('91') ? admin.phone : `91${admin.phone}`;

      // Send WhatsApp message
      await axios.post(
        `https://live-mt-server.wati.io/${process.env.WATI_CLIENT_ID}/api/v1/sendTemplateMessages`,
        {
          template_name: 'attendance_report',
          broadcast_name: 'Daily Attendance',
          receivers: [
            {
              whatsappNumber: phone,
              customParams: [
                { name: '1', value: admin.fullName || companyName },
                {
                  name: '2',
                  value: today.toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  }),
                },
                { name: '3', value: reportUrl },
              ],
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.WATI_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      await ReportLog.create({
        companyId,
        sentTo: admin.phone,
        fileName,
        status: 'Sent',
      });
    }

    console.log('✅ All attendance reports sent.');
  } catch (error) {
    console.error('❌ Error sending attendance reports:', error.message);
  }
};
