'use client'

import { useEffect, useRef, useState } from 'react'
import NavBar from '@/components/NavBar'
import { Html5Qrcode } from 'html5-qrcode'
import { supabase } from '@/lib/supabase'


type Arrival = {
  name: string
  ticket: string
  positions: string[]
  captain: boolean
  rating: number
  arrivalTime: string
}

type Team = {
  name: string
  players: Arrival[]
  totalRating: number
}

const validTickets = [
  'TCK-839201',
  'TCK-472915',
  'TCK-193847',
  'TCK-650284',
  'TCK-908173',
  'TCK-274659',
  'TCK-561902',
  'TCK-784320',
  'TCK-129875',
  'TCK-346781',
  'TCK-902134',
  'TCK-675489',
  'TCK-218903',
  'TCK-543210',
  'TCK-889761',
  'TCK-332198',
  'TCK-771245',
  'TCK-459872',
  'TCK-610394',
  'TCK-285617',
  'TCK-947302',
  'TCK-136580',
  'TCK-864209',
  'TCK-703418',
  'TCK-592731',
  'TCK-418659',
  'TCK-256904',
  'TCK-980143',
  'TCK-374628',
  'TCK-621759',
]

const positions = ['Goalkeeper', 'Defender', 'Midfield', 'Attacker']

export default function CheckInPage() {
  const scannerRef = useRef<Html5Qrcode | null>(null)

  const [scannerOpen, setScannerOpen] = useState(false)
  const [currentTicket, setCurrentTicket] = useState<string | null>(null)
  const [invalidMessage, setInvalidMessage] = useState('')
  const [manualTicketNumber, setManualTicketNumber] = useState('')

  const [playerName, setPlayerName] = useState('')
  const [selectedPositions, setSelectedPositions] = useState<string[]>([])
  const [isCaptain, setIsCaptain] = useState(false)
  const [selectedRating, setSelectedRating] = useState(0)

  const [arrivals, setArrivals] = useState<Arrival[]>([])
  const [teams, setTeams] = useState<Team[]>([])

  const loadArrivals = async () => {
  const { data, error } = await supabase
    .from('check_ins')
    .select('ticket_code, player_name, positions, captain, rating, arrival_time')
    .order('arrival_time', { ascending: true })

  if (error) {
    setInvalidMessage(error.message)
    return
  }

  const formatted: Arrival[] = (data || []).map((row) => ({
    name: row.player_name,
    ticket: row.ticket_code,
    positions: row.positions || [],
    captain: row.captain,
    rating: row.rating,
    arrivalTime: new Date(row.arrival_time).toLocaleString(),
  }))

  setArrivals(formatted)
}

useEffect(() => {
  loadArrivals()

  return () => {
    stopScanner()
  }
}, [])

const saveArrivals = (updated: Arrival[]) => {
  setArrivals(updated)
}

  const resetForm = () => {
    setCurrentTicket(null)
    setPlayerName('')
    setSelectedPositions([])
    setIsCaptain(false)
    setSelectedRating(0)
  }

const validateTicket = async (ticket: string) => {
  setInvalidMessage('')

  const { data: ticketData, error: ticketError } = await supabase
    .from('tickets')
    .select('code, status')
    .eq('code', ticket)
    .maybeSingle()

  if (ticketError) {
    setInvalidMessage(ticketError.message)
    return
  }

  if (!ticketData || ticketData.status !== 'valid') {
    setInvalidMessage(`Invalid ticket: ${ticket}`)
    return
  }

  const { data: existingCheckIn, error: checkInError } = await supabase
    .from('check_ins')
    .select('ticket_code')
    .eq('ticket_code', ticket)
    .maybeSingle()

  if (checkInError) {
    setInvalidMessage(checkInError.message)
    return
  }

  if (existingCheckIn) {
    setInvalidMessage(`This ticket has already checked in: ${ticket}`)
    return
  }

  await stopScanner()

  resetForm()
  setCurrentTicket(ticket)
}

  const startScanner = async () => {
    setInvalidMessage('')
    setCurrentTicket(null)
    setScannerOpen(true)

    setTimeout(async () => {
      try {
        if (scannerRef.current) {
          try {
            await scannerRef.current.clear()
          } catch {}
        }

        const scanner = new Html5Qrcode('reader')
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          async (decodedText) => {
            await handleScanSuccess(decodedText)
          },
          () => {}
        )
      } catch {
        setInvalidMessage(
          'Camera could not start. Check browser camera permission and use HTTPS or localhost.'
        )
        setScannerOpen(false)
      }
    }, 150)
  }

  const stopScanner = async () => {
    const scanner = scannerRef.current

    if (!scanner) {
      setScannerOpen(false)
      return
    }

    try {
      const isScanning = scanner.getState && scanner.getState() === 2

      if (isScanning) {
        await scanner.stop()
      }

      await scanner.clear()
    } catch {
      // ignore scanner cleanup errors
    }

    scannerRef.current = null
    setScannerOpen(false)
  }

  const handleScanSuccess = async (decodedText: string) => {
    const ticket = decodedText.trim()
    await validateTicket(ticket)
  }

  const handleManualTicketSubmit = async () => {
    const cleanedNumber = manualTicketNumber.replace(/\D/g, '')

    if (!cleanedNumber) {
      setInvalidMessage('Please enter the ticket numbers.')
      return
    }

    const ticket = `TCK-${cleanedNumber}`

    await validateTicket(ticket)
    setManualTicketNumber('')
  }

  const togglePosition = (position: string) => {
    if (selectedPositions.includes(position)) {
      setSelectedPositions(selectedPositions.filter((item) => item !== position))
    } else {
      setSelectedPositions([...selectedPositions, position])
    }
  }

 const handleArrived = async () => {
  const name = playerName.trim()

  if (!currentTicket) {
    alert('Please scan or enter a valid ticket first.')
    return
  }

  if (!name) {
    alert("Please insert the player's name.")
    return
  }

  if (!selectedPositions.length) {
    alert('Please select at least one football position.')
    return
  }

  if (!selectedRating) {
    alert('Please select a rating from 1 to 10.')
    return
  }

  const { error } = await supabase.from('check_ins').insert({
    ticket_code: currentTicket,
    player_name: name,
    positions: selectedPositions,
    captain: isCaptain,
    rating: selectedRating,
  })

  if (error) {
    setInvalidMessage(error.message)
    return
  }

  await loadArrivals()
  resetForm()
}

