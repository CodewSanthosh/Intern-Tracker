import fs from 'fs';

try {
// 1. Read Dataset
const csv = fs.readFileSync('progress_dataset.csv', 'utf-8');
const lines = csv.split('\n').filter(l => l.trim() !== '');
const header = lines.shift(); // Remove header

const docs = [];
const Y = [];

lines.forEach(line => {
    // Basic CSV parse matching "Summary","Progress",Pct
    const match = line.match(/"([^"]+)","([^"]+)",(\d+)/);
    if(match) {
        docs.push(match[1] + " " + match[2]);
        Y.push(parseFloat(match[3]));
    }
});

console.log(`Loaded ${docs.length} valid samples from dataset.`);

// 2. Tokenize and Build Vocabulary
const stopWords = new Set(["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "with", "of", "is"]);
const tokenize = (text) => {
    return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
};

const docTokens = docs.map(tokenize);

const df = {}; // Document frequency
docTokens.forEach(tokens => {
    const uniqueTokens = [...new Set(tokens)];
    uniqueTokens.forEach(t => {
        df[t] = (df[t] || 0) + 1;
    });
});

// Filter rare words and compute IDF
const vocab = Object.keys(df).filter(w => df[w] > 2).sort();
const idf = {};
const N = docs.length;
vocab.forEach(w => {
    idf[w] = Math.log(N / (1 + df[w]));
});

console.log(`Vocabulary size: ${vocab.length} words.`);

// 3. Compute TF-IDF Vectors
const getTfIdf = (tokens) => {
    const vec = new Array(vocab.length).fill(0);
    const tf = {};
    tokens.forEach(t => { tf[t] = (tf[t] || 0) + 1; });
    vocab.forEach((w, i) => {
        if(tf[w]) {
            vec[i] = (tf[w] / tokens.length) * idf[w];
        }
    });
    return vec;
};

console.log("Vectorizing dataset...");
const X = docTokens.map(getTfIdf);

// 4. Gradient Descent for Linear Regression (Ridge)
// y = X * w + b  --> But percentages are 0-100, so we initialize b to 50 for faster convergence
console.log("Training model (Gradient Descent)...");
let w = new Array(vocab.length).fill(0);
let b = 50; 
const learningRate = 0.5; // Increased learning rate for TF-IDF since features are small
const lambda = 0.01; // Ridge parameter
const epochs = 1000;

for(let epoch=0; epoch < epochs; epoch++) {
    let loss = 0;
    const gradW = new Array(vocab.length).fill(0);
    let gradB = 0;

    for(let i=0; i<N; i++) {
        // predict
        let pred = b;
        for(let j=0; j<vocab.length; j++) pred += w[j] * X[i][j];
        
        const err = pred - Y[i];
        loss += err * err;
        
        // gradients
        gradB += 2 * err;
        for(let j=0; j<vocab.length; j++) {
            gradW[j] += 2 * err * X[i][j] + 2 * lambda * w[j];
        }
    }
    
    // update
    b -= (learningRate / N) * gradB;
    for(let j=0; j<vocab.length; j++) {
        w[j] -= (learningRate / N) * gradW[j];
    }
    
    if(epoch % 200 === 0) {
        console.log(`Epoch ${epoch}, MSE Loss: ${(loss/N).toFixed(2)}`);
    }
}
console.log(`Final Epoch ${epochs} training complete.`);

// 5. Export Model weights
const modelData = {
    vocab: vocab,
    idf: idf,
    weights: w,
    bias: b
};

fs.writeFileSync('model.json', JSON.stringify(modelData));
console.log('Model trained successfully and saved to model.json!');
} catch (e) {
    fs.writeFileSync('error_stack.txt', e.stack || e.message || String(e));
    console.error("Failed!", e);
}
