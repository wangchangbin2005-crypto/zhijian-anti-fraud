var request = require('./request');

/**
 * 小程序部分运行环境无 TextDecoder，用增量 UTF-8 解码（兼容分片截断的多字节字符）
 */
function createUtf8StreamDecoder() {
  var carry = new Uint8Array(0);
  function pushOne(u8, i, need) {
    var c0 = u8[i];
    var cp;
    if (need === 1) {
      cp = c0;
    } else if (need === 2) {
      cp = ((c0 & 0x1f) << 6) | (u8[i + 1] & 0x3f);
    } else if (need === 3) {
      cp = ((c0 & 0x0f) << 12) | ((u8[i + 1] & 0x3f) << 6) | (u8[i + 2] & 0x3f);
    } else {
      cp = ((c0 & 0x07) << 18) | ((u8[i + 1] & 0x3f) << 12) | ((u8[i + 2] & 0x3f) << 6) | (u8[i + 3] & 0x3f);
    }
    if (cp <= 0xffff) {
      return String.fromCharCode(cp);
    }
    cp -= 0x10000;
    return String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
  }
  return {
    push: function(arrayBuffer) {
      var incoming = new Uint8Array(arrayBuffer);
      var u8;
      if (carry.length) {
        u8 = new Uint8Array(carry.length + incoming.length);
        u8.set(carry);
        u8.set(incoming, carry.length);
        carry = new Uint8Array(0);
      } else {
        u8 = incoming;
      }
      var out = '';
      var i = 0;
      while (i < u8.length) {
        var c0 = u8[i];
        var need = 0;
        if (c0 < 0x80) {
          need = 1;
        } else if ((c0 & 0xe0) === 0xc0) {
          need = 2;
        } else if ((c0 & 0xf0) === 0xe0) {
          need = 3;
        } else if ((c0 & 0xf8) === 0xf0) {
          need = 4;
        } else {
          i++;
          continue;
        }
        if (i + need > u8.length) {
          carry = u8.subarray(i);
          break;
        }
        var ok = true;
        for (var k = 1; k < need; k++) {
          if ((u8[i + k] & 0xc0) !== 0x80) {
            ok = false;
            break;
          }
        }
        if (!ok) {
          i++;
          continue;
        }
        out += pushOne(u8, i, need);
        i += need;
      }
      return out;
    },
    flush: function() {
      if (!carry.length) {
        return '';
      }
      var u8 = carry;
      carry = new Uint8Array(0);
      var out = '';
      var i = 0;
      while (i < u8.length) {
        var c0 = u8[i];
        var need = 0;
        if (c0 < 0x80) {
          need = 1;
        } else if ((c0 & 0xe0) === 0xc0) {
          need = 2;
        } else if ((c0 & 0xf0) === 0xe0) {
          need = 3;
        } else if ((c0 & 0xf8) === 0xf0) {
          need = 4;
        } else {
          i++;
          continue;
        }
        if (i + need > u8.length) {
          break;
        }
        var ok = true;
        for (var k = 1; k < need; k++) {
          if ((u8[i + k] & 0xc0) !== 0x80) {
            ok = false;
            break;
          }
        }
        if (!ok) {
          i++;
          continue;
        }
        out += pushOne(u8, i, need);
        i += need;
      }
      while (i < u8.length) {
        out += String.fromCharCode(u8[i++]);
      }
      return out;
    },
  };
}

function apiDetect(text, userRole, sessionId) {
  userRole = userRole || 'adult';
  sessionId = sessionId || ('mp_' + Date.now());
  return request.post('/api/decision/analyze', {
    text: text,
    source_type: 'text',
    user_id: sessionId,
    user_role: userRole,
  }).then(function(res) {
    return {
      decision: res,
      intervention: {
        should_block_ui: res.risk_level === 'critical',
        popup: { body: res.explanation || '' },
        record_id: res.record_id || null,
      },
    };
  });
}

function apiFollowup(question, ctx, userRole, history, threadKey) {
  ctx = ctx || {};
  userRole = userRole || 'adult';
  history = Array.isArray(history) ? history : [];
  threadKey = threadKey || 'default';

  const historyForApi = [];
  history.forEach(function(item) {
    if (!item || !item.content) return;
    if (item.role === 'user' || item.role === 'assistant') {
      historyForApi.push({ role: item.role, content: String(item.content) });
    }
  });

  return request.post('/api/followup/chat', {
    question: question,
    ctx: ctx,
    user_role: userRole,
    history: historyForApi,
    thread_key: threadKey,
  }).then(function(res) {
    return {
      reply: (res && res.reply) ? res.reply : '抱歉，我暂时无法回答，请稍后再试。',
      reasoning: res && res.reasoning ? res.reasoning : '',
    };
  });
}

