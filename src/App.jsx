import React, { useState, useEffect } from 'react';
import { Upload, ChevronDown, Calendar, Target, CheckCircle, MessageSquare, Users, BarChart3, LogOut, Mail, Lock, User, FileText, Download, Loader, PieChart } from 'lucide-react';
import { extractUncompletedTargets, extractCompletedCount } from './utils/rollover.js';
import { useLocalStorageState } from './hooks/useLocalStorageState.js';
import XLSX from 'xlsx-js-style';

// Utility functions
const calculateDayNumber = (intern) => {
  if (typeof intern === 'string' || intern instanceof Date) {
    // Backwards compatibility for components passing createdDate
    const created = new Date(intern);
    const today = new Date();
    return Math.max(1, Math.ceil(Math.abs(today - created) / (1000 * 60 * 60 * 24)));
  }

  // Self-paced self-advancing day limit
  if (!intern || !intern.periods) return 1;
  let daysSubmitted = 0;
  Object.values(intern.periods).forEach(period => {
    if (period && typeof period === 'object' && period.days) {
      daysSubmitted += Object.values(period.days).filter(d => isMeaningfulProgress(d.progress)).length;
    }
  });
  return Math.max(1, Math.min(daysSubmitted + 1, intern.totalDays || 1));
};

const getPeriodType = (totalDays) => totalDays <= 21 ? '3-day' : 'week';
const getPeriodLength = (totalDays) => totalDays <= 21 ? 3 : 7;

const getCurrentPeriod = (dayNumber, totalDays) => {
  const periodLength = getPeriodLength(totalDays);
  return Math.ceil(dayNumber / periodLength);
};

const getPeriodLabel = (periodNum, totalDays) => {
  if (periodNum === 0) return 'Week 0';
  return totalDays <= 21 ? `Period ${periodNum}` : `Week ${periodNum}`;
};

const getTotalPeriods = (totalDays) => {
  const len = totalDays <= 21 ? 3 : 7;
  return 1 + Math.ceil(totalDays / len);
};

const isMeaningfulProgress = (text) => {
  if (!text) return false;
  const clean = text.trim().replace(/[-_.* \t\n\r]/g, '');
  return clean.length >= 2; // Must have at least 2 alpha-numeric characters
};

// Initial mock data for demo purposes
const INITIAL_DATA = {
  users: [
    {
      id: 'user1',
      email: 'intern@demo.com',
      password: 'demo123',
      type: 'intern',
      hasProfile: true,
      internData: {
        id: '1',
        name: 'Priya Sharma',
        college: 'Anna University - CEG Campus',
        email: 'intern@demo.com',
        totalDays: 45,
        createdDate: '2026-01-15',
        department: 'Computer Science',
        supervisor: 'Dr. Ramanathan',
        periods: {
          1: {
            target: 'Learn React basics and component lifecycle',
            days: {
              1: { progress: 'Completed React tutorial, built first component', file: null, comment: 'Good start! Focus on hooks next.' },
              2: { progress: 'Implemented useState and useEffect hooks', file: null, comment: 'Excellent progress!' },
              3: { progress: 'Built a todo app with local storage', file: null, comment: '' }
            }
          },
          2: {
            target: 'Build a dashboard with data visualization',
            days: {
              8: { progress: 'Set up project structure and routing', file: null, comment: 'Clean architecture!' },
              9: { progress: 'Integrated Chart.js for data visualization', file: null, comment: '' }
            }
          }
        }
      }
    },
    {
      id: 'user2',
      email: 'teacher@demo.com',
      password: 'demo123',
      type: 'teacher',
      name: 'Dr. Ramanathan'
    }
  ]
};

