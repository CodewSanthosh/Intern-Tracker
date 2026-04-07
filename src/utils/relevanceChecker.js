/**
 * Relevance Checker — Pre-submission validation engine
 * 
 * Checks if daily progress text is actually related to the intern's project
 * by scoring across 6 weighted signals.
 */

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with',
  'of', 'is', 'it', 'this', 'that', 'was', 'were', 'are', 'been', 'be', 'have',
  'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may',
  'can', 'not', 'no', 'so', 'if', 'then', 'than', 'too', 'very', 'just', 'about',
  'also', 'some', 'any', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
  'other', 'into', 'over', 'such', 'only', 'own', 'same', 'what', 'which', 'who',
  'whom', 'how', 'when', 'where', 'why', 'here', 'there', 'up', 'out', 'off',
  'down', 'from', 'by', 'as', 'its', 'my', 'our', 'your', 'their', 'his', 'her',
  'they', 'them', 'we', 'us', 'you', 'he', 'she', 'me', 'i', 'am',
  'today', 'worked', 'work', 'started', 'completed', 'finished', 'done', 'made',
  'used', 'using', 'built', 'created', 'implemented', 'added', 'updated', 'fixed',
  'tried', 'learned', 'learning', 'studied', 'day', 'progress', 'working'
]);

/**
 * Tokenize text into meaningful words (lowercase, no punctuation, no stop words)
 */
function tokenize(text) {
  if (!text || typeof text !== 'string') return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Generate bigrams (two-word pairs) from a token array
 */
function getBigrams(tokens) {
  const bigrams = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    bigrams.push(tokens[i] + ' ' + tokens[i + 1]);
  }
  return bigrams;
}

/**
 * Signal 1: Keyword overlap with project summary (0-100)
 */
function scoreKeywordOverlap(progressTokens, referenceTokens) {
  if (referenceTokens.length === 0 || progressTokens.length === 0) return { score: 50, matched: [], total: 0 };
  
  const refSet = new Set(referenceTokens);
  const matched = [...new Set(progressTokens)].filter(t => refSet.has(t));
  
  // Score based on percentage of progress tokens that match reference
  const uniqueProgress = new Set(progressTokens);
  const matchRatio = matched.length / Math.max(1, uniqueProgress.size);
  
  // Also consider coverage of reference terms
  const coverageRatio = matched.length / Math.max(1, refSet.size);
  
  // Blend: 60% match ratio, 40% coverage
  const score = Math.min(100, Math.round((matchRatio * 0.6 + coverageRatio * 0.4) * 100));
  
  return { score, matched, total: refSet.size };
}

/**
 * Signal 2: Keyword overlap with current period target (0-100)
 */
function scoreTargetOverlap(progressTokens, targetTokens) {
  if (targetTokens.length === 0) return { score: 50, reason: null }; // No target set = neutral
  return scoreKeywordOverlap(progressTokens, targetTokens);
}

/**
 * Signal 3: Bigram matching — catches multi-word technical terms (0-100)
 */
function scoreBigramMatch(progressTokens, referenceTokens) {
  const progressBigrams = getBigrams(progressTokens);
  const referenceBigrams = new Set(getBigrams(referenceTokens));
  
  if (referenceBigrams.size === 0 || progressBigrams.length === 0) return { score: 50 };
  
  const matchedBigrams = progressBigrams.filter(b => referenceBigrams.has(b));
  const ratio = matchedBigrams.length / Math.max(1, referenceBigrams.size);
  
  return { score: Math.min(100, Math.round(ratio * 150)) }; // Slightly boosted since bigrams are harder to match
}

/**
 * Signal 4: Gibberish detection (0-100, where 100 = clean text, 0 = gibberish)
 */
