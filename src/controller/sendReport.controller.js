import ExcelJS from 'exceljs';
import axios from 'axios';
import Attendance from '../models/attendance.model.js';
import User from '../models/user.model.js';
import Admin from '../models/admin.model.js';
import { CompanyRegistration } from '../models/companyregistration.model.js';
import ReportLog from '../models/reportLog.model.js';
import { uploadFileToS3 } from '../utils/s3.utils.js';

export const sendDailyAttendanceReports = async () => {
  try {
    // Set today to start of day
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Retrieve all companies
    const companies = await CompanyRegistration.find();

    for (const company of companies) {
      const companyId = company._id;
      const companyName = company.companyInfo?.companyName || 'Unknown Company';
      const admin = await Admin.findOne({ companyId });
      if (!admin?.phone) continue;

      // Retrieve users and attendance for today
      const users = await User.find({ companyId });
      const attendanceRecords = await Attendance.find({ companyId, date: today });

      // Create a map for faster lookup
      const attendanceMap = new Map();
      attendanceRecords.forEach((record) => {
        attendanceMap.set(record.userId.toString(), record);
      });

      // Status color mapping
      const getStatusColor = (status) => {
        const colors = {
          'Present': 'FF22C55E',     // Green
          'Late': 'FFFB923C',        // Orange  
          'Absent': 'FFEF4444',      // Red
          'On Leave': 'FFA21CAF',    // Purple
          'Half Day': 'FF38BDF8',    // Blue
        };
        return colors[status] || 'FFD3D3D3'; // Default gray
      };

      // Count statuses
      const statusCounts = { Present: 0, Absent: 0, Late: 0, 'On Leave': 0, 'Half Day': 0, Other: 0 };
      users.forEach((user) => {
        const record = attendanceMap.get(user._id.toString());
        const status = record?.status || 'Absent';
        if (statusCounts[status] !== undefined) statusCounts[status]++;
        else statusCounts.Other++;
      });

      // Format data for export and group by status
      const groupedData = { Present: [], Absent: [], Late: [], 'On Leave': [], 'Half Day': [], Other: [] };
      users.forEach((user, index) => {
        const record = attendanceMap.get(user._id.toString());
        const status = record?.status || 'Absent';
        const data = {
          SNo: index + 1,
          Name: `${user.firstName} ${user.lastName}`,
          PunchIn: record?.punchIn ? new Date(record.punchIn).toLocaleTimeString() : '-',
          PunchOut: record?.punchOut ? new Date(record.punchOut).toLocaleTimeString() : '-',
          WorkedHours: record?.totalWorkedHours || 0,
          Overtime: record?.overtime || 0,
          Status: status,
          EmergencyReason: record?.status === 'Emergency' ? record.emergencyReason : '',
        };
        if (groupedData[status]) groupedData[status].push(data);
        else groupedData.Other.push(data);
      });

      // Create workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Attendance');

      // Add summary row for status counts
      worksheet.addRow([`Attendance Report for ${today.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`]);
      worksheet.mergeCells('A1:H1');
      worksheet.getCell('A1').font = { bold: true, size: 14 };
      worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };

      // Add status summary row
      const summaryRow = worksheet.addRow([
        'Present', statusCounts.Present,
        'Absent', statusCounts.Absent,
        'Late', statusCounts.Late,
        'On Leave', statusCounts['On Leave'],
        'Half Day', statusCounts['Half Day']
      ]);
      summaryRow.eachCell((cell, colNumber) => {
        if (colNumber % 2 === 1) {
          // Status name cell
          cell.font = { bold: true };
          cell.alignment = { horizontal: 'center' };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: getStatusColor(cell.value) } };
        } else {
          // Count cell
          cell.font = { bold: true };
          cell.alignment = { horizontal: 'center' };
        }
      });

      // Set column widths
      worksheet.columns = [
        { width: 8 },   // Sr.No.
        { width: 20 },  // Name
        { width: 12 },  // Punch In
        { width: 12 },  // Punch Out
        { width: 12 },  // Worked Hours
        { width: 10 },  // Overtime
        { width: 12 },  // Status
        { width: 25 },  // Emergency Reason
      ];

      // Add spacing after summary (row 3) - just a light-shaded row, no merge
      worksheet.insertRow(3, ['']);
      worksheet.getRow(3).height = 6;
      worksheet.getRow(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };

      // Helper to add a light-shaded empty row for spacing (no merge)
      const addSpacingRow = () => {
        const row = worksheet.addRow(['']);
        row.height = 6;
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }; // Very light gray
      };

      // Helper to add a section header with lighter shade
      const addSectionHeader = (status) => {
        const row = worksheet.addRow([`${status} (${statusCounts[status]})`]);
        worksheet.mergeCells(`A${row.number}:H${row.number}`);
        row.font = { bold: true, size: 12, color: { argb: 'FF374151' } };
        row.alignment = { horizontal: 'left', vertical: 'middle' };
        // Use a lighter shade for the section header
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };
      };

      // Helper to add table header with lighter shade
      const addTableHeader = () => {
        const headerRow = worksheet.addRow([
          'Sr.No.', 'Name', 'Punch In', 'Punch Out', 'Worked Hours', 'Overtime', 'Status', 'Emergency Reason'
        ]);
        headerRow.font = { bold: true, color: { argb: 'FF374151' } };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }; // Lighter gray
        headerRow.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
          };
        });
      };

      // Add grouped data sections with spacing and lighter shades
      const statusOrder = ['Present', 'Late', 'Absent', 'On Leave', 'Half Day', 'Other'];
      statusOrder.forEach((status, idx) => {
        if (groupedData[status] && groupedData[status].length > 0) {
          if (idx > 0) addSpacingRow(); // Add spacing before each group except the first
          addSectionHeader(status);
          addTableHeader();
          groupedData[status].forEach((item) => {
            const row = worksheet.addRow([
              item.SNo,
              item.Name,
              item.PunchIn,
              item.PunchOut,
              item.WorkedHours,
              item.Overtime,
              item.Status,
              item.EmergencyReason
            ]);
            row.alignment = { horizontal: 'center', vertical: 'middle' };
            row.eachCell((cell, colNumber) => {
              cell.border = {
                top: { style: 'thin', color: { argb: 'FFF3F4F6' } },
                bottom: { style: 'thin', color: { argb: 'FFF3F4F6' } },
                left: { style: 'thin', color: { argb: 'FFF3F4F6' } },
                right: { style: 'thin', color: { argb: 'FFF3F4F6' } }
              };
              // Status column (7th col)
              if (colNumber === 7) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: getStatusColor(row.getCell(7).value) } };
                cell.font = { bold: true, color: { argb: row.getCell(7).value === 'Present' ? 'FF000000' : 'FFFFFFFF' } };
              }
            });
          });
        }
      });

      // Add spacing after summary (row 3) - just a light-shaded row, no merge
      worksheet.insertRow(3, ['']);
      worksheet.getRow(3).height = 6;
      worksheet.getRow(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Create filename
      const dateForFileName = today.toISOString().split('T')[0];
      const fileName = `Attendance-${dateForFileName}.xlsx`;

      const fakeFile = {
        originalname: fileName,
        buffer,
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };

      // Upload to S3
      const { Location: reportUrl } = await uploadFileToS3(fakeFile);
      if (!reportUrl) throw new Error('Upload to S3 failed');

      // Format phone number
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
                  })
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

      // Log the report
      await ReportLog.create({ 
        companyId, 
        sentTo: admin.phone, 
        fileName, 
        status: 'Sent' 
      });

      console.log(`✅ Attendance report sent for ${companyName}`);
    }

    console.log('✅ All attendance reports sent successfully.');
  } catch (error) {
    console.error('❌ Error sending attendance reports:', error);
    throw error;
  }
};

