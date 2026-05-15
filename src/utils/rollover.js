// Stopwords to exclude from keyword matching
const ROLLOVER_STOPWORDS = new Set([
  'the','a','an','is','are','was','were','be','been','being',
  'have','has','had','do','does','did','will','would','could','should',
  'may','might','can','to','of','in','for','on','with','at','by',
  'from','up','into','and','or','but','if','that','this','these',
  'those','what','which','who','how','all','each','both','few',
  'more','most','other','such','very','just','also','as','than',
  'create','build','using','learn','perform','make','apply','use',
  'then','when','where','while','so','yet','nor','not','no', 'week'
]);

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
      .filter(w => w.length > 2 && !ROLLOVER_STOPWORDS.has(w));
    
    // If we have no significant words, let's just use all words
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

    // REQUIRE 65% of the concepts to be mentioned! If only part of a complex task is done, roll over the WHOLE task.
    const matchRatio = matchedCount / significantWords.length;
    
    if (matchRatio < 0.65 || isNegated) {
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
        .filter(w => w.length > 2 && !ROLLOVER_STOPWORDS.has(w));
      
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

      // Require 65% match threshold. Must not be negated.
      if (significantWords.length > 0 && matchRatio >= 0.65 && !isNegated) {
        totalMatches++;
      }
    }
  }
  return totalMatches;
}
