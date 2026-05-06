'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import NavBar from '@/components/NavBar'
import { supabase } from '@/lib/supabase'

type PlayerProfile = {
  id: string
  auth_user_id: string | null
  nickname: string
  player_number: number | null
  rating: number
  profile_picture_url: string | null
  preferred_foot: 'Right' | 'Left' | 'Both' | null
  main_position: string | null
  secondary_positions: string[] | null
  games_played: number
  goals: number
  assists: number
  created_at?: string
}

const POSITIONS = ['Goalkeeper', 'Defender', 'Midfield', 'Attacker']
const FEET = ['Right', 'Left', 'Both'] as const

export default function Profile() {
  const router = useRouter()

  const [profile, setProfile] = useState<PlayerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const [nickname, setNickname] = useState('')
  const [playerNumber, setPlayerNumber] = useState('')
  const [profilePictureUrl, setProfilePictureUrl] = useState('')
  const [preferredFoot, setPreferredFoot] = useState<'Right' | 'Left' | 'Both'>('Right')
  const [mainPosition, setMainPosition] = useState('Midfield')
  const [secondaryPositions, setSecondaryPositions] = useState<string[]>([])

  const ratingTier = useMemo(() => getRatingTier(profile?.rating ?? 50), [profile?.rating])

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    setLoading(true)
    setErrorMessage('')

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      router.push('/login')
      return
    }

    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (error) {
      setErrorMessage(error.message)
      setLoading(false)
      return
    }

    if (!data) {
      setErrorMessage('No player profile found. Please register again or create your player profile.')
      setLoading(false)
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
    setLoading(false)
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

    setProfile(data as PlayerProfile)
    setMessage('Profile updated successfully.')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
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

  return (
    <>
      <NavBar />

      <main className="min-h-screen bg-[#07090d] px-4 py-6 text-white">
        <div className="mx-auto max-w-md space-y-5">
          <header className="space-y-1 text-center">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-orange-400">Divina Liga</p>
            <h1 className="text-3xl font-black">Player Profile</h1>
            <p className="text-sm text-slate-400">Your player card used for check-in, teams and future voting.</p>
          </header>

          {loading ? (
            <section className="rounded-3xl border border-slate-800 bg-slate-950 p-5 text-center text-slate-300">
              Loading profile...
            </section>
          ) : errorMessage && !profile ? (
            <section className="rounded-3xl border border-red-500/40 bg-red-500/10 p-5 text-center text-red-200">
              <p className="font-bold">{errorMessage}</p>
              <button
                onClick={() => router.push('/register')}
                className="mt-4 w-full rounded-2xl bg-orange-500 px-4 py-3 font-black text-orange-950"
              >
                Go to Register
              </button>
            </section>
          ) : profile ? (
            <>
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
                      className="h-32 w-32 rounded-full border-4 border-white/30 object-cover shadow-xl"
                    />
                  ) : (
                    <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-white/20 bg-black/25 text-5xl font-black">
                      {profile.nickname?.charAt(0)?.toUpperCase() || 'P'}
                    </div>
                  )}
                </div>

                <div className="mt-5 text-center">
                  <h2 className="text-2xl font-black uppercase tracking-wide">{profile.nickname}</h2>
                  <p className="mt-1 text-sm font-bold opacity-90">{profile.preferred_foot || 'Right'} foot</p>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-2xl bg-black/20 p-3">
                    <p className="text-xs font-bold opacity-70">GP</p>
                    <p className="text-xl font-black">{profile.games_played}</p>
                  </div>
                  <div className="rounded-2xl bg-black/20 p-3">
                    <p className="text-xs font-bold opacity-70">G</p>
                    <p className="text-xl font-black">{profile.goals}</p>
                  </div>
                  <div className="rounded-2xl bg-black/20 p-3">
                    <p className="text-xs font-bold opacity-70">A</p>
                    <p className="text-xl font-black">{profile.assists}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-800 bg-slate-950 p-5 shadow-xl">
                <h2 className="text-xl font-black">Edit Card Details</h2>

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
                    <span className="text-sm font-bold text-slate-300">Profile picture URL</span>
                    <input
                      value={profilePictureUrl}
                      onChange={(event) => setProfilePictureUrl(event.target.value)}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-orange-400"
                      placeholder="https://..."
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-bold text-slate-300">Preferred foot</span>
                    <select
                      value={preferredFoot}
                      onChange={(event) => setPreferredFoot(event.target.value as 'Right' | 'Left' | 'Both')}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-orange-400"
                    >
                      {FEET.map((foot) => (
                        <option key={foot} value={foot}>{foot}</option>
                      ))}
                    </select>
                  </label>

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

                  {message && <p className="rounded-2xl bg-emerald-500/10 p-3 text-sm font-bold text-emerald-300">{message}</p>}
                  {errorMessage && <p className="rounded-2xl bg-red-500/10 p-3 text-sm font-bold text-red-300">{errorMessage}</p>}

                  <button
                    onClick={saveProfile}
                    disabled={saving}
                    className="w-full rounded-2xl bg-orange-500 px-5 py-4 font-black text-orange-950 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Profile'}
                  </button>

                  <button
                    onClick={handleLogout}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-5 py-4 font-black text-white"
                  >
                    Log out
                  </button>
                </div>
              </section>
            </>
          ) : null}
        </div>
      </main>
    </>
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
