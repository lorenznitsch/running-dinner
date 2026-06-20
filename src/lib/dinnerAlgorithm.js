/**
 * dinnerAlgorithm.js
 * Pure functions for the Running Dinner plan generator.
 * Uses backtracking-based constraint satisfaction + Haversine distance optimisation.
 */

// ─── Geocoding ────────────────────────────────────────────────────────────────

/**
 * Geocode a single address via Nominatim (OpenStreetMap).
 * Returns { lat, lng } or null on failure.
 * @param {string} address
 * @returns {Promise<{lat: number, lng: number}|null>}
 */
async function geocodeSingle(address) {
  if (!address || !address.trim()) return null
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address.trim())}&limit=1`
  try {
    const res = await fetch(url, { headers: { 'Accept-Language': 'de' } })
    const data = await res.json()
    if (data && data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch { /* ignore network errors */ }
  return null
}

/**
 * Geocode all team addresses + the shared dessert address.
 * Rate-limited to 1 request per 1100 ms (Nominatim policy).
 *
 * @param {Array<{id: number|string, address: string}>} teams
 * @param {string} dessertAddress
 * @param {(done: number, total: number) => void} [onProgress]
 * @returns {Promise<{ teamCoords: Object, dessertCoord: {lat:number,lng:number}|null }>}
 *   teamCoords: { [teamId]: {lat, lng} | null }
 */
export async function geocodeAddresses(teams, dessertAddress, onProgress) {
  const total = teams.length + 1 // teams + dessert
  let done = 0
  const teamCoords = {}

  for (const team of teams) {
    teamCoords[team.id] = await geocodeSingle(team.address)
    done++
    onProgress?.(done, total)
    await new Promise(r => setTimeout(r, 1100))
  }

  const dessertCoord = await geocodeSingle(dessertAddress)
  done++
  onProgress?.(done, total)

  return { teamCoords, dessertCoord }
}

// ─── Distance ─────────────────────────────────────────────────────────────────

/**
 * Great-circle distance between two coordinates (Haversine formula).
 * @param {{lat: number, lng: number}} a
 * @param {{lat: number, lng: number}} b
 * @returns {number} Distance in km
 */
export function haversineDistance(a, b) {
  if (!a || !b) return Infinity
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)
  const x =
    sinDLat * sinDLat +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinDLng * sinDLng
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

/**
 * Build a pairwise distance matrix for all teams.
 * @param {Array<{id: number|string}>} teams
 * @param {Object} teamCoords  { [teamId]: {lat, lng} | null }
 * @returns {Object} { [teamId]: { [teamId]: number (km) } }
 */
export function buildDistanceMatrix(teams, teamCoords) {
  const matrix = {}
  for (const a of teams) {
    matrix[a.id] = {}
    for (const b of teams) {
      matrix[a.id][b.id] = haversineDistance(teamCoords[a.id], teamCoords[b.id])
    }
  }
  return matrix
}

// ─── Conflict check ──────────────────────────────────────────────────────────

/**
 * Returns true if teamA and teamB have already met.
 * @param {number|string} teamA
 * @param {number|string} teamB
 * @param {Object} metWith  { [teamId]: Set<teamId> }
 * @returns {boolean}
 */
export function hasConflict(teamA, teamB, metWith) {
  return !!(metWith[teamA] && metWith[teamA].has(teamB))
}

// ─── Plan Assignment ──────────────────────────────────────────────────────────

/**
 * Assign teams to host courses and build dinner groups.
 * Uses backtracking to avoid duplicate encounters and sorts guest candidates
 * by proximity (Haversine distance) when a distance matrix is available.
 *
 * @param {Array<{id: number|string, diet: string}>} teams
 * @param {Object} [distMatrix]       { [teamId]: { [teamId]: km } } — optional
 * @param {Object} [hostOverrides]    { [teamId]: 'starter'|'main'|'dessert' } — manual overrides
 * @param {number} [maxIter=1000]     max backtracking iterations before giving up
 * @returns {{ teams: Array, groups: Object, hostCourseMap: Object, warning: string|null }}
 */
/**
 * @param {Object} [dessertDistances]  { [teamId]: km } — distance of each team to the shared
 *   dessert location. When provided, hosts are chosen greedily (closest to dessert → Hauptspeise,
 *   next closest → Vorspeise) to minimise the last travel leg for all guests.
 */
export function assignTeams(teams, distMatrix = null, hostOverrides = {}, maxIter = 1000, dessertDistances = null, dessertMode = 'shared') {
  const n = teams.length
  if (n < 3) throw new Error('Mindestens 3 Teams erforderlich')

  // ── Assign host courses ──────────────────────────────────────────────────
  const courses = ['starter', 'main', 'dessert']
  const hostCourseMap = { ...hostOverrides }

  const courseCounts = { starter: 0, main: 0, dessert: 0 }
  for (const id of Object.keys(hostOverrides)) {
    courseCounts[hostOverrides[id]]++
  }

  const targetSize = Math.floor(n / 3)
  const unassigned = teams.filter(t => !hostCourseMap[t.id])

  if (dessertMode === 'shared' && dessertDistances && Object.keys(dessertDistances).length > 0) {
    // Greedy: teams closest to shared dessert become Hauptspeise hosts (minimises last leg main→dessert).
    // Next closest become Vorspeise hosts. The rest are Nachspeise-Vorbereiter (don't host).
    unassigned.sort((a, b) => (dessertDistances[a.id] ?? Infinity) - (dessertDistances[b.id] ?? Infinity))
    for (const team of unassigned) {
      let course
      if (courseCounts.main < targetSize) {
        course = 'main'
      } else if (courseCounts.starter < targetSize) {
        course = 'starter'
      } else {
        course = 'dessert'
      }
      hostCourseMap[team.id] = course
      courseCounts[course]++
    }
  } else {
    // Random round-robin (distributed dessert mode or no coords available)
    unassigned.sort(() => Math.random() - 0.5)
    let courseIdx = 0
    for (const team of unassigned) {
      while (courseCounts[courses[courseIdx]] >= targetSize && courseIdx < courses.length - 1) {
        courseIdx++
      }
      hostCourseMap[team.id] = courses[courseIdx]
      courseCounts[courses[courseIdx]]++
      courseIdx = (courseIdx + 1) % 3
    }
  }

  // Build a quick lookup: course → [team]
  const hostGroups = { starter: [], main: [], dessert: [] }
  for (const team of teams) {
    hostGroups[hostCourseMap[team.id]].push(team)
  }

  // ── Build groups with backtracking ───────────────────────────────────────
  const teamMap = {}
  for (const t of teams) {
    teamMap[t.id] = { ...t, hostCourse: hostCourseMap[t.id], groups: { starter: null, main: null, dessert: null } }
  }

  const metWith = {}
  for (const t of teams) metWith[t.id] = new Set([t.id])

  const groups = { starter: [], main: [], dessert: [] }
  let warning = null

  const coursesToBuild = dessertMode === 'distributed' ? ['starter', 'main', 'dessert'] : ['starter', 'main']
  for (const course of coursesToBuild) {
    const hosts = hostGroups[course]
    // Other teams are guests for this course
    const guestPool = teams.filter(t => hostCourseMap[t.id] !== course)

    // Track which guests have been assigned in this course
    const assignedInCourse = new Set()

    for (const host of hosts) {
      // Sort candidates by distance to host (closest first)
      const candidates = guestPool
        .filter(g => !assignedInCourse.has(g.id))
        .sort((a, b) => {
          if (!distMatrix) return 0
          const da = distMatrix[host.id]?.[a.id] ?? Infinity
          const db = distMatrix[host.id]?.[b.id] ?? Infinity
          return da - db
        })

      // Try diet-matched pair first (soft constraint), then fall back to any valid pair
      const dietPair    = findGuestPairWithDiet(host.id, teamMap[host.id]?.diet, candidates, metWith, Math.floor(maxIter / 2))
      const guests      = dietPair || findGuestPair(host.id, candidates, metWith, maxIter)
      const finalGuests = guests || fallbackPick(host.id, candidates)

      if (!guests) {
        warning = 'Für einige Gruppen konnten keine eindeutigen Gäste-Kombinationen gefunden werden. Manuelle Anpassung empfohlen.'
      }

      // Mark in course pool
      for (const g of finalGuests) assignedInCourse.add(g.id)

      // Mark met-with
      const groupMembers = [host, ...finalGuests]
      for (const a of groupMembers) {
        for (const b of groupMembers) {
          if (a.id !== b.id) metWith[a.id].add(b.id)
        }
      }

      const groupObj = { host: teamMap[host.id], guests: finalGuests.map(g => teamMap[g.id]), course }
      groups[course].push(groupObj)

      for (const member of groupMembers) {
        teamMap[member.id].groups[course] = groupObj
      }
    }
  }

  // Dessert is always at the shared organiser location — no host group is built.
  // Teams with hostCourse='dessert' are "Nachspeise-Vorbereiter": guests at starter+main tables.

  // Count diet-compatible groups (all members share the same dietary form)
  let dietCompatible = 0
  let totalGroups = 0
  for (const course of coursesToBuild) {
    for (const group of (groups[course] || [])) {
      totalGroups++
      if ([group.host, ...group.guests].every(m => m.diet === group.host.diet)) {
        dietCompatible++
      }
    }
  }

  return {
    teams: Object.values(teamMap),
    groups,          // { starter: [...], main: [...], dessert: [] }
    hostCourseMap,
    warning,
    dietStats: { compatible: dietCompatible, total: totalGroups },
  }
}

/**
 * Try to find a diet-matched guest pair (all three share the same dietary form).
 * Returns [guest1, guest2] or null if no such pair found.
 */
function findGuestPairWithDiet(hostId, hostDiet, candidates, metWith, maxIter) {
  if (!hostDiet) return null
  const dietCandidates = candidates.filter(c => c.diet === hostDiet)
  if (dietCandidates.length < 2) return null
  return findGuestPair(hostId, dietCandidates, metWith, maxIter)
}

/**
 * Find a pair of guests for a host using backtracking.
 * Returns [guest1, guest2] or null if no valid pair found.
 * @param {number|string} hostId
 * @param {Array} candidates
 * @param {Object} metWith
 * @param {number} maxIter
 * @returns {Array|null}
 */
function findGuestPair(hostId, candidates, metWith, maxIter) {
  let iter = 0
  for (let i = 0; i < candidates.length; i++) {
    if (iter++ > maxIter) return null
    const g1 = candidates[i]
    if (hasConflict(hostId, g1.id, metWith)) continue
    for (let j = i + 1; j < candidates.length; j++) {
      if (iter++ > maxIter) return null
      const g2 = candidates[j]
      if (hasConflict(hostId, g2.id, metWith)) continue
      if (hasConflict(g1.id, g2.id, metWith)) continue
      return [g1, g2]
    }
  }
  return null
}

/**
 * Fallback: pick first two different candidates, ignoring conflicts.
 */
function fallbackPick(hostId, candidates) {
  const result = []
  for (const c of candidates) {
    if (c.id !== hostId && result.length < 2) result.push(c)
    if (result.length === 2) break
  }
  return result
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validate a plan for duplicate team encounters.
 * @param {{ teams: Array, groups: Object }} plan
 * @returns {{ duplicates: number, pairs: Array<[string, string]> }}
 */
export function validatePlan(plan) {
  const encountered = {} // "idA-idB" → count
  const courses = ['starter', 'main']   // dessert is shared – no host groups to validate

  for (const course of courses) {
    for (const group of (plan.groups[course] || [])) {
      const members = [group.host, ...group.guests].map(t => t.id)
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          const key = [members[i], members[j]].sort().join('-')
          encountered[key] = (encountered[key] || 0) + 1
        }
      }
    }
  }

  const duplicatePairs = Object.entries(encountered)
    .filter(([, count]) => count > 1)
    .map(([key]) => key.split('-'))

  return {
    duplicates: duplicatePairs.length,
    pairs: duplicatePairs,
  }
}

// ─── Distance stats ──────────────────────────────────────────────────────────

/**
 * Estimate travel distance for each team throughout the evening.
 * Path: home → starter host → main host → dessert location → home.
 *
 * @param {{ teams: Array }} plan
 * @param {Object} teamCoords  { [teamId]: {lat, lng} | null }
 * @param {{lat: number, lng: number}|null} dessertCoord
 * @returns {{ totalKm: number, avgKmPerTeam: number }}
 */
/**
 * Estimate travel distance per team using the two relevant legs:
 *   Vorspeise-Host → Hauptspeise-Host  +  Hauptspeise-Host → Nachspeise
 *
 * In distributed mode, the dessert coord is looked up from teamCoords via the dessert host.
 * In shared mode, the single dessertCoord is used.
 */
export function calculateTotalDistance(plan, teamCoords, dessertCoord, dessertMode = 'shared') {
  let total = 0
  let counted = 0

  for (const team of plan.teams) {
    const starterCoord = teamCoords[team.groups?.starter?.host?.id]
    const mainCoord    = teamCoords[team.groups?.main?.host?.id]
    if (!starterCoord || !mainCoord) continue

    const leg1 = haversineDistance(starterCoord, mainCoord)

    let effectiveDessertCoord = dessertCoord
    if (dessertMode === 'distributed') {
      effectiveDessertCoord = teamCoords[team.groups?.dessert?.host?.id] || null
    }
    const leg2 = effectiveDessertCoord ? haversineDistance(mainCoord, effectiveDessertCoord) : 0

    if (leg1 !== Infinity && (leg2 !== Infinity || !effectiveDessertCoord)) {
      total += leg1 + leg2
      counted++
    }
  }

  return {
    totalKm: Math.round(total * 10) / 10,
    avgKmPerTeam: counted > 0 ? Math.round((total / counted) * 10) / 10 : 0,
  }
}
