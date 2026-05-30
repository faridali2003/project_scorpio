import React, { useState, useEffect, useRef, useCallback } from 'react';
import './SteamStyle.css';
import io from 'socket.io-client';
import { api, BASE, encodeGame, chatRoomId, sameUserId, getAuthUserId, avatarUrl } from './api/client';
import { GAMES, gameByName, isPlayable, scorpioOriginals } from './data/games';

const socket = io(BASE, { autoConnect: true });

const GENRE_COLORS = {
  "RPG": "tag-blue", "Action": "tag-orange", "Indie": "tag-green",
  "Roguelike": "tag-purple", "Open World": "tag-blue"
};

// ─── STAR RATING ───────────────────────────────────────────────────────────────
function StarRating({ value, onChange, display = false }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map(n => (
        <span
          key={n}
          className={`star${display ? ' display' : ''}${(hover || value) >= n ? ' filled' : ''}`}
          onClick={() => !display && onChange && onChange(n)}
          onMouseEnter={() => !display && setHover(n)}
          onMouseLeave={() => !display && setHover(0)}
        >★</span>
      ))}
    </div>
  );
}

// ─── REVIEW MODAL ──────────────────────────────────────────────────────────────
function ReviewModal({ game, userId, onClose, addToast, onReviewed }) {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [myReview, setMyReview] = useState(null);

  useEffect(() => {
    api(`/reviews?game=${encodeGame(game.name)}`).then(({ data }) => setReviews(Array.isArray(data) ? data : []));
    api(`/my-review/${getAuthUserId() ?? userId}?game=${encodeGame(game.name)}`).then(({ data }) => {
      if (data) { setMyReview(data); setRating(data.rating); setText(data.review_text || ''); }
    });
  }, [game.name, userId]);

  const submit = async () => {
    if (!rating) return addToast('Please select a rating.', 'error', '⭐');
    setLoading(true);
    const { ok } = await api('/review', {
      method: 'POST',
      body: JSON.stringify({ gameName: game.name, rating, reviewText: text })
    });
    setLoading(false);
    if (ok) {
      addToast('Review saved!', 'success', '✍️');
      onReviewed();
      onClose();
    } else {
      addToast('You must own this game to review it.', 'error', '🚫');
    }
  };

  const avgRating = reviews.length
    ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="font-display">{game.name} — Reviews</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {avgRating && (
            <div className="flex items-center gap-2 mb-4">
              <StarRating value={Math.round(avgRating)} display />
              <span style={{ color: 'var(--accent-yellow)', fontWeight: 600 }}>{avgRating}</span>
              <span className="text-muted text-sm">({reviews.length} reviews)</span>
            </div>
          )}

          <div className="divider" />
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '10px' }}>
            {myReview ? 'Edit Your Review' : 'Write a Review'}
          </div>
          <StarRating value={rating} onChange={setRating} />
          <textarea
            className="steam-input mt-3"
            placeholder="Share your thoughts... (optional)"
            value={text}
            onChange={e => setText(e.target.value)}
            rows={3}
          />
          <button className="btn btn-primary btn-full mt-3" onClick={submit} disabled={loading}>
            {loading ? <span className="spinner" /> : null}
            {myReview ? 'Update Review' : 'Submit Review'}
          </button>

          {reviews.length > 0 && (
            <>
              <div className="divider" />
              <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {reviews.map(r => (
                  <div key={r.id} className="review-card">
                    <div className="review-header">
                      <img
                        src={avatarUrl(r.profile_pic, r.author, 32)}
                        className="avatar avatar-sm"
                        alt=""
                      />
                      <span className="review-author">{r.author}</span>
                      <StarRating value={r.rating} display />
                      <span className="review-date">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    {r.review_text && <p className="review-text">{r.review_text}</p>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PUBLIC PROFILE MODAL ──────────────────────────────────────────────────────
function PublicProfileModal({ userId, onClose, currentUserId, friends, onAddFriend }) {
  const [profile, setProfile] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setLoadError(null);
    setProfile(null);
    Promise.all([api(`/profile/${userId}`), api(`/me/achievements`)])
      .then(([profRes, achRes]) => {
        if (profRes.ok && profRes.data?.username) setProfile(profRes.data);
        else setLoadError(profRes.data?.error || 'Could not load profile.');
        setAchievements(achRes.ok && achRes.data?.unlocked ? achRes.data.unlocked : []);
      })
      .catch(() => setLoadError('Could not load profile.'))
      .finally(() => setLoading(false));
  }, [userId]);

  const isFriend = friends.some(f => sameUserId(f.id, userId));

  if (loading) {
    return (
      <div className="modal-backdrop">
        <div className="modal" style={{ display: 'grid', placeItems: 'center', minHeight: '200px' }}>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (loadError || !profile) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-body" style={{ textAlign: 'center', padding: 32 }}>
            <p className="text-secondary">{loadError || 'Profile not found.'}</p>
            <button type="button" className="btn btn-secondary mt-3" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  const showAddFriend = !isFriend && String(userId) !== String(currentUserId);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal public-profile-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <h3 className="font-display">{profile.username}</h3>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="public-profile">
            <img
              src={avatarUrl(profile.profile_pic, profile.username, 128)}
              className="avatar avatar-lg"
              alt=""
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="profile-stats-mini">
                <div className="profile-stat-mini">Games <span>{profile.game_count ?? 0}</span></div>
                <div className="profile-stat-mini">Friends <span>{profile.friend_count ?? 0}</span></div>
                <div className="profile-stat-mini">Reviews <span>{profile.review_count ?? 0}</span></div>
                <div className="profile-stat-mini">Achievements <span>{profile.achievement_count ?? 0}</span></div>
              </div>
            </div>
          </div>
          {profile.bio && <p className="text-secondary" style={{ marginBottom: 16, lineHeight: 1.6 }}>{profile.bio}</p>}
          <div className="section-title" style={{ marginBottom: 12 }}>Achievements</div>
          {achievements.length === 0 ? (
            <p className="text-muted text-sm" style={{ marginBottom: 16 }}>No achievements unlocked yet.</p>
          ) : (
            <div className="achievements-grid" style={{ marginBottom: 16 }}>
              {achievements.map(a => (
                <div key={`${a.achievement_key}-${a.id}`} className="achievement-card unlocked">
                  <span className="achievement-icon">{a.icon || '🏆'}</span>
                  <div>
                    <div className="achievement-name">{a.achievement_name}</div>
                    {a.description && <div className="achievement-desc">{a.description}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {showAddFriend && (
            <button
              type="button"
              className="btn btn-primary btn-full"
              onClick={() => onAddFriend && onAddFriend(profile.username)}
            >
              Add Friend
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const NOTIF_TYPE_ICONS = {
  system: 'ℹ️',
  purchase: '🛒',
  wallet: '💰',
  friend_request: '👋',
  friend_accepted: '✅',
  message: '💬',
  achievement: '🏆',
};

function typeIcons(type) {
  return NOTIF_TYPE_ICONS[type] || '🔔';
}

function NotificationsPanel({ notifications, markAllRead, dismiss, onClose }) {
  return (
    <div className="notifications-panel">
      <div className="notif-header">
        <span>Notifications</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={markAllRead}>Mark all read</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
      </div>
      <div className="notif-list">
        {notifications.length === 0 ? (
          <div className="notif-item text-muted" style={{ border: 'none' }}>You&apos;re all caught up.</div>
        ) : (
          notifications.map(n => (
            <div key={n.id} className={`notif-item${!n.is_read ? ' unread' : ''}`}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div className="notif-type-icon">{typeIcons(n.type)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="notif-title">{n.title}</div>
                  {n.message && <div className="notif-msg">{n.message}</div>}
                  <div className="notif-time">
                    {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                  </div>
                </div>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => dismiss(n.id)} title="Dismiss">×</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function EmptyState({ icon, title, text }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <div className="empty-state-title">{title}</div>
      {text ? <p className="empty-state-text">{text}</p> : null}
    </div>
  );
}

function PageHeader({ title, desc, children }) {
  return (
    <div className="page-header">
      <div>
        <div className="page-header-title">{title}</div>
        {desc && <div className="page-header-desc">{desc}</div>}
      </div>
      {children ? <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>{children}</div> : null}
    </div>
  );
}

const NAV_TABS = [
  { id: 'store', label: 'Store', icon: '🛒' },
  { id: 'library', label: 'Library', icon: '📚' },
  { id: 'wishlist', label: 'Wishlist', icon: '⭐' },
  { id: 'friends', label: 'Friends', icon: '👥' },
  { id: 'chat', label: 'Chat', icon: '💬' },
  { id: 'achievements', label: 'Achievements', icon: '🏆' },
  { id: 'profile', label: 'Profile', icon: '👤' },
];

export default function Dashboard({ user, theme, updateTheme, onLogout, addToast, onUserSync, onPlayGame }) {
  const userId = getAuthUserId() ?? Number(user.id);
  const refreshTimerRef = useRef(null);
  const messagesEndRef = useRef(null);

  const [activeTab, setActiveTab] = useState('store');
  const [balance, setBalance] = useState(user.balance);
  const [library, setLibrary] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(() => new Set());

  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [addFriendName, setAddFriendName] = useState('');

  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgText, setMsgText] = useState('');
  const [typingUser, setTypingUser] = useState(null);

  const [achievementsData, setAchievementsData] = useState({ unlocked: [], all: [] });

  const [reviewGame, setReviewGame] = useState(null);
  const [profileModalId, setProfileModalId] = useState(null);

  const [bioDraft, setBioDraft] = useState(user.bio || '');
  const [redeemCode, setRedeemCode] = useState('');
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [storeGenre, setStoreGenre] = useState('all');
  const [avatarPreview, setAvatarPreview] = useState(user.profile_pic);

  const refreshData = useCallback(async (quiet = false) => {
    const uid = getAuthUserId();
    if (!uid) {
      if (!quiet) addToast('Session expired. Please sign in again.', 'error', '🔑');
      return;
    }
    const [lib, wish, fr, req, notif, usr] = await Promise.all([
      api('/me/library'),
      api('/me/wishlist'),
      api('/me/friends'),
      api('/me/friend-requests'),
      api('/me/notifications'),
      api('/me'),
    ]);
    if (lib.ok) setLibrary(Array.isArray(lib.data) ? lib.data : []);
    if (wish.ok) setWishlist(Array.isArray(wish.data) ? wish.data : []);
    if (fr.ok) setFriends((Array.isArray(fr.data) ? fr.data : []).map(f => ({ ...f, id: Number(f.id) })));
    if (req.ok) setRequests(Array.isArray(req.data) ? req.data : []);
    if (notif.ok) setNotifications(Array.isArray(notif.data) ? notif.data : []);
    if (usr.ok && usr.data) {
      setBalance(usr.data.balance);
      setBioDraft(usr.data.bio || '');
      if (usr.data.profile_pic) setAvatarPreview(usr.data.profile_pic);
      onUserSync?.({
        id: Number(usr.data.id),
        balance: usr.data.balance,
        bio: usr.data.bio,
        profile_pic: usr.data.profile_pic,
        theme: usr.data.theme,
        username: usr.data.username,
        email: usr.data.email,
      });
    }
  }, [addToast, onUserSync]);

  useEffect(() => { refreshData(); }, [refreshData]);

  useEffect(() => {
    const authId = getAuthUserId();
    if (authId && authId !== Number(user.id)) onUserSync?.({ id: authId });
  }, [user.id, onUserSync]);

  useEffect(() => {
    const onSocial = (payload) => {
      refreshData(true);
      if (payload?.type === 'friend_request') {
        addToast('New friend request!', 'info', '👋');
        setActiveTab('friends');
      } else if (payload?.type === 'friend_accepted') {
        addToast('You have a new friend!', 'success', '👥');
        setActiveTab('friends');
      } else if (payload?.type === 'message') {
        addToast('New message', 'info', '💬');
      }
    };
    socket.on('social_update', onSocial);
    return () => socket.off('social_update', onSocial);
  }, [refreshData, addToast]);

  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible') refreshData(true); };
    refreshTimerRef.current = setInterval(tick, 12000);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(refreshTimerRef.current);
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [refreshData]);

    useEffect(() => {
    socket.emit('user_online', userId);
    const onOnline = (ids) => setOnlineUsers(new Set((ids || []).map(Number)));
    const onMsgNotif = () => refreshData(true);
    socket.on('get_online_users', onOnline);
    socket.on('new_msg_notification', onMsgNotif);
    return () => {
      socket.off('get_online_users', onOnline);
      socket.off('new_msg_notification', onMsgNotif);
    };
  }, [userId, refreshData]);

  useEffect(() => {
    if (activeTab !== 'achievements' && activeTab !== 'profile') return;
    api(`/achievements/${userId}`).then(({ ok, data }) => {
      if (ok && data) setAchievementsData({ unlocked: data.unlocked || [], all: data.all || [] });
    });
  }, [activeTab, userId]);

  useEffect(() => {
    const activeRoom = activeChat ? chatRoomId(userId, Number(activeChat.id)) : null;
    const onRecv = (payload) => {
      const room = payload.room;
      if (room !== activeRoom) return;
      const incoming = {
        sender_id: Number(payload.senderId),
        receiver_id: Number(payload.receiverId),
        text: payload.text,
        time: payload.time,
        author: payload.author,
      };
      setMessages(prev => {
        const stripped = prev.filter(m => {
          if (m.optimistic && sameUserId(m.sender_id, incoming.sender_id) && m.text === incoming.text) return false;
          return true;
        });
        const dup = stripped.some(
          m => !m.optimistic && sameUserId(m.sender_id, incoming.sender_id) && m.text === incoming.text && m.time === incoming.time
        );
        if (dup) return stripped;
        return [...stripped, { ...incoming, id: `srv-${Date.now()}` }];
      });
    };
    socket.on('receive_message', onRecv);
    return () => socket.off('receive_message', onRecv);
  }, [userId, activeChat]);

  useEffect(() => {
    const onTyping = (data) => {
      if (activeChat && data.room === chatRoomId(userId, Number(activeChat.id))) setTypingUser(data.author || 'Someone');
    };
    const onStop = (data) => {
      if (activeChat && data.room === chatRoomId(userId, Number(activeChat.id))) setTypingUser(null);
    };
    socket.on('user_typing', onTyping);
    socket.on('user_stop_typing', onStop);
    return () => {
      socket.off('user_typing', onTyping);
      socket.off('user_stop_typing', onStop);
    };
  }, [userId, activeChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const markAllRead = async () => {
    const { ok } = await api('/notifications/read', { method: 'POST', body: JSON.stringify({}) });
    if (ok) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      addToast('Notifications marked read.', 'info', '✓');
    } else {
      addToast('Could not mark notifications.', 'error', '⚠️');
    }
  };

  const dismissNotif = async (id) => {
    const { ok } = await api(`/notifications/${id}`, { method: 'DELETE' });
    if (ok) setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const startChat = async (friend) => {
    const fid = Number(friend.id);
    if (!fid) return;
    const room = chatRoomId(userId, fid);
    socket.emit('join_chat', room);
    setActiveChat({ ...friend, id: fid });
    setTypingUser(null);
    const { ok, data } = await api(`/messages/${room}`);
    if (ok && Array.isArray(data)) {
      setMessages(data.map(m => ({
        ...m,
        id: m.id,
        sender_id: Number(m.sender_id),
        text: m.text || m.message_text,
        author: m.author,
      })));
    } else {
      setMessages([]);
      addToast('Could not load messages.', 'error', '💬');
    }
    await api('/messages/read', { method: 'POST', body: JSON.stringify({ roomId: room }) });
    refreshData();
  };

  const sendMessage = () => {
    if (!activeChat || !msgText.trim()) return;
    const fid = Number(activeChat.id);
    const room = chatRoomId(userId, fid);
    const text = msgText.trim();
    const optimistic = {
      id: `opt-${Date.now()}`,
      sender_id: userId,
      receiver_id: fid,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      author: user.username,
      optimistic: true,
    };
    setMessages(prev => [...prev, optimistic]);
    setMsgText('');
    socket.emit('stop_typing', { room });
    socket.emit('send_message', {
      room,
      author: user.username,
      text,
      receiverId: fid,
      senderId: userId,
    });
  };

  const acceptFriend = async (requestId) => {
    const { ok, data } = await api('/accept-friend', {
      method: 'POST',
      body: JSON.stringify({ requestId }),
    });
    if (ok) {
      addToast(data?.message || 'Friend request accepted.', 'success', '👥');
      refreshData();
    } else {
      addToast(data?.error || 'Could not accept request.', 'error', '⚠️');
    }
  };

  const addFriendByUsername = async (username) => {
    const u = (username || addFriendName || '').trim();
    if (!u) return addToast('Enter a username.', 'error', '👤');
    const { ok, data } = await api('/add-friend', {
      method: 'POST',
      body: JSON.stringify({ friendUsername: u }),
    });
    if (ok) {
      addToast(data?.message || 'Friend request sent!', 'success', '📨');
      setAddFriendName('');
      refreshData();
    } else {
      addToast(data?.error || 'Could not send request.', 'error', '⚠️');
    }
  };

  const runSearchUsers = async () => {
    const q = searchQ.trim();
    if (q.length < 2) return setSearchResults([]);
    const { ok, data } = await api(`/search-users?q=${encodeURIComponent(q)}`);
    if (ok && Array.isArray(data)) {
      setSearchResults(data.filter(u => !sameUserId(u.id, userId)));
    } else setSearchResults([]);
  };

  useEffect(() => {
    const t = setTimeout(runSearchUsers, 300);
    return () => clearTimeout(t);
  }, [searchQ]);

  const purchaseGame = async (game) => {
    const { ok, data } = await api('/purchase', {
      method: 'POST',
      body: JSON.stringify({ gameName: game.name, price: game.price }),
    });
    if (ok && data?.newBalance != null) {
      setBalance(data.newBalance);
      addToast(`${game.name} is yours!`, 'success', '🎮');
      refreshData();
    } else {
      addToast(data?.error || 'Purchase failed.', 'error', '🚫');
    }
  };

  const toggleWishlist = async (gameName) => {
    const { ok, data } = await api('/wishlist/toggle', {
      method: 'POST',
      body: JSON.stringify({ gameName }),
    });
    if (ok) {
      addToast(data?.added ? 'Added to wishlist' : 'Removed from wishlist', 'info', '⭐');
      refreshData();
    }
  };

  const redeemGift = async () => {
    const code = redeemCode.trim();
    if (!code) return;
    const { ok, data } = await api('/redeem-code', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
    if (ok && data?.newBalance != null) {
      setBalance(data.newBalance);
      addToast(`Redeemed +$${data.amountAdded}. New balance $${data.newBalance}`, 'success', '💳');
      setRedeemCode('');
      refreshData();
    } else {
      addToast(data?.error || 'Invalid code.', 'error', '⚠️');
    }
  };

  const saveBio = async () => {
    const { ok, data } = await api('/update-bio', { method: 'POST', body: JSON.stringify({ bio: bioDraft }) });
    if (ok) addToast('Bio updated.', 'success', '✏️');
    else addToast(data?.error || 'Could not save bio.', 'error', '⚠️');
  };

  const uploadAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('avatar', file);
    /* user from JWT */
    const { ok, data } = await api('/update-avatar', { method: 'POST', body: fd });
    if (ok && data?.imageUrl) {
      setAvatarPreview(data.imageUrl);
      addToast('Avatar updated.', 'success', '🖼️');
    } else addToast('Upload failed.', 'error', '⚠️');
  };

  const changePassword = async () => {
    const { ok, data } = await api('/update-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword: pwdCurrent, newPassword: pwdNew }),
    });
    if (ok) {
      addToast('Password updated.', 'success', '🔒');
      setPwdCurrent('');
      setPwdNew('');
    } else {
      addToast(data?.error || 'Could not update password.', 'error', '⚠️');
    }
  };

  const toggleAppTheme = async () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    const { ok } = await api('/update-theme', { method: 'POST', body: JSON.stringify({ theme: next }) });
    if (ok) updateTheme(next);
    else addToast('Could not save theme.', 'error', '⚠️');
  };

  const ownedNames = new Set(library.map(r => r.game_name));
  const wishNames = new Set(wishlist.map(r => r.game_name));
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const filteredStoreGames = (storeGenre === 'all'
    ? GAMES
    : GAMES.filter(g => g.genre === storeGenre || (g.tags && g.tags.includes(storeGenre))))
    .filter(g => storeGenre !== 'all' || !g.isScorpioOriginal);

  const genres = ['all', ...new Set(GAMES.map(g => g.genre))];

  const scorpioGames = scorpioOriginals();

  const renderStoreGameActions = (game, size = 'md') => {
    const owned = ownedNames.has(game.name);
    const btnClass = size === 'sm' ? 'btn btn-primary btn-sm' : 'btn btn-primary';
    if (owned) {
      return isPlayable(game) ? (
        <button type="button" className={btnClass} onClick={() => onPlayGame?.(game.id)}>Play</button>
      ) : (
        <span className="text-muted">In your library</span>
      );
    }
    return (
      <button type="button" className={btnClass} onClick={() => purchaseGame(game)}>
        {game.price === 0 ? (size === 'sm' ? 'Get free' : 'Add to library — Free') : (size === 'sm' ? 'Buy' : 'Buy now')}
      </button>
    );
  };

  return (
    <div className="app-shell">
      <div className="demo-banner">
        <span className="demo-banner-dot" />
        Scorpio v3 demo — portfolio storefront experience
      </div>

      <div className="layout-dashboard">
        <aside className="sidebar">
          <div className="sidebar-brand" onClick={() => setActiveTab('store')} role="presentation">
            <span className="sidebar-brand-mark" aria-hidden />
            <div>
              <div className="sidebar-brand-name">SCORPIO</div>
              <div className="sidebar-brand-ver">v3</div>
            </div>
          </div>
          <nav className="sidebar-nav">
            {NAV_TABS.map(tab => {
              const badge = tab.id === 'friends' && requests.length > 0 ? requests.length : 0;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`sidebar-link${activeTab === tab.id ? ' active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span>{tab.icon} {tab.label}</span>
                  {badge > 0 ? <span className="sidebar-badge">{badge}</span> : null}
                </button>
              );
            })}
          </nav>
          <div className="sidebar-footer">
            <div className="sidebar-user" onClick={() => setActiveTab('profile')} role="presentation">
              <img
                src={avatarUrl(avatarPreview, user.username, 40)}
                className="avatar avatar-sm"
                alt=""
              />
              <div>
                <div className="sidebar-user-name">{user.username}</div>
                <div className="sidebar-user-wallet">${Number(balance).toFixed(2)}</div>
              </div>
            </div>
            <div className="sidebar-toolbar">
              <div className="sidebar-toolbar-row">
                <span className="sidebar-toolbar-label">Theme</span>
                <button type="button" className={`theme-toggle${theme === 'light' ? ' light' : ''}`} onClick={toggleAppTheme} aria-label="Toggle theme" />
                <span className="sidebar-toolbar-hint">{theme === 'dark' ? 'Dark' : 'Light'}</span>
              </div>
              <div className="sidebar-notif-wrap">
                <button type="button" className="btn btn-ghost btn-sm btn-full sidebar-notif-btn" onClick={() => setNotifOpen(v => !v)}>
                  🔔 Alerts{unreadCount > 0 ? <span className="nav-badge">{unreadCount}</span> : null}
                </button>
                {notifOpen ? (
                  <NotificationsPanel notifications={notifications} markAllRead={markAllRead} dismiss={dismissNotif} onClose={() => setNotifOpen(false)} />
                ) : null}
              </div>
              <button type="button" className="btn btn-secondary btn-sm btn-full" onClick={onLogout}>Logout</button>
            </div>
          </div>
        </aside>

        <main className="main-panel">
          {notifOpen ? <div className="notif-backdrop" onClick={() => setNotifOpen(false)} aria-hidden /> : null}
          <div className="stats-row">
            <div className="stat-card">
              <span className="stat-card-icon" aria-hidden>📚</span>
              <div className="stat-card-label">Library</div>
              <div className="stat-card-value accent">{library.length}</div>
            </div>
            <div className="stat-card">
              <span className="stat-card-icon" aria-hidden>⭐</span>
              <div className="stat-card-label">Wishlist</div>
              <div className="stat-card-value">{wishlist.length}</div>
            </div>
            <div className="stat-card">
              <span className="stat-card-icon" aria-hidden>👥</span>
              <div className="stat-card-label">Friends</div>
              <div className="stat-card-value">{friends.length}</div>
            </div>
            <div className="stat-card">
              <span className="stat-card-icon" aria-hidden>💳</span>
              <div className="stat-card-label">Wallet</div>
              <div className="stat-card-value accent">${Number(balance).toFixed(2)}</div>
            </div>
          </div>

          <div className="page-content page-panel">
            {activeTab === 'store' && (
              <div>
                <PageHeader
                  title="Store"
                  desc="Discover titles, add to wishlist, and build your Scorpio library."
                >
                  <div className="genre-pills">
                    {genres.map(g => (
                      <button
                        key={g}
                        type="button"
                        className={`tag ${storeGenre === g ? 'tag-blue' : ''}`}
                        onClick={() => setStoreGenre(g)}
                        style={{ cursor: 'pointer', border: storeGenre === g ? '1px solid var(--accent-blue)' : undefined }}
                      >
                        {g === 'all' ? 'All' : g}
                      </button>
                    ))}
                  </div>
                </PageHeader>
                <section className="scorpio-originals mb-4" aria-labelledby="scorpio-originals-title">
                  <div className="scorpio-originals-header">
                    <span className="hero-badge">Project Scorpio</span>
                    <h2 id="scorpio-originals-title">Original titles</h2>
                    <p className="text-secondary">
                      Two standalone games built for this storefront — add them to your library and play in-browser.
                    </p>
                  </div>
                  <div className="scorpio-originals-grid">
                    {scorpioGames.map(game => (
                      <article
                        key={game.id}
                        className="scorpio-product-card"
                        style={{
                          backgroundImage: `linear-gradient(135deg, rgba(7,7,13,0.92) 0%, rgba(7,7,13,0.55) 45%, transparent 100%), url(${game.image})`,
                        }}
                      >
                        <div className="scorpio-product-body">
                          <p className="scorpio-product-slug">{game.slug}</p>
                          <h3>{game.name}</h3>
                          <p className="scorpio-product-desc">{game.description}</p>
                          <div className="game-card-tags" style={{ marginBottom: 16 }}>
                            {(game.tags || []).slice(0, 3).map(t => (
                              <span key={t} className={`tag ${GENRE_COLORS[t] || ''}`}>{t}</span>
                            ))}
                          </div>
                          <div className="scorpio-product-footer">
                            <span className="game-card-price">{game.price === 0 ? 'Free' : `$${game.price}`}</span>
                            {renderStoreGameActions(game)}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
                <div className="games-grid">
                  {filteredStoreGames.map(game => {
                    const owned = ownedNames.has(game.name);
                    const wished = wishNames.has(game.name);
                    return (
                      <div key={game.name} className="game-card">
                        <div className="game-card-media">
                          <img src={game.image} alt="" className="game-card-image" />
                          <div className="game-card-overlay" />
                          <button
                            type="button"
                            className={`wishlist-btn${wished ? ' active' : ''}`}
                            style={{ position: 'absolute', top: 10, right: 10, zIndex: 2 }}
                            onClick={() => toggleWishlist(game.name)}
                            aria-label="Wishlist"
                          >♥</button>
                        </div>
                        <div className="game-card-body">
                          <h3 className="game-card-title">{game.name}</h3>
                          <div className="game-card-tags">
                            {(game.tags || []).slice(0, 3).map(t => (
                              <span key={t} className={`tag ${GENRE_COLORS[t] || ''}`}>{t}</span>
                            ))}
                          </div>
                          <div className="game-card-footer" style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span className="game-card-price">{game.price === 0 ? 'Free' : `$${game.price}`}</span>
                            {owned ? (
                              <>
                                <span className="text-muted text-sm">Owned</span>
                                {isPlayable(game) ? (
                                  <button type="button" className="btn btn-primary btn-sm" onClick={() => onPlayGame?.(game.id)}>Play</button>
                                ) : (
                                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setReviewGame(game)}>Review</button>
                                )}
                              </>
                            ) : (
                              <button type="button" className="btn btn-primary btn-sm" onClick={() => purchaseGame(game)}>
                                {game.price === 0 ? 'Get free' : 'Buy'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'library' && (
              <div>
                <PageHeader title="Library" desc="Your purchased games and quick actions." />
                {library.length === 0 ? (
                  <EmptyState icon="📚" title="Library is empty" text="Browse the Store and buy your first game." />
                ) : (
                  <div className="library-list">
                    {library.map(row => {
                      const meta = gameByName(row.game_name);
                      return (
                        <div key={row.id} className="library-row">
                          <img src={meta?.image || '/cyberpunk.jpg'} alt="" />
                          <div className="library-row-meta">
                            <h3>{row.game_name}</h3>
                            <p className="text-muted text-sm">Purchased {(row.purchased_at || row.purchase_date) ? new Date(row.purchased_at || row.purchase_date).toLocaleDateString() : ''}</p>
                          </div>
                          <div className="library-row-actions">
                            {meta && isPlayable(meta) ? (
                              <button type="button" className="btn btn-primary btn-sm" onClick={() => onPlayGame?.(meta.id)}>Play</button>
                            ) : null}
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => meta && setReviewGame(meta)}>Review</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'wishlist' && (
              <div>
                <PageHeader title="Wishlist" desc="Games you are watching — buy or remove anytime." />
                {wishlist.length === 0 ? (
                  <EmptyState icon="⭐" title="Nothing saved yet" text="Heart games in the Store to track them here." />
                ) : (
                  <div className="games-grid">
                    {wishlist.map(row => {
                      const meta = gameByName(row.game_name);
                      if (!meta) return null;
                      const owned = ownedNames.has(meta.name);
                      return (
                        <div key={row.id} className="game-card">
                          <div className="game-card-media">
                            <img src={meta.image} alt="" className="game-card-image" />
                          </div>
                          <div className="game-card-body">
                            <h3 className="game-card-title">{meta.name}</h3>
                            <div className="game-card-footer" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                              <button type="button" className="btn btn-ghost btn-sm" onClick={() => toggleWishlist(meta.name)}>Remove</button>
                              {!owned ? (
                                <button type="button" className="btn btn-primary btn-sm" onClick={() => purchaseGame(meta)}>Buy ${meta.price}</button>
                              ) : (
                                <span className="text-muted text-sm">Owned</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'friends' && (
              <div>
                <PageHeader title="Friends" desc="Search players, send requests, accept invites.">
                  <div className="search-bar" style={{ minWidth: 220 }}>
                    <input
                      placeholder="Find username…"
                      value={addFriendName}
                      onChange={e => setAddFriendName(e.target.value)}
                    />
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => addFriendByUsername()}>Add</button>
                  </div>
                </PageHeader>

                <div className="section-header">
                  <div className="section-title">Search</div>
                </div>
                <div className="search-bar mb-3" style={{ maxWidth: 480 }}>
                  <input
                    placeholder="Type to search users…"
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                  />
                </div>
                {searchResults.length > 0 && (
                  <div className="friends-grid mb-4">
                    {searchResults.map(su => (
                      <div key={su.id} className="friend-card">
                        <img
                          src={avatarUrl(su.profile_pic, su.username, 48)}
                          className="avatar avatar-md"
                          alt=""
                        />
                        <div className="friend-info">
                          <div className="friend-name">{su.username}</div>
                          {su.bio && <div className="friend-status">{su.bio}</div>}
                        </div>
                        <div className="friend-card-actions">

                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => addFriendByUsername(su.username)}>Add</button>

                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setProfileModalId(Number(su.id))}>Profile</button>

                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="section-header">
                  <div className="section-title">Incoming requests</div>
                </div>
                {requests.length === 0 ? (
                  <EmptyState icon="📨" title="No pending requests" text="When someone adds you, they will show up here." />
                ) : (
                  <div className="library-list mb-4">
                    {requests.map(r => (
                      <div key={r.requestId} className="library-row" style={{ gridTemplateColumns: 'auto 1fr auto' }}>
                        <img src={avatarUrl(r.profile_pic, r.username, 48)} className="avatar avatar-md" alt="" />
                        <div className="library-row-meta">
                          <h3>{r.username}</h3>
                          <p className="text-muted text-sm">Wants to connect</p>
                        </div>
                        <div className="library-row-actions">
                          <button type="button" className="btn btn-success btn-sm" onClick={() => acceptFriend(r.requestId)}>Accept</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="section-header">
                  <div className="section-title">Your friends</div>
                </div>
                {friends.length === 0 ? (
                  <EmptyState icon="👥" title="No friends yet" text="Search usernames above and send a friend request." />
                ) : (
                  <div className="friends-grid">
                    {friends.map(f => (
                      <div key={f.id} className="friend-card">
                        <img
                          src={avatarUrl(f.profile_pic, f.username, 48)}
                          className="avatar avatar-md"
                          alt=""
                        />
                        <div className="friend-info">
                          <div className="friend-name">{f.username}</div>
                          <div className={`friend-status${onlineUsers.has(Number(f.id)) ? ' online' : ''}`}>
                            {onlineUsers.has(Number(f.id)) ? 'Online' : 'Offline'}
                          </div>
                        </div>
                        <div className="friend-card-actions">

                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setActiveTab('chat'); startChat(f); }}>Chat</button>

                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setProfileModalId(Number(f.id))}>Profile</button>

                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'chat' && (
              <div>
                <PageHeader title="Chat" desc="Message friends in real time." />
                <div className="chat-layout">
                  <div className="chat-sidebar">
                    <div className="chat-sidebar-header">Friends</div>
                    {friends.length === 0 ? (
                      <div className="p-4 text-muted text-sm" style={{ padding: 16 }}>Add friends first.</div>
                    ) : (
                      friends.map(f => (
                        <button
                          key={f.id}
                          type="button"
                          className={`chat-friend-item${sameUserId(activeChat?.id, f.id) ? ' active' : ''}`}
                          onClick={() => startChat(f)}
                        >
                          <img
                            src={avatarUrl(f.profile_pic, f.username, 40)}
                            className="avatar avatar-sm"
                            alt=""
                          />
                          <div className="chat-friend-meta">
                            <div className="friend-name">{f.username}</div>
                            <div className={`friend-status${onlineUsers.has(Number(f.id)) ? ' online' : ''}`} style={{ fontSize: 11 }}>
                              {onlineUsers.has(Number(f.id)) ? 'Online' : 'Offline'}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                  <div className="chat-main">
                    {!activeChat ? (
                      <div className="chat-empty">
                        <span>Select a friend to start chatting.</span>
                      </div>
                    ) : (
                      <>
                        <div className="chat-header">
                          <img
                            src={avatarUrl(activeChat.profile_pic, activeChat.username, 40)}
                            className="avatar avatar-sm"
                            alt=""
                          />
                          <div>
                            <div className="friend-name">{activeChat.username}</div>
                            <div className="text-muted text-sm">
                              {onlineUsers.has(Number(activeChat.id)) ? 'Online' : 'Offline'}
                            </div>
                          </div>
                        </div>
                        <div className="chat-messages">
                          {messages.map(m => {
                            const mine = sameUserId(m.sender_id, userId);
                            return (
                              <div key={m.id} className={`message-row ${mine ? 'me' : 'them'}`}>
                                <div className="message-bubble">{m.text}</div>
                                <div className="message-time">{m.time || ''}{m.optimistic ? ' · sending' : ''}</div>
                              </div>
                            );
                          })}
                          <div ref={messagesEndRef} />
                        </div>
                        <div className="typing-indicator">{typingUser ? `${typingUser} is typing…` : ''}</div>
                        <div className="chat-input-area">
                          <textarea
                            className="steam-input"
                            style={{ flex: 1, minHeight: 44, resize: 'none' }}
                            placeholder="Message…"
                            value={msgText}
                            onChange={e => {
                              setMsgText(e.target.value);
                              if (activeChat) {
                                const room = chatRoomId(userId, Number(activeChat.id));
                                socket.emit('typing', { room, author: user.username });
                              }
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                sendMessage();
                              }
                            }}
                            onBlur={() => {
                              if (activeChat) socket.emit('stop_typing', { room: chatRoomId(userId, Number(activeChat.id)) });
                            }}
                          />
                          <button type="button" className="btn btn-primary" onClick={sendMessage}>Send</button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'achievements' && (
              <div>
                <PageHeader title="Achievements" desc="Unlock badges as you play, shop, and socialize." />
                <div className="achievements-grid">
                  {(achievementsData.all || []).map(def => {
                    const unlocked = achievementsData.unlocked?.some(u => u.achievement_key === def.key);
                    return (
                      <div key={def.key} className={`achievement-card${unlocked ? ' unlocked' : ' locked'}`}>
                        <span className="achievement-icon">{def.icon}</span>
                        <div>
                          <div className="achievement-name">{def.name}</div>
                          <div className="achievement-desc">{def.description}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div>
                <PageHeader title="Your profile" desc="Manage avatar, bio, wallet codes, and security.">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={onLogout}>Logout</button>
                </PageHeader>
                <div className="profile-hero profile-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, marginBottom: 24 }}>
                  <div style={{ textAlign: 'center' }}>
                    <img
                      src={avatarUrl(avatarPreview, user.username, 160)}
                      className="avatar avatar-lg"
                      alt=""
                      style={{ marginBottom: 12 }}
                    />
                    <label className="btn btn-secondary btn-sm btn-full">
                      Upload avatar
                      <input type="file" accept="image/*" hidden onChange={uploadAvatar} />
                    </label>
                  </div>
                  <div>
                    <h2 className="font-display" style={{ marginBottom: 8 }}>{user.username}</h2>
                    <p className="text-muted text-sm mb-3">{user.email}</p>
                    <label className="text-sm text-secondary">Bio</label>
                    <textarea className="steam-input mt-1 mb-2" rows={4} value={bioDraft} onChange={e => setBioDraft(e.target.value)} />
                    <button type="button" className="btn btn-primary btn-sm" onClick={saveBio}>Save bio</button>
                  </div>
                </div>

                <div className="stat-card mb-3">
                  <div className="stat-card-label">Gift code</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <input className="steam-input" style={{ flex: 1 }} value={redeemCode} onChange={e => setRedeemCode(e.target.value)} placeholder="WELCOME50" />
                    <button type="button" className="btn btn-primary" onClick={redeemGift}>Redeem</button>
                  </div>
                </div>

                <div className="stat-card mb-3">
                  <div className="stat-card-label">Change password</div>
                  <input type="password" className="steam-input mt-2 mb-2" placeholder="Current" value={pwdCurrent} onChange={e => setPwdCurrent(e.target.value)} />
                  <input type="password" className="steam-input mb-2" placeholder="New" value={pwdNew} onChange={e => setPwdNew(e.target.value)} />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={changePassword}>Update password</button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <nav className="scorpio-nav scorpio-nav-mobile">
        <div className="nav-tabs" style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
          {NAV_TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              className={`nav-tab${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {reviewGame && (
        <ReviewModal
          game={reviewGame}
          userId={userId}
          onClose={() => setReviewGame(null)}
          addToast={addToast}
          onReviewed={refreshData}
        />
      )}
      {profileModalId && (
        <PublicProfileModal
          userId={profileModalId}
          onClose={() => setProfileModalId(null)}
          currentUserId={userId}
          friends={friends}
          onAddFriend={(username) => {
            setProfileModalId(null);
            addFriendByUsername(username);
          }}
        />
      )}
    </div>
  );
}
