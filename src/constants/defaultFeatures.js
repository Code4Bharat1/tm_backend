// src/constants/defaultFeatures.js
export const defaultFeatures = {
  Manager: ['viewtimesheet', 'tasks', 'viewattendance', 'viewleave', 'performanceScore', 'addteammembers'],
  TeamLeader: ['viewtimesheet', 'teamTasks', 'viewattendance'],
  HR: ['employeeRecords', 'leaveRequests', 'payroll', 'viewexpense', 'addDocument'],
  Salesman:['site-visit']
}

export const maxFeature = {
  Manager: ['payroll'],
  TeamLeader: ['viewleave'],
  HR: ['postUpload'],
  Salesman:[],
}