#!/bin/bash

# Run database migrations for QR Menu SaaS
# Usage: ./scripts/run-migration.sh <migration-file>

set -e

MIGRATION_FILE="${1:-api/src/db/migrations/001_add_waiters_table.sql}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-qrmenu_dev}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-password}"

echo "Running migration: $MIGRATION_FILE"
echo "Database: $DB_NAME @ $DB_HOST:$DB_PORT"
echo ""

# Run the migration
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Migration completed successfully!"
else
  echo ""
  echo "❌ Migration failed!"
  exit 1
fi
