/**
 * Parse CSV text into array of team objects.
 * Tries to auto-detect columns by common German/English header names.
 */
export function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) throw new Error('CSV hat zu wenige Zeilen')

  // Detect delimiter
  const firstLine = lines[0]
  const delimiter = firstLine.includes(';') ? ';' : ','

  const headers = splitCSVLine(firstLine, delimiter).map(h => h.trim().toLowerCase().replace(/["""]/g, ''))

  const findCol = (...candidates) => {
    for (const c of candidates) {
      const idx = headers.findIndex(h => h.includes(c))
      if (idx !== -1) return idx
    }
    return -1
  }

  const colName1 = findCol('name 1', 'name1', 'vorname 1', 'person 1', 'teilnehmer 1')
  const colName2 = findCol('name 2', 'name2', 'vorname 2', 'person 2', 'teilnehmer 2')
  const colNames = findCol('namen', 'names', 'teilnehmer', 'name')
  const colDiet = findCol('ernährung', 'ernahrung', 'diet', 'kost', 'vegan', 'vegetarisch')
  const colAllergies = findCol('allergi', 'unverträglich', 'intoleran', 'unvertraglich')
  const colAddress = findCol('adresse', 'address', 'straße', 'strasse', 'wohnort')
  const colDoorbell = findCol('klingel', 'doorbell', 'klingelschild', 'türschild', 'turschild')
  const colPhone  = findCol('telefon', 'phone', 'handy', 'nummer', 'mobile', 'whatsapp')
  const colEmail  = findCol('e-mail-adresse', 'email address', 'e-mail', 'email', 'mail', 'e_mail')
  const colEmail2 = findCol('e-mail 2', 'email2', 'e-mail2', 'zweite mail', 'second email')

  const teams = []
  for (let i = 1; i < lines.length; i++) {
    const row = splitCSVLine(lines[i], delimiter).map(c => c.trim().replace(/^[""]|[""]$/g, ''))
    if (row.every(c => !c)) continue

    let names = ''
    if (colName1 !== -1 && colName2 !== -1) {
      names = [row[colName1], row[colName2]].filter(Boolean).join(' & ')
    } else if (colNames !== -1) {
      names = row[colNames] || `Team ${i}`
    } else {
      names = row[0] || `Team ${i}`
    }

    const dietRaw = (colDiet !== -1 ? row[colDiet] : '').toLowerCase()
    let diet = 'omnivor'
    if (dietRaw.includes('vegan')) diet = 'vegan'
    else if (dietRaw.includes('vegetar')) diet = 'vegetarisch'

    teams.push({
      id: i,
      names: names.trim(),
      diet,
      allergies: colAllergies !== -1 ? row[colAllergies] : '',
      address: colAddress !== -1 ? row[colAddress] : '',
      doorbell: colDoorbell !== -1 ? row[colDoorbell] : '',
      phone: colPhone !== -1 ? row[colPhone] : '',
      email: colEmail !== -1 ? row[colEmail] : '',
      email2: colEmail2 !== -1 ? row[colEmail2] : '',
    })
  }

  return teams
}

function splitCSVLine(line, delimiter) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if ((ch === '"' || ch === '“' || ch === '”') && !inQuotes) {
      inQuotes = true
    } else if ((ch === '"' || ch === '”') && inQuotes) {
      inQuotes = false
    } else if (ch === delimiter && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

/**
 * Generate dinner plan.
 * Assigns each team a host course, then assigns guests so:
 * - No two teams meet twice
 * - Dietary constraints are respected (vegan host → all guests vegan-compatible)
 */
export function generatePlan(teams) {
  const n = teams.length
  if (n < 3) throw new Error('Mindestens 3 Teams erforderlich')

  // Shuffle teams for randomness
  const shuffled = [...teams].sort(() => Math.random() - 0.5)

  // Divide into three host groups
  const size = Math.floor(n / 3)
  const starterHosts = shuffled.slice(0, size)
  const mainHosts = shuffled.slice(size, size * 2)
  const dessertHosts = shuffled.slice(size * 2)

  // Assign host courses
  const teamMap = {}
  for (const t of teams) {
    teamMap[t.id] = { ...t, hostCourse: null, groups: { starter: null, main: null, dessert: null } }
  }
  for (const t of starterHosts) teamMap[t.id].hostCourse = 'starter'
  for (const t of mainHosts) teamMap[t.id].hostCourse = 'main'
  for (const t of dessertHosts) teamMap[t.id].hostCourse = 'dessert'

  // Build groups: for each course, group hosts with 2 guests from other host-groups
  // Track who has met whom
  const metWith = {} // teamId -> Set of teamIds
  for (const t of teams) metWith[t.id] = new Set([t.id])

  const courses = ['starter', 'main', 'dessert']
  const hostGroups = { starter: starterHosts, main: mainHosts, dessert: dessertHosts }
  const groups = { starter: [], main: [], dessert: [] }

  for (const course of courses) {
    const hosts = hostGroups[course]
    const otherTeams = teams.filter(t => teamMap[t.id].hostCourse !== course)

    // Shuffle others for variety
    const pool = [...otherTeams].sort(() => Math.random() - 0.5)

    for (const host of hosts) {
      const hostObj = teamMap[host.id]
      // Find 2 guests that haven't met the host yet and haven't met each other
      const guests = []
      for (const candidate of pool) {
        if (guests.length === 2) break
        if (metWith[host.id].has(candidate.id)) continue
        if (guests.some(g => metWith[g.id].has(candidate.id))) continue
        // Dietary check: if host is vegan, guests must tolerate vegan food (they always do, food adapts)
        guests.push(candidate)
      }

      // If not enough guests found, fill with any remaining
      if (guests.length < 2) {
        for (const candidate of pool) {
          if (guests.length === 2) break
          if (guests.some(g => g.id === candidate.id)) continue
          if (candidate.id === host.id) continue
          if (!guests.includes(candidate)) guests.push(candidate)
        }
      }

      // Remove used guests from pool
      for (const g of guests) {
        const idx = pool.findIndex(p => p.id === g.id)
        if (idx !== -1) pool.splice(idx, 1)
      }

      // Mark as met
      const groupMembers = [host, ...guests]
      for (const a of groupMembers) {
        for (const b of groupMembers) {
          if (a.id !== b.id) metWith[a.id].add(b.id)
        }
      }

      const groupObj = {
        host: teamMap[host.id],
        guests: guests.map(g => teamMap[g.id]),
        course,
      }
      groups[course].push(groupObj)

      // Assign group to all members
      for (const member of groupMembers) {
        teamMap[member.id].groups[course] = groupObj
      }
    }
  }

  // Assign dessert: everyone goes to same location (largest host or first dessert host)
  const dessertLocation = dessertHosts[0]

  return {
    teams: Object.values(teamMap),
    groups,
    dessertLocation: teamMap[dessertLocation.id],
  }
}

export function buildMessage(team, plan, config) {
  const { date, timeStarter, timeMain, timeDessert, dessertAddress, dessertDoorbell, contacts, whatsappLink } = config

  const starterGroup = team.groups.starter
  const mainGroup = team.groups.main
  const dessertGroup = team.groups.dessert

  const getAddress = (group) => {
    if (!group) return 'TBD'
    return group.host.address || group.host.names
  }
  const getDoorbell = (group) => {
    if (!group) return ''
    return group.host.doorbell || group.host.names
  }

  const cookingCourse = team.hostCourse
  const courseLabels = { starter: 'Vorspeise', main: 'Hauptspeise', dessert: 'Nachspeise' }
  const cookLabel = courseLabels[cookingCourse] || ''

  const dietLabel = team.diet === 'vegan' ? 'vegane' : team.diet === 'vegetarisch' ? 'vegetarische' : ''
  const allergyNote = team.allergies ? ` (ohne ${team.allergies})` : ''
  const personCount = 6

  const cookingLine = dietLabel
    ? `👩‍🍳 Bitte bereitet eine ${dietLabel} ${cookLabel}${allergyNote} für ca. ${personCount} Personen vor.`
    : `👩‍🍳 Bitte bereitet eine ${cookLabel}${allergyNote} für ca. ${personCount} Personen vor.`

  const broadcastLine = whatsappLink
    ? `\nHier kannst du dem WhatsApp-Broadcast für das Running Dinner beitreten: ${whatsappLink}`
    : ''

  return `Hi ${team.names} 👋
Hier kommt euer persönlicher Plan für das Running Dinner am ${date} 🍽️

🥗 Vorspeise: ${timeStarter} Uhr bei ${getAddress(starterGroup)}, Klingeln bei: ${getDoorbell(starterGroup)}
🍝 Hauptspeise: ${timeMain} Uhr bei ${getAddress(mainGroup)}, Klingeln bei: ${getDoorbell(mainGroup)}
🍰 Nachspeise: ${timeDessert} Uhr bei ${dessertAddress || 'Gemeinsamer Ort'}, Klingeln bei: ${dessertDoorbell || ''}

⏱️ Bitte plant für den Ortswechsel ca. 20–30 Minuten ein.

${cookingLine}

Leitet die Infos bitte noch an eure:n Partner:in weiter.
Falls etwas schief läuft, meldet euch bei:
${contacts || 'Organisationsteam'}
${broadcastLine}
Wir freuen uns auf euch! 🎉`
}
