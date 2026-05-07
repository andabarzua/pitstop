import { reactive, computed, ref } from 'vue'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useAuth } from './useAuth.js'

const STORAGE_KEY = 'pitstop:lastQuote'
const IVA_RATE = 0.19

const formatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0
})

export function formatCLP(amount) {
  const n = Number(amount) || 0
  return formatter.format(Math.round(n))
}

function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function generateQuoteId() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `COT-${y}${m}${day}-${rand}`
}

function uid() {
  return 'it_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

function emptyClient() {
  return {
    nombre: '',
    apellido: '',
    patente: '',
    marca: '',
    modelo: '',
    anio: '',
    telefono: '',
    email: ''
  }
}

function emptyQuote() {
  return {
    version: '1.0',
    id: generateQuoteId(),
    fecha: todayISO(),
    cliente: emptyClient(),
    items: []
  }
}

const state = reactive({
  quote: emptyQuote(),
  currentStep: 1
})

const subtotal = computed(() =>
  state.quote.items.reduce((sum, it) => sum + (Number(it.cantidad) || 0) * (Number(it.precioUnitario) || 0), 0)
)
const iva = computed(() => Math.round(subtotal.value * IVA_RATE))
const total = computed(() => subtotal.value + iva.value)
const itemCount = computed(() => state.quote.items.length)

function addItem(item) {
  const cantidad = Math.max(1, Math.floor(Number(item.cantidad) || 1))
  const precioUnitario = Math.max(0, Math.round(Number(item.precioUnitario) || 0))
  state.quote.items.push({
    id: uid(),
    descripcion: (item.descripcion || '').trim(),
    cantidad,
    precioUnitario,
    total: cantidad * precioUnitario
  })
  persist()
}

function updateItem(id, patch) {
  const idx = state.quote.items.findIndex(i => i.id === id)
  if (idx === -1) return
  const cur = state.quote.items[idx]
  const merged = { ...cur, ...patch }
  merged.cantidad = Math.max(1, Math.floor(Number(merged.cantidad) || 1))
  merged.precioUnitario = Math.max(0, Math.round(Number(merged.precioUnitario) || 0))
  merged.total = merged.cantidad * merged.precioUnitario
  state.quote.items[idx] = merged
  persist()
}

function removeItem(id) {
  state.quote.items = state.quote.items.filter(i => i.id !== id)
  persist()
}

function setStep(n) {
  state.currentStep = n
}

function resetQuote() {
  Object.assign(state.quote, emptyQuote())
  state.currentStep = 1
  try { localStorage.removeItem(STORAGE_KEY) } catch (e) {}
}

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(exportToJson())) } catch (e) {}
}

function exportToJson() {
  return {
    version: '1.0',
    id: state.quote.id,
    fecha: state.quote.fecha,
    cliente: { ...state.quote.cliente },
    items: state.quote.items.map(it => ({
      id: it.id,
      descripcion: it.descripcion,
      cantidad: it.cantidad,
      precioUnitario: it.precioUnitario,
      total: it.cantidad * it.precioUnitario
    })),
    totales: {
      subtotal: subtotal.value,
      iva: iva.value,
      iva_rate: IVA_RATE,
      total: total.value
    }
  }
}

function loadFromJson(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Archivo inválido: no es un JSON válido.')
  }
  if (!data.cliente || !Array.isArray(data.items)) {
    throw new Error('Archivo inválido: falta cliente o items.')
  }
  state.quote.version = data.version || '1.0'
  state.quote.id = data.id || generateQuoteId()
  state.quote.fecha = data.fecha || todayISO()
  state.quote.cliente = { ...emptyClient(), ...data.cliente }
  state.quote.items = data.items.map(it => {
    const cantidad = Math.max(1, Math.floor(Number(it.cantidad) || 1))
    const precioUnitario = Math.max(0, Math.round(Number(it.precioUnitario) || 0))
    return {
      id: it.id || uid(),
      descripcion: String(it.descripcion || ''),
      cantidad,
      precioUnitario,
      total: cantidad * precioUnitario
    }
  })
  // No reseteamos currentStep — el caller decide a qué paso ir
  persist()
}