// Report for users who did NOT punch in by punchInEndTime
export const sendPunchInReport = async (companyId) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const company = await CompanyRegistration.findById(companyId);
    if (!company) return;
    const { attendanceSettings = {}, companyInfo } = company;
    const { workingDays = [], punchInEndTime = '09:00' } = attendanceSettings;
    const admin = await Admin.findOne({ companyId });
    if (!admin?.phone) return;
    // Check if today is a working day
    const todayName = today.toLocaleDateString('en-US', { weekday: 'short' });
    if (!workingDays.includes(todayName)) return;
    // Find users and attendance
    const users = await User.find({ companyId });
    const attendanceRecords = await Attendance.find({ companyId, date: today });
    // Status calculation
    let countNotPunchedIn = 0, countLate = 0, countPunchedIn = 0;
    const dataRows = users.map((user, index) => {
      const record = attendanceRecords.find(r => r.userId.toString() === user._id.toString());
      let status = 'Not Punched In';
      if (record && record.punchIn) {
        const punchInTime = new Date(record.punchIn);
        const [endHour, endMinute] = punchInEndTime.split(":").map(Number);
        const endTime = new Date(today);
        endTime.setHours(endHour, endMinute, 0, 0);
        if (punchInTime > endTime) {
          status = 'Late';
          countLate++;
        } else {
          status = 'Punched In';
          countPunchedIn++;
        }
      } else {
        countNotPunchedIn++;
      }
      return {
        SNo: index + 1,
        Name: `${user.firstName} ${user.lastName}`,
        ExpectedPunchIn: punchInEndTime,
        Status: status
      };
    });
    if (dataRows.length === 0) return;
    // Excel formatting
    const getStatusColor = (status) => {
      const colors = {
        'Punched In': 'FF22C55E', // Green
        'Not Punched In': 'FFEF4444', // Red
        'Late': 'FFFB923C', // Orange
      };
      return colors[status] || 'FFD3D3D3';
    };
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Punch In Report');
    worksheet.addRow([`Punch In Report for ${today.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`]);
    worksheet.mergeCells('A1:D1');
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
    // Add summary row with colored cells
    const summaryRowIn = worksheet.addRow([
      'Punched In', countPunchedIn,
      'Late', countLate,
      'Not Punched In', countNotPunchedIn
    ]);
    summaryRowIn.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: getStatusColor('Punched In') };
    summaryRowIn.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: getStatusColor('Late') };
    summaryRowIn.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: getStatusColor('Not Punched In') };
    summaryRowIn.font = { bold: true };
    worksheet.columns = [
      { width: 8 },   // Sr.No.
      { width: 20 },  // Name
      { width: 16 },  // Expected Punch In
      { width: 16 },  // Status
    ];
    const headerRow = worksheet.addRow(['Sr.No.', 'Name', 'Expected Punch In', 'Status']);
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };
    });
    worksheet.views = [{ state: 'frozen', ySplit: 3 }];
    worksheet.autoFilter = { from: 'A3', to: 'D3' };
    // Group data by status
    const grouped = { 'Punched In': [], 'Late': [], 'Not Punched In': [] };
    dataRows.forEach(row => grouped[row.Status].push(row));
    Object.keys(grouped).forEach((status, idx) => {
      if (grouped[status].length > 0) {
        if (idx > 0) {
          // Add spacing row
          const space = worksheet.addRow(['']);
          space.height = 6;
        }
        // Section header with color
        const sectionHeader = worksheet.addRow([`${status} (${grouped[status].length})`]);
        worksheet.mergeCells(`A${sectionHeader.number}:D${sectionHeader.number}`);
        sectionHeader.font = { bold: true, size: 12 };
        sectionHeader.alignment = { horizontal: 'left', vertical: 'middle' };
        sectionHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: getStatusColor(status) };
        // Table header for group
        const groupHeader = worksheet.addRow(['Sr.No.', 'Name', 'Expected Punch In', 'Status']);
        groupHeader.font = { bold: true };
        groupHeader.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
          };
        });
        grouped[status].forEach((item) => {
          const row = worksheet.addRow([item.SNo, item.Name, item.ExpectedPunchIn, item.Status]);
          row.alignment = { horizontal: 'center', vertical: 'middle' };
          row.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: getStatusColor(item.Status) };
        });
      }
    });
    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    const dateForFileName = today.toISOString().split('T')[0];
    const fileName = `PunchInReport-${dateForFileName}.xlsx`;
    const fakeFile = {
      originalname: fileName,
      buffer,
      mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    const { Location: reportUrl } = await uploadFileToS3(fakeFile);
    if (!reportUrl) throw new Error('Upload to S3 failed');
    const phone = admin.phone.startsWith('91') ? admin.phone : `91${admin.phone}`;
    await axios.post(
      `https://live-mt-server.wati.io/${process.env.WATI_CLIENT_ID}/api/v1/sendTemplateMessages`,
      {
        template_name: 'attendance_report',
        broadcast_name: 'Daily Attendance - Punch In',
        receivers: [
          {
            whatsappNumber: phone,
            customParams: [
              { name: '1', value: admin.fullName || companyInfo?.companyName || '' },
              { name: '2', value: today.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) },
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
    console.log(`✅ Punch In report sent for ${companyInfo?.companyName}`);
  } catch (error) {
    console.error('❌ Error sending Punch In report:', error);
  }
};

// Report for users who did NOT punch out by punchOutEndTime
export const sendPunchOutReport = async (companyId) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const company = await CompanyRegistration.findById(companyId);
    if (!company) return;
    const { attendanceSettings = {}, companyInfo } = company;
    const { workingDays = [], punchOutEndTime = '17:00' } = attendanceSettings;
    const admin = await Admin.findOne({ companyId });
    if (!admin?.phone) return;
    // Check if today is a working day
    const todayName = today.toLocaleDateString('en-US', { weekday: 'short' });
    if (!workingDays.includes(todayName)) return;
    // Find users and attendance
    const users = await User.find({ companyId });
    const attendanceRecords = await Attendance.find({ companyId, date: today });
    let countNotPunchedOut = 0, countPunchedOut = 0;
    const dataRows = users.map((user, index) => {
      const record = attendanceRecords.find(r => r.userId.toString() === user._id.toString());
      let status = 'Not Punched Out';
      if (record && record.punchIn && record.punchOut) {
        status = 'Punched Out';
        countPunchedOut++;
      } else if (record && record.punchIn && !record.punchOut) {
        countNotPunchedOut++;
      } else {
        // Not punched in at all, still count as Not Punched Out
        countNotPunchedOut++;
      }
      return {
        SNo: index + 1,
        Name: `${user.firstName} ${user.lastName}`,
        ExpectedPunchOut: punchOutEndTime,
        Status: status
      };
    });
    if (dataRows.length === 0) return;
    // Excel formatting
    const getStatusColor = (status) => {
      const colors = {
        'Punched Out': 'FF22C55E', // Green
        'Not Punched Out': 'FFEF4444', // Red
      };
      return colors[status] || 'FFD3D3D3';
    };
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Punch Out Report');
    worksheet.addRow([`Punch Out Report for ${today.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`]);
    worksheet.mergeCells('A1:D1');
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
    // Add summary row with colored cells
    const summaryRow = worksheet.addRow([
      'Punched Out', countPunchedOut,
      'Not Punched Out', countNotPunchedOut
    ]);
    summaryRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: getStatusColor('Punched Out') };
    summaryRow.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: getStatusColor('Not Punched Out') };
    summaryRow.font = { bold: true };
    worksheet.columns = [
      { width: 8 },   // Sr.No.
      { width: 20 },  // Name
      { width: 16 },  // Expected Punch Out
      { width: 16 },  // Status
    ];
    const headerRow = worksheet.addRow(['Sr.No.', 'Name', 'Expected Punch Out', 'Status']);
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };
    });
    worksheet.views = [{ state: 'frozen', ySplit: 3 }]; // Freeze summary and header rows
    worksheet.autoFilter = { from: 'A3', to: 'D3' };
    // Group data by status
    const grouped = { 'Punched Out': [], 'Not Punched Out': [] };
    dataRows.forEach(row => grouped[row.Status].push(row));
    Object.keys(grouped).forEach((status, idx) => {
      if (grouped[status].length > 0) {
        if (idx > 0) {
          // Add spacing row
          const space = worksheet.addRow(['']);
          space.height = 6;
        }
        // Section header with color
        const sectionHeader = worksheet.addRow([`${status} (${grouped[status].length})`]);
        worksheet.mergeCells(`A${sectionHeader.number}:D${sectionHeader.number}`);
        sectionHeader.font = { bold: true, size: 12 };
        sectionHeader.alignment = { horizontal: 'left', vertical: 'middle' };
        sectionHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: getStatusColor(status) };
        // Table header for group
        const groupHeader = worksheet.addRow(['Sr.No.', 'Name', 'Expected Punch Out', 'Status']);
        groupHeader.font = { bold: true };
        groupHeader.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
          };
        });
        grouped[status].forEach((item) => {
          const row = worksheet.addRow([item.SNo, item.Name, item.ExpectedPunchOut, item.Status]);
          row.alignment = { horizontal: 'center', vertical: 'middle' };
          row.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: getStatusColor(item.Status) };
        });
      }
    });
    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    const dateForFileName = today.toISOString().split('T')[0];
    const fileName = `PunchOutReport-${dateForFileName}.xlsx`;
    const fakeFile = {
      originalname: fileName,
      buffer,
      mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    const { Location: reportUrl } = await uploadFileToS3(fakeFile);
    if (!reportUrl) throw new Error('Upload to S3 failed');
    const phone = admin.phone.startsWith('91') ? admin.phone : `91${admin.phone}`;
    await axios.post(
      `https://live-mt-server.wati.io/${process.env.WATI_CLIENT_ID}/api/v1/sendTemplateMessages`,
      {
        template_name: 'attendance_report',
        broadcast_name: 'Daily Attendance - Punch Out',
        receivers: [
          {
            whatsappNumber: phone,
            customParams: [
              { name: '1', value: admin.fullName || companyInfo?.companyName || '' },
              { name: '2', value: today.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) },
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
    console.log(`✅ Punch Out report sent for ${companyInfo?.companyName}`);
  } catch (error) {
    console.error('❌ Error sending Punch Out report:', error);
  }
};