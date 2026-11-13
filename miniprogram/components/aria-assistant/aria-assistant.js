const IDLE = [
  '你好！有可疑信息随时发给我~',
  '公检法绝不会要求转账到安全账户！',
  '陌生链接要小心，先检测再点！',
  '遇到诈骗立即拨打96110！',
];

Component({
  properties: {
    mood: { type: String, value: 'idle' },
  },
  data: {
    bubble: '',
    statusText: '● 待机监测中...',
    moodClass: '',
  },
  observers: {
    mood(m) {
      let statusText = '● 待机监测中...';
      let moodClass = '';
      if (m === 'alert') {
        statusText = '⚠ 检测到风险！';
        moodClass = 'alert';
      } else if (m === 'happy') {
        statusText = '✓ 环境安全';
        moodClass = 'happy';
      }
      this.setData({ statusText, moodClass });
    },
  },
  lifetimes: {
    attached() {
      this._timer = null;
      this._idx = 0;
    },
    detached() {
      if (this._timer) clearTimeout(this._timer);
    },
  },
  methods: {
    onTap() {
      const text = IDLE[this._idx % IDLE.length];
      this._idx += 1;
      this.setData({ bubble: text });
      if (this._timer) clearTimeout(this._timer);
      this._timer = setTimeout(() => this.setData({ bubble: '' }), 3500);
    },
  },
});
