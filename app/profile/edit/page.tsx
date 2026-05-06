'use client'

import { ChangeEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import NavBar from '@/components/NavBar'
import { supabase } from '@/lib/supabase'

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

const POSITION_OPTIONS = ['Goalkeeper', 'Defender', 'Midfield', 'Attacker']

export default function EditProfile() {
  const router = useRouter()

  const [player, setPlayer] = useState<PlayerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')

  const [nickname, setNickname] = useState('')
  const [playerNumber, setPlayerNumber] = useState('')
  const [profileImageUrl, setProfileImageUrl] = useState('')
  const [preferredFoot, setPreferredFoot] = useState<PreferredFoot>('')
  const [mainPosition, setMainPosition] = useState('')
  const [secondaryPositions, setSecondaryPositions] = useState<string[]>([])

  useEffect(() => {
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
      setLoading(false)
    }

    loadProfile()
  }, [router])

  const ratingTier = getRatingTier(player?.rating || 50)

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!player) return

    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setMessage('')

    const fileExt = file.name.split('.').pop() || 'jpg'
    const cleanUsername = player.username.replace(/[^a-zA-Z0-9_-]/g, '')
    const filePath = `${player.id}/${cleanUsername}-${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('profile-images')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      setMessage(uploadError.message)
      setUploading(false)
      return
    }

    const { data } = supabase.storage.from('profile-images').getPublicUrl(filePath)

    setProfileImageUrl(data.publicUrl)
    setUploading(false)
    setMessage('Image uploaded. Press Save Profile to keep it.')
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

  const logout = () => {
    localStorage.removeItem('divina_player')
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
            <h1 className="text-3xl font-black">Edit Player Profile</h1>
            <p className="text-sm text-zinc-400">
              Update your player card details used for check-in and match day teams.
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
                      className="h-32 w-32 rounded-full border-4 border-white/30 object-cover shadow-xl"
                    />
                  ) : (
                    <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-white/20 bg-black/30 text-5xl">
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

              <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-xl">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black">Profile Details</h2>
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
                  <span className="mb-1 block text-xs font-black uppercase tracking-widest text-zinc-400">Profile Picture</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-zinc-300"
                  />
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

                {message && (
                  <p className={`mt-4 rounded-2xl p-3 text-sm font-bold ${message.includes('successfully') || message.includes('uploaded') || message.includes('Image uploaded') ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'}`}>
                    {message}
                  </p>
                )}
              </section>
            </>
          )}
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

function tierCardClass(tier: string) {
  if (tier === 'Platinum') return 'border-purple-200/60 bg-gradient-to-br from-zinc-100 via-purple-100 to-sky-100 text-zinc-950'
  if (tier === 'Gold') return 'border-yellow-300/70 bg-gradient-to-br from-yellow-300 via-amber-500 to-orange-700 text-zinc-950'
  if (tier === 'Silver') return 'border-zinc-200/60 bg-gradient-to-br from-zinc-200 via-zinc-400 to-zinc-700 text-zinc-950'
  return 'border-orange-300/60 bg-gradient-to-br from-orange-900 via-amber-700 to-stone-950 text-white'
}
