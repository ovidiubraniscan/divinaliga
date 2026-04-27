'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import NavBar from '@/components/NavBar'
import { supabase } from '@/lib/supabase'

type SavedUser = {
  id: string
  username: string
  pin: string
  display_name: string | null
}

type ProfileRow = {
  id: string
  username: string
  display_name: string | null
  nickname: string | null
  nationality: string | null
  language_spoken: string | null
  preferred_foot: string | null
  playstyle: string | null
  profile_image_url: string | null
}

export default function Profile() {
  const router = useRouter()
  const [user, setUser] = useState<SavedUser | null>(null)
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [loading, setLoading] = useState(true)

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

      if (!error) {
        setProfile(data)
      }

      setLoading(false)
    }

    loadProfile()
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('divina_user')
    router.push('/login')
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
            Profile
          </h1>

          {loading ? (
            <p style={{ marginTop: '20px' }}>Loading profile...</p>
          ) : (
            <>
                {profile?.profile_image_url && (
      <img
        src={profile.profile_image_url}
        alt="Profile"
        style={{
          width: '120px',
          height: '120px',
          objectFit: 'cover',
          borderRadius: '50%',
          display: 'block',
          margin: '20px auto',
          border: '2px solid #2A2D31',
        }}
      />
    )}

    <div
      style={{
        marginTop: '20px',
        background: '#15171A',
        border: '1px solid #2A2D31',
        borderRadius: '14px',
        padding: '16px',
      }}
    ></div>
              <div
                style={{
                  marginTop: '20px',
                  background: '#15171A',
                  border: '1px solid #2A2D31',
                  borderRadius: '14px',
                  padding: '16px',
                }}
              >
                <p><strong>Username:</strong> {profile?.username}</p>
                <p style={{ marginTop: '10px' }}>
                  <strong>Display name:</strong> {profile?.display_name || 'Not set'}
                </p>
                <p style={{ marginTop: '10px' }}>
                  <strong>Nickname:</strong> {profile?.nickname || 'Not set'}
                </p>
                <p style={{ marginTop: '10px' }}>
                  <strong>Nationality:</strong> {profile?.nationality || 'Not set'}
                </p>
                <p style={{ marginTop: '10px' }}>
                  <strong>Language:</strong> {profile?.language_spoken || 'Not set'}
                </p>
                <p style={{ marginTop: '10px' }}>
                  <strong>Preferred foot:</strong> {profile?.preferred_foot || 'Not set'}
                </p>
                <p style={{ marginTop: '10px' }}>
                  <strong>Playstyle:</strong> {profile?.playstyle || 'Not set'}
                </p>
              </div>

              <Link href="/profile/edit" style={buttonStyle}>
                Edit Profile
              </Link>

              <button onClick={handleLogout} style={logoutButtonStyle}>
                Log out
              </button>
            </>
          )}
        </div>
      </main>
    </>
  )
}

const buttonStyle = {
  display: 'block',
  width: '100%',
  padding: '12px',
  background: '#E85D04',
  border: 'none',
  borderRadius: '10px',
  color: 'white',
  fontWeight: 'bold',
  cursor: 'pointer',
  marginTop: '16px',
  textAlign: 'center' as const,
  textDecoration: 'none',
}

const logoutButtonStyle = {
  width: '100%',
  padding: '12px',
  background: '#1C1F23',
  border: '1px solid #2A2D31',
  borderRadius: '10px',
  color: 'white',
  fontWeight: 'bold',
  cursor: 'pointer',
  marginTop: '12px',
}