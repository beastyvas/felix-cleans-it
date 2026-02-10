import { supabaseServer } from '@/utils/supabaseServer'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // ✅ Get the auth token from the request headers
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized - No token provided' })
    }

    const token = authHeader.replace('Bearer ', '')

    // Verify the token with Supabase
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return res.status(401).json({ error: 'Unauthorized - Invalid token' })
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