import { supabaseServer } from '@/utils/supabaseServer'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { payload } = req.body

  try {
    console.log('🔧 Save settings API called')
    console.log('📦 Payload:', payload)
    console.log('🔑 Service role key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
    console.log('🌐 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    
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

    console.log('✅ Settings saved successfully:', data)
    return res.status(200).json({ data })
  } catch (error) {
    console.error('💥 Save settings error:', error)
    return res.status(500).json({ error: error.message })
  }
}