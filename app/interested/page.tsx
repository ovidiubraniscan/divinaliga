'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import NavBar from '@/components/NavBar'

type User = {
  id: string
}

type Player = {
  id: string
  user_id: string
  status: string
  day_statuses: Record<string, string>
  username: string
  display_name: string | null
}

const dayStats = calculateDayStats()

const days = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

export default function InterestedPage() {
  const [user, setUser] = useState<User | null>(null)
  const [dayStatuses, setDayStatuses] = useState<Record<string, string>>({})
  const [players, setPlayers] = useState<Player[]>([])
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

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
        day_statuses,
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
      day_statuses: row.day_statuses || {},
      username: row.users.username,
      display_name: row.users.display_name,
    }))

    setPlayers(formatted)

    const saved = localStorage.getItem('divina_user')

    if (saved) {
      const currentUser = JSON.parse(saved)
      const myRow = formatted.find((p: Player) => p.user_id === currentUser.id)

      if (myRow) {
        setDayStatuses(myRow.day_statuses || {})
      }
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem('divina_user')

    if (saved) {
      setUser(JSON.parse(saved))
    }

    loadPlayers()
  }, [])

  const toggleDayStatus = (day: string) => {
    const current = dayStatuses[day]

    let nextStatus = ''

    if (!current) {
      nextStatus = 'interested'
    } else if (current === 'interested') {
      nextStatus = 'maybe'
    } else if (current === 'maybe') {
      nextStatus = 'unavailable'
    } else {
      nextStatus = ''
    }

    const updated = { ...dayStatuses }

    if (nextStatus) {
      updated[day] = nextStatus
    } else {
      delete updated[day]
    }

    setDayStatuses(updated)
  }

  const handleSubmit = async () => {
    if (!user) {
      setMessage('Please log in first')
      return
    }

    setSaving(true)
    setMessage('')

    const weekStart = getWeekStart()

    const { error } = await supabase
      .from('weekly_interest')
      .upsert(
        {
          user_id: user.id,
          week_start: weekStart,
          status: 'submitted',
          day_statuses: dayStatuses,
        },
        { onConflict: 'user_id,week_start' }
      )

    if (error) {
      setMessage(error.message)
      setSaving(false)
      return
    }

    setMessage('Availability updated')
    setSaving(false)
    loadPlayers()
  }

  const getDayButtonStyle = (currentStatus: string | undefined) => {
    let background = '#15171A'
    let borderColor = '#2A2D31'
    let color = 'white'

    if (currentStatus === 'interested') {
      background = '#22C55E'
      borderColor = '#22C55E'
    }

    if (currentStatus === 'maybe') {
      background = '#FACC15'
      borderColor = '#FACC15'
      color = 'black'
    }

    if (currentStatus === 'unavailable') {
      background = '#EF4444'
      borderColor = '#EF4444'
    }

    return {
      ...dayButton,
      background,
      borderColor,
      color,
    }
  }

  const getStatusLabel = (status: string | undefined) => {
    if (status === 'interested') return 'Interested'
    if (status === 'maybe') return 'Maybe'
    if (status === 'unavailable') return 'Not available'
    return 'Not selected'
  }
