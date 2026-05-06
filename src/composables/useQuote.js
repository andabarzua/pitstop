import { reactive, computed, ref } from 'vue'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const STORAGE_KEY = 'pitstop:lastQuote'

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
const total = computed(() => subtotal.value)
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
  state.currentStep = 1
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

function buildPdf() {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 36

  // ---------- Header band ----------
  doc.setFillColor(10, 10, 10)
  doc.rect(0, 0, pageWidth, 92, 'F')

  doc.setFillColor(232, 93, 4)
  doc.rect(0, 92, pageWidth, 4, 'F')

  doc.setTextColor(245, 245, 245)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  doc.text('PITSTOP', margin, 46)

  doc.setTextColor(232, 93, 4)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text('Cotización de Servicios Automotrices', margin, 66)

  doc.setTextColor(245, 245, 245)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(state.quote.id, pageWidth - margin, 40, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(180, 180, 180)
  doc.text(formatFechaLarga(state.quote.fecha), pageWidth - margin, 56, { align: 'right' })
  doc.text('Válida por 15 días', pageWidth - margin, 70, { align: 'right' })

  // ---------- Client / Vehicle box ----------
  let y = 124
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.7)
  doc.roundedRect(margin, y, pageWidth - margin * 2, 110, 6, 6)

  const c = state.quote.cliente
  const colWidth = (pageWidth - margin * 2 - 24) / 2
  const colLeftX = margin + 14
  const colRightX = margin + 14 + colWidth + 12

  // Left column: client
  doc.setTextColor(120, 120, 120)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('CLIENTE', colLeftX, y + 18)

  doc.setTextColor(40, 40, 40)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  const fullName = `${c.nombre || ''} ${c.apellido || ''}`.trim() || '—'
  doc.text(fullName, colLeftX, y + 36)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(80, 80, 80)
  let yy = y + 54
  if (c.telefono) { doc.text(`Tel: ${c.telefono}`, colLeftX, yy); yy += 14 }
  if (c.email) { doc.text(`Email: ${c.email}`, colLeftX, yy); yy += 14 }

  // Right column: vehicle
  doc.setTextColor(120, 120, 120)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('VEHÍCULO', colRightX, y + 18)

  doc.setTextColor(40, 40, 40)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text((c.patente || '—').toUpperCase(), colRightX, y + 36)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(80, 80, 80)
  const veh = [c.marca, c.modelo, c.anio].filter(Boolean).join(' ')
  if (veh) doc.text(veh, colRightX, y + 54)

  // ---------- Items table ----------
  const tableStartY = y + 130

  const rows = state.quote.items.map((it, idx) => [
    String(idx + 1),
    it.descripcion,
    String(it.cantidad),
    formatCLP(it.precioUnitario),
    formatCLP((it.cantidad || 0) * (it.precioUnitario || 0))
  ])

  autoTable(doc, {
    startY: tableStartY,
    head: [['#', 'Descripción', 'Cant.', 'Precio Unit.', 'Total']],
    body: rows,
    margin: { left: margin, right: margin },
    styles: {
      font: 'helvetica',
      fontSize: 10,
      cellPadding: 8,
      lineColor: [230, 230, 230],
      lineWidth: 0.4,
      textColor: [40, 40, 40]
    },
    headStyles: {
      fillColor: [232, 93, 4],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left'
    },
    alternateRowStyles: {
      fillColor: [249, 249, 249]
    },
    columnStyles: {
      0: { cellWidth: 32, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 50, halign: 'center' },
      3: { cellWidth: 90, halign: 'right' },
      4: { cellWidth: 90, halign: 'right', fontStyle: 'bold' }
    },
    foot: [[
      { content: 'TOTAL', colSpan: 4, styles: { halign: 'right', fillColor: [28, 28, 28], textColor: [255, 255, 255], fontStyle: 'bold' } },
      { content: formatCLP(total.value), styles: { halign: 'right', fillColor: [28, 28, 28], textColor: [255, 255, 255], fontStyle: 'bold' } }
    ]]
  })

  // ---------- Footer on every page ----------
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setDrawColor(232, 93, 4)
    doc.setLineWidth(1)
    doc.line(margin, pageHeight - 36, pageWidth - margin, pageHeight - 36)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(120, 120, 120)
    doc.text('Gracias por preferirnos — PitStop', margin, pageHeight - 22)
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, pageHeight - 22, { align: 'right' })
  }

  return doc
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
    total,
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
    formatFechaLarga
  }
}