const clearArrivals = async () => {
  if (!confirm('Clear all checked-in players?')) return

  const { error } = await supabase
    .from('check_ins')
    .delete()
    .neq('ticket_code', '')

  if (error) {
    setInvalidMessage(error.message)
    return
  }

  setArrivals([])
  setTeams([])
}

  const ratingColour = (value: number) => {
    const hue = Math.round(((value - 1) * 120) / 9)
    return `hsl(${hue}, 90%, 52%)`
  }

  const randomizeTeams = (teamCount: number) => {
    if (arrivals.length < teamCount) {
      alert(`You need at least ${teamCount} checked-in players.`)
      return
    }

    const shuffled = [...arrivals].sort(() => Math.random() - 0.5)
    const players = shuffled.sort((a, b) => b.rating - a.rating)

    const newTeams: Team[] = Array.from({ length: teamCount }, (_, index) => ({
      name: `Team ${index + 1}`,
      players: [],
      totalRating: 0,
    }))

    const captains = players.filter((player) => player.captain)
    const nonCaptains = players.filter((player) => !player.captain)
    const orderedPlayers = [...captains, ...nonCaptains]

    orderedPlayers.forEach((player) => {
      const bestTeam = newTeams
        .map((team) => ({
          team,
          score: teamBalanceScore(team, player),
        }))
        .sort((a, b) => a.score - b.score)[0].team

      bestTeam.players.push(player)
      bestTeam.totalRating += Number(player.rating)
    })

    setTeams(newTeams)
  }

  const teamBalanceScore = (team: Team, player: Arrival) => {
    const sizePenalty = team.players.length * 12
    const ratingPenalty = team.totalRating * 2

    const positionPenalty = player.positions.some(
      (pos) => !team.players.some((p) => p.positions.includes(pos))
    )
      ? -8
      : 4

    const goalkeeperPenalty =
      player.positions.includes('Goalkeeper') &&
      !team.players.some((p) => p.positions.includes('Goalkeeper'))
        ? -15
        : 0

    return sizePenalty + ratingPenalty + positionPenalty + goalkeeperPenalty
  }

  return (
    <>
      <NavBar />

      <main style={pageStyle}>
        <div style={{ maxWidth: '430px', margin: '0 auto' }}>
          <header style={{ textAlign: 'center', marginBottom: '18px' }}>
            <p style={eyebrowStyle}>Divina Liga</p>
            <h1 style={titleStyle}>Match Check-In</h1>
            <p style={subtitleStyle}>
              Scan a ticket or enter the ticket code manually, confirm the player, then create balanced teams.
            </p>
          </header>

          <section style={glassCard}>
            <button onClick={startScanner} style={startButton}>
              START CHECK-IN
            </button>

            <div style={manualTicketBox}>
              <p style={labelText}>Enter ticket manually</p>

              <div style={manualTicketRow}>
                <div style={ticketPrefix}>TCK-</div>

                <input
                  value={manualTicketNumber}
                  onChange={(e) => {
                    const onlyNumbers = e.target.value.replace(/\D/g, '')
                    setManualTicketNumber(onlyNumbers)
                  }}
                  placeholder="839201"
                  inputMode="numeric"
                  style={manualTicketInput}
                />
              </div>

              <button onClick={handleManualTicketSubmit} style={manualTicketButton}>
                Check Ticket Code
              </button>
            </div>

            {scannerOpen && (
              <div style={{ marginTop: '14px' }}>
                <div id="reader" style={readerStyle}></div>

                <button onClick={stopScanner} style={secondaryButton}>
                  Stop Camera
                </button>
              </div>
            )}

            {currentTicket && (
              <div style={validTicketBox}>
                <div>
                  <p style={smallGreenText}>Valid Ticket</p>
                  <p style={{ fontSize: '22px', fontWeight: 900, margin: 0 }}>
                    {currentTicket}
                  </p>
                </div>

                <label style={labelStyle}>
                  <span style={labelText}>Insert name</span>
                  <input
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Player name"
                    style={inputStyle}
                  />
                </label>

                <div>
                  <p style={labelText}>Football position</p>

                  <div style={positionGrid}>
                    {positions.map((position) => {
                      const active = selectedPositions.includes(position)

                      return (
                        <button
                          key={position}
                          onClick={() => togglePosition(position)}
                          style={{
                            ...positionButton,
                            ...(active ? activePositionButton : {}),
                          }}
                        >
                          {position.toUpperCase()}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <button
                  onClick={() => setIsCaptain(!isCaptain)}
                  style={{
                    ...captainButton,
                    ...(isCaptain ? activeCaptainButton : {}),
                  }}
                >
                  CAPTAIN
                </button>

                <div>
                  <div style={ratingHeader}>
                    <p style={labelText}>Rating</p>
                    <p style={{ margin: 0, fontWeight: 900 }}>
                      {selectedRating}/10
                    </p>
                  </div>

                  <div style={starsWrap}>
                    {Array.from({ length: 10 }, (_, index) => {
                      const value = index + 1

                      return (
                        <button
                          key={value}
                          onClick={() => setSelectedRating(value)}
                          style={{
                            ...starButton,
                            color: ratingColour(value),
                            opacity: value <= selectedRating ? 1 : 0.25,
                          }}
                        >
                          ★
                        </button>
                      )
                    })}
                  </div>
                </div>

                <button onClick={handleArrived} style={arrivedButton}>
                  I HAVE ARRIVED
                </button>
              </div>
            )}

            {invalidMessage && <div style={invalidBox}>{invalidMessage}</div>}
          </section>

          <section style={glassCard}>
            <div style={sectionHeader}>
              <h2 style={sectionTitle}>Arrived Players</h2>
              <button onClick={clearArrivals} style={clearButton}>
                Clear
              </button>
            </div>

            {arrivals.length === 0 ? (
              <p style={{ color: '#94A3B8' }}>No players checked in yet.</p>
            ) : (
              <div style={{ display: 'grid', gap: '10px' }}>
                {arrivals.map((player) => (
                  <div key={player.ticket} style={arrivalCard}>
                    <div style={arrivalTop}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 900 }}>
                          {player.name}{' '}
                          {player.captain && (
                            <span style={{ color: '#FACC15' }}>(Captain)</span>
                          )}
                        </p>
                        <p style={{ margin: '4px 0 0', color: '#94A3B8', fontSize: '12px' }}>
                          {player.ticket}
                        </p>
                      </div>

                      <p style={ratingPill}>{player.rating}/10</p>
                    </div>

                    <p style={{ margin: '10px 0 0', color: '#CBD5E1', fontSize: '13px' }}>
                      {player.positions.join(', ') || 'No position selected'}
                    </p>

                    <p style={{ margin: '6px 0 0', color: '#64748B', fontSize: '12px' }}>
                      Arrived: {player.arrivalTime}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={glassCard}>
            <h2 style={sectionTitle}>Create Teams</h2>

            <div style={teamButtonsGrid}>
              <button onClick={() => randomizeTeams(2)} style={random2Button}>
                RANDOMIZE 2 TEAMS
              </button>

              <button onClick={() => randomizeTeams(3)} style={random3Button}>
                RANDOMIZE 3 TEAMS
              </button>
            </div>

            {teams.length > 0 && (
              <div style={{ display: 'grid', gap: '12px', marginTop: '14px' }}>
                {teams.map((team) => {
                  const average = team.players.length
                    ? (team.totalRating / team.players.length).toFixed(1)
                    : '0.0'

                  return (
                    <div key={team.name} style={teamCard}>
                      <div style={sectionHeader}>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900 }}>
                          {team.name}
                        </h3>

                        <p style={avgPill}>Avg {average}/10</p>
                      </div>

                      <div style={{ display: 'grid', gap: '8px', marginTop: '12px' }}>
                        {team.players.map((player) => (
                          <div key={player.ticket} style={teamPlayerCard}>
                            <div style={arrivalTop}>
                              <p style={{ margin: 0, fontWeight: 800 }}>
                                {player.name}{' '}
                                {player.captain && (
                                  <span style={{ color: '#FACC15' }}>(C)</span>
                                )}
                              </p>

                              <p style={{ margin: 0, color: '#86EFAC', fontWeight: 900 }}>
                                {player.rating}/10
                              </p>
                            </div>

                            <p style={{ margin: '4px 0 0', color: '#94A3B8', fontSize: '12px' }}>
                              {player.positions.join(', ')}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  )
}

const pageStyle = {
  minHeight: '100vh',
  color: 'white',
  padding: '20px 16px',
  background: 'radial-gradient(circle at top, #111827, #030712 55%)',
}

const eyebrowStyle = {
  margin: 0,
  fontSize: '12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.35em',
  color: '#6EE7B7',
}

const titleStyle = {
  margin: '8px 0 0',
  fontSize: '32px',
  fontWeight: 900,
  letterSpacing: '-0.03em',
}

const subtitleStyle = {
  margin: '8px 0 0',
  color: '#CBD5E1',
  fontSize: '14px',
  lineHeight: 1.5,
}

const glassCard = {
  marginTop: '16px',
  padding: '16px',
  borderRadius: '24px',
  background: 'rgba(17, 24, 39, 0.82)',
  backdropFilter: 'blur(14px)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  boxShadow: '0 22px 50px rgba(0,0,0,0.35)',
}

const startButton = {
  width: '100%',
  border: 'none',
  borderRadius: '16px',
  background: '#22C55E',
  color: '#052E16',
  padding: '16px 20px',
  fontSize: '18px',
  fontWeight: 900,
  cursor: 'pointer',
}

const manualTicketBox = {
  marginTop: '14px',
  display: 'grid',
  gap: '10px',
}

const manualTicketRow = {
  display: 'flex',
  alignItems: 'center',
  borderRadius: '14px',
  border: '1px solid #475569',
  background: '#020617',
  overflow: 'hidden',
}

const ticketPrefix = {
  padding: '13px 12px',
  background: '#111827',
  color: '#6EE7B7',
  fontWeight: 900,
  borderRight: '1px solid #334155',
}

const manualTicketInput = {
  flex: 1,
  border: 'none',
  background: 'transparent',
  color: 'white',
  padding: '13px 12px',
  outline: 'none',
  fontSize: '16px',
}

const manualTicketButton = {
  width: '100%',
  border: '1px solid rgba(110, 231, 183, 0.35)',
  borderRadius: '14px',
  background: 'rgba(34, 197, 94, 0.12)',
  color: '#6EE7B7',
  padding: '13px',
  fontWeight: 900,
  cursor: 'pointer',
}

const readerStyle = {
  overflow: 'hidden',
  borderRadius: '24px',
  background: 'black',
  padding: '8px',
}

const secondaryButton = {
  width: '100%',
  marginTop: '12px',
  borderRadius: '12px',
  border: '1px solid #475569',
  background: 'transparent',
  color: '#E2E8F0',
  padding: '12px',
  fontWeight: 800,
  cursor: 'pointer',
}

const validTicketBox = {
  marginTop: '14px',
  borderRadius: '16px',
  border: '1px solid rgba(110, 231, 183, 0.3)',
  background: 'rgba(34, 197, 94, 0.1)',
  padding: '16px',
  display: 'grid',
  gap: '14px',
}

const smallGreenText = {
  margin: 0,
  fontSize: '12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.12em',
  color: '#6EE7B7',
}

const labelStyle = {
  display: 'grid',
  gap: '8px',
}

const labelText = {
  margin: 0,
  color: '#E2E8F0',
  fontSize: '14px',
  fontWeight: 700,
}

const inputStyle = {
  width: '100%',
  borderRadius: '12px',
  border: '1px solid #475569',
  background: '#020617',
  color: 'white',
  padding: '12px 14px',
  outline: 'none',
}

const positionGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '8px',
}

const positionButton = {
  borderRadius: '12px',
  border: '1px solid #475569',
  background: 'transparent',
  color: 'white',
  padding: '12px 8px',
  fontSize: '13px',
  fontWeight: 800,
  cursor: 'pointer',
}

const activePositionButton = {
  background: '#22C55E',
  color: '#052E16',
  borderColor: '#86EFAC',
  boxShadow: '0 0 0 2px rgba(34, 197, 94, 0.25)',
}

const captainButton = {
  width: '100%',
  borderRadius: '12px',
  border: '1px solid rgba(234, 179, 8, 0.6)',
  background: 'transparent',
  color: '#FDE047',
  padding: '12px',
  fontWeight: 900,
  cursor: 'pointer',
}

const activeCaptainButton = {
  background: '#22C55E',
  color: '#052E16',
  borderColor: '#86EFAC',
}

const ratingHeader = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
}

const starsWrap = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '4px',
}

const starButton = {
  border: 'none',
  background: 'transparent',
  fontSize: '28px',
  cursor: 'pointer',
  padding: '0 1px',
  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
}

const arrivedButton = {
  width: '100%',
  border: 'none',
  borderRadius: '16px',
  background: '#0EA5E9',
  color: '#082F49',
  padding: '16px 20px',
  fontSize: '18px',
  fontWeight: 900,
  cursor: 'pointer',
}

const invalidBox = {
  marginTop: '14px',
  borderRadius: '16px',
  border: '1px solid rgba(239, 68, 68, 0.4)',
  background: 'rgba(239, 68, 68, 0.1)',
  padding: '16px',
  color: '#FECACA',
  fontSize: '14px',
  fontWeight: 800,
}

const sectionHeader = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
}

const sectionTitle = {
  margin: 0,
  fontSize: '20px',
  fontWeight: 900,
}

const clearButton = {
  borderRadius: '12px',
  border: '1px solid rgba(239, 68, 68, 0.4)',
  background: 'transparent',
  color: '#FCA5A5',
  padding: '8px 12px',
  fontSize: '12px',
  fontWeight: 800,
  cursor: 'pointer',
}

const arrivalCard = {
  borderRadius: '16px',
  border: '1px solid #334155',
  background: 'rgba(2, 6, 23, 0.6)',
  padding: '12px',
}

const arrivalTop = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '12px',
}

const ratingPill = {
  margin: 0,
  borderRadius: '999px',
  background: 'rgba(34, 197, 94, 0.15)',
  color: '#6EE7B7',
  padding: '4px 8px',
  fontSize: '12px',
  fontWeight: 900,
}

const teamButtonsGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '8px',
  marginTop: '12px',
}

const random2Button = {
  border: 'none',
  borderRadius: '16px',
  background: '#A855F7',
  color: '#3B0764',
  padding: '16px 12px',
  fontWeight: 900,
  cursor: 'pointer',
}

const random3Button = {
  border: 'none',
  borderRadius: '16px',
  background: '#FB923C',
  color: '#431407',
  padding: '16px 12px',
  fontWeight: 900,
  cursor: 'pointer',
}

const teamCard = {
  borderRadius: '24px',
  border: '1px solid #334155',
  background: 'rgba(2, 6, 23, 0.7)',
  padding: '16px',
}

const avgPill = {
  margin: 0,
  borderRadius: '999px',
  background: 'rgba(14, 165, 233, 0.15)',
  color: '#7DD3FC',
  padding: '4px 10px',
  fontSize: '12px',
  fontWeight: 900,
}

const teamPlayerCard = {
  borderRadius: '14px',
  background: '#0F172A',
  padding: '12px',
}