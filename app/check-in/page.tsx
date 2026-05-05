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

const ADMIN_PIN = '3037'

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
  const [checkInOpen, setCheckInOpen] = useState(true)
  const [isSubmittingArrival, setIsSubmittingArrival] = useState(false)

  const [editingPlayer, setEditingPlayer] = useState<Arrival | null>(null)
  const [editName, setEditName] = useState('')
  const [editPositions, setEditPositions] = useState<string[]>([])
  const [editCaptain, setEditCaptain] = useState(false)
  const [editRating, setEditRating] = useState(0)
  const [isSavingEdit, setIsSavingEdit] = useState(false)

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

  const playTone = (type: 'success' | 'error') => {
    try {
      const AudioContextClass = window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

      if (!AudioContextClass) return

      const audioContext = new AudioContextClass()
      const oscillator = audioContext.createOscillator()
      const gain = audioContext.createGain()

      oscillator.type = 'sine'
      oscillator.frequency.value = type === 'success' ? 880 : 220
      gain.gain.value = 0.08

      oscillator.connect(gain)
      gain.connect(audioContext.destination)
      oscillator.start()
      oscillator.stop(audioContext.currentTime + 0.16)
    } catch {
      // ignore audio errors, especially before user interaction
    }
  }

  const canCommitArrival = Boolean(
    currentTicket &&
      playerName.trim() &&
      selectedPositions.length &&
      selectedRating &&
      checkInOpen &&
      !isSubmittingArrival
  )

  const resetForm = () => {
    setCurrentTicket(null)
    setPlayerName('')
    setSelectedPositions([])
    setIsCaptain(false)
    setSelectedRating(0)
  }

