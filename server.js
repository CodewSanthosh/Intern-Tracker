import fs from 'fs';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { pipeline } from '@xenova/transformers';

const app = express();
const PORT = process.env.PORT || 3002;
const DB_FILE = path.join(process.cwd(), 'database.json');

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ── AI Model Initialization ──
console.log('⏳ Preparing AI Model (all-MiniLM-L6-v2)...');
const extractorPromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
  .then(ext => {
    console.log('✅ AI Model loaded and ready for instant analysis!');
    return ext;
  })
  .catch(err => {
    console.error('❌ Failed to load AI model:', err);
    return null;
  });

// ── Save data ──
app.post('/api/save', (req, res) => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (err) {
    console.error('Error saving data:', err);
    res.status(500).json({ error: 'Failed to save data' });
  }
});

// ── Load data ──
app.get('/api/load', (req, res) => {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      res.json(JSON.parse(data));
    } else {
      res.json(null);
    }
  } catch (err) {
    console.error('Error loading data:', err);
    res.json(null);
  }
});

// ── AI Semantic Analysis (Native Node.js) ──
app.post('/api/analyze', async (req, res) => {
  const { summary, progress, totalDays, periodsWithTargets, totalPeriods } = req.body;
  const extractor = await extractorPromise;
  
  if (!summary || !progress || !extractor) {
    console.error('[AI] Missing inputs or model not ready');
    return res.json({ similarity: 0, error: !extractor ? 'AI model failed to load' : null });
  }

  try {
    const total_slots = totalDays || 35;
    console.log(`[AI] Starting analysis for ${total_slots} day slots...`);

    // 1. Decompose targets into tasks (Semicolons or Newlines)
    const tasks = summary.split(/[;\n]/).map(t => t.trim()).filter(t => t.length > 2);
    console.log(`[AI] Tasks found: ${tasks.length}`);
    if (tasks.length === 0) return res.json({ similarity: 0 });

    const progress_list = (Array.isArray(progress) ? progress : [progress]).filter(p => p && p.trim().length > 1);
    console.log(`[AI] Progress items to check: ${progress_list.length}`);
    
    if (progress_list.length === 0) {
      return res.json({ similarity: 0, total_tasks: tasks.length, completed_count: 0, total_slots: total_slots, details: [] });
    }

    // 2. Generate embeddings for all tasks and progress entries
    const allTexts = [...tasks, ...progress_list];
    console.log('[AI] Generating embeddings...');
    const output = await extractor(allTexts, { pooling: 'mean', normalize: true });
    const embeddings = output.tolist();
    console.log('[AI] Embeddings generated successfully.');

    const taskEmbeds = embeddings.slice(0, tasks.length);
    const progressEmbeds = embeddings.slice(tasks.length);

    let completed = 0;
    const details = [];

    const negationRegex = /\b(not|didn'?t|did not|couldn'?t|could not|failed|incomplete|haven'?t)\b/i;

    // 3. For each task, check similarity (Dot Product because vectors are normalized)
    for (let i = 0; i < tasks.length; i++) {
      let best_score = 0;
      for (let j = 0; j < progressEmbeds.length; j++) {
        // DOT PRODUCT = COSINE SIMILARITY for normalized vectors
        let dot = 0;
        const v1 = taskEmbeds[i];
        const v2 = progressEmbeds[j];
        for (let k = 0; k < v1.length; k++) {
          dot += v1[k] * v2[k];
        }
        let score = Math.round(dot * 100);

        // Apply a penalty if the progress string text contains negative language
        if (negationRegex.test(progress_list[j])) {
          score -= 25;
        }

        // REQUIRE a strict keyword overlap (at least 65%) to ensure the user isn't just mentioning one small part of a complex string
        const taskWords = tasks[i].toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 3 && !['with','this','that','from','into','build','create','using'].includes(w));
        const progressLower = progress_list[j].toLowerCase();
        
        if (taskWords.length > 0) {
            const matchedCount = taskWords.filter(w => progressLower.includes(w)).length;
            const matchRatio = matchedCount / taskWords.length;
            
            // If they miss a huge chunk of the concepts, slash the score to ensure it fails
            if (matchRatio < 0.65) {
                score -= 35;
            }
        }

        best_score = Math.max(best_score, score);
      }

      const is_done = best_score >= 68;
      if (is_done) completed++;

      details.push({
        task: tasks[i],
        score: best_score,
        completed: is_done
      });
    }

    // 4. Scale by internship coverage: if only 1 of 5 weeks has targets, cap proportionally
    const taskCompletionRate = completed / tasks.length; // e.g. 3/4 = 0.75
    const coverageRate = (periodsWithTargets && totalPeriods) 
      ? Math.min(1, periodsWithTargets / totalPeriods)  // e.g. 1/5 = 0.2
      : 1;
    const similarity = Math.min(100, Math.round(taskCompletionRate * coverageRate * 100));
    console.log(`[AI] Analysis complete: ${completed}/${tasks.length} tasks matched, coverage ${periodsWithTargets}/${totalPeriods} periods => ${similarity}%`);

    res.json({
      similarity,
      total_tasks: tasks.length,
      completed_count: completed,
      total_slots: total_slots,
      details
    });

  } catch (err) {
    console.error('Error during AI analysis:', err);
    res.status(500).json({ 
      error: 'AI analysis failed', 
      details: err.message,
      stack: err.stack
    });
  }
});

