// Stopwords to exclude from keyword matching
const ROLLOVER_STOPWORDS = new Set([
  'the','a','an','is','are','was','were','be','been','being',
  'have','has','had','do','does','did','will','would','could','should',
  'may','might','can','to','of','in','for','on','with','at','by',
  'from','up','into','and','or','but','if','that','this','these',
  'those','what','which','who','how','all','each','both','few',
  'more','most','other','such','very','just','also','as','than',
  'create','build','using','learn','perform','make','apply','use',
  'then','when','where','while','so','yet','nor','not','no'
]);

export function extractUncompletedTargets(targetStr, dailyProgresses) {
  if (!targetStr || typeof targetStr !== 'string') return [];

  // Split by ; and \n ONLY — 'Clean missing values and outliers' is ONE task
  const rawTasks = targetStr.split(';').flatMap(s => s.split('\n'));
  const tasks = rawTasks.map(s => s.trim()).filter(s => s.length > 0);

  // Combine all daily progress into one string for matching
  const combinedProgress = dailyProgresses.join(' ').toLowerCase();

  const uncompleted = [];

  for (const task of tasks) {
    // Extract meaningful keywords: length > 3 and not a stopword
    const keywords = task.toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .split(/\s+/)
      .filter(w => w.length > 3 && !ROLLOVER_STOPWORDS.has(w));

    if (keywords.length === 0) continue;

    // ✅ ANY keyword match = task is DONE (student mentioned at least one key concept)
    const anyMatched = keywords.some(kw => combinedProgress.includes(kw));

    if (!anyMatched) {
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
  
  // Combine all progress text to match against all tasks globally
  const combinedProgress = allPeriods.flatMap(p => p.days ? Object.values(p.days).map(d => d.progress).filter(Boolean) : []).join(' ').toLowerCase();

  for (const period of allPeriods) {
    if (!period.target) continue;
    
    // Split by ; and newline ONLY — not by 'and'
    const tasks = period.target.split(';').flatMap(s => s.split('\n')).map(s => s.trim()).filter(s => s.length > 0);
    
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
      
      // If at least half of the significant words match, count it as a completed task
      if (significantWords.length > 0 && matchedCount / significantWords.length >= 0.5) {
        totalMatches++;
      }
    }
  }
  return totalMatches;
}
