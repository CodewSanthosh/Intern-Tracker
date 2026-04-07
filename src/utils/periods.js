export const calculateDayNumber = (createdDate) => {
  if (!createdDate) return 1;
  const created = new Date(createdDate);
  const today = new Date();
  const diffTime = Math.abs(today - created);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
};

export const getPeriodType = (totalDays) => (totalDays <= 21 ? '3-day' : 'week');
export const getPeriodLength = (totalDays) => (totalDays <= 21 ? 3 : 7);

export const getCurrentPeriod = (dayNumber, totalDays) => {
  const periodLength = getPeriodLength(totalDays);
  return Math.ceil(dayNumber / periodLength);
};

export const getPeriodLabel = (periodNum, totalDays) => {
  if (periodNum === 0) return 'Week 0';
  return totalDays <= 21 ? `Period ${periodNum}` : `Week ${periodNum}`;
};

/** Total periods including Week 0 */
export const getTotalPeriods = (totalDays) => {
  const periodLength = getPeriodLength(totalDays);
  return 1 + Math.ceil(totalDays / periodLength);
};