function apiFollowupStream(question, ctx, userRole, history, handlers, threadKey) {
  ctx = ctx || {};
  userRole = userRole || 'adult';
  history = Array.isArray(history) ? history : [];
  handlers = handlers || {};
  threadKey = threadKey || 'default';

  const historyForApi = [];
  history.forEach(function(item) {
    if (!item || !item.content) return;
    if (item.role === 'user' || item.role === 'assistant') {
      historyForApi.push({ role: item.role, content: String(item.content) });
    }
  });

  const streamUrl = request.baseUrl + '/api/followup/chat/stream';
  const user = getApp().globalData.user;
  const defaultHeader = { 'Content-Type': 'application/json' };
  if (user && user.username) defaultHeader['X-Username'] = user.username;

  const utf8 = createUtf8StreamDecoder();
  let sseBuffer = '';
  let answer = '';
  let reasoning = '';
  let streamClosed = false;

  function finishOnce(payload) {
    if (streamClosed) return;
    streamClosed = true;
    if (handlers.onDone) handlers.onDone(payload);
  }

  function emitReasoning() {
    if (handlers.onReasoning) handlers.onReasoning(reasoning, '');
  }
  function emitAnswer() {
    if (handlers.onContent) handlers.onContent(answer, '');
  }

  function processSseLine(rawLine) {
    var line = rawLine.trim();
    if (!line || line.indexOf('data:') !== 0) return;
    var payload = line.slice(5).trim();
    if (payload === '[DONE]') {
      finishOnce({ reply: answer, reasoning: reasoning });
      return;
    }
    try {
      var json = JSON.parse(payload);
      if (json.error) {
        streamClosed = true;
        var em = (json.error && json.error.message) || json.message || '流式输出失败';
        if (handlers.onError) handlers.onError({ code: 502, msg: em, raw: json });
        return;
      }
      var delta = json && json.choices && json.choices[0] ? (json.choices[0].delta || {}) : {};
      var r = delta.reasoning_content || '';
      var c = delta.content || '';
      if (r) {
        reasoning += r;
        emitReasoning();
      }
      if (c) {
        answer += c;
        emitAnswer();
      }
    } catch (e) {
      // 忽略非JSON噪音行
    }
  }

  function feedSseText(chunkText) {
    sseBuffer += chunkText;
    var lines = sseBuffer.split('\n');
    sseBuffer = lines.pop() || '';
    lines.forEach(processSseLine);
  }

  const task = wx.request({
    url: streamUrl,
    method: 'POST',
    enableChunked: true,
    responseType: 'arraybuffer',
    data: {
      question: question,
      ctx: ctx,
      user_role: userRole,
      history: historyForApi,
      thread_key: threadKey,
    },
    header: defaultHeader,
    timeout: 120000,
    success: function(res) {
      if (streamClosed) return;
      if (!(res.statusCode >= 200 && res.statusCode < 300)) {
        streamClosed = true;
        if (handlers.onError) {
          handlers.onError({
            code: res.statusCode,
            msg: (res.data && res.data.detail) || (res.data && res.data.error && res.data.error.message) || '流式接口请求失败',
            raw: res.data,
          });
        }
        return;
      }
      feedSseText(utf8.flush());
      if (sseBuffer.trim()) {
        var tail = sseBuffer.split('\n');
        sseBuffer = '';
        tail.forEach(processSseLine);
      }
      if (!streamClosed) {
        finishOnce({ reply: answer, reasoning: reasoning });
      }
    },
    fail: function(err) {
      if (streamClosed) return;
      streamClosed = true;
      if (handlers.onError) handlers.onError({ code: -1, msg: '网络错误，请检查连接', raw: err });
    },
  });

  task.onChunkReceived(function(ev) {
    feedSseText(utf8.push(ev.data));
  });

  return task;
}

function apiGetSessions(userId) {
  return request.get('/api/history/sessions/' + userId);
}

function apiGetRiskHistory(userId) {
  return request.get('/api/history/risk/' + userId);
}

module.exports = {
  apiDetect: apiDetect,
  apiFollowup: apiFollowup,
  apiFollowupStream: apiFollowupStream,
  apiGetSessions: apiGetSessions,
  apiGetRiskHistory: apiGetRiskHistory,
};