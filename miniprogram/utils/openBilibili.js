/** 跳转微信「哔哩哔哩」官方小程序打开 BV 视频 */
const BILIBILI_WX_APPID = 'touristappid';

function extractBvid(url) {
  if (!url || typeof url !== 'string') return '';
  const m = url.match(/BV[a-zA-Z0-9]+/i);
  return m ? m[0] : '';
}

function isUserCancel(err) {
  return /cancel/i.test((err && err.errMsg) || '');
}

function navigateToBilibiliVideo(bvid) {
  return new Promise((resolve, reject) => {
    if (!bvid) {
      reject(new Error('no bvid'));
      return;
    }
    wx.navigateToMiniProgram({
      appId: BILIBILI_WX_APPID,
      path: `pages/video/video?bvid=${bvid}`,
      success: () => resolve(),
      fail: (err) => reject(err || new Error('fail')),
    });
  });
}

module.exports = {
  BILIBILI_WX_APPID,
  extractBvid,
  navigateToBilibiliVideo,
  isUserCancel,
};