// ── Export Excel (downloads .xls from stored database) ──
app.get('/api/export-excel', (req, res) => {
  try {
    let users = [];
    if (fs.existsSync(DB_FILE)) {
      users = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    }

    const interns = (users || []).filter(u => u.type === 'intern' && u.hasProfile && u.internData);

    // Build Student Profiles rows
    const studentRows = interns.map(u => {
      const d = u.internData;
      const dayNum = calculateDayNumber(d.createdDate);
      const totalSubmissions = Object.values(d.periods || {}).reduce((acc, p) => acc + Object.keys(p.days || {}).length, 0);
      return `<tr>
        <td>${esc(d.name)}</td>
        <td>${esc(d.email || u.email)}</td>
        <td>${esc(d.college)}</td>
        <td>${esc(d.department)}</td>
        <td>${esc(d.supervisor)}</td>
        <td>${d.totalDays || ''}</td>
        <td>${esc(d.createdDate)}</td>
        <td>Day ${dayNum}</td>
        <td>${totalSubmissions}</td>
        <td>${esc(d.periods?.[0]?.projectTitle)}</td>
        <td>${esc(d.periods?.[0]?.summary)}</td>
      </tr>`;
    }).join('');

    // Build Daily Progress rows
    let progressRows = '';
    interns.forEach(u => {
      const d = u.internData;
      Object.entries(d.periods || {}).forEach(([periodKey, periodData]) => {
        if (periodKey === '0') return;
        Object.entries(periodData.days || {}).forEach(([dayKey, dayData]) => {
          progressRows += `<tr>
            <td>${esc(d.name)}</td>
            <td>${esc(d.email || u.email)}</td>
            <td>${esc(periodData.target)}</td>
            <td>Week ${periodKey}</td>
            <td>Day ${dayKey}</td>
            <td>${esc(dayData.progress)}</td>
            <td>${esc(dayData.comment)}</td>
          </tr>`;
        });
      });
    });

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <!--[if gte mso 9]><xml>
          <x:ExcelWorkbook><x:ExcelWorksheets>
            <x:ExcelWorksheet><x:Name>Student Profiles</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet>
            <x:ExcelWorksheet><x:Name>Daily Progress</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet>
          </x:ExcelWorksheets></x:ExcelWorkbook>
        </xml><![endif]-->
        <style>
          th { background-color: #4285f4; color: white; font-weight: bold; padding: 8px; }
          td { padding: 6px; border: 1px solid #ddd; }
          .green th { background-color: #34a853; }
        </style>
      </head>
      <body>
        <table>
          <thead><tr>
            <th>Name</th><th>Email</th><th>College</th><th>Department</th>
            <th>Supervisor</th><th>Total Days</th><th>Start Date</th>
            <th>Current Day</th><th>Submissions</th><th>Project Title</th><th>Project Summary</th>
          </tr></thead>
          <tbody>${studentRows}</tbody>
        </table>
        <br/>
        <table class="green">
          <thead><tr>
            <th>Student Name</th><th>Email</th><th>Period Target</th>
            <th>Period/Week</th><th>Day</th><th>Progress</th><th>Faculty Feedback</th>
          </tr></thead>
          <tbody>${progressRows}</tbody>
        </table>
      </body>
      </html>
    `;

    const filename = `Intern_Progress_${new Date().toISOString().split('T')[0]}.xls`;
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Content-Type', 'application/vnd.ms-excel');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(html);
    console.log(`📊 Excel exported: ${interns.length} students, ${progressRows.split('<tr>').length - 1} progress entries`);

  } catch (err) {
    console.error('Error exporting Excel:', err);
    res.status(500).json({ error: 'Failed to export Excel' });
  }
});

// ── Helpers ──
function esc(val) {
  if (!val) return '';
  return String(val).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, ' ');
}

function calculateDayNumber(createdDate) {
  if (!createdDate) return 1;
  const created = new Date(createdDate);
  const today = new Date();
  return Math.max(1, Math.ceil(Math.abs(today - created) / (1000 * 60 * 60 * 24)));
}

app.listen(PORT, () => {
  console.log(`✅ Backend server running on http://localhost:${PORT}`);
  console.log(`📂 Data file: ${DB_FILE}`);
  console.log(`📊 Excel export: http://localhost:${PORT}/api/export-excel`);
});
