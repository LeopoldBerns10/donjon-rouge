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
export const updateRoute = (data) => api.post('/api/dashboard/route', data)
export const getEvents = () => api.get('/api/dashboard/events')
export const createEvent = (data) => api.post('/api/dashboard/events', data)
export const updateEvent = (id, data) => api.put(`/api/dashboard/events/${id}`, data)
export const deleteEvent = (id) => api.delete(`/api/dashboard/events/${id}`)

export default api
