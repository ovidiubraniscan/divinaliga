'use client'

import { ChangeEvent, DragEvent, FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Position = 'Goalkeeper' | 'Defender' | 'Midfield' | 'Attacker'
type Zone = 'bench' | 'goalkeepers' | 'defenders' | 'midfielders' | 'attackers' | 'teamA' | 'teamB'

type MatchPlayer = {
  id: string
  name: string
  nickname: string
  photoUrl: string
  position: Position
  secondaryPositions: Position[]
  foot: 'Right' | 'Left' | 'Both'
  rating: number
  arrivedAt: string
  zone: Zone
  goals: number
  yellowCards: number
  notes: string
}

type MatchEvent = {
  id: string
  type: 'goal' | 'yellow' | 'note'
  playerId?: string
  playerName?: string
  team?: 'A' | 'B'
  text: string
  minute?: string
  createdAt: string
}

type SavedTeamSnapshot = {
  id: string
  savedAt: string
  scoreA: number
  scoreB: number
  matchMinute: string
  players: MatchPlayer[]
  events: MatchEvent[]
}

const STORAGE_PLAYERS = 'divina_matchday_players'
const STORAGE_EVENTS = 'divina_matchday_events'
const STORAGE_SNAPSHOTS = 'divina_matchday_snapshots'
const STORAGE_SCORE = 'divina_matchday_score'
const STORAGE_TIME = 'divina_matchday_time'

const positions: Position[] = ['Goalkeeper', 'Defender', 'Midfield', 'Attacker']

const zoneLabels: Record<Zone, string> = {
  bench: 'Waiting Area',
  goalkeepers: 'Goalkeepers',
  defenders: 'Defenders',
  midfielders: 'Midfielders',
  attackers: 'Attackers',
  teamA: 'Team A',
  teamB: 'Team B',
}

const getTier = (rating: number) => {
  if (rating >= 90) return 'Platinum'
  if (rating >= 80) return 'Gold'
  if (rating >= 70) return 'Silver'
  return 'Bronze'
}

const tierClasses = (rating: number) => {
  if (rating >= 90) return 'from-slate-100 via-cyan-100 to-violet-200 text-slate-950 border-white/80'
  if (rating >= 80) return 'from-yellow-200 via-amber-300 to-yellow-600 text-yellow-950 border-yellow-200/80'
  if (rating >= 70) return 'from-slate-200 via-slate-300 to-slate-500 text-slate-950 border-slate-100/70'
  return 'from-orange-800 via-amber-700 to-yellow-800 text-white border-orange-300/40'
}

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`

export default function MatchdayPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [showAdminLogin, setShowAdminLogin] = useState(false)
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminMessage, setAdminMessage] = useState('')

  const [players, setPlayers] = useState<MatchPlayer[]>([])
  const [events, setEvents] = useState<MatchEvent[]>([])
  const [snapshots, setSnapshots] = useState<SavedTeamSnapshot[]>([])
  const [scoreA, setScoreA] = useState(0)
  const [scoreB, setScoreB] = useState(0)
  const [matchMinute, setMatchMinute] = useState('Pre-match')

  const [showAddModal, setShowAddModal] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<MatchPlayer | null>(null)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [position, setPosition] = useState<Position>('Midfield')
  const [secondaryPositions, setSecondaryPositions] = useState<Position[]>([])
  const [foot, setFoot] = useState<'Right' | 'Left' | 'Both'>('Right')
  const [rating, setRating] = useState(50)
  const [arrivedAt, setArrivedAt] = useState(() => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))

  const [eventPlayerId, setEventPlayerId] = useState('')
  const [eventTeam, setEventTeam] = useState<'A' | 'B'>('A')
  const [eventMinute, setEventMinute] = useState('')
  const [noteText, setNoteText] = useState('')

  useEffect(() => {
    loadLocalData()
    checkAdminStatus()
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_PLAYERS, JSON.stringify(players))
  }, [players])

  useEffect(() => {
    localStorage.setItem(STORAGE_EVENTS, JSON.stringify(events))
  }, [events])

  useEffect(() => {
    localStorage.setItem(STORAGE_SNAPSHOTS, JSON.stringify(snapshots))
  }, [snapshots])

  useEffect(() => {
    localStorage.setItem(STORAGE_SCORE, JSON.stringify({ scoreA, scoreB }))
  }, [scoreA, scoreB])

  useEffect(() => {
    localStorage.setItem(STORAGE_TIME, matchMinute)
  }, [matchMinute])

  const loadLocalData = () => {
    setPlayers(JSON.parse(localStorage.getItem(STORAGE_PLAYERS) || '[]'))
    setEvents(JSON.parse(localStorage.getItem(STORAGE_EVENTS) || '[]'))
    setSnapshots(JSON.parse(localStorage.getItem(STORAGE_SNAPSHOTS) || '[]'))
    const savedScore = JSON.parse(localStorage.getItem(STORAGE_SCORE) || '{"scoreA":0,"scoreB":0}')
    setScoreA(savedScore.scoreA || 0)
    setScoreB(savedScore.scoreB || 0)
    setMatchMinute(localStorage.getItem(STORAGE_TIME) || 'Pre-match')
  }

  const checkAdminStatus = async () => {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      setIsAdmin(false)
      return
    }

    const { data, error } = await supabase.rpc('is_admin')
    if (!error && data === true) {
      setIsAdmin(true)
      return
    }

    setIsAdmin(false)
  }

  const adminLogin = async (event: FormEvent) => {
    event.preventDefault()
    setAdminMessage('')

    const { error } = await supabase.auth.signInWithPassword({
      email: adminEmail.trim(),
      password: adminPassword,
    })

    if (error) {
      setAdminMessage(error.message)
      return
    }

    await checkAdminStatus()
    setShowAdminLogin(false)
    setAdminPassword('')
  }

  const adminLogout = async () => {
    await supabase.auth.signOut()
    setIsAdmin(false)
  }

  const clearForm = () => {
    setName('')
    setNickname('')
    setPhotoUrl('')
    setPosition('Midfield')
    setSecondaryPositions([])
    setFoot('Right')
    setRating(50)
    setArrivedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    setEditingPlayer(null)
  }

  const openAddPlayer = () => {
    clearForm()
    setShowAddModal(true)
  }

  const openEditPlayer = (player: MatchPlayer) => {
    if (!isAdmin) return
    setEditingPlayer(player)
    setName(player.name)
    setNickname(player.nickname)
    setPhotoUrl(player.photoUrl)
    setPosition(player.position)
    setSecondaryPositions(player.secondaryPositions || [])
    setFoot(player.foot)
    setRating(player.rating)
    setArrivedAt(player.arrivedAt)
    setShowAddModal(true)
  }

  const handlePhotoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      setPhotoUrl(String(reader.result))
    }
    reader.readAsDataURL(file)
  }

  const toggleSecondaryPosition = (item: Position) => {
    setSecondaryPositions(current =>
      current.includes(item) ? current.filter(position => position !== item) : [...current, item]
    )
  }

  const savePlayer = (event: FormEvent) => {
    event.preventDefault()
    if (!isAdmin) return

    const cleanName = name.trim()
    const cleanNickname = nickname.trim() || cleanName
    if (!cleanName) return

    const playerData: MatchPlayer = {
      id: editingPlayer?.id || createId(),
      name: cleanName,
      nickname: cleanNickname,
      photoUrl,
      position,
      secondaryPositions,
      foot,
      rating: Math.min(99, Math.max(50, Number(rating))),
      arrivedAt: arrivedAt || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      zone: editingPlayer?.zone || positionToZone(position),
      goals: editingPlayer?.goals || 0,
      yellowCards: editingPlayer?.yellowCards || 0,
      notes: editingPlayer?.notes || '',
    }

    setPlayers(current => {
      if (editingPlayer) {
        return current.map(player => (player.id === editingPlayer.id ? playerData : player))
      }
      return [...current, playerData]
    })

    setSelectedPlayerId(playerData.id)
    setShowAddModal(false)
    clearForm()
  }

  const positionToZone = (item: Position): Zone => {
    if (item === 'Goalkeeper') return 'goalkeepers'
    if (item === 'Defender') return 'defenders'
    if (item === 'Midfield') return 'midfielders'
    return 'attackers'
  }

  const movePlayerToZone = (playerId: string, zone: Zone) => {
    if (!isAdmin) return
    setPlayers(current => current.map(player => (player.id === playerId ? { ...player, zone } : player)))
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>, zone: Zone) => {
    event.preventDefault()
    const playerId = event.dataTransfer.getData('playerId')
    if (!playerId) return
    movePlayerToZone(playerId, zone)
  }

  const allowDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  const randomiseTeams = () => {
    if (!isAdmin) return
    const sorted = [...players].sort((a, b) => b.rating - a.rating)
    const teamA: MatchPlayer[] = []
    const teamB: MatchPlayer[] = []

    sorted.forEach((player, index) => {
      const aTotal = teamA.reduce((sum, item) => sum + item.rating, 0)
      const bTotal = teamB.reduce((sum, item) => sum + item.rating, 0)
      const aNeedsGoalkeeper = !teamA.some(item => item.position === 'Goalkeeper')
      const bNeedsGoalkeeper = !teamB.some(item => item.position === 'Goalkeeper')

      if (player.position === 'Goalkeeper' && aNeedsGoalkeeper && !bNeedsGoalkeeper) {
        teamA.push(player)
        return
      }

      if (player.position === 'Goalkeeper' && bNeedsGoalkeeper && !aNeedsGoalkeeper) {
        teamB.push(player)
        return
      }

      if (teamA.length < teamB.length) {
        teamA.push(player)
      } else if (teamB.length < teamA.length) {
        teamB.push(player)
      } else if (aTotal <= bTotal) {
        teamA.push(player)
      } else {
        teamB.push(player)
      }
    })

    const teamAIds = new Set(teamA.map(player => player.id))
    const teamBIds = new Set(teamB.map(player => player.id))

    setPlayers(current => current.map(player => {
      if (teamAIds.has(player.id)) return { ...player, zone: 'teamA' }
      if (teamBIds.has(player.id)) return { ...player, zone: 'teamB' }
      return player
    }))
  }

  const resetToPositions = () => {
    if (!isAdmin) return
    setPlayers(current => current.map(player => ({ ...player, zone: positionToZone(player.position) })))
  }

  const removePlayer = (playerId: string) => {
    if (!isAdmin) return
    setPlayers(current => current.filter(player => player.id !== playerId))
    if (selectedPlayerId === playerId) setSelectedPlayerId(null)
  }

  const saveSnapshot = () => {
    if (!isAdmin) return
    const snapshot: SavedTeamSnapshot = {
      id: createId(),
      savedAt: new Date().toLocaleString(),
      scoreA,
      scoreB,
      matchMinute,
      players,
      events,
    }
    setSnapshots(current => [snapshot, ...current])
  }

  const clearMatchday = () => {
    if (!isAdmin) return
    setPlayers([])
    setEvents([])
    setScoreA(0)
    setScoreB(0)
    setMatchMinute('Pre-match')
    setSelectedPlayerId(null)
  }

  const addGoal = () => {
    if (!isAdmin || !eventPlayerId) return
    const player = players.find(item => item.id === eventPlayerId)
    if (!player) return

    setPlayers(current => current.map(item => item.id === eventPlayerId ? { ...item, goals: item.goals + 1 } : item))
    if (eventTeam === 'A') setScoreA(score => score + 1)
    if (eventTeam === 'B') setScoreB(score => score + 1)

    setEvents(current => [{
      id: createId(),
      type: 'goal',
      playerId: player.id,
      playerName: player.nickname || player.name,
      team: eventTeam,
      text: `Goal for Team ${eventTeam}`,
      minute: eventMinute,
      createdAt: new Date().toLocaleString(),
    }, ...current])

    setEventMinute('')
  }

  const addYellowCard = () => {
    if (!isAdmin || !eventPlayerId) return
    const player = players.find(item => item.id === eventPlayerId)
    if (!player) return

    setPlayers(current => current.map(item => item.id === eventPlayerId ? { ...item, yellowCards: item.yellowCards + 1 } : item))
    setEvents(current => [{
      id: createId(),
      type: 'yellow',
      playerId: player.id,
      playerName: player.nickname || player.name,
      text: 'Yellow card',
      minute: eventMinute,
      createdAt: new Date().toLocaleString(),
    }, ...current])

    setEventMinute('')
  }

  const addNote = () => {
    if (!isAdmin || !noteText.trim()) return
    const player = players.find(item => item.id === eventPlayerId)

    setEvents(current => [{
      id: createId(),
      type: 'note',
      playerId: player?.id,
      playerName: player?.nickname || player?.name,
      text: noteText.trim(),
      minute: eventMinute,
      createdAt: new Date().toLocaleString(),
    }, ...current])

    if (player) {
      setPlayers(current => current.map(item => item.id === player.id ? { ...item, notes: [item.notes, noteText.trim()].filter(Boolean).join(' | ') } : item))
    }

    setNoteText('')
    setEventMinute('')
  }

  const teamAPlayers = players.filter(player => player.zone === 'teamA')
  const teamBPlayers = players.filter(player => player.zone === 'teamB')
  const selectedPlayer = players.find(player => player.id === selectedPlayerId) || null

  const average = (items: MatchPlayer[]) => {
    if (!items.length) return '0.0'
    return (items.reduce((sum, player) => sum + player.rating, 0) / items.length).toFixed(1)
  }

  const groupedPlayers = useMemo(() => ({
    bench: players.filter(player => player.zone === 'bench'),
    goalkeepers: players.filter(player => player.zone === 'goalkeepers'),
    defenders: players.filter(player => player.zone === 'defenders'),
    midfielders: players.filter(player => player.zone === 'midfielders'),
    attackers: players.filter(player => player.zone === 'attackers'),
    teamA: teamAPlayers,
    teamB: teamBPlayers,
  }), [players])

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5">
        <header className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.35em] text-emerald-300">DIVINA LIGA</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">Matchday Control</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                Manual matchday board for today: add players, drag cards into teams, save lineups, track score, goals and notes.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href="/" className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-slate-200">Home</Link>
              <Link href="/check-in" className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-slate-200">Check-In</Link>
              {isAdmin ? (
                <button onClick={adminLogout} className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm font-black text-red-200">Admin Logout</button>
              ) : (
                <button onClick={() => setShowAdminLogin(true)} className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm font-black text-emerald-200">🔒 Admin</button>
              )}
            </div>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 shadow-2xl">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black">Teams Board</h2>
                <p className="text-sm text-slate-400">Drag player cards into either side of the pitch.</p>
              </div>
              {isAdmin && (
                <div className="flex flex-wrap gap-2">
                  <button onClick={openAddPlayer} className="rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-black text-emerald-950">+ Add Card</button>
                  <button onClick={randomiseTeams} className="rounded-2xl bg-purple-400 px-4 py-3 text-sm font-black text-purple-950">Randomise</button>
                  <button onClick={resetToPositions} className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-slate-200">Pre-Match View</button>
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <TeamDropZone
                title="🔴 Team A"
                subtitle={`${teamAPlayers.length} players • Avg ${average(teamAPlayers)} rating`}
                zone="teamA"
                players={groupedPlayers.teamA}
                selectedPlayerId={selectedPlayerId}
                isAdmin={isAdmin}
                onDrop={handleDrop}
                onAllowDrop={allowDrop}
                onSelect={setSelectedPlayerId}
                onEdit={openEditPlayer}
                onRemove={removePlayer}
                accent="border-red-400/40 bg-red-500/10"
              />

              <TeamDropZone
                title="🔵 Team B"
                subtitle={`${teamBPlayers.length} players • Avg ${average(teamBPlayers)} rating`}
                zone="teamB"
                players={groupedPlayers.teamB}
                selectedPlayerId={selectedPlayerId}
                isAdmin={isAdmin}
                onDrop={handleDrop}
                onAllowDrop={allowDrop}
                onSelect={setSelectedPlayerId}
                onEdit={openEditPlayer}
                onRemove={removePlayer}
                accent="border-sky-400/40 bg-sky-500/10"
              />
            </div>
          </div>

          <aside className="space-y-4">
            <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 shadow-2xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-400">Score</p>
                  <h2 className="text-4xl font-black">{scoreA} - {scoreB}</h2>
                  <p className="text-sm text-slate-400">{matchMinute}</p>
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                    <button onClick={() => setScoreA(score => Math.max(0, score - 1))} className="rounded-xl border border-white/10 px-3 py-2 font-black">-</button>
                    <button onClick={() => setScoreA(score => score + 1)} className="rounded-xl bg-red-400 px-3 py-2 font-black text-red-950">A +</button>
                    <button onClick={() => setScoreB(score => Math.max(0, score - 1))} className="rounded-xl border border-white/10 px-3 py-2 font-black">-</button>
                    <button onClick={() => setScoreB(score => score + 1)} className="rounded-xl bg-sky-400 px-3 py-2 font-black text-sky-950">B +</button>
                  </div>
                )}
              </div>

              {isAdmin && (
                <div className="mt-4 space-y-3">
                  <input
                    value={matchMinute}
                    onChange={event => setMatchMinute(event.target.value)}
                    placeholder="Match time, e.g. 34' or Half Time"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-emerald-300"
                  />
                  <button onClick={saveSnapshot} className="w-full rounded-2xl bg-yellow-300 px-4 py-3 text-sm font-black text-yellow-950">Save Teams + Match State</button>
                </div>
              )}
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 shadow-2xl">
              <h2 className="text-xl font-black">Selected Player</h2>
              {selectedPlayer ? (
                <div className="mt-3">
                  <PlayerCard player={selectedPlayer} isSelected={false} isAdmin={false} onSelect={() => {}} onEdit={() => {}} onRemove={() => {}} />
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-2xl bg-white/5 p-3"><p className="font-black">{selectedPlayer.goals}</p><p className="text-slate-400">Goals</p></div>
                    <div className="rounded-2xl bg-white/5 p-3"><p className="font-black">{selectedPlayer.yellowCards}</p><p className="text-slate-400">Yellows</p></div>
                    <div className="rounded-2xl bg-white/5 p-3"><p className="font-black">{selectedPlayer.arrivedAt}</p><p className="text-slate-400">Arrived</p></div>
                  </div>
                  {selectedPlayer.notes && <p className="mt-3 rounded-2xl bg-white/5 p-3 text-sm text-slate-300">{selectedPlayer.notes}</p>}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-400">Select a card to see player details.</p>
              )}
            </section>
          </aside>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 shadow-2xl">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black">Pre-Match Position Groups</h2>
              <p className="text-sm text-slate-400">Cards start here based on their main position before teams are created.</p>
            </div>
            {isAdmin && (
              <button onClick={clearMatchday} className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm font-black text-red-200">Clear Today</button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <SmallDropZone title="Waiting" zone="bench" players={groupedPlayers.bench} isAdmin={isAdmin} selectedPlayerId={selectedPlayerId} onDrop={handleDrop} onAllowDrop={allowDrop} onSelect={setSelectedPlayerId} onEdit={openEditPlayer} onRemove={removePlayer} />
            <SmallDropZone title="Goalkeepers" zone="goalkeepers" players={groupedPlayers.goalkeepers} isAdmin={isAdmin} selectedPlayerId={selectedPlayerId} onDrop={handleDrop} onAllowDrop={allowDrop} onSelect={setSelectedPlayerId} onEdit={openEditPlayer} onRemove={removePlayer} />
            <SmallDropZone title="Defenders" zone="defenders" players={groupedPlayers.defenders} isAdmin={isAdmin} selectedPlayerId={selectedPlayerId} onDrop={handleDrop} onAllowDrop={allowDrop} onSelect={setSelectedPlayerId} onEdit={openEditPlayer} onRemove={removePlayer} />
            <SmallDropZone title="Midfielders" zone="midfielders" players={groupedPlayers.midfielders} isAdmin={isAdmin} selectedPlayerId={selectedPlayerId} onDrop={handleDrop} onAllowDrop={allowDrop} onSelect={setSelectedPlayerId} onEdit={openEditPlayer} onRemove={removePlayer} />
            <SmallDropZone title="Attackers" zone="attackers" players={groupedPlayers.attackers} isAdmin={isAdmin} selectedPlayerId={selectedPlayerId} onDrop={handleDrop} onAllowDrop={allowDrop} onSelect={setSelectedPlayerId} onEdit={openEditPlayer} onRemove={removePlayer} />
          </div>
        </section>

        {isAdmin && (
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 shadow-2xl">
              <h2 className="text-xl font-black">Match Events</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <select value={eventPlayerId} onChange={event => setEventPlayerId(event.target.value)} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none">
                  <option value="">Select player</option>
                  {players.map(player => <option key={player.id} value={player.id}>{player.nickname || player.name}</option>)}
                </select>
                <input value={eventMinute} onChange={event => setEventMinute(event.target.value)} placeholder="Minute, e.g. 23'" className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none" />
                <select value={eventTeam} onChange={event => setEventTeam(event.target.value as 'A' | 'B')} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none">
                  <option value="A">Team A</option>
                  <option value="B">Team B</option>
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={addGoal} className="rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-black text-emerald-950">Add Goal</button>
                  <button onClick={addYellowCard} className="rounded-2xl bg-yellow-300 px-4 py-3 text-sm font-black text-yellow-950">Yellow</button>
                </div>
              </div>
              <textarea value={noteText} onChange={event => setNoteText(event.target.value)} placeholder="Extra note, injury, great save, etc." className="mt-3 min-h-24 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none" />
              <button onClick={addNote} className="mt-3 w-full rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-slate-200">Add Note</button>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 shadow-2xl">
              <h2 className="text-xl font-black">Event Log</h2>
              <div className="mt-4 max-h-80 space-y-2 overflow-auto pr-1">
                {events.length ? events.map(event => (
                  <div key={event.id} className="rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-sm">
                    <div className="flex justify-between gap-3">
                      <p className="font-black">{event.type === 'goal' ? '⚽ Goal' : event.type === 'yellow' ? '🟨 Yellow Card' : '📝 Note'}</p>
                      <p className="text-xs text-slate-500">{event.minute || event.createdAt}</p>
                    </div>
                    <p className="mt-1 text-slate-300">{event.playerName ? `${event.playerName}: ` : ''}{event.text}</p>
                  </div>
                )) : <p className="text-sm text-slate-400">No events added yet.</p>}
              </div>
            </div>
          </section>
        )}

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 shadow-2xl">
          <h2 className="text-xl font-black">Saved Team Snapshots</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {snapshots.length ? snapshots.map(snapshot => (
              <div key={snapshot.id} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm">
                <p className="font-black">{snapshot.savedAt}</p>
                <p className="mt-1 text-slate-400">Score {snapshot.scoreA} - {snapshot.scoreB} • {snapshot.matchMinute}</p>
                <p className="mt-2 text-slate-300">Players saved: {snapshot.players.length}</p>
              </div>
            )) : <p className="text-sm text-slate-400">No snapshots saved yet.</p>}
          </div>
        </section>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur">
          <form onSubmit={savePlayer} className="max-h-[92vh] w-full max-w-xl overflow-auto rounded-[2rem] border border-white/10 bg-slate-950 p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-300">Admin</p>
                <h2 className="text-2xl font-black">{editingPlayer ? 'Edit Player Card' : 'Add Player Card'}</h2>
              </div>
              <button type="button" onClick={() => { setShowAddModal(false); clearForm() }} className="rounded-full border border-white/10 px-4 py-2 font-black">×</button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-300">Full name</span>
                <input value={name} onChange={event => setName(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none" required />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-300">Nickname</span>
                <input value={nickname} onChange={event => setNickname(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-300">Main position</span>
                <select value={position} onChange={event => setPosition(event.target.value as Position)} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none">
                  {positions.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-300">Preferred foot</span>
                <select value={foot} onChange={event => setFoot(event.target.value as 'Right' | 'Left' | 'Both')} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none">
                  <option value="Right">Right</option>
                  <option value="Left">Left</option>
                  <option value="Both">Both</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-300">Rating 50-99</span>
                <input type="number" min="50" max="99" value={rating} onChange={event => setRating(Number(event.target.value))} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-300">Arrived time</span>
                <input value={arrivedAt} onChange={event => setArrivedAt(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none" />
              </label>
            </div>

            <div className="mt-4 space-y-2">
              <span className="text-sm font-bold text-slate-300">Secondary positions</span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {positions.map(item => (
                  <button key={item} type="button" onClick={() => toggleSecondaryPosition(item)} className={`rounded-2xl border px-3 py-3 text-xs font-black ${secondaryPositions.includes(item) ? 'border-emerald-300 bg-emerald-400 text-emerald-950' : 'border-white/10 bg-white/5 text-slate-300'}`}>
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[0.8fr_1.2fr]">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-3">
                {photoUrl ? <img src={photoUrl} alt="Preview" className="aspect-square w-full rounded-2xl object-cover" /> : <div className="flex aspect-square items-center justify-center rounded-2xl bg-slate-900 text-5xl">👤</div>}
              </div>
              <div className="space-y-3">
                <label className="block space-y-2">
                  <span className="text-sm font-bold text-slate-300">Upload picture</span>
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm" />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-bold text-slate-300">Or paste image URL</span>
                  <input value={photoUrl.startsWith('data:') ? '' : photoUrl} onChange={event => setPhotoUrl(event.target.value)} placeholder="https://..." className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none" />
                </label>
                <p className="text-xs text-slate-500">For today this image is stored on this device. Later you can move this to Supabase Storage.</p>
              </div>
            </div>

            <button type="submit" className="mt-5 w-full rounded-2xl bg-emerald-400 px-5 py-4 text-lg font-black text-emerald-950">
              {editingPlayer ? 'Save Changes' : 'Add Card'}
            </button>
          </form>
        </div>
      )}

      {showAdminLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur">
          <form onSubmit={adminLogin} className="w-full max-w-md rounded-[2rem] border border-white/10 bg-slate-950 p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-black">Admin Login</h2>
              <button type="button" onClick={() => setShowAdminLogin(false)} className="rounded-full border border-white/10 px-4 py-2 font-black">×</button>
            </div>
            <input value={adminEmail} onChange={event => setAdminEmail(event.target.value)} placeholder="Admin email" className="mb-3 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none" />
            <input type="password" value={adminPassword} onChange={event => setAdminPassword(event.target.value)} placeholder="Admin password" className="mb-3 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none" />
            {adminMessage && <p className="mb-3 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{adminMessage}</p>}
            <button type="submit" className="w-full rounded-2xl bg-emerald-400 px-4 py-3 font-black text-emerald-950">Login as Admin</button>
          </form>
        </div>
      )}
    </main>
  )
}

function TeamDropZone({
  title,
  subtitle,
  zone,
  players,
  selectedPlayerId,
  isAdmin,
  onDrop,
  onAllowDrop,
  onSelect,
  onEdit,
  onRemove,
  accent,
}: {
  title: string
  subtitle: string
  zone: Zone
  players: MatchPlayer[]
  selectedPlayerId: string | null
  isAdmin: boolean
  onDrop: (event: DragEvent<HTMLDivElement>, zone: Zone) => void
  onAllowDrop: (event: DragEvent<HTMLDivElement>) => void
  onSelect: (id: string) => void
  onEdit: (player: MatchPlayer) => void
  onRemove: (id: string) => void
  accent: string
}) {
  return (
    <div onDragOver={onAllowDrop} onDrop={event => onDrop(event, zone)} className={`min-h-[420px] rounded-[2rem] border p-4 ${accent}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-black">{title}</h3>
          <p className="text-xs text-slate-300">{subtitle}</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {players.map(player => (
          <PlayerCard key={player.id} player={player} isSelected={selectedPlayerId === player.id} isAdmin={isAdmin} onSelect={onSelect} onEdit={onEdit} onRemove={onRemove} />
        ))}
      </div>
    </div>
  )
}

