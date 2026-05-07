# PitStop

Aplicación web para generar cotizaciones profesionales de servicios automotrices con **registro persistente en cloud**.
Construida con **Vite + Vue 3 (Composition API) + Tailwind CSS** + **Vercel Functions** + **Neon Postgres**.

## Stack

- Vue 3 (`<script setup>`, Composition API)
- Vite 5
- Tailwind CSS 3 (dark mode exclusivo)
- jsPDF + jsPDF-AutoTable (PDF client-side)
- Vercel Serverless Functions (`/api`)
- Neon Postgres (vía Vercel Marketplace)
- Auth: password único compartido (env var)

## Características

- Stepper de 3 pasos (Cliente → Items → Finalizar)
- Generación de PDF profesional client-side
- Carga / guardado de cotizaciones en JSON
- Compartir por Web Share API o link con datos en hash
- **Historial cloud**: guarda cotizaciones en Postgres, lista, busca y abre desde cualquier dispositivo
- Mobile-first, dark mode, formato CLP

## 1. Setup local (sin cloud)

```bash
npm install
npm run dev
```

Abre http://localhost:5173. Las cotizaciones funcionan en local (descarga PDF, JSON, etc.) sin necesidad de la base de datos. El **historial cloud** sólo funciona cuando hay backend desplegado.

## 2. Deploy a Vercel + Neon

### a) Conectar el repo a Vercel

1. Ve a https://vercel.com/new
2. Importa el repositorio `andabarzua/pitstop`
3. Vercel detecta Vite automáticamente — Deploy

### b) Crear la base de datos Neon

1. En el proyecto en Vercel: **Storage → Create Database → Neon (Postgres)**
2. Acepta la integración. Vercel inyecta automáticamente las env vars `DATABASE_URL`, `POSTGRES_URL`, etc.
3. La tabla `quotes` se crea sola en la primera request (`CREATE TABLE IF NOT EXISTS`).

### c) Configurar la password de acceso

En **Settings → Environment Variables** del proyecto en Vercel:

| Variable       | Valor                                   |
|----------------|-----------------------------------------|
| `APP_PASSWORD` | (algo seguro, mínimo 12 caracteres)     |

Aplica a Production, Preview y Development.

### d) Re-deploy

Después de agregar la env var, haz **Redeploy** desde el dashboard (o pushea cualquier commit) para que las funciones tomen la nueva configuración.

## 3. Desarrollo local con cloud (opcional)

Si quieres testear el historial cloud en local:

```bash
npm install -g vercel
vercel link
vercel env pull .env.local
vercel dev
```

`vercel dev` levanta Vite + las funciones serverless en el mismo puerto (típicamente :3000), usando las env vars del proyecto remoto.

## 4. Endpoints del backend

| Método | Ruta                  | Descripción                       |
|--------|-----------------------|-----------------------------------|
| GET    | `/api/auth-check`     | Verifica la password              |
| GET    | `/api/quotes`         | Lista cotizaciones (resumen)      |
| POST   | `/api/quotes`         | Guarda/actualiza una cotización   |
| GET    | `/api/quotes/[id]`    | Trae una cotización completa      |
| DELETE | `/api/quotes/[id]`    | Elimina una cotización            |

Todas requieren el header `x-app-password: <APP_PASSWORD>`.

## 5. Estructura

```
pitstop/
├── api/
│   ├── _lib/
│   │   ├── auth.js            # Verificación de password
│   │   └── db.js              # Cliente Neon + schema
│   ├── auth-check.js
│   └── quotes/
│       ├── index.js           # GET, POST
│       └── [id].js            # GET, DELETE
├── public/
│   └── favicon.svg
├── src/
│   ├── main.js
│   ├── style.css
│   ├── App.vue
│   ├── components/
│   │   ├── StepIndicator.vue
│   │   ├── ClientForm.vue
│   │   ├── ItemsTable.vue
│   │   ├── AddItemModal.vue
│   │   ├── FinalStep.vue
│   │   ├── PdfViewer.vue
│   │   ├── PasswordGate.vue
│   │   └── HistoryView.vue
│   └── composables/
│       ├── useQuote.js        # Estado + PDF + cloud
│       └── useAuth.js         # Password gate
├── .env.example
├── vercel.json
├── tailwind.config.js
├── postcss.config.js
├── vite.config.js
├── package.json
└── README.md
```

## 6. Schema de la tabla `quotes`

```sql
CREATE TABLE quotes (
  id TEXT PRIMARY KEY,                  -- COT-YYYYMMDD-XXXX
  fecha DATE NOT NULL,
  cliente_nombre TEXT,
  cliente_apellido TEXT,
  patente TEXT,
  total INTEGER NOT NULL DEFAULT 0,     -- en pesos chilenos (entero)
  item_count INTEGER NOT NULL DEFAULT 0,
  data JSONB NOT NULL,                  -- payload completo de la cotización
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Índices automáticos por `fecha`, `patente` y `created_at`.

## 7. Costos

Stack completamente gratis para uso típico de un taller:

- **Vercel Hobby**: 100 GB bandwidth/mes, funciones ilimitadas (con límite de 100 GB-hours)
- **Neon Free**: 0.5 GB storage, ~190 horas compute/mes (la DB se duerme tras inactividad y despierta en ~1s)

Sólo necesitarías pagar si el taller hace miles de cotizaciones al mes.
