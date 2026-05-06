'use client'

import { ChangeEvent, useState } from 'react'
import { supabase } from '@/lib/supabase'
import NavBar from '@/components/NavBar'

const POSITIONS = ['Goalkeeper', 'Defender', 'Midfield', 'Attacker'] as const
const FEET = ['Right', 'Left', 'Both'] as const

type PreferredFoot = (typeof FEET)[number]

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [playerNumber, setPlayerNumber] = useState('')
  const [profilePictureUrl, setProfilePictureUrl] = useState('')
  const [preferredFoot, setPreferredFoot] = useState<PreferredFoot>('Right')
  const [mainPosition, setMainPosition] = useState('')
  const [secondaryPositions, setSecondaryPositions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)

  const toggleSecondaryPosition = (position: string) => {
    setSecondaryPositions((current) =>
      current.includes(position)
        ? current.filter((item) => item !== position)
        : [...current, position]
    )
  }

  const handleRegister = async () => {
    setMessage('')
    setSuccess(false)

    const cleanEmail = email.trim().toLowerCase()
    const cleanNickname = nickname.trim()

    if (!cleanEmail) {
      setMessage('Please enter your email address.')
      return
    }

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters.')
      return
    }

    if (!cleanNickname) {
      setMessage('Please enter your nickname.')
      return
    }

    if (!mainPosition) {
      setMessage('Please choose your main position.')
      return
    }

    setLoading(true)

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
    })

    if (signUpError) {
      setMessage(signUpError.message)
      setLoading(false)
      return
    }

    const userId = signUpData.user?.id

    if (!userId) {
      setMessage('Account created, but profile could not be linked yet. Please confirm your email and log in.')
      setLoading(false)
      return
    }

    const { error: profileError } = await supabase.from('players').insert({
      auth_user_id: userId,
      nickname: cleanNickname,
      player_number: playerNumber ? Number(playerNumber) : null,
      rating: 50,
      profile_picture_url: profilePictureUrl.trim() || null,
      preferred_foot: preferredFoot,
      main_position: mainPosition,
      secondary_positions: secondaryPositions,
      games_played: 0,
      goals: 0,
      assists: 0,
    })

    if (profileError) {
      setMessage(profileError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setMessage('Account and player profile created successfully. You can now log in and check in with your ticket.')
    setEmail('')
    setPassword('')
    setNickname('')
    setPlayerNumber('')
    setProfilePictureUrl('')
    setPreferredFoot('Right')
    setMainPosition('')
    setSecondaryPositions([])
    setLoading(false)
  }

  return (
    <main style={pageStyle}>
      <NavBar />

      <div style={containerStyle}>
        <div style={headerCardStyle}>
          <p style={eyebrowStyle}>DIVINA LIGA</p>
          <h1 style={titleStyle}>Create Player Profile</h1>
          <p style={subtitleStyle}>
            Register once, then your player card will be used automatically when you scan a valid ticket.
          </p>
        </div>

        <div style={formCardStyle}>
          <label style={labelStyle}>Email</label>
          <input
            placeholder="you@example.com"
            value={email}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
            style={inputStyle}
            type="email"
            autoComplete="email"
          />

          <label style={labelStyle}>Password</label>
          <input
            placeholder="Minimum 6 characters"
            value={password}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
            style={inputStyle}
            type="password"
            autoComplete="new-password"
          />

          <label style={labelStyle}>Nickname</label>
          <input
            placeholder="e.g. Ovi"
            value={nickname}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setNickname(event.target.value)}
            style={inputStyle}
          />

          <label style={labelStyle}>Player Number</label>
          <input
            placeholder="e.g. 10"
            value={playerNumber}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setPlayerNumber(event.target.value.replace(/\D/g, ''))}
            style={inputStyle}
            inputMode="numeric"
          />

          <label style={labelStyle}>Profile Picture URL</label>
          <input
            placeholder="https://..."
            value={profilePictureUrl}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setProfilePictureUrl(event.target.value)}
            style={inputStyle}
          />

          <label style={labelStyle}>Preferred Foot</label>
          <div style={buttonGridStyle}>
            {FEET.map((foot) => (
              <button
                key={foot}
                type="button"
                onClick={() => setPreferredFoot(foot)}
                style={preferredFoot === foot ? activeChoiceStyle : choiceStyle}
              >
                {foot}
              </button>
            ))}
          </div>

          <label style={labelStyle}>Main Position</label>
          <div style={buttonGridStyle}>
            {POSITIONS.map((position) => (
              <button
                key={position}
                type="button"
                onClick={() => setMainPosition(position)}
                style={mainPosition === position ? activeChoiceStyle : choiceStyle}
              >
                {position}
              </button>
            ))}
          </div>

          <label style={labelStyle}>Secondary Positions</label>
          <div style={buttonGridStyle}>
            {POSITIONS.map((position) => (
              <button
                key={position}
                type="button"
                onClick={() => toggleSecondaryPosition(position)}
                style={secondaryPositions.includes(position) ? activeChoiceStyle : choiceStyle}
              >
                {position}
              </button>
            ))}
          </div>

          <div style={previewCardStyle}>
            <div>
              <p style={previewRatingStyle}>50</p>
              <p style={previewTierStyle}>BRONZE</p>
            </div>
            <div style={{ flex: 1 }}>
              <p style={previewNameStyle}>{nickname || 'Nickname'}</p>
              <p style={previewMetaStyle}>#{playerNumber || '--'} • {preferredFoot} Foot</p>
              <p style={previewMetaStyle}>{mainPosition || 'Main position'}</p>
            </div>
          </div>

          <button onClick={handleRegister} style={loading ? disabledButtonStyle : buttonStyle} disabled={loading}>
            {loading ? 'Creating Profile...' : 'Create Account & Player Card'}
          </button>

          {message && (
            <p style={success ? successMessageStyle : errorMessageStyle}>{message}</p>
          )}
        </div>
      </div>
    </main>
  )
}

