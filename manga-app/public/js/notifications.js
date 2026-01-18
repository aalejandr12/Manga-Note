// notifications.js - Sistema de notificaciones push
let registration = null;
let notificationsEnabled = false;

// Verificar si el navegador soporta notificaciones
function soportaNotificaciones() {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

// Registrar el service worker
async function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Worker no soportado');
    return null;
  }
  
  try {
    registration = await navigator.serviceWorker.register(`${BASE_PATH}/service-worker.js`);
    console.log('✅ Service Worker registrado');
    return registration;
  } catch (error) {
    console.error('❌ Error registrando Service Worker:', error);
    return null;
  }
}

// Solicitar permiso para notificaciones
async function solicitarPermisoNotificaciones() {
  if (!soportaNotificaciones()) {
    console.log('Notificaciones no soportadas');
    return false;
  }
  
  try {
    const permission = await Notification.requestPermission();
    notificationsEnabled = permission === 'granted';
    
    if (notificationsEnabled) {
      console.log('✅ Permiso de notificaciones concedido');
      localStorage.setItem('notifications_enabled', 'true');
      
      // Suscribirse a notificaciones push
      await suscribirseAPush();
    } else {
      console.log('❌ Permiso de notificaciones denegado');
      localStorage.setItem('notifications_enabled', 'false');
    }
    
    return notificationsEnabled;
  } catch (error) {
    console.error('Error solicitando permiso:', error);
    return false;
  }
}

// Suscribirse a notificaciones push
async function suscribirseAPush() {
  try {
    if (!registration) {
      await registrarServiceWorker();
    }
    
    if (!registration) {
      console.error('No hay service worker registrado');
      return false;
    }
    
    // Obtener clave pública del servidor
    const response = await fetch(`${BASE_PATH}/api/push/vapid-public-key`);
    const { publicKey } = await response.json();
    
    // Suscribirse
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });
    
    // Enviar suscripción al servidor
    await fetch(`${BASE_PATH}/api/push/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(subscription)
    });
    
    console.log('✅ Suscrito a notificaciones push');
    return true;
  } catch (error) {
    console.error('Error suscribiéndose:', error);
    return false;
  }
}

// Convertir clave VAPID de base64 a Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Verificar estado de notificaciones
function verificarEstadoNotificaciones() {
  if (!soportaNotificaciones()) {
    return 'no-soportado';
  }
  
  if (Notification.permission === 'granted') {
    notificationsEnabled = true;
    return 'activado';
  } else if (Notification.permission === 'denied') {
    return 'denegado';
  } else {
    return 'pendiente';
  }
}

// Mostrar notificación local (para pruebas)
async function mostrarNotificacionLocal(titulo, opciones = {}) {
  if (!notificationsEnabled || !registration) {
    console.log('Notificaciones no habilitadas');
    return;
  }
  
  try {
    const options = {
      body: opciones.body || 'Hay nuevos capítulos disponibles',
      icon: opciones.icon || `${BASE_PATH}/icon.svg`,
      badge: `${BASE_PATH}/icon.svg`,
      vibrate: [200, 100, 200],
      data: {
        url: opciones.url || `${BASE_PATH}/`,
        mangaId: opciones.mangaId
      },
      actions: [
        { action: 'open', title: 'Ver ahora' },
        { action: 'close', title: 'Cerrar' }
      ],
      tag: opciones.tag || 'manga-update',
      requireInteraction: true,
      ...opciones
    };
    
    await registration.showNotification(titulo, options);
    console.log('✅ Notificación mostrada');
  } catch (error) {
    console.error('❌ Error mostrando notificación:', error);
  }
}

// Enviar notificación de nuevos capítulos
async function notificarNuevosCapitulos(manga) {
  const titulo = `¡${manga.titulo} actualizado!`;
  const body = `Nuevos capítulos disponibles: ${manga.capitulosDisponibles}`;
  const url = `${window.location.origin}${BASE_PATH}/detalle.html?id=${manga.id}`;
  
  await mostrarNotificacionLocal(titulo, {
    body: body,
    tag: `manga-${manga.id}`,
    url: url,
    mangaId: manga.id
  });
}

// Inicializar sistema de notificaciones
async function inicializarNotificaciones() {
  console.log('🔔 Inicializando sistema de notificaciones...');
  
  // Registrar service worker
  await registrarServiceWorker();
  
  // Verificar estado
  const estado = verificarEstadoNotificaciones();
  console.log(`Estado de notificaciones: ${estado}`);
  
  // Si ya estaban activadas, restaurar estado
  if (estado === 'activado') {
    notificationsEnabled = true;
  }
  
  return estado;
}

// Botón para activar/desactivar notificaciones
function crearBotonNotificaciones() {
  const estado = verificarEstadoNotificaciones();
  
  if (!soportaNotificaciones()) {
    return null;
  }
  
  const boton = document.createElement('button');
  boton.id = 'notification-toggle';
  boton.className = 'fixed bottom-20 right-4 z-50 p-3 rounded-full shadow-lg transition-all duration-300';
  
  const actualizar = () => {
    const estadoActual = verificarEstadoNotificaciones();
    
    if (estadoActual === 'activado') {
      boton.className = 'fixed bottom-20 right-4 z-50 p-3 rounded-full shadow-lg transition-all duration-300 bg-pink-500 hover:bg-pink-600 text-white';
      boton.innerHTML = '<span class="material-symbols-outlined">notifications_active</span>';
      boton.title = 'Notificaciones activadas';
    } else if (estadoActual === 'denegado') {
      boton.className = 'fixed bottom-20 right-4 z-50 p-3 rounded-full shadow-lg transition-all duration-300 bg-gray-600 hover:bg-gray-700 text-white';
      boton.innerHTML = '<span class="material-symbols-outlined">notifications_off</span>';
      boton.title = 'Notificaciones bloqueadas - Habilítalas en la configuración del navegador';
    } else {
      boton.className = 'fixed bottom-20 right-4 z-50 p-3 rounded-full shadow-lg transition-all duration-300 bg-blue-500 hover:bg-blue-600 text-white animate-pulse';
      boton.innerHTML = '<span class="material-symbols-outlined">notifications</span>';
      boton.title = 'Click para activar notificaciones';
    }
  };
  
  actualizar();
  
  boton.addEventListener('click', async () => {
    const estadoActual = verificarEstadoNotificaciones();
    
    if (estadoActual === 'denegado') {
      alert('Las notificaciones están bloqueadas. Por favor, habilítalas en la configuración de tu navegador.');
      return;
    }
    
    if (estadoActual === 'pendiente') {
      const concedido = await solicitarPermisoNotificaciones();
      if (concedido) {
        actualizar();
        // Mostrar notificación de prueba
        setTimeout(() => {
          mostrarNotificacionLocal('¡Notificaciones activadas!', {
            body: 'Recibirás alertas cuando haya nuevos capítulos',
            tag: 'test-notification'
          });
        }, 500);
      } else {
        actualizar();
      }
    }
  });
  
  return boton;
}

// Exportar funciones
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    inicializarNotificaciones,
    solicitarPermisoNotificaciones,
    mostrarNotificacionLocal,
    notificarNuevosCapitulos,
    verificarEstadoNotificaciones,
    crearBotonNotificaciones,
    soportaNotificaciones
  };
}
