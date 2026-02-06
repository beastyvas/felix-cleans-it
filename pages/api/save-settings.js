import { createServerClient } from '@supabase/ssr'
import { parse } from 'cookie'
import { supabaseServer } from '@/utils/supabaseServer'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // ✅ VERIFY AUTH FIRST
    const cookies = parse(req.headers.cookie || '')
    
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get: (name) => cookies[name],
          set: () => {},
          remove: () => {},
        },
      }
    )
    
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { payload } = req.body

    // ✅ Input validation
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'Invalid payload' })
    }

    // Ensure the owner_id matches the authenticated user
    payload.owner_id = user.id

    console.log('🔧 Save settings API called by user:', user.id)
    
    // Use service role to bypass RLS
    const { data, error } = await supabaseServer
      .from('settings')
      .upsert(payload, {
        onConflict: 'owner_id'
      })
      .select('*')
      .single()

    if (error) {
      console.error('❌ Supabase error:', error)
      throw error
    }

    console.log('✅ Settings saved successfully')
    return res.status(200).json({ data })
  } catch (error) {
    console.error('💥 Save settings error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}