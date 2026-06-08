import { createClient } from '@supabase/supabase-js'
import LocationsClient from './LocationsClient'
import type { Location } from '@/lib/types'

async function getLocations(): Promise<Location[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data } = await supabase
    .from('locations')
    .select('*')
    .order('created_at', { ascending: false })
  return (data ?? []) as Location[]
}

export default async function LocationsPage() {
  const locations = await getLocations()
  return <LocationsClient initialLocations={locations} />
}
