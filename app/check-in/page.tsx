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
  playerId?: string | null
  playerNumber?: number | null
  profilePictureUrl?: string | null
  preferredFoot?: string | null
  gamesPlayed?: number | null
  goals?: number | null
  assists?: number | null
}

type PlayerProfile = {
  id: string
  auth_user_id: string | null
  nickname: string
  player_number: number | null
  rating: number
  profile_picture_url: string | null
  preferred_foot: string | null
  main_position: string | null
  secondary_positions: string[] | null
  games_played: number
  goals: number
  assists: number
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

const ADMIN_PIN = '3037'

export default function CheckInPage() {
  const scannerRef = useRef<Html5Qrcode | null>(null)

  const [scannerOpen, setScannerOpen] = useState(false)
  const [currentTicket, setCurrentTicket] = useState<string | null>(null)
  const [invalidMessage, setInvalidMessage] = useState('')
  const [manualTicketNumber, setManualTicketNumber] = useState('')

  const [playerName, setPlayerName] = useState('')
  const [currentPlayerProfile, setCurrentPlayerProfile] = useState<PlayerProfile | null>(null)
  const [authUserEmail, setAuthUserEmail] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)
  const [selectedPositions, setSelectedPositions] = useState<string[]>([])
  const [isCaptain, setIsCaptain] = useState(false)
  const [selectedRating, setSelectedRating] = useState(0)

  const [arrivals, setArrivals] = useState<Arrival[]>([])
  const [teams, setTeams] = useState<Team[]>([])

  const loadLoggedInPlayerProfile = async () => {
    setProfileLoading(true)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setAuthUserEmail('')
      setCurrentPlayerProfile(null)
      setProfileLoading(false)
      return null
    }

    setAuthUserEmail(user.email || '')

    const { data, error } = await supabase
      .from('players')
      .select(
        'id, auth_user_id, nickname, player_number, rating, profile_picture_url, preferred_foot, main_position, secondary_positions, games_played, goals, assists'
      )
      .eq('auth_user_id', user.id)
      .maybeSingle()

    setProfileLoading(false)

    if (error) {
      setCurrentPlayerProfile(null)
      setInvalidMessage(error.message)
      return null
    }

    setCurrentPlayerProfile(data as PlayerProfile | null)
    return data as PlayerProfile | null
  }

  const loadArrivals = async () => {
  const { data, error } = await supabase
    .from('check_ins')
    .select(`
      ticket_code,
      player_name,
      positions,
      captain,
      rating,
      arrival_time,
      player_id,
      players (
        nickname,
        player_number,
        rating,
        profile_picture_url,
        preferred_foot,
        games_played,
        goals,
        assists
      )
    `)
    .order('arrival_time', { ascending: true })

  if (error) {
    setInvalidMessage(error.message)
    return
  }

  const formatted: Arrival[] = (data || []).map((row: any) => {
    const profile = Array.isArray(row.players) ? row.players[0] : row.players

    return {
      name: profile?.nickname || row.player_name,
      ticket: row.ticket_code,
      positions: row.positions || [],
      captain: row.captain,
      rating: profile?.rating ?? row.rating ?? 50,
      arrivalTime: new Date(row.arrival_time).toLocaleString(),
      playerId: row.player_id || null,
      playerNumber: profile?.player_number ?? null,
      profilePictureUrl: profile?.profile_picture_url ?? null,
      preferredFoot: profile?.preferred_foot ?? null,
      gamesPlayed: profile?.games_played ?? null,
      goals: profile?.goals ?? null,
      assists: profile?.assists ?? null,
    }
  })

  setArrivals(formatted)
}

