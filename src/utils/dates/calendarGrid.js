export function buildCalendarMonthRows(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = (first.getDay() + 6) % 7;
  const days = last.getDate();
  const prevMonth = new Date(year, month, 0);
  const prevDays = prevMonth.getDate();
  const rows = [];
  let row = [];
  for (let i = 0; i < startPad; i++) {
    const d = prevDays - startPad + i + 1;
    row.push({ date: new Date(year, month - 1, d), currentMonth: false });
  }
  for (let d = 1; d <= days; d++) {
    row.push({ date: new Date(year, month, d), currentMonth: true });
    if (row.length === 7) {
      rows.push(row);
      row = [];
    }
  }
  if (row.length) {
    let d = 1;
    while (row.length < 7) {
      row.push({ date: new Date(year, month + 1, d), currentMonth: false });
      d++;
    }
    rows.push(row);
  }
  return rows;
}
