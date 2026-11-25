import { useState } from 'react';
import CustomerPortal from './CustomerPortal';
import AgentDashboard from './AgentDashboard';
import { Eye, EyeOff } from 'lucide-react';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || '';

function App() {
  const [appMode, setAppMode] = useState(null); 
  const [showAuthPopup, setShowAuthPopup] = useState(true);
  
  const [isLogin, setIsLogin] = useState(true);
  const [isAgentLogin, setIsAgentLogin] = useState(false);
  const [user, setUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });

  const handleUserAuth = async (e) => {
    e.preventDefault();
    
    const url = isLogin ? `${API_URL}/api/login/user` : `${API_URL}/api/register`;
    
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isLogin ? { email: formData.email, password: formData.password } : formData)
      });
      
      const data = await res.json();
      if (res.ok) {
        if (!isLogin) {
          alert("Account created! Please login.");
          setIsLogin(true);
        } else {
          setUser(data);
          setAppMode('customer');
          setShowAuthPopup(false);
        }
      } else {
        alert(data.detail || "Error");
      }
    } catch (err) {
      alert("Backend not running! Check your network or Render deployment.");
    }
  };

  const handleAgentAuth = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/login/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: formData.email, password: formData.password })
      });
      if (res.ok) {
        setUser({ name: "Agent", role: "agent" });
        setAppMode('agent');
        setShowAuthPopup(false);
      } else {
        alert("Invalid Agent Credentials");
      }
    } catch (err) {
      alert("Backend not running! Check your network or Render deployment.");
    }
  };

  if (showAuthPopup) {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <h2>Welcome</h2>
          <p>Please select your login type</p>
          
          <div className="login-toggle">
            <button onClick={() => { setIsAgentLogin(false); setIsLogin(true); setShowPassword(false); }} className={!isAgentLogin ? 'active' : ''}>Customer</button>
            <button onClick={() => { setIsAgentLogin(true); setIsLogin(true); setShowPassword(false); }} className={isAgentLogin ? 'active' : ''}>Agent</button>
          </div>

          <form onSubmit={isAgentLogin ? handleAgentAuth : handleUserAuth}>
            {!isAgentLogin && !isLogin && (
              <input type="text" placeholder="Full Name" required 
                onChange={(e) => setFormData({...formData, name: e.target.value})} />
            )}
            
            <input type={isAgentLogin ? "text" : "email"} placeholder={isAgentLogin ? "Agent Username" : "Email"} required 
              onChange={(e) => setFormData({...formData, email: e.target.value})} />
              
            <div className="password-input-wrapper">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Password" 
                required 
                onChange={(e) => setFormData({...formData, password: e.target.value})} 
              />
              <button 
                type="button" 
                className="eye-icon-btn" 
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            
            <button type="submit" className="primary-btn">
              {isLogin ? 'Login' : 'Create Account'}
            </button>
          </form>

          {!isAgentLogin && (
            <p className="toggle-text">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <span onClick={() => setIsLogin(!isLogin)}>{isLogin ? 'Register' : 'Login'}</span>
            </p>
          )}
        </div>
      </div>
    );
  }

  if (appMode === 'customer') return <CustomerPortal user={user} onLogout={() => { setAppMode(null); setShowAuthPopup(true); }} />;
  if (appMode === 'agent') return <AgentDashboard onLogout={() => { setAppMode(null); setShowAuthPopup(true); }} />;

  return <div>Loading...</div>;
}

export default App;