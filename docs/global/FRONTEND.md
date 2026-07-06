# FRONTEND — Implementation Conventions

## Module Structure

```
src/
  features/
    auth/
    expense/
    recipe/
    todo/
    grocery/
    household/
    agent/               # Chat UI, conversation list, message components
  api/
    client.ts            # Axios instance, interceptors, token refresh
    types.ts             # ApiResponse<T>, PaginatedResponse<T>, ApiError
  shared/                # UI primitives, hooks, utils
  router/                # Route definitions
  service-worker.ts      # Workbox service worker (PWA)
public/
  manifest.json          # PWA manifest
  icons/                 # 192x192.png, 512x512.png
index.html               # PWA meta tags
vite.config.ts           # VitePWA plugin, @/ alias, proxy
.eslintrc.cjs            # ESLint config
.prettierrc              # Prettier config
Dockerfile               # Multi-stage: node build → nginx serve
nginx.conf               # SPA fallback, API proxy
package.json
```

## 1. API Client (`src/api/client.ts`)

```typescript
const api = axios.create({ baseURL: '/api/v1' })

// Request: attach Bearer token from in-memory store
api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response: unwrap envelope, handle 401 with refresh
api.interceptors.response.use(
  (res) => res.data.data,           // unwrap success envelope
  async (err) => {
    if (err.response?.status === 401) {
      try {
        await refreshToken()        // call /auth/refresh
        return api.request(err.config)  // retry original
      } catch {
        redirectToLogin()
      }
    }
    throw err.response?.data?.error  // structured ApiError
  }
)
```

- **Access token** lives in a JS variable (in-memory, lost on tab close).
- **Refresh token** lives in an `httpOnly` cookie (set by backend on login/refresh).
- `refreshToken()` calls `POST /api/v1/auth/refresh`, receives new access token.
- On successful refresh, the original failed request is retried transparently.

## 2. API Types (`src/api/types.ts`)

```typescript
export interface ApiResponse<T> {
  success: true
  data: T
  error: null
}

export interface ApiError {
  code: string
  message: string
}

export interface ApiErrorResponse {
  success: false
  data: null
  error: ApiError
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  pages: number
}
```

## 3. Vite Configuration (`vite.config.ts`)

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'LIFEY',
        short_name: 'LIFEY',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#000000',
        icons: [
          { src: '/icons/192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          { urlPattern: /^\/api\/v1\//, handler: 'NetworkFirst' },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    proxy: {
      '/api/v1': 'http://backend:8000',
    },
  },
})
```

## 4. PWA Setup

### manifest.json (`public/manifest.json`)

- `name`: "LIFEY"
- `short_name`: "LIFEY"
- `start_url`: "/"
- `display`: "standalone"
- `background_color` and `theme_color` set
- Icons at 192x192 and 512x512

### Service Worker (`src/service-worker.ts`)

Managed by `vite-plugin-pwa`. Strategy:
- **Static assets:** Cache-first (workbox `globPatterns`).
- **API calls (`/api/v1/`):** Network-first (workbox `runtimeCaching`).
- **Offline fallback:** A basic cached offline page if the user has no network.

### index.html

```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#000000">
<meta name="apple-mobile-web-app-capable" content="yes">
```

## 5. Dockerfile

Multi-stage build with nginx serve:

```dockerfile
# Stage 1: build SPA
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: serve with nginx
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
```

## 6. nginx Configuration (`nginx.conf`)

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # SPA fallback — route all non-file requests to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy to backend
    location /api/v1/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 7. Linting & Formatting

### .eslintrc.cjs

```javascript
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/strict-type-checked',
  ],
  parserOptions: {
    project: true,
    tsconfigRootDir: __dirname,
  },
  rules: {
    'import/no-default-export': 'error',
  },
}
```

### .prettierrc

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100
}
```
