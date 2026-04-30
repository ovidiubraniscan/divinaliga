'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import NavBar from '@/components/NavBar'

type Player = {
  id: string
  user_id: string
  status: string
  username: string
  display_name: string | null
}

export default function InterestedPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [message, setMessage] = useState('')

  const getWeekStart = () => {
    const now = new Date()
    const day = now.getDay()
    const diff = now.getDate() - day
    const start = new Date(now.setDate(diff))
    return start.toISOString().split('T')[0]
  }

  const loadPlayers = async () => {
    const weekStart = getWeekStart()

    const { data, error } = await supabase
      .from('weekly_interest')
      .select(`
        id,
        user_id,
        status,
        users (
          username,
          display_name
        )
      `)
      .eq('week_start', weekStart)

    if (error) {
      setMessage(error.message)
      return
    }

    const formatted = data.map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      status: row.status,
      username: row.users.username,
      display_name: row.users.display_name,
    }))

    setPlayers(formatted)
  }

  useEffect(() => {
    loadPlayers()
  }, [])

  const renderPlayers = (status: string) => {
    return players
      .filter((p) => p.status === status)
      .map((p) => (
        <div key={p.id} style={playerCard}>
          {p.display_name || p.username}
        </div>
      ))
  }

  return (
    <>
      <NavBar />

      <main style={mainStyle}>
        <div style={{ maxWidth: '420px', margin: '0 auto' }}>
          <h1 style={titleStyle}>This Week Players</h1>

          <div style={section}>
            <h2 style={green}>Interested</h2>
            {renderPlayers('interested')}
          </div>

          <div style={section}>
            <h2 style={yellow}>Maybe</h2>
            {renderPlayers('maybe')}
          </div>

          <div style={section}>
            <h2 style={gray}>Unavailable</h2>
            {renderPlayers('unavailable')}
          </div>

          {message && <p>{message}</p>}
        </div>
      </main>
    </>
  )
}

const mainStyle = {
  minHeight: '100vh',
  background: '#0B0B0C',
  color: '#F5F5F4',
  padding: '24px',
}

const titleStyle = {
  fontSize: '28px',
  fontWeight: 'bold',
  color: '#E85D04',
}

const section = {
  marginTop: '20px',
}

const playerCard = {
  padding: '10px',
  background: '#15171A',
  border: '1px solid #2A2D31',
  borderRadius: '10px',
  marginTop: '6px',
}

const green = { color: '#22C55E' }
const yellow = { color: '#FACC15' }
const gray = { color: '#9CA3AF' }