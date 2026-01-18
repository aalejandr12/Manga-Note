// Service Worker para notificaciones push
const CACHE_NAME = 'manga-read-v1';

// Instalación del service worker
self.addEventListener('install', (event) => {
  console.log('Service Worker instalado');
  self.skipWaiting();
});

// Activación del service worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker activado');
  event.waitUntil(clients.claim());
});

// Manejar notificaciones push
self.addEventListener('push', (event) => {
  console.log('Notificación push recibida');
  
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Nuevo capítulo disponible', body: event.data.text() };
    }
  }
  
  const options = {
    body: data.body || 'Hay nuevos capítulos disponibles',
    icon: data.icon || '/upload/icon.svg',
    badge: '/upload/icon.svg',
    data: {
      url: data.url || '/upload/',
      mangaId: data.mangaId
    },
    tag: data.tag || 'manga-update',
    // iOS ignora: vibrate, actions (botones), image, requireInteraction
    // Solo muestra: title, body, icon básico
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || '¡Nuevo capítulo!', options)
  );
});

// Manejar clics en notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('Notificación clickeada:', event.action);
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  // Abrir o enfocar la página
  const urlToOpen = event.notification.data.url || '/upload/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Si ya hay una ventana abierta, enfocarla
        for (let client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Si no, abrir una nueva
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Sincronización en segundo plano (opcional para el futuro)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-mangas') {
    event.waitUntil(syncMangas());
  }
});

async function syncMangas() {
  console.log('Sincronizando mangas en segundo plano...');
  // Aquí podrías hacer fetch a la API para verificar actualizaciones
}
