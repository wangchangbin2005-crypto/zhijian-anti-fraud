/** 与初始 frontend.html 中 API_BASE 一致，可通过环境变量覆盖 */
export function getApiBase(): string {
  const v = import.meta.env.VITE_API_BASE as string | undefined
  return (v && v.replace(/\/$/, '')) || 'http://127.0.0.1:8888'
}
