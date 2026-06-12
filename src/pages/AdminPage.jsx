import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const ACCENT = '#1D9E75'

function exportCsv(responses, eventName) {
  const header = ['Namen', 'Ernährung', 'Allergien', 'Adresse', 'Klingelschild', 'Telefon', 'Hinweise']
  const rows = responses.map(r => [
    r.names, r.diet, r.allergies || '', r.address, r.doorbell || '', r.phone || '', r.notes || '',
  ])
  const csv = [header, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `running-dinner-${eventName || 'anmeldungen'}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function AdminPage() {
  const { surveyId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const adminToken = searchParams.get('token')

  const [survey, setSurvey] = useState(null)
  const [responses, setResponses] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [accessError, setAccessError] = useState('')

  const fetchData = useCallback(async (showRefreshing = false) => {
    if (!adminToken) { setAccessError('Kein Zugriff – Admin-Token fehlt in der URL.'); setLoading(false); return }
    if (showRefreshing) setRefreshing(true)

    try {
      // Fetch survey meta
      const { data: surveyData, error: surveyError } = await supabase
        .from('surveys')
        .select('id, event_name, created_at')
        .eq('id', surveyId)
        .maybeSingle()

      if (surveyError || !surveyData) { setAccessError('Umfrage nicht gefunden.'); return }
      setSurvey(surveyData)

      // Fetch responses using admin token header
      const { data: resData, error: resError } = await supabase
        .from('responses')
        .select('*')
        .eq('survey_id', surveyId)
        .order('submitted_at', { ascending: false })
        .setHeader('x-admin-token', adminToken)

      if (resError) {
        // RLS block → wrong token
        setAccessError('Kein Zugriff – ungültiger Admin-Token.')
        return
      }
      setResponses(resData || [])
    } catch {
      setAccessError('Unbekannter Fehler beim Laden.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [surveyId, adminToken])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCreatePlan = () => {
    // Convert responses to team format expected by ToolPage
    const teams = responses.map((r, i) => ({
      id: i + 1,
      names: r.names,
      diet: r.diet || 'omnivor',
      allergies: r.allergies || '',
      address: r.address || '',
      doorbell: r.doorbell || '',
      phone: r.phone || '',
    }))
    navigate('/tool', { state: { teams } })
  }

  // ── Error / Loading ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="text-4xl mb-3 animate-pulse">🍽️</div>
          <p>Lade Admin-Ansicht…</p>
        </div>
      </div>
    )
  }

  if (accessError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Kein Zugriff</h1>
          <p className="text-gray-500 mb-6">{accessError}</p>
          <Link to="/" className="text-sm font-semibold" style={{ color: ACCENT }}>← Zur Startseite</Link>
        </div>
      </div>
    )
  }

  // ── Admin View ───────────────────────────────────────────────────────────────

  const dietColors = {
    vegan: 'bg-green-100 text-green-700',
    vegetarisch: 'bg-lime-100 text-lime-700',
    omnivor: 'bg-gray-100 text-gray-500',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-gray-900">
            <span style={{ color: ACCENT }}>🍽️</span>
            <span>Running Dinner</span>
          </Link>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full font-mono">{surveyId}</span>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {survey?.event_name || 'Running Dinner'} – Admin
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                Umfrage-ID: <code className="bg-gray-100 px-1 rounded">{surveyId}</code>
                {survey?.created_at && ` · Erstellt am ${new Date(survey.created_at).toLocaleDateString('de-DE')}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="text-center px-5 py-3 rounded-xl text-white font-bold text-2xl leading-none"
                style={{ backgroundColor: ACCENT }}
              >
                {responses.length}
                <div className="text-xs font-normal opacity-80 mt-0.5">Anmeldungen</div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-5 border-t border-gray-100">
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {refreshing ? '🔄 Aktualisiere…' : '🔄 Aktualisieren'}
            </button>
            <button
              onClick={() => exportCsv(responses, survey?.event_name)}
              disabled={responses.length === 0}
              className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-40"
            >
              📥 Als CSV exportieren
            </button>
            <button
              onClick={handleCreatePlan}
              disabled={responses.length < 3}
              className="flex-1 py-2.5 px-4 rounded-xl font-bold text-white text-sm transition-opacity disabled:opacity-40"
              style={{ backgroundColor: ACCENT }}
              title={responses.length < 3 ? 'Mindestens 3 Anmeldungen benötigt' : ''}
            >
              🎲 Dinner-Plan erstellen →
            </button>
          </div>
          {responses.length < 3 && responses.length > 0 && (
            <p className="text-xs text-gray-400 mt-2 text-center">
              Mindestens 3 Anmeldungen für den Plan-Generator benötigt ({3 - responses.length} fehlen noch)
            </p>
          )}
        </div>

        {/* Share links */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-6">
          <p className="text-sm font-semibold text-blue-900 mb-3">🔗 Teilnehmer-Link teilen</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={`${window.location.origin}/survey/${surveyId}`}
              className="flex-1 text-xs bg-white border border-blue-200 rounded-lg px-3 py-2.5 text-gray-700 font-mono"
            />
            <button
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}/survey/${surveyId}`)}
              className="px-3 py-2 rounded-lg text-xs font-semibold border border-blue-200 bg-white hover:bg-blue-50 text-blue-700 transition-colors flex-shrink-0"
            >
              📋 Kopieren
            </button>
          </div>
        </div>

        {/* Responses table */}
        {responses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-500 font-medium">Noch keine Anmeldungen</p>
            <p className="text-gray-400 text-sm mt-1">Teile den Teilnehmer-Link mit deinen Gästen.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 text-sm">Alle Anmeldungen</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 font-semibold">#</th>
                    <th className="px-4 py-3 font-semibold">Namen</th>
                    <th className="px-4 py-3 font-semibold">Ernährung</th>
                    <th className="px-4 py-3 font-semibold">Allergien</th>
                    <th className="px-4 py-3 font-semibold">Adresse</th>
                    <th className="px-4 py-3 font-semibold">Klingel</th>
                    <th className="px-4 py-3 font-semibold">Telefon</th>
                    <th className="px-4 py-3 font-semibold">Hinweis</th>
                    <th className="px-4 py-3 font-semibold">Eingegangen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {responses.map((r, i) => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{r.names}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${dietColors[r.diet] || dietColors.omnivor}`}>
                          {r.diet || 'omnivor'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-orange-600 text-xs">{r.allergies || <span className="text-gray-300">–</span>}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs max-w-36 truncate">{r.address}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{r.doorbell || <span className="text-gray-300">–</span>}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{r.phone || <span className="text-gray-300">–</span>}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs max-w-32 truncate">{r.notes || <span className="text-gray-300">–</span>}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {new Date(r.submitted_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
