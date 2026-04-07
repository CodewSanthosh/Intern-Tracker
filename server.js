import fs from 'fs';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { exec } from 'child_process';

const app = express();
const PORT = 3001;
const DB_FILE = path.join(process.cwd(), 'database.json');

app.use(cors());
app.use(express.json({ limit: '50mb' }));

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

// ── AI Semantic Analysis ──
app.post('/api/analyze', (req, res) => {
  const { summary, progress, targets } = req.body;
  if (!summary || !progress) {
    return res.json({ similarity: 0 });
  }

  const escapeShellArg = (arg) => {
    return `"${String(arg).replace(/"/g, '\\"')}"`;
  };

  const pyScript = path.join(process.cwd(), 'ml_model', 'similarity_checker.py');
  // Pass targets as optional 3rd argument for enriched context
  const targetsArg = targets ? ` ${escapeShellArg(targets)}` : '';
  const cmd = `python -u "${pyScript}" ${escapeShellArg(summary)} ${escapeShellArg(progress)}${targetsArg}`;

  exec(cmd, { timeout: 45000 }, (error, stdout, stderr) => {
    if (error && !stdout) {
      console.error('Error running AI model:', error, 'STDERR:', stderr);
      return res.status(500).json({ error: 'AI analysis failed' });
    }
    try {
      // Find the JSON object anywhere in the output using Regex to avoid log spam issues
      const match = stdout.match(/{[\s\S]*?"similarity"[\s\S]*?:[\s\S]*?\d+[\s\S]*?}/);
      if (match) {
        const result = JSON.parse(match[0]);
        res.json(result);
      } else {
        throw new Error('No JSON payload found');
      }
    } catch (e) {
      console.error('Failed to parse AI output:', stdout, stderr);
      res.status(500).json({ error: 'Bad AI output' });
    }
  });
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
