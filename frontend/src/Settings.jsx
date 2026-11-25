import { useState } from 'react';
import { ArrowLeft, User, Bell, Volume2, Shield, Moon, Sun, Save } from 'lucide-react';

export default function Settings({ user, role, onBack, onLogout }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [showToast, setShowToast] = useState(false);
  
  // Settings States
  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [audioLang, setAudioLang] = useState('English');
  const [autoAssign, setAutoAssign] = useState(true);
  const [maxTickets, setMaxTickets] = useState(10);

  const handleSave = (e) => {
    e.preventDefault();
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    // In a real app, you would toggle a class on the body or a context provider here
    if (!darkMode) {
      document.body.style.backgroundColor = '#111827';
      document.body.style.color = '#f3f4f6';
    } else {
      document.body.style.backgroundColor = '#f3f4f6';
      document.body.style.color = '#1f2937';
    }
  };

  return (
    <div className="settings-layout">
      {/* Top Navbar */}
      <header className="top-navbar">
        <div className="nav-brand">
          <button onClick={onBack} className="back-btn" style={{background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', fontWeight: '600'}}>
            <ArrowLeft size={20} /> Back to Dashboard
          </button>
        </div>
        <div className="nav-user">
          <span>{role === 'agent' ? 'Support Agent' : 'Customer'} Settings</span>
          <button onClick={onLogout} className="logout-btn">Logout</button>
        </div>
      </header>

      <div className="settings-container">
        {/* Settings Sidebar */}
        <aside className="settings-sidebar">
          <div className={`settings-nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
            <User size={18} /> Profile
          </div>
          <div className={`settings-nav-item ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => setActiveTab('notifications')}>
            <Bell size={18} /> Notifications
          </div>
          <div className={`settings-nav-item ${activeTab === 'audio' ? 'active' : ''}`} onClick={() => setActiveTab('audio')}>
            <Volume2 size={18} /> Audio & Language
          </div>
          <div className={`settings-nav-item ${activeTab === 'appearance' ? 'active' : ''}`} onClick={() => setActiveTab('appearance')}>
            {darkMode ? <Sun size={18} /> : <Moon size={18} />} Appearance
          </div>
          {role === 'agent' && (
            <div className={`settings-nav-item ${activeTab === 'advanced' ? 'active' : ''}`} onClick={() => setActiveTab('advanced')}>
              <Shield size={18} /> Advanced (Agent)
            </div>
          )}
        </aside>

        {/* Settings Content */}
        <main className="settings-content">
          <form onSubmit={handleSave}>
            
            {activeTab === 'profile' && (
              <div className="settings-panel">
                <h2>Profile Settings</h2>
                <p className="panel-desc">Manage your personal information.</p>
                
                <div className="form-group-settings">
                  <label>Full Name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="form-group-settings">
                  <label>Email Address</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={role === 'agent'} />
                </div>
                <div className="form-group-settings">
                  <label>Change Password</label>
                  <input type="password" placeholder="Enter new password to change" />
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="settings-panel">
                <h2>Notification Settings</h2>
                <p className="panel-desc">Choose how you want to be notified.</p>
                
                <div className="toggle-row">
                  <div>
                    <h4>Email Alerts</h4>
                    <p>Receive an email when a ticket status changes.</p>
                  </div>
                  <label className="switch">
                    <input type="checkbox" checked={emailAlerts} onChange={() => setEmailAlerts(!emailAlerts)} />
                    <span className="slider round"></span>
                  </label>
                </div>

                <div className="toggle-row">
                  <div>
                    <h4>SMS Alerts</h4>
                    <p>Receive text messages for urgent updates.</p>
                  </div>
                  <label className="switch">
                    <input type="checkbox" checked={smsAlerts} onChange={() => setSmsAlerts(!smsAlerts)} />
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'audio' && (
              <div className="settings-panel">
                <h2>Audio & Language Settings</h2>
                <p className="panel-desc">Customize your audio reply preferences.</p>
                
                <div className="form-group-settings">
                  <label>Preferred Audio Language</label>
                  <select value={audioLang} onChange={(e) => setAudioLang(e.target.value)}>
                    <option value="English">English</option>
                    <option value="Tamil">Tamil</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Telugu">Telugu</option>
                    <option value="Malayalam">Malayalam</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="settings-panel">
                <h2>Appearance</h2>
                <p className="panel-desc">Customize the look and feel of the dashboard.</p>
                
                <div className="toggle-row">
                  <div>
                    <h4>Dark Mode</h4>
                    <p>Switch between light and dark themes.</p>
                  </div>
                  <label className="switch">
                    <input type="checkbox" checked={darkMode} onChange={toggleDarkMode} />
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'advanced' && role === 'agent' && (
              <div className="settings-panel">
                <h2>Advanced Agent Settings</h2>
                <p className="panel-desc">Advanced configurations for ticket management.</p>
                
                <div className="toggle-row">
                  <div>
                    <h4>Auto-Assign Tickets</h4>
                    <p>Automatically assign new tickets to available agents.</p>
                  </div>
                  <label className="switch">
                    <input type="checkbox" checked={autoAssign} onChange={() => setAutoAssign(!autoAssign)} />
                    <span className="slider round"></span>
                  </label>
                </div>

                <div className="form-group-settings" style={{marginTop: '20px'}}>
                  <label>Max Tickets Per Day</label>
                  <input type="number" value={maxTickets} onChange={(e) => setMaxTickets(e.target.value)} min="1" max="100" />
                </div>
              </div>
            )}

            <div className="settings-footer">
              <button type="submit" className="primary-btn save-btn">
                <Save size={18} /> Save Changes
              </button>
            </div>
          </form>
        </main>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="modern-toast">
          <span>Settings saved successfully!</span>
        </div>
      )}
    </div>
  );
}