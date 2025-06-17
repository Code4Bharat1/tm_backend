import xlsx from 'xlsx';
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
          'Present': '22C55E',     // Green
          'Late': 'FB923C',        // Orange  
          'Absent': 'EF4444',      // Red
          'On Leave': 'A21CAF',    // Purple
          'Half Day': '38BDF8',    // Blue
        };
        return colors[status] || 'D3D3D3'; // Default gray
      };

      // Format data for export
      const finalData = users.map((user, index) => {
        const record = attendanceMap.get(user._id.toString());
        const status = record?.status || 'Absent';
        
        return {
          SNo: index + 1,
          Name: `${user.firstName} ${user.lastName}`,
          PunchIn: record?.punchIn ? new Date(record.punchIn).toLocaleTimeString() : '-',
          PunchOut: record?.punchOut ? new Date(record.punchOut).toLocaleTimeString() : '-',
          WorkedHours: record?.totalWorkedHours || 0,
          Overtime: record?.overtime || 0,
          Status: status,
          EmergencyReason: record?.status === 'Emergency' ? record.emergencyReason : '',
          _statusColor: getStatusColor(status),
        };
      });

      // Prepare worksheet data
      const wsData = [];
      
      // Add title row
      wsData.push([
        `Attendance Report for ${today.toLocaleDateString('en-IN', {
          day: 'numeric', month: 'long', year: 'numeric',
        })}`
      ]);
      
      // Add header row
      wsData.push([
        'Sr.No.', 'Name', 'Punch In', 'Punch Out', 'Worked Hours', 'Overtime', 'Status', 'Emergency Reason'
      ]);
      
      // Add data rows
      finalData.forEach(item => {
        wsData.push([
          item.SNo,
          item.Name,
          item.PunchIn,
          item.PunchOut,
          item.WorkedHours,
          item.Overtime,
          item.Status,
          item.EmergencyReason
        ]);
      });

      // Create worksheet
      const ws = xlsx.utils.aoa_to_sheet(wsData);

      // Apply styling to the worksheet
      const range = xlsx.utils.decode_range(ws['!ref']);
      
      // Style the title row (merge and center)
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }
      ];
      
      // Style title cell
      if (ws['A1']) {
        ws['A1'].s = {
          font: { bold: true, size: 14 },
          alignment: { horizontal: 'center', vertical: 'center' },
          fill: { fgColor: { rgb: 'E5E7EB' } } // Light gray background
        };
      }

      // Style header row
      for (let col = 0; col <= 7; col++) {
        const cellAddress = xlsx.utils.encode_cell({ r: 1, c: col });
        if (ws[cellAddress]) {
          ws[cellAddress].s = {
            font: { bold: true, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: '374151' } }, // Dark gray background
            alignment: { horizontal: 'center', vertical: 'center' },
            border: {
              top: { style: 'thin', color: { rgb: '000000' } },
              bottom: { style: 'thin', color: { rgb: '000000' } },
              left: { style: 'thin', color: { rgb: '000000' } },
              right: { style: 'thin', color: { rgb: '000000' } }
            }
          };
        }
      }

      // Apply color coding to status column and general formatting to data rows
      finalData.forEach((item, idx) => {
        const rowIdx = idx + 2; // Data starts from row 2 (0-based indexing)
        
        // Apply styling to all cells in the data row
        for (let col = 0; col <= 7; col++) {
          const cellAddress = xlsx.utils.encode_cell({ r: rowIdx, c: col });
          if (ws[cellAddress]) {
            // Base styling for all data cells
            ws[cellAddress].s = {
              border: {
                top: { style: 'thin', color: { rgb: 'D1D5DB' } },
                bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
                left: { style: 'thin', color: { rgb: 'D1D5DB' } },
                right: { style: 'thin', color: { rgb: 'D1D5DB' } }
              },
              alignment: { horizontal: 'center', vertical: 'center' }
            };

            // Special styling for Status column (column 6)
            if (col === 6) {
              ws[cellAddress].s = {
                ...ws[cellAddress].s,
                fill: { fgColor: { rgb: item._statusColor } },
                font: { 
                  bold: true, 
                  color: { rgb: item.Status === 'Present' ? '000000' : 'FFFFFF' } // Black text for green, white for others
                }
              };
            }
          }
        }
      });

      // Set column widths for better appearance
      ws['!cols'] = [
        { width: 8 },   // Sr.No.
        { width: 20 },  // Name
        { width: 12 },  // Punch In
        { width: 12 },  // Punch Out
        { width: 12 },  // Worked Hours
        { width: 10 },  // Overtime
        { width: 12 },  // Status
        { width: 25 },  // Emergency Reason
      ];

      // Create workbook and add worksheet
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'Attendance');
      
      // Generate buffer
      const buffer = xlsx.write(wb, { 
        type: 'buffer', 
        bookType: 'xlsx',
        cellStyles: true // Enable cell styling
      });

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