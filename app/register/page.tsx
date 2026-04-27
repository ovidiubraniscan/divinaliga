'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import NavBar from '@/components/NavBar'

export default function Register() {
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [message, setMessage] = useState('')

  const handleRegister = async () => {
    setMessage('')

    if (pin.length !== 4) {
      setMessage('PIN must be 4 digits')
      return
    }

    const { error } = await supabase.from('users').insert([
      {
        username,
        pin,
        display_name: displayName,
      },
    ])

    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Account created successfully')
      setUsername('')
      setPin('')
      setDisplayName('')
    }
  }

  return (
    
    <main style={{
      minHeight: '100vh',
      background: '#0B0B0C',
      color: '#F5F5F4',
      padding: '24px'
    }}>
        <NavBar />
      <div style={{ maxWidth: '400px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#E85D04' }}>
          Register
        </h1>

        <div style={{ marginTop: '20px' }}>
          <input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="4-digit PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            maxLength={4}
            style={inputStyle}
          />

          <input
            placeholder="Display name (e.g. Ovidiu B.)"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            style={inputStyle}
          />

          <button onClick={handleRegister} style={buttonStyle}>
            Create Account
          </button>

          {message && (
            <p style={{ marginTop: '12px', color: '#F87272' }}>
              {message}
            </p>
          )}
        </div>
      </div>
    </main>
  )
}

const inputStyle = {
  width: '100%',
  padding: '12px',
  marginBottom: '12px',
  borderRadius: '10px',
  border: '1px solid #2A2D31',
  background: '#15171A',
  color: 'white'
}

const buttonStyle = {
  width: '100%',
  padding: '12px',
  background: '#E85D04',
  border: 'none',
  borderRadius: '10px',
  color: 'white',
  fontWeight: 'bold',
  cursor: 'pointer'
}