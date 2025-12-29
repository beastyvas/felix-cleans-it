import { supabaseServer } from '@/utils/supabaseServer'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Fetch ALL data using service role (bypasses RLS)
    const [quotes, services, gallery, testimonials, settings] = await Promise.all([
      supabaseServer.from('quote_requests').select('*').order('created_at', { ascending: false }),
      supabaseServer.from('services').select('*').order('created_at', { ascending: true }),
      supabaseServer.from('gallery').select('*').order('created_at', { ascending: false }),
      supabaseServer.from('testimonials').select('*').order('created_at', { ascending: false }),
      supabaseServer.from('settings').select('*').maybeSingle()
    ])

    // Fetch job notes and photos for quotes
    if (quotes.data && quotes.data.length > 0) {
      const quoteIds = quotes.data.map(q => q.id)
      
      const [notes, photos] = await Promise.all([
        supabaseServer.from('job_notes').select('*').in('quote_request_id', quoteIds),
        supabaseServer.from('job_photos').select('*').in('quote_request_id', quoteIds)
      ])

      // Map notes and photos to quotes
      quotes.data = quotes.data.map(q => ({
        ...q,
        savedNotes: (notes.data || []).filter(n => n.quote_request_id === q.id),
        savedPhotos: (photos.data || []).filter(p => p.quote_request_id === q.id)
      }))
    }

    return res.status(200).json({
      quotes: quotes.data || [],
      services: services.data || [],
      gallery: gallery.data || [],
      testimonials: testimonials.data || [],
      settings: settings.data || null
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return res.status(500).json({ error: error.message })
  }
}