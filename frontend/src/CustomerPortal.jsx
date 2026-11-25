import { useState, useEffect } from 'react';
import { Headphones, CheckCircle, XCircle, Mic, MicOff, Volume2, X, Settings as SettingsIcon, Paperclip } from 'lucide-react';
import Settings from './Settings';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function CustomerPortal({ user, onLogout }) {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  const [customerReply, setCustomerReply] = useState('');
  const [chatFile, setChatFile] = useState(null);
  const [uploadingChat, setUploadingChat] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recog = new SpeechRecognition();
      recog.continuous = false;
      recog.interimResults = false;
      
      recog.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setMessage((prev) => prev + " " + transcript);
        setIsListening(false);
      };

      recog.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recog.onend = () => setIsListening(false);
      setRecognition(recog);
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
    }
  };

  const speakReply = async (text, languageName) => {
    try {
      const res = await fetch(`${API_URL}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text, lang: languageName || "English" })
      });
      
      if (!res.ok) throw new Error("Failed to generate audio");
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play();
      
    } catch (err) {
      console.error(err);
      alert("Audio generation failed. Make sure the backend is running.");
    }
  };

  const fetchMyTickets = async () => {
    try {
      const res = await fetch(`${API_URL}/api/tickets/user/${user.email}`);
      const data = await res.json();
      setTickets(data);
      
      if (selectedTicket) {
        const updated = data.find(t => t.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
      }
    } catch (err) {
      console.error("Failed to fetch tickets", err);
    }
  };

  useEffect(() => {
    fetchMyTickets();
  }, [user.email]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const uploadFile = async (fileToUpload) => {
    if (!fileToUpload) return null;
    const formData = new FormData();
    formData.append("file", fileToUpload);

    try {
      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      return data.file_url;
    } catch (err) {
      console.error("Upload failed", err);
      alert("Failed to upload file.");
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    let uploadedUrl = null;
    if (file) {
      setUploading(true);
      uploadedUrl = await uploadFile(file);
      setUploading(false);
    }

    try {
      const res = await fetch(`${API_URL}/api/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            name: user.name, 
            email: user.email, 
            message,
            attachment_url: uploadedUrl 
        })
      });
      if (res.ok) {
        setMessage('');
        setFile(null);
        setShowSuccess(true);
        fetchMyTickets(); 
        setTimeout(() => setShowSuccess(false), 5000); 
      }
    } catch (err) {
      alert("Error submitting ticket. Is the backend running?");
    }
    setSubmitting(false);
  };

  const handleSendMessage = async () => {
    if (!customerReply.trim() && !chatFile) return;

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
          sender: "customer", 
          text: customerReply,
          attachment_url: uploadedUrl
        })
      });
      
      if (res.ok) {
        setCustomerReply('');
        setChatFile(null);
        await fetchMyTickets(); 
      }
    } catch (err) {
      alert("Failed to send message.");
    }
    setUploadingChat(false);
  };

  const getStatusColor = (status) => {
    if (status === 'Resolved') return 'badge green';
    if (status === 'In Progress') return 'badge orange';
    return 'badge blue';
  };

  if (showSettings) {
    return <Settings user={user} role="customer" onBack={() => setShowSettings(false)} onLogout={onLogout} />;
  }

  // --- FULL SCREEN DETAILS VIEW ---
  if (selectedTicket) {
    return (
      <div className="customer-portal-layout">
        <header className="top-navbar">
          <div className="nav-brand" style={{ cursor: 'pointer' }} onClick={() => setSelectedTicket(null)}>
            <X size={24} style={{ marginRight: '10px' }} />
            <div>
              <h1>Back to Dashboard</h1>
            </div>
          </div>
          <div className="nav-user">
            <span>Ticket #{selectedTicket.id}</span>
            <span className={getStatusColor(selectedTicket.status)}>{selectedTicket.status}</span>
          </div>
        </header>

        <div className="full-screen-ticket" style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', width: '100%', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          
          {/* LEFT SIDE: Ticket Info */}
          <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="screenshot-section" style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h4>Customer Information</h4>
              <div className="info-grid">
                <span className="info-label">Name:</span> <span className="info-value">{selectedTicket.customer_name}</span>
                <span className="info-label">Email:</span> <span className="info-value">{selectedTicket.email}</span>
              </div>
            </div>

            <div className="screenshot-section" style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h4>Customer Message</h4>
              <div className="message-box-blue">
                {selectedTicket.message}
              </div>
              
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
                <div style={{marginTop: '10px'}}>
                  <span className="info-label" style={{fontSize: '0.8rem'}}>English Translation:</span>
                  <div className="message-box-blue" style={{background: '#f8fafc', fontStyle: 'italic', color: '#64748b', border: '1px solid #e2e8f0'}}>
                    {selectedTicket.english_translation}
                  </div>
                </div>
              )}
            </div>

            <div className="screenshot-section" style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h4>AI Analysis</h4>
              <div className="ai-grid">
                <div className="ai-row">
                  <span className="info-label">Category:</span> 
                  <span className="tag-blue">{selectedTicket.category}</span>
                </div>
                <div className="ai-row">
                  <span className="info-label">Priority:</span> 
                  <span className={`tag-${selectedTicket.priority.toLowerCase()}`}>{selectedTicket.priority}</span>
                </div>
                <div className="ai-row">
                  <span className="info-label">Sentiment:</span> 
                  <span className={`tag-${selectedTicket.sentiment.toLowerCase()}`}>{selectedTicket.sentiment}</span>
                </div>
                <div className="ai-row" style={{alignItems: 'flex-start'}}>
                  <span className="info-label">Summary:</span> 
                  <span className="summary-text-small">{selectedTicket.summary}</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: Chat History */}
          <div style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column', background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
              <h3>Conversation History</h3>
            </div>
            
            <div className="chat-history" style={{ flex: 1, minHeight: '300px' }}>
              {selectedTicket.messages && selectedTicket.messages.map((msg, index) => {
                const isCustomer = msg.sender === 'customer';
                const isAi = msg.sender === 'ai';
                
                return (
                  <div key={index} className={`chat-row ${isCustomer ? 'customer' : 'agent'}`}>
                    <div className={`chat-bubble-container ${isCustomer ? 'customer' : 'agent'}`}>
                      <div className={`chat-bubble ${isCustomer ? 'customer' : isAi ? 'ai-suggestion' : 'agent'}`}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                          <span className="chat-sender">
                            {isCustomer ? 'You' : isAi ? 'AI Suggested Reply' : 'Support Agent'}
                          </span>
                          {isAi && (
                            <button
                              className="speak-btn-small"
                              style={{ padding: '2px 8px', fontSize: '0.7rem', background: '#dcfce7', border: '1px solid #bbf7d0', color: '#166534' }}
                              onClick={() => speakReply(msg.text, selectedTicket.language)}
                            >
                              <Volume2 size={12} /> Listen
                            </button>
                          )}
                        </div>
                        
                        {msg.text && <p>{msg.text}</p>}
                        
                        {msg.attachment_url && (
                          <div style={{ marginTop: '8px' }}>
                            {msg.attachment_url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                              <img src={`${API_URL}${msg.attachment_url}`} alt="Attachment" style={{ maxWidth: '100%', borderRadius: '6px' }} />
                            ) : (
                              <a href={`${API_URL}${msg.attachment_url}`} target="_blank" rel="noopener noreferrer" style={{ color: isCustomer ? '#e0e7ff' : '#2563eb', textDecoration: 'underline', fontSize: '0.85rem' }}>
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
                <input 
                  type="file" 
                  id="chat-file-upload" 
                  style={{ display: 'none' }} 
                  onChange={(e) => setChatFile(e.target.files[0])}
                />
                <label 
                  htmlFor="chat-file-upload" 
                  style={{ cursor: 'pointer', padding: '10px', background: '#f1f5f9', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '44px' }}
                  title="Attach a file"
                >
                  <Paperclip size={20} color="#475569" />
                </label>

                <textarea 
                  className="chat-input" 
                  placeholder="Reply to the agent..." 
                  value={customerReply}
                  onChange={(e) => setCustomerReply(e.target.value)}
                  rows="2"
                  style={{ flex: 1 }}
                />
                <button className="primary-btn" onClick={handleSendMessage} disabled={uploadingChat} style={{ height: '44px', padding: '0 24px' }}>
                  {uploadingChat ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // --- MAIN DASHBOARD VIEW ---
  return (
    <div className="customer-portal-layout">
      <header className="top-navbar">
        <div className="nav-brand">
          <Headphones size={28} />
          <div>
            <h1>Support Ticket Analyzer</h1>
            <p>AI-powered customer support dashboard</p>
          </div>
        </div>
        <div className="nav-user">
          <span>Welcome, {user.name}</span>
          <button onClick={() => setShowSettings(true)} className="logout-btn" style={{background: '#334155', color: 'white', display: 'flex', alignItems: 'center', gap: '6px'}}>
            <SettingsIcon size={16} /> Settings
          </button>
          <button onClick={onLogout} className="logout-btn">Logout</button>
        </div>
      </header>

      <div className="portal-content">
        <div className="create-ticket-card">
          <h2>Create New Ticket</h2>
          <form onSubmit={handleSubmit} className="horizontal-form">
            <div className="form-group">
              <label>Customer Name</label>
              <input type="text" value={user.name} disabled />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" value={user.email} disabled />
            </div>
            <div className="form-group full-width">
              <label>Support Message (Type in your mother tongue or use the Mic)</label>
              <div className="textarea-wrapper">
                <textarea 
                  rows="3" 
                  placeholder="Describe your issue here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                ></textarea>
                {recognition && (
                  <button 
                    type="button" 
                    className={`mic-btn ${isListening ? 'listening' : ''}`}
                    onClick={toggleListening}
                    title="Speak your complaint"
                  >
                    {isListening ? <Mic size={20} /> : <MicOff size={20} />}
                  </button>
                )}
              </div>
            </div>
            
            <div className="form-group full-width">
              <label>Attach an Image, Video, or PDF (Optional)</label>
              <input 
                type="file" 
                accept="image/*, video/*, application/pdf" 
                onChange={handleFileChange} 
                className="file-input"
              />
            </div>

            <button type="submit" className="primary-btn analyze-btn" disabled={submitting || uploading}>
              {submitting ? 'Analyzing...' : uploading ? 'Uploading file...' : '✨ Create & Analyze Ticket'}
            </button>
          </form>
        </div>

        {showSuccess && (
          <div className="success-alert">
            <CheckCircle size={20} />
            <span>Ticket created and analyzed successfully!</span>
            <XCircle size={20} className="close-alert" onClick={() => setShowSuccess(false)} />
          </div>
        )}

        <div className="history-section">
          <h2>All Support Tickets</h2>
          <div className="tickets-grid">
            {tickets.length === 0 ? (
              <p style={{color: '#6b7280'}}>No tickets yet. Create one above!</p>
            ) : (
              tickets.map(t => (
                <div key={t.id} className="ticket-card">
                  <div className="card-header">
                    <h3>Ticket #{t.id}</h3>
                    <span className={getStatusColor(t.status)}>{t.status}</span>
                  </div>
                  <div className="card-body">
                    <p><strong>Category:</strong> {t.category}</p>
                    <p><strong>Language:</strong> {t.language || 'English'}</p>
                    <p className="summary-text"><strong>Summary:</strong> {t.summary}</p>
                  </div>
                  <div className="card-footer">
                    <button onClick={() => setSelectedTicket(t)} className="view-details-btn">
                      View Details & Chat
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}