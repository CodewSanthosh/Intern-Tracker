export function extractUncompletedTargets(targetStr, dailyProgresses) {
  if (!targetStr || typeof targetStr !== 'string') return [];
  
  // Split target string into sub-tasks strictly by semicolon or newline
  const separators = /[;\n]/;
  const rawTasks = targetStr.split(separators);
  
  const tasks = rawTasks.map(s => s.trim()).filter(s => s.length > 0);
  let uncompleted = [];

  const negationRegex = /\b(not|didn'?t|did not|couldn'?t|could not|failed|incomplete|haven'?t)\b/i;
  const combinedProgress = dailyProgresses.join(' ').toLowerCase();

  for (const task of tasks) {
    const words = task.toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .split(/\s+/)
      .filter(w => w.length > 0 && !['with', 'this', 'that', 'then', 'from', 'into', 'learn', 'create', 'build', 'using'].includes(w));
    
    // If we have no significant words, let's just use the task words
    const significantWords = words.length > 0 ? words : task.toLowerCase().split(/\s+/).filter(Boolean);
    if (significantWords.length === 0) continue;

    let matchedCount = 0;
    for (const word of significantWords) {
      if (combinedProgress.includes(word)) {
        matchedCount++;
      }
    }

    // Check if the progress submission contains negative phrasing related to this task
    const isNegated = dailyProgresses.some(p => {
       const pLower = p.toLowerCase();
       // It's negated if we find a negative word AND the progress text mentions the task keywords
       return negationRegex.test(pLower) && significantWords.some(w => pLower.includes(w));
    });

    const matchRatio = matchedCount / significantWords.length;
    
    // Require 40% match threshold. Automatically uncompleted if negated.
    if (matchRatio < 0.4 || isNegated) {
      // Recursively strip any previous "Rolled over from..." prefixes and symbols
      let cleanTask = task;
      while (cleanTask.match(/Rolled over from.*?:/i)) {
        cleanTask = cleanTask.replace(/Rolled over from.*?:/i, '').trim();
      }
      cleanTask = cleanTask.replace(/^[- \t*:]+/, '').trim();
      const neatTask = cleanTask.charAt(0).toUpperCase() + cleanTask.slice(1);
      uncompleted.push(neatTask);
    }
  }

  return uncompleted;
}

export function extractCompletedCount(periods) {
  if (!periods) return 0;
  
  const allPeriods = Object.values(periods);
  let totalMatches = 0;
  
  const negationRegex = /\b(not|didn'?t|did not|couldn'?t|could not|failed|incomplete|haven'?t)\b/i;
  const combinedProgress = allPeriods.flatMap(p => p.days ? Object.values(p.days).map(d => d.progress).filter(Boolean) : []).join(' ').toLowerCase();
  const progressList = allPeriods.flatMap(p => p.days ? Object.values(p.days).map(d => d.progress).filter(Boolean) : []);

  for (const period of allPeriods) {
    if (!period.target) continue;
    
    // Split by semicolon or newline
    const separators = /[;\n]/;
    const tasks = period.target.split(separators).map(s => s.trim()).filter(s => s.length > 0);
    
    for (const task of tasks) {
      const words = task.toLowerCase()
        .replace(/[^\w\s]/gi, '')
        .split(/\s+/)
        .filter(w => w.length > 0 && !['with', 'this', 'that', 'then', 'from', 'into', 'learn', 'create', 'build', 'using', 'from', 'week'].includes(w));
      
      const significantWords = words.length > 0 ? words : task.toLowerCase().split(/\s+/).filter(Boolean);
      if (significantWords.length === 0) continue;
      
      let matchedCount = 0;
      for (const word of significantWords) {
        if (combinedProgress.includes(word)) {
          matchedCount++;
        }
      }
      
      const matchRatio = matchedCount / significantWords.length;
      
      const isNegated = progressList.some(p => {
         const pLower = p.toLowerCase();
         return negationRegex.test(pLower) && significantWords.some(w => pLower.includes(w));
      });

      // Require 40% match threshold. Must not be negated.
      if (significantWords.length > 0 && matchRatio >= 0.4 && !isNegated) {
        totalMatches++;
      }
    }
  }
  return totalMatches;
}
