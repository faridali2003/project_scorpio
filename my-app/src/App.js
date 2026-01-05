import React, { useState } from 'react';
import './SteamStyle.css';
import Dashboard from './Dashboard';

// 1. THE IMPROVED PANDA COMPONENT
const Panda = ({ covering, lookAngle }) => (
  <div className={`panda-container ${covering ? 'covering-eyes' : ''}`}>
    <div className="panda-ear ear-left"></div>
    <div className="panda-ear ear-right"></div>
    <div className="panda-face">
      <div className="panda-eye eye-left">
        <div className="panda-pupil" style={{ transform: `translateX(${lookAngle}px) translateY(2px)` }}></div>
      </div>
      <div className="panda-eye eye-right">
        <div className="panda-pupil" style={{ transform: `translateX(${lookAngle}px) translateY(2px)` }}></div>
      </div>
    </div>
    <div className="panda-hand hand-left"></div>
    <div className="panda-hand hand-right"></div>
  </div>
);

// 2. MAIN APP ENTRY
function App() {
  const [user, setUser] = useState(null);

  return (
    <div className="App">
      {!user ? (
        <LandingPage onLoginSuccess={(data) => setUser(data)} />
      ) : (
        <Dashboard user={user} />
      )}
    </div>
  );
}

// 3. FULL LANDING PAGE WITH PANDA LOGIC
function LandingPage({ onLoginSuccess }) {
  const [mode, setMode] = useState('login'); 
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [lookAngle, setLookAngle] = useState(0); 
  const [formData, setFormData] = useState({ 
    email: '', 
    password: '', 
    username: '', 
    securityAnswer: '',
    newPassword: '' 
  });

  // Calculate eye movement
  const handleLook = (e) => {
    const length = e.target.value.length;
    const angle = Math.min(Math.max((length / 3) - 5, -5), 5);
    setLookAngle(angle);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let endpoint = mode === 'reset' ? 'reset-password' : mode;

    try {
      const response = await fetch(`http://localhost:5000/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        if (mode === 'login') {
          const data = await response.json();
          onLoginSuccess(data);
        } else {
          alert(mode === 'register' ? "Account Created!" : "Password Reset Successfully!");
          setMode('login');
        }
      } else {
        const errText = await response.text();
        alert("Error: " + errText);
      }
    } catch (err) {
      alert("Backend Not Running!");
    }
  };

  return (
    <div className="steam-container">
      <div className="auth-box">
        {/* Panda sits at the top and reacts to state */}
        <Panda covering={isPasswordFocused} lookAngle={lookAngle} />

        <h2 style={{textAlign: 'center', marginBottom: '20px'}}>
            {mode === 'login' && 'SIGN IN'}
            {mode === 'register' && 'CREATE ACCOUNT'}
            {mode === 'reset' && 'RESET PASSWORD'}
        </h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          <input className="steam-input" type="email" placeholder="EMAIL ADDRESS" required 
            onFocus={() => setIsPasswordFocused(false)}
            onChange={(e)=> {
                setFormData({...formData, email: e.target.value});
                handleLook(e);
            }} />

          {mode === 'register' && (
            <input className="steam-input" type="text" placeholder="CHOOSE USERNAME" required 
              onFocus={() => setIsPasswordFocused(false)}
              onChange={(e)=> {
                  setFormData({...formData, username: e.target.value});
                  handleLook(e);
              }} />
          )}

          {(mode === 'login' || mode === 'register') && (
            <input 
              className="steam-input" 
              type="password" 
              placeholder="PASSWORD" 
              required 
              onFocus={() => setIsPasswordFocused(true)}  
              onBlur={() => setIsPasswordFocused(false)} 
              onChange={(e)=>setFormData({...formData, password: e.target.value})} 
            />
          )}

          {(mode === 'register' || mode === 'reset') && (
            <input className="steam-input" type="text" placeholder="SECURITY QUESTION: YOUR FIRST PET?" required 
              onFocus={() => setIsPasswordFocused(false)}
              onChange={(e)=>setFormData({...formData, securityAnswer: e.target.value})} />
          )}

          {mode === 'reset' && (
            <input 
              className="steam-input" 
              type="password" 
              placeholder="ENTER NEW PASSWORD" 
              required 
              onFocus={() => setIsPasswordFocused(true)} 
              onBlur={() => setIsPasswordFocused(false)}
              onChange={(e)=>setFormData({...formData, newPassword: e.target.value})} 
            />
          )}

          <button type="submit" className="steam-btn">
            {mode === 'login' ? 'Sign In' : mode === 'register' ? 'Join Scorpio' : 'Update Password'}
          </button>
        </form>

        <div style={{ marginTop: '20px', fontSize: '13px', textAlign: 'center' }}>
          {mode === 'login' ? (
            <>
              <p onClick={() => { setMode('register'); setIsPasswordFocused(false); }} style={{cursor:'pointer', color:'#66c0f4'}}>Create a new account</p>
              <p onClick={() => { setMode('reset'); setIsPasswordFocused(false); }} style={{cursor:'pointer', color:'#afafaf', fontSize:'11px'}}>Forgot password?</p>
            </>
          ) : (
            <p onClick={() => { setMode('login'); setIsPasswordFocused(false); }} style={{cursor:'pointer', color:'#66c0f4'}}>Back to Login</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;