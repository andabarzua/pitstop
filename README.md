# PitStop

Aplicación web para generar cotizaciones profesionales de servicios automotrices.
Construida con **Vite + Vue 3 (Composition API) + Tailwind CSS**. Lista para desplegar en **Vercel**.

## Stack

- Vue 3 (`<script setup>`, Composition API)
- Vite 5
- Tailwind CSS 3 (dark mode exclusivo)
- jsPDF + jsPDF-AutoTable (PDF client-side)
- html2canvas
- Web Share API + fallback a copia de link

## Características

- Stepper de 3 pasos (Cliente → Items → Finalizar) con transiciones slide.
- Generación de PDF profesional con header oscuro, datos del cliente, tabla de items y totales.
- Carga / guardado de cotizaciones en formato JSON editable.
- Compartir por Web Share API o fallback a link con datos en hash (`#cot=...`).
- Mobile-first: bottom sheets, FAB, safe-area insets, inputs ≥ 16px (sin zoom iOS).
- Persistencia local automática (localStorage) durante la sesión.
- Formato de moneda chilena (`Intl.NumberFormat('es-CL', { currency: 'CLP' })`).

## Setup

```bash
npm install
npm run dev
```

Abrir http://localhost:5173

## Build

```bash
npm run build
npm run preview   # opcional, sirve la build localmente
```

El output queda en `dist/`.

## Deploy en Vercel

Opción A — repositorio:

1. Push del proyecto a GitHub/GitLab/Bitbucket.
2. En Vercel: **New Project** → seleccionar el repositorio → Deploy.
3. Framework detectado automáticamente como Vite.

Opción B — CLI:

```bash
npm install -g vercel
vercel --prod
```

El archivo `vercel.json` ya incluye el rewrite SPA para que las rutas se sirvan desde `index.html`.

## Estructura

```
pitstop/
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── package.json
├── vercel.json
├── public/
│   └── favicon.svg
└── src/
    ├── main.js
    ├── style.css
    ├── App.vue
    ├── components/
    │   ├── StepIndicator.vue
    │   ├── ClientForm.vue
    │   ├── ItemsTable.vue
    │   ├── AddItemModal.vue
    │   ├── FinalStep.vue
    │   └── PdfViewer.vue
    └── composables/
        └── useQuote.js
```

## Formato del JSON

```json
{
  "version": "1.0",
  "id": "COT-20241215-0042",
  "fecha": "2024-12-15",
  "cliente": {
    "nombre": "", "apellido": "",
    "patente": "", "marca": "", "modelo": "", "anio": "",
    "telefono": "", "email": ""
  },
  "items": [
    { "id": "uuid", "descripcion": "", "cantidad": 1, "precioUnitario": 0, "total": 0 }
  ],
  "totales": { "subtotal": 0, "total": 0 }
}
```

## Diseño

- Fondo `#0A0A0A`, superficies `#141414` / `#1C1C1C`.
- Acento naranja quemado `#E85D04` / `#F48C06`.
- Tipografía: **Barlow Condensed** (700/900) para títulos y números, **DM Sans** (400/500/700) para cuerpo.
- Glow naranja sutil en estados activos, transiciones de 200 ms.
