const BASE_URL = 'http://127.0.0.1:8888';

function _request(method, path, data, header) {
  data = data || {};
  header = header || {};
  return new Promise(function(resolve, reject) {
    var user = getApp().globalData.user;
    var defaultHeader = { 'Content-Type': 'application/json' };
    if (user && user.username) defaultHeader['X-Username'] = user.username;
    Object.assign(defaultHeader, header);

    wx.request({
      url: BASE_URL + path,
      method: method,
      data: data,
      header: defaultHeader,
      timeout: 60000,
      success: function(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject({ code: res.statusCode, msg: (res.data && res.data.detail) || '请求失败' });
        }
      },
      fail: function(err) {
        reject({ code: -1, msg: '网络错误，请检查连接', raw: err });
      },
    });
  });
}

module.exports = {
  baseUrl: BASE_URL,
  get: function(path, data) { return _request('GET', path, data); },
  post: function(path, data) { return _request('POST', path, data); },
  postForm: function(path, data) {
    return _request('POST', path, data, { 'Content-Type': 'application/x-www-form-urlencoded' });
  },
};