const pageStyle = {
  minHeight: '100vh',
  background: 'radial-gradient(circle at top, #1F2937, #050505 55%)',
  color: '#F5F5F4',
  padding: '24px',
} as const

const containerStyle = {
  maxWidth: '460px',
  margin: '0 auto',
} as const

const headerCardStyle = {
  padding: '20px',
  borderRadius: '24px',
  background: 'rgba(15, 23, 42, 0.78)',
  border: '1px solid rgba(255,255,255,0.08)',
  marginBottom: '16px',
} as const

const eyebrowStyle = {
  fontSize: '12px',
  letterSpacing: '0.28em',
  color: '#34D399',
  fontWeight: 900,
  marginBottom: '8px',
} as const

const titleStyle = {
  fontSize: '30px',
  fontWeight: 900,
  color: '#FFFFFF',
  margin: 0,
} as const

const subtitleStyle = {
  fontSize: '14px',
  color: '#CBD5E1',
  marginTop: '8px',
  lineHeight: 1.5,
} as const

const formCardStyle = {
  padding: '18px',
  borderRadius: '24px',
  background: 'rgba(15, 23, 42, 0.84)',
  border: '1px solid rgba(255,255,255,0.08)',
} as const

const labelStyle = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 800,
  color: '#E2E8F0',
  marginBottom: '8px',
  marginTop: '12px',
} as const

const inputStyle = {
  width: '100%',
  padding: '13px',
  marginBottom: '4px',
  borderRadius: '14px',
  border: '1px solid #334155',
  background: '#020617',
  color: 'white',
  outline: 'none',
} as const

const buttonGridStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '8px',
  marginBottom: '6px',
} as const

const choiceStyle = {
  padding: '11px',
  borderRadius: '14px',
  border: '1px solid #334155',
  background: '#0F172A',
  color: '#CBD5E1',
  fontWeight: 800,
  cursor: 'pointer',
} as const

const activeChoiceStyle = {
  ...choiceStyle,
  background: '#22C55E',
  border: '1px solid #86EFAC',
  color: '#052E16',
} as const

const buttonStyle = {
  width: '100%',
  padding: '14px',
  marginTop: '16px',
  background: '#E85D04',
  border: 'none',
  borderRadius: '16px',
  color: 'white',
  fontWeight: 900,
  cursor: 'pointer',
} as const

const disabledButtonStyle = {
  ...buttonStyle,
  opacity: 0.65,
  cursor: 'not-allowed',
} as const

const previewCardStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '14px',
  marginTop: '16px',
  padding: '14px',
  borderRadius: '20px',
  background: 'linear-gradient(135deg, rgba(146, 64, 14, 0.42), rgba(15, 23, 42, 0.95))',
  border: '1px solid rgba(251, 146, 60, 0.35)',
} as const

const previewRatingStyle = {
  fontSize: '34px',
  lineHeight: 1,
  fontWeight: 900,
  color: '#FDBA74',
} as const

const previewTierStyle = {
  fontSize: '10px',
  letterSpacing: '0.18em',
  fontWeight: 900,
  color: '#FED7AA',
} as const

const previewNameStyle = {
  fontSize: '19px',
  fontWeight: 900,
  color: '#FFFFFF',
} as const

const previewMetaStyle = {
  fontSize: '12px',
  color: '#CBD5E1',
  marginTop: '3px',
} as const

const errorMessageStyle = {
  marginTop: '12px',
  color: '#FCA5A5',
  fontWeight: 700,
} as const

const successMessageStyle = {
  marginTop: '12px',
  color: '#86EFAC',
  fontWeight: 700,
} as const