const calculateDayStats = () => {
  const stats: Record<string, { interested: number; maybe: number }> = {}

  days.forEach((day) => {
    stats[day] = { interested: 0, maybe: 0 }
  })

  players.forEach((player) => {
    const statuses = player.day_statuses || {}

    Object.entries(statuses).forEach(([day, status]) => {
      if (status === 'interested') stats[day].interested++
      if (status === 'maybe') stats[day].maybe++
    })
  })

  return stats
}

  return (
    <>
      <NavBar />

      <main style={mainStyle}>
        <div style={{ maxWidth: '420px', margin: '0 auto' }}>
          <h1 style={titleStyle}>This Week</h1>

          <p style={{ marginTop: '10px', color: '#A1A1AA' }}>
            Tap each day to set your availability.
          </p>

          <div style={legendStyle}>
            <span style={{ color: '#22C55E' }}>Green = Interested</span>
            <span style={{ color: '#FACC15' }}>Yellow = Maybe</span>
            <span style={{ color: '#EF4444' }}>Red = Not available</span>
          </div>

          <div style={cardStyle}>
            <h2 style={{ marginTop: 0 }}>Your availability</h2>

            <div style={daysGrid}>
              {days.map((day) => {
                const currentStatus = dayStatuses[day]

                return (
                  <button
                    key={day}
                    onClick={() => toggleDayStatus(day)}
                    style={getDayButtonStyle(currentStatus)}
                  >
                    <strong>{day.slice(0, 3)}</strong>
                    <small style={{ display: 'block', marginTop: '4px', fontSize: '10px' }}>
                      {getStatusLabel(currentStatus)}
                    </small>
                  </button>
                )
              })}
            </div>

            <button onClick={handleSubmit} style={saveButton} disabled={saving}>
              {saving ? 'Saving...' : 'Save Availability'}
            </button>
          </div>

          {message && (
            <p
              style={{
                marginTop: '12px',
                color: message.includes('updated') ? '#36D399' : '#F87272',
              }}
            >
              {message}
            </p>
          )}
<div style={section}>
  <h2 style={{ color: '#E85D04' }}>Best Days</h2>

  {days.map((day) => {
    const stat = dayStats[day]

    return (
      <div key={day} style={playerCard}>
        <strong>{day}</strong>

        <div style={{ marginTop: '6px', fontSize: '14px' }}>
          <span style={{ color: '#22C55E' }}>
            {stat.interested} interested
          </span>
          {' / '}
          <span style={{ color: '#FACC15' }}>
            {stat.maybe} maybe
          </span>
        </div>
      </div>
    )
  })}
</div>
          <div style={section}>
            <h2 style={{ color: '#E85D04' }}>Players this week</h2>

            {players.length === 0 ? (
              <p style={{ color: '#A1A1AA' }}>No players have submitted yet.</p>
            ) : (
              players.map((player) => (
                <div key={player.id} style={playerCard}>
                  <strong>{player.display_name || player.username}</strong>

                  <div style={miniDaysGrid}>
                    {days.map((day) => {
                      const status = player.day_statuses?.[day]

                      return (
                        <div
                          key={day}
                          style={{
                            ...miniDay,
                            background:
                              status === 'interested'
                                ? '#22C55E'
                                : status === 'maybe'
                                  ? '#FACC15'
                                  : status === 'unavailable'
                                    ? '#EF4444'
                                    : '#1F2937',
                            color: status === 'maybe' ? 'black' : 'white',
                          }}
                        >
                          {day.slice(0, 3)}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
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

const legendStyle = {
  marginTop: '16px',
  display: 'grid',
  gap: '6px',
  fontSize: '13px',
}

const cardStyle = {
  marginTop: '20px',
  background: '#15171A',
  border: '1px solid #2A2D31',
  borderRadius: '14px',
  padding: '16px',
}

const daysGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '8px',
}

const dayButton = {
  padding: '12px',
  border: '1px solid #2A2D31',
  borderRadius: '10px',
  fontWeight: 'bold',
  cursor: 'pointer',
  minHeight: '68px',
}

const saveButton = {
  width: '100%',
  marginTop: '16px',
  padding: '14px',
  background: '#E85D04',
  border: 'none',
  borderRadius: '10px',
  color: 'white',
  fontWeight: 'bold',
  cursor: 'pointer',
}

const section = {
  marginTop: '24px',
}

const playerCard = {
  padding: '12px',
  background: '#15171A',
  border: '1px solid #2A2D31',
  borderRadius: '10px',
  marginTop: '10px',
}

const miniDaysGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  gap: '4px',
  marginTop: '10px',
}

const miniDay = {
  padding: '6px 2px',
  borderRadius: '6px',
  textAlign: 'center' as const,
  fontSize: '10px',
  fontWeight: 'bold',
}