#!/bin/bash

set -e

API_NAME="flashcards-api"
FUNCTION_NAME="flashcards-api"

echo "🔍 Debugging CORS Issue"
echo "════════════════════════════════════════════════════════════"
echo ""

# Get API ID
API_ID=$(aws apigatewayv2 get-apis --query "Items[?Name=='$API_NAME'].ApiId" --output text)

if [ -z "$API_ID" ]; then
    echo "❌ API not found!"
    exit 1
fi

echo "📋 API ID: $API_ID"
API_ENDPOINT="https://$API_ID.execute-api.us-east-1.amazonaws.com/prod"
echo "📋 API Endpoint: $API_ENDPOINT"
echo ""

# Check API Gateway CORS configuration
echo "════════════════════════════════════════════════════════════"
echo "1️⃣  API GATEWAY CORS CONFIGURATION"
echo "════════════════════════════════════════════════════════════"
aws apigatewayv2 get-api --api-id $API_ID --query 'CorsConfiguration' --output json | jq .
echo ""

# Check routes
echo "════════════════════════════════════════════════════════════"
echo "2️⃣  API GATEWAY ROUTES"
echo "════════════════════════════════════════════════════════════"
aws apigatewayv2 get-routes --api-id $API_ID --query 'Items[].[RouteKey,Target]' --output table
echo ""

# Check integrations
echo "════════════════════════════════════════════════════════════"
echo "3️⃣  API GATEWAY INTEGRATIONS"
echo "════════════════════════════════════════════════════════════"
aws apigatewayv2 get-integrations --api-id $API_ID --query 'Items[].[IntegrationId,IntegrationType,IntegrationUri]' --output table
echo ""

# Test actual OPTIONS request
echo "════════════════════════════════════════════════════════════"
echo "4️⃣  ACTUAL OPTIONS REQUEST TEST"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Testing: curl -X OPTIONS $API_ENDPOINT/data"
echo "With Origin: http://localhost:5173"
echo ""

RESPONSE=$(curl -X OPTIONS "$API_ENDPOINT/data" \
    -H "Origin: http://localhost:5173" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: content-type,authorization" \
    -i -s)

echo "$RESPONSE"
echo ""

# Parse response
STATUS=$(echo "$RESPONSE" | grep "HTTP/" | awk '{print $2}')
ALLOW_ORIGIN=$(echo "$RESPONSE" | grep -i "access-control-allow-origin" || echo "NOT FOUND")
ALLOW_METHODS=$(echo "$RESPONSE" | grep -i "access-control-allow-methods" || echo "NOT FOUND")
ALLOW_HEADERS=$(echo "$RESPONSE" | grep -i "access-control-allow-headers" || echo "NOT FOUND")

echo "════════════════════════════════════════════════════════════"
echo "5️⃣  RESPONSE ANALYSIS"
echo "════════════════════════════════════════════════════════════"
echo "Status Code: $STATUS"
echo "Allow-Origin: $ALLOW_ORIGIN"
echo "Allow-Methods: $ALLOW_METHODS"
echo "Allow-Headers: $ALLOW_HEADERS"
echo ""

# Check Lambda logs
echo "════════════════════════════════════════════════════════════"
echo "6️⃣  RECENT LAMBDA LOGS (last 5 minutes)"
echo "════════════════════════════════════════════════════════════"
aws logs tail /aws/lambda/$FUNCTION_NAME --since 5m --format short | tail -20
echo ""

# Diagnosis
echo "════════════════════════════════════════════════════════════"
echo "🔬 DIAGNOSIS"
echo "════════════════════════════════════════════════════════════"

if [ "$STATUS" = "200" ]; then
    echo "✅ OPTIONS request returns 200"
else
    echo "❌ OPTIONS request returns $STATUS (should be 200)"
fi

if echo "$ALLOW_ORIGIN" | grep -q "NOT FOUND"; then
    echo "❌ Missing Access-Control-Allow-Origin header"
else
    echo "✅ Access-Control-Allow-Origin header present"
fi

if echo "$ALLOW_METHODS" | grep -q "NOT FOUND"; then
    echo "❌ Missing Access-Control-Allow-Methods header"
else
    echo "✅ Access-Control-Allow-Methods header present"
fi

if echo "$ALLOW_HEADERS" | grep -q "NOT FOUND"; then
    echo "❌ Missing Access-Control-Allow-Headers header"
else
    echo "✅ Access-Control-Allow-Headers header present"
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "💡 LIKELY ISSUE"
echo "════════════════════════════════════════════════════════════"

if echo "$RESPONSE" | grep -q "Missing Authentication Token"; then
    echo "⚠️  API Gateway is returning 'Missing Authentication Token'"
    echo "   This means the OPTIONS route might not exist or isn't configured correctly"
    echo ""
    echo "   Solution: The OPTIONS route needs to be added to API Gateway"
elif [ "$STATUS" != "200" ]; then
    echo "⚠️  OPTIONS request not returning 200"
    echo "   Lambda might not be handling OPTIONS correctly"
elif echo "$ALLOW_ORIGIN" | grep -q "NOT FOUND"; then
    echo "⚠️  CORS headers missing from response"
    echo "   Lambda is not adding CORS headers, or API Gateway is not passing them through"
else
    echo "✅ Everything looks correct! The issue might be:"
    echo "   1. Browser caching old responses (try hard refresh)"
    echo "   2. A different endpoint is being called"
    echo "   3. The error is from a different request (GET/POST, not OPTIONS)"
fi

echo ""
echo "════════════════════════════════════════════════════════════"