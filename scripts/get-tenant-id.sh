#!/bin/bash

# Get tenant ID for testing
# Usage: ./scripts/get-tenant-id.sh <email>

EMAIL="${1:-demo@restaurant.com}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-qrmenu_dev}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-password}"

echo "Fetching tenant ID for: $EMAIL"
echo ""

TENANT_ID=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
  SELECT t.id
  FROM tenants t
  JOIN users u ON u.tenant_id = t.id
  WHERE u.email = '$EMAIL'
  LIMIT 1;
" | tr -d ' ')

if [ -n "$TENANT_ID" ]; then
  echo "✅ Tenant ID: $TENANT_ID"
  echo ""
  echo "Export for testing:"
  echo "export TENANT_ID=$TENANT_ID"
  echo ""
  echo "Run tests:"
  echo "TENANT_ID=$TENANT_ID npm test"
else
  echo "❌ No tenant found for email: $EMAIL"
  exit 1
fi
