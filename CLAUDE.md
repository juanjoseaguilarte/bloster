# Bloster – Instrucciones para Claude

## Idioma
Responde siempre en **español**.

## Proyecto
App de gestión de turnos para restaurante. Stack: Next.js 14 App Router, TypeScript, Tailwind CSS, Prisma + PostgreSQL (Supabase), NextAuth v4.

## Despliegue
- Plataforma: Vercel + Supabase
- Rama principal: `main` → auto-deploy en Vercel
- Comando de build: `prisma generate && prisma migrate deploy && next build`
