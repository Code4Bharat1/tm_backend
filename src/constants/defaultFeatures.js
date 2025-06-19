// src/constants/defaultFeatures.js
export const defaultFeatures = {
  Manager: ['viewtimesheet', 'tasks', 'viewattendance', 'viewleave', 'performanceScore', 'addteammembers'],
  TeamLeader: ['viewtimesheet', 'teamTasks', 'viewattendance'],
  HR: ['employeeRecords', 'leaveRequests', 'payroll', 'viewexpense', 'addDocument','event'],
  Salesman:['site-visit']
}

export const maxFeature = {
  Manager: ['payroll'],
  TeamLeader: ['viewleave'],
  HR: ['postUpload'],
  Salesman:[],
}

export const planFeature = {
  basic: {
    features: [
      'attendance',
      'dashboard',
      'expense',
      'leave',  
      'project',
      'timesheet',
    ],
  },
  standard: {
    features: [
      'attendance',
      'basic_reports',
      'calendar',
      'dashboard',
      'document',
      'expense',
      'leave',
      'loc',
      'payroll',
      'performance_board',
      'post',
      'project',
      'salary',
      'single_chat',
      'timesheet',
    ],
  },
  premium: {
    features: [
      'attendance',
      'calendar',
      'dashboard',
      'daily_backup',
      'document',
      'event',
      'expense',
      'group_chat',
      'group_sheet',
      'leave',
      'loc',
      'payroll',
      'performance_board',
      'post',
      'project',
      'reports',
      'salary',
      'timesheet',
      'zoom',
    ],
  },
};
