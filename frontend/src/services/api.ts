import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.DEV ? 'http://localhost:4000/api' : '/api',
})

// Attach token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('JokeApptoken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Force logout on 401
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      localStorage.removeItem('JokeApptoken')
      localStorage.removeItem('loggedJokeAppUser')
      window.location.href = '?login=true'
    }
    return Promise.reject(
      error instanceof Error ? error : new Error('Request failed')
    )
  }
)

export default api
