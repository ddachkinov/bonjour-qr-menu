#!/bin/bash

set -e

echo "Setting up QR Menu SaaS development environment..."

if [ ! -f .env ]; then
  echo "Creating .env file from .env.example..."
  cp .env.example .env
  echo "Please update .env with your configuration"
fi

echo "Installing dependencies..."
npm install

echo "Building shared types..."
cd libs/shared-types
npm run build
cd ../..

echo "Starting Docker services..."
docker-compose up -d postgres redis

echo "Waiting for services to be ready..."
sleep 5

echo "Initializing database..."
docker-compose exec postgres psql -U postgres -d qrmenu_dev -f /docker-entrypoint-initdb.d/schema.sql || true

echo "Development environment setup complete!"
echo ""
echo "To start the development servers, run:"
echo "  npm run dev"
echo ""
echo "Services will be available at:"
echo "  API: http://localhost:3001"
echo "  Dashboard: http://localhost:3000"
echo "  Public Menu: http://localhost:3002"
