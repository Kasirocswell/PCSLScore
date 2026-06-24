'use client'

import React, { useState, useEffect, useRef } from 'react'
import { MapPin, Locate, Loader2 } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'

interface LocationInputClientProps {
  initialValue: string
}

export default function LocationInputClient({ initialValue }: LocationInputClientProps) {
  const [value, setValue] = useState(initialValue)
  const [isDetecting, setIsDetecting] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const hasAutoDetected = useRef(false)

  // Reverse geocodes lat/lon into "City, State"
  const reverseGeocode = async (lat: number, lon: number): Promise<string | null> => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'PCSLScoreMatchSearch/1.0 (contact: support@pcslscore.com)',
          'Accept': 'application/json'
        }
      })
      if (response.ok) {
        const data = await response.json()
        if (data && data.address) {
          const city = data.address.city || data.address.town || data.address.village || data.address.suburb
          const state = data.address.state
          if (city && state) {
            return `${city}, ${state}`
          } else if (data.address.postcode) {
            return data.address.postcode
          }
        }
      }
      return null
    } catch (err) {
      console.error('Reverse geocoding failed:', err)
      return null
    }
  }

  // Primary function to detect and apply location
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported by this browser')
      return
    }

    setIsDetecting(true)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        const locationName = await reverseGeocode(latitude, longitude)
        
        setIsDetecting(false)

        if (locationName) {
          setValue(locationName)
          
          // Construct new search params with 100 miles default radius if no radius is selected
          const currentParams = new URLSearchParams(searchParams.toString())
          currentParams.set('loc', locationName)
          const currentRadius = currentParams.get('radius')
          if (!currentRadius || currentRadius === 'all') {
            currentParams.set('radius', '100') // Default to 100 miles around user
          }
          
          router.push(`/matches?${currentParams.toString()}`)
        }
      },
      (error) => {
        console.error('Geolocation error:', error)
        setIsDetecting(false)
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  // Automatic detection on mount if no initial search location has been made
  useEffect(() => {
    const locInUrl = searchParams.get('loc') || searchParams.get('zip')
    if (!locInUrl && !hasAutoDetected.current) {
      hasAutoDetected.current = true
      handleDetectLocation()
    }
  }, [searchParams])

  // Synchronize input value with prop on query change
  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  return (
    <div className="relative group w-full">
      <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
        <MapPin className="w-4 h-4" />
      </span>
      <input
        type="text"
        name="loc"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="City or ZIP code..."
        className="w-full pl-11 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all text-sm"
      />
      <button
        type="button"
        onClick={handleDetectLocation}
        disabled={isDetecting}
        title="Use my current location"
        className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-500 hover:text-indigo-400 transition-colors disabled:cursor-not-allowed cursor-pointer"
      >
        {isDetecting ? (
          <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
        ) : (
          <Locate className="w-4 h-4 hover:scale-110 transition-transform" />
        )}
      </button>
    </div>
  )
}