// Login/Signup Component
const AuthScreen = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    userType: 'intern'
  });
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!isLogin) {
      // Signup validation
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
      if (formData.userType === 'teacher' && !formData.name) {
        setError('Please enter your name');
        return;
      }
    }

    onLogin(formData, isLogin);
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-header">
          <h1>Anna University</h1>
          <h2>Internship Tracker</h2>
          <p>{isLogin ? 'Welcome back' : 'Create your account'}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-group">
            <label>
              <Mail size={18} />
              Email Address
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="your.email@annauniv.edu"
            />
          </div>

          <div className="form-group">
            <label>
              <Lock size={18} />
              Password
            </label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Enter your password"
            />
          </div>

          {!isLogin && (
            <>
              <div className="form-group">
                <label>
                  <Lock size={18} />
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Re-enter your password"
                />
              </div>

              <div className="form-group">
                <label>
                  <User size={18} />
                  I am a...
                </label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="userType"
                      value="intern"
                      checked={formData.userType === 'intern'}
                      onChange={(e) => setFormData({ ...formData, userType: e.target.value })}
                    />
                    <span>Intern</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="userType"
                      value="teacher"
                      checked={formData.userType === 'teacher'}
                      onChange={(e) => setFormData({ ...formData, userType: e.target.value })}
                    />
                    <span>Faculty Member</span>
                  </label>
                </div>
              </div>

              {formData.userType === 'teacher' && (
                <div className="form-group">
                  <label>
                    <User size={18} />
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Dr. Your Name"
                  />
                </div>
              )}
            </>
          )}

          <button type="submit" className="btn-primary">
            {isLogin ? 'Login' : 'Create Account'}
          </button>
        </form>

        <div className="auth-toggle">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setFormData({
                email: '',
                password: '',
                confirmPassword: '',
                name: '',
                userType: 'intern'
              });
            }}
            className="toggle-link"
          >
            {isLogin ? 'Sign Up' : 'Login'}
          </button>
        </div>

        <div className="demo-credentials">
          <p><strong>Demo Credentials:</strong></p>
          <p>Intern: intern@demo.com / demo123</p>
          <p>Teacher: teacher@demo.com / demo123</p>
        </div>

        <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button
            type="button"
            className="btn-secondary btn-small"
            style={{ fontSize: '12px', padding: '6px 12px' }}
            onClick={() => {
              const data = localStorage.getItem('anna_univ_users');
              if (data) {
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `anna_university_backup_${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
              } else {
                alert('No stored data to backup yet!');
              }
            }}
          >
            Download Data Backup
          </button>
          <label className="btn-secondary btn-small" style={{ display: 'inline-flex', alignItems: 'center', fontSize: '12px', padding: '6px 12px', cursor: 'pointer', margin: 0 }}>
            Restore Backup
            <input
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    try {
                      const data = JSON.parse(event.target.result);
                      localStorage.setItem('anna_univ_users', JSON.stringify(data));
                      alert('Data restored successfully! The page will now reload.');
                      window.location.reload();
                    } catch (err) {
                      alert('Invalid backup file. Could not restore data.');
                    }
                  };
                  reader.readAsText(file);
                }
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
};

// Intern Profile Setup Component
const InternProfileSetup = ({ onComplete }) => {
  const [formData, setFormData] = useState({
    name: '',
    college: '',
    email: '',
    totalDays: 30,
    department: '',
    supervisor: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const newIntern = {
      id: Date.now().toString(),
      ...formData,
      createdDate: new Date().toISOString().split('T')[0],
      periods: {}
    };
    onComplete(newIntern);
  };

  return (
    <div className="profile-setup">
      <div className="setup-header">
        <h1>Intern Registration</h1>
        <p>Welcome to Anna University Internship Tracking System</p>
      </div>

      <form onSubmit={handleSubmit} className="setup-form">
        <div className="form-grid">
          <div className="form-group">
            <label>Full Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter your full name"
            />
          </div>

          <div className="form-group">
            <label>Email Address *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="your.email@annauniv.edu"
            />
          </div>

          <div className="form-group">
            <label>College/Campus *</label>
            <input
              type="text"
              required
              value={formData.college}
              onChange={(e) => setFormData({ ...formData, college: e.target.value })}
              placeholder="e.g., Anna University - CEG Campus"
            />
          </div>

          <div className="form-group">
            <label>Department</label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              placeholder="e.g., Computer Science"
            />
          </div>

          <div className="form-group">
            <label>Internship Duration (days) *</label>
            <input
              type="number"
              required
              min="7"
              max="365"
              value={formData.totalDays}
              onChange={(e) => setFormData({ ...formData, totalDays: parseInt(e.target.value) })}
            />
            <small>
              {formData.totalDays <= 21
                ? '⚡ Short-term: Progress tracked every 3 days'
                : '📅 Long-term: Progress tracked weekly'}
            </small>
          </div>

          <div className="form-group">
            <label>Faculty Supervisor</label>
            <input
              type="text"
              value={formData.supervisor}
              onChange={(e) => setFormData({ ...formData, supervisor: e.target.value })}
              placeholder="Supervisor name (optional)"
            />
          </div>
        </div>

        <button type="submit" className="btn-primary">
          Start Internship Journey
        </button>
      </form>
    </div>
  );
};

// Intern Dashboard Component
const InternDashboard = ({ intern, onUpdate, onLogout, userEmail }) => {
  const dayNumber = calculateDayNumber(intern);
  const currentPeriod = getCurrentPeriod(dayNumber, intern.totalDays);
  const periodType = getPeriodType(intern.totalDays);
  const periodLength = getPeriodLength(intern.totalDays);

  const periods = intern.periods || {};
  const week0Data = periods[0] || { projectTitle: '', summary: '', files: [], comment: '' };
  const hasWeek0Complete = Boolean(week0Data.projectTitle && week0Data.summary);
  const defaultPeriod = !hasWeek0Complete ? 0 : Math.max(1, Math.min(currentPeriod, getTotalPeriods(intern.totalDays) - 1));

  const [selectedPeriod, setSelectedPeriod] = useState(defaultPeriod);
  const [targetInput, setTargetInput] = useState('');
  const [dailyProgress, setDailyProgress] = useState({});
  const [showTargetInput, setShowTargetInput] = useState(false);
  const [week0Form, setWeek0Form] = useState({
    projectTitle: week0Data.projectTitle || '',
    summary: week0Data.summary || '',
    files: week0Data.files || []
  });
  const [week0FileInput, setWeek0FileInput] = useState(null);
  const [editingWeek0, setEditingWeek0] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [finalSubmission, setFinalSubmission] = useState(
    intern.periods?.final || { completedText: '', csrFile: null, submitted: false }
  );
  const [finalCsrInput, setFinalCsrInput] = useState(null);
  const [showProjectComplete, setShowProjectComplete] = useState(
    intern.periods?.final?.submitted || false
  );

  const currentPeriodData = periods[selectedPeriod] || { target: '', days: {} };

  useEffect(() => {
    if (selectedPeriod > 1) {
      const currentPd = periods[selectedPeriod] || {};
      if (!currentPd.target) {
        const prevPd = periods[selectedPeriod - 1];
        if (prevPd && prevPd.target) {
          const progressList = Object.values(prevPd.days).map(d => d.progress).filter(Boolean);
          const uncompleted = extractUncompletedTargets(prevPd.target, progressList);
          if (uncompleted.length > 0) {
            const initialText = `Rolled over from ${getPeriodLabel(selectedPeriod - 1, intern.totalDays)}: ${uncompleted.join('; ')};`;
            const updatedIntern = {
              ...intern,
              periods: {
                ...periods,
                [selectedPeriod]: {
                  ...currentPd,
                  target: initialText
                }
              }
            };
            onUpdate(updatedIntern);
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod, periods]);
  // Calculate attendance (Week 0 counts as 1, plus daily submissions)
  const totalDaysWithProgress = (hasWeek0Complete ? 1 : 0) + Object.values(periods).reduce((acc, period) => {
    if (period && typeof period === 'object' && period.days) {
      return acc + Object.values(period.days).filter(d => isMeaningfulProgress(d.progress)).length;
    }
    return acc;
  }, 0);

  const periodStart = selectedPeriod === 0 ? 0 : ((selectedPeriod - 1) * periodLength) + 1;
  const periodEnd = selectedPeriod === 0 ? 0 : Math.min(selectedPeriod * periodLength, intern.totalDays);
  const daysInPeriod = selectedPeriod === 0 ? [] : [];
  for (let i = periodStart; i <= periodEnd && selectedPeriod > 0; i++) {
    daysInPeriod.push(i);
  }

  const handleTargetSubmit = () => {
    if (!targetInput.trim()) return;

    const updatedIntern = {
      ...intern,
      periods: {
        ...periods,
        [selectedPeriod]: {
          ...currentPeriodData,
          target: targetInput
        }
      }
    };
    onUpdate(updatedIntern);
    setTargetInput('');
    setShowTargetInput(false);
  };

  const handleInitializeTarget = () => {
    let initialText = '';
    // Check if there are missing targets from the previous period
    if (selectedPeriod > 1 && periods[selectedPeriod - 1]) {
      const prevPeriod = periods[selectedPeriod - 1];
      if (prevPeriod.target && prevPeriod.days) {
        const progressList = Object.values(prevPeriod.days)
          .map(d => d.progress)
          .filter(Boolean);

        const uncompleted = extractUncompletedTargets(prevPeriod.target, progressList);
        if (uncompleted.length > 0) {
          initialText = `Rolled over from ${getPeriodLabel(selectedPeriod - 1, intern.totalDays)}: ${uncompleted.join('; ')};`;
        }
      }
    }
    setTargetInput(initialText);
    setShowTargetInput(true);
  };

  const handleProgressSubmit = (day) => {
    const progress = dailyProgress[day];
    if (!progress?.text?.trim()) return;

    const updatedIntern = {
      ...intern,
      periods: {
        ...periods,
        [selectedPeriod]: {
          ...currentPeriodData,
          days: {
            ...(currentPeriodData.days || {}),
            [day]: {
              progress: progress.text,
              file: progress.file || null,
              comment: currentPeriodData.days?.[day]?.comment || ''
            }
          }
        }
      }
    };
    onUpdate(updatedIntern);
    setDailyProgress({ ...dailyProgress, [day]: { text: '', file: null } });
  };

  const handleFileUpload = (day, e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setDailyProgress({
        ...dailyProgress,
        [day]: {
          ...dailyProgress[day],
          file: { name: file.name, url }
        }
      });
    }
  };

  const handleWeek0Submit = (e) => {
    e.preventDefault();
    if (!week0Form.projectTitle.trim() || !week0Form.summary.trim()) return;
    setEditingWeek0(false);
    const updatedIntern = {
      ...intern,
      periods: {
        ...periods,
        0: {
          projectTitle: week0Form.projectTitle.trim(),
          summary: week0Form.summary.trim(),
          files: week0Form.files,
          comment: week0Data.comment || ''
        }
      }
    };
    onUpdate(updatedIntern);
    setSelectedPeriod(1);
  };

  const handleWeek0FileAdd = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setWeek0Form({
        ...week0Form,
        files: [...week0Form.files, { name: file.name, url }]
      });
    }
    e.target.value = '';
  };

  const handleWeek0FileRemove = (idx) => {
    setWeek0Form({
      ...week0Form,
      files: week0Form.files.filter((_, i) => i !== idx)
    });
  };

  const totalPeriods = getTotalPeriods(intern.totalDays);

  return (
    <div className="intern-dashboard">
      <div className="top-bar">
        <div className="user-info">
          <span className="user-email">{userEmail}</span>
        </div>
        <button className="btn-logout" onClick={onLogout}>
          <LogOut size={18} />
          Logout
        </button>
      </div>

      <div className="dashboard-header">
        <div className="header-content">
          <h1>Welcome back, {intern.name.split(' ')[0]}! 👋</h1>
          <div className="header-meta">
            <span className="meta-item">
              <Calendar size={16} />
              {intern.college}
            </span>
            {intern.department && (
              <span className="meta-item">📚 {intern.department}</span>
            )}
          </div>
        </div>
      </div>



      <div className="stats-grid">
        <div className="stat-card day-stat">
          <div className="stat-icon"><Calendar size={24} /></div>
          <div className="stat-content">
            <div className="stat-label">Current Day</div>
            <div className="stat-value">{dayNumber}</div>
            <div className="stat-subtext">of {intern.totalDays} days</div>
          </div>
        </div>

        <div className="stat-card attendance-stat">
          <div className="stat-icon"><CheckCircle size={24} /></div>
          <div className="stat-content">
            <div className="stat-label">Attendance</div>
            <div className="stat-value">{totalDaysWithProgress}</div>
            <div className="stat-subtext">{Math.min(100, Math.round((totalDaysWithProgress / ((intern.totalDays || 1) + 1)) * 100))}% attendance</div>
          </div>
        </div>

        <div className="stat-card period-stat">
          <div className="stat-icon"><Target size={24} /></div>
          <div className="stat-content">
            <div className="stat-label">Current {periodType === 'week' ? 'Week' : 'Period'}</div>
            <div className="stat-value">{currentPeriod}</div>
            <div className="stat-subtext">of {totalPeriods} total</div>
          </div>
        </div>
      </div>
      <div className="ai-summary-card" style={{ marginTop: '20px', marginBottom: '20px', padding: '24px', background: 'linear-gradient(135deg, #a777e3, #6e8efb)', borderRadius: '16px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 8px 24px rgba(110, 142, 251, 0.25)' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '22px', display: 'flex', alignItems: 'center', gap: '8px' }}>✨ AI Progress Prediction</h3>
          <p style={{ margin: '8px 0 0 0', opacity: 0.9, fontSize: '15px' }}>Get an AI-estimated completion percentage based on all your submitted progress.</p>
        </div>
        {aiAnalysis === null ? (
          <button
            style={{ padding: '14px 28px', background: 'white', color: '#6e8efb', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '15px', cursor: isAnalyzing ? 'wait' : 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', transition: 'transform 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}
            disabled={isAnalyzing}
            onClick={async () => {
              setIsAnalyzing(true);
              let summary = "";
              let periodsWithTargets = 0;
              Object.entries(intern.periods || {}).forEach(([key, period]) => {
                if (key !== "0" && period.target && period.target.trim()) {
                  summary += period.target + "; ";
                  periodsWithTargets++;
                }
              });
              if (!summary.trim()) {
                summary = intern.periods?.[0]?.summary || intern.periods?.[0]?.projectTitle || "";
                periodsWithTargets = 1;
              }
              
              const pLength = getPeriodLength(intern.totalDays);
              const totalPeriodsCount = Math.ceil(intern.totalDays / pLength);

              let allProgressList = [];
              Object.values(intern.periods || {}).forEach(period => {
                if (period.days) {
                  Object.values(period.days).forEach(day => {
                    if (day.progress && day.progress.trim()) {
                      allProgressList.push(day.progress);
                    }
                  });
                }
              });

              try {
                const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3002'}/api/analyze`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    summary,
                    progress: allProgressList,
                    totalDays: intern.totalDays || 35,
                    periodsWithTargets,
                    totalPeriods: totalPeriodsCount
                  })
                });

                if (!res.ok) {
                  const text = await res.text();
                  throw new Error(text.includes('<!DOCTYPE') ? 'Server route not found! Please restart your Node server.' : text);
                }

                const data = await res.json();
                setAiAnalysis(data); // Store the entire object
              } catch (err) {
                alert("AI Server Error: " + err.message);
              } finally {
                setIsAnalyzing(false);
              }
            }}
          >
            {isAnalyzing ? <><Loader size={16} className="lucide-spin" /> Instant Analysis...</> : 'Analyze Now'}
          </button>
        ) : (
          <div style={{ textAlign: 'right', background: 'rgba(255,255,255,0.15)', padding: '16px 24px', borderRadius: '12px', minWidth: '180px' }}>
            <div style={{ fontSize: '36px', fontWeight: 'bold', lineHeight: '1' }}>{aiAnalysis.similarity}%</div>
            <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>AI Estimated Complete</div>
            <button style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.4)', color: 'white', padding: '4px 12px', borderRadius: '6px', marginTop: '12px', cursor: 'pointer', fontSize: '12px', transition: 'all 0.2s' }} onClick={() => setAiAnalysis(null)}>Recalculate</button>
          </div>
        )}
      </div>

      {/* 🎉 100% Completion Celebration Overlay */}
      {aiAnalysis && aiAnalysis.similarity >= 100 && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeInPage 0.6s ease'
        }}>
          <style>{`
            @keyframes fadeInPage { from { opacity: 0; } to { opacity: 1; } }
            @keyframes floatTrophy { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-18px); } }
            @keyframes popIn { 0% { transform: scale(0.5); opacity: 0; } 80% { transform: scale(1.08); } 100% { transform: scale(1); opacity: 1; } }
            @keyframes shimmer { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }
            @keyframes confettiFall {
              0%   { transform: translateY(-40px) rotate(0deg);   opacity: 1; }
              100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
            }
            .confetti-piece {
              position: fixed; top: -20px; width: 10px; height: 14px;
              animation: confettiFall linear infinite;
              border-radius: 2px;
            }
            @media print {
              body * { visibility: hidden; }
              #completion-print-area, #completion-print-area * { visibility: visible; }
              #completion-print-area { position: fixed; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: white !important; }
              .no-print { display: none !important; }
            }
          `}</style>

          {/* Confetti */}
          {[...Array(22)].map((_, i) => (
            <div key={i} className="confetti-piece" style={{
              left: `${(i * 4.5) % 100}%`,
              background: ['#FFD700', '#FF6B6B', '#4ECDC4', '#A29BFE', '#FD79A8', '#55EFC4', '#FDCB6E'][i % 7],
              animationDuration: `${2.2 + (i % 5) * 0.4}s`,
              animationDelay: `${(i * 0.18) % 2}s`,
              transform: `rotate(${i * 17}deg)`
            }} />
          ))}

          <div id="completion-print-area" style={{ textAlign: 'center', padding: '40px', maxWidth: '680px' }}>
            {/* Trophy */}
            <div style={{ fontSize: '96px', animation: 'floatTrophy 2.4s ease-in-out infinite', marginBottom: '16px' }}>🏆</div>

            {/* Headline */}
            <div style={{
              animation: 'popIn 0.7s ease both',
              background: 'linear-gradient(90deg, #FFD700, #FFA500, #FFD700)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              fontSize: '42px', fontWeight: '900', letterSpacing: '-1px', marginBottom: '12px'
            }}>Congratulations! 🎉</div>

            <div style={{ color: 'white', fontSize: '22px', fontWeight: '600', marginBottom: '8px', animation: 'popIn 0.9s ease both' }}>
              {intern.name}
            </div>

            <div style={{
              color: 'rgba(255,255,255,0.85)', fontSize: '17px', lineHeight: '1.7',
              marginBottom: '32px', animation: 'popIn 1.1s ease both'
            }}>
              You have successfully completed your internship!<br />
              <span style={{ color: '#FFD700', fontWeight: '700' }}>100% of your targets</span> were achieved.
            </div>

            {/* Details card */}
            <div style={{
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '16px', padding: '24px 36px', marginBottom: '36px',
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px',
              animation: 'popIn 1.3s ease both'
            }}>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>Intern</div>
              <div style={{ color: 'white', fontWeight: '600', textAlign: 'right' }}>{intern.name}</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>College</div>
              <div style={{ color: 'white', fontWeight: '600', textAlign: 'right' }}>{intern.college}</div>
              {intern.department && <>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>Department</div>
                <div style={{ color: 'white', fontWeight: '600', textAlign: 'right' }}>{intern.department}</div>
              </>}
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>Duration</div>
              <div style={{ color: 'white', fontWeight: '600', textAlign: 'right' }}>{intern.totalDays} Days</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>Completion</div>
              <div style={{ color: '#FFD700', fontWeight: '800', textAlign: 'right', fontSize: '18px' }}>100%</div>
            </div>

            {/* Buttons */}
            <div className="no-print" style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => window.print()}
                style={{
                  padding: '14px 32px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                  color: '#1a1a2e', fontWeight: '800', fontSize: '16px',
                  boxShadow: '0 6px 20px rgba(255,215,0,0.4)', transition: 'transform 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                🖨️ Print Certificate
              </button>
              <button
                onClick={() => setAiAnalysis(null)}
                style={{
                  padding: '14px 32px', borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer',
                  background: 'transparent', color: 'white', fontWeight: '600', fontSize: '16px'
                }}
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="progress-section">
        <div className="section-header">
          <h2>Progress Tracking</h2>
          <div className="period-selector">
            <label>Select Period:</label>
            <div className="dropdown">
              {(() => {
                // ✅ Last week complete = last regular period has ≥1 day with real progress
                const lastPeriod = totalPeriods - 1;
                const lastPeriodData = periods[lastPeriod] || {};
                const lastWeekDone = Object.values(lastPeriodData.days || {}).some(
                  d => d.progress && d.progress.trim().length > 2 && d.progress.trim() !== '-'
                );
                return (
                  <select
                    value={selectedPeriod}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (val === 999 && !lastWeekDone) {
                        alert('⚠️ Please complete the last week before accessing Final Submission.');
                        return;
                      }
                      setSelectedPeriod(val);
                    }}
                  >
                    {Array.from({ length: totalPeriods }, (_, i) => i).map(p => (
                      <option key={p} value={p}>
                        {getPeriodLabel(p, intern.totalDays)}
                      </option>
                    ))}
                    <option value={999} disabled={!lastWeekDone}>
                      {lastWeekDone ? '🎓 Final Submission' : '🔒 Final Submission (complete last week first)'}
                    </option>
                  </select>
                );
              })()}
              <ChevronDown size={18} />
            </div>
          </div>
        </div>

        {selectedPeriod === 999 ? (
          /* ─── FINAL SUBMISSION SECTION ─── */
          (() => {
            // Collect all pending tasks across all weeks
            const allPending = [];
            Object.entries(periods).forEach(([pKey, pData]) => {
              if (!pData || !pData.target) return;
              const progressList = Object.values(pData.days || {}).map(d => d.progress).filter(Boolean);
              const combined = progressList.join(' ').toLowerCase();
              pData.target.split(';').flatMap(s => s.split('\n')).map(s => s.trim()).filter(Boolean).forEach(task => {
                const kws = task.toLowerCase().replace(/[^\w\s]/gi, '').split(/\s+/).filter(w => w.length > 3);
                const matched = kws.some(kw => combined.includes(kw));
                if (!matched) allPending.push(task);
              });
            });

            const isSubmitted = finalSubmission.submitted;

            const handleFinalSubmit = () => {
              if (!finalSubmission.completedText.trim()) {
                alert('Please describe the tasks you completed.');
                return;
              }
              if (!finalSubmission.csrFile) {
                alert('CSR (Project Report) upload is mandatory before submitting.');
                return;
              }
              const updated = { ...finalSubmission, submitted: true };
              setFinalSubmission(updated);
              const updatedIntern = { ...intern, periods: { ...periods, final: updated } };
              onUpdate(updatedIntern);
              setShowProjectComplete(true);
            };

            return (
              <div style={{ padding: '8px 0' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
                  borderRadius: '16px', padding: '32px', marginBottom: '24px',
                  border: '1px solid rgba(110,142,251,0.3)'
                }}>
                  <h3 style={{ color: '#a777e3', fontSize: '20px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    🎓 Final Project Submission
                  </h3>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '28px' }}>
                    Complete this section to finalise your internship. CSR upload is mandatory.
                  </p>

                  {/* Pending Tasks */}
                  {allPending.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ color: '#FF6B6B', fontWeight: '700', fontSize: '14px', display: 'block', marginBottom: '10px' }}>
                        ⚠️ Pending / Incomplete Tasks
                      </label>
                      <div style={{
                        background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.25)',
                        borderRadius: '10px', padding: '14px 18px'
                      }}>
                        {allPending.map((t, i) => (
                          <div key={i} style={{ color: 'rgba(255,255,255,0.75)', fontSize: '13px', padding: '4px 0', borderBottom: i < allPending.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                            • {t}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Completed Tasks Textbox */}
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ color: 'white', fontWeight: '600', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                      ✅ Tasks You Completed *
                    </label>
                    <textarea
                      disabled={isSubmitted}
                      value={finalSubmission.completedText}
                      onChange={e => setFinalSubmission({ ...finalSubmission, completedText: e.target.value })}
                      placeholder="Describe all the tasks you completed during the internship..."
                      rows={5}
                      style={{
                        width: '100%', borderRadius: '10px', padding: '14px',
                        background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.2)',
                        color: 'white', fontSize: '14px', resize: 'vertical', outline: 'none',
                        opacity: isSubmitted ? 0.6 : 1
                      }}
                    />
                  </div>

                  {/* CSR Upload — MANDATORY */}
                  <div style={{ marginBottom: '28px' }}>
                    <label style={{ color: 'white', fontWeight: '600', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                      📎 Upload CSR / Project Report <span style={{ color: '#FF6B6B' }}>* (Mandatory)</span>
                    </label>
                    {finalSubmission.csrFile ? (
                      <div style={{
                        background: 'rgba(78,205,196,0.12)', border: '1px solid rgba(78,205,196,0.4)',
                        borderRadius: '10px', padding: '12px 16px',
                        display: 'flex', alignItems: 'center', gap: '12px'
                      }}>
                        <span style={{ fontSize: '20px' }}>📄</span>
                        <span style={{ color: '#4ECDC4', fontWeight: '600', flex: 1 }}>{finalSubmission.csrFile.name}</span>
                        {!isSubmitted && (
                          <button
                            onClick={() => setFinalSubmission({ ...finalSubmission, csrFile: null })}
                            style={{ background: 'transparent', border: 'none', color: '#FF6B6B', cursor: 'pointer', fontSize: '18px' }}
                          >✕</button>
                        )}
                      </div>
                    ) : (
                      <label style={{
                        display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer',
                        background: 'rgba(255,255,255,0.05)', border: '2px dashed rgba(167,119,227,0.5)',
                        borderRadius: '10px', padding: '18px 20px', transition: 'all 0.2s'
                      }}>
                        <Upload size={22} color="#a777e3" />
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
                          Click to upload PDF / DOCX / ZIP
                        </span>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.zip,.rar"
                          style={{ display: 'none' }}
                          ref={el => setFinalCsrInput(el)}
                          onChange={e => {
                            const f = e.target.files[0];
                            if (f) setFinalSubmission({ ...finalSubmission, csrFile: { name: f.name, url: URL.createObjectURL(f) } });
                          }}
                        />
                      </label>
                    )}
                  </div>

                  {/* Submit Button */}
                  {isSubmitted ? (
                    <div style={{
                      background: 'rgba(78,205,196,0.15)', border: '1px solid rgba(78,205,196,0.4)',
                      borderRadius: '12px', padding: '18px', textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '32px', marginBottom: '6px' }}>🎉</div>
                      <div style={{ color: '#4ECDC4', fontWeight: '700', fontSize: '16px' }}>Final Submission Received!</div>
                      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', marginTop: '4px' }}>Your CSR and completion report have been submitted.</div>
                    </div>
                  ) : (
                    <button
                      onClick={handleFinalSubmit}
                      style={{
                        width: '100%', padding: '16px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                        background: 'linear-gradient(135deg, #a777e3, #6e8efb)',
                        color: 'white', fontWeight: '800', fontSize: '16px',
                        boxShadow: '0 6px 20px rgba(110,142,251,0.35)', transition: 'transform 0.2s'
                      }}
                      onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'}
                      onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      🚀 Submit Final Report
                    </button>
                  )}
                </div>
              </div>
            );
          })()
        ) : selectedPeriod === 0 ? (
          <div className="week0-section">
            <div className="target-header">
              <FileText size={20} />
              <h3>Week 0 – Project Title, Summary & First Week Deliverables</h3>
            </div>
            <p className="week0-desc">Submit your project title, summary, and all first week deliverables below.</p>
            {hasWeek0Complete && !editingWeek0 ? (
              <div className="week0-display">
                <div className="progress-display">
                  <div className="progress-text">
                    <strong>Project Title:</strong>
                    <p>{week0Data.projectTitle}</p>
                  </div>
                  <div className="progress-text">
                    <strong>Summary:</strong>
                    <p>{week0Data.summary}</p>
                  </div>
                  {week0Data.files && week0Data.files.length > 0 && (
                    <div className="file-list">
                      <strong>Uploaded Files:</strong>
                      {week0Data.files.map((f, i) => (
                        <div key={i} className="file-display">
                          <Upload size={14} />
                          <a href={f.url} download={f.name} target="_blank" rel="noreferrer">{f.name}</a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {week0Data.comment && (
                  <div className="teacher-comment">
                    <MessageSquare size={16} />
                    <div>
                      <strong>Faculty Feedback:</strong>
                      <p>{week0Data.comment}</p>
                    </div>
                  </div>
                )}
                <button className="btn-secondary btn-small" onClick={() => { setWeek0Form({ projectTitle: week0Data.projectTitle, summary: week0Data.summary, files: week0Data.files || [] }); setEditingWeek0(true); }}>
                  Edit Submission
                </button>
              </div>
            ) : (
              <form onSubmit={handleWeek0Submit} className="week0-form">
                <div className="form-group">
                  <label>Project Title *</label>
                  <input
                    type="text"
                    required
                    value={week0Form.projectTitle}
                    onChange={(e) => setWeek0Form({ ...week0Form, projectTitle: e.target.value })}
                    placeholder="Enter your project title"
                  />
                </div>
                <div className="form-group">
                  <label>Summary *</label>
                  <textarea
                    required
                    value={week0Form.summary}
                    onChange={(e) => setWeek0Form({ ...week0Form, summary: e.target.value })}
                    placeholder="Describe your project, objectives, and scope..."
                    rows={5}
                  />
                </div>
                <div className="form-group">
                  <label>First Week Deliverables (PDF, images)</label>
                  <div className="week0-files">
                    <input
                      ref={el => setWeek0FileInput(el)}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                      onChange={handleWeek0FileAdd}
                      style={{ display: 'none' }}
                    />
                    <button type="button" className="btn-secondary btn-small" onClick={() => week0FileInput?.click()}>
                      <Upload size={16} />
                      Add File
                    </button>
                    {week0Form.files.map((f, i) => (
                      <div key={i} className="file-display">
                        <a href={f.url} download={f.name} target="_blank" rel="noreferrer">{f.name}</a>
                        <button type="button" className="btn-small" onClick={() => handleWeek0FileRemove(i)}>Remove</button>
                      </div>
                    ))}
                  </div>
                </div>
                <button type="submit" className="btn-primary" disabled={!week0Form.projectTitle.trim() || !week0Form.summary.trim()}>
                  Submit Week 0
                </button>
              </form>
            )}
          </div>
        ) : (
          <>
            <div className="target-section">
              <div className="target-header">
                <Target size={20} />
                <h3>{getPeriodLabel(selectedPeriod, intern.totalDays)} Target</h3>
              </div>
              {showTargetInput ? (
                <div className="target-input">
                  <textarea
                    value={targetInput}
                    onChange={(e) => setTargetInput(e.target.value)}
                    placeholder={`What do you plan to achieve in ${getPeriodLabel(selectedPeriod, intern.totalDays).toLowerCase()}?`}
                    rows={3}
                  />
                  <div className="button-group">
                    <button className="btn-primary" onClick={handleTargetSubmit}>
                      Set Target
                    </button>
                    <button className="btn-secondary" onClick={() => setShowTargetInput(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : currentPeriodData.target ? (
                <div className="target-display">
                  <p>{currentPeriodData.target}</p>
                  <button
                    className="btn-secondary btn-small"
                    onClick={() => {
                      setTargetInput(currentPeriodData.target);
                      setShowTargetInput(true);
                    }}
                  >
                    Edit Target
                  </button>
                </div>
              ) : (
                <div className="target-empty">
                  <p>No target set for this period</p>
                  <button className="btn-primary" onClick={handleInitializeTarget}>
                    <Target size={16} />
                    Set Target
                  </button>
                </div>
              )}
            </div>

            <div className="daily-progress">
              <h3>Daily Progress (Days {periodStart}-{periodEnd})</h3>
              {daysInPeriod.map(day => {
                const dayData = currentPeriodData.days?.[day];
                const hasProgress = Boolean(dayData?.progress);
                const isPast = day < dayNumber;
                const isToday = day === dayNumber;

                return (
                  <div key={day} className={`day-entry ${hasProgress ? 'completed' : ''} ${isToday ? 'today' : ''}`}>
                    <div className="day-header">
                      <div className="day-number">
                        <span className="day-badge">Day {day}</span>
                        {isToday && <span className="today-badge">Today</span>}
                        {hasProgress && <CheckCircle size={16} className="check-icon" />}
                      </div>
                    </div>

                    {hasProgress ? (
                      <div className="day-content completed-content">
                        <div className="progress-display">
                          <div className="progress-text">
                            <strong>Progress:</strong>
                            <p>{dayData.progress}</p>
                          </div>
                          {dayData.file && (
                            <div className="file-display">
                              <Upload size={14} />
                              <a
                                href={dayData.file.url}
                                download={dayData.file.name}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {dayData.file.name}
                              </a>
                            </div>
                          )}
                        </div>
                        {dayData.comment && (
                          <div className="teacher-comment">
                            <MessageSquare size={16} />
                            <div>
                              <strong>Faculty Feedback:</strong>
                              <p>{dayData.comment}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      !hasProgress && (
                        <div className="day-content">
                          <textarea
                            value={dailyProgress[day]?.text || ''}
                            onChange={(e) => setDailyProgress({
                              ...dailyProgress,
                              [day]: { ...dailyProgress[day], text: e.target.value }
                            })}
                            placeholder="What did you work on today? Describe your progress, challenges, and learnings..."
                            rows={3}
                          />
                          <div className="day-actions">
                            <div className="file-upload">
                              <input
                                type="file"
                                id={`file-${day}`}
                                accept=".pdf,.png,.jpg,.jpeg"
                                onChange={(e) => handleFileUpload(day, e)}
                              />
                              <label htmlFor={`file-${day}`} className="file-label">
                                <Upload size={16} />
                                {dailyProgress[day]?.file?.name || 'Upload Output'}
                              </label>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                              <button
                                className="btn-primary"
                                onClick={() => handleProgressSubmit(day)}
                                disabled={!dailyProgress[day]?.text?.trim()}
                              >
                                Submit Progress
                              </button>

                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* 🎓 Project Completion Overlay */}
        {showProjectComplete && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            animation: 'cpFadeIn 0.6s ease'
          }}>
            <style>{`
            @keyframes cpFadeIn{from{opacity:0}to{opacity:1}}
            @keyframes cpFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-18px)}}
            @keyframes cpPop{0%{transform:scale(0.5);opacity:0}80%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}
            @keyframes cpFall{0%{transform:translateY(-40px) rotate(0deg);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}
            .cp-piece{position:fixed;top:-20px;width:10px;height:14px;animation:cpFall linear infinite;border-radius:2px;}
            @media print{body *{visibility:hidden;}#csr-cert,#csr-cert *{visibility:visible;}#csr-cert{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:white !important;}.cp-noprint{display:none !important;}}
          `}</style>
            {[...Array(24)].map((_, i) => (
              <div key={i} className="cp-piece" style={{
                left: `${(i * 4.2) % 100}%`,
                background: ['#FFD700', '#FF6B6B', '#4ECDC4', '#A29BFE', '#FD79A8', '#55EFC4', '#FDCB6E'][i % 7],
                animationDuration: `${2.0 + (i % 5) * 0.35}s`,
                animationDelay: `${(i * 0.15) % 2}s`
              }} />
            ))}
            <div id="csr-cert" style={{ textAlign: 'center', padding: '40px', maxWidth: '700px' }}>
              <div style={{ fontSize: '96px', animation: 'cpFloat 2.4s ease-in-out infinite', marginBottom: '12px' }}>🎓</div>
              <div style={{ background: 'linear-gradient(90deg,#FFD700,#FFA500,#FFD700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: '40px', fontWeight: '900', marginBottom: '10px', animation: 'cpPop 0.7s ease both' }}>Project Completed! 🎉</div>
              <div style={{ color: 'white', fontSize: '22px', fontWeight: '700', marginBottom: '8px', animation: 'cpPop 0.9s ease both' }}>{intern.name}</div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '16px', lineHeight: '1.8', marginBottom: '28px', animation: 'cpPop 1.1s ease both' }}>
                You have successfully completed your internship project!<br />
                <span style={{ color: '#FFD700', fontWeight: '700' }}>Your CSR and final report</span> have been submitted.
              </div>
              <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', padding: '24px 36px', marginBottom: '32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', animation: 'cpPop 1.3s ease both' }}>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Intern</div><div style={{ color: 'white', fontWeight: '600', textAlign: 'right' }}>{intern.name}</div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>College</div><div style={{ color: 'white', fontWeight: '600', textAlign: 'right' }}>{intern.college}</div>
                {intern.department && <><div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Department</div><div style={{ color: 'white', fontWeight: '600', textAlign: 'right' }}>{intern.department}</div></>}
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Duration</div><div style={{ color: 'white', fontWeight: '600', textAlign: 'right' }}>{intern.totalDays} Days</div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>CSR</div><div style={{ color: '#4ECDC4', fontWeight: '700', textAlign: 'right' }}>✔ {finalSubmission.csrFile?.name || 'Submitted'}</div>
              </div>
              <div className="cp-noprint" style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button onClick={() => window.print()} style={{ padding: '14px 32px', borderRadius: '12px', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#FFD700,#FFA500)', color: '#1a1a2e', fontWeight: '800', fontSize: '16px', boxShadow: '0 6px 20px rgba(255,215,0,0.4)' }}>🖨️ Print Certificate</button>
                <button onClick={() => setShowProjectComplete(false)} style={{ padding: '14px 32px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer', background: 'transparent', color: 'white', fontWeight: '600', fontSize: '16px' }}>← Back to Dashboard</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


// Teacher Dashboard Component
const TeacherDashboard = ({ interns, onUpdateIntern, onLogout, userName, userEmail }) => {
  const [selectedIntern, setSelectedIntern] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(0);
  const [comments, setComments] = useState({});

  const handleCommentSubmit = (internId, period, day) => {
    const comment = comments[`${internId}-${period}-${day}`];
    if (!comment?.trim()) return;

    const intern = interns.find(i => i.id === internId);
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
              comment: comment
            }
          }
        }
      }
    };
    onUpdateIntern(updatedIntern);
    setComments({ ...comments, [`${internId}-${period}-${day}`]: '' });
  };

  const handleWeek0CommentSubmit = (internId) => {
    const comment = comments[`${internId}-week0`];
    if (!comment?.trim()) return;

    const intern = interns.find(i => i.id === internId);
    const week0 = intern.periods?.[0] || { projectTitle: '', summary: '', files: [], comment: '' };
    const updatedIntern = {
      ...intern,
      periods: {
        ...intern.periods,
        0: { ...week0, comment }
      }
    };
    onUpdateIntern(updatedIntern);
    setComments({ ...comments, [`${internId}-week0`]: '' });
  };

  if (selectedIntern) {
    const intern = interns.find(i => i.id === selectedIntern);
    const periodLength = getPeriodLength(intern.totalDays);
    const totalPeriods = getTotalPeriods(intern.totalDays);
    const currentPeriodData = intern.periods?.[selectedPeriod] || { target: '', days: {} };
    const week0Data = intern.periods?.[0] || { projectTitle: '', summary: '', files: [], comment: '' };

    const periodStart = selectedPeriod === 0 ? 0 : ((selectedPeriod - 1) * periodLength) + 1;
    const periodEnd = selectedPeriod === 0 ? 0 : Math.min(selectedPeriod * periodLength, intern.totalDays);

    const dayNumber = calculateDayNumber(intern.createdDate);
    const hasWeek0Complete = Boolean(week0Data.projectTitle && week0Data.summary);
    const totalDaysWithProgress = (hasWeek0Complete ? 1 : 0) + Object.values(intern.periods || {}).reduce((acc, period) => {
      if (period && typeof period === 'object' && period.days) {
        return acc + Object.keys(period.days).length;
      }
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
          <button className="btn-back" onClick={() => setSelectedIntern(null)}>
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
              <span className="info-value">{dayNumber} of {intern.totalDays}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Attendance:</span>
              <span className="info-value">{totalDaysWithProgress} days ({((totalDaysWithProgress / (intern.totalDays || 1)) * 100).toFixed(0)}%)</span>
            </div>
          </div>
        </div>

        <div className="period-selector-teacher">
          <label>View Period:</label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(parseInt(e.target.value))}
          >
            {Array.from({ length: totalPeriods }, (_, i) => i).map(p => (
              <option key={p} value={p}>
                {getPeriodLabel(p, intern.totalDays)}
              </option>
            ))}
          </select>
        </div>

        {selectedPeriod === 0 ? (
          <div className="week0-section week0-teacher">
            <h3>Week 0 – Project Title, Summary & First Week Deliverables</h3>
            {hasWeek0Complete ? (
              <>
                <div className="intern-info-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span className="info-label">Project Title</span>
                    <span className="info-value" style={{ fontSize: '1.1em', fontWeight: '500' }}>{week0Data.projectTitle}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span className="info-label">Summary</span>
                    <span className="info-value" style={{ lineHeight: '1.6' }}>{week0Data.summary}</span>
                  </div>
                  {week0Data.files && week0Data.files.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span className="info-label">Files</span>
                      <div className="file-list">
                        {week0Data.files.map((f, i) => (
                          <a key={i} className="file-badge" href={f.url} download={f.name} target="_blank" rel="noreferrer">
                            <Upload size={12} />
                            {f.name}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="comment-input-group" style={{ marginTop: 16 }}>
                  <label>Your Feedback on Week 0</label>
                  <textarea
                    value={comments[`${intern.id}-week0`] !== undefined ? comments[`${intern.id}-week0`] : (week0Data.comment || '')}
                    onChange={(e) => setComments({ ...comments, [`${intern.id}-week0`]: e.target.value })}
                    placeholder="Add feedback for the intern's Week 0 submission..."
                    rows={3}
                  />
                  <button
                    className="btn-small btn-primary"
                    onClick={() => handleWeek0CommentSubmit(intern.id)}
                    disabled={comments[`${intern.id}-week0`] === undefined || comments[`${intern.id}-week0`] === (week0Data.comment || '')}
                  >
                    {week0Data.comment ? 'Update' : 'Add'} Feedback
                  </button>
                </div>
              </>
            ) : (
              <p className="no-submission">Intern has not submitted Week 0 yet.</p>
            )}
          </div>
        ) : (
          <>
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
                  {Array.from({ length: periodEnd - periodStart + 1 }, (_, i) => periodStart + i).map(day => {
                    const dayData = currentPeriodData.days?.[day];
                    const commentKey = `${intern.id}-${selectedPeriod}-${day}`;

                    return (
                      <tr key={day} className={dayData ? 'has-progress' : 'no-progress'}>
                        <td className="day-cell">
                          <strong>Day {day}</strong>
                          {dayData && <CheckCircle size={14} className="check-small" />}
                        </td>
                        <td className="progress-cell">
                          {dayData?.progress ? (
                            <p>{dayData.progress}</p>
                          ) : (
                            <span className="no-submission">No submission yet</span>
                          )}
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
                                value={comments[commentKey] !== undefined ? comments[commentKey] : (dayData.comment || '')}
                                onChange={(e) => setComments({ ...comments, [commentKey]: e.target.value })}
                                placeholder="Add feedback for this day..."
                                rows={2}
                              />
                              <button
                                className="btn-small btn-primary"
                                onClick={() => handleCommentSubmit(intern.id, selectedPeriod, day)}
                                disabled={comments[commentKey] === undefined || comments[commentKey] === (dayData.comment || '')}
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
          </>
        )}
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
              try {
                const wb = XLSX.utils.book_new();
                const usedNames = {};
                interns.forEach(i => {
                  const profileData = [
                    [`${i.name || 'Student'}`],
                    [],
                    ['Field', 'Details'],
                    ['Email', i.email || ''],
                    ['College', i.college || ''],
                    ['Department', i.department || ''],
                    ['Supervisor', i.supervisor || ''],
                    ['Total Days', i.totalDays || ''],
                    ['Start Date', i.createdDate || ''],
                    ['Submissions', Object.values(i.periods || {}).reduce((a, p) => a + Object.keys(p.days || {}).length, 0)],
                    ['Project Title', i.periods?.[0]?.projectTitle || ''],
                    ['Project Summary', i.periods?.[0]?.summary || ''],
                    [],
                    ['Period/Week', 'Day', 'Progress', 'Faculty Feedback']
                  ];
                  Object.entries(i.periods || {}).forEach(([pk, pd]) => {
                    if (pk === '0') return;
                    Object.entries(pd.days || {}).forEach(([dk, dd]) => {
                      profileData.push([`Week ${pk}`, `Day ${dk}`, dd.progress || '', dd.comment || '']);
                    });
                  });
                  const ws = XLSX.utils.aoa_to_sheet(profileData);

                  // Apply styles to the Excel sheet
                  const headerStyle = {
                    font: { bold: true, color: { rgb: "FFFFFF" } },
                    fill: { fgColor: { rgb: "16213E" } },
                    alignment: { horizontal: "center", vertical: "center" },
                    border: {
                      top: { style: "thin", color: { rgb: "000000" } },
                      bottom: { style: "thin", color: { rgb: "000000" } }
                    }
                  };

                  const profileTitleStyle = {
                    font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
                    fill: { fgColor: { rgb: "16213E" } },
                    alignment: { horizontal: "left" }
                  };

                  const fieldLabelStyle = {
                    font: { bold: true, color: { rgb: "16213E" } },
                    fill: { fgColor: { rgb: "F0F0F0" } }
                  };

                  // A1: Profile Title
                  if (ws['A1']) ws['A1'].s = profileTitleStyle;

                  // Row 3: Field & Details Headers
                  if (ws['A3']) ws['A3'].s = headerStyle;
                  if (ws['B3']) ws['B3'].s = headerStyle;

                  // Row 14: Progress Table Headers
                  const tableHeaders = ['A14', 'B14', 'C14', 'D14'];
                  tableHeaders.forEach(cell => {
                    if (ws[cell]) ws[cell].s = headerStyle;
                  });

                  // Field labels (A4 to A12)
                  for (let row = 4; row <= 12; row++) {
                    const cell = `A${row}`;
                    if (ws[cell]) ws[cell].s = fieldLabelStyle;
                  }

                  ws['!cols'] = [{ wch: 20 }, { wch: 35 }, { wch: 40 }, { wch: 30 }];
                  // Sanitize: remove chars forbidden in Excel sheet names
                  let baseName = (i.name || i.email || 'Student')
                    .replace(/[:\\/?*[\]]/g, '_')
                    .substring(0, 28);
                  // Deduplicate sheet names
                  if (usedNames[baseName]) {
                    usedNames[baseName]++;
                    baseName = `${baseName.substring(0, 25)}_${usedNames[baseName]}`;
                  } else {
                    usedNames[baseName] = 1;
                  }
                  XLSX.utils.book_append_sheet(wb, ws, baseName);
                });
                const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Intern_Progress_${new Date().toISOString().split('T')[0]}.xlsx`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                // Delay revoke so browser can start the download first
                setTimeout(() => URL.revokeObjectURL(url), 150);
              } catch (err) {
                console.error('Excel export failed:', err);
                alert('Failed to export Excel: ' + err.message);
              }
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
                  {(interns.reduce((acc, i) => {
                    const dayNum = calculateDayNumber(i.createdDate);
                    const expected = Math.min(dayNum, i.totalDays || 1) + 1;
                    const week0Data = i.periods?.[0] || {};
                    const hasWeek0Complete = Boolean(week0Data.projectTitle && week0Data.summary);
                    const progress = (hasWeek0Complete ? 1 : 0) + Object.values(i.periods || {}).reduce((a, p) => {
                      if (p && typeof p === 'object' && p.days) return a + Object.keys(p.days).length;
                      return a;
                    }, 0);
                    return acc + Math.min(1, progress / expected);
                  }, 0) / interns.length * 100).toFixed(0)}%
                </div>
                <div className="overview-label">Avg. Attendance</div>
              </div>
            </div>
          </div>

          <div className="interns-grid">
            {interns.map(intern => {
              const dayNumber = calculateDayNumber(intern.createdDate);
              const expectedSubmissions = Math.min(dayNumber, intern.totalDays || 1) + 1;
              const week0Data = intern.periods?.[0] || {};
              const hasWeek0Complete = Boolean(week0Data.projectTitle && week0Data.summary);
              const totalDaysWithProgress = (hasWeek0Complete ? 1 : 0) + Object.values(intern.periods || {}).reduce((acc, period) => {
                if (period && typeof period === 'object' && period.days) return acc + Object.keys(period.days).length;
                return acc;
              }, 0);
              const attendanceRate = Math.min(100, Math.round((totalDaysWithProgress / expectedSubmissions) * 100)).toString();

              return (
                <div
                  key={intern.id}
                  className="intern-card"
                  onClick={() => setSelectedIntern(intern.id)}
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
};

// Main App Component
export default function InternTracker() {
  const [users, setUsers] = useLocalStorageState('anna_univ_users', INITIAL_DATA.users);
  const [currentUser, setCurrentUser] = useState(null);
  const [authError, setAuthError] = useState('');
  const backendLoaded = React.useRef(false);

  // Load data from backend on startup (primary source of truth)
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3002'}/api/load`)
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data) && data.length > 0) {
          setUsers(data);
          console.log(`✅ Loaded ${data.length} users from backend database`);
        } else {
          console.log('No data on backend, using local data');
        }
        backendLoaded.current = true;
      })
      .catch(err => {
        console.log('Backend not available, using local storage.');
        backendLoaded.current = true;
      });
  }, []);

  // Save data to backend on every change (only after initial load is done)
  useEffect(() => {
    if (!backendLoaded.current) return; // Don't save until backend data has loaded
    if (users && users.length > 0) {
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3002'}/api/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(users)
      })
        .then(() => console.log('💾 Data saved to backend'))
        .catch(err => console.log('Backend sync failed. Data is safe in browser storage.'));
    }
  }, [users]);

  const handleLogin = (formData, isLogin) => {
    setAuthError('');

    if (isLogin) {
      // Handle login
      const user = users.find(u => u.email === formData.email && u.password === formData.password);
      if (user) {
        setCurrentUser(user);
      } else {
        setAuthError('Invalid email or password');
      }
    } else {
      // Handle signup
      const existingUser = users.find(u => u.email === formData.email);
      if (existingUser) {
        setAuthError('An account with this email already exists');
        return;
      }

      const newUser = {
        id: `user${Date.now()}`,
        email: formData.email,
        password: formData.password,
        type: formData.userType,
        hasProfile: false
      };

      if (formData.userType === 'teacher') {
        newUser.name = formData.name;
      }

      setUsers([...users, newUser]);
      setCurrentUser(newUser);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const handleInternSetupComplete = (internData) => {
    const updatedUser = {
      ...currentUser,
      hasProfile: true,
      internData: {
        ...internData,
        id: `intern${Date.now()}`
      }
    };

    setUsers(users.map(u => u.id === currentUser.id ? updatedUser : u));
    setCurrentUser(updatedUser);
  };

  const handleUpdateIntern = (updatedInternData) => {
    // Update the user's intern data
    const updatedUser = {
      ...currentUser,
      internData: updatedInternData
    };

    setUsers(users.map(u => u.id === currentUser.id ? updatedUser : u));
    setCurrentUser(updatedUser);
  };

  const handleTeacherUpdateIntern = (updatedInternData) => {
    // Find the user who owns this intern data and update it
    const userToUpdate = users.find(u => u.internData?.id === updatedInternData.id);
    if (userToUpdate) {
      const updatedUser = {
        ...userToUpdate,
        internData: updatedInternData
      };
      setUsers(users.map(u => u.id === userToUpdate.id ? updatedUser : u));
    }
  };

  // Get all interns for teacher view
  const getAllInterns = () => {
    return users
      .filter(u => u.type === 'intern' && u.hasProfile && u.internData)
      .map(u => u.internData);
  };

  // Not logged in - show auth screen
  if (!currentUser) {
    return (
      <div className="app-container">
        <AuthScreen onLogin={handleLogin} />
        {authError && (
          <div className="auth-error-toast">
            {authError}
          </div>
        )}

        <style>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Crimson Pro', 'Crimson Text', 'Merriweather', Georgia, serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
          }
          
          .app-container {
            min-height: 100vh;
            padding: 20px;
          }
          
          .auth-container {
            max-width: 500px;
            margin: 60px auto;
            animation: fadeInUp 0.6s ease-out;
          }
          
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .auth-box {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 24px;
            padding: 50px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          }
          
          .auth-header {
            text-align: center;
            margin-bottom: 40px;
          }
          
          .auth-header h1 {
            font-size: 42px;
            font-weight: 700;
            color: #16213e;
            margin-bottom: 8px;
            letter-spacing: -0.5px;
          }
          
          .auth-header h2 {
            font-size: 24px;
            color: #e94560;
            font-weight: 600;
            margin-bottom: 12px;
          }
          
          .auth-header p {
            font-size: 16px;
            color: #666;
            font-style: italic;
          }
          
          .auth-form {
            display: flex;
            flex-direction: column;
            gap: 20px;
          }
          
          .error-message {
            background: #fee;
            border: 2px solid #e94560;
            color: #c00;
            padding: 12px;
            border-radius: 10px;
            font-size: 14px;
            text-align: center;
          }
          
          .form-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          
          .form-group label {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 15px;
            font-weight: 600;
            color: #16213e;
          }
          
          .form-group input {
            padding: 14px 16px;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            font-size: 15px;
            font-family: inherit;
            transition: all 0.2s ease;
          }
          
          .form-group input:focus {
            outline: none;
            border-color: #e94560;
            box-shadow: 0 0 0 3px rgba(233, 69, 96, 0.1);
          }
          
          .radio-group {
            display: flex;
            gap: 20px;
            margin-top: 8px;
          }
          
          .radio-label {
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            font-weight: normal;
            color: #333;
          }
          
          .radio-label input[type="radio"] {
            width: 18px;
            height: 18px;
            cursor: pointer;
          }
          
          .btn-primary {
            padding: 16px 32px;
            background: #e94560;
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 17px;
            font-weight: 600;
            font-family: inherit;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-top: 10px;
          }
          
          .btn-primary:hover:not(:disabled) {
            background: #d63850;
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(233, 69, 96, 0.3);
          }
          
          .btn-primary:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          
          .auth-toggle {
            text-align: center;
            margin-top: 24px;
            color: #666;
            font-size: 15px;
          }
          
          .toggle-link {
            background: none;
            border: none;
            color: #e94560;
            font-weight: 600;
            cursor: pointer;
            font-family: inherit;
            font-size: 15px;
            text-decoration: underline;
          }
          
          .toggle-link:hover {
            color: #d63850;
          }
          
          .demo-credentials {
            margin-top: 30px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 12px;
            text-align: center;
          }
          
          .demo-credentials p {
            font-size: 13px;
            color: #666;
            margin: 4px 0;
          }
          
          .demo-credentials strong {
            color: #16213e;
          }
          
          .auth-error-toast {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #e94560;
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(233, 69, 96, 0.3);
            animation: slideIn 0.3s ease-out;
            z-index: 1000;
          }
          
          @keyframes slideIn {
            from {
              transform: translateX(400px);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          
          .top-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding: 16px 24px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            backdrop-filter: blur(10px);
          }
          
          .user-info {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          
          .user-name {
            font-size: 16px;
            font-weight: 600;
            color: white;
          }
          
          .user-email {
            font-size: 14px;
            color: rgba(255, 255, 255, 0.7);
          }
          
          .btn-logout {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 20px;
            background: rgba(255, 255, 255, 0.2);
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 10px;
            color: white;
            font-size: 15px;
            font-weight: 600;
            font-family: inherit;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          
          .btn-logout:hover {
            background: rgba(255, 255, 255, 0.3);
            border-color: rgba(255, 255, 255, 0.5);
          }
          
          .empty-state {
            text-align: center;
            padding: 80px 20px;
            background: white;
            border-radius: 20px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          }
          
          .empty-state svg {
            color: #e0e0e0;
            margin-bottom: 24px;
          }
          
          .empty-state h2 {
            font-size: 28px;
            color: #16213e;
            margin-bottom: 12px;
          }
          
          .empty-state p {
            font-size: 16px;
            color: #888;
            font-style: italic;
          }
          
          .profile-setup {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            padding: 50px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
          }
          
          .setup-header {
            text-align: center;
            margin-bottom: 40px;
          }
          
          .setup-header h1 {
            font-size: 36px;
            color: #16213e;
            margin-bottom: 12px;
          }
          
          .setup-header p {
            font-size: 18px;
            color: #666;
            font-style: italic;
          }
          
          .setup-form {
            max-width: 700px;
            margin: 0 auto;
          }
          
          .form-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 24px;
            margin-bottom: 32px;
          }
          
          .form-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          
          .form-group label {
            font-size: 15px;
            font-weight: 600;
            color: #16213e;
          }
          
          .form-group input {
            padding: 14px 16px;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            font-size: 15px;
            font-family: inherit;
            transition: all 0.2s ease;
          }
          
          .form-group input:focus {
            outline: none;
            border-color: #e94560;
            box-shadow: 0 0 0 3px rgba(233, 69, 96, 0.1);
          }
          
          .form-group small {
            font-size: 13px;
            color: #888;
            font-style: italic;
          }
          
          .btn-primary {
            width: 100%;
            padding: 16px 32px;
            background: #e94560;
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 17px;
            font-weight: 600;
            font-family: inherit;
            cursor: pointer;
            transition: all 0.3s ease;
          }
          
          .btn-primary:hover:not(:disabled) {
            background: #d63850;
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(233, 69, 96, 0.3);
          }
          
          .btn-primary:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          
          .btn-secondary {
            padding: 12px 24px;
            background: white;
            color: #16213e;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            font-size: 15px;
            font-weight: 600;
            font-family: inherit;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          
          .btn-secondary:hover {
            border-color: #16213e;
          }
          
          .btn-small {
            padding: 8px 16px;
            font-size: 14px;
          }
          
          .intern-dashboard,
          .teacher-dashboard {
            max-width: 1200px;
            margin: 0 auto;
            padding: 40px 20px;
          }
          
          .dashboard-header {
            margin-bottom: 40px;
          }
          
          .dashboard-header h1 {
            font-size: 42px;
            color: white;
            margin-bottom: 8px;
          }
          
          .dashboard-header p {
            font-size: 18px;
            color: rgba(255, 255, 255, 0.7);
            font-style: italic;
          }
          
          .header-meta {
            display: flex;
            gap: 20px;
            margin-top: 12px;
            flex-wrap: wrap;
          }
          
          .meta-item {
            display: flex;
            align-items: center;
            gap: 8px;
            color: rgba(255, 255, 255, 0.8);
            font-size: 15px;
          }
          
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 24px;
            margin-bottom: 40px;
          }
          
          .stat-card {
            background: white;
            border-radius: 16px;
            padding: 28px;
            display: flex;
            gap: 20px;
            align-items: flex-start;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
            transition: transform 0.2s ease;
          }
          
          .stat-card:hover {
            transform: translateY(-4px);
          }
          
          .stat-icon {
            width: 56px;
            height: 56px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          
          .day-stat .stat-icon {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          
          .attendance-stat .stat-icon {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
          }
          
          .period-stat .stat-icon {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            color: white;
          }
          
          .stat-content {
            flex: 1;
          }
          
          .stat-label {
            font-size: 14px;
            color: #888;
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 600;
          }
          
          .stat-value {
            font-size: 36px;
            font-weight: 700;
            color: #16213e;
            line-height: 1;
            margin-bottom: 4px;
          }
          
          .stat-subtext {
            font-size: 13px;
            color: #666;
            font-style: italic;
          }
          
          .progress-section {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          }
          
          .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 32px;
            flex-wrap: wrap;
            gap: 20px;
          }
          
          .section-header h2 {
            font-size: 28px;
            color: #16213e;
          }
          
          .period-selector {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          
          .period-selector label {
            font-weight: 600;
            color: #16213e;
          }
          
          .dropdown {
            position: relative;
          }
          
          .dropdown select {
            padding: 10px 40px 10px 16px;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            font-size: 15px;
            font-family: inherit;
            font-weight: 600;
            color: #16213e;
            background: white;
            cursor: pointer;
            appearance: none;
          }
          
          .dropdown svg {
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            pointer-events: none;
          }
          
          .target-section {
            background: #f8f9fa;
            border-radius: 14px;
            padding: 28px;
            margin-bottom: 32px;
            border: 2px solid #e8e8e8;
          }
          
          .target-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
            color: #e94560;
          }
          
          .target-header h3 {
            font-size: 20px;
            font-weight: 600;
          }
          
          .target-display {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 20px;
          }
          
          .target-display p {
            flex: 1;
            font-size: 16px;
            line-height: 1.6;
            color: #333;
          }
          
          .target-input textarea {
            width: 100%;
            padding: 14px;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            font-size: 15px;
            font-family: inherit;
            resize: vertical;
            margin-bottom: 16px;
          }
          
          .target-input textarea:focus {
            outline: none;
            border-color: #e94560;
          }
          
          .button-group {
            display: flex;
            gap: 12px;
          }
          
          .target-empty {
            text-align: center;
            padding: 20px;
          }
          
          .target-empty p {
            color: #888;
            margin-bottom: 16px;
            font-style: italic;
          }
          
          .target-empty button {
            display: inline-flex;
            align-items: center;
            gap: 8px;
          }
          
          .daily-progress {
            margin-top: 32px;
          }
          
          .daily-progress > h3 {
            font-size: 22px;
            color: #16213e;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 2px solid #e8e8e8;
          }
          
          .day-entry {
            border: 2px solid #e8e8e8;
            border-radius: 14px;
            padding: 24px;
            margin-bottom: 20px;
            transition: all 0.2s ease;
          }
          
          .day-entry.completed {
            background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
            border-color: #10b981;
          }
          
          .day-entry.today {
            border-color: #e94560;
            box-shadow: 0 0 0 3px rgba(233, 69, 96, 0.1);
          }
          
          .day-header {
            margin-bottom: 16px;
          }
          
          .day-number {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          
          .day-badge {
            display: inline-block;
            padding: 6px 14px;
            background: #16213e;
            color: white;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
          }
          
          .today-badge {
            padding: 6px 14px;
            background: #e94560;
            color: white;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
          }
          
          .check-icon {
            color: #10b981;
          }
          
          .day-content textarea {
            width: 100%;
            padding: 14px;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            font-size: 15px;
            font-family: inherit;
            resize: vertical;
            margin-bottom: 16px;
          }
          
          .day-content textarea:focus {
            outline: none;
            border-color: #e94560;
          }
          
          .day-actions {
            display: flex;
            gap: 12px;
            align-items: center;
          }
          
          .file-upload {
            flex: 1;
          }
          
          .file-upload input {
            display: none;
          }
          
          .file-label {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 12px 20px;
            background: white;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            color: #16213e;
            transition: all 0.2s ease;
          }
          
          .file-label:hover {
            border-color: #16213e;
          }
          
          .completed-content {
            display: flex;
            flex-direction: column;
            gap: 20px;
          }
          
          .progress-display {
            background: white;
            padding: 20px;
            border-radius: 10px;
            border: 2px solid #e8e8e8;
          }
          
          .progress-text strong {
            display: block;
            color: #16213e;
            margin-bottom: 8px;
            font-size: 15px;
          }
          
          .progress-text p {
            line-height: 1.6;
            color: #333;
          }
          
          .file-display {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            margin-top: 12px;
            padding: 8px 14px;
            background: #f0f0f0;
            border-radius: 8px;
            font-size: 13px;
            color: #666;
          }
          
          .teacher-comment {
            display: flex;
            gap: 16px;
            background: #fff8f0;
            padding: 20px;
            border-radius: 10px;
            border-left: 4px solid #e94560;
          }
          
          .teacher-comment svg {
            color: #e94560;
            flex-shrink: 0;
            margin-top: 2px;
          }
          
          .teacher-comment strong {
            display: block;
            color: #e94560;
            margin-bottom: 8px;
            font-size: 15px;
          }
          
          .teacher-comment p {
            line-height: 1.6;
            color: #333;
          }
          
          .overview-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 24px;
            margin-bottom: 40px;
          }
          
          .overview-card {
            background: white;
            border-radius: 16px;
            padding: 28px;
            display: flex;
            align-items: center;
            gap: 20px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          }
          
          .overview-card svg {
            color: #e94560;
          }
          
          .overview-value {
            font-size: 36px;
            font-weight: 700;
            color: #16213e;
            line-height: 1;
            margin-bottom: 4px;
          }
          
          .overview-label {
            font-size: 14px;
            color: #888;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .interns-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 24px;
          }
          
          .intern-card {
            background: white;
            border-radius: 16px;
            padding: 28px;
            cursor: pointer;
            transition: all 0.3s ease;
            border: 2px solid transparent;
          }
          
          .intern-card:hover {
            border-color: #e94560;
            transform: translateY(-4px);
            box-shadow: 0 12px 24px rgba(233, 69, 96, 0.15);
          }
          
          .intern-card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 16px;
          }
          
          .intern-card-header h3 {
            font-size: 20px;
            color: #16213e;
            font-weight: 600;
          }
          
          .day-badge-small {
            padding: 4px 10px;
            background: #f0f0f0;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
            color: #666;
          }
          
          .college-name {
            font-size: 14px;
            color: #666;
            margin-bottom: 16px;
            font-style: italic;
          }
          
          .intern-stats {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          
          .intern-stat {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            color: #666;
          }
          
          .attendance-bar {
            width: 100%;
            height: 6px;
            background: #e8e8e8;
            border-radius: 3px;
            overflow: hidden;
            margin-top: 8px;
          }
          
          .attendance-fill {
            height: 100%;
            background: linear-gradient(90deg, #e94560 0%, #f093fb 100%);
            transition: width 0.5s ease;
          }
          
          .attendance-percent {
            font-size: 13px;
            color: #888;
            font-style: italic;
          }
          
          .intern-card-footer {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 2px solid #f0f0f0;
          }
          
          .btn-view {
            padding: 10px 18px;
            background: #f8f9fa;
            border: 2px solid #e8e8e8;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            font-family: inherit;
            cursor: pointer;
            transition: all 0.2s ease;
            color: #16213e;
            width: 100%;
          }
          
          .btn-view:hover {
            background: #e94560;
            color: white;
            border-color: #e94560;
          }
          
          .teacher-detail-view {
            max-width: 1200px;
            margin: 0 auto;
            padding: 40px 20px;
          }
          
          .detail-header {
            margin-bottom: 30px;
          }
          
          .btn-back {
            padding: 10px 20px;
            background: white;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            font-size: 15px;
            font-weight: 600;
            font-family: inherit;
            cursor: pointer;
            margin-bottom: 20px;
            color: #16213e;
            transition: all 0.2s ease;
          }
          
          .btn-back:hover {
            border-color: #16213e;
          }
          
          .detail-header h1 {
            font-size: 36px;
            color: #16213e;
          }
          
          .intern-info-card {
            background: white;
            padding: 30px;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.05);
            border-left: 6px solid #16213e;
            margin-bottom: 30px;
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 24px;
          }
          
          .info-item {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          
          .info-label {
            font-size: 13px;
            font-weight: 700;
            color: #16213e;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          
          .info-value {
            font-size: 17px;
            color: #16213e;
            font-weight: 600;
          }
          
          .period-selector-teacher {
            background: white;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 24px;
            display: flex;
            align-items: center;
            gap: 16px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          }
          
          .period-selector-teacher label {
            font-weight: 600;
            color: #16213e;
          }
          
          .period-selector-teacher select {
            padding: 10px 16px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 15px;
            font-family: inherit;
            font-weight: 600;
          }
          
          .target-display-teacher {
            background: white;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 24px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          }
          
          .target-display-teacher h3 {
            font-size: 18px;
            color: #e94560;
            margin-bottom: 12px;
          }
          
          .target-display-teacher p {
            font-size: 15px;
            line-height: 1.6;
            color: #333;
          }
          
          .progress-table {
            background: white;
            border-radius: 16px;
            padding: 32px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
            overflow-x: auto;
          }
          
          table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
          }
          
          .progress-table th {
            background-color: #16213e;
            color: white;
            padding: 16px;
            text-align: left;
            font-weight: 700;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          td {
            padding: 20px 16px;
            border-bottom: 1px solid #f0f0f0;
          }
          
          tr.has-progress {
            background: #fafafa;
          }
          
          tr.no-progress {
            opacity: 0.5;
          }
          
          .day-cell {
            font-weight: 600;
          }
          
          .day-cell strong {
            display: block;
            margin-bottom: 4px;
          }
          
          .check-small {
            color: #10b981;
            vertical-align: middle;
            margin-left: 4px;
          }
          
          .progress-cell p {
            line-height: 1.6;
            color: #333;
            max-width: 400px;
          }
          
          .no-submission {
            color: #999;
            font-style: italic;
          }
          
          .file-cell {
            min-width: 150px;
          }
          
          .file-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            background: #f0f0f0;
            border-radius: 6px;
            font-size: 13px;
            color: #666;
          }
          
          .comment-cell {
            min-width: 300px;
          }
          
          .comment-input-group {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          
          .comment-input-group textarea {
            width: 100%;
            padding: 10px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 14px;
            font-family: inherit;
            resize: vertical;
          }
          
          .comment-input-group textarea:focus {
            outline: none;
            border-color: #e94560;
          }
          
          @media (max-width: 768px) {
            .login-container {
              padding: 40px 30px;
            }
            
            .login-header h1 {
              font-size: 36px;
            }
            
            .form-grid {
              grid-template-columns: 1fr;
            }
            
            .stats-grid {
              grid-template-columns: 1fr;
            }
            
            .interns-grid {
              grid-template-columns: 1fr;
            }
            
            .info-grid {
              grid-template-columns: 1fr;
            }
            
            .progress-table {
              padding: 20px;
            }
            
            table {
              font-size: 14px;
            }
            
            th, td {
              padding: 12px 10px;
            }
          }
        `}</style>
      </div>
    );
  }

  // Logged in as intern
  if (currentUser.type === 'intern') {
    // If they don't have a profile yet, show setup
    if (!currentUser.hasProfile) {
      return (
        <div className="app-container">
          <InternProfileSetup onComplete={handleInternSetupComplete} />
        </div>
      );
    }

    // Show intern dashboard
    return (
      <div className="app-container">
        <InternDashboard
          intern={currentUser.internData}
          onUpdate={handleUpdateIntern}
          onLogout={handleLogout}
          userEmail={currentUser.email}
        />
      </div>
    );
  }

  // Logged in as teacher
  if (currentUser.type === 'teacher') {
    return (
      <div className="app-container">
        <TeacherDashboard
          interns={getAllInterns()}
          onUpdateIntern={handleTeacherUpdateIntern}
          onLogout={handleLogout}
          userName={currentUser.name}
          userEmail={currentUser.email}
        />
      </div>
    );
  }
}
