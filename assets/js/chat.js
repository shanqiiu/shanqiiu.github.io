// 聊天室模块
// 数据层可切换：
//   - Supabase 模式（配置了 window.SUPABASE_CONFIG 且加载了 supabase-js）：
//       消息存云端 Postgres、Realtime 订阅实现真·跨设备实时、Presence 统计在线人数
//   - 本地模式（默认/未配置 Supabase）：localStorage + BroadcastChannel 回退，保证不崩
(function () {
  'use strict';

  // ---------- 运行时配置 ----------
  var SUPABASE_CONFIG = window.SUPABASE_CONFIG || null;
  function hasSupabase() {
    return !!(
      SUPABASE_CONFIG &&
      SUPABASE_CONFIG.url &&
      SUPABASE_CONFIG.anonKey &&
      window.supabase &&
      typeof window.supabase.createClient === 'function'
    );
  }

  // ---------- 本地存储 key（回退模式用） ----------
  var STORAGE_KEY = 'chat:messages';
  var USER_KEY = 'chat:userName';
  var USER_ID_KEY = 'chat:userId';
  var CHANNEL_NAME = 'chat-broadcast';

  // ---------- 默认房间 ----------
  var DEFAULT_ROOMS = [
    { id: 'general', name: '综合大厅', description: '闲聊各类话题' },
    { id: 'tech', name: '技术交流', description: '讨论技术问题' },
    { id: 'random', name: '随便聊聊', description: '想说什么就说什么' }
  ];

  // ---------- 敏感词 ----------
  var BAD_WORDS = ['傻逼', '操你妈', '草泥马', '滚蛋', '白痴', '智障', '脑残', '废物',
    'fuck', 'shit', 'bitch', 'asshole', 'damn', 'wtf', 'sb', 'nc', 'zz'];

  function containsProfanity(text) {
    var lower = text.toLowerCase();
    return BAD_WORDS.some(function (w) { return lower.indexOf(w) !== -1; });
  }

  function filterProfanity(text) {
    var filtered = text;
    BAD_WORDS.forEach(function (w) {
      var re = new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      filtered = filtered.replace(re, new Array(w.length + 1).join('*'));
    });
    return filtered;
  }

  function isValidNickname(name) {
    var n = name.trim().toLowerCase();
    if (!n) return false;
    if (n === '山海' || n === 'shanhai' || n === 'wuxian') return false;
    if (containsProfanity(name)) return false;
    return true;
  }

  function uid() {
    return 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
  }

  function formatTime(dateStr) {
    var d = new Date(dateStr);
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str || ''));
    return div.innerHTML;
  }

  // ---------- 本地消息读写（回退模式） ----------
  function loadMessages() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch (e) { return {}; }
  }

  function saveMessages(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
  }

  function getRoomMessages(roomId) {
    var all = loadMessages();
    return all[roomId] || [];
  }

  function addMessageToRoom(roomId, msg) {
    var all = loadMessages();
    if (!all[roomId]) all[roomId] = [];
    all[roomId].push(msg);
    if (all[roomId].length > 200) all[roomId] = all[roomId].slice(-200);
    saveMessages(all);
  }

  // ============================================================
  // ChatApp
  // ============================================================
  function ChatApp() {
    this.mode = 'local'; // 先以本地模式秒开；supabase 就绪后升级
    this.supabase = null;
    this.rooms = DEFAULT_ROOMS.slice();
    this.currentRoom = null;
    this.messages = [];
    this.userName = '';
    this.userId = '';
    this.isSending = false;
    this.channel = null;        // 本地模式 BroadcastChannel
    this.realtimeChannel = null; // supabase 消息订阅
    this.presenceChannel = null; // supabase 在线人数
    this.els = {};
    this.localOnlyMessages = []; // 本地模式期间产生的消息，升级云端时补发
    this._init = false;
  }

  ChatApp.prototype.init = function () {
    if (this._init) return;
    this._init = true;

    var e = this.els;
    e.app = document.getElementById('chat-app');
    if (!e.app) return;

    e.sidebar = document.getElementById('chat-sidebar');
    e.sidebarClose = document.getElementById('chat-sidebar-close');
    e.connDot = document.getElementById('chat-conn-dot');
    e.userNameSpan = document.getElementById('chat-user-name');
    e.roomList = document.getElementById('chat-room-list');
    e.mobileOverlay = document.getElementById('chat-mobile-overlay');
    e.menuBtn = document.getElementById('chat-menu-btn');
    e.roomName = document.getElementById('chat-room-name');
    e.roomDesc = document.getElementById('chat-room-desc');
    e.onlineText = document.getElementById('chat-online-text');
    e.messages = document.getElementById('chat-messages');
    e.error = document.getElementById('chat-error');
    e.input = document.getElementById('chat-input');
    e.sendBtn = document.getElementById('chat-send-btn');
    e.sendText = e.sendBtn.querySelector('.chat-send-text');
    e.nicknameModal = document.getElementById('chat-nickname-modal');
    e.nicknameInput = document.getElementById('chat-nickname-input');
    e.nicknameError = document.getElementById('chat-nickname-error');
    e.nicknameBtn = document.getElementById('chat-nickname-btn');
    e.shareBtn = document.getElementById('chat-share-btn');

    this.initUser();
    this.initBackendProgressive();
    this.bindEvents();
    this.renderRooms();
    this.selectRoom(this.rooms[0]);
  };

  // ---------- 身份：优先从 URL 分享链接读取，其次本地存储 ----------
  ChatApp.prototype.parseIdentityFromUrl = function () {
    var hash = window.location.hash || '';
    var m = hash.match(/identity=([^&]+)/);
    if (!m) return {};
    var decoded = decodeURIComponent(m[1]);
    var parts = decoded.split('~');
    if (parts.length === 2 && parts[0] && parts[1]) {
      return { uid: parts[0], name: parts[1] };
    }
    return {};
  };

  ChatApp.prototype.initUser = function () {
    var fromUrl = this.parseIdentityFromUrl();
    try {
      this.userName = localStorage.getItem(USER_KEY) || '';
      this.userId = localStorage.getItem(USER_ID_KEY) || '';
    } catch (e) {}

    if (fromUrl.uid && fromUrl.name) {
      this.userId = fromUrl.uid;
      this.userName = fromUrl.name;
      try {
        localStorage.setItem(USER_ID_KEY, this.userId);
        localStorage.setItem(USER_KEY, this.userName);
      } catch (e) {}
      // 清理 URL，避免链接被二次传播
      try { history.replaceState(null, '', window.location.pathname + window.location.search); } catch (e) {}
    }

    if (!this.userId) {
      this.userId = 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      try { localStorage.setItem(USER_ID_KEY, this.userId); } catch (e) {}
    }

    if (this.userName) {
      this.els.userNameSpan.textContent = this.userName;
      this.hideNicknameModal();
    } else {
      this.showNicknameModal();
    }
  };

  // ---------- 后端初始化（渐进增强） ----------
  // 先以本地模式秒开、可聊天；后台探测 supabase 脚本就绪后升级为云端实时
  ChatApp.prototype.initBackendProgressive = function () {
    var self = this;
    this.mode = 'local';
    this.initBroadcast();
    if (this.els.onlineText) this.els.onlineText.textContent = '1';

    if (!SUPABASE_CONFIG) return; // 未配置 supabase，保持本地模式
    var waited = 0;
    var timer = setInterval(function () {
      if (self.mode === 'supabase') { clearInterval(timer); return; }
      if (hasSupabase()) {
        clearInterval(timer);
        self.upgradeToSupabase();
        return;
      }
      waited += 250;
      if (waited >= 8000) {
        clearInterval(timer);
        if (self.els.connDot) self.els.connDot.title = '本地模式（云端未就绪）';
      }
    }, 250);
  };

  // 升级到云端实时模式：补发本地消息 + 拉取云端历史 + 订阅实时/在线
  ChatApp.prototype.upgradeToSupabase = function () {
    var self = this;
    if (this.mode === 'supabase') return;
    try {
      this.supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    } catch (err) {
      return; // 创建失败，保持本地模式
    }
    this.mode = 'supabase';
    if (this.els.connDot) {
      this.els.connDot.classList.add('is-connected');
      this.els.connDot.title = '已连接（云端实时）';
    }
    var pending = this.localOnlyMessages.slice();
    this.localOnlyMessages = [];
    var afterSync = function () {
      if (!self.currentRoom) return;
      self.loadRoomMessages(self.currentRoom.id, function (msgs) {
        self.messages = msgs;
        self.renderMessages();
        self.scrollToBottom();
        self.subscribeRoom(self.currentRoom.id);
        self.initPresence(self.currentRoom.id);
      });
    };
    if (!pending.length) { afterSync(); return; }
    var done = 0;
    var finish = function () { done++; if (done >= pending.length) afterSync(); };
    pending.forEach(function (item) {
      self.supabase.from('messages').insert({
        room_id: item.roomId,
        user_id: item.msg.userId,
        user_name: item.msg.userName,
        content: item.msg.content
      }).then(finish, finish);
    });
  };

  ChatApp.prototype.initBroadcast = function () {
    var self = this;
    if (!('BroadcastChannel' in window)) {
      this.els.connDot.title = '本地模式';
      return;
    }
    try {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = function (event) {
        var data = event.data;
        if (!data || !data.type) return;
        if (data.type === 'new-message' && data.roomId === (self.currentRoom && self.currentRoom.id)) {
          self.messages.push(data.message);
          self.renderMessages();
          self.scrollToBottom();
        }
        if (data.type === 'new-message') {
          self.renderRooms();
        }
      };
      this.els.connDot.classList.add('is-connected');
      this.els.connDot.title = '已连接（本机同步）';
    } catch (e) {}
  };

  ChatApp.prototype.broadcast = function (type, extra) {
    if (!this.channel) return;
    try {
      this.channel.postMessage(Object.assign(
        { type: type, roomId: this.currentRoom ? this.currentRoom.id : null }, extra || {}
      ));
    } catch (e) {}
  };

  // ---------- 消息拉取（按模式） ----------
  ChatApp.prototype.loadRoomMessages = function (roomId, cb) {
    if (this.mode === 'supabase') {
      var self = this;
      var done = false;
      // 安全超时：云端（尤其免费项目暂停/冷启动）可能长时间无响应，
      // 绝不让骨架屏永久停留——超时后降级为空列表（可正常发言，本地兜底）。
      var timer = setTimeout(function () {
        if (done) return;
        done = true;
        cb([], { code: 'timeout', message: '云端响应较慢' });
      }, 8000);
      this.supabase
        .from('messages')
        .select('id, room_id, user_id, user_name, content, created_at')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(200)
        .then(function (res) {
          if (done) return;
          done = true; clearTimeout(timer);
          if (res.error) { cb([], res.error); return; }
          var msgs = (res.data || []).map(function (r) {
            return {
              id: r.id, content: r.content, userId: r.user_id,
              userName: r.user_name, createdAt: r.created_at
            };
          });
          cb(msgs, null);
        })
        .catch(function (err) {
          if (done) return;
          done = true; clearTimeout(timer);
          cb([], err);
        });
    } else {
      cb(getRoomMessages(roomId), null);
    }
  };

  // ---------- 消息持久化（按模式） ----------
  ChatApp.prototype.persistMessage = function (roomId, msg, cb) {
    if (this.mode === 'supabase') {
      var self = this;
      this.supabase
        .from('messages')
        .insert({
          room_id: roomId,
          user_id: msg.userId,
          user_name: msg.userName,
          content: msg.content
        })
        .then(function (res) { cb(res.error || null); })
        .catch(function (err) { cb(err); });
    } else {
      addMessageToRoom(roomId, msg);
      if (this.mode === 'local') this.localOnlyMessages.push({ roomId: roomId, msg: msg });
      cb(null);
    }
  };

  // ---------- 实时订阅（supabase 模式） ----------
  ChatApp.prototype.subscribeRoom = function (roomId) {
    if (this.mode !== 'supabase') return;
    var self = this;
    if (this.realtimeChannel) {
      this.supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
    this.realtimeChannel = this.supabase
      .channel('room:' + roomId)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: 'room_id=eq.' + roomId },
        function (payload) {
          var r = payload.new;
          // 自己发的消息已乐观渲染，跳过避免重复
          if (r.user_id === self.userId) return;
          var msg = {
            id: r.id, content: r.content, userId: r.user_id,
            userName: r.user_name, createdAt: r.created_at
          };
          if (self.messages.some(function (m) { return m.id === msg.id; })) return;
          if (self.currentRoom && self.currentRoom.id !== roomId) return;
          self.messages.push(msg);
          self.renderMessages();
          self.scrollToBottom();
        })
      .subscribe();
  };

  // ---------- 在线人数（supabase Presence） ----------
  ChatApp.prototype.initPresence = function (roomId) {
    if (this.mode !== 'supabase') return;
    var self = this;
    if (this.presenceChannel) {
      this.supabase.removeChannel(this.presenceChannel);
      this.presenceChannel = null;
    }
    this.presenceChannel = this.supabase
      .channel('online:' + roomId, { config: { presence: { key: this.userId } } })
      .on('presence', { event: 'sync' }, function () {
        var state = self.presenceChannel.presenceState();
        self.els.onlineText.textContent = String(Object.keys(state).length);
      })
      .subscribe(function (status) {
        if (status === 'SUBSCRIBED') {
          self.presenceChannel.track({ userId: self.userId, userName: self.userName });
        }
      });
  };

  // ---------- 事件绑定 ----------
  ChatApp.prototype.bindEvents = function () {
    var self = this;
    var e = this.els;

    e.nicknameBtn.addEventListener('click', function () { self.submitNickname(); });
    e.nicknameInput.addEventListener('keypress', function (ev) {
      if (ev.key === 'Enter') { ev.preventDefault(); self.submitNickname(); }
    });
    e.nicknameInput.addEventListener('input', function () {
      e.nicknameError.textContent = '';
      e.nicknameInput.classList.remove('has-error');
    });

    e.sendBtn.addEventListener('click', function () { self.sendMessage(); });
    e.input.addEventListener('keypress', function (ev) {
      if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); self.sendMessage(); }
    });
    e.input.addEventListener('input', function () {
      self.autoResize(e.input);
      if (e.error.classList.contains('is-visible')) e.error.classList.remove('is-visible');
    });

    e.menuBtn.addEventListener('click', function () { self.toggleSidebar(true); });
    e.sidebarClose.addEventListener('click', function () { self.toggleSidebar(false); });
    e.mobileOverlay.addEventListener('click', function () { self.toggleSidebar(false); });

    if (e.shareBtn) {
      e.shareBtn.addEventListener('click', function () { self.copyIdentityLink(); });
    }

    window.addEventListener('beforeunload', function () {
      self.broadcast('user-leave');
    });
  };

  ChatApp.prototype.showNicknameModal = function () {
    this.els.nicknameModal.classList.remove('is-hidden');
    var input = document.getElementById('chat-nickname-input');
    if (input) setTimeout(function () { input.focus(); }, 100);
  };

  ChatApp.prototype.hideNicknameModal = function () {
    this.els.nicknameModal.classList.add('is-hidden');
  };

  ChatApp.prototype.submitNickname = function () {
    var name = this.els.nicknameInput.value.trim();
    if (!name) {
      this.els.nicknameError.textContent = '请输入昵称';
      this.els.nicknameInput.classList.add('has-error');
      return;
    }
    if (!isValidNickname(name)) {
      this.els.nicknameError.textContent = '昵称不可用，请更换';
      this.els.nicknameInput.classList.add('has-error');
      return;
    }
    this.userName = name;
    try { localStorage.setItem(USER_KEY, name); } catch (e) {}
    this.els.userNameSpan.textContent = name;
    this.hideNicknameModal();
    this.broadcast('user-join');
  };

  // ---------- 身份分享链接：跨设备免重输昵称 ----------
  ChatApp.prototype.copyIdentityLink = function () {
    if (!this.userId || !this.userName) return;
    var link = window.location.origin + window.location.pathname +
      '#identity=' + encodeURIComponent(this.userId) + '~' + encodeURIComponent(this.userName);
    var self = this;
    function flash(text) {
      if (!self.els.shareBtn) return;
      var span = self.els.shareBtn.querySelector('.chat-share-text');
      if (!span) return;
      var old = span.textContent;
      span.textContent = text;
      setTimeout(function () { span.textContent = old; }, 1600);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(function () { flash('已复制!'); }, function () { flash('复制失败'); });
    } else {
      flash('请手动复制');
    }
  };

  ChatApp.prototype.toggleSidebar = function (open) {
    if (open) {
      this.els.sidebar.classList.add('is-open');
      this.els.mobileOverlay.classList.add('is-visible');
    } else {
      this.els.sidebar.classList.remove('is-open');
      this.els.mobileOverlay.classList.remove('is-visible');
    }
  };

  ChatApp.prototype.renderRooms = function () {
    var self = this;
    var html = '';
    this.rooms.forEach(function (room) {
      var isActive = self.currentRoom && room.id === self.currentRoom.id;
      var count = self.mode === 'supabase' ? '' : (self.getRoomCount ? self.getRoomCount(room.id) : '');
      html += '<div class="chat-room-item' + (isActive ? ' is-active' : '') + '" data-room-id="' + room.id + '">' +
        '<div class="chat-room-item-top">' +
          '<span class="chat-room-item-name">' + self.escapeHtml(room.name) + '</span>' +
          (count !== '' ? '<span class="chat-room-item-count">' + count + '</span>' : '') +
        '</div>';
      if (room.description) {
        html += '<p class="chat-room-item-desc">' + self.escapeHtml(room.description) + '</p>';
      }
      html += '</div>';
    });
    this.els.roomList.innerHTML = html;

    var items = this.els.roomList.querySelectorAll('.chat-room-item');
    items.forEach(function (item) {
      item.addEventListener('click', function () {
        var roomId = this.getAttribute('data-room-id');
        var room = self.rooms.find(function (r) { return r.id === roomId; });
        if (room) {
          self.selectRoom(room);
          self.toggleSidebar(false);
        }
      });
    });
  };

  ChatApp.prototype.getRoomCount = function (roomId) {
    var all = loadMessages();
    return (all[roomId] || []).length;
  };

  ChatApp.prototype.selectRoom = function (room) {
    var self = this;
    this.currentRoom = room;
    this.els.roomName.textContent = room.name;
    this.els.roomDesc.textContent = room.description || '';
    this.els.messages.innerHTML =
      '<div class="chat-skeleton-msgs">' +
        '<div class="chat-skeleton-msg"></div>' +
        '<div class="chat-skeleton-msg right"></div>' +
        '<div class="chat-skeleton-msg"></div>' +
        '<div class="chat-skeleton-msg right"></div>' +
        '<div class="chat-skeleton-msg"></div>' +
      '</div>';

    this.renderRooms();

    this.loadRoomMessages(room.id, function (msgs) {
      self.messages = msgs;
      self.renderMessages();
      self.scrollToBottom();
    });

    if (this.mode === 'supabase') {
      this.subscribeRoom(room.id);
      this.initPresence(room.id);
    } else {
      this.els.onlineText.textContent = '1';
    }
  };

  ChatApp.prototype.renderMessages = function () {
    var self = this;
    if (!this.messages.length) {
      this.els.messages.innerHTML = '<div class="chat-empty">暂无消息，发送第一条消息吧</div>';
      return;
    }
    var html = '';
    this.messages.forEach(function (msg) {
      var isMine = msg.userId === self.userId;
      var initial = (msg.userName.charAt(0) || '?').toUpperCase();
      html += '<div class="chat-msg' + (isMine ? ' is-mine' : '') + '">' +
        '<div class="chat-msg-avatar">' + self.escapeHtml(initial) + '</div>' +
        '<div class="chat-msg-body">' +
          '<div class="chat-msg-meta">' +
            '<span class="chat-msg-user">' + self.escapeHtml(msg.userName) + '</span>' +
            '<span class="chat-msg-time">' + formatTime(msg.createdAt) + '</span>' +
          '</div>' +
          '<div class="chat-msg-bubble">' + self.escapeHtml(msg.content) + '</div>' +
        '</div>' +
      '</div>';
    });
    this.els.messages.innerHTML = html;
  };

  ChatApp.prototype.scrollToBottom = function () {
    var self = this;
    setTimeout(function () {
      self.els.messages.scrollTop = self.els.messages.scrollHeight;
    }, 50);
  };

  ChatApp.prototype.sendMessage = function () {
    var content = this.els.input.value.trim();
    if (!content || !this.currentRoom || !this.userName || this.isSending) return;
    if (containsProfanity(content)) {
      this.showError('消息包含不当内容，请重新输入');
      return;
    }

    this.isSending = true;
    var self = this;
    this.els.sendBtn.disabled = true;
    this.els.sendText.textContent = '';
    var spinner = document.createElement('span');
    spinner.className = 'chat-send-spinner';
    this.els.sendBtn.appendChild(spinner);

    var filteredContent = filterProfanity(content);
    var msg = {
      id: uid(),
      content: filteredContent,
      userId: this.userId,
      userName: this.userName,
      createdAt: new Date().toISOString()
    };

    // 乐观更新：本地立即显示
    this.messages.push(msg);
    this.renderMessages();
    this.renderRooms();
    this.scrollToBottom();
    this.broadcast('new-message', { message: msg });

    this.els.input.value = '';
    this.autoResize(this.els.input);

    this.persistMessage(this.currentRoom.id, msg, function (err) {
      if (err) {
        // 发送失败，回滚乐观更新
        self.messages = self.messages.filter(function (m) { return m.id !== msg.id; });
        self.renderMessages();
        self.scrollToBottom();
        self.showError('发送失败，请重试');
      }
      self.isSending = false;
      self.els.sendBtn.disabled = false;
      self.els.sendText.textContent = '发送';
      if (spinner.parentNode) spinner.parentNode.removeChild(spinner);
    });
  };

  ChatApp.prototype.showError = function (text) {
    this.els.error.textContent = text;
    this.els.error.classList.add('is-visible');
    var self = this;
    setTimeout(function () { self.els.error.classList.remove('is-visible'); }, 3000);
  };

  ChatApp.prototype.autoResize = function (el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  // Boot
  function boot() {
    window.__chatBooted = true;
    var app = new ChatApp();
    app.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
