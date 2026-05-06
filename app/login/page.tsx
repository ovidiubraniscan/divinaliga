'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import NavBar from '@/components/NavBar'

type PlayerProfile = {
  id: string
  username: string
  pin_code: string | null
  nickname: string
  player_number: number | null
  rating: number
  profile_picture_url: string | null
  preferred_foot: 'Right' | 'Left' | 'Both' | null
  main_position: string | null
  secondary_positions: string[] | null
  games_played: number
  goals: number
  assists: number
  is_active: boolean
}

export default function Login() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentPlayer, setCurrentPlayer] = useState<PlayerProfile | null>(null)

  useEffect(() => {
    const savedPlayer = localStorage.getItem('divina_player')

    if (!savedPlayer) return

    try {
      setCurrentPlayer(JSON.parse(savedPlayer) as PlayerProfile)
    } catch {
      localStorage.removeItem('divina_player')
    }
  }, [])

  const handleLogin = async () => {
    setMessage('')

    const cleanUsername = username.trim().toLowerCase()
    const cleanPin = pin.trim()

    if (!cleanUsername) {
      setMessage('Please enter your username.')
      return
    }

    if (!/^\d{4}$/.test(cleanPin)) {
      setMessage('PIN must be exactly 4 digits.')
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from('players')
      .select(
        'id, username, pin_code, nickname, player_number, rating, profile_picture_url, preferred_foot, main_position, secondary_positions, games_played, goals, assists, is_active'
      )
      .eq('username', cleanUsername)
      .eq('pin_code', cleanPin)
      .eq('is_active', true)
      .maybeSingle()

    setLoading(false)

    if (error) {
      setMessage(error.message)
      return
    }

    if (!data) {
      setMessage('Incorrect username or PIN.')
      return
    }

    localStorage.setItem('divina_player', JSON.stringify(data))
    localStorage.removeItem('divina_user')
    setCurrentPlayer(data as PlayerProfile)
    router.push('/profile')
  }

  const handleLogout = () => {
    localStorage.removeItem('divina_player')
    localStorage.removeItem('divina_user')
    setCurrentPlayer(null)
    setUsername('')
    setPin('')
    setMessage('Logged out successfully.')
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top, rgba(232,93,4,0.2), transparent 34%), #0B0B0C',
        color: '#F5F5F4',
        padding: '24px',
      }}
    >
      <NavBar />

      <div style={{ maxWidth: '430px', margin: '0 auto', paddingTop: '28px' }}>
        <div
          style={{
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(21,23,26,0.92)',
            borderRadius: '24px',
            padding: '22px',
            boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
          }}
        >
          <p
            style={{
              color: '#FDBA74',
              fontSize: '12px',
              fontWeight: 900,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}
          >
            Divina Liga
          </p>

          <h1 style={{ fontSize: '30px', fontWeight: 900, color: '#FFFFFF' }}>
            Player Login
          </h1>

          <p style={{ marginTop: '8px', color: '#A8A29E', lineHeight: 1.5 }}>
            Use your username and 4-digit PIN. Admin login stays separate and secure through Supabase Auth.
          </p>

          {currentPlayer && (
            <div
              style={{
                marginTop: '18px',
                padding: '14px',
                borderRadius: '18px',
                background: 'rgba(34,197,94,0.12)',
                border: '1px solid rgba(34,197,94,0.35)',
              }}
            >
              <p style={{ color: '#86EFAC', fontWeight: 900 }}>
                Logged in as {currentPlayer.nickname}
              </p>
              <p style={{ marginTop: '4px', color: '#D6D3D1', fontSize: '13px' }}>
                Rating {currentPlayer.rating}/99 · #{currentPlayer.player_number ?? 'N/A'}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
                <button onClick={() => router.push('/profile')} style={secondaryButtonStyle}>
                  Profile
                </button>
                <button onClick={handleLogout} style={dangerButtonStyle}>
                  Log out
                </button>
              </div>
            </div>
          )}

          {!currentPlayer && (
            <div style={{ marginTop: '22px' }}>
              <label style={labelStyle}>Username</label>
              <input
                placeholder="example: ovidiu10"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleLogin()
                }}
                autoComplete="username"
                style={inputStyle}
              />

              <label style={labelStyle}>4-digit PIN</label>
              <input
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleLogin()
                }}
                maxLength={4}
                inputMode="numeric"
                type="password"
                autoComplete="current-password"
                style={inputStyle}
              />

              <button onClick={handleLogin} disabled={loading} style={buttonStyle}>
                {loading ? 'Checking...' : 'Log in'}
              </button>

              <button onClick={() => router.push('/register')} style={secondaryFullButtonStyle}>
                Create Player Profile
              </button>
            </div>
          )}

          {message && (
            <p
              style={{
                marginTop: '14px',
                color: message.includes('successfully') ? '#86EFAC' : '#FCA5A5',
                fontWeight: 700,
              }}
            >
              {message}
            </p>
          )}
        </div>
      </div>
    </main>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '6px',
  color: '#D6D3D1',
  fontSize: '13px',
  fontWeight: 800,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '13px 14px',
  marginBottom: '14px',
  borderRadius: '14px',
  border: '1px solid #2A2D31',
  background: '#0F1115',
  color: 'white',
  outline: 'none',
}

const buttonStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px',
  background: '#E85D04',
  border: 'none',
  borderRadius: '14px',
  color: 'white',
  fontWeight: 900,
  cursor: 'pointer',
  marginTop: '4px',
}

const secondaryFullButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '13px',
  background: 'transparent',
  border: '1px solid #44403C',
  borderRadius: '14px',
  color: '#E7E5E4',
  fontWeight: 800,
  cursor: 'pointer',
  marginTop: '10px',
}

const secondaryButtonStyle: React.CSSProperties = {
  padding: '11px',
  background: '#292524',
  border: '1px solid #57534E',
  borderRadius: '12px',
  color: '#FFFFFF',
  fontWeight: 800,
  cursor: 'pointer',
}

const dangerButtonStyle: React.CSSProperties = {
  padding: '11px',
  background: 'rgba(239,68,68,0.12)',
  border: '1px solid rgba(239,68,68,0.45)',
  borderRadius: '12px',
  color: '#FCA5A5',
  fontWeight: 800,
  cursor: 'pointer',
}
