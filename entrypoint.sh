#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma db push --accept-data-loss

echo "Starting Next.js..."
exec node server.js
