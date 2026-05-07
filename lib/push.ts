import webpush from 'web-push'
import { prisma } from './prisma'

function initVapid() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) return false
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:admin@bloster.app',
    pub,
    priv,
  )
  return true
}

export async function sendPushToAll(payload: { title: string; body: string; url?: string }) {
  if (!initVapid()) return []
  const subs = await prisma.pushSubscription.findMany()
  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
      ).catch(async (err) => {
        // Suscripción inválida o expirada → borrar
        if (err.statusCode === 404 || err.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } })
        }
        throw err
      })
    )
  )
  return results
}

export async function sendPushToUser(userId: string, payload: { title: string; body: string; url?: string }) {
  if (!initVapid()) return
  const subs = await prisma.pushSubscription.findMany({ where: { userId } })
  await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
      )
    )
  )
}
