'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import NavBar from '@/components/NavBar'

type User = {
  id: string
}

export default function InterestedPage() {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState('')
  const [message, setMessage] = useState('')

  const getWeekStart = () => {
    const now = new Date()
    const day = now.getDay()
    const diff = now.getDate() - day
    const start = new Date(now.setDate(diff))
    return start.toISOString().split('T')[0]
  }

  useEffect(() => {
    const saved = localStorage.getItem('divina_user')
    if (saved) {
      setUser(JSON.parse(saved))
    }
  }, [])

  const handleSubmit = async (newStatus: string) => {
    if (!user) return

    const weekStart = getWeekStart()

    const { error } = await supabase
      .from('weekly_interest')
      .upsert(
        {
          user_id: user.id,
          week_start: weekStart,
          status: newStatus,
        },
        { onConflict: 'user_id,week_start' }
      )

    if (error) {
      setMessage(error.message)
    } else {
      setStatus(newStatus)
      setMessage('Status updated')
    }
  }

  return (
    <>
      <NavBar />

      <main style={mainStyle}>
        <div style={{ maxWidth: '420px', margin: '0 auto' }}>
          <h1 style={titleStyle}>This Week</h1>

          <p style={{ marginTop: '10px', color: '#A1A1AA' }}>
            Are you playing this week?
          </p>

          <div style={{ marginTop: '20px', display: 'grid', gap: '12px' }}>
            <button onClick={() => handleSubmit('interested')} style={btnGreen}>
              Interested
            </button>

            <button onClick={() => handleSubmit('maybe')} style={btnYellow}>
              Maybe
            </button>

            <button onClick={() => handleSubmit('unavailable')} style={btnGray}>
              Not available
            </button>
          </div>

          {status && (
            <p style={{ marginTop: '16px' }}>
              Current: <strong>{status}</strong>
            </p>
          )}

          {message && (
            <p style={{ marginTop: '10px', color: '#36D399' }}>
              {message}
            </p>
          )}
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

const btnGreen = {
  padding: '14px',
  background: '#22C55E',
  border: 'none',
  borderRadius: '10px',
  color: 'white',
  fontWeight: 'bold',
}

const btnYellow = {
  padding: '14px',
  background: '#FACC15',
  border: 'none',
  borderRadius: '10px',
  color: 'black',
  fontWeight: 'bold',
}

const btnGray = {
  padding: '14px',
  background: '#1F2937',
  border: 'none',
  borderRadius: '10px',
  color: 'white',
  fontWeight: 'bold',
}