'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type UserRow = {
  id: string
  username: string
  pin: string
  display_name: string | null
}

export default function NavBar() {
  const [user, setUser] = useState<UserRow | null>(null)

  useEffect(() => {
    const savedUser = localStorage.getItem('divina_user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
  }, [])

  return (
    <nav
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 24px',
        borderBottom: '1px solid #2A2D31',
        background: '#111214',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <Link
        href="/"
        style={{
          color: '#E85D04',
          fontWeight: 'bold',
          fontSize: '20px',
          textDecoration: 'none',
        }}
      >
        DIVINA LIGA
      </Link>

      <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
        <Link href="/" style={linkStyle}>Home</Link>
        <Link href="/register" style={linkStyle}>Register</Link>
        <Link href="/login" style={linkStyle}>Login</Link>
        <Link href="/profile" style={linkStyle}>Profile</Link>
        {user && (
          <span style={{ color: '#A1A1AA', fontSize: '14px' }}>
            {user.display_name || user.username}
          </span>
        )}
      </div>
    </nav>
  )
}

const linkStyle = {
  color: '#F5F5F4',
  textDecoration: 'none',
  fontSize: '14px',
}