function SmallDropZone({
  title,
  zone,
  players,
  selectedPlayerId,
  isAdmin,
  onDrop,
  onAllowDrop,
  onSelect,
  onEdit,
  onRemove,
}: {
  title: string
  zone: Zone
  players: MatchPlayer[]
  selectedPlayerId: string | null
  isAdmin: boolean
  onDrop: (event: DragEvent<HTMLDivElement>, zone: Zone) => void
  onAllowDrop: (event: DragEvent<HTMLDivElement>) => void
  onSelect: (id: string) => void
  onEdit: (player: MatchPlayer) => void
  onRemove: (id: string) => void
}) {
  return (
    <div onDragOver={onAllowDrop} onDrop={event => onDrop(event, zone)} className="min-h-[280px] rounded-[2rem] border border-white/10 bg-slate-950/50 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-black">{title}</h3>
        <span className="rounded-full bg-white/10 px-2 py-1 text-xs font-black">{players.length}</span>
      </div>
      <div className="space-y-3">
        {players.map(player => (
          <PlayerCard key={player.id} player={player} isSelected={selectedPlayerId === player.id} isAdmin={isAdmin} onSelect={onSelect} onEdit={onEdit} onRemove={onRemove} compact />
        ))}
      </div>
    </div>
  )
}

function PlayerCard({
  player,
  isSelected,
  isAdmin,
  onSelect,
  onEdit,
  onRemove,
  compact = false,
}: {
  player: MatchPlayer
  isSelected: boolean
  isAdmin: boolean
  onSelect: (id: string) => void
  onEdit: (player: MatchPlayer) => void
  onRemove: (id: string) => void
  compact?: boolean
}) {
  return (
    <div
      draggable={isAdmin}
      onDragStart={event => event.dataTransfer.setData('playerId', player.id)}
      onClick={() => onSelect(player.id)}
      className={`cursor-pointer rounded-[1.5rem] border bg-gradient-to-br p-3 shadow-xl transition active:scale-[0.98] ${tierClasses(player.rating)} ${isSelected ? 'ring-4 ring-emerald-300' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-3xl font-black leading-none">{player.rating}</p>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{getTier(player.rating)}</p>
        </div>
        <p className="rounded-full bg-black/20 px-2 py-1 text-[10px] font-black uppercase">{player.position}</p>
      </div>

      <div className={`mx-auto my-3 overflow-hidden rounded-2xl bg-black/20 ${compact ? 'h-20 w-20' : 'h-28 w-28'}`}>
        {player.photoUrl ? <img src={player.photoUrl} alt={player.nickname || player.name} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-4xl">👤</div>}
      </div>

      <div className="text-center">
        <p className="truncate text-lg font-black uppercase tracking-tight">{player.nickname || player.name}</p>
        <p className="text-xs font-bold opacity-80">{player.foot} foot • Arrived {player.arrivedAt}</p>
        {!compact && <p className="mt-1 text-xs opacity-75">{player.secondaryPositions?.length ? player.secondaryPositions.join(' / ') : 'No secondary positions'}</p>}
      </div>

      {isAdmin && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={event => { event.stopPropagation(); onEdit(player) }} className="rounded-xl bg-black/20 px-3 py-2 text-xs font-black">Edit</button>
          <button type="button" onClick={event => { event.stopPropagation(); onRemove(player.id) }} className="rounded-xl bg-red-950/60 px-3 py-2 text-xs font-black text-red-100">Remove</button>
        </div>
      )}
    </div>
  )
}
