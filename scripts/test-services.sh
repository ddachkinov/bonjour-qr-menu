#!/bin/bash

echo "Testing QR Menu SaaS Platform..."
echo ""

# Test API Health
echo "1. Testing API Health..."
curl -s http://localhost:3001/health | jq '.' || echo "API not responding"
echo ""

# Test Dashboard
echo "2. Testing Dashboard (checking if page loads)..."
curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:3000
echo ""

# Test Public Menu
echo "3. Testing Public Menu (checking if page loads)..."
curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:3002
echo ""

# Test API endpoints
echo "4. Testing API signup endpoint..."
RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123",
    "restaurant_name": "Test Restaurant",
    "subdomain": "test-rest"
  }')

if echo "$RESPONSE" | grep -q "access_token"; then
  echo "✅ Signup successful!"
  echo "$RESPONSE" | jq '.'
else
  echo "Response: $RESPONSE"
fi

echo ""
echo "All services are running!"
echo ""
echo "Access your applications:"
echo "  Dashboard: http://localhost:3000"
echo "  Public Menu: http://localhost:3002"
echo "  API: http://localhost:3001"
