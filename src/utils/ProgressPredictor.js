import modelData from '../data/model.json';

const stopWords = new Set(["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "with", "of", "is"]);

const tokenize = (text) => {
    return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
};

/**
 * Detect gibberish words (keyboard-mash, random characters)
 * Returns a ratio of gibberish words to total substantial words (0 = clean, 1 = all gibberish)
 */
const getGibberishRatio = (text) => {
    const vowels = new Set(['a', 'e', 'i', 'o', 'u']);
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    if (words.length === 0) return 0;
    
    let gibberishCount = 0;
    for (const word of words) {
        const alphaChars = word.replace(/[^a-z]/g, '');
        if (alphaChars.length < 4) continue;
        const vowelCount = [...alphaChars].filter(c => vowels.has(c)).length;
        const consonantRatio = 1 - (vowelCount / alphaChars.length);
        // High consonant ratio + long word = likely gibberish
        if (consonantRatio > 0.75 && alphaChars.length > 5) {
            gibberishCount++;
        }
    }
    return gibberishCount / Math.max(1, words.length);
};

/**
 * Build enriched reference text from all available project context
 */
const buildFullReference = (summaryText, allTargets = []) => {
    const parts = [summaryText, ...allTargets].filter(Boolean);
    return parts.join(' ');
};

export const predictProgress = (summaryText, newProgressText, daysSubmitted = 0, totalDays = 0, allTargets = []) => {
    if (!summaryText || !newProgressText) return 0;
    
    // ── Gibberish filter ──
    const gibberishRatio = getGibberishRatio(newProgressText);
    if (gibberishRatio > 0.4) {
        // If > 40% of words are gibberish, return near-zero
        return Math.max(0, Math.round((daysSubmitted / Math.max(1, totalDays)) * 100 * 0.1));
    }
    
    // Build enriched reference from summary + all period targets
    const fullReference = buildFullReference(summaryText, allTargets);
    
    // We combine the full reference and the current progress to form the context
    const combinedText = fullReference + " " + newProgressText;
    const tokens = tokenize(combinedText);
    
    // Term Frequency
    const tf = {};
    tokens.forEach(t => { tf[t] = (tf[t] || 0) + 1; });
    
    // Compute X vector dot product with model weights
    let pred = modelData.bias;
    let matchedKeywords = 0;
    
    modelData.vocab.forEach((w, i) => {
        if(tf[w]) {
            const tfidf = (tf[w] / tokens.length) * modelData.idf[w];
            pred += modelData.weights[i] * tfidf;
            matchedKeywords++;
        }
    });
    
    let mlPct = Math.round(pred);
    if (mlPct < 0) mlPct = 0;
    
    let timePct = 0;
    if (totalDays > 0) {
        timePct = Math.round((daysSubmitted / totalDays) * 100);
    } else {
        timePct = mlPct;
    }
    
    // If the ML model found literally no relevant internship terms, 
    // it just outputs its mathematical bias/intercept. Ignore it.
    if (matchedKeywords === 0) return timePct;

    // ── Strict Relevance Check (Enhanced) ──
    const progressTokensArr = tokenize(newProgressText);
    
    // Build reference token set from BOTH summary AND all targets
    const referenceTokens = new Set(tokenize(fullReference));
    
    let matchingTokens = 0;
    progressTokensArr.forEach(token => {
        if (referenceTokens.has(token)) matchingTokens++;
    });

    // ── Progressive laziness penalty ──
    // Day 1 is lenient, but by Day 15+ we expect more detail
    const expectedWordsPerDay = Math.max(3, Math.min(8, 3 + Math.floor(daysSubmitted / 5)));
    let lazinessPenalty = 1.0;
    
    if (daysSubmitted > 0) {
        const expectedTotalWords = daysSubmitted * expectedWordsPerDay;
        if (progressTokensArr.length < expectedTotalWords) {
            lazinessPenalty = Math.max(0.1, progressTokensArr.length / expectedTotalWords);
        }
    }

    // If they typed a lot but practically ZERO words match their project context, they are typing garbage
    if (progressTokensArr.length > 5 && referenceTokens.size > 0 && matchingTokens === 0) {
        lazinessPenalty = 0.0;
        mlPct = 0;
    }
    
    // Partial gibberish penalty (some gibberish words mixed with real content)
    if (gibberishRatio > 0.1) {
        lazinessPenalty *= (1 - gibberishRatio);
    }

    // Blend AI text analysis (20%) with chronological time tracking (80%) 
    let finalPct = Math.round((mlPct * 0.2) + ((timePct * lazinessPenalty) * 0.8));
    
    // Absolute realism constraint: Users shouldn't be told they are 30% done on Day 1
    if (finalPct > timePct + 5) finalPct = timePct + 5;
    
    if (finalPct < 0) finalPct = 0;
    if (finalPct > 100) finalPct = 100;
    
    return finalPct;
};
