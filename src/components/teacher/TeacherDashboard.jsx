import { useState } from 'react';
import { BarChart3, Calendar, CheckCircle, Download, LogOut, Upload, Users, Sparkles } from 'lucide-react';
import { calculateDayNumber, getPeriodLabel, getPeriodLength } from '../../utils/periods.js';
import { predictProgress } from '../../utils/ProgressPredictor.js';
import * as XLSX from 'xlsx';

const getAiPredictionScore = (intern) => {
  const dayNumber = calculateDayNumber(intern.createdDate);
  const summary = intern.periods?.[0]?.summary || intern.periods?.[0]?.projectTitle || "";
  let allProgressText = "";
  Object.values(intern.periods || {}).forEach(period => {
    if (period.days) {
      Object.values(period.days).forEach(day => {
        if (day.progress) allProgressText += day.progress + " ";
      });
    }
  });
  
  try {
    const elapsedDays = Math.min(dayNumber || 1, intern.totalDays);
    return predictProgress(summary, allProgressText, elapsedDays, intern.totalDays);
  } catch (err) {
    console.error("Failed to analyze progress:", err);
    return 0;
  }
};

export function TeacherDashboard({ interns, onUpdateIntern, onLogout, userName, userEmail }) {
  const [selectedIntern, setSelectedIntern] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(1);
  const [comments, setComments] = useState({});
  const [aiAnalysis, setAiAnalysis] = useState(null);

  const handleCommentSubmit = (internId, period, day) => {
    const comment = comments[`${internId}-${period}-${day}`];
    if (!comment?.trim()) return;

    const intern = interns.find((i) => i.id === internId);
    const updatedIntern = {
      ...intern,
      periods: {
        ...intern.periods,
        [period]: {
          ...intern.periods[period],
          days: {
            ...intern.periods[period].days,
            [day]: {
              ...intern.periods[period].days[day],
              comment: comment,
            },
          },
        },
      },
    };
    onUpdateIntern(updatedIntern);
    setComments({ ...comments, [`${internId}-${period}-${day}`]: '' });
  };

  if (selectedIntern) {
    const intern = interns.find((i) => i.id === selectedIntern);
    const periodLength = getPeriodLength(intern.totalDays);
    const totalPeriods = Math.ceil(intern.totalDays / periodLength);
    const currentPeriodData = intern.periods?.[selectedPeriod] || { target: '', days: {} };

    const periodStart = (selectedPeriod - 1) * periodLength + 1;
    const periodEnd = Math.min(selectedPeriod * periodLength, intern.totalDays);

    const dayNumber = calculateDayNumber(intern.createdDate);
    const expectedSubmissions = Math.min(dayNumber, intern.totalDays || 1) + 1;
    const week0Data = intern.periods?.[0] || {};
    const hasWeek0Complete = Boolean(week0Data.projectTitle && week0Data.summary);
    const totalDaysWithProgress = (hasWeek0Complete ? 1 : 0) + Object.values(intern.periods || {}).reduce((acc, period) => {
      if (period && typeof period === 'object' && period.days) return acc + Object.keys(period.days).length;
      return acc;
    }, 0);

    return (
      <div className="teacher-detail-view">
        <div className="top-bar">
          <div className="user-info">
            <span className="user-name">{userName}</span>
            <span className="user-email">{userEmail}</span>
          </div>
          <button className="btn-logout" onClick={onLogout}>
            <LogOut size={18} />
            Logout
          </button>
        </div>

        <div className="detail-header">
          <button className="btn-back" onClick={() => { setSelectedIntern(null); setAiAnalysis(null); }}>
            ← Back to All Interns
          </button>
          <h1>{intern.name}</h1>
        </div>

        <div className="intern-info-card">
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">College:</span>
              <span className="info-value">{intern.college}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Email:</span>
              <span className="info-value">{intern.email}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Current Day:</span>
              <span className="info-value">
                {dayNumber} of {intern.totalDays}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Attendance:</span>
              <span className="info-value">
                {totalDaysWithProgress} submissions ({Math.min(100, Math.round((totalDaysWithProgress / expectedSubmissions) * 100))}%)
              </span>
            </div>
          </div>
        </div>

        <div className="ai-summary-card" style={{ marginTop: '20px', marginBottom: '20px', padding: '24px', background: 'linear-gradient(135deg, #a777e3, #6e8efb)', borderRadius: '16px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 8px 24px rgba(110, 142, 251, 0.25)' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '22px', display: 'flex', alignItems: 'center', gap: '8px' }}>✨ AI Progress Prediction</h3>
            <p style={{ margin: '8px 0 0 0', opacity: 0.9, fontSize: '15px' }}>Estimated completion percentage based on all submitted progress.</p>
          </div>
          <div style={{ textAlign: 'right', background: 'rgba(255,255,255,0.15)', padding: '16px 24px', borderRadius: '12px' }}>
            <div style={{ fontSize: '36px', fontWeight: 'bold', lineHeight: '1' }}>{getAiPredictionScore(intern)}%</div>
            <div style={{ fontSize: '14px', opacity: 0.9, marginTop: '4px' }}>Estimated Complete</div>
          </div>
        </div>

        <div className="period-selector-teacher">
          <label>View Period:</label>
          <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(parseInt(e.target.value))}>
            {Array.from({ length: totalPeriods }, (_, i) => i + 1).map((p) => (
              <option key={p} value={p}>
                {getPeriodLabel(p, intern.totalDays)}
              </option>
            ))}
          </select>
        </div>

        {currentPeriodData.target && (
          <div className="target-display-teacher">
            <h3>{getPeriodLabel(selectedPeriod, intern.totalDays)} Target</h3>
            <p>{currentPeriodData.target}</p>
          </div>
        )}

        <div className="progress-table">
          <table>
            <thead>
              <tr>
                <th>Day</th>
                <th>Progress Submitted</th>
                <th>Files</th>
                <th>Your Feedback</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: periodEnd - periodStart + 1 }, (_, i) => periodStart + i).map((day) => {
                const dayData = currentPeriodData.days?.[day];
                const commentKey = `${intern.id}-${selectedPeriod}-${day}`;

                return (
                  <tr key={day} className={dayData ? 'has-progress' : 'no-progress'}>
                    <td className="day-cell">
                      <strong>Day {day}</strong>
                      {dayData && <CheckCircle size={14} className="check-small" />}
                    </td>
                    <td className="progress-cell">
                      {dayData?.progress ? <p>{dayData.progress}</p> : <span className="no-submission">No submission yet</span>}
                    </td>
                    <td className="file-cell">
                      {dayData?.file && (
                        <a
                          className="file-badge"
                          href={dayData.file.url}
                          download={dayData.file.name}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Upload size={12} />
                          {dayData.file.name}
                        </a>
                      )}
                    </td>
                    <td className="comment-cell">
                      {dayData && (
                        <div className="comment-input-group">
                          <textarea
                            value={
                              comments[commentKey] !== undefined
                                ? comments[commentKey]
                                : dayData.comment || ''
                            }
                            onChange={(e) => setComments({ ...comments, [commentKey]: e.target.value })}
                            placeholder="Add feedback for this day..."
                            rows={2}
                          />
                          <button
                            className="btn-small btn-primary"
                            onClick={() => handleCommentSubmit(intern.id, selectedPeriod, day)}
                            disabled={
                              comments[commentKey] === undefined ||
                              comments[commentKey] === (dayData.comment || '')
                            }
                          >
                            {dayData.comment ? 'Update' : 'Add'} Feedback
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="teacher-dashboard">
      <div className="top-bar">
        <div className="user-info">
          <span className="user-name">{userName}</span>
          <span className="user-email">{userEmail}</span>
        </div>
        <button className="btn-logout" onClick={onLogout}>
          <LogOut size={18} />
          Logout
        </button>
      </div>

      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <h1>Faculty Dashboard</h1>
          <p>Anna University Internship Monitoring</p>
        </div>
        {interns.length > 0 && (
          <button
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', fontSize: '15px', whiteSpace: 'nowrap' }}
            onClick={() => {
              const wb = XLSX.utils.book_new();
              interns.forEach(i => {
                const profileData = [
                  [`${i.name || 'Student'} - Profile`],
                  [],
                  ['Field', 'Details'],
                  ['Email', i.email || ''],
                  ['College', i.college || ''],
                  ['Department', i.department || ''],
                  ['Supervisor', i.supervisor || ''],
                  ['Total Days', i.totalDays || ''],
                  ['Start Date', i.createdDate || ''],
                  ['Submissions', Object.values(i.periods||{}).reduce((a,p)=>a+Object.keys(p.days||{}).length,0)],
                  ['Project Title', i.periods?.[0]?.projectTitle || ''],
                  ['Project Summary', i.periods?.[0]?.summary || ''],
                  [],
                  ['Period/Week', 'Day', 'Progress', 'Faculty Feedback']
                ];
                Object.entries(i.periods||{}).forEach(([pk,pd]) => {
                  if(pk==='0') return;
                  Object.entries(pd.days||{}).forEach(([dk,dd]) => {
                    profileData.push([`Week ${pk}`, `Day ${dk}`, dd.progress||'', dd.comment||'']);
                  });
                });
                const ws = XLSX.utils.aoa_to_sheet(profileData);
                ws['!cols'] = [{wch:20},{wch:35},{wch:40},{wch:30}];
                const sheetName = (i.name || i.email || 'Student').substring(0,31);
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
              });
              const wbout = XLSX.write(wb, {bookType:'xlsx', type:'array'});
              const blob = new Blob([wbout], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `Intern_Progress_${new Date().toISOString().split('T')[0]}.xlsx`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
          >
            <Download size={18} />
            Download Excel
          </button>
        )}
      </div>

      {interns.length === 0 ? (
        <div className="empty-state">
          <Users size={64} />
          <h2>No Interns Yet</h2>
          <p>Interns will appear here once they create their profiles</p>
        </div>
      ) : (
        <>
          <div className="overview-stats">
            <div className="overview-card">
              <Users size={28} />
              <div>
                <div className="overview-value">{interns.length}</div>
                <div className="overview-label">Total Interns</div>
              </div>
            </div>
            <div className="overview-card">
              <BarChart3 size={28} />
              <div>
                <div className="overview-value">
                  {(
                    (interns.reduce((acc, i) => {
                      const dayNum = calculateDayNumber(i.createdDate);
                      const expected = Math.min(dayNum, i.totalDays || 1) + 1;
                      const week0Data = i.periods?.[0] || {};
                      const hasWeek0Complete = Boolean(week0Data.projectTitle && week0Data.summary);
                      const progress = (hasWeek0Complete ? 1 : 0) + Object.values(i.periods || {}).reduce((a, p) => {
                        if (p && typeof p === 'object' && p.days) return a + Object.keys(p.days).length;
                        return a;
                      }, 0);
                      return acc + Math.min(1, progress / expected);
                    }, 0) /
                      interns.length) *
                    100
                  ).toFixed(0)}
                  %
                </div>
                <div className="overview-label">Avg. Attendance</div>
              </div>
            </div>
          </div>

          <div className="interns-grid">
            {interns.map((intern) => {
              const dayNumber = calculateDayNumber(intern.createdDate);
              const expectedSubmissions = Math.min(dayNumber, intern.totalDays || 1) + 1;
              const week0Data = intern.periods?.[0] || {};
              const hasWeek0Complete = Boolean(week0Data.projectTitle && week0Data.summary);
              const totalDaysWithProgress = (hasWeek0Complete ? 1 : 0) + Object.values(intern.periods || {}).reduce((acc, period) => {
                if (period && typeof period === 'object' && period.days) return acc + Object.keys(period.days).length;
                return acc;
              }, 0);
              const attendanceRate = Math.min(100, Math.round((totalDaysWithProgress / expectedSubmissions) * 100)).toString();
              const aiScore = getAiPredictionScore(intern);

              return (
                <div
                  key={intern.id}
                  className="intern-card"
                  onClick={() => { setSelectedIntern(intern.id); setAiAnalysis(null); }}
                >
                  <div className="intern-card-header">
                    <h3>{intern.name}</h3>
                    <span className="day-badge-small">Day {dayNumber}</span>
                  </div>
                  <div className="intern-card-body">
                    <p className="college-name">{intern.college}</p>
                    <div className="intern-stats">
                      <div className="intern-stat">
                        <Calendar size={14} />
                        <span>{intern.totalDays} days total</span>
                      </div>
                      <div className="intern-stat">
                        <CheckCircle size={14} />
                        <span>{totalDaysWithProgress} submissions</span>
                      </div>

                      <div style={{ marginTop: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#a777e3', fontWeight: '600', marginBottom: '4px' }}>
                          <Sparkles size={14} /> AI Predicted Progress
                        </div>
                        <div className="attendance-bar" style={{ background: '#f5f0fb' }}>
                          <div className="attendance-fill" style={{ width: `${aiScore}%`, background: 'linear-gradient(90deg, #a777e3, #6e8efb)' }}></div>
                        </div>
                        <span className="attendance-percent" style={{ color: '#666' }}>{aiScore}% complete</span>
                      </div>
                    </div>
                  </div>
                  <div className="intern-card-footer">
                    <button className="btn-view">View Details →</button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}