const validateTicket = async (ticket: string) => {
  setInvalidMessage('')

  if (!checkInOpen) {
    playTone('error')
    setInvalidMessage('Check-in is currently closed.')
    return
  }

  const { data: ticketData, error: ticketError } = await supabase
    .from('tickets')
    .select('code, status')
    .eq('code', ticket)
    .maybeSingle()

  if (ticketError) {
    playTone('error')
    setInvalidMessage(ticketError.message)
    return
  }

  if (!ticketData || ticketData.status !== 'valid') {
    playTone('error')
    setInvalidMessage(`Invalid ticket: ${ticket}`)
    return
  }

  const { data: existingCheckIn, error: checkInError } = await supabase
    .from('check_ins')
    .select('ticket_code, player_name')
    .eq('ticket_code', ticket)
    .maybeSingle()

  if (checkInError) {
    playTone('error')
    setInvalidMessage(checkInError.message)
    return
  }

  if (existingCheckIn) {
    playTone('error')
    setInvalidMessage(`This ticket has already checked in by ${existingCheckIn.player_name}: ${ticket}`)
    return
  }

  await stopScanner()

  resetForm()
  playTone('success')
  setCurrentTicket(ticket)
}

  const startScanner = async () => {
    setInvalidMessage('')

    if (!checkInOpen) {
      playTone('error')
      setInvalidMessage('Check-in is currently closed.')
      return
    }

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

        const scanConfig = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        }

        const onSuccess = async (decodedText: string) => {
          await handleScanSuccess(decodedText)
        }

        try {
          await scanner.start({ facingMode: 'user' }, scanConfig, onSuccess, () => {})
        } catch {
          await scanner.start({ facingMode: 'environment' }, scanConfig, onSuccess, () => {})
        }
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

    if (!checkInOpen) {
      playTone('error')
      setInvalidMessage('Check-in is currently closed.')
      return
    }

    if (!cleanedNumber) {
      playTone('error')
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

  if (!checkInOpen) {
    playTone('error')
    alert('Check-in is currently closed.')
    return
  }

  if (!currentTicket) {
    playTone('error')
    alert('Please scan or enter a valid ticket first.')
    return
  }

  if (!name) {
    playTone('error')
    alert("Please insert the player's name.")
    return
  }

  if (!selectedPositions.length) {
    playTone('error')
    alert('Please select at least one football position.')
    return
  }

  if (!selectedRating) {
    playTone('error')
    alert('Please select a rating from 1 to 10.')
    return
  }

  setIsSubmittingArrival(true)

  const { error } = await supabase.from('check_ins').insert({
    ticket_code: currentTicket,
    player_name: name,
    positions: selectedPositions,
    captain: isCaptain,
    rating: selectedRating,
  })

  setIsSubmittingArrival(false)

  if (error) {
    playTone('error')
    setInvalidMessage(error.message)
    return
  }

  playTone('success')
  await loadArrivals()
  setTeams([])
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
const openEditPlayerModal = (player: Arrival) => {
  const pin = prompt(`Enter admin PIN to edit ${player.name}:`)

  if (pin !== ADMIN_PIN) {
    alert('Incorrect PIN.')
    return
  }

  setEditingPlayer(player)
  setEditName(player.name)
  setEditPositions(player.positions)
  setEditCaptain(player.captain)
  setEditRating(player.rating)
}

const closeEditPlayerModal = () => {
  if (isSavingEdit) return

  setEditingPlayer(null)
  setEditName('')
  setEditPositions([])
  setEditCaptain(false)
  setEditRating(0)
}

const toggleEditPosition = (position: string) => {
  if (editPositions.includes(position)) {
    setEditPositions(editPositions.filter((item) => item !== position))
  } else {
    setEditPositions([...editPositions, position])
  }
}

const submitPlayerEdit = async () => {
  if (!editingPlayer) return

  const cleanedName = editName.trim()

  if (!cleanedName) {
    playTone('error')
    alert("Please insert the player's name.")
    return
  }

  if (!editPositions.length) {
    playTone('error')
    alert('Please select at least one football position.')
    return
  }

  if (!Number.isInteger(editRating) || editRating < 1 || editRating > 10) {
    playTone('error')
    alert('Rating must be a number from 1 to 10.')
    return
  }

  setIsSavingEdit(true)

  const { error } = await supabase
    .from('check_ins')
    .update({
      player_name: cleanedName,
      positions: editPositions,
      captain: editCaptain,
      rating: editRating,
    })
    .eq('ticket_code', editingPlayer.ticket)

  setIsSavingEdit(false)

  if (error) {
    playTone('error')
    setInvalidMessage(error.message)
    return
  }

  playTone('success')
  await loadArrivals()
  setTeams([])
  closeEditPlayerModal()
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

    setCheckInOpen(false)

    const players = [...arrivals]
      .sort(() => Math.random() - 0.5)
      .sort((a, b) => b.rating - a.rating)

    const newTeams: Team[] = Array.from({ length: teamCount }, (_, index) => ({
      name: `Team ${index + 1}`,
      players: [],
      totalRating: 0,
    }))

    const goalkeepers = players.filter((player) => player.positions.includes('Goalkeeper'))
    const captains = players.filter(
      (player) => player.captain && !player.positions.includes('Goalkeeper')
    )
    const others = players.filter(
      (player) => !player.captain && !player.positions.includes('Goalkeeper')
    )

    const orderedPlayers = [...goalkeepers, ...captains, ...others]

    orderedPlayers.forEach((player, index) => {
      const snakeIndex = index % (teamCount * 2)
      const preferredTeamIndex =
        snakeIndex < teamCount ? snakeIndex : teamCount * 2 - snakeIndex - 1

      const bestTeam = newTeams
        .map((team, teamIndex) => ({
          team,
          score: teamBalanceScore(team, player, preferredTeamIndex === teamIndex),
        }))
        .sort((a, b) => a.score - b.score)[0].team

      bestTeam.players.push(player)
      bestTeam.totalRating += Number(player.rating)
    })

    setTeams(newTeams)
  }

  const teamBalanceScore = (team: Team, player: Arrival, isSnakePreferredTeam: boolean) => {
    const sizePenalty = team.players.length * 18
    const ratingPenalty = team.totalRating * 2
    const snakeBonus = isSnakePreferredTeam ? -6 : 0

    const positionPenalty = player.positions.some(
      (pos) => !team.players.some((p) => p.positions.includes(pos))
    )
      ? -10
      : 5

    const goalkeeperPenalty =
      player.positions.includes('Goalkeeper') &&
      !team.players.some((p) => p.positions.includes('Goalkeeper'))
        ? -24
        : 12

    const captainPenalty =
      player.captain && !team.players.some((p) => p.captain) ? -10 : 3

    return sizePenalty + ratingPenalty + positionPenalty + goalkeeperPenalty + captainPenalty + snakeBonus
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

      {editingPlayer && (
        <div style={modalOverlay}>
          <div style={modalCard}>
            <div style={modalHeader}>
              <div>
                <p style={smallGreenText}>Edit Player</p>
                <h2 style={modalTitle}>{editingPlayer.ticket}</h2>
              </div>

              <button onClick={closeEditPlayerModal} style={modalCloseButton}>
                ×
              </button>
            </div>

            <label style={labelStyle}>
              <span style={labelText}>Player name</span>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Player name"
                style={inputStyle}
              />
            </label>

            <div>
              <p style={labelText}>Football position · {editPositions.length} selected</p>

              <div style={positionGrid}>
                {positions.map((position) => {
                  const active = editPositions.includes(position)

                  return (
                    <button
                      key={position}
                      onClick={() => toggleEditPosition(position)}
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
              onClick={() => setEditCaptain(!editCaptain)}
              style={{
                ...captainButton,
                ...(editCaptain ? activeCaptainButton : {}),
              }}
            >
              {editCaptain ? 'CAPTAIN SELECTED' : 'CAPTAIN'}
            </button>

            <div>
              <div style={ratingHeader}>
                <p style={labelText}>Rating</p>
                <p style={{ margin: 0, fontWeight: 900 }}>{editRating}/10</p>
              </div>

              <div style={starsWrap}>
                {Array.from({ length: 10 }, (_, index) => {
                  const value = index + 1

                  return (
                    <button
                      key={value}
                      onClick={() => setEditRating(value)}
                      style={{
                        ...starButton,
                        color: ratingColour(value),
                        opacity: value <= editRating ? 1 : 0.25,
                      }}
                    >
                      ★
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={modalActions}>
              <button onClick={closeEditPlayerModal} style={modalCancelButton}>
                Cancel
              </button>

              <button
                onClick={submitPlayerEdit}
                disabled={isSavingEdit}
                style={{ ...modalSubmitButton, ...(isSavingEdit ? disabledButton : {}) }}
              >
                {isSavingEdit ? 'SAVING...' : 'SUBMIT CHANGES'}
              </button>
            </div>
          </div>
        </div>
      )}

      <main style={pageStyle}>
        <div style={{ maxWidth: '430px', margin: '0 auto' }}>
          <header style={{ textAlign: 'center', marginBottom: '18px' }}>
            <p style={eyebrowStyle}>Divina Liga</p>
            <h1 style={titleStyle}>Match Check-In</h1>
            <p style={subtitleStyle}>
              Scan a ticket or enter the ticket code manually, confirm the player, then create balanced teams.
            </p>
          </header>

          <section style={statusCard}>
            <div>
              <p style={smallGreenText}>Check-in status</p>
              <h2 style={statusTitle}>{checkInOpen ? 'OPEN' : 'CLOSED'}</h2>
            </div>

            <button
              onClick={() => setCheckInOpen((value) => !value)}
              style={checkInOpen ? closeCheckInButton : openCheckInButton}
            >
              {checkInOpen ? 'CLOSE CHECK-IN' : 'REOPEN CHECK-IN'}
            </button>
          </section>

          <section style={glassCard}>
            <button onClick={startScanner} disabled={!checkInOpen} style={{ ...startButton, ...(!checkInOpen ? disabledButton : {}) }}>
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleManualTicketSubmit()
                  }}
                  placeholder="839201"
                  inputMode="numeric"
                  disabled={!checkInOpen}
                  style={manualTicketInput}
                />
              </div>

              <button onClick={handleManualTicketSubmit} disabled={!checkInOpen} style={{ ...manualTicketButton, ...(!checkInOpen ? disabledButton : {}) }}>
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && canCommitArrival) handleArrived()
                    }}
                    placeholder="Player name"
                    style={inputStyle}
                  />
                </label>

                <div>
                  <p style={labelText}>Football position · {selectedPositions.length} selected</p>

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

                <button
                  onClick={handleArrived}
                  disabled={!canCommitArrival}
                  style={{ ...arrivedButton, ...(!canCommitArrival ? disabledButton : {}) }}
                >
                  {isSubmittingArrival ? 'SAVING...' : 'I HAVE ARRIVED'}
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
                    <div style={playerActionsRow}>
                      <button
                        onClick={() => openEditPlayerModal(player)}
                        style={editPlayerButton}
                      >
                        Edit Player
                      </button>

                      <button
                        onClick={() => clearSinglePlayer(player.ticket, player.name)}
                        style={removePlayerButton}
                      >
                        Remove Player
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={glassCard}>
            <h2 style={sectionTitle}>Create Teams</h2>

            <p style={teamHintText}>
              Creating teams automatically closes check-in. Reopen it above if another player arrives late.
            </p>

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

const modalOverlay = {
  position: 'fixed' as const,
  inset: 0,
  zIndex: 1000,
  background: 'rgba(2, 6, 23, 0.78)',
  backdropFilter: 'blur(10px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px',
}

const modalCard = {
  width: '100%',
  maxWidth: '430px',
  maxHeight: '90vh',
  overflowY: 'auto' as const,
  borderRadius: '26px',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(2, 6, 23, 0.98))',
  boxShadow: '0 30px 80px rgba(0,0,0,0.55)',
  padding: '18px',
  display: 'grid',
  gap: '16px',
}

const modalHeader = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '12px',
}

const modalTitle = {
  margin: '6px 0 0',
  fontSize: '24px',
  fontWeight: 950,
  letterSpacing: '-0.04em',
}

const modalCloseButton = {
  width: '42px',
  height: '42px',
  borderRadius: '14px',
  border: '1px solid rgba(148, 163, 184, 0.35)',
  background: 'rgba(15, 23, 42, 0.8)',
  color: '#E2E8F0',
  fontSize: '28px',
  lineHeight: 1,
  cursor: 'pointer',
}

const modalActions = {
  display: 'grid',
  gridTemplateColumns: '1fr 1.3fr',
  gap: '10px',
}

const modalCancelButton = {
  borderRadius: '14px',
  border: '1px solid #475569',
  background: 'transparent',
  color: '#E2E8F0',
  padding: '13px',
  fontWeight: 900,
  cursor: 'pointer',
}

const modalSubmitButton = {
  border: 'none',
  borderRadius: '14px',
  background: '#22C55E',
  color: '#052E16',
  padding: '13px',
  fontWeight: 950,
  cursor: 'pointer',
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

const statusCard = {
  marginTop: '16px',
  padding: '14px',
  borderRadius: '22px',
  background: 'rgba(15, 23, 42, 0.88)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
}

const statusTitle = {
  margin: '4px 0 0',
  fontSize: '22px',
  fontWeight: 950,
  letterSpacing: '-0.03em',
}

const closeCheckInButton = {
  border: 'none',
  borderRadius: '14px',
  background: '#F97316',
  color: '#431407',
  padding: '12px 14px',
  fontSize: '12px',
  fontWeight: 950,
  cursor: 'pointer',
  whiteSpace: 'nowrap' as const,
}

const openCheckInButton = {
  border: 'none',
  borderRadius: '14px',
  background: '#22C55E',
  color: '#052E16',
  padding: '12px 14px',
  fontSize: '12px',
  fontWeight: 950,
  cursor: 'pointer',
  whiteSpace: 'nowrap' as const,
}

const disabledButton = {
  opacity: 0.45,
  cursor: 'not-allowed',
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
const playerActionsRow = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '8px',
  marginTop: '10px',
}

const editPlayerButton = {
  borderRadius: '10px',
  border: '1px solid rgba(125, 211, 252, 0.45)',
  background: 'rgba(14, 165, 233, 0.08)',
  color: '#7DD3FC',
  padding: '9px 10px',
  fontSize: '12px',
  fontWeight: 800,
  cursor: 'pointer',
}

const removePlayerButton = {
  flex: 1,
  borderRadius: '10px',
  border: '1px solid rgba(239, 68, 68, 0.45)',
  background: 'rgba(239, 68, 68, 0.08)',
  color: '#FCA5A5',
  padding: '9px 10px',
  fontSize: '12px',
  fontWeight: 800,
  cursor: 'pointer',
}

const teamHintText = {
  margin: '8px 0 0',
  color: '#94A3B8',
  fontSize: '13px',
  lineHeight: 1.45,
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