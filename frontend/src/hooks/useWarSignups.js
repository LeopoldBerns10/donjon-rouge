import { useState, useEffect, useCallback } from 'react'
import api from '../lib/api.js'

export function useWarSignups() {
  const [signups, setSignups]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const fetch = useCallback(() => {
    setLoading(true)
    api.get('/api/war-signups')
      .then(r => setSignups(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetch() }, [fetch])

  async function signup(war_type) {
    const r = await api.post('/api/war-signups', { war_type })
    fetch()
    return r.data
  }

  async function unsignup() {
    await api.delete('/api/war-signups')
    fetch()
  }

  async function reset() {
    await api.delete('/api/war-signups/reset')
    fetch()
  }

  return { signups, loading, error, signup, unsignup, reset, refresh: fetch }
}
