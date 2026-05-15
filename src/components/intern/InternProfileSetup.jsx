import { useState } from 'react';

export function InternProfileSetup({ onComplete }) {
  const [formData, setFormData] = useState({
    name: '',
    college: '',
    email: '',
    totalDays: 30,
    department: '',
    supervisor: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const newIntern = {
      id: Date.now().toString(),
      ...formData,
      createdDate: new Date().toISOString().split('T')[0],
      periods: {},
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
              onChange={(e) =>
                setFormData({
                  ...formData,
                  totalDays: parseInt(e.target.value),
                })
              }
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
}


