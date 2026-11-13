import axios from 'axios'
import { getApiBase } from '@/config/api'

/**
 * 直连 FastAPI：响应体无统一 { code, data } 包装，直接返回 JSON。
 */
export const http = axios.create({
  baseURL: getApiBase(),
  timeout: 120000,
})

http.interceptors.response.use(
  (res) => res.data,
  (err) => Promise.reject(err),
)

export default http
