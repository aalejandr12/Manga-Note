const express = require('express');
const router = express.Router();
const webpush = require('web-push');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Configurar web-push con las claves VAPID
webpush.setVapidDetails(
  process.env.VAPID_EMAIL || 'mailto:admin@mangaread.local',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// GET /api/push/vapid-public-key - Obtener clave pública
router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// POST /api/push/subscribe - Guardar suscripción
router.post('/subscribe', async (req, res) => {
  try {
    const subscription = req.body;
    
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Suscripción inválida' });
    }
    
    // Guardar en base de datos usando query raw (ya que no tenemos modelo Prisma)
    await prisma.$executeRaw`
      INSERT INTO push_subscriptions (endpoint, keys_p256dh, keys_auth)
      VALUES (${subscription.endpoint}, ${subscription.keys.p256dh}, ${subscription.keys.auth})
      ON CONFLICT (endpoint) DO UPDATE 
      SET keys_p256dh = ${subscription.keys.p256dh}, 
          keys_auth = ${subscription.keys.auth}
    `;
    
    console.log('✅ Suscripción guardada:', subscription.endpoint.substring(0, 50) + '...');
    res.status(201).json({ success: true, message: 'Suscripción guardada' });
  } catch (error) {
    console.error('Error guardando suscripción:', error);
    res.status(500).json({ error: 'Error al guardar suscripción', message: error.message });
  }
});

// POST /api/push/unsubscribe - Eliminar suscripción
router.post('/unsubscribe', async (req, res) => {
  try {
    const { endpoint } = req.body;
    
    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint requerido' });
    }
    
    await prisma.$executeRaw`
      DELETE FROM push_subscriptions WHERE endpoint = ${endpoint}
    `;
    
    console.log('🗑️  Suscripción eliminada');
    res.json({ success: true, message: 'Suscripción eliminada' });
  } catch (error) {
    console.error('Error eliminando suscripción:', error);
    res.status(500).json({ error: 'Error al eliminar suscripción', message: error.message });
  }
});

// POST /api/push/send-notification - Enviar notificación a todos los suscritos
router.post('/send-notification', async (req, res) => {
  try {
    const { title, body, url, mangaId, icon } = req.body;
    
    console.log('📨 Recibiendo notificación:', { title, body, icon });
    
    // Obtener todas las suscripciones
    const subscriptions = await prisma.$queryRaw`
      SELECT * FROM push_subscriptions
    `;
    
    if (subscriptions.length === 0) {
      return res.json({ success: true, message: 'No hay suscriptores', sent: 0 });
    }
    
    const payload = JSON.stringify({
      title: title || '¡Nuevo capítulo disponible!',
      body: body || 'Hay nuevos capítulos para leer',
      url: url || '/upload/',
      mangaId: mangaId,
      icon: icon || '/upload/icon.svg',
      badge: '/upload/icon.svg',
      tag: mangaId ? `manga-${mangaId}` : 'manga-update'
    });
    
    let enviadas = 0;
    let errores = 0;
    
    // Enviar notificación a cada suscriptor
    for (const sub of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys_p256dh,
            auth: sub.keys_auth
          }
        };
        
        // Detectar si es Apple Push
        const isApplePush = sub.endpoint.includes('web.push.apple.com');
        
        // Opciones para web-push
        const options = {
          TTL: 60 * 60 * 24, // 24 horas
          urgency: 'high'
        };
        
        // Apple Push requiere headers específicos
        if (isApplePush) {
          options.headers = {
            'apns-topic': 'manga-updates',
            'apns-priority': '10',
            'apns-push-type': 'alert'
          };
          console.log('🍎 Enviando a Apple Push con headers especiales');
        }
        
        console.log('📤 Intentando enviar a:', sub.endpoint.substring(0, 50));
        console.log('   Opciones:', JSON.stringify(options, null, 2));
        
        await webpush.sendNotification(pushSubscription, payload, options);
        enviadas++;
        console.log('✅ Notificación enviada exitosamente');
      } catch (error) {
        console.error('❌ Error enviando notificación:');
        console.error('   Endpoint:', sub.endpoint.substring(0, 50));
        console.error('   Mensaje:', error.message);
        console.error('   Status Code:', error.statusCode);
        console.error('   Body:', error.body);
        console.error('   Headers:', error.headers);
        
        // Si el endpoint ya no es válido, eliminarlo
        if (error.statusCode === 410 || error.statusCode === 404) {
          await prisma.$executeRaw`
            DELETE FROM push_subscriptions WHERE endpoint = ${sub.endpoint}
          `;
          console.log('🗑️  Suscripción inválida eliminada');
        }
        errores++;
      }
    }
    
    console.log(`📬 Notificaciones enviadas: ${enviadas}, Errores: ${errores}`);
    res.json({ success: true, sent: enviadas, errors: errores });
  } catch (error) {
    console.error('Error enviando notificaciones:', error);
    res.status(500).json({ error: 'Error al enviar notificaciones', message: error.message });
  }
});

module.exports = router;
