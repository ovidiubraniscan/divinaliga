'use client'

import { useEffect, useState, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import NavBar from '@/components/NavBar'
import { supabase } from '@/lib/supabase'

type SavedUser = {
  id: string
  username: string
  pin: string
  display_name: string | null
}

export default function EditProfile() {
  const router = useRouter()

  const [user, setUser] = useState<SavedUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')

  const [displayName, setDisplayName] = useState('')
  const [nickname, setNickname] = useState('')
  const [nationality, setNationality] = useState('')
  const [languageSpoken, setLanguageSpoken] = useState('')
  const [preferredFoot, setPreferredFoot] = useState('')
  const [playstyle, setPlaystyle] = useState('')
  const [profileImageUrl, setProfileImageUrl] = useState('')

  useEffect(() => {
    const loadProfile = async () => {
      const savedUser = localStorage.getItem('divina_user')

      if (!savedUser) {
        router.push('/login')
        return
      }

      const parsedUser: SavedUser = JSON.parse(savedUser)
      setUser(parsedUser)

      const { data, error } = await supabase
        .from('users')
        .select(
          'id, username, display_name, nickname, nationality, language_spoken, preferred_foot, playstyle, profile_image_url'
        )
        .eq('id', parsedUser.id)
        .single()

      if (error) {
        setMessage(error.message)
        setLoading(false)
        return
      }

      setDisplayName(data.display_name || '')
      setNickname(data.nickname || '')
      setNationality(data.nationality || '')
      setLanguageSpoken(data.language_spoken || '')
      setPreferredFoot(data.preferred_foot || '')
      setPlaystyle(data.playstyle || '')
      setProfileImageUrl(data.profile_image_url || '')
      setLoading(false)
    }

    loadProfile()
  }, [router])

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!user) return

    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setMessage('')

    const fileExt = file.name.split('.').pop()
    const filePath = `${user.id}-${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('profile-images')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      setMessage(uploadError.message)
      setUploading(false)
      return
    }

    const { data } = supabase.storage
      .from('profile-images')
      .getPublicUrl(filePath)

    setProfileImageUrl(data.publicUrl)
    setUploading(false)
    setMessage('Image uploaded successfully. Click Save Profile.')
  }

  const handleSave = async () => {
    if (!user) return

    setSaving(true)
    setMessage('')

    const { error } = await supabase
      .from('users')
      .update({
        display_name: displayName,
        nickname,
        nationality,
        language_spoken: languageSpoken,
        preferred_foot: preferredFoot,
        playstyle,
        profile_image_url: profileImageUrl,
      })
      .eq('id', user.id)

    if (error) {
      setMessage(error.message)
      setSaving(false)
      return
    }

    const updatedLocalUser = {
      ...user,
      display_name: displayName,
    }

    localStorage.setItem('divina_user', JSON.stringify(updatedLocalUser))

    setMessage('Profile updated successfully')
    setSaving(false)
  }

  return (
    <>
      <NavBar />

      <main
        style={{
          minHeight: '100vh',
          background: '#0B0B0C',
          color: '#F5F5F4',
          padding: '24px',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div style={{ maxWidth: '420px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#E85D04' }}>
            Edit Profile
          </h1>

          {loading ? (
            <p style={{ marginTop: '20px' }}>Loading profile...</p>
          ) : (
            <div style={{ marginTop: '20px' }}>
              {profileImageUrl && (
                <img
                  src={profileImageUrl}
                  alt="Profile"
                  style={{
                    width: '110px',
                    height: '110px',
                    objectFit: 'cover',
                    borderRadius: '50%',
                    display: 'block',
                    marginBottom: '16px',
                    border: '2px solid #2A2D31',
                  }}
                />
              )}

              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ marginBottom: '16px', color: 'white' }}
              />

              <input
                placeholder="Display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                style={inputStyle}
              />

              <input
                placeholder="Nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                style={inputStyle}
              />

              <input
                placeholder="Nationality"
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                style={inputStyle}
              />

              <input
                placeholder="Language spoken"
                value={languageSpoken}
                onChange={(e) => setLanguageSpoken(e.target.value)}
                style={inputStyle}
              />

              <select
                value={preferredFoot}
                onChange={(e) => setPreferredFoot(e.target.value)}
                style={inputStyle}
              >
                <option value="">Preferred foot</option>
                <option value="Right">Right</option>
                <option value="Left">Left</option>
                <option value="Both">Both</option>
              </select>

              <textarea
                placeholder="Playstyle"
                value={playstyle}
                onChange={(e) => setPlaystyle(e.target.value)}
                style={{
                  ...inputStyle,
                  minHeight: '100px',
                  resize: 'vertical',
                }}
              />

              <button onClick={handleSave} style={buttonStyle} disabled={saving || uploading}>
                {saving ? 'Saving...' : uploading ? 'Uploading...' : 'Save Profile'}
              </button>

              {message && (
                <p
                  style={{
                    marginTop: '12px',
                    color: message.includes('successfully') ? '#36D399' : '#F87272',
                  }}
                >
                  {message}
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  )
}

const inputStyle = {
  width: '100%',
  padding: '12px',
  marginBottom: '12px',
  borderRadius: '10px',
  border: '1px solid #2A2D31',
  background: '#15171A',
  color: 'white',
}

const buttonStyle = {
  width: '100%',
  padding: '12px',
  background: '#E85D04',
  border: 'none',
  borderRadius: '10px',
  color: 'white',
  fontWeight: 'bold',
  cursor: 'pointer',
}