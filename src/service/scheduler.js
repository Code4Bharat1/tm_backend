import cron from 'node-cron';
import Attendance from '../models/attendance.model.js';
import User from '../models/user.model.js';

// Helper to get start of current day (UTC midnight)
function getStartOfTodayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// ⏰ Run every day at 11:59 PM UTC
cron.schedule('59 23 * * *', async () => {
  try {
    const todayStart = getStartOfTodayUTC();

    const users = await User.find({}); // Optional: filter e.g. { isActive: true }

    for (const user of users) {
      const attendance = await Attendance.findOne({
        userId: user._id,
        companyId: user.companyId,
        date: todayStart,
      });

      // If no punch-in record, mark Absent
      if (!attendance) {
        await new Attendance({
          userId: user._id,
          companyId: user.companyId,
          date: todayStart,
          status: 'Absent',
          remark: 'Did not punch in',
        }).save();

        console.log(`🚫 Marked Absent: ${user._id} for ${todayStart.toISOString().split('T')[0]}`);
      }
    }

    console.log(`✅ All absentees processed for ${todayStart.toISOString().split('T')[0]}`);
  } catch (error) {
    console.error('❌ Error running absentee cron job:', error.message);
  }
});
