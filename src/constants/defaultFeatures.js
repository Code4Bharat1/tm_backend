// src/constants/defaultFeatures.js

export const defaultFeatures = {
    //admin: ['dashboard', 'employeeManagement', 'reports', 'settings'],
    Manager: ['viewtimesheet', 'tasks', 'viewattendance', 'viewleave', 'performanceScore'],
    // Employee: ['dashboard', 'tasks', 'timesheet'],
    TeamLeader: ['viewTeamTimesheet', 'teamTasks', 'viewTeamAttendance', ],
    HR: ['dashboard', 'employeeRecords', 'leaveRequests', 'payroll','viewExpense', 'addDocument'],
};

export const maxFeature = {
    Manager: ['payroll'],
    TeamLeader: ['viewTeamLeave'],
    HR: ['postUpload'],
}