'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import NavBar from '@/components/NavBar'
import { supabase } from '@/lib/supabase'
import { Html5Qrcode } from 'html5-qrcode'

type PreferredFoot = 'Right' | 'Left' | 'Both'

type PlayerProfile = {
  id: string
  username: string | null
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

type RatingHistoryItem = {
  id: string
  old_rating: number | null
  new_rating: number
  reason: string | null
  match_label: string | null
  created_at: string
}

type PlayerTicket = {
  id: string
  player_id: string
  ticket_code: string
  is_used: boolean
  used_at: string | null
  created_at: string
}

const POSITIONS = ['Goalkeeper', 'Defender', 'Midfield', 'Attacker']
const FEET: PreferredFoot[] = ['Right', 'Left', 'Both']

export default function Profile() {
  const router = useRouter()
  const scannerRef = useRef<Html5Qrcode | null>(null)

  const [profile, setProfile] = useState<PlayerProfile | null>(null)
  const [ratingHistory, setRatingHistory] = useState<RatingHistoryItem[]>([])
  const [tickets, setTickets] = useState<PlayerTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [manualTicket, setManualTicket] = useState('')
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const [nickname, setNickname] = useState('')
  const [playerNumber, setPlayerNumber] = useState('')
  const [profilePictureUrl, setProfilePictureUrl] = useState('')
  const [preferredFoot, setPreferredFoot] = useState<PreferredFoot>('Right')
  const [mainPosition, setMainPosition] = useState('Midfield')
  const [secondaryPositions, setSecondaryPositions] = useState<string[]>([])

  const ratingTier = useMemo(() => getRatingTier(profile?.rating ?? 50), [profile?.rating])
  const availableTickets = useMemo(() => tickets.filter((ticket) => !ticket.is_used), [tickets])
  const usedTickets = useMemo(() => tickets.filter((ticket) => ticket.is_used), [tickets])

  useEffect(() => {
    loadProfileFromLocalStorage()

    return () => {
      stopScanner()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadProfileFromLocalStorage = async () => {
    setLoading(true)
    setErrorMessage('')

    const savedPlayer = localStorage.getItem('divina_player')

    if (!savedPlayer) {
      router.push('/login')
      return
    }

    try {
      const parsedPlayer = JSON.parse(savedPlayer) as PlayerProfile

      if (!parsedPlayer?.id) {
        localStorage.removeItem('divina_player')
        router.push('/login')
        return
      }

      await refreshProfile(parsedPlayer.id)
    } catch {
      localStorage.removeItem('divina_player')
      router.push('/login')
    }
  }

  const refreshProfile = async (playerId: string) => {
    setErrorMessage('')

    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .maybeSingle()

    if (error) {
      setErrorMessage(error.message)
      setLoading(false)
      return
    }

    if (!data) {
      localStorage.removeItem('divina_player')
      router.push('/login')
      return
    }

    const player = data as PlayerProfile
    setProfile(player)
    setNickname(player.nickname || '')
    setPlayerNumber(player.player_number ? String(player.player_number) : '')
    setProfilePictureUrl(player.profile_picture_url || '')
    setPreferredFoot(player.preferred_foot || 'Right')
    setMainPosition(player.main_position || 'Midfield')
    setSecondaryPositions(player.secondary_positions || [])
    localStorage.setItem('divina_player', JSON.stringify(player))

    await Promise.all([loadRatingHistory(player.id), loadTickets(player.id)])
    setLoading(false)
  }

  const loadRatingHistory = async (playerId: string) => {
    const { data, error } = await supabase
      .from('rating_history')
      .select('*')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (!error && data) {
      setRatingHistory(data as RatingHistoryItem[])
    }
  }

  const loadTickets = async (playerId: string) => {
    const { data, error } = await supabase
      .from('player_tickets')
      .select('*')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setTickets(data as PlayerTicket[])
    }
  }

  const saveProfile = async () => {
    if (!profile) return

    const cleanNickname = nickname.trim()
    if (!cleanNickname) {
      setErrorMessage('Nickname is required.')
      return
    }

    const parsedNumber = playerNumber.trim() ? Number(playerNumber) : null
    if (parsedNumber !== null && (!Number.isInteger(parsedNumber) || parsedNumber < 1 || parsedNumber > 999)) {
      setErrorMessage('Player number must be between 1 and 999.')
      return
    }

    setSaving(true)
    setMessage('')
    setErrorMessage('')

    const { data, error } = await supabase
      .from('players')
      .update({
        nickname: cleanNickname,
        player_number: parsedNumber,
        profile_picture_url: profilePictureUrl.trim() || null,
        preferred_foot: preferredFoot,
        main_position: mainPosition,
        secondary_positions: secondaryPositions,
      })
      .eq('id', profile.id)
      .select('*')
      .single()

    setSaving(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    const updatedPlayer = data as PlayerProfile
    setProfile(updatedPlayer)
    localStorage.setItem('divina_player', JSON.stringify(updatedPlayer))
    setMessage('Profile saved online and refreshed on this device.')
  }

  const uploadProfileImage = async (file: File) => {
    if (!profile) return

    setUploading(true)
    setMessage('')
    setErrorMessage('')

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png'
    const fileName = `${profile.id}-${Date.now()}.${fileExt}`
    const filePath = `players/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('profile-images')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      setUploading(false)
      setErrorMessage(uploadError.message)
      return
    }

    const { data: publicUrlData } = supabase.storage
      .from('profile-images')
      .getPublicUrl(filePath)

    const publicUrl = publicUrlData.publicUrl
    setProfilePictureUrl(publicUrl)

    const { data, error } = await supabase
      .from('players')
      .update({ profile_picture_url: publicUrl })
      .eq('id', profile.id)
      .select('*')
      .single()

    setUploading(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    const updatedPlayer = data as PlayerProfile
    setProfile(updatedPlayer)
    localStorage.setItem('divina_player', JSON.stringify(updatedPlayer))
    setMessage('Profile picture uploaded and saved.')
  }

  const startScanner = async () => {
    setMessage('')
    setErrorMessage('')
    setScannerOpen(true)

    try {
      const scanner = new Html5Qrcode('profile-ticket-reader')
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (decodedText: string) => {
          await stopScanner()
          await saveTicket(decodedText)
        },
        undefined
      )
    } catch (error) {
      setScannerOpen(false)
      setErrorMessage(error instanceof Error ? error.message : 'Camera could not start.')
    }
  }

  const stopScanner = async () => {
    const scanner = scannerRef.current
    if (scanner) {
      try {
        const state = scanner.getState()
        if (state === 2) {
          await scanner.stop()
        }
        await scanner.clear()
      } catch {
        // Ignore scanner cleanup errors.
      }
    }
    scannerRef.current = null
    setScannerOpen(false)
  }

  const saveTicket = async (rawTicket: string) => {
    if (!profile) return

    const ticketCode = rawTicket.trim().toUpperCase()
    if (!ticketCode) {
      setErrorMessage('Ticket code is empty.')
      return
    }

    setMessage('')
    setErrorMessage('')

    const { data, error } = await supabase
      .from('player_tickets')
      .insert({
        player_id: profile.id,
        ticket_code: ticketCode,
        is_used: false,
      })
      .select('*')
      .single()

    if (error) {
      if (error.message.toLowerCase().includes('duplicate')) {
        localStorage.setItem('divina_selected_ticket', ticketCode)
        setMessage('This ticket is already saved. It is now selected for check-in.')
        return
      }
      setErrorMessage(error.message)
      return
    }

    localStorage.setItem('divina_selected_ticket', ticketCode)
    setTickets((current) => [data as PlayerTicket, ...current])
    setManualTicket('')
    setMessage('Ticket saved and selected for check-in.')
  }

  const selectTicketForCheckIn = (ticketCode: string) => {
    localStorage.setItem('divina_selected_ticket', ticketCode)
    setMessage(`${ticketCode} is selected for your next check-in.`)
  }

  const handleLogout = () => {
    localStorage.removeItem('divina_player')
    localStorage.removeItem('divina_selected_ticket')
    router.push('/login')
  }

  const toggleSecondaryPosition = (position: string) => {
    setSecondaryPositions((current) => {
      if (current.includes(position)) {
        return current.filter((item) => item !== position)
      }
      return [...current, position]
    })
  }

  if (loading) {
    return (
      <>
        <NavBar />
        <main className="min-h-screen bg-[#07090d] px-4 py-6 text-white">
          <section className="mx-auto max-w-md rounded-3xl border border-slate-800 bg-slate-950 p-5 text-center text-slate-300">
            Loading profile...
          </section>
        </main>
      </>
    )
  }

  if (!profile) {
    return (
      <>
        <NavBar />
        <main className="min-h-screen bg-[#07090d] px-4 py-6 text-white">
          <section className="mx-auto max-w-md rounded-3xl border border-red-500/40 bg-red-500/10 p-5 text-center text-red-200">
            <p className="font-bold">No player profile found.</p>
            <button
              onClick={() => router.push('/login')}
              className="mt-4 w-full rounded-2xl bg-orange-500 px-4 py-3 font-black text-orange-950"
            >
              Go to Login
            </button>
          </section>
        </main>
      </>
    )
  }

  return (
    <>
      <NavBar />

      <main className="min-h-screen bg-[#07090d] px-4 py-6 text-white">
        <div className="mx-auto max-w-md space-y-5">
          <header className="space-y-1 text-center">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-orange-400">Divina Liga</p>
            <h1 className="text-3xl font-black">Player Profile</h1>
            <p className="text-sm text-slate-400">Your player card, stats, tickets and match identity.</p>
          </header>

          <section className={`rounded-[2rem] border p-5 shadow-2xl ${getTierCardClass(ratingTier)}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-5xl font-black leading-none">{profile.rating}</p>
                <p className="mt-1 text-xs font-black uppercase tracking-[0.25em]">{ratingTier}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-black">#{profile.player_number || '--'}</p>
                <p className="text-xs uppercase tracking-widest opacity-80">{profile.main_position || 'Position'}</p>
              </div>
            </div>

            <div className="mt-5 flex justify-center">
              {profile.profile_picture_url ? (
                <img
                  src={profile.profile_picture_url}
                  alt={profile.nickname}
                  className="h-36 w-36 rounded-full border-4 border-white/30 bg-black/20 object-cover shadow-xl"
                />
              ) : (
                <div className="flex h-36 w-36 items-center justify-center rounded-full border-4 border-white/20 bg-black/25 text-5xl font-black">
                  {profile.nickname?.charAt(0)?.toUpperCase() || 'P'}
                </div>
              )}
            </div>

            <div className="mt-5 text-center">
              <h2 className="text-2xl font-black uppercase tracking-wide">{profile.nickname}</h2>
              <p className="mt-1 text-sm font-bold opacity-90">@{profile.username || 'player'} · {profile.preferred_foot || 'Right'} foot</p>
              <p className="mt-2 text-xs font-bold opacity-80">
                {[profile.main_position, ...(profile.secondary_positions || [])].filter(Boolean).join(' / ') || 'No positions selected'}
              </p>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <StatBox label="GP" value={profile.games_played} />
              <StatBox label="Goals" value={profile.goals} />
              <StatBox label="Assists" value={profile.assists} />
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-950 p-5 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">Edit Details</h2>
                <p className="text-xs text-slate-400">Update the choices you made during registration.</p>
              </div>
              <button
                onClick={() => router.push('/edit-profile')}
                className="rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-black text-white"
              >
                Full Edit
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-300">Nickname</span>
                <input
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-orange-400"
                  placeholder="Your nickname"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-2">
                  <span className="text-sm font-bold text-slate-300">Player number</span>
                  <input
                    value={playerNumber}
                    onChange={(event) => setPlayerNumber(event.target.value.replace(/\D/g, ''))}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-orange-400"
                    placeholder="10"
                    inputMode="numeric"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-bold text-slate-300">Foot</span>
                  <select
                    value={preferredFoot}
                    onChange={(event) => setPreferredFoot(event.target.value as PreferredFoot)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-orange-400"
                  >
                    {FEET.map((foot) => (
                      <option key={foot} value={foot}>{foot}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-300">Main position</span>
                <select
                  value={mainPosition}
                  onChange={(event) => setMainPosition(event.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-orange-400"
                >
                  {POSITIONS.map((position) => (
                    <option key={position} value={position}>{position}</option>
                  ))}
                </select>
              </label>

              <div className="space-y-2">
                <p className="text-sm font-bold text-slate-300">Secondary positions</p>
                <div className="grid grid-cols-2 gap-2">
                  {POSITIONS.map((position) => {
                    const active = secondaryPositions.includes(position)
                    return (
                      <button
                        key={position}
                        type="button"
                        onClick={() => toggleSecondaryPosition(position)}
                        className={`rounded-2xl border px-3 py-3 text-sm font-black ${
                          active
                            ? 'border-emerald-300 bg-emerald-400 text-emerald-950'
                            : 'border-slate-700 bg-slate-900 text-slate-300'
                        }`}
                      >
                        {position}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-bold text-slate-300">Portrait profile picture</p>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) uploadProfileImage(file)
                  }}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300 file:mr-3 file:rounded-xl file:border-0 file:bg-orange-500 file:px-3 file:py-2 file:font-black file:text-orange-950"
                />
                <p className="text-xs text-slate-500">PNG is best if you want a transparent background.</p>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-300">Or paste profile picture URL</span>
                <input
                  value={profilePictureUrl}
                  onChange={(event) => setProfilePictureUrl(event.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-orange-400"
                  placeholder="https://..."
                />
              </label>

              <button
                onClick={saveProfile}
                disabled={saving || uploading}
                className="w-full rounded-2xl bg-orange-500 px-5 py-4 font-black text-orange-950 disabled:opacity-50"
              >
                {saving ? 'Saving...' : uploading ? 'Uploading...' : 'Save Profile'}
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-950 p-5 shadow-xl">
            <h2 className="text-xl font-black">Saved Tickets</h2>
            <p className="mt-1 text-xs text-slate-400">Scan your ticket once here. Then it is ready for the check-in page.</p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={scannerOpen ? stopScanner : startScanner}
                className="rounded-2xl bg-sky-500 px-4 py-3 font-black text-sky-950"
              >
                {scannerOpen ? 'Stop Scan' : 'Scan Ticket'}
              </button>
              <button
                onClick={() => {
                  const code = manualTicket.trim()
                  if (code) saveTicket(code)
                }}
                className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 font-black text-white"
              >
                Add Code
              </button>
            </div>

            <input
              value={manualTicket}
              onChange={(event) => setManualTicket(event.target.value)}
              className="mt-3 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-sky-400"
              placeholder="Manual ticket code, e.g. TCK-839201"
            />

            {scannerOpen && (
              <div className="mt-4 overflow-hidden rounded-3xl bg-black p-2">
                <div id="profile-ticket-reader" />
              </div>
            )}

            <div className="mt-4 space-y-2">
              {availableTickets.length ? (
                availableTickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    onClick={() => selectTicketForCheckIn(ticket.ticket_code)}
                    className="w-full rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-left"
                  >
                    <p className="font-black text-emerald-300">{ticket.ticket_code}</p>
                    <p className="text-xs text-slate-400">Tap to use this ticket for check-in</p>
                  </button>
                ))
              ) : (
                <p className="rounded-2xl border border-slate-800 bg-slate-900 p-3 text-sm text-slate-400">No saved active tickets yet.</p>
              )}
            </div>

            {usedTickets.length > 0 && (
              <details className="mt-3 rounded-2xl border border-slate-800 bg-slate-900 p-3">
                <summary className="cursor-pointer text-sm font-black text-slate-300">Used tickets</summary>
                <div className="mt-3 space-y-2">
                  {usedTickets.map((ticket) => (
                    <div key={ticket.id} className="rounded-xl bg-slate-950 p-3 text-xs text-slate-400">
                      <p className="font-bold text-slate-300">{ticket.ticket_code}</p>
                      <p>{ticket.used_at ? new Date(ticket.used_at).toLocaleString() : 'Used'}</p>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-950 p-5 shadow-xl">
            <h2 className="text-xl font-black">Rating History</h2>
            <p className="mt-1 text-xs text-slate-400">This will show rating changes from MVP voting and admin updates.</p>

            <div className="mt-4 space-y-2">
              {ratingHistory.length ? (
                ratingHistory.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-black">
                        {item.old_rating ?? '--'} → {item.new_rating}
                      </p>
                      <p className="text-xs text-slate-500">{new Date(item.created_at).toLocaleDateString()}</p>
                    </div>
                    <p className="mt-1 text-sm text-slate-300">{item.reason || 'Rating update'}</p>
                    {item.match_label && <p className="mt-1 text-xs text-orange-300">{item.match_label}</p>}
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-slate-800 bg-slate-900 p-3 text-sm text-slate-400">No rating changes yet.</p>
              )}
            </div>
          </section>

          {message && <p className="rounded-2xl bg-emerald-500/10 p-3 text-sm font-bold text-emerald-300">{message}</p>}
          {errorMessage && <p className="rounded-2xl bg-red-500/10 p-3 text-sm font-bold text-red-300">{errorMessage}</p>}

          <button
            onClick={() => router.push('/check-in')}
            className="w-full rounded-2xl bg-emerald-500 px-5 py-4 font-black text-emerald-950"
          >
            Go to Check-In
          </button>

          <button
            onClick={handleLogout}
            className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-5 py-4 font-black text-white"
          >
            Log out
          </button>
        </div>
      </main>
    </>
  )
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-black/20 p-3">
      <p className="text-xs font-bold opacity-70">{label}</p>
      <p className="text-xl font-black">{value}</p>
    </div>
  )
}

function getRatingTier(rating: number) {
  if (rating >= 90) return 'Platinum'
  if (rating >= 80) return 'Gold'
  if (rating >= 70) return 'Silver'
  return 'Bronze'
}

function getTierCardClass(tier: string) {
  if (tier === 'Platinum') return 'border-violet-200 bg-gradient-to-br from-slate-100 via-violet-100 to-sky-200 text-slate-950'
  if (tier === 'Gold') return 'border-yellow-300 bg-gradient-to-br from-yellow-200 via-amber-400 to-yellow-700 text-yellow-950'
  if (tier === 'Silver') return 'border-slate-300 bg-gradient-to-br from-slate-200 via-slate-400 to-slate-700 text-slate-950'
  return 'border-orange-400 bg-gradient-to-br from-orange-300 via-amber-700 to-stone-900 text-white'
}
