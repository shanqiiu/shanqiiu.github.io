// 聊天室模块（纯客户端，localStorage + BroadcastChannel）
(function () {
  'use strict';

  var STORAGE_KEY = 'chat:messages';
  var USER_KEY = 'chat:userName';
  var USER_ID_KEY = 'chat:userId';
  var CHANNEL_NAME = 'chat-broadcast';

  // 默认房间
  var DEFAULT_ROOMS = [
    { id: 'general', name: '综合大厅', description: '闲聊各类话题', count: 0 },
    { id: 'tech', name: '技术交流', description: '讨论技术问题', count: 0 },
    { id: 'random', name: '随便聊聊', description: '想说什么就说什么', count: 0 }
  ];

  // 敏感词
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
    if (all[roomId].length > 200) {
      all[roomId] = all[roomId].slice(-200);
    }
    saveMessages(all);
  }

  function updateRoomCounts(rooms) {
    var all = loadMessages();
    return rooms.map(function (r) {
      var msgs = all[r.id] || [];
      return { id: r.id, name: r.name, description: r.description, count: msgs.length };
    });
  }

  function ChatApp() {
    this.rooms = DEFAULT_ROOMS.slice();
    this.currentRoom = null;
    this.messages = [];
    this.userName = '';
    this.userId = '';
    this.isSending = false;
    this.channel = null;
    this.onlineUsers = 1;

    this.els = {};
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

    this.initUser();
    this.initBroadcast();
    this.bindEvents();
    this.renderRooms();
    this.selectRoom(this.rooms[0]);

    if ('BroadcastChannel' in window) {
      e.connDot.classList.add('is-connected');
    }
  };

  ChatApp.prototype.initUser = function () {
    try {
      this.userName = localStorage.getItem(USER_KEY) || '';
      this.userId = localStorage.getItem(USER_ID_KEY) || '';
    } catch (e) {}

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

  ChatApp.prototype.initBroadcast = function () {
    var self = this;
    if (!('BroadcastChannel' in window)) return;

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
          self.rooms = updateRoomCounts(self.rooms);
          self.renderRooms();
        }
        if (data.type === 'user-join' || data.type === 'user-leave') {
          self.updateOnlineCount();
        }
      };
    } catch (e) {}
  };

  ChatApp.prototype.broadcast = function (type, extra) {
    if (!this.channel) return;
    try {
      this.channel.postMessage(Object.assign({ type: type, roomId: this.currentRoom ? this.currentRoom.id : null }, extra || {}));
    } catch (e) {}
  };

  ChatApp.prototype.updateOnlineCount = function () {
    var count = 1;
    if (this.channel) {
      var self = this;
      var received = false;
      var checkChannel = new BroadcastChannel(CHANNEL_NAME + '-ping');
      checkChannel.onmessage = function () { received = true; };
      checkChannel.postMessage('ping');
      setTimeout(function () {
        count += received ? 1 : 0;
        self.els.onlineText.textContent = String(count);
        try { checkChannel.close(); } catch (e) {}
      }, 500);
    } else {
      this.els.onlineText.textContent = '1';
    }
  };

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
      if (e.error.classList.contains('is-visible')) {
        e.error.classList.remove('is-visible');
      }
    });

    e.menuBtn.addEventListener('click', function () { self.toggleSidebar(true); });
    e.sidebarClose.addEventListener('click', function () { self.toggleSidebar(false); });
    e.mobileOverlay.addEventListener('click', function () { self.toggleSidebar(false); });

    window.addEventListener('beforeunload', function () {
      self.broadcast('user-leave');
    });
  };

  ChatApp.prototype.showNicknameModal = function () {
    this.els.nicknameModal.classList.remove('is-hidden');
    setTimeout(function () {
      var input = document.getElementById('chat-nickname-input');
      if (input) input.focus();
    }, 100);
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
    this.updateOnlineCount();
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
      html += '<div class="chat-room-item' + (isActive ? ' is-active' : '') + '" data-room-id="' + room.id + '">' +
        '<div class="chat-room-item-top">' +
          '<span class="chat-room-item-name">' + self.escapeHtml(room.name) + '</span>' +
          '<span class="chat-room-item-count">' + room.count + '</span>' +
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

  ChatApp.prototype.selectRoom = function (room) {
    this.currentRoom = room;
    this.els.roomName.textContent = room.name;
    this.els.roomDesc.textContent = room.description || '';
    this.messages = getRoomMessages(room.id);
    this.renderRooms();
    this.renderMessages();
    this.scrollToBottom();
    this.updateOnlineCount();
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

    addMessageToRoom(this.currentRoom.id, msg);
    this.messages.push(msg);
    this.renderMessages();
    this.renderRooms();
    this.scrollToBottom();

    this.broadcast('new-message', { message: msg });

    this.els.input.value = '';
    this.autoResize(this.els.input);

    setTimeout(function () {
      self.isSending = false;
      self.els.sendBtn.disabled = false;
      self.els.sendText.textContent = '发送';
      if (spinner.parentNode) spinner.parentNode.removeChild(spinner);
    }, 300);
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

  ChatApp.prototype.escapeHtml = function (str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str || ''));
    return div.innerHTML;
  };

  // Boot
  function boot() {
    var app = new ChatApp();
    app.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
