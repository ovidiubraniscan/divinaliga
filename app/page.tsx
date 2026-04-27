'use client'

import Link from 'next/link'
import NavBar from '@/components/NavBar'

export default function Home() {
  return (
    <>
      <NavBar />

      <main
        style={{
          minHeight: '100vh',
          background: '#0B0B0C',
          color: '#F5F5F4',
          padding: '32px 24px',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <div
            style={{
              marginTop: '32px',
              padding: '24px',
              background: '#15171A',
              border: '1px solid #2A2D31',
              borderRadius: '20px',
            }}
          >
            <p
              style={{
                color: '#E85D04',
                fontWeight: 'bold',
                marginBottom: '10px',
                letterSpacing: '1px',
              }}
            >
              MOBILE FOOTBALL LEAGUE
            </p>

            <h1
              style={{
                fontSize: '34px',
                lineHeight: 1.1,
                fontWeight: 'bold',
                margin: 0,
              }}
            >
              Play weekly football with Divina Liga
            </h1>

            <p
              style={{
                marginTop: '14px',
                color: '#A1A1AA',
                fontSize: '16px',
                lineHeight: 1.5,
              }}
            >
              Register, show interest, vote for the best day, and book your game slot using tickets.
            </p>

            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <Link href="/register" style={primaryButton}>
                Register
              </Link>
              <Link href="/login" style={secondaryButton}>
                Log in
              </Link>
            </div>
          </div>

          <div style={{ marginTop: '20px', display: 'grid', gap: '14px' }}>
            <div style={cardStyle}>
              <h2 style={cardTitle}>How it works</h2>
              <p style={cardText}>1. Create your account</p>
              <p style={cardText}>2. Mark your weekly interest</p>
              <p style={cardText}>3. Vote for the best day</p>
              <p style={cardText}>4. Use a ticket to book your place</p>
            </div>

            <div style={cardStyle}>
              <h2 style={cardTitle}>Weekly format</h2>
              <p style={cardText}>Location: Newport Pagnell</p>
              <p style={cardText}>Start time: 10:00</p>
              <p style={cardText}>Session length: 1 hour</p>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

const primaryButton = {
  display: 'inline-block',
  width: '100%',
  textAlign: 'center' as const,
  padding: '12px',
  background: '#E85D04',
  borderRadius: '10px',
  color: 'white',
  fontWeight: 'bold',
  textDecoration: 'none',
}

const secondaryButton = {
  display: 'inline-block',
  width: '100%',
  textAlign: 'center' as const,
  padding: '12px',
  background: '#1C1F23',
  border: '1px solid #2A2D31',
  borderRadius: '10px',
  color: 'white',
  fontWeight: 'bold',
  textDecoration: 'none',
}

const cardStyle = {
  background: '#15171A',
  border: '1px solid #2A2D31',
  borderRadius: '16px',
  padding: '18px',
}

const cardTitle = {
  margin: '0 0 10px 0',
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#F5F5F4',
}

const cardText = {
  margin: '6px 0',
  color: '#A1A1AA',
}