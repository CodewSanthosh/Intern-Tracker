import { useState } from 'react';
import { Lock, Mail, User } from 'lucide-react';

export function AuthScreen({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    userType: 'intern',
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
          {error && <div className="error-message">{error}</div>}

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
              onChange={(e) =>
                setFormData({
                  ...formData,
                  password: e.target.value,
                })
              }
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
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value,
                    })
                  }
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
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          userType: e.target.value,
                        })
                      }
                    />
                    <span>Intern</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="userType"
                      value="teacher"
                      checked={formData.userType === 'teacher'}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          userType: e.target.value,
                        })
                      }
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
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        name: e.target.value,
                      })
                    }
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
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
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
                userType: 'intern',
              });
            }}
            className="toggle-link"
          >
            {isLogin ? 'Sign Up' : 'Login'}
          </button>
        </div>

        <div className="demo-credentials">
          <p>
            <strong>Demo Credentials:</strong>
          </p>
          <p>Intern: intern@demo.com / demo123</p>
          <p>Teacher: teacher@demo.com / demo123</p>
        </div>
      </div>
    </div>
  );
}


