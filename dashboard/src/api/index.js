import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dr_dashboard_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('dr_dashboard_token')
      localStorage.removeItem('dr_dashboard_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const authDiscord = (code) => api.post('/api/auth/discord', { code })
export const getStats = () => api.get('/api/dashboard/stats')
export const getConfig = () => api.get('/api/dashboard/config')
export const updateConfig = (data) => api.post('/api/dashboard/config', data)
export const getBirthdays = () => api.get('/api/dashboard/birthdays')
export const deleteBirthday = (discord_id) => api.delete(`/api/dashboard/birthdays/${discord_id}`)
export const getPolls = () => api.get('/api/dashboard/polls')
export const endPoll = (id) => api.post(`/api/dashboard/polls/${id}/end`)
export const getRoute = () => api.get('/api/dashboard/route')
export const getRouteLastPlayer = () => api.get('/api/dashboard/route/last-player')
export const updateRoute = (data) => api.post('/api/dashboard/route', data)
export const getEvents = () => api.get('/api/dashboard/events')
export const createEvent = (data) => api.post('/api/dashboard/events', data)
export const updateEvent = (id, data) => api.put(`/api/dashboard/events/${id}`, data)
export const deleteEvent = (id) => api.delete(`/api/dashboard/events/${id}`)
export const getSnapshots = () => api.get('/api/dashboard/snapshots')
export const getNotifications = () => api.get('/api/dashboard/notifications')

export const getAutomodConfig  = ()       => api.get('/api/dashboard/automod/config')
export const updateAutomodConfig = (data) => api.put('/api/dashboard/automod/config', data)
export const getAutomodWarnings  = (params = '') => api.get(`/api/dashboard/automod/warnings${params}`)
export const deleteAutomodWarning = (id)  => api.delete(`/api/dashboard/automod/warnings/${id}`)
export const purgeAutomodWarnings = (discordId) => api.delete(`/api/dashboard/automod/warnings/member/${encodeURIComponent(discordId)}`)
export const getAutomodChannels  = ()     => api.get('/api/dashboard/automod/channels').catch(() => ({ data: [] }))
export const getAutomodRoles     = ()     => api.get('/api/dashboard/automod/roles').catch(() => ({ data: [] }))

export default api
