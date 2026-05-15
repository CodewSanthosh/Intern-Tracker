import { useState, useEffect } from 'react';
import {
  Calendar,
  CheckCircle,
  ChevronDown,
  LogOut,
  MessageSquare,
  Target,
  Upload,
  PieChart,
} from 'lucide-react';

import {
  calculateDayNumber,
  getCurrentPeriod,
  getPeriodLabel,
  getPeriodLength,
  getPeriodType,
} from '../../utils/periods.js';
import { extractUncompletedTargets } from '../../utils/rollover.js';

export function InternDashboard({ intern, onUpdate, onLogout, userEmail }) {
  const dayNumber = calculateDayNumber(intern.createdDate);
  const currentPeriod = getCurrentPeriod(dayNumber, intern.totalDays);
  const periodType = getPeriodType(intern.totalDays);
  const periodLength = getPeriodLength(intern.totalDays);

  const [selectedPeriod, setSelectedPeriod] = useState(currentPeriod);
  const [targetInput, setTargetInput] = useState('');
  const [dailyProgress, setDailyProgress] = useState({});
  const [showTargetInput, setShowTargetInput] = useState(false);

  const periods = intern.periods || {};
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

  // Calculate attendance
  const totalDaysWithProgress = Object.values(periods).reduce((acc, period) => {
    return acc + Object.keys(period.days || {}).length;
  }, 0);

  const periodStart = (selectedPeriod - 1) * periodLength + 1;
  const periodEnd = Math.min(selectedPeriod * periodLength, intern.totalDays);
  const daysInPeriod = [];
  for (let i = periodStart; i <= periodEnd; i++) {
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
          target: targetInput,
        },
      },
    };
    onUpdate(updatedIntern);
    setTargetInput('');
    setShowTargetInput(false);
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
              comment: currentPeriodData.days?.[day]?.comment || '',
            },
          },
        },
      },
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
          file: { name: file.name, url },
        },
      });
    }
  };

  const totalPeriods = Math.ceil(intern.totalDays / periodLength);

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
          <h1>
            Welcome back, {intern.name.split(' ')[0]}! 👋
          </h1>
          <div className="header-meta">
            <span className="meta-item">
              <Calendar size={16} />
              {intern.college}
            </span>
            {intern.department && <span className="meta-item">📚 {intern.department}</span>}
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card day-stat">
          <div className="stat-icon">
            <Calendar size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Current Day</div>
            <div className="stat-value">{dayNumber}</div>
            <div className="stat-subtext">of {intern.totalDays} days</div>
          </div>
        </div>

        <div className="stat-card attendance-stat">
          <div className="stat-icon">
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Attendance</div>
            <div className="stat-value">{totalDaysWithProgress}</div>
            <div className="stat-subtext">
              {((totalDaysWithProgress / dayNumber) * 100).toFixed(0)}% submission rate
            </div>
          </div>
        </div>

        <div className="stat-card period-stat">
          <div className="stat-icon">
            <Target size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">
              Current {periodType === 'week' ? 'Week' : 'Period'}
            </div>
            <div className="stat-value">{currentPeriod}</div>
            <div className="stat-subtext">of {totalPeriods} total</div>
          </div>
        </div>

        <div className="stat-card work-stat">
          <div className="stat-icon">
            <PieChart size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Work Completion</div>
            <div className="stat-value">{Math.min(100, Math.round((totalDaysWithProgress / (intern.totalDays || 1)) * 100))}%</div>
            <div className="stat-subtext">Based on total days</div>
          </div>
        </div>
      </div>

      <div className="progress-section">
        <div className="section-header">
          <h2>Progress Tracking</h2>
          <div className="period-selector">
            <label>Select Period:</label>
            <div className="dropdown">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(parseInt(e.target.value))}
              >
                {Array.from({ length: totalPeriods }, (_, i) => i + 1).map((p) => (
                  <option key={p} value={p}>
                    {getPeriodLabel(p, intern.totalDays)}
                  </option>
                ))}
              </select>
              <ChevronDown size={18} />
            </div>
          </div>
        </div>

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
                placeholder={`What do you plan to achieve in ${getPeriodLabel(
                  selectedPeriod,
                  intern.totalDays
                ).toLowerCase()}?`}
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
              <button className="btn-primary" onClick={() => setShowTargetInput(true)}>
                <Target size={16} />
                Set Target
              </button>
            </div>
          )}
        </div>

        <div className="daily-progress">
          <h3>
            Daily Progress (Days {periodStart}-{periodEnd})
          </h3>
          {daysInPeriod.map((day) => {
            const dayData = currentPeriodData.days?.[day];
            const hasProgress = Boolean(dayData?.progress);
            const isPast = day < dayNumber;
            const isToday = day === dayNumber;

            return (
              <div
                key={day}
                className={`day-entry ${hasProgress ? 'completed' : ''} ${isToday ? 'today' : ''}`}
              >
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
                  (isToday || (isPast && !hasProgress)) && (
                    <div className="day-content">
                      <textarea
                        value={dailyProgress[day]?.text || ''}
                        onChange={(e) =>
                          setDailyProgress({
                            ...dailyProgress,
                            [day]: { ...dailyProgress[day], text: e.target.value },
                          })
                        }
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
                        <button
                          className="btn-primary"
                          onClick={() => handleProgressSubmit(day)}
                          disabled={!dailyProgress[day]?.text?.trim()}
                        >
                          Submit Progress
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


