import { useState, useEffect } from 'react';
import { 
  Monitor, Inbox, Clock, CheckCircle, AlertCircle, 
  Tag, User, CreditCard, Wrench, MoreHorizontal,
  Flag, Headphones, Settings as SettingsIcon, ArrowLeft, Paperclip,
  MessageSquare, TrendingUp, Star, Calendar
} from 'lucide-react';
import Settings from './Settings';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function AgentDashboard({ onLogout }) {
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  
  const [selectedTicket, setSelectedTicket] = useState(false); 
  const [showSettings, setShowSettings] = useState(false);
  
  const [activeFilter, setActiveFilter] = useState('All'); 
  const [activeCategory, setActiveCategory] = useState(null);
  const [activePriority, setActivePriority] = useState(null);

  const [showToast, setShowToast] = useState(false);
  const [agentReply, setAgentReply] = useState('');
  
  const [chatFile, setChatFile] = useState(null);
  const [uploadingChat, setUploadingChat] = useState(false);

  const fetchTickets = async () => {
    try {
      const res = await fetch(`${API_URL}/api/tickets`);
      const data = await res.json();
      setTickets(data);
      
      if (selectedTicket && selectedTicket.id) {
        const updatedSelected = data.find(t => t.id === selectedTicket.id);
        if (updatedSelected) setSelectedTicket(updatedSelected);
      }
    } catch (err) {
      console.error("Failed to fetch tickets", err);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    let result = tickets;

    if (activeFilter !== 'All') {
      if (activeFilter === 'New') result = result.filter(t => t.status === 'Pending');
      else result = result.filter(t => t.status === activeFilter);
    }

    if (activeCategory) {
      result = result.filter(t => t.category.toLowerCase().includes(activeCategory.toLowerCase()));
    }

    if (activePriority) {
      result = result.filter(t => t.priority.toLowerCase() === activePriority.toLowerCase());
    }

    setFilteredTickets(result);
  }, [tickets, activeFilter, activeCategory, activePriority]);

  const updateStatus = async (id, newStatus) => {
    try {
      const res = await fetch(`${API_URL}/api/tickets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (res.ok) {
        await fetchTickets();
      } else {
        alert("Failed to update.");
      }
    } catch (err) {
      alert("Error updating ticket.");
    }
  };

  const uploadFile = async (fileToUpload) => {
    if (!fileToUpload) return null;
    const formData = new FormData();
    formData.append("file", fileToUpload);
    try {
      const res = await fetch(`${API_URL}/api/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      return data.file_url;
    } catch (err) {
      console.error("Upload failed", err);
      alert("Failed to upload file.");
      return null;
    }
  };

  const handleSendReply = async () => {
    if (!agentReply.trim() && !chatFile) return;
    setUploadingChat(true);
    let uploadedUrl = null;

    if (chatFile) {
      uploadedUrl = await uploadFile(chatFile);
    }

    try {
      const res = await fetch(`${API_URL}/api/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sender: "agent", 
          text: agentReply,
          attachment_url: uploadedUrl
        })
      });
      
      if (res.ok) {
        setAgentReply('');
        setChatFile(null);
        await fetchTickets(); 
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    } catch (err) {
      alert("Failed to send message.");
    }
    setUploadingChat(false);
  };

  const getCount = (status) => {
    if (status === 'All') return tickets.length;
    if (status === 'New') return tickets.filter(t => t.status === 'Pending').length;
    return tickets.filter(t => t.status === status).length;
  };

  const getCategoryCount = (cat) => {
    return tickets.filter(t => t.category.toLowerCase().includes(cat.toLowerCase())).length;
  };

  const getPriorityCount = (prio) => {
    return tickets.filter(t => t.priority.toLowerCase() === prio.toLowerCase()).length;
  };

  const getStatusColor = (status) => {
    if (status === 'Resolved') return 'badge green';
    if (status === 'In Progress') return 'badge orange';
    return 'badge blue';
  };

  const handleFilterClick = (type, value) => {
    if (type === 'status') {
      setActiveFilter(value);
      setActiveCategory(null);
      setActivePriority(null);
    } else if (type === 'category') {
      setActiveCategory(value);
      setActiveFilter('All');
      setActivePriority(null);
    } else if (type === 'priority') {
      setActivePriority(value);
      setActiveFilter('All');
      setActiveCategory(null);
    }
    setSelectedTicket(false); 
  };

  if (showSettings) {
    return <Settings user={{name: 'Support Agent', email: 'admin@support.com'}} role="agent" onBack={() => setShowSettings(false)} onLogout={onLogout} />;
  }

  // --- FULL SCREEN DETAILS VIEW ---
  if (selectedTicket && selectedTicket.id) {
    return (
      <div className="dashboard-layout" style={{ gridTemplateColumns: '1fr' }}>
        <div style={{ padding: '2rem', height: '100vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <button onClick={() => setSelectedTicket(false)} className="primary-btn" style={{ width: 'auto', background: '#e2e8f0', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ArrowLeft size={18} /> Back to Dashboard
            </button>
            <div style={{ display: 'flex', gap: '10px' }}>
              <select 
                value={selectedTicket.status} 
                onChange={(e) => updateStatus(selectedTicket.id, e.target.value)}
                className="status-select"
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            
            {/* LEFT SIDE: Info & AI */}
            <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="detail-section" style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
                <h2>Ticket #{selectedTicket.id}</h2>
                <p style={{ color: '#6b7280', marginBottom: '1rem' }}>{selectedTicket.customer_name} ({selectedTicket.email})</p>
                <h4>Customer Message ({selectedTicket.language || 'English'})</h4>
                <div className="message-box">{selectedTicket.message}</div>
                
                {selectedTicket.attachment_url && (
                  <div style={{ marginTop: '15px' }}>
                    <h4>Attachment</h4>
                    {selectedTicket.attachment_url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                      <img src={`${API_URL}${selectedTicket.attachment_url}`} alt="Attachment" style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    ) : (
                      <a href={`${API_URL}${selectedTicket.attachment_url}`} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline', fontWeight: '600' }}>
                        View / Download Attachment
                      </a>
                    )}
                  </div>
                )}

                {selectedTicket.english_translation && selectedTicket.language !== 'English' && (
                  <div style={{marginTop: '15px'}}>
                    <h4>English Translation</h4>
                    <div className="message-box" style={{background: '#f8fafc', fontStyle: 'italic'}}>
                      {selectedTicket.english_translation}
                    </div>
                  </div>
                )}
              </div>

              <div className="detail-section ai-section" style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
                <h4><AlertCircle size={16}/> AI Analysis</h4>
                <div className="tags" style={{ marginTop: '10px', marginBottom: '15px' }}>
                  <span className="tag">Category: {selectedTicket.category}</span>
                  <span className="tag">Priority: {selectedTicket.priority}</span>
                  <span className="tag">Sentiment: {selectedTicket.sentiment}</span>
                </div>
                <p><strong>Summary:</strong> {selectedTicket.summary}</p>
              </div>

              {selectedTicket.suggested_reply && (
                <div className="ai-suggestion" style={{ padding: '1.5rem', borderRadius: '12px' }}>
                  <h4 style={{ marginBottom: '10px', color: '#166534' }}>AI Suggested Reply</h4>
                  <p>{selectedTicket.suggested_reply_original || selectedTicket.suggested_reply}</p>
                  <button 
                    onClick={() => setAgentReply(selectedTicket.suggested_reply_original || selectedTicket.suggested_reply)}
                    className="use-suggestion-btn"
                    style={{ marginTop: '10px' }}
                  >
                    Use this reply in chat
                  </button>
                </div>
              )}
            </div>

            {/* RIGHT SIDE: Chat */}
            <div style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column', background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', height: 'fit-content' }}>
              <h3 style={{ marginBottom: '15px' }}>Conversation History</h3>
              
              <div className="chat-history" style={{ flex: 1, minHeight: '400px' }}>
                {selectedTicket.messages && selectedTicket.messages.map((msg, index) => {
                  const isAgent = msg.sender === 'agent';
                  const isAi = msg.sender === 'ai';
                  
                  return (
                    <div key={index} className={`chat-row ${isAgent ? 'agent' : 'customer'}`}>
                      <div className={`chat-bubble-container ${isAgent ? 'agent' : 'customer'}`}>
                        <div className={`chat-bubble ${isAgent ? 'agent' : isAi ? 'ai-suggestion' : 'customer'}`}>
                          <span className="chat-sender">
                            {isAgent ? 'You (Agent)' : isAi ? 'AI Suggested Reply' : selectedTicket.customer_name}
                          </span>
                          
                          {msg.text && <p>{msg.text}</p>}
                          
                          {msg.attachment_url && (
                            <div style={{ marginTop: '8px' }}>
                              {msg.attachment_url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                                <img src={`${API_URL}${msg.attachment_url}`} alt="Attachment" style={{ maxWidth: '100%', borderRadius: '6px' }} />
                              ) : (
                                <a href={`${API_URL}${msg.attachment_url}`} target="_blank" rel="noopener noreferrer" style={{ color: isAgent ? '#e0e7ff' : '#2563eb', textDecoration: 'underline', fontSize: '0.85rem' }}>
                                  View Attachment
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="chat-input-area" style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {chatFile && (
                  <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', justifyContent: 'space-between', padding: '0 5px' }}>
                    <span>📎 {chatFile.name}</span>
                    <button onClick={() => setChatFile(null)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                  </div>
                )}
                
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', width: '100%' }}>
                  <input type="file" id="agent-chat-file-upload" style={{ display: 'none' }} onChange={(e) => setChatFile(e.target.files[0])} />
                  <label htmlFor="agent-chat-file-upload" style={{ cursor: 'pointer', padding: '10px', background: '#f1f5f9', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '44px' }} title="Attach a file">
                    <Paperclip size={20} color="#475569" />
                  </label>
                  <textarea className="chat-input" placeholder="Type your reply to the customer..." value={agentReply} onChange={(e) => setAgentReply(e.target.value)} rows="2" style={{ flex: 1 }} />
                  <button className="primary-btn" onClick={handleSendReply} disabled={uploadingChat} style={{ height: '44px', padding: '0 24px' }}>
                    {uploadingChat ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN DASHBOARD VIEW ---
  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">
            <Headphones size={20} color="white" />
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-header">
            <span>Views</span>
            <span className="count">{getCount('All')}</span>
          </div>
          <div className={`nav-item ${activeFilter === 'All' && !activeCategory && !activePriority ? 'active' : ''}`} onClick={() => handleFilterClick('status', 'All')}>
            <Monitor size={16} /> All Tickets <span className="nav-badge">{getCount('All')}</span>
          </div>
          <div className={`nav-item ${activeFilter === 'New' ? 'active' : ''}`} onClick={() => handleFilterClick('status', 'New')}>
            <Inbox size={16} /> New <span className="nav-badge blue-badge">{getCount('New')}</span>
          </div>
          <div className={`nav-item ${activeFilter === 'In Progress' ? 'active' : ''}`} onClick={() => handleFilterClick('status', 'In Progress')}>
            <Clock size={16} /> Open <span className="nav-badge">{getCount('In Progress')}</span>
          </div>
          <div className={`nav-item ${activeFilter === 'Pending' ? 'active' : ''}`} onClick={() => handleFilterClick('status', 'Pending')}>
            <AlertCircle size={16} /> Pending <span className="nav-badge">{getCount('Pending')}</span>
          </div>
          <div className={`nav-item ${activeFilter === 'Resolved' ? 'active' : ''}`} onClick={() => handleFilterClick('status', 'Resolved')}>
            <CheckCircle size={16} /> Resolved <span className="nav-badge">{getCount('Resolved')}</span>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-header">
            <span>Categories</span>
          </div>
          <div className={`nav-item ${activeCategory === 'Billing' ? 'active' : ''}`} onClick={() => handleFilterClick('category', 'Billing')}>
            <CreditCard size={16} /> Billing <span className="nav-badge">{getCategoryCount('Billing')}</span>
          </div>
          <div className={`nav-item ${activeCategory === 'Technical' ? 'active' : ''}`} onClick={() => handleFilterClick('category', 'Technical')}>
            <Wrench size={16} /> Technical Issue <span className="nav-badge">{getCategoryCount('Technical')}</span>
          </div>
          <div className={`nav-item ${activeCategory === 'Account' ? 'active' : ''}`} onClick={() => handleFilterClick('category', 'Account')}>
            <User size={16} /> Account & Login <span className="nav-badge">{getCategoryCount('Account')}</span>
          </div>
          <div className={`nav-item ${activeCategory === 'Delivery' ? 'active' : ''}`} onClick={() => handleFilterClick('category', 'Delivery')}>
            <Tag size={16} /> Delivery <span className="nav-badge">{getCategoryCount('Delivery')}</span>
          </div>
          <div className="nav-item"><MoreHorizontal size={16} /> Other</div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-header">
            <span>Priority</span>
          </div>
          <div className={`nav-item ${activePriority === 'High' ? 'active' : ''}`} onClick={() => handleFilterClick('priority', 'High')}>
            <Flag size={16} color="red" /> High <span className="nav-badge">{getPriorityCount('High')}</span>
          </div>
          <div className={`nav-item ${activePriority === 'Medium' ? 'active' : ''}`} onClick={() => handleFilterClick('priority', 'Medium')}>
            <Flag size={16} color="orange" /> Medium <span className="nav-badge">{getPriorityCount('Medium')}</span>
          </div>
          <div className={`nav-item ${activePriority === 'Low' ? 'active' : ''}`} onClick={() => handleFilterClick('priority', 'Low')}>
            <Flag size={16} color="green" /> Low <span className="nav-badge">{getPriorityCount('Low')}</span>
          </div>
        </div>

        <div style={{marginTop: 'auto', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px'}}>
          <button onClick={() => setShowSettings(true)} className="logout-btn" style={{background: '#e2e8f0', color: '#334155', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'}}>
            <SettingsIcon size={16} /> Settings
          </button>
          <button onClick={onLogout} className="logout-btn">Logout</button>
        </div>
      </aside>

      <main className="ticket-list">
        <div className="list-header">
          <h3>
            {activeFilter !== 'All' ? activeFilter : 
             activeCategory ? activeCategory : 
             activePriority ? `${activePriority} Priority` : 'All Tickets'}
          </h3>
          <span>{filteredTickets.length} Total</span>
        </div>
        <div className="list-scroll">
          {filteredTickets.length === 0 ? (
            <p style={{padding: '20px', color: '#6b7280'}}>No tickets match this filter.</p>
          ) : (
            filteredTickets.map(t => (
              <div 
                key={t.id} 
                className={`ticket-item ${selectedTicket?.id === t.id ? 'selected' : ''}`}
                onClick={() => setSelectedTicket(t)}
              >
                <div className="ticket-item-header">
                  <span className="ticket-id">#{t.id}</span>
                  <span className={getStatusColor(t.status)}>{t.status}</span>
                </div>
                <div className="ticket-item-title">{t.summary}</div>
                <div className="ticket-item-meta">
                  <span>{t.category}</span> • <span>{t.customer_name}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* --- NEW DASHBOARD OVERVIEW (Replaces Empty White Screen) --- */}
      <div className="dashboard-overview">
        <div className="overview-header">
          <div>
            <h1>Welcome back, Agent! 👋</h1>
            <p>Here's what's happening with your support today.</p>
          </div>
          <div className="overview-date">
            <Calendar size={16} /> Today
          </div>
        </div>

        {/* Top Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon-wrapper blue"><MessageSquare size={24} /></div>
            <h3>Total Conversations</h3>
            <div className="value">{tickets.length}</div>
            <div className="stat-trend"><TrendingUp size={14} /> +12% vs last week</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrapper green"><CheckCircle size={24} /></div>
            <h3>Resolved Tickets</h3>
            <div className="value">{getCount('Resolved')}</div>
            <div className="stat-trend"><TrendingUp size={14} /> +22.4% vs last week</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrapper purple"><Monitor size={24} /></div>
            <h3>AI Response Rate</h3>
            <div className="value">100%</div>
            <div className="stat-trend"><TrendingUp size={14} /> AI is active</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrapper yellow"><Star size={24} /></div>
            <h3>Pending Tickets</h3>
            <div className="value">{getCount('Pending')}</div>
            <div className="stat-trend" style={{ color: getCount('Pending') > 0 ? '#dc2626' : '#16a34a' }}>
              {getCount('Pending') > 0 ? 'Needs attention' : 'All caught up!'}
            </div>
          </div>
        </div>

        {/* Lower Grid */}
        <div className="overview-lower-grid">
          
          {/* Recent Activity */}
          <div className="overview-panel">
            <div className="panel-header">
              <h2>Recent Tickets</h2>
              <span className="view-all-link" onClick={() => handleFilterClick('status', 'All')}>View all</span>
            </div>
            <div className="activity-list">
              {tickets.slice(0, 5).map(t => (
                <div key={t.id} className="activity-item" style={{ cursor: 'pointer' }} onClick={() => setSelectedTicket(t)}>
                  <div className="activity-avatar">
                    {t.customer_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="activity-content">
                    <h4>{t.customer_name} <span style={{fontWeight: 'normal', color: '#94a3b8', fontSize: '0.8rem'}}>#{t.id}</span></h4>
                    <p>{t.summary}</p>
                  </div>
                  <div className={`badge ${t.status === 'Pending' ? 'blue' : t.status === 'Resolved' ? 'green' : 'orange'}`}>
                    {t.status}
                  </div>
                </div>
              ))}
              {tickets.length === 0 && <p style={{color: '#64748b', fontSize: '0.9rem'}}>No tickets yet.</p>}
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="overview-panel">
            <div className="panel-header">
              <h2>Category Breakdown</h2>
            </div>
            <div className="category-bars">
              {/* Calculate percentages dynamically */}
              {['Technical', 'Billing', 'Account', 'Delivery'].map(cat => {
                const count = getCategoryCount(cat);
                const percentage = tickets.length === 0 ? 0 : Math.round((count / tickets.length) * 100);
                return (
                  <div key={cat} className="category-bar-row">
                    <div className="category-bar-header">
                      <span>{cat}</span>
                      <span>{count} Tickets ({percentage}%)</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ 
                        width: `${percentage}%`,
                        background: cat === 'Technical' ? '#3b82f6' : cat === 'Billing' ? '#10b981' : cat === 'Account' ? '#8b5cf6' : '#f59e0b'
                      }}></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      </div>
      {/* --- END DASHBOARD OVERVIEW --- */}

      {showToast && (
        <div className="modern-toast">
          <CheckCircle size={20} color="#059669" />
          <span>Reply sent successfully!</span>
        </div>
      )}
    </div>
  );
}