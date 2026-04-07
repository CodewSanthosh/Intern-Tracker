export function extractUncompletedTargets(targetStr, dailyProgresses) {
  if (!targetStr || typeof targetStr !== 'string') return [];
  
  // Split target string into sub-tasks heuristically (by comma, "and", or newline)
  const separators = /,(?:\s+and\b)?|\band\b|;/i;
  const rawTasks = targetStr.split(separators).flatMap(s => s.split('\n'));
  
  const tasks = rawTasks.map(s => s.trim()).filter(s => s.length > 3);
  let uncompleted = [];

  // Combine all daily progress texts into one string
  const combinedProgress = dailyProgresses.join(' ').toLowerCase();

  for (const task of tasks) {
    // Extract significant words from the task description
    const words = task.toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .split(/\s+/)
      .filter(w => w.length > 3 && !['with', 'this', 'that', 'then', 'from', 'into', 'learn', 'create', 'build', 'using'].includes(w));
    
    // If we have no significant words, skip it
    if (words.length === 0) continue;

    let matchedCount = 0;
    for (const word of words) {
      if (combinedProgress.includes(word)) {
        matchedCount++;
      }
    }

    // If less than half of the key words are mentioned, mark as uncompleted
    const matchRatio = matchedCount / words.length;
    if (matchRatio < 0.5) {
      // Capitalize first letter for neatness
      const neatTask = task.charAt(0).toUpperCase() + task.slice(1);
      uncompleted.push(neatTask);
    }
  }

  return uncompleted;
}
