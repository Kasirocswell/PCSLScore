/**
 * Geocoding and distance utilities using OpenStreetMap Nominatim and the Haversine formula.
 */

interface GeocodeResult {
  lat: number
  lon: number
}

/**
 * Geocodes an address query (ZIP code or City/State name) into latitude and longitude coordinates
 * using the keyless public OpenStreetMap Nominatim API.
 * 
 * @param query The ZIP code or City/State name (e.g. "Houston" or "80302")
 * @returns An object with lat and lon, or null if geocoding fails.
 */
export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  if (!query || query.trim() === '') {
    return null
  }

  const sanitizedQuery = query.trim()

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${encodeURIComponent(sanitizedQuery)}`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'PCSLScoreMatchSearch/1.0 (contact: support@pcslscore.com; academic/development use)',
        'Accept': 'application/json'
      },
      // Short cache or revalidation if required, but default fetch is fine
      next: { revalidate: 86400 } // Cache results for 24 hours
    })

    if (!response.ok) {
      console.error(`Geocoding error: Nominatim returned status ${response.status} for query "${sanitizedQuery}"`)
      return null
    }

    const data = await response.json()

    if (Array.isArray(data) && data.length > 0) {
      const firstResult = data[0]
      const lat = parseFloat(firstResult.lat)
      const lon = parseFloat(firstResult.lon)

      if (!isNaN(lat) && !isNaN(lon)) {
        return { lat, lon }
      }
    }

    return null
  } catch (error) {
    console.error(`Geocoding failure for query "${sanitizedQuery}":`, error)
    return null
  }
}

/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula (returned in miles).
 * 
 * @param lat1 Latitude of point 1
 * @param lon1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lon2 Longitude of point 2
 * @returns The distance in miles
 */
export function getDistanceInMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3958.8 // Radius of Earth in miles

  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180

  const rLat1 = (lat1 * Math.PI) / 180
  const rLat2 = (lat2 * Math.PI) / 180

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}
