/* ============================================================
   BuffNook Tower · comments.js（延迟加载）
   功能：表单提交、最新在前、每条可回复、没人评论时显示邀请
   注意：评论内容不写进 HTML、不写进 JSON-LD、不做结构化数据
   ============================================================ */
(function () {
  'use strict';

  var BOX = document.querySelector('.comments');
  if (!BOX) return;

  var FORM = BOX.querySelector('.comments-form');
  var TEXTAREA = FORM ? FORM.querySelector('textarea') : null;
  var SUBMIT = FORM ? FORM.querySelector('button[type="submit"], button:not([type])') : null;
  var LIST = BOX.querySelector('.comments-list');
  var EMPTY = BOX.querySelector('.comments-empty');
  var formEl = document.createElement('form'); formEl.className = 'comments-form'; formEl.innerHTML = TEXTAREA ? TEXTAREA.outerHTML + (SUBMIT ? SUBMIT.outerHTML : '<button type="submit">Post</button>') : '';
  // 如果 HTML 里没有表单（只有占位），动态补
  if (!FORM) {
    BOX.insertAdjacentHTML('afterbegin',
      '<h2>Comments</h2>' +
      '<form class="comments-form" id="comments-form">' +
        '<textarea placeholder="问最高分？分享一个让高塔坍塌的奇招？" required></textarea>' +
        '<button type="submit">Post</button>' +
      '</form>' +
      '<div class="comments-list" id="comments-list"></div>' +
      '<div class="comments-empty" id="comments-empty">还没人评论—— 聊聊你玩的最高塔吧 ↓</div>');
    FORM = BOX.querySelector('#comments-form');
    TEXTAREA = BOX.querySelector('textarea');
    SUBMIT = BOX.querySelector('button[type="submit"]');
    LIST = BOX.querySelector('#comments-list');
    EMPTY = BOX.querySelector('#comments-empty');
  }

  // ---------- 本地 mock 存储（后续接真实 API 只改 fetchComments/saveComment） ----------
  var KEY = 'buffnook.comments.' + (document.body.dataset.slug || 'buffnook-tower');
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }
  function save(arr) { try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch (e) {} }

  function fetchComments() { return Promise.resolve(load().sort(function (a, b) { return b.ts - a.ts; })); }
  function saveComment(text, parentId) {
    var arr = load();
    var item = {
      id: 'c_' + Date.now(),
      author: 'Guest',
      ts: Date.now(),
      text: text.trim(),
      parentId: parentId || null
    };
    arr.push(item);
    save(arr);
    return Promise.resolve(item);
  }

  // ---------- 渲染 ----------
  function render(list) {
    var topLevel = list.filter(function (c) { return !c.parentId; });
    var replies = {};
    list.forEach(function (c) { if (c.parentId) { (replies[c.parentId] = replies[c.parentId] || []).push(c); } });

    if (!topLevel.length) {
      if (EMPTY) EMPTY.style.display = 'block';
      if (LIST) LIST.innerHTML = '';
      return;
    }
    if (EMPTY) EMPTY.style.display = 'none';

    var frag = document.createDocumentFragment();
    topLevel.forEach(function (c) { frag.appendChild(renderItem(c, replies[c.id] || [], 0)); });
    LIST.innerHTML = '';
    LIST.appendChild(frag);
  }

  function renderItem(c, replies, depth) {
    var el = document.createElement('div');
    el.className = 'comment';
    if (depth >= 2) el.style.marginLeft = '24px';
    var time = new Date(c.ts);
    var timeStr = time.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
                  ' ' + time.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    el.innerHTML =
      '<div class="comment-head">' +
        '<span class="comment-author">' + esc(c.author) + '</span>' +
        '<span class="comment-time">' + timeStr + '</span>' +
      '</div>' +
      '<div class="comment-body">' + esc(c.text) + '</div>' +
      '<button class="comment-reply" style="font-size:11px;color:var(--ink-mute);margin-top:6px;background:none;border:none;cursor:pointer;">Reply</button>';
    // 回复按钮
    var replyBtn = el.querySelector('.comment-reply');
    replyBtn.addEventListener('click', function () {
      var p = prompt('回复 ' + c.author + '：');
      if (p && p.trim()) {
        saveComment(p, c.id).then(function () {
          fetchComments().then(render);
        });
      }
    });
    // 子回复
    replies.forEach(function (r) { el.appendChild(renderItem(r, [], depth + 1)); });
    return el;
  }

  function esc(s) {
    var d = document.createElement('div'); d.textContent = s || '';
    return d.innerHTML;
  }

  // ---------- 表单提交 ----------
  FORM.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = TEXTAREA.value.trim();
    if (!text) return;
    saveComment(text, null).then(function () {
      TEXTAREA.value = '';
      fetchComments().then(render);
      if (window.track) window.track('comment_post');
    });
  });

  // 首次加载
  fetchComments().then(render);

})();
