import React, { useState, useEffect, useRef } from 'react';
import './SteamStyle.css';
import io from 'socket.io-client';

const socket = io.connect("http://localhost:5000");

const Dashboard = ({ user }) => {
  // --- 1. STATE MANAGEMENT ---
  const [tab, setTab] = useState('store');
  const [balance, setBalance] = useState(user.balance);
  const [myGames, setMyGames] = useState([]);
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [profilePic, setProfilePic] = useState(user.profile_pic);
  const [giftCode, setGiftCode] = useState('');
  const [friendName, setFriendName] = useState('');
  const [activeChat, setActiveChat] = useState(null);
  const [message, setMessage] = useState("");
  const [chatLog, setChatLog] = useState([]);
  const [newPass, setNewPass] = useState('');
  const chatLogRef = useRef(null);

  // --- 2. GAME DATA ---
  const testGames = [
    { name: "Cyberpunk 2077", price: 60, image: "/cyberpunk.jpg" },
    { name: "The Witcher 3", price: 40, image: "/witcher.jpg" },
    { name: "Elden Ring", price: 55, image: "/elden.jpg" },
    { name: "Ghost of Tsushima", price: 50, image: "/ghost.jpg" }
  ];

  // --- 3. INSTANT UPDATE FUNCTIONS ---

  const handlePurchase = async (game) => {
    try {
      const res = await fetch('http://localhost:5000/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, gameName: game.name, price: game.price })
      });

      if (res.ok) {
        const data = await res.json();
        setBalance(data.newBalance); // Instant UI Update
        setMyGames(prev => [...prev, game.name]); // Instant Library Update
        alert(`Success! ${game.name} is now in your library.`);
      } else {
        const errorMsg = await res.text();
        alert("Purchase Failed: " + errorMsg);
      }
    } catch (err) {
      console.error("Purchase error:", err);
    }
  };

  const redeemGiftCard = async () => {
    if (!giftCode.trim()) return alert("Please enter a code.");
    try {
      const res = await fetch('http://localhost:5000/redeem-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, code: giftCode })
      });

      if (res.ok) {
        const data = await res.json();
        setBalance(prev => parseFloat(prev) + parseFloat(data.amountAdded)); // Instant UI Update
        setGiftCode('');
        alert(`Success! $${data.amountAdded} added to your Scorpio Wallet.`);
      } else {
        const errText = await res.text();
        alert("Error: " + errText);
      }
    } catch (err) {
      console.error("Redemption error:", err);
    }
  };

  // --- 4. DATA SYNC & SOCKETS ---

  const refreshData = () => {
    fetch(`http://localhost:5000/library/${user.id}`).then(res => res.json()).then(data => setMyGames(data.map(g => g.game_name)));
    fetch(`http://localhost:5000/friends/${user.id}`).then(res => res.json()).then(data => setFriends(data));
    fetch(`http://localhost:5000/friend-requests/${user.id}`).then(res => res.json()).then(data => setRequests(data));
  };

  useEffect(() => {
    refreshData();
    socket.emit('user_online', user.id);
    socket.on('get_online_users', (list) => setOnlineUsers(list));
    socket.on('new_msg_notification', (d) => { if(d.to === user.id && tab !== 'chat') alert(`New message from ${d.from}!`); });
    socket.on("receive_message", (d) => { 
        const roomId = [user.id, activeChat?.id].sort().join("_");
        if (d.room === roomId) setChatLog(p => [...p, d]); 
    });
    return () => socket.off();
  }, [user.id, activeChat, tab]);

  useEffect(() => {
    if (chatLogRef.current) chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
  }, [chatLog]);

  const startChat = (f) => {
    setActiveChat(f);
    setTab('chat');
    const roomId = [user.id, f.id].sort().join("_");
    socket.emit("join_chat", roomId);
    fetch(`http://localhost:5000/messages/${roomId}`).then(res => res.json()).then(data => setChatLog(data));
  };

  const sendMessage = () => {
    if (!message.trim() || !activeChat) return;
    const msgData = { 
        room: [user.id, activeChat.id].sort().join("_"), 
        author: user.username, 
        text: message, 
        receiverId: activeChat.id,
        senderId: user.id 
    };
    socket.emit("send_message", msgData);
    setMessage("");
  };

  // --- 5. UI RENDER ---

  return (
    <div className="dashboard">
      <nav className="steam-nav">
        <div className="nav-left">
          <h2 onClick={() => setTab('store')} style={{ color: '#66c0f4', marginRight: '30px', cursor: 'pointer' }}>SCORPIO</h2>
          {['store', 'library', 'friends', 'chat', 'profile'].map(t => (
            <span key={t} className={`nav-item ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t.toUpperCase()}</span>
          ))}
        </div>
        <div className="nav-right" style={{display:'flex', alignItems:'center', gap:'10px'}}>
            <div style={{textAlign:'right'}}><small>{user.username}</small><br/><b style={{color:'#a3d200'}}>${parseFloat(balance).toFixed(2)}</b></div>
            <img src={profilePic || "https://via.placeholder.com/40"} className="pfp-circular nav-avatar" alt="p" />
        </div>
      </nav>

      <div className="container" style={{padding:'30px', maxWidth:'1100px', margin:'0 auto'}}>
        
        {/* STORE TAB */}
        {tab === 'store' && (
          <div className="games-grid">
            {testGames.map(g => (
              <div key={g.name} className="game-card" style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                <img src={g.image} style={{width:'100%', height:'180px', objectFit:'cover', borderRadius:'4px'}} alt="game" />
                <h3>{g.name}</h3>
                <p style={{color:'#a3d200'}}>${g.price}</p>
                <button className="steam-btn" onClick={() => handlePurchase(g)} disabled={myGames.includes(g.name)}>
                  {myGames.includes(g.name) ? "OWNED" : "PURCHASE"}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* LIBRARY TAB */}
        {tab === 'library' && (
          <div className="games-grid">
            {myGames.map((gName, i) => {
              const gInfo = testGames.find(x => x.name === gName);
              return (
                <div key={i} className="game-card" style={{borderLeft:'4px solid #a3d200'}}>
                   {gInfo && <img src={gInfo.image} style={{width:'100%', height:'100px', objectFit:'cover', opacity:0.6}} alt="lib" />}
                   <h3>{gName}</h3>
                   <button className="steam-btn">PLAY</button>
                </div>
              );
            })}
          </div>
        )}

        {/* FRIENDS TAB */}
        {tab === 'friends' && (
          <div>
            <div className="auth-box" style={{width:'100%', marginBottom:'20px'}}>
                <input className="steam-input" placeholder="Search Username..." value={friendName} onChange={e=>setFriendName(e.target.value)} />
                <button className="steam-btn" onClick={() => fetch('http://localhost:5000/add-friend', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({userId:user.id, friendUsername:friendName})}).then(async r => alert(await r.text()))}>ADD</button>
            </div>
            <h3>Friends List</h3>
            <div className="games-grid">
              {friends.map(f => (
                <div key={f.id} className="game-card">
                  <div style={{position:'relative', width:'60px', margin:'0 auto'}}>
                    <img src={f.profile_pic || "https://via.placeholder.com/60"} className="pfp-circular" style={{width:'60px', height:'60px'}} alt="f" />
                    <div style={{position:'absolute', bottom:0, right:0, width:'12px', height:'12px', borderRadius:'50%', background: onlineUsers.includes(String(f.id)) ? '#a3d200' : '#555', border:'2px solid #1b2838'}}></div>
                  </div>
                  <h4>{f.username}</h4>
                  <button className="steam-btn" onClick={() => startChat(f)}>MESSAGE</button>
                </div>
              ))}
            </div>
            <h3 style={{marginTop:'30px'}}>Requests</h3>
            {requests.map(r => <div key={r.requestId} className="game-card">{r.username} <button className="steam-btn" onClick={() => fetch('http://localhost:5000/accept-friend', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({requestId:r.requestId})}).then(()=>refreshData())}>ACCEPT</button></div>)}
          </div>
        )}

        {/* CHAT TAB */}
        {tab === 'chat' && (
            <div className="chat-window">
                {activeChat ? (
                    <div style={{display:'flex', flexDirection:'column', height:'100%'}}>
                        <div className="chat-log" ref={chatLogRef} style={{flex:1, overflowY:'auto', padding:'10px'}}>
                            {chatLog.map((m,i) => (
                                <div key={i} style={{alignSelf: m.author === user.username ? 'flex-end' : 'flex-start', margin:'5px', maxWidth:'70%'}}>
                                    <div style={{background: m.author === user.username ? '#1a44c2' : '#2a475e', padding:'10px', borderRadius:'10px'}}>{m.text}</div>
                                    <small style={{fontSize:'9px', opacity:0.5, textAlign: m.author === user.username ? 'right' : 'left', display:'block'}}>{m.time}</small>
                                </div>
                            ))}
                        </div>
                        <div style={{display:'flex', gap:'10px', padding:'15px', background:'#171a21'}}>
                            <input className="steam-input" value={message} onChange={e=>setMessage(e.target.value)} onKeyPress={e=>e.key==='Enter' && sendMessage()} placeholder="Enter message..." />
                            <button className="steam-btn" style={{width:'100px'}} onClick={sendMessage}>SEND</button>
                        </div>
                    </div>
                ) : <p style={{textAlign:'center', padding:'50px'}}>Select a friend to chat.</p>}
            </div>
        )}

        {/* PROFILE TAB */}
        {tab === 'profile' && (
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
                <div className="auth-box" style={{width:'100%', textAlign:'center'}}>
                    <h3>Profile Picture</h3>
                    <img src={profilePic || "https://via.placeholder.com/100"} className="pfp-circular" style={{width:'100px', height:'100px', marginBottom:'15px'}} alt="p" />
                    <input type="file" onChange={e => {
                        const fd = new FormData(); fd.append('avatar', e.target.files[0]); fd.append('userId', user.id);
                        fetch('http://localhost:5000/update-avatar', {method:'POST', body:fd}).then(r=>r.json()).then(d=>setProfilePic(d.imageUrl));
                    }} />
                    <button className="steam-btn" style={{marginTop:'10px', background:'#c21a1a'}} onClick={()=>{ setProfilePic(null); fetch('http://localhost:5000/remove-avatar', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({userId:user.id})}); }}>REMOVE PHOTO</button>
                </div>
                <div className="auth-box" style={{width:'100%'}}>
                    <h3>Scorpio Wallet</h3>
                    <input className="steam-input" placeholder="REDEEM CODE" value={giftCode} onChange={e=>setGiftCode(e.target.value.toUpperCase())} />
                    <button className="steam-btn" onClick={redeemGiftCard}>REDEEM</button>
                </div>
                <div className="auth-box" style={{width:'100%', gridColumn:'1 / span 2'}}>
                    <h3>Security Settings</h3>
                    <input className="steam-input" type="password" placeholder="New Password" onChange={e=>setNewPass(e.target.value)} />
                    <button className="steam-btn" onClick={()=>fetch('http://localhost:5000/update-password', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({userId:user.id, newPassword:newPass})}).then(()=>alert("Password Updated!"))}>CHANGE PASSWORD</button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;