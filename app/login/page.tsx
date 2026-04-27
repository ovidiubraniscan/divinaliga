'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import NavBar from '@/components/NavBar'


type UserRow = {
  id: string
  username: string
  pin: string
  display_name: string | null
}

export default function Login() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [message, setMessage] = useState('')

  const handleLogin = async () => {
    setMessage('')

    if (pin.length !== 4) {
      setMessage('PIN must be 4 digits')
      return
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, username, pin, display_name')
      .eq('username', username)
      .eq('pin', pin)
      .maybeSingle()

    if (error) {
      setMessage(error.message)
      return
    }

    if (!data) {
      setMessage('Invalid username or PIN')
      return
    }

    localStorage.setItem('divina_user', JSON.stringify(data))
    router.push('/profile')
  }

  return (
    <main
    
      style={{
        minHeight: '100vh',
        background: '#0B0B0C',
        color: '#F5F5F4',
        padding: '24px',
      }}
    >
        <NavBar />
      <div style={{ maxWidth: '400px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#E85D04' }}>
          Log in
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

          <button onClick={handleLogin} style={buttonStyle}>
            Log in
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
  color: 'white',
}

const buttonStyle = {
  width: '100%',
  padding: '12px',
  background: '#E85D04',
  border: 'none',
  borderRadius: '10px',
  color: 'white',
  fontWeight: 'bold',
  cursor: 'pointer',
}