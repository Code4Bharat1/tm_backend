export default function getWeekRange(date = new Date()) {
  const start = new Date(date);
  const day = start.getDay(); // 0 (Sun) to 6 (Sat)

  // Adjust to previous Monday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);

  // Calculate Saturday
  const end = new Date(start);
  end.setDate(start.getDate() + 5);
  end.setHours(23, 59, 59, 999);
  return { weekStart: start, weekEnd: end };
}

