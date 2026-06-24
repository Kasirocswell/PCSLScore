'use client'

import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface MatchWithClub {
  id: string
  name: string
  date: string
  location: string
  match_type: string
  price: number
  payment_required: boolean
  clubs: {
    id: string
    name: string
    latitude: number | null
    longitude: number | null
  } | null
}

interface MatchMapProps {
  matches: MatchWithClub[]
  searchCoords?: { lat: number; lon: number } | null
  searchRadius?: string | null
}

export default function MatchMap({ matches, searchCoords, searchRadius }: MatchMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerGroupRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    if (!mapContainerRef.current) return

    // Standard center is Boulder, CO if no search coords, or US geographic center
    const defaultLat = 39.8283
    const defaultLon = -98.5795
    const defaultZoom = 4

    // Initialize Leaflet Map
    const map = L.map(mapContainerRef.current, {
      zoomControl: false // We will use custom zoom buttons or rely on mouse wheel
    }).setView([defaultLat, defaultLon], defaultZoom)

    // Add zoom control at bottom-right for premium feel
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    // Add CartoDB Dark Matter tile layer for premium dark-mode aesthetic
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map)

    // Create a layer group for match pins, circle boundaries, etc.
    const layerGroup = L.layerGroup().addTo(map)
    layerGroupRef.current = layerGroup
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      layerGroupRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const layerGroup = layerGroupRef.current
    if (!map || !layerGroup) return

    // Clear existing pins
    layerGroup.clearLayers()

    const bounds: L.LatLng[] = []

    // 1. Plot Search Centroid Beacon & Radius Circle
    if (searchCoords && typeof searchCoords.lat === 'number' && typeof searchCoords.lon === 'number') {
      const { lat, lon } = searchCoords
      const searchLatLng = L.latLng(lat, lon)
      bounds.push(searchLatLng)

      // Emerald Neon Pulse Marker
      const searchIcon = L.divIcon({
        className: 'custom-search-marker',
        html: `
          <div class="relative flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.6)]">
            <div class="w-3.5 h-3.5 rounded-full bg-emerald-400 border border-white relative z-10" />
            <div class="absolute inset-0 w-8 h-8 rounded-full bg-emerald-500/15 animate-ping" />
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      })

      L.marker(searchLatLng, { icon: searchIcon }).addTo(layerGroup)

      // Translucent Emerald Circle Overlay
      const radiusMiles = parseFloat(searchRadius || 'all')
      if (!isNaN(radiusMiles) && radiusMiles > 0) {
        const radiusMeters = radiusMiles * 1609.34
        L.circle(searchLatLng, {
          radius: radiusMeters,
          color: '#10b981', // emerald-500
          weight: 1.5,
          opacity: 0.6,
          fillColor: '#10b981',
          fillOpacity: 0.05,
          dashArray: '5, 5'
        }).addTo(layerGroup)
      }
    }

    // 2. Plot Match Pins
    matches.forEach(match => {
      const club = match.clubs
      if (club && typeof club.latitude === 'number' && typeof club.longitude === 'number') {
        const lat = club.latitude
        const lon = club.longitude
        const matchLatLng = L.latLng(lat, lon)
        bounds.push(matchLatLng)

        // Indigo Neon Pulse Marker
        const matchIcon = L.divIcon({
          className: 'custom-match-marker',
          html: `
            <div class="relative flex items-center justify-center w-9 h-9 rounded-full bg-indigo-500/20 border border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.6)] hover:scale-110 transition-transform duration-200 cursor-pointer">
              <div class="w-4 h-4 rounded-full bg-indigo-500 border border-white flex items-center justify-center relative z-10 shadow-lg">
                <span class="text-[8px] font-black text-white">M</span>
              </div>
              <div class="absolute inset-0 w-9 h-9 rounded-full bg-indigo-500/15 animate-pulse" />
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
          popupAnchor: [0, -14]
        })

        // Format dates beautifully
        const matchDate = new Date(match.date + 'T00:00:00')
        const formattedDate = matchDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })

        const priceText = match.payment_required && match.price > 0 ? `$${match.price}` : 'Free Entry'

        // Elegant glassmorphic popup content
        const popupContent = `
          <div class="text-slate-100 p-2 min-w-[220px] max-w-[260px] space-y-3 font-sans">
            <div class="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5">
              <span class="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-[8px] font-black uppercase tracking-wider text-indigo-300">
                ${match.match_type}
              </span>
              <span class="text-xs font-black text-emerald-400">
                ${priceText}
              </span>
            </div>
            
            <div class="space-y-0.5">
              <h4 class="font-extrabold text-sm text-white leading-snug m-0">${match.name}</h4>
              <p class="text-[10px] text-slate-400 font-medium m-0">${club.name}</p>
            </div>

            <div class="text-[11px] text-slate-300 space-y-1 pt-1.5 border-t border-white/5">
              <div class="flex items-center gap-1.5">
                <span class="text-slate-500">📅</span>
                <span class="font-semibold">${formattedDate}</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="text-slate-500">📍</span>
                <span class="truncate font-semibold" title="${match.location}">${match.location}</span>
              </div>
            </div>

            <div class="pt-1">
              <a href="/matches/${match.id}" class="block text-center text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 py-2 px-3 rounded-lg shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all duration-200 cursor-pointer" style="text-decoration: none !important; color: white !important;">
                View Match Details
              </a>
            </div>
          </div>
        `

        L.marker(matchLatLng, { icon: matchIcon })
          .bindPopup(popupContent, {
            maxWidth: 300,
            closeButton: true
          })
          .addTo(layerGroup)
      }
    })

    // Fit map bounds to show all markers beautifully
    if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds), {
        padding: [50, 50],
        maxZoom: 12
      })
    }
  }, [matches, searchCoords, searchRadius])

  return (
    <div className="relative w-full h-[550px] rounded-2xl border border-white/10 overflow-hidden shadow-2xl backdrop-blur-xl">
      <div ref={mapContainerRef} className="w-full h-full bg-slate-950" />
      
      {/* Global Style Override to Customize Leaflet Popups for Dark Glassmorphism */}
      <style jsx global>{`
        .leaflet-popup-content-wrapper {
          background: rgba(9, 9, 11, 0.9) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          backdrop-filter: blur(16px) !important;
          border-radius: 16px !important;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 10px 10px -5px rgba(0, 0, 0, 0.4) !important;
        }
        .leaflet-popup-content {
          margin: 12px 14px !important;
          font-family: inherit !important;
        }
        .leaflet-popup-tip {
          background: rgba(9, 9, 11, 0.9) !important;
          border-left: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
          box-shadow: none !important;
        }
        .leaflet-popup-close-button {
          color: rgba(148, 163, 184, 0.7) !important;
          font-size: 16px !important;
          padding: 8px 10px 0 0 !important;
          transition: color 0.15s !important;
        }
        .leaflet-popup-close-button:hover {
          color: white !important;
          background: transparent !important;
        }
        /* Remove default blue outline on focus */
        .leaflet-container :focus {
          outline: none !important;
        }
      `}</style>
    </div>
  )
}