useEffect(() => {
  loadArrivals()
  loadLoggedInPlayerProfile()

  const { data: authListener } = supabase.auth.onAuthStateChange(() => {
    loadLoggedInPlayerProfile()
  })

  return () => {
    stopScanner()
    authListener.subscription.unsubscribe()
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

  const profile = await loadLoggedInPlayerProfile()

  if (profile) {
    setPlayerName(profile.nickname)
    setSelectedRating(profile.rating || 50)

    const defaultPositions = [
      profile.main_position,
      ...(profile.secondary_positions || []),
    ].filter((item): item is string => Boolean(item) && positions.includes(item))

    if (defaultPositions.length) {
      setSelectedPositions([...new Set(defaultPositions)])
    }
  }

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
  const name = currentPlayerProfile?.nickname || playerName.trim()
  const ratingForCheckIn = currentPlayerProfile?.rating || selectedRating || 50

  if (!currentTicket) {
    alert('Please scan or enter a valid ticket first.')
    return
  }

  if (!name) {
    alert("Please log in with a player profile or insert the player's name.")
    return
  }

  if (!selectedPositions.length) {
    alert('Please select at least one football position.')
    return
  }

  if (!currentPlayerProfile && !selectedRating) {
    alert('Please select a rating from 1 to 10.')
    return
  }

  const { error } = await supabase.from('check_ins').insert({
    ticket_code: currentTicket,
    player_id: currentPlayerProfile?.id || null,
    player_name: name,
    positions: selectedPositions,
    captain: isCaptain,
    rating: ratingForCheckIn,
  })

  if (error) {
    setInvalidMessage(error.message)
    return
  }

  await loadArrivals()
  resetForm()
}

const clearArrivals = async () => {
  const pin = prompt('Enter admin PIN to clear all players:')

  if (pin !== ADMIN_PIN) {
    alert('Incorrect PIN.')
    return
  }

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
const clearSinglePlayer = async (ticketCode: string, playerName: string) => {
  const pin = prompt(`Enter admin PIN to remove ${playerName}:`)

  if (pin !== ADMIN_PIN) {
    alert('Incorrect PIN.')
    return
  }

  if (!confirm(`Remove ${playerName} from check-in list?`)) return

  const { error } = await supabase
    .from('check_ins')
    .delete()
    .eq('ticket_code', ticketCode)

  if (error) {
    setInvalidMessage(error.message)
    return
  }

  const updatedArrivals = arrivals.filter((player) => player.ticket !== ticketCode)

  setArrivals(updatedArrivals)
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
  const getTeamStyle = (index: number) => {
  if (index === 0) {
    return {
      name: 'Red Team',
      card: redTeamCard,
      header: redTeamHeader,
      badge: redTeamBadge,
    }
  }

  if (index === 1) {
    return {
      name: 'Blue Team',
      card: blueTeamCard,
      header: blueTeamHeader,
      badge: blueTeamBadge,
    }
  }

  return {
    name: 'Lime Team',
    card: limeTeamCard,
    header: limeTeamHeader,
    badge: limeTeamBadge,
  }
}

const hasGoalkeeper = (player: Arrival) => {
  return player.positions.includes('Goalkeeper')
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

            <div style={profileStatusBox}>
              <p style={labelText}>Player profile</p>
              <p style={profileStatusText}>
                {profileLoading
                  ? 'Checking profile...'
                  : currentPlayerProfile
                    ? `Signed in as ${currentPlayerProfile.nickname}${authUserEmail ? ` (${authUserEmail})` : ''}`
                    : 'Not signed in. Guest check-in will ask for name and rating.'}
              </p>
            </div>

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

                {currentPlayerProfile ? (
                  <div style={profilePreviewCard}>
                    {currentPlayerProfile.profile_picture_url ? (
                      <img
                        src={currentPlayerProfile.profile_picture_url}
                        alt={currentPlayerProfile.nickname}
                        style={profilePreviewImage}
                      />
                    ) : (
                      <div style={profilePreviewFallback}>
                        {currentPlayerProfile.nickname.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div>
                      <p style={smallGreenText}>Logged-in Player</p>
                      <h3 style={profilePreviewName}>
                        {currentPlayerProfile.nickname}
                        {currentPlayerProfile.player_number ? ` #${currentPlayerProfile.player_number}` : ''}
                      </h3>
                      <p style={profilePreviewMeta}>
                        Rating {currentPlayerProfile.rating}/99 · {currentPlayerProfile.preferred_foot || 'Foot not set'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <label style={labelStyle}>
                    <span style={labelText}>Insert name</span>
                    <input
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="Player name"
                      style={inputStyle}
                    />
                  </label>
                )}

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

                {!currentPlayerProfile && (
                  <div>
                    <div style={ratingHeader}>
                      <p style={labelText}>Guest rating</p>
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
                )}

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
                      <div style={arrivalPlayerInfo}>
                        {player.profilePictureUrl ? (
                          <img src={player.profilePictureUrl} alt={player.name} style={arrivalAvatar} />
                        ) : (
                          <div style={arrivalAvatarFallback}>{player.name.slice(0, 2).toUpperCase()}</div>
                        )}

                        <div>
                          <p style={{ margin: 0, fontWeight: 900 }}>
                            {player.name}{' '}
                            {player.playerNumber ? <span style={{ color: '#94A3B8' }}>#{player.playerNumber}</span> : null}{' '}
                            {player.captain && (
                              <span style={{ color: '#FACC15' }}>(Captain)</span>
                            )}
                          </p>
                          <p style={{ margin: '4px 0 0', color: '#94A3B8', fontSize: '12px' }}>
                            {player.ticket}
                          </p>
                        </div>
                      </div>

                      <p style={ratingPill}>{player.rating}/99</p>
                    </div>

                    <p style={{ margin: '10px 0 0', color: '#CBD5E1', fontSize: '13px' }}>
                      {player.positions.join(', ') || 'No position selected'}
                    </p>

                    <p style={{ margin: '6px 0 0', color: '#64748B', fontSize: '12px' }}>
                      Arrived: {player.arrivalTime}
                    </p>
                    <button
  onClick={() => clearSinglePlayer(player.ticket, player.name)}
  style={removePlayerButton}
>
  Remove Player
</button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={glassCard}>
            <h2 style={sectionTitle}>Create Teams</h2>

            <div style={teamButtonsGrid}>
              <button onClick={() => randomizeTeams(2)} style={random2Button}>
                CREATE 2 TEAMS (RED & BLUE)
              </button>

              <button onClick={() => randomizeTeams(3)} style={random3Button}>
                CREATE 3 TEAMS
              </button>
            </div>

            {teams.length > 0 && (
              <div style={{ display: 'grid', gap: '12px', marginTop: '14px' }}>
                {teams.map((team, index) => {
  const average = team.players.length
    ? (team.totalRating / team.players.length).toFixed(1)
    : '0.0'

  const teamStyle = getTeamStyle(index)

  return (
    <div key={team.name} style={teamStyle.card}>
      <div style={teamStyle.header}>
        <div>
          <p style={teamLabel}>TEAM {index + 1}</p>
          <h3 style={teamName}>{teamStyle.name}</h3>
        </div>

        <p style={teamStyle.badge}>Avg {average}/10</p>
      </div>

      <div style={{ display: 'grid', gap: '8px', marginTop: '14px' }}>
        {team.players.map((player) => (
          <div key={player.ticket} style={teamPlayerCard}>
            <div style={arrivalTop}>
              <div>
                <p style={teamPlayerName}>
                  {player.captain && <span title="Captain">👑 </span>}
                  {hasGoalkeeper(player) && <span title="Goalkeeper">🧤 </span>}
                  {player.name}
                </p>

                <p style={teamPlayerPositions}>
                  {player.positions.join(', ')}
                </p>
              </div>

              <p style={teamRatingPill}>{player.rating}/10</p>
            </div>
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


const profileStatusBox = {
  marginTop: '12px',
  borderRadius: '16px',
  border: '1px solid rgba(148, 163, 184, 0.22)',
  background: 'rgba(2, 6, 23, 0.45)',
  padding: '12px',
}

const profileStatusText = {
  margin: '5px 0 0',
  color: '#94A3B8',
  fontSize: '13px',
  lineHeight: 1.45,
}

const profilePreviewCard = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  borderRadius: '18px',
  border: '1px solid rgba(110, 231, 183, 0.28)',
  background: 'rgba(2, 6, 23, 0.55)',
  padding: '12px',
}

const profilePreviewImage = {
  width: '64px',
  height: '64px',
  borderRadius: '18px',
  objectFit: 'cover' as const,
  border: '1px solid rgba(255,255,255,0.12)',
}

const profilePreviewFallback = {
  width: '64px',
  height: '64px',
  borderRadius: '18px',
  display: 'grid',
  placeItems: 'center',
  background: 'linear-gradient(145deg, #22C55E, #0EA5E9)',
  color: '#020617',
  fontWeight: 950,
  fontSize: '20px',
}

const profilePreviewName = {
  margin: '4px 0 0',
  fontSize: '20px',
  fontWeight: 950,
  letterSpacing: '-0.03em',
}

const profilePreviewMeta = {
  margin: '5px 0 0',
  color: '#CBD5E1',
  fontSize: '12px',
}

const arrivalPlayerInfo = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
}

const arrivalAvatar = {
  width: '44px',
  height: '44px',
  borderRadius: '14px',
  objectFit: 'cover' as const,
  border: '1px solid rgba(255,255,255,0.1)',
}

const arrivalAvatarFallback = {
  width: '44px',
  height: '44px',
  borderRadius: '14px',
  display: 'grid',
  placeItems: 'center',
  background: '#1E293B',
  color: '#E2E8F0',
  fontWeight: 950,
  fontSize: '13px',
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
const removePlayerButton = {
  width: '100%',
  marginTop: '10px',
  borderRadius: '10px',
  border: '1px solid rgba(239, 68, 68, 0.45)',
  background: 'rgba(239, 68, 68, 0.08)',
  color: '#FCA5A5',
  padding: '9px 10px',
  fontSize: '12px',
  fontWeight: 800,
  cursor: 'pointer',
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
const teamLabel = {
  margin: 0,
  fontSize: '11px',
  fontWeight: 900,
  letterSpacing: '0.18em',
  color: 'rgba(255,255,255,0.72)',
  textTransform: 'uppercase' as const,
}

const teamName = {
  margin: '3px 0 0',
  fontSize: '24px',
  fontWeight: 950,
  letterSpacing: '-0.04em',
}

const redTeamCard = {
  borderRadius: '26px',
  border: '1px solid rgba(248, 113, 113, 0.45)',
  background:
    'linear-gradient(160deg, rgba(127, 29, 29, 0.95), rgba(2, 6, 23, 0.92) 62%)',
  padding: '16px',
  boxShadow: '0 18px 45px rgba(239, 68, 68, 0.18)',
}

const blueTeamCard = {
  borderRadius: '26px',
  border: '1px solid rgba(96, 165, 250, 0.45)',
  background:
    'linear-gradient(160deg, rgba(30, 64, 175, 0.95), rgba(2, 6, 23, 0.92) 62%)',
  padding: '16px',
  boxShadow: '0 18px 45px rgba(59, 130, 246, 0.18)',
}

const limeTeamCard = {
  borderRadius: '26px',
  border: '1px solid rgba(190, 242, 100, 0.45)',
  background:
    'linear-gradient(160deg, rgba(77, 124, 15, 0.95), rgba(2, 6, 23, 0.92) 62%)',
  padding: '16px',
  boxShadow: '0 18px 45px rgba(132, 204, 22, 0.18)',
}

const redTeamHeader = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  color: '#FEE2E2',
}

const blueTeamHeader = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  color: '#DBEAFE',
}

const limeTeamHeader = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  color: '#ECFCCB',
}

const redTeamBadge = {
  margin: 0,
  borderRadius: '999px',
  background: 'rgba(254, 202, 202, 0.16)',
  color: '#FECACA',
  border: '1px solid rgba(254, 202, 202, 0.28)',
  padding: '6px 10px',
  fontSize: '12px',
  fontWeight: 900,
  whiteSpace: 'nowrap' as const,
}

const blueTeamBadge = {
  margin: 0,
  borderRadius: '999px',
  background: 'rgba(191, 219, 254, 0.16)',
  color: '#BFDBFE',
  border: '1px solid rgba(191, 219, 254, 0.28)',
  padding: '6px 10px',
  fontSize: '12px',
  fontWeight: 900,
  whiteSpace: 'nowrap' as const,
}

const limeTeamBadge = {
  margin: 0,
  borderRadius: '999px',
  background: 'rgba(217, 249, 157, 0.16)',
  color: '#D9F99D',
  border: '1px solid rgba(217, 249, 157, 0.28)',
  padding: '6px 10px',
  fontSize: '12px',
  fontWeight: 900,
  whiteSpace: 'nowrap' as const,
}

const teamPlayerName = {
  margin: 0,
  fontSize: '15px',
  fontWeight: 900,
  color: '#F8FAFC',
}

const teamPlayerPositions = {
  margin: '5px 0 0',
  color: '#CBD5E1',
  fontSize: '12px',
}

const teamRatingPill = {
  margin: 0,
  borderRadius: '999px',
  background: 'rgba(255,255,255,0.13)',
  border: '1px solid rgba(255,255,255,0.18)',
  color: '#FFFFFF',
  padding: '5px 9px',
  fontSize: '12px',
  fontWeight: 950,
  whiteSpace: 'nowrap' as const,
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