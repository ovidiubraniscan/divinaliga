'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import NavBar from '@/components/NavBar'

const matchStart = new Date('2026-05-08T10:00:00+01:00')
const matchEnd = new Date('2026-05-08T12:00:00+01:00')

export default function Home() {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft())

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const gameStarted = timeLeft.total <= 0

  return (
    <>
      <NavBar />

      <main
        style={{
          minHeight: '100vh',
          background:
            'radial-gradient(circle at top, rgba(232, 93, 4, 0.18), transparent 34%), #0B0B0C',
          color: '#F5F5F4',
          padding: '28px 20px 40px',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div style={{ maxWidth: '520px', margin: '0 auto' }}>
          <section
            style={{
              marginTop: '24px',
              padding: '24px',
              background: 'linear-gradient(180deg, #181A1E, #101113)',
              border: '1px solid #2A2D31',
              borderRadius: '24px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
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
              DIVINA LIGA
            </p>

            <h1
              style={{
                fontSize: '34px',
                lineHeight: 1.05,
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
              Register your player card, check in with your ticket, and get ready for match day.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '20px' }}>
              <Link href="/register" style={primaryButton}>
                Register
              </Link>
              <Link href="/login" style={secondaryButton}>
                Log in
              </Link>
            </div>
          </section>

          <section style={countdownCard}>
            <p style={smallOrangeText}>{gameStarted ? 'MATCH STATUS' : 'TIME UNTIL NEXT MATCH STARTS'}</p>

            <h2 style={countdownTitle}>{gameStarted ? 'GAME ON! WE ARE PLAYING NOW' : formatCountdown(timeLeft)}</h2>

            {!gameStarted && (
              <div style={countdownGrid}>
                <TimeBox label="Days" value={timeLeft.days} />
                <TimeBox label="Hours" value={timeLeft.hours} />
                <TimeBox label="Mins" value={timeLeft.minutes} />
                <TimeBox label="Secs" value={timeLeft.seconds} />
              </div>
            )}

            <div style={{ marginTop: '18px', display: 'grid', gap: '8px' }}>
              <p style={matchInfoText}>Friday 8th of May</p>
              <p style={matchInfoText}>Starting at 10:00, finishing at 12:00</p>
              <p style={matchInfoText}>The Leah Williamson Pitch</p>
              <p style={matchInfoSubText}>37GH+X7, Newport Pagnell MK16 0DF</p>
            </div>

            <a
              href="https://maps.app.goo.gl/kVMgrAtWXwkkz5MN8"
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...primaryButton, marginTop: '18px' }}
            >
              Get Directions
            </a>
          </section>

          <section style={{ marginTop: '20px', display: 'grid', gap: '14px' }}>
            <div style={cardStyle}>
              <h2 style={cardTitle}>Match Day</h2>
              <div style={buttonGrid}>
                <Link href="/check-in" style={actionButton}>
                  Check In
                </Link>
                <Link href="/profile" style={actionButton}>
                  My Player Card
                </Link>
                <DisabledButton label="Players Today" />
                <DisabledButton label="Voting Soon" />
                <DisabledButton label="League Table" />
                <DisabledButton label="Fixtures" />
              </div>
              <p style={{ ...cardText, marginTop: '12px' }}>
                Grey buttons are planned pages and are currently blocked until they are ready.
              </p>
            </div>

            <div style={cardStyle}>
              <h2 style={cardTitle}>How it works</h2>
              <p style={cardText}>1. Register your player profile</p>
              <p style={cardText}>2. Scan your match ticket on check-in</p>
              <p style={cardText}>3. Teams are created by admin</p>
              <p style={cardText}>4. Voting and player ratings will come later</p>
            </div>
          </section>
        </div>
      </main>
    </>
  )
}

function TimeBox({ label, value }: { label: string; value: number }) {
  return (
    <div style={timeBox}>
      <p style={timeBoxValue}>{String(value).padStart(2, '0')}</p>
      <p style={timeBoxLabel}>{label}</p>
    </div>
  )
}

function DisabledButton({ label }: { label: string }) {
  return (
    <button type="button" disabled style={disabledButton}>
      {label}
      <span style={{ display: 'block', marginTop: '3px', fontSize: '10px', opacity: 0.75 }}>Coming soon</span>
    </button>
  )
}

function getTimeLeft() {
  const total = matchStart.getTime() - new Date().getTime()
  const safeTotal = Math.max(total, 0)

  const days = Math.floor(safeTotal / (1000 * 60 * 60 * 24))
  const hours = Math.floor((safeTotal / (1000 * 60 * 60)) % 24)
  const minutes = Math.floor((safeTotal / (1000 * 60)) % 60)
  const seconds = Math.floor((safeTotal / 1000) % 60)

  return { total, days, hours, minutes, seconds }
}

function formatCountdown(timeLeft: ReturnType<typeof getTimeLeft>) {
  return `${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.minutes}m ${timeLeft.seconds}s`
}

const primaryButton = {
  display: 'inline-block',
  width: '100%',
  textAlign: 'center' as const,
  padding: '13px 14px',
  background: '#E85D04',
  borderRadius: '14px',
  color: 'white',
  fontWeight: 'bold',
  textDecoration: 'none',
  border: '1px solid #F97316',
}

const secondaryButton = {
  display: 'inline-block',
  width: '100%',
  textAlign: 'center' as const,
  padding: '13px 14px',
  background: '#1C1F23',
  border: '1px solid #2A2D31',
  borderRadius: '14px',
  color: 'white',
  fontWeight: 'bold',
  textDecoration: 'none',
}

const countdownCard = {
  marginTop: '18px',
  padding: '22px',
  background: 'linear-gradient(180deg, rgba(232,93,4,0.16), #15171A)',
  border: '1px solid rgba(249, 115, 22, 0.35)',
  borderRadius: '24px',
}

const smallOrangeText = {
  margin: 0,
  color: '#FDBA74',
  fontSize: '12px',
  fontWeight: 'bold',
  letterSpacing: '1.4px',
}

const countdownTitle = {
  margin: '10px 0 0 0',
  fontSize: '28px',
  lineHeight: 1.1,
  fontWeight: 'bold',
  color: '#FFFFFF',
}

const countdownGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: '8px',
  marginTop: '18px',
}

