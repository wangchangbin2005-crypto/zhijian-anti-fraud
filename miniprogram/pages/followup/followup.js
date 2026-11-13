var { apiFollowupStream } = require('../../utils/api');
var { getFollowupThread, saveFollowupThread } = require('../../utils/followupStore');

const app = getApp();

Page({
  data: {
    ctx: null,
    messages: [],
    input: '',
    canSend: false,
    loading: false,
    quick: [
      '什么是电信诈骗？',
      '接到陌生电话说我涉案怎么办？',
      '如何举报诈骗？',
      '遇到网络刷单要注意什么？',
    ],
    scrollTo: '',
    thinkingText: '',
    threadKey: '',
    streamingAssistant: false,
  },

  onShow() {
    const u = app.globalData.user;
    if (!u) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    const ctx = app.globalData.followupContext;
    const threadKey = app.globalData.followupThreadKey || `free_${u.username}`;
    const stored = getFollowupThread(u.username, threadKey);
    this.setData({
      ctx: ctx || stored?.ctx || null,
      threadKey: threadKey,
      messages: Array.isArray(stored?.messages) ? stored.messages : [],
    });
    app.globalData.followupContext = null;
    app.globalData.followupThreadKey = null;
  },

  onHide() {
    this._clearStreamTimer();
    this._clearThinkingTimer();
  },

  onUnload() {
    this._abortStream();
    this._clearStreamTimer();
    this._clearThinkingTimer();
  },

  _abortStream() {
    if (this._streamTask && typeof this._streamTask.abort === 'function') {
      try {
        this._streamTask.abort();
      } catch (e) {}
    }
    this._streamTask = null;
    if (this._flushTimer) {
      clearTimeout(this._flushTimer);
      this._flushTimer = null;
    }
  },

  clearCtx() {
    this.setData({ ctx: null, messages: [] });
    const u = app.globalData.user;
    if (u?.username) {
      saveFollowupThread(u.username, this.data.threadKey || `free_${u.username}`, [], null);
    }
  },

  useQuick(e) {
    const q = e.currentTarget.dataset.q || '';
    this.setData({ input: q, canSend: !!String(q).trim() }, () => this.send());
  },

  onInput(e) {
    const v = e.detail.value;
    this.setData({ input: v, canSend: !!v.trim() });
  },

  send() {
    const text = (this.data.input || '').trim();
    if (!text || this.data.loading) return;
    const user = app.globalData.user;
    const time = new Date().toLocaleTimeString();
    const threadKey = this.data.threadKey || ('free_' + (user.username || 'guest'));
    const historyBefore = this.data.messages;

    const out = historyBefore
      .concat({ role: 'user', content: text, time })
      .concat({
        role: 'assistant',
        content: '',
        richContent: '',
        reasoningText: '',
        reasoningRich: '',
        streaming: true,
        time: new Date().toLocaleTimeString(),
      });
    const idx = out.length - 1;
    this._abortStream();
    this.setData({
      messages: out,
      input: '',
      canSend: false,
      loading: true,
      streamingAssistant: true,
      thinkingText: '',
      scrollTo: 'f' + idx,
    });
    this._clearThinkingTimer();

    const that = this;
    let reasoningAcc = '';
    let answerAcc = '';

    const scheduleFlush = function() {
      if (that._flushTimer) return;
      that._flushTimer = setTimeout(function() {
        that._flushTimer = null;
        that._applyStreamChunk(idx, reasoningAcc, answerAcc);
      }, 90);
    };

    this._streamTask = apiFollowupStream(
      text,
      this.data.ctx,
      user?.identity || 'adult',
      historyBefore,
      {
        onReasoning: function(full) {
          reasoningAcc = full || '';
          scheduleFlush();
        },
        onContent: function(full) {
          answerAcc = full || '';
          scheduleFlush();
        },
        onDone: function(payload) {
          if (that._flushTimer) {
            clearTimeout(that._flushTimer);
            that._flushTimer = null;
          }
          const rFinal = payload && payload.reasoning != null ? payload.reasoning : reasoningAcc;
          const aFinal = (payload && payload.reply) || answerAcc || '';
          const reply = that._normalizeText(aFinal) || '抱歉，我暂时无法回答，请稍后再试。';
          const reasoningFinal = (rFinal || '').trim();
          const msgs = that.data.messages.slice();
          if (msgs[idx]) {
            msgs[idx] = Object.assign({}, msgs[idx], {
              streaming: false,
              content: reply,
              reasoningText: reasoningFinal,
              reasoningRich: reasoningFinal ? that._renderPlainToRich(reasoningFinal) : '',
              richContent: that._renderMarkdownToRichText(reply),
            });
          }
          that.setData({
            messages: msgs,
            loading: false,
            streamingAssistant: false,
            thinkingText: '',
            scrollTo: 'f' + idx,
          });
          saveFollowupThread(user.username, threadKey, msgs, that.data.ctx);
          that._streamTask = null;
        },
        onError: function(err) {
          if (that._flushTimer) {
            clearTimeout(that._flushTimer);
            that._flushTimer = null;
          }
          console.error('[followup] 流式失败:', err);
          const { mockFollowupReply } = require('../../utils/mockFollowup');
          const reply = that._normalizeText(mockFollowupReply(text, that.data.ctx, user) + '\n\n（离线模式）');
          const msgs = that.data.messages.slice();
          if (msgs[idx]) {
            msgs[idx] = Object.assign({}, msgs[idx], {
              streaming: false,
              content: reply,
              reasoningText: '',
              reasoningRich: '',
              richContent: that._renderMarkdownToRichText(reply),
            });
          }
          that.setData({
            messages: msgs,
            loading: false,
            streamingAssistant: false,
            thinkingText: '',
            scrollTo: 'f' + idx,
          });
          saveFollowupThread(user.username, threadKey, msgs, that.data.ctx);
          that._streamTask = null;
          wx.showToast({ title: '流式失败，已离线回复', icon: 'none', duration: 2000 });
        },
      },
      threadKey
    );
  },

  _applyStreamChunk(idx, reasoning, answer) {
    const reasoningRich = this._renderPlainToRich(reasoning);
    const richContent = this._renderMarkdownToRichText(answer);
    const patch = {};
    patch['messages[' + idx + '].reasoningRich'] = reasoningRich;
    patch['messages[' + idx + '].richContent'] = richContent;
    patch['messages[' + idx + '].content'] = answer;
    patch['messages[' + idx + '].reasoningText'] = reasoning;
    patch.scrollTo = 'f' + idx;
    this.setData(patch);
  },

  _clearStreamTimer() {
    if (this._streamTimer) {
      clearInterval(this._streamTimer);
      this._streamTimer = null;
    }
  },

  _clearThinkingTimer() {
    if (this._thinkingTimer) {
      clearInterval(this._thinkingTimer);
      this._thinkingTimer = null;
    }
  },

  _escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  },

  _renderPlainToRich(s) {
    return this._escapeHtml(this._normalizeText(s || '')).replace(/\n/g, '<br/>');
  },

  _renderMarkdownToRichText(md) {
    let html = this._escapeHtml(this._normalizeText(md || ''));
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    html = html.replace(/^###\s(.+)$/gm, '<strong>$1</strong>');
    html = html.replace(/^##\s(.+)$/gm, '<strong>$1</strong>');
    html = html.replace(/^#\s(.+)$/gm, '<strong>$1</strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/`([^`]+?)`/g, '<code>$1</code>');
    html = html.replace(/^\s*[-*]\s+(.+)$/gm, '• $1');
    html = html.replace(/\n/g, '<br/>');
    return html;
  },

  _normalizeText(text) {
    return String(text || '')
      .replace(/\r/g, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  },
});
