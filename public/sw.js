// DiagPV Audit - Service Worker v3.7
// Mode offline complet avec cache intelligent

const CACHE_NAME = 'diagpv-audit-v3.7'
const CACHE_URLS = [
  '/',
  '/index.html',
  '/audit.html',
  '/backup.html',
  '/static/diagpv-home.js',
  '/static/diagpv-audit.js',
  '/static/diagpv-sync.js',
  '/static/diagpv-measures.js',
  '/static/diagpv-json-importer.js',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js'
]

// Installation - Cache initial
self.addEventListener('install', (event) => {
  console.log('[SW] Installation...')
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Cache ouvert')
      return cache.addAll(CACHE_URLS.map(url => new Request(url, { cache: 'reload' })))
    }).catch(err => {
      console.error('[SW] Erreur cache installation:', err)
    })
  )
  self.skipWaiting()
})

// Activation - Nettoyage anciens caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Suppression ancien cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  return self.clients.claim()
})

// Fetch - Stratégie Cache First pour assets, Network First pour API
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  
  // Ignorer requêtes non-HTTP
  if (!event.request.url.startsWith('http')) {
    return
  }

  // Stratégie API: Network First avec fallback cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cloner pour cache
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone)
          })
          return response
        })
        .catch(() => {
          // Fallback cache si offline
          return caches.match(event.request)
        })
    )
    return
  }

  // Stratégie Assets: Cache First avec fallback network
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Retourner cache et updater en arrière-plan
        fetch(event.request).then((networkResponse) => {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse)
          })
        }).catch(() => {
          // Ignore erreurs réseau en arrière-plan
        })
        return cachedResponse
      }

      // Pas en cache, fetch network
      return fetch(event.request).then((response) => {
        // Cloner pour cache si succès
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone)
          })
        }
        return response
      }).catch(() => {
        // Offline et pas en cache
        if (event.request.destination === 'document') {
          return caches.match('/index.html')
        }
      })
    })
  )
})

// Message - Communication avec l'app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    const urls = event.data.urls || []
    caches.open(CACHE_NAME).then((cache) => {
      cache.addAll(urls)
    })
  }
})

// Sync - Synchronisation en arrière-plan
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-audits') {
    event.waitUntil(syncAuditsToCloud())
  }
})

async function syncAuditsToCloud() {
  try {
    // Récupérer audits à synchroniser depuis IndexedDB ou message
    // Cette fonction sera appelée automatiquement quand la connexion revient
    console.log('[SW] Synchronisation audits en arrière-plan...')
    
    // TODO: Implémenter logique sync automatique
    // const auditsToSync = await getUnsyncedAudits()
    // for (const audit of auditsToSync) {
    //   await fetch('/api/audits/sync', {
    //     method: 'POST',
    //     body: JSON.stringify(audit)
    //   })
    // }
    
    return Promise.resolve()
  } catch (error) {
    console.error('[SW] Erreur sync:', error)
    return Promise.reject(error)
  }
}

// Notification - Push notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  const title = data.title || 'DiagPV Audit'
  const options = {
    body: data.body || 'Nouvelle notification',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    data: data,
    actions: data.actions || []
  }
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  )
})

console.log('[SW] Service Worker chargé v3.7')