const timeBox = {
  background: '#0B0B0C',
  border: '1px solid #2A2D31',
  borderRadius: '16px',
  padding: '12px 6px',
  textAlign: 'center' as const,
}

const timeBoxValue = {
  margin: 0,
  fontSize: '22px',
  fontWeight: 'bold',
  color: '#FFFFFF',
}

const timeBoxLabel = {
  margin: '4px 0 0 0',
  fontSize: '11px',
  color: '#A1A1AA',
  textTransform: 'uppercase' as const,
}

const matchInfoText = {
  margin: 0,
  color: '#F5F5F4',
  fontWeight: 'bold',
}

const matchInfoSubText = {
  margin: 0,
  color: '#A1A1AA',
}

const cardStyle = {
  background: '#15171A',
  border: '1px solid #2A2D31',
  borderRadius: '20px',
  padding: '18px',
}

const cardTitle = {
  margin: '0 0 12px 0',
  fontSize: '19px',
  fontWeight: 'bold',
  color: '#F5F5F4',
}

const cardText = {
  margin: '7px 0',
  color: '#A1A1AA',
  lineHeight: 1.45,
}

const buttonGrid = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '10px',
}

const actionButton = {
  display: 'inline-block',
  textAlign: 'center' as const,
  padding: '13px 10px',
  background: '#1C1F23',
  border: '1px solid #3F4550',
  borderRadius: '14px',
  color: '#FFFFFF',
  fontWeight: 'bold',
  textDecoration: 'none',
}

const disabledButton = {
  padding: '12px 10px',
  background: '#111317',
  border: '1px solid #24272D',
  borderRadius: '14px',
  color: '#6B7280',
  fontWeight: 'bold',
  cursor: 'not-allowed',
  opacity: 0.72,
}