function tryRestore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const data = JSON.parse(raw)
    loadFromJson(data)
    return true
  } catch (e) {
    return false
  }
}

function downloadJson() {
  const data = exportToJson()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${state.quote.id}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function formatFechaLarga(iso) {
  try {
    const d = new Date(iso + 'T00:00:00')
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch (e) {
    return iso
  }
}

// Helper: section header bar (orange background, white uppercase title)
function sectionHeader(doc, title, x, y, width) {
  doc.setFillColor(232, 93, 4)
  doc.rect(x, y, width, 22, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(String(title).toUpperCase(), x + 10, y + 14.5)
  return y + 22
}

function buildPdf() {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 40
  const innerWidth = pageWidth - margin * 2

  // ---------- Top: Logo + COTIZACIÓN title ----------
  // Logo (orange wrench in rounded square)
  const logoSize = 44
  const logoX = margin
  const logoY = margin
  doc.setFillColor(232, 93, 4)
  doc.roundedRect(logoX, logoY, logoSize, logoSize, 8, 8, 'F')
  // Wrench glyph (simple stylized "W" / chevron)
  doc.setDrawColor(255, 255, 255)
  doc.setLineWidth(2.4)
  doc.setLineCap('round')
  doc.setLineJoin('round')
  // arrow up icon (similar to the reference)
  doc.line(logoX + 12, logoY + 28, logoX + 22, logoY + 16)
  doc.line(logoX + 22, logoY + 16, logoX + 32, logoY + 28)
  doc.line(logoX + 14, logoY + 34, logoX + 22, logoY + 24)
  doc.line(logoX + 22, logoY + 24, logoX + 30, logoY + 34)

  // PITSTOP wordmark under logo
  doc.setTextColor(40, 40, 40)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('PITSTOP', logoX, logoY + logoSize + 14)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(150, 150, 150)
  doc.text('SERVICIOS AUTOMOTRICES', logoX, logoY + logoSize + 24)

  // Right side: COTIZACIÓN big
  doc.setTextColor(40, 40, 40)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  doc.text('COTIZACIÓN', pageWidth - margin, logoY + 22, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(80, 80, 80)
  doc.text(`N°: ${state.quote.id}`, pageWidth - margin, logoY + 40, { align: 'right' })
  doc.text(`FECHA: ${formatFechaCorta(state.quote.fecha)}`, pageWidth - margin, logoY + 54, { align: 'right' })

  // ---------- Section: INFORMACIÓN DEL CLIENTE ----------
  let y = logoY + logoSize + 50
  y = sectionHeader(doc, 'Información del cliente', margin, y, innerWidth)

  // Content background (very light) under the section
  const c = state.quote.cliente
  const clientLines = []
  const fullName = `${c.nombre || ''} ${c.apellido || ''}`.trim()
  if (fullName) clientLines.push(['Nombre completo:', fullName])
  if (c.telefono) clientLines.push(['Teléfono:', c.telefono])
  if (c.email) clientLines.push(['Correo electrónico:', c.email])
  const patente = (c.patente || '').toUpperCase()
  if (patente) clientLines.push(['Patente:', patente])
  const veh = [c.marca, c.modelo, c.anio].filter(Boolean).join(' ')
  if (veh) clientLines.push(['Vehículo:', veh])

  const rowH = 16
  const blockH = Math.max(rowH * clientLines.length + 20, 50)
  doc.setFillColor(252, 252, 252)
  doc.rect(margin, y, innerWidth, blockH, 'F')

  doc.setFontSize(10)
  let cy = y + 18
  for (const [label, value] of clientLines) {
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(120, 120, 120)
    doc.text(label, margin + 12, cy)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(40, 40, 40)
    doc.text(String(value), margin + 130, cy)
    cy += rowH
  }
  y += blockH + 16

  // ---------- Items table ----------
  const rows = state.quote.items.map(it => [
    it.descripcion,
    formatCLP(it.precioUnitario),
    String(it.cantidad),
    formatCLP((it.cantidad || 0) * (it.precioUnitario || 0))
  ])

  autoTable(doc, {
    startY: y,
    head: [['DESCRIPCIÓN', 'PRECIO', 'CANTIDAD', 'TOTAL']],
    body: rows,
    margin: { left: margin, right: margin },
    tableWidth: innerWidth,
    styles: {
      font: 'helvetica',
      fontSize: 10,
      cellPadding: { top: 8, right: 10, bottom: 8, left: 10 },
      lineColor: [255, 255, 255],
      lineWidth: 0,
      textColor: [40, 40, 40]
    },
    headStyles: {
      fillColor: [232, 93, 4],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
      halign: 'left',
      cellPadding: { top: 6, right: 10, bottom: 6, left: 10 }
    },
    bodyStyles: {
      fillColor: [255, 255, 255]
    },
    alternateRowStyles: {
      fillColor: [253, 240, 232] // muy light orange tint (alterna como en la imagen)
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 90, halign: 'right' },
      2: { cellWidth: 70, halign: 'center' },
      3: { cellWidth: 90, halign: 'right', fontStyle: 'bold' }
    }
  })

  let afterTable = doc.lastAutoTable.finalY

  // ---------- Totals (right-aligned, no fondo) ----------
  const totalsX = pageWidth - margin - 200
  const totalsValueX = pageWidth - margin
  let ty = afterTable + 18

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(120, 120, 120)
  doc.text('SUBTOTAL', totalsX, ty)
  doc.setTextColor(40, 40, 40)
  doc.text(formatCLP(subtotal.value), totalsValueX, ty, { align: 'right' })
  ty += 18

  doc.setTextColor(120, 120, 120)
  doc.text('IVA 19%', totalsX, ty)
  doc.setTextColor(40, 40, 40)
  doc.text(formatCLP(iva.value), totalsValueX, ty, { align: 'right' })
  ty += 14

  // Línea separadora
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.6)
  doc.line(totalsX, ty, totalsValueX, ty)
  ty += 18

  // TOTAL final con barra naranja
  doc.setFillColor(232, 93, 4)
  doc.rect(totalsX - 8, ty - 14, totalsValueX - totalsX + 16, 26, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(255, 255, 255)
  doc.text('TOTAL', totalsX, ty + 4)
  doc.text(formatCLP(total.value), totalsValueX - 4, ty + 4, { align: 'right' })

  ty += 26

  // ---------- Section: DETALLES DE PAGO ----------
  let py = ty + 26
  if (py > pageHeight - 140) {
    doc.addPage()
    py = margin
  }
  py = sectionHeader(doc, 'Detalles de pago', margin, py, innerWidth)

  doc.setFillColor(252, 252, 252)
  doc.rect(margin, py, innerWidth, 70, 'F')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(120, 120, 120)
  doc.text('Forma de pago:', margin + 12, py + 18)
  doc.text('Validez:', margin + 12, py + 36)
  doc.text('Información adicional:', margin + 12, py + 54)

  doc.setTextColor(40, 40, 40)
  doc.text('Efectivo, transferencia o débito al momento del servicio.', margin + 130, py + 18)
  doc.text('15 días corridos desde la fecha de emisión.', margin + 130, py + 36)
  doc.text('Los precios incluyen el IVA correspondiente.', margin + 130, py + 54)

  py += 70

  // ---------- Section: CONTACTO ----------
  py += 16
  if (py > pageHeight - 80) {
    doc.addPage()
    py = margin
  }
  py = sectionHeader(doc, 'Contacto', margin, py, innerWidth)

  doc.setFillColor(252, 252, 252)
  doc.rect(margin, py, innerWidth, 32, 'F')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(120, 120, 120)
  doc.text('PitStop · Servicios Automotrices', margin + 12, py + 20)
  doc.setTextColor(232, 93, 4)
  doc.text('www.pitstop.cl', pageWidth - margin - 12, py + 20, { align: 'right' })

  // ---------- Footer (page numbers on all pages) ----------
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(160, 160, 160)
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, pageHeight - 16, { align: 'right' })
    doc.text('PitStop — Cotización generada digitalmente', margin, pageHeight - 16)
  }

  return doc
}

function formatFechaCorta(iso) {
  try {
    const d = new Date(iso + 'T00:00:00')
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch (e) {
    return iso
  }
}

function generatePdf() {
  return buildPdf()
}

function downloadPdf() {
  const doc = buildPdf()
  doc.save(`${state.quote.id}.pdf`)
}

function getPdfBlobUrl() {
  const doc = buildPdf()
  const blob = doc.output('blob')
  return URL.createObjectURL(blob)
}

async function getPdfBlob() {
  const doc = buildPdf()
  return doc.output('blob')
}

function buildShareUrl() {
  const data = exportToJson()
  const json = JSON.stringify(data)
  const b64 = btoa(unescape(encodeURIComponent(json)))
  const url = new URL(window.location.href)
  url.hash = `cot=${b64}`
  return url.toString()
}

// ---------- Cloud (Vercel + Neon) ----------
const cloudState = reactive({
  saving: false,
  loadingList: false,
  list: [],
  lastError: ''
})

function authHeadersJson() {
  const { authHeaders } = useAuth()
  return { 'Content-Type': 'application/json', ...authHeaders() }
}

async function cloudSave() {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated.value) {
    cloudState.lastError = 'Necesitas ingresar la password primero.'
    throw new Error(cloudState.lastError)
  }
  cloudState.saving = true
  cloudState.lastError = ''
  try {
    const payload = exportToJson()
    const res = await fetch('/api/quotes', {
      method: 'POST',
      headers: authHeadersJson(),
      body: JSON.stringify(payload)
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      throw new Error(j?.error || `HTTP ${res.status}`)
    }
    return await res.json()
  } catch (e) {
    cloudState.lastError = e.message || 'Error al guardar en cloud'
    throw e
  } finally {
    cloudState.saving = false
  }
}

async function cloudStats() {
  const res = await fetch('/api/stats', { headers: authHeadersJson() })
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new Error(j?.error || `HTTP ${res.status}`)
  }
  return await res.json()
}

async function cloudList() {
  cloudState.loadingList = true
  cloudState.lastError = ''
  try {
    const res = await fetch('/api/quotes', { headers: authHeadersJson() })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      throw new Error(j?.error || `HTTP ${res.status}`)
    }
    const data = await res.json()
    cloudState.list = Array.isArray(data?.quotes) ? data.quotes : []
    return cloudState.list
  } catch (e) {
    cloudState.lastError = e.message || 'Error al listar'
    throw e
  } finally {
    cloudState.loadingList = false
  }
}

