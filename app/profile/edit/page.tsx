'use client'

import { ChangeEvent, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import NavBar from '@/components/NavBar'
import { supabase } from '@/lib/supabase'
import { Html5Qrcode } from 'html5-qrcode'

type PreferredFoot = 'Right' | 'Left' | 'Both' | ''

type PlayerProfile = {
  id: string
  username: string
  pin_code?: string | null
  nickname: string
  player_number: number | null
  rating: number
  profile_picture_url: string | null
  preferred_foot: PreferredFoot | null
  main_position: string | null
  secondary_positions: string[] | null
  games_played: number
  goals: number
  assists: number
  is_active?: boolean
  created_at?: string
}

type PlayerTicket = {
  id: string
  player_id: string
  ticket_code: string
  is_used: boolean
  used_at: string | null
  created_at: string
}

type RatingHistory = {
  id: string
  player_id: string
  old_rating: number | null
  new_rating: number
  reason: string | null
  match_label: string | null
  created_at: string
}

const POSITION_OPTIONS = ['Goalkeeper', 'Defender', 'Midfield', 'Attacker']

export default function EditProfile() {
  const router = useRouter()
  const scannerRef = useRef<Html5Qrcode | null>(null)

  const [player, setPlayer] = useState<PlayerProfile | null>(null)
  const [tickets, setTickets] = useState<PlayerTicket[]>([])
  const [ratingHistory, setRatingHistory] = useState<RatingHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [scanningTicket, setScanningTicket] = useState(false)
  const [message, setMessage] = useState('')

  const [nickname, setNickname] = useState('')
  const [playerNumber, setPlayerNumber] = useState('')
  const [profileImageUrl, setProfileImageUrl] = useState('')
  const [preferredFoot, setPreferredFoot] = useState<PreferredFoot>('')
  const [mainPosition, setMainPosition] = useState('')
  const [secondaryPositions, setSecondaryPositions] = useState<string[]>([])
  const [manualTicketCode, setManualTicketCode] = useState('')

  useEffect(() => {
    loadProfile()

    return () => {
      stopTicketScanner()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadProfile = async () => {
    setMessage('')

    const savedPlayer = localStorage.getItem('divina_player')

    if (!savedPlayer) {
      router.push('/login')
      return
    }

    let parsedPlayer: PlayerProfile

    try {
      parsedPlayer = JSON.parse(savedPlayer) as PlayerProfile
    } catch {
      localStorage.removeItem('divina_player')
      router.push('/login')
      return
    }

    const { data, error } = await supabase
      .from('players')
      .select(
        'id, username, nickname, player_number, rating, profile_picture_url, preferred_foot, main_position, secondary_positions, games_played, goals, assists, is_active, created_at'
      )
      .eq('id', parsedPlayer.id)
      .maybeSingle()

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    if (!data) {
      localStorage.removeItem('divina_player')
      router.push('/login')
      return
    }

    const profile = data as PlayerProfile

    setPlayer(profile)
    setNickname(profile.nickname || '')
    setPlayerNumber(profile.player_number ? String(profile.player_number) : '')
    setProfileImageUrl(profile.profile_picture_url || '')
    setPreferredFoot(profile.preferred_foot || '')
    setMainPosition(profile.main_position || '')
    setSecondaryPositions(profile.secondary_positions || [])
    localStorage.setItem('divina_player', JSON.stringify(profile))

    await Promise.all([loadTickets(profile.id), loadRatingHistory(profile.id)])
    setLoading(false)
  }

  const loadTickets = async (playerId: string) => {
    const { data, error } = await supabase
      .from('player_tickets')
      .select('id, player_id, ticket_code, is_used, used_at, created_at')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })

    if (!error && data) setTickets(data as PlayerTicket[])
  }

  const loadRatingHistory = async (playerId: string) => {
    const { data, error } = await supabase
      .from('rating_history')
      .select('id, player_id, old_rating, new_rating, reason, match_label, created_at')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (!error && data) setRatingHistory(data as RatingHistory[])
  }

  const ratingTier = getRatingTier(player?.rating || 50)
  const latestAvailableTicket = tickets.find((ticket) => !ticket.is_used)

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!player) return

    const file = event.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/png', 'image/webp', 'image/jpeg', 'image/jpg']

    if (!allowedTypes.includes(file.type)) {
      setMessage('Please upload a PNG, WEBP, or JPG image.')
      return
    }

    setUploading(true)
    setMessage('')

    const fileExt = file.name.split('.').pop() || 'png'
    const cleanUsername = player.username.replace(/[^a-zA-Z0-9_-]/g, '')
    const filePath = `${player.id}/${cleanUsername}-${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('profile-images')
      .upload(filePath, file, { upsert: true, contentType: file.type })

    if (uploadError) {
      setMessage(uploadError.message)
      setUploading(false)
      return
    }

    const { data } = supabase.storage.from('profile-images').getPublicUrl(filePath)

    setProfileImageUrl(data.publicUrl)
    setUploading(false)
    setMessage('Image uploaded. Press Save Profile to keep it. PNG or WEBP keeps transparent background if the image already has one.')
  }

  const toggleSecondaryPosition = (position: string) => {
    setSecondaryPositions((current) =>
      current.includes(position)
        ? current.filter((item) => item !== position)
        : [...current, position]
    )
  }

  const handleSave = async () => {
    if (!player) return

    const cleanNickname = nickname.trim()
    const cleanPlayerNumber = playerNumber.trim()
      ? Number.parseInt(playerNumber.trim(), 10)
      : null

    if (!cleanNickname) {
      setMessage('Nickname is required.')
      return
    }

    if (cleanPlayerNumber !== null && (Number.isNaN(cleanPlayerNumber) || cleanPlayerNumber < 1 || cleanPlayerNumber > 999)) {
      setMessage('Player number must be between 1 and 999.')
      return
    }

    if (!preferredFoot) {
      setMessage('Please select your preferred foot.')
      return
    }

    if (!mainPosition) {
      setMessage('Please select your main position.')
      return
    }

    setSaving(true)
    setMessage('')

    const updates = {
      nickname: cleanNickname,
      player_number: cleanPlayerNumber,
      profile_picture_url: profileImageUrl.trim() || null,
      preferred_foot: preferredFoot,
      main_position: mainPosition,
      secondary_positions: secondaryPositions,
    }

    const { data, error } = await supabase
      .from('players')
      .update(updates)
      .eq('id', player.id)
      .select(
        'id, username, nickname, player_number, rating, profile_picture_url, preferred_foot, main_position, secondary_positions, games_played, goals, assists, is_active, created_at'
      )
      .maybeSingle()

    if (error) {
      setMessage(error.message)
      setSaving(false)
      return
    }

    if (!data) {
      setMessage('Profile could not be updated.')
      setSaving(false)
      return
    }

    const updatedProfile = data as PlayerProfile
    setPlayer(updatedProfile)
    localStorage.setItem('divina_player', JSON.stringify(updatedProfile))
    setMessage('Profile updated successfully.')
    setSaving(false)
  }

  const startTicketScanner = async () => {
    if (!player) return

    setMessage('')
    setScanningTicket(true)

    const scanner = new Html5Qrcode('ticket-reader')
    scannerRef.current = scanner

    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText: string) => {
          await stopTicketScanner()
          await saveTicketCode(decodedText)
        },
        undefined
      )
    } catch (error) {
      setScanningTicket(false)
      setMessage('Camera could not start. Check camera permissions and use HTTPS or localhost.')
    }
  }

  const stopTicketScanner = async () => {
    const scanner = scannerRef.current

    if (scanner) {
      try {
        const state = scanner.getState?.()
        if (state === 2) await scanner.stop()
        await scanner.clear()
      } catch {
        // Ignore scanner cleanup errors.
      }
    }

    scannerRef.current = null
    setScanningTicket(false)
  }

  const saveManualTicket = async () => {
    await saveTicketCode(manualTicketCode)
  }

  const saveTicketCode = async (rawCode: string) => {
    if (!player) return

    const ticketCode = rawCode.trim().toUpperCase()

    if (!ticketCode) {
      setMessage('Ticket code is empty.')
      return
    }

    const existsLocally = tickets.some((ticket) => ticket.ticket_code === ticketCode)
    if (existsLocally) {
      localStorage.setItem('divina_pending_ticket', ticketCode)
      setMessage('Ticket already saved. It is ready for check-in.')
      setManualTicketCode('')
      return
    }

    const { data, error } = await supabase
      .from('player_tickets')
      .insert({
        player_id: player.id,
        ticket_code: ticketCode,
        is_used: false,
      })
      .select('id, player_id, ticket_code, is_used, used_at, created_at')
      .maybeSingle()

    if (error) {
      setMessage(error.message)
      return
    }

    if (!data) {
      setMessage('Ticket could not be saved.')
      return
    }

    const savedTicket = data as PlayerTicket
    setTickets((current) => [savedTicket, ...current])
    localStorage.setItem('divina_pending_ticket', savedTicket.ticket_code)
    setManualTicketCode('')
    setMessage('Ticket saved and ready to use on check-in.')
  }

  const useTicketForCheckIn = (ticketCode: string) => {
    localStorage.setItem('divina_pending_ticket', ticketCode)
    setMessage('Ticket selected. Go to check-in and it will be ready to use.')
  }

  const removeTicket = async (ticketId: string) => {
    const { error } = await supabase
      .from('player_tickets')
      .delete()
      .eq('id', ticketId)

    if (error) {
      setMessage(error.message)
      return
    }

    setTickets((current) => current.filter((ticket) => ticket.id !== ticketId))
    setMessage('Ticket removed.')
  }

  const logout = () => {
    localStorage.removeItem('divina_player')
    localStorage.removeItem('divina_pending_ticket')
    router.push('/login')
  }

  return (
    <>
      <NavBar />

      <main className="min-h-screen bg-[#07080A] px-4 py-6 text-white">
        <div className="mx-auto max-w-md space-y-5">
          <header className="space-y-2 text-center">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-orange-400">
              Divina Liga
            </p>
            <h1 className="text-3xl font-black">Player Profile</h1>
            <p className="text-sm text-zinc-400">
              Edit your card, save tickets, and track your match progress.
            </p>
          </header>

          {loading ? (
            <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-center text-zinc-300">
              Loading profile...
            </section>
          ) : !player ? (
            <section className="rounded-3xl border border-red-500/30 bg-red-500/10 p-5 text-center text-red-200">
              No player profile found. Please log in again.
            </section>
          ) : (
            <>
              <section className={`${tierCardClass(ratingTier)} overflow-hidden rounded-[2rem] border p-5 shadow-2xl`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-5xl font-black leading-none">{player.rating}</p>
                    <p className="mt-1 text-xs font-black uppercase tracking-[0.25em]">{ratingTier}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs uppercase tracking-[0.2em] opacity-80">#{player.player_number || '--'}</p>
                    <p className="mt-1 text-sm font-black">{player.main_position || 'Position'}</p>
                  </div>
                </div>

                <div className="my-5 flex justify-center">
                  {profileImageUrl ? (
                    <img
                      src={profileImageUrl}
                      alt="Profile"
                      className="h-36 w-36 rounded-full border-4 border-white/30 bg-black/20 object-cover shadow-xl"
                    />
                  ) : (
                    <div className="flex h-36 w-36 items-center justify-center rounded-full border-4 border-white/20 bg-black/30 text-5xl">
                      ⚽
                    </div>
                  )}
                </div>

                <div className="text-center">
                  <h2 className="text-2xl font-black uppercase tracking-wide">{nickname || player.nickname}</h2>
                  <p className="mt-1 text-sm opacity-85">@{player.username}</p>
                  <p className="mt-2 text-sm font-bold">
                    {preferredFoot || player.preferred_foot || 'Foot'} foot · GP {player.games_played} · G {player.goals} · A {player.assists}
                  </p>
                </div>
              </section>

              <section className="grid grid-cols-3 gap-2">
                <StatCard label="Matches" value={player.games_played} />
                <StatCard label="Goals" value={player.goals} />
                <StatCard label="Assists" value={player.assists} />
              </section>

              <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-xl">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black">Edit Details</h2>
                    <p className="text-xs text-zinc-400">Username cannot be changed.</p>
                  </div>
                  <button
                    onClick={logout}
                    className="rounded-xl border border-red-500/40 px-3 py-2 text-xs font-black text-red-300"
                  >
                    Logout
                  </button>
                </div>

                <label className="mb-3 block">
                  <span className="mb-1 block text-xs font-black uppercase tracking-widest text-zinc-400">Username</span>
                  <input value={player.username} disabled className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-zinc-400" />
                </label>

                <label className="mb-3 block">
                  <span className="mb-1 block text-xs font-black uppercase tracking-widest text-zinc-400">Nickname</span>
                  <input
                    value={nickname}
                    onChange={(event) => setNickname(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-orange-400"
                    placeholder="Nickname"
                  />
                </label>

                <label className="mb-3 block">
                  <span className="mb-1 block text-xs font-black uppercase tracking-widest text-zinc-400">Player Number</span>
                  <input
                    value={playerNumber}
                    onChange={(event) => setPlayerNumber(event.target.value.replace(/[^0-9]/g, ''))}
                    inputMode="numeric"
                    className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-orange-400"
                    placeholder="10"
                  />
                </label>

                <label className="mb-3 block">
                  <span className="mb-1 block text-xs font-black uppercase tracking-widest text-zinc-400">Portrait Profile Picture</span>
                  <input
                    type="file"
                    accept="image/png,image/webp,image/jpeg"
                    onChange={handleImageUpload}
                    className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-zinc-300"
                  />
                  <span className="mt-2 block text-xs text-zinc-500">
                    Upload PNG or WEBP if you want transparent background preserved.
                  </span>
                </label>

                <label className="mb-3 block">
                  <span className="mb-1 block text-xs font-black uppercase tracking-widest text-zinc-400">Or Image URL</span>
                  <input
                    value={profileImageUrl}
                    onChange={(event) => setProfileImageUrl(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-orange-400"
                    placeholder="https://..."
                  />
                </label>

                <label className="mb-3 block">
                  <span className="mb-1 block text-xs font-black uppercase tracking-widest text-zinc-400">Preferred Foot</span>
                  <select
                    value={preferredFoot}
                    onChange={(event) => setPreferredFoot(event.target.value as PreferredFoot)}
                    className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-orange-400"
                  >
                    <option value="">Select foot</option>
                    <option value="Right">Right</option>
                    <option value="Left">Left</option>
                    <option value="Both">Both</option>
                  </select>
                </label>

                <label className="mb-3 block">
                  <span className="mb-1 block text-xs font-black uppercase tracking-widest text-zinc-400">Main Position</span>
                  <select
                    value={mainPosition}
                    onChange={(event) => setMainPosition(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-orange-400"
                  >
                    <option value="">Select position</option>
                    {POSITION_OPTIONS.map((position) => (
                      <option key={position} value={position}>{position}</option>
                    ))}
                  </select>
                </label>

                <div className="mb-4">
                  <span className="mb-2 block text-xs font-black uppercase tracking-widest text-zinc-400">Secondary Positions</span>
                  <div className="grid grid-cols-2 gap-2">
                    {POSITION_OPTIONS.map((position) => {
                      const active = secondaryPositions.includes(position)
                      return (
                        <button
                          key={position}
                          type="button"
                          onClick={() => toggleSecondaryPosition(position)}
                          className={`rounded-2xl border px-3 py-3 text-sm font-black ${
                            active
                              ? 'border-emerald-300 bg-emerald-400 text-emerald-950'
                              : 'border-white/10 bg-black/30 text-zinc-300'
                          }`}
                        >
                          {position}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <button
                  onClick={handleSave}
                  disabled={saving || uploading}
                  className="w-full rounded-2xl bg-orange-500 px-5 py-4 text-lg font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? 'Saving...' : uploading ? 'Uploading...' : 'Save Profile'}
                </button>
              </section>

              <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-xl">
                <div className="mb-4">
                  <h2 className="text-xl font-black">Saved Tickets</h2>
                  <p className="text-xs text-zinc-400">
                    Scan a ticket here once, then use it on the check-in page without scanning again.
                  </p>
                </div>

                {latestAvailableTicket && (
                  <div className="mb-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4">
                    <p className="text-xs font-black uppercase tracking-widest text-emerald-300">Ready for check-in</p>
                    <p className="mt-1 text-2xl font-black">{latestAvailableTicket.ticket_code}</p>
                    <button
                      onClick={() => useTicketForCheckIn(latestAvailableTicket.ticket_code)}
                      className="mt-3 w-full rounded-xl bg-emerald-400 px-4 py-3 text-sm font-black text-emerald-950"
                    >
                      Use This Ticket
                    </button>
                  </div>
                )}

                <div className="space-y-3">
                  <button
                    onClick={scanningTicket ? stopTicketScanner : startTicketScanner}
                    className="w-full rounded-2xl bg-sky-500 px-5 py-4 text-lg font-black text-sky-950 shadow-lg"
                  >
                    {scanningTicket ? 'Stop Scanner' : 'Scan Ticket QR'}
                  </button>

                  {scanningTicket && (
                    <div id="ticket-reader" className="overflow-hidden rounded-3xl bg-black p-2" />
                  )}

                  <div className="flex gap-2">
                    <input
                      value={manualTicketCode}
                      onChange={(event) => setManualTicketCode(event.target.value)}
                      className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-orange-400"
                      placeholder="Or type ticket code"
                    />
                    <button
                      onClick={saveManualTicket}
                      className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-black"
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {tickets.length === 0 ? (
                    <p className="rounded-2xl bg-black/30 p-4 text-sm text-zinc-400">No saved tickets yet.</p>
                  ) : (
                    tickets.map((ticket) => (
                      <div key={ticket.id} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-black">{ticket.ticket_code}</p>
                            <p className="text-xs text-zinc-500">Added {formatDate(ticket.created_at)}</p>
                            {ticket.is_used && <p className="mt-1 text-xs font-bold text-red-300">Used {ticket.used_at ? formatDate(ticket.used_at) : ''}</p>}
                          </div>
                          <span className={`rounded-full px-2 py-1 text-xs font-black ${ticket.is_used ? 'bg-red-500/10 text-red-300' : 'bg-emerald-500/10 text-emerald-300'}`}>
                            {ticket.is_used ? 'USED' : 'READY'}
                          </span>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button
                            onClick={() => useTicketForCheckIn(ticket.ticket_code)}
                            disabled={ticket.is_used}
                            className="rounded-xl border border-emerald-400/30 px-3 py-2 text-xs font-black text-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Use
                          </button>
                          <button
                            onClick={() => removeTicket(ticket.id)}
                            className="rounded-xl border border-red-500/30 px-3 py-2 text-xs font-black text-red-300"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-xl">
                <h2 className="text-xl font-black">Rating History</h2>
                <p className="mb-4 text-xs text-zinc-400">Track how your score changes after voting sessions and matches.</p>

                {ratingHistory.length === 0 ? (
                  <p className="rounded-2xl bg-black/30 p-4 text-sm text-zinc-400">
                    No rating changes yet. Everyone starts at 50.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {ratingHistory.map((item) => {
                      const direction = item.old_rating === null ? 'start' : item.new_rating > item.old_rating ? 'up' : item.new_rating < item.old_rating ? 'down' : 'same'
                      return (
                        <div key={item.id} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-black">
                                {item.old_rating ?? '--'} → {item.new_rating}
                              </p>
                              <p className="text-xs text-zinc-500">{item.match_label || 'Rating update'} · {formatDate(item.created_at)}</p>
                            </div>
                            <span className={`rounded-full px-2 py-1 text-xs font-black ${direction === 'up' ? 'bg-emerald-500/10 text-emerald-300' : direction === 'down' ? 'bg-red-500/10 text-red-300' : 'bg-zinc-500/10 text-zinc-300'}`}>
                              {direction === 'up' ? 'UP' : direction === 'down' ? 'DOWN' : 'SET'}
                            </span>
                          </div>
                          {item.reason && <p className="mt-2 text-sm text-zinc-300">{item.reason}</p>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>

              {message && (
                <p className={`rounded-2xl p-3 text-sm font-bold ${isPositiveMessage(message) ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'}`}>
                  {message}
                </p>
              )}
            </>
          )}
        </div>
      </main>
    </>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 text-center">
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-black uppercase tracking-widest text-zinc-500">{label}</p>
    </div>
  )
}

function getRatingTier(rating: number) {
  if (rating >= 90) return 'Platinum'
  if (rating >= 80) return 'Gold'
  if (rating >= 70) return 'Silver'
  return 'Bronze'
}

function tierCardClass(tier: string) {
  if (tier === 'Platinum') return 'border-purple-200/60 bg-gradient-to-br from-zinc-100 via-purple-100 to-sky-100 text-zinc-950'
  if (tier === 'Gold') return 'border-yellow-300/70 bg-gradient-to-br from-yellow-300 via-amber-500 to-orange-700 text-zinc-950'
  if (tier === 'Silver') return 'border-zinc-200/60 bg-gradient-to-br from-zinc-200 via-zinc-400 to-zinc-700 text-zinc-950'
  return 'border-orange-300/60 bg-gradient-to-br from-orange-900 via-amber-700 to-stone-950 text-white'
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isPositiveMessage(value: string) {
  const positiveWords = ['successfully', 'uploaded', 'saved', 'ready', 'selected', 'removed']
  return positiveWords.some((word) => value.toLowerCase().includes(word))
}
