import modelData from '../data/model.json';

const stopWords = new Set(["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "with", "of", "is"]);

const tokenize = (text) => {
    return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
};

export const predictProgress = (summaryText, newProgressText, daysSubmitted = 0, totalDays = 0) => {
    if (!summaryText || !newProgressText) return 0;
    
    // We combine the Week 0 summary and the current progress to form the context it was trained on
    const combinedText = summaryText + " " + newProgressText;
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

    // Check for lazy or blank inputs!
    const progressTokensArr = tokenize(newProgressText);
    const expectedWordsPerDay = 5; 
    let lazinessPenalty = 1.0;
    
    if (daysSubmitted > 0) {
        const expectedTotalWords = daysSubmitted * expectedWordsPerDay;
        if (progressTokensArr.length < expectedTotalWords) {
            lazinessPenalty = progressTokensArr.length / expectedTotalWords;
        }
    }

    // Strict Relevance Check (Garbage Filter)
    // Try to see if any words in the progress actually match the project summary/targets.
    const summaryTokens = new Set(tokenize(summaryText));
    let matchingTokens = 0;
    progressTokensArr.forEach(token => {
        if (summaryTokens.has(token)) matchingTokens++;
    });

    // If they typed a lot but practically ZERO words match their project summary, they are just typing garbage.
    // E.g. "buffalo shit i gave garbage value" shares 0 words with "React database dashboard"
    if (progressTokensArr.length > 5 && summaryTokens.size > 0 && matchingTokens === 0) {
        lazinessPenalty = 0.0; // Completely invalidate the chronological time progress
        mlPct = 0; // Invalidate the ML text score
    }

    // Blend AI text analysis (20%) with chronological time tracking (80%) 
    let finalPct = Math.round((mlPct * 0.2) + ((timePct * lazinessPenalty) * 0.8));
    
    // Absolute realism constraint: Users shouldn't be told they are 30% done on Day 1
    // The AI prediction can bounce up/down, but shouldn't exceed their timeline heavily
    if (finalPct > timePct + 5) finalPct = timePct + 5;
    
    if (finalPct < 0) finalPct = 0;
    if (finalPct > 100) finalPct = 100;
    
    return finalPct;
};
