import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ybkgtigbdukdfkexonek.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlia2d0aWdiZHVrZGZrZXhvbmVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMjcxOTMsImV4cCI6MjA4OTcwMzE5M30.uWttArx6bTF3jm8kY_1eiIc_r0P6IhccBJ5Ei_1u0C4'

export const supabase = createClient(supabaseUrl, supabaseKey)