async function cloudGet(id) {
  const res = await fetch(`/api/quotes/${encodeURIComponent(id)}`, {
    headers: authHeadersJson()
  })
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new Error(j?.error || `HTTP ${res.status}`)
  }
  return await res.json()
}

async function cloudDelete(id) {
  const res = await fetch(`/api/quotes/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeadersJson()
  })
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new Error(j?.error || `HTTP ${res.status}`)
  }
  cloudState.list = cloudState.list.filter(q => q.id !== id)
  return await res.json()
}

async function cloudLoad(id) {
  const data = await cloudGet(id)
  loadFromJson(data)
  return data
}

function tryLoadFromHash() {
  try {
    const hash = window.location.hash || ''
    const m = hash.match(/cot=([^&]+)/)
    if (!m) return false
    const json = decodeURIComponent(escape(atob(m[1])))
    const data = JSON.parse(json)
    loadFromJson(data)
    history.replaceState(null, '', window.location.pathname + window.location.search)
    return true
  } catch (e) {
    return false
  }
}

export function useQuote() {
  return {
    state,
    quote: state.quote,
    currentStep: computed(() => state.currentStep),
    setStep,
    subtotal,
    iva,
    total,
    ivaRate: IVA_RATE,
    itemCount,
    addItem,
    updateItem,
    removeItem,
    resetQuote,
    exportToJson,
    loadFromJson,
    downloadJson,
    generatePdf,
    downloadPdf,
    getPdfBlobUrl,
    getPdfBlob,
    buildShareUrl,
    tryLoadFromHash,
    tryRestore,
    formatCLP,
    formatFechaLarga,
    cloudState,
    cloudSave,
    cloudList,
    cloudGet,
    cloudDelete,
    cloudLoad,
    cloudStats
  }
}
