// src/constants/defaultFeatures.js
export const defaultFeatures = {
  Manager: ['viewtimesheet', 'tasks', 'viewattendance', 'viewleave', 'performanceScore'],
  TeamLeader: ['viewtimesheet', 'teamTasks', 'viewattendance'],
  HR: ['dashboard', 'employeeRecords', 'leaveRequests', 'payroll', 'viewexpense', 'addDocument'],
}

export const maxFeature = {
  Manager: ['payroll'],
  TeamLeader: ['viewleave'],
  HR: ['postUpload'],
}