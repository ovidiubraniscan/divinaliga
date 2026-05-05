'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import NavBar from '@/components/NavBar'
import { Html5Qrcode } from 'html5-qrcode'
import { supabase } from '@/lib/supabase'

type Arrival = {
  id: string
  name: string
  ticket: string
  positions: string[]
  captain: boolean
  rating: number
  arrivedAt: string
}

type Team = {
  name: string
  players: Arrival[]
  totalRating: number
}

type CheckInRow = {
  ticket_code: string
  player_name: string
  positions: string[] | null
  captain: boolean | null
  rating: number | null
  arrival_time: string
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

const positionOptions = ['GOALKEEPER', 'DEFENDER', 'MID FIELD', 'ATTACKER']
const teamNames = ['Team 1', 'Team 2', 'Team 3']

export default function CheckInPage() {
  const scannerRef = useRef<Html5Qrcode | null>(null)

  const [arrivals, setArrivals] = useState<Arrival[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [scannerOpen, setScannerOpen] = useState(false)
  const [currentTicket, setCurrentTicket] = useState<string | null>(null)
  const [manualTicket, setManualTicket] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [selectedPositions, setSelectedPositions] = useState<string[]>([])
  const [captain, setCaptain] = useState(false)
  const [rating, setRating] = useState(0)
  const [message, setMessage] = useState('')
  const [loadingArrivals, setLoadingArrivals] = useState(true)

  const usedTickets = useMemo(
    () => new Set(arrivals.map((player) => player.ticket)),
    [arrivals]
  )

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current

    if (!scanner) {
      setScannerOpen(false)
      return
    }

    try {
      await scanner.stop()
    } catch {}

    try {
      await scanner.clear()
    } catch {}

    scannerRef.current = null
    setScannerOpen(false)
  }, [])

  const loadArrivals = useCallback(async () => {
    setLoadingArrivals(true)
    setMessage('')

    const { data, error } = await supabase
      .from('check_ins')
      .select('ticket_code, player_name, positions, captain, rating, arrival_time')
      .order('arrival_time', { ascending: true })

    if (error) {
      setMessage(error.message)
      setLoadingArrivals(false)
      return
    }

    setArrivals(
      ((data || []) as CheckInRow[]).map((row) => ({
        id: row.ticket_code,
        name: row.player_name,
        ticket: row.ticket_code,
        positions: row.positions || [],
        captain: Boolean(row.captain),
        rating: row.rating || 0,
        arrivedAt: row.arrival_time,
      }))
    )
    setLoadingArrivals(false)
  }, [])

  useEffect(() => {
    const load = window.setTimeout(() => {
      void loadArrivals()
    }, 0)

    return () => {
      window.clearTimeout(load)
      void stopScanner()
    }
  }, [loadArrivals, stopScanner])

  const resetForm = () => {
    setCurrentTicket(null)
    setPlayerName('')
    setSelectedPositions([])
    setCaptain(false)
    setRating(0)
  }

  const validateTicket = async (rawTicket: string) => {
    const ticket = rawTicket.trim().toUpperCase()
    setMessage('')

    if (!validTickets.includes(ticket)) {
      setMessage(`Invalid ticket: ${ticket || 'empty scan'}`)
      return
    }

    const { data: ticketData, error: ticketError } = await supabase
      .from('tickets')
      .select('code, status')
      .eq('code', ticket)
      .maybeSingle()

    if (ticketError) {
      setMessage(ticketError.message)
      return
    }

    if (!ticketData || ticketData.status !== 'valid') {
      setMessage(`Invalid ticket: ${ticket}`)
      return
    }

    const { data: existingCheckIn, error: checkInError } = await supabase
      .from('check_ins')
      .select('ticket_code')
      .eq('ticket_code', ticket)
      .maybeSingle()

    if (checkInError) {
      setMessage(checkInError.message)
      return
    }

    if (existingCheckIn || usedTickets.has(ticket)) {
      setMessage(`This ticket has already checked in: ${ticket}`)
      return
    }

    await stopScanner()
    resetForm()
    setCurrentTicket(ticket)
    setMessage(`Ticket ready: ${ticket}`)
  }

  const startScanner = async () => {
    setMessage('')
    setCurrentTicket(null)
    setScannerOpen(true)

    window.setTimeout(async () => {
      try {
        await scannerRef.current?.clear()
      } catch {}

      try {
        const scanner = new Html5Qrcode('reader')
        scannerRef.current = scanner

        const config = {
          fps: 12,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        }

        try {
          await scanner.start(
            { facingMode: 'user' },
            config,
            (decodedText) => void validateTicket(decodedText),
            () => {}
          )
        } catch {
          await scanner.start(
            { facingMode: 'environment' },
            config,
            (decodedText) => void validateTicket(decodedText),
            () => {}
          )
        }
      } catch {
        setScannerOpen(false)
        setMessage('Camera could not start. Allow camera access and use HTTPS or localhost.')
      }
    }, 100)
  }

  const submitManualTicket = () => {
    const cleaned = manualTicket.trim().toUpperCase()
    const ticket = cleaned.startsWith('TCK-')
      ? cleaned
      : `TCK-${cleaned.replace(/\D/g, '')}`

    void validateTicket(ticket)
    setManualTicket('')
  }

  const togglePosition = (position: string) => {
    setSelectedPositions((current) =>
      current.includes(position)
        ? current.filter((item) => item !== position)
        : [...current, position]
    )
  }

  const saveArrival = async () => {
    const name = playerName.trim()

    if (!currentTicket) {
      setMessage('Scan or enter a valid ticket first.')
      return
    }

    if (!name) {
      setMessage('Insert the player name.')
      return
    }

    if (!selectedPositions.length) {
      setMessage('Select at least one position.')
      return
    }

    if (!rating) {
      setMessage('Choose a rating from 1 to 10.')
      return
    }

    const { error } = await supabase.from('check_ins').insert({
      ticket_code: currentTicket,
      player_name: name,
      positions: selectedPositions,
      captain,
      rating,
    })

    if (error) {
      setMessage(error.message)
      return
    }

    await loadArrivals()
    setTeams([])
    resetForm()
    setMessage(`${name} has arrived.`)
  }

  const removePlayer = async (ticket: string) => {
    const { error } = await supabase.from('check_ins').delete().eq('ticket_code', ticket)

    if (error) {
      setMessage(error.message)
      return
    }

    await loadArrivals()
    setTeams([])
  }

  const clearArrivals = async () => {
    if (!confirm('Clear all arrived players from Supabase?')) return

    const { error } = await supabase.from('check_ins').delete().neq('ticket_code', '')

    if (error) {
      setMessage(error.message)
      return
    }

    await loadArrivals()
    setTeams([])
    resetForm()
    setMessage('Arrivals cleared.')
  }

  const randomizeTeams = (teamCount: number) => {
    if (arrivals.length < teamCount) {
      setMessage(`You need at least ${teamCount} arrived players.`)
      return
    }

    const seededPlayers = [...arrivals]
      .sort(() => Math.random() - 0.5)
      .sort((a, b) => b.rating - a.rating)

    const nextTeams: Team[] = Array.from({ length: teamCount }, (_, index) => ({
      name: teamNames[index],
      players: [],
      totalRating: 0,
    }))

    const ordered = [
      ...seededPlayers.filter((player) => player.positions.includes('GOALKEEPER')),
      ...seededPlayers.filter(
        (player) => player.captain && !player.positions.includes('GOALKEEPER')
      ),
      ...seededPlayers.filter(
        (player) => !player.captain && !player.positions.includes('GOALKEEPER')
      ),
    ]

    ordered.forEach((player) => {
      const bestTeam = nextTeams
        .map((team) => ({ team, score: teamScore(team, player, arrivals.length, teamCount) }))
        .sort((a, b) => a.score - b.score)[0].team

      bestTeam.players.push(player)
      bestTeam.totalRating += player.rating
    })

    setTeams(nextTeams)
    setMessage(`${teamCount} balanced teams created.`)
  }

  return (
    <>
      <NavBar />

      <main className="min-h-screen bg-[#070A0F] px-4 py-5 text-white">
        <div className="mx-auto grid w-full max-w-130 gap-4">
          <header className="pt-2">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-300">
              Divina Liga
            </p>
            <h1 className="mt-2 text-4xl font-black leading-none">Match Check-In</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Scan the ticket, collect player details, and build balanced teams for kick-off.
            </p>
          </header>

          <section className="rounded-lg border border-white/10 bg-slate-950/80 p-4 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black">Team Randomiser</h2>
                <p className="text-sm text-slate-400">
                  {loadingArrivals ? 'Loading arrivals' : `${arrivals.length} arrived players`}
                </p>
              </div>
              <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-sm font-black text-emerald-200">
                {validTickets.length - arrivals.length} tickets left
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button className="touch-button bg-rose-500 text-rose-950" onClick={() => randomizeTeams(2)}>
                2 TEAMS
              </button>
              <button className="touch-button bg-sky-400 text-sky-950" onClick={() => randomizeTeams(3)}>
                3 TEAMS
              </button>
            </div>

            {teams.length > 0 && (
              <div className="mt-4 grid gap-3">
                {teams.map((team, index) => (
                  <TeamCard key={team.name} team={team} index={index} />
                ))}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-white/10 bg-slate-950/80 p-4 shadow-2xl">
            <button className="touch-button w-full bg-emerald-400 text-emerald-950" onClick={startScanner}>
              START CHECK-IN
            </button>

            <div className="mt-4 grid gap-2">
              <label className="text-sm font-bold text-slate-200" htmlFor="manual-ticket">
                Manual ticket entry
              </label>
              <div className="flex overflow-hidden rounded-lg border border-slate-700 bg-slate-950">
                <span className="border-r border-slate-700 bg-slate-900 px-3 py-3 font-black text-emerald-300">
                  TCK-
                </span>
                <input
                  id="manual-ticket"
                  value={manualTicket}
                  onChange={(event) => setManualTicket(event.target.value)}
                  inputMode="numeric"
                  placeholder="839201"
                  className="min-w-0 flex-1 bg-transparent px-3 py-3 text-base text-white outline-none"
                />
              </div>
              <button
                className="touch-button border border-emerald-300/30 bg-emerald-400/10 text-emerald-200"
                onClick={submitManualTicket}
              >
                CHECK TICKET
              </button>
            </div>

            {scannerOpen && (
              <div className="mt-4 grid gap-3">
                <div id="reader" className="overflow-hidden rounded-lg bg-black p-2" />
                <button
                  className="touch-button border border-slate-700 bg-slate-900 text-slate-100"
                  onClick={() => void stopScanner()}
                >
                  STOP CAMERA
                </button>
              </div>
            )}

            {currentTicket && (
              <div className="mt-4 grid gap-4 rounded-lg border border-emerald-300/30 bg-emerald-400/10 p-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200">
                    Valid Ticket
                  </p>
                  <p className="mt-1 text-2xl font-black">{currentTicket}</p>
                </div>

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-100">Player name</span>
                  <input
                    value={playerName}
                    onChange={(event) => setPlayerName(event.target.value)}
                    placeholder="Insert name"
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-base text-white outline-none"
                  />
                </label>

                <div className="grid gap-2">
                  <p className="text-sm font-bold text-slate-100">Positions</p>
                  <div className="grid grid-cols-2 gap-2">
                    {positionOptions.map((position) => {
                      const active = selectedPositions.includes(position)

                      return (
                        <button
                          key={position}
                          className={`touch-button border ${
                            active
                              ? 'border-emerald-200 bg-emerald-400 text-emerald-950'
                              : 'border-slate-700 bg-slate-900 text-slate-100'
                          }`}
                          onClick={() => togglePosition(position)}
                        >
                          {position}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <button
                  className={`touch-button border ${
                    captain
                      ? 'border-amber-100 bg-amber-300 text-amber-950'
                      : 'border-amber-300/50 bg-amber-300/10 text-amber-200'
                  }`}
                  onClick={() => setCaptain((current) => !current)}
                >
                  CAPTAIN
                </button>

                <div className="grid gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-slate-100">Rating</p>
                    <p className="text-lg font-black">{rating}/10</p>
                  </div>
                  <div className="grid grid-cols-10 gap-1">
                    {Array.from({ length: 10 }, (_, index) => {
                      const value = index + 1

                      return (
                        <button
                          key={value}
                          className="h-10 rounded-md bg-slate-900 text-2xl font-black leading-none"
                          style={{
                            color: ratingColour(value),
                            opacity: value <= rating ? 1 : 0.3,
                          }}
                          onClick={() => setRating(value)}
                          aria-label={`Rating ${value}`}
                        >
                          {'\u2605'}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <button className="touch-button bg-sky-400 text-sky-950" onClick={saveArrival}>
                  I HAVE ARRIVED
                </button>
              </div>
            )}

            {message && (
              <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3 text-sm font-bold text-slate-100">
                {message}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-white/10 bg-slate-950/80 p-4 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black">Arrivals</h2>
              {arrivals.length > 0 && (
                <button
                  className="rounded-md border border-red-300/40 px-3 py-2 text-xs font-black text-red-200"
                  onClick={clearArrivals}
                >
                  CLEAR
                </button>
              )}
            </div>

            {arrivals.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">
                {loadingArrivals ? 'Loading arrivals from Supabase...' : 'No players checked in yet.'}
              </p>
            ) : (
              <div className="mt-4 grid gap-3">
                {arrivals.map((player) => (
                  <article key={player.id} className="rounded-lg border border-slate-800 bg-slate-900/80 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-black">
                          {player.name}
                          {player.captain && (
                            <span className="ml-2 rounded-full bg-amber-300/15 px-2 py-1 text-xs text-amber-200">
                              Captain
                            </span>
                          )}
                        </h3>
                        <p className="mt-1 text-xs font-bold text-slate-400">{player.ticket}</p>
                      </div>
                      <span className="rounded-full bg-emerald-400/15 px-2 py-1 text-xs font-black text-emerald-200">
                        {player.rating}/10
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-200">{player.positions.join(', ')}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatArrivalTime(player.arrivedAt)}</p>
                    <button
                      className="mt-3 w-full rounded-md border border-red-300/30 bg-red-400/10 px-3 py-2 text-xs font-black text-red-200"
                      onClick={() => removePlayer(player.ticket)}
                    >
                      REMOVE PLAYER
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  )
}

function TeamCard({ team, index }: { team: Team; index: number }) {
  const average = team.players.length
    ? (team.totalRating / team.players.length).toFixed(1)
    : '0.0'

  const colour =
    index === 0
      ? 'border-rose-300/40 bg-rose-500/15 text-rose-100'
      : index === 1
        ? 'border-sky-300/40 bg-sky-500/15 text-sky-100'
        : 'border-lime-300/40 bg-lime-500/15 text-lime-100'

  return (
    <article className={`rounded-lg border p-4 ${colour}`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xl font-black">{team.name}</h3>
        <span className="rounded-full bg-black/20 px-3 py-1 text-xs font-black">
          Avg {average}/10
        </span>
      </div>

      <div className="mt-3 grid gap-2">
        {team.players.map((player) => (
          <div key={player.id} className="rounded-md bg-black/20 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black">
                  {player.name}
                  {player.captain && <span className="ml-2 text-xs text-amber-200">C</span>}
                </p>
                <p className="mt-1 text-xs text-white/70">{player.positions.join(', ')}</p>
              </div>
              <span className="text-sm font-black">{player.rating}/10</span>
            </div>
          </div>
        ))}
      </div>
    </article>
  )
}

function teamScore(team: Team, player: Arrival, totalPlayers: number, teamCount: number) {
  const idealSize = Math.ceil(totalPlayers / teamCount)
  const futureSize = team.players.length + 1
  const futureTotal = team.totalRating + player.rating
  const sizePenalty = futureSize > idealSize ? 90 : futureSize * 14
  const ratingPenalty = futureTotal * 2
  const captainPenalty = player.captain && team.players.some((item) => item.captain) ? 28 : 0
  const positionBonus = player.positions.reduce((score, position) => {
    const teamAlreadyHasPosition = team.players.some((item) => item.positions.includes(position))
    const weight = position === 'GOALKEEPER' ? 38 : 12

    return score + (teamAlreadyHasPosition ? weight : -weight)
  }, 0)

  return sizePenalty + ratingPenalty + captainPenalty + positionBonus
}

function ratingColour(value: number) {
  const hue = Math.round(((value - 1) * 120) / 9)
  return `hsl(${hue}, 90%, 55%)`
}

function formatArrivalTime(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