function scoreGibberish(text) {
  if (!text || text.trim().length === 0) return { score: 0, reasons: ['Empty submission'] };
  
  const reasons = [];
  let penalty = 0;
  
  const cleanText = text.trim();
  
  // Check 1: excessive uppercase ratio (ignoring single words)
  const words = cleanText.split(/\s+/);
  if (words.length > 1) {
    const uppercaseChars = (cleanText.match(/[A-Z]/g) || []).length;
    const letterChars = (cleanText.match(/[a-zA-Z]/g) || []).length;
    if (letterChars > 0 && uppercaseChars / letterChars > 0.6) {
      penalty += 40;
      reasons.push('Excessive uppercase characters detected');
    }
  }
  
  // Check 2: keyboard-mash / consonant-heavy "words"
  const vowels = new Set(['a', 'e', 'i', 'o', 'u']);
  let gibberishWordCount = 0;
  words.forEach(word => {
    const lowerWord = word.toLowerCase().replace(/[^a-z]/g, '');
    if (lowerWord.length < 4) return;
    const vowelCount = [...lowerWord].filter(c => vowels.has(c)).length;
    const consonantRatio = 1 - (vowelCount / lowerWord.length);
    if (consonantRatio > 0.75 && lowerWord.length > 5) {
      gibberishWordCount++;
    }
  });
  
  if (gibberishWordCount > 0) {
    const gibberishRatio = gibberishWordCount / Math.max(1, words.length);
    if (gibberishRatio > 0.3) {
      penalty += 50;
      reasons.push('Text contains keyboard-mash or random character sequences');
    } else if (gibberishRatio > 0.1) {
      penalty += 20;
      reasons.push('Some words appear to be random characters');
    }
  }
  
  // Check 3: repeated character sequences (e.g., "aaaaaaa", "ababab")
  if (/(.)\1{4,}/.test(cleanText)) {
    penalty += 30;
    reasons.push('Repeated character sequences detected');
  }
  
  // Check 4: very long "words" with no spaces (likely keyboard spam)
  const longGarbage = words.filter(w => w.length > 20 && !/^https?:\/\//.test(w));
  if (longGarbage.length > 0) {
    penalty += 30;
    reasons.push('Unusually long character sequences detected');
  }
  
  return { score: Math.max(0, 100 - penalty), reasons };
}

/**
 * Signal 5: Minimum effort check (0-100)
 */
function scoreEffort(text) {
  if (!text || text.trim().length === 0) return { score: 0, reasons: ['Empty submission'] };
  
  const reasons = [];
  const cleanText = text.trim();
  
  // Just a dash or trivial input
  if (cleanText === '-' || cleanText === '.' || cleanText === 'nil' || cleanText === 'none' || cleanText === 'n/a') {
    return { score: 0, reasons: ['Submission is just a placeholder character'] };
  }
  
  const tokens = tokenize(cleanText);
  
  // Less than 3 meaningful words
  if (tokens.length < 3) {
    return { score: Math.min(30, tokens.length * 10), reasons: ['Very few meaningful words — please describe what you actually did'] };
  }
  
  // 3-5 words: low effort
  if (tokens.length < 5) {
    reasons.push('Submission is quite brief — consider adding more details');
    return { score: 50, reasons };
  }
  
  // 5-10 words: decent
  if (tokens.length < 10) {
    return { score: 75, reasons: [] };
  }
  
  // 10+ words: good effort
  return { score: 100, reasons: [] };
}

/**
 * Signal 6: Duplicate detection (0-100, where 100 = unique, 0 = exact copy)
 */
function scoreDuplicate(progressText, previousSubmissions) {
  if (!previousSubmissions || previousSubmissions.length === 0) return { score: 100, reasons: [] };
  
  const normalizedNew = progressText.toLowerCase().trim().replace(/\s+/g, ' ');
  
  for (const prev of previousSubmissions) {
    const normalizedPrev = prev.text.toLowerCase().trim().replace(/\s+/g, ' ');
    
    // Exact duplicate
    if (normalizedNew === normalizedPrev) {
      return { score: 0, reasons: [`This is identical to your Day ${prev.day} submission`] };
    }
    
    // Near duplicate: check token overlap
    const newTokens = tokenize(progressText);
    const prevTokens = tokenize(prev.text);
    
    if (newTokens.length > 3 && prevTokens.length > 3) {
      const newSet = new Set(newTokens);
      const prevSet = new Set(prevTokens);
      const intersection = [...newSet].filter(t => prevSet.has(t));
      const union = new Set([...newSet, ...prevSet]);
      const jaccard = intersection.length / Math.max(1, union.size);
      
      if (jaccard > 0.85) {
        return { score: 10, reasons: [`This is very similar to your Day ${prev.day} submission`] };
      }
      if (jaccard > 0.7) {
        return { score: 40, reasons: [`This overlaps significantly with your Day ${prev.day} submission`] };
      }
    }
  }
  
  return { score: 100, reasons: [] };
}

/**
 * Collect all previous progress submissions for duplicate detection
 */
function collectPreviousSubmissions(periods, currentPeriod, currentDay) {
  const submissions = [];
  Object.entries(periods || {}).forEach(([periodKey, periodData]) => {
    if (periodKey === '0') return; // Skip Week 0
    const days = periodData.days || {};
    Object.entries(days).forEach(([dayKey, dayData]) => {
      // Skip the current day being submitted
      if (parseInt(periodKey) === currentPeriod && parseInt(dayKey) === currentDay) return;
      if (dayData.progress && dayData.progress.trim() && dayData.progress.trim() !== '-') {
        submissions.push({ day: parseInt(dayKey), period: parseInt(periodKey), text: dayData.progress });
      }
    });
  });
  return submissions;
}

// ── Signal weights ──
const WEIGHTS = {
  keywordOverlap: 0.25,
  targetOverlap: 0.25,
  bigramMatch: 0.10,
  gibberish: 0.15,
  effort: 0.10,
  duplicate: 0.15
};

/**
 * Main relevance check — returns overall score, level, and reasons
 * 
 * @param {string} progressText - The daily progress text being submitted
 * @param {object} context - The intern's project context
 * @param {string} context.projectSummary - Week 0 project summary
 * @param {string} context.projectTitle - Week 0 project title
 * @param {string} context.currentTarget - Current period/week target
 * @param {string[]} context.allTargets - All period targets
 * @param {object} context.periods - All periods data (for duplicate detection)
 * @param {number} context.currentPeriod - Current period number
 * @param {number} context.currentDay - Current day number
 * @returns {{ score: number, level: string, reasons: string[], details: object }}
 */
export function checkRelevance(progressText, context = {}) {
  const {
    projectSummary = '',
    projectTitle = '',
    currentTarget = '',
    allTargets = [],
    periods = {},
    currentPeriod = 0,
    currentDay = 0
  } = context;

  // Build the full reference text (summary + title + all targets)
  const fullReference = [projectTitle, projectSummary, ...allTargets].filter(Boolean).join(' ');
  const referenceTokens = tokenize(fullReference);
  const targetTokens = tokenize(currentTarget);
  const progressTokens = tokenize(progressText);

  // Run all 6 signals
  const keywordResult = scoreKeywordOverlap(progressTokens, referenceTokens);
  const targetResult = scoreTargetOverlap(progressTokens, targetTokens);
  const bigramResult = scoreBigramMatch(progressTokens, referenceTokens);
  const gibberishResult = scoreGibberish(progressText);
  const effortResult = scoreEffort(progressText);
  
  const previousSubmissions = collectPreviousSubmissions(periods, currentPeriod, currentDay);
  const duplicateResult = scoreDuplicate(progressText, previousSubmissions);

  // Weighted average
  const weightedScore = Math.round(
    keywordResult.score * WEIGHTS.keywordOverlap +
    targetResult.score * WEIGHTS.targetOverlap +
    bigramResult.score * WEIGHTS.bigramMatch +
    gibberishResult.score * WEIGHTS.gibberish +
    effortResult.score * WEIGHTS.effort +
    duplicateResult.score * WEIGHTS.duplicate
  );

  // Collect all reasons
  const reasons = [];
  
  if (keywordResult.score < 30 && referenceTokens.length > 0) {
    reasons.push("Your progress doesn't mention any terms related to your project summary");
  } else if (keywordResult.score < 50 && referenceTokens.length > 0) {
    reasons.push("Only a few words in your progress relate to your project");
  }
  
  if (targetResult.score < 30 && targetTokens.length > 0) {
    reasons.push(`Your progress doesn't seem related to this week's target`);
  }
  
  reasons.push(...gibberishResult.reasons);
  reasons.push(...effortResult.reasons);
  reasons.push(...duplicateResult.reasons);

  // Determine level
  let level;
  if (weightedScore >= 70) level = 'high';
  else if (weightedScore >= 40) level = 'medium';
  else if (weightedScore >= 20) level = 'low';
  else level = 'irrelevant';

  // Hard overrides: certain signals should force low scores regardless
  // If gibberish is severe, cap the overall score
  if (gibberishResult.score <= 20) {
    return {
      score: Math.min(weightedScore, 15),
      level: 'irrelevant',
      reasons: reasons.length > 0 ? reasons : ['This submission appears to contain random or meaningless text'],
      details: { keywordResult, targetResult, bigramResult, gibberishResult, effortResult, duplicateResult }
    };
  }
  
  // If effort is zero (dash, nil, empty), cap score
  if (effortResult.score === 0) {
    return {
      score: Math.min(weightedScore, 10),
      level: 'irrelevant',
      reasons: reasons.length > 0 ? reasons : ['This submission is empty or a placeholder'],
      details: { keywordResult, targetResult, bigramResult, gibberishResult, effortResult, duplicateResult }
    };
  }

  // If exact duplicate, cap score
  if (duplicateResult.score === 0) {
    return {
      score: Math.min(weightedScore, 15),
      level: 'irrelevant',
      reasons,
      details: { keywordResult, targetResult, bigramResult, gibberishResult, effortResult, duplicateResult }
    };
  }

  return {
    score: weightedScore,
    level,
    reasons,
    details: { keywordResult, targetResult, bigramResult, gibberishResult, effortResult, duplicateResult }
  };
}

/**
 * Get the badge info for a relevance score (for display)
 */
export function getRelevanceBadge(score) {
  if (score === null || score === undefined) return null;
  if (score >= 70) return { label: 'Relevant', color: '#059669', bg: '#ecfdf5', icon: '✓' };
  if (score >= 40) return { label: 'Partially Relevant', color: '#d97706', bg: '#fffbeb', icon: '~' };
  return { label: 'Low Relevance', color: '#dc2626', bg: '#fef2f2', icon: '!' };
}
