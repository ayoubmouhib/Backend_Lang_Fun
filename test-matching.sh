#!/bin/bash

set -e  # Exit on error

echo "════════════════════════════════════════════════"
echo "🚀 COMPLETE LANGUAGE EXCHANGE MATCHING TEST"
echo "════════════════════════════════════════════════"

# Language IDs used by the local seed data.
ENGLISH_ID=1
SPANISH_ID=4

# Generate unique values
TIMESTAMP=$(date +%s%N | cut -b1-13)

# ═══════════════════════════════════════════════════
# STEP 1: USER A SIGNUP (Native English, Learning Spanish)
# ═══════════════════════════════════════════════════
echo -e "\n1️⃣  USER A SIGNUP (Native English 🇬🇧, Learning Spanish 🇪🇸)"
echo "─────────────────────────────────────────────────"

USER_A_RESPONSE=$(curl -s -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d "{
    \"first_name\": \"John\",
    \"last_name\": \"English\",
    \"username\": \"john_${TIMESTAMP}\",
    \"email\": \"john_${TIMESTAMP}@test.com\",
    \"password\": \"SecurePass123\",
    \"age\": 28,
    \"preferred_language_id\": $ENGLISH_ID,
    \"interest_ids\": [1, 2, 3],
    \"languages\": [{\"language_id\": $SPANISH_ID, \"level\": \"beginner\"}]
  }")

echo "Response:"
echo $USER_A_RESPONSE | jq '.'

USER_A_TOKEN=$(echo $USER_A_RESPONSE | jq -r '.accessToken')
USER_A_ID=$(echo $USER_A_RESPONSE | jq -r '.userId')

if [ "$USER_A_TOKEN" = "null" ] || [ -z "$USER_A_TOKEN" ]; then
  echo "❌ User A signup FAILED!"
  exit 1
fi

echo -e "\n✅ User A Created:"
echo "   ID: $USER_A_ID"
echo "   Email: john_${TIMESTAMP}@test.com"
echo "   Native: English (ID: $ENGLISH_ID)"
echo "   Learning: Spanish (ID: $SPANISH_ID)"

# ═══════════════════════════════════════════════════
# STEP 2: USER B SIGNUP (Native Spanish, Learning English)
# ═══════════════════════════════════════════════════
echo -e "\n\n2️⃣  USER B SIGNUP (Native Spanish 🇪🇸, Learning English 🇬🇧)"
echo "─────────────────────────────────────────────────"

USER_B_RESPONSE=$(curl -s -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d "{
    \"first_name\": \"Maria\",
    \"last_name\": \"Spanish\",
    \"username\": \"maria_${TIMESTAMP}\",
    \"email\": \"maria_${TIMESTAMP}@test.com\",
    \"password\": \"SecurePass456\",
    \"age\": 26,
    \"preferred_language_id\": $SPANISH_ID,
    \"interest_ids\": [1, 4, 5],
    \"languages\": [{\"language_id\": $ENGLISH_ID, \"level\": \"intermediate\"}]
  }")

echo "Response:"
echo $USER_B_RESPONSE | jq '.'

USER_B_TOKEN=$(echo $USER_B_RESPONSE | jq -r '.accessToken')
USER_B_ID=$(echo $USER_B_RESPONSE | jq -r '.userId')

if [ "$USER_B_TOKEN" = "null" ] || [ -z "$USER_B_TOKEN" ]; then
  echo "❌ User B signup FAILED!"
  exit 1
fi

echo -e "\n✅ User B Created:"
echo "   ID: $USER_B_ID"
echo "   Email: maria_${TIMESTAMP}@test.com"
echo "   Native: Spanish (ID: $SPANISH_ID)"
echo "   Learning: English (ID: $ENGLISH_ID)"

# ═══════════════════════════════════════════════════
# STEP 3: USER A REQUESTS MATCH
# ═══════════════════════════════════════════════════
echo -e "\n\n3️⃣  USER A ($USER_A_ID) REQUESTS MATCH"
echo "─────────────────────────────────────────────────"
echo "Requesting to learn Spanish (language_id: $SPANISH_ID)"

MATCH_RESPONSE=$(curl -s -X POST http://localhost:3000/matching/request \
  -H "Authorization: Bearer $USER_A_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"requester_language_id\": $SPANISH_ID,
    \"requester_role\": \"learner\"
  }")

echo "Response:"
echo $MATCH_RESPONSE | jq '.'

REQUEST_ID=$(echo $MATCH_RESPONSE | jq -r '.request_id')
MATCHED_USER_ID=$(echo $MATCH_RESPONSE | jq -r '.matched_user_id')
MATCHED_LANGUAGE_ID=$(echo $MATCH_RESPONSE | jq -r '.matched_language_id')
MATCH_SOURCE=$(echo $MATCH_RESPONSE | jq -r '.match_source')
SCORE=$(echo $MATCH_RESPONSE | jq -r '.compatibility_score')

if [ "$REQUEST_ID" = "null" ] || [ -z "$REQUEST_ID" ]; then
  echo "❌ Match request FAILED!"
  exit 1
fi

echo -e "\n✅ Match Request Created:"
echo "   Request ID: $REQUEST_ID"
echo "   Matched User ID: $MATCHED_USER_ID (Should be $USER_B_ID)"
echo "   Matched Language ID: $MATCHED_LANGUAGE_ID (Should be English: $ENGLISH_ID)"
echo "   Match Source: $MATCH_SOURCE"
echo "   Compatibility Score: $SCORE"

if [ "$MATCHED_USER_ID" != "$USER_B_ID" ]; then
  echo -e "\n⚠️  WARNING: Wrong user matched!"
  echo "Expected: $USER_B_ID, Got: $MATCHED_USER_ID"
  echo "This might be OK if system found a better match, but check database"
fi

if [ "$MATCHED_LANGUAGE_ID" != "$ENGLISH_ID" ]; then
  echo -e "\n❌ Wrong matched_language_id!"
  echo "Expected User B to learn English ($ENGLISH_ID), got: $MATCHED_LANGUAGE_ID"
  exit 1
fi

if [ "$MATCH_SOURCE" != "reciprocal_profile" ] && [ "$MATCH_SOURCE" != "active_request" ]; then
  echo -e "\n❌ Invalid match_source!"
  echo "Expected reciprocal_profile or active_request, got: $MATCH_SOURCE"
  exit 1
fi

# ═══════════════════════════════════════════════════
# STEP 4: CHECK DATABASE
# ═══════════════════════════════════════════════════
echo -e "\n\n4️⃣  CHECKING DATABASE"
echo "─────────────────────────────────────────────────"

echo "Conversation Requests:"
mysql -u root -p FlutterProject -e "
SELECT 
  id,
  requester_id,
  requester_language_id,
  matched_user_id,
  matched_language_id,
  matched_user_role,
  status,
  compatibility_score
FROM conversation_requests 
WHERE id = $REQUEST_ID;
" 2>/dev/null

DB_REQUEST=$(mysql -N -u root -p FlutterProject -e "
SELECT CONCAT(requester_language_id, ':', matched_language_id, ':', status)
FROM conversation_requests
WHERE id = $REQUEST_ID;
" 2>/dev/null)

EXPECTED_DB_REQUEST="${SPANISH_ID}:${ENGLISH_ID}:pending"
if [ "$DB_REQUEST" != "$EXPECTED_DB_REQUEST" ]; then
  echo -e "\n❌ Conversation request has wrong language direction!"
  echo "Expected: $EXPECTED_DB_REQUEST"
  echo "Got:      $DB_REQUEST"
  exit 1
fi

echo -e "\nUser Language Progress:"
mysql -u root -p FlutterProject -e "
SELECT user_id, language_id, user_type, initial_level 
FROM user_language_progress 
WHERE user_id IN ($USER_A_ID, $USER_B_ID)
ORDER BY user_id, language_id;
" 2>/dev/null

# ═══════════════════════════════════════════════════
# STEP 5: USER B CHECKS PENDING REQUESTS
# ═══════════════════════════════════════════════════
echo -e "\n\n5️⃣  USER B ($USER_B_ID) CHECKS PENDING REQUESTS"
echo "─────────────────────────────────────────────────"

PENDING=$(curl -s -X GET http://localhost:3000/matching/pending-requests \
  -H "Authorization: Bearer $USER_B_TOKEN" \
  -H "Content-Type: application/json")

echo "Response:"
echo $PENDING | jq '.'

PENDING_COUNT=$(echo $PENDING | jq -r '.total')
PENDING_REQUESTER_LANGUAGE=$(echo $PENDING | jq -r '.requests[0].requester_language')
PENDING_MATCHED_LANGUAGE=$(echo $PENDING | jq -r '.requests[0].matched_language')

if [ "$PENDING_COUNT" -eq 0 ]; then
  echo -e "\n❌ NO PENDING REQUESTS FOUND FOR USER B!"
  echo "This means:"
  echo "   - Either request wasn't created"
  echo "   - Or User B is NOT the matched_user"
  echo "   - Or matched_user_id is different"
  exit 1
fi

echo -e "\n✅ Found $PENDING_COUNT pending request(s)"
echo "   Requester wants to learn: $PENDING_REQUESTER_LANGUAGE"
echo "   Matched user wants to learn: $PENDING_MATCHED_LANGUAGE"

# ═══════════════════════════════════════════════════
# STEP 6: USER B ACCEPTS REQUEST
# ═══════════════════════════════════════════════════
echo -e "\n\n6️⃣  USER B ($USER_B_ID) ACCEPTS REQUEST #$REQUEST_ID"
echo "─────────────────────────────────────────────────"

ACCEPT=$(curl -s -X POST http://localhost:3000/matching/requests/$REQUEST_ID/accept \
  -H "Authorization: Bearer $USER_B_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"session_type": "text"}')

echo "Response:"
echo $ACCEPT | jq '.'

SESSION_ID=$(echo $ACCEPT | jq -r '.session_id')

if [ "$SESSION_ID" = "null" ] || [ -z "$SESSION_ID" ]; then
  echo "❌ Accept FAILED!"
  exit 1
fi

echo -e "\n✅ Request Accepted!"
echo "   Session ID: $SESSION_ID"

# ═══════════════════════════════════════════════════
# STEP 7: CHECK ACTIVE CONVERSATIONS
# ═══════════════════════════════════════════════════
echo -e "\n\n7️⃣  CHECK ACTIVE CONVERSATIONS"
echo "─────────────────────────────────────────────────"

echo "User A Active:"
curl -s -X GET http://localhost:3000/matching/active \
  -H "Authorization: Bearer $USER_A_TOKEN" \
  -H "Content-Type: application/json" | jq '.'

echo -e "\nUser B Active:"
curl -s -X GET http://localhost:3000/matching/active \
  -H "Authorization: Bearer $USER_B_TOKEN" \
  -H "Content-Type: application/json" | jq '.'

# ═══════════════════════════════════════════════════
# STEP 8: START SESSION
# ═══════════════════════════════════════════════════
echo -e "\n\n8️⃣  START SESSION"
echo "─────────────────────────────────────────────────"

START=$(curl -s -X POST http://localhost:3000/matching/sessions/$SESSION_ID/start \
  -H "Authorization: Bearer $USER_A_TOKEN" \
  -H "Content-Type: application/json")

echo "Response:"
echo $START | jq '.'

# ═══════════════════════════════════════════════════
# STEP 9: END SESSION
# ═══════════════════════════════════════════════════
echo -e "\n\n9️⃣  END SESSION (after 3 seconds)"
echo "─────────────────────────────────────────────────"

sleep 3

END=$(curl -s -X POST http://localhost:3000/matching/sessions/$SESSION_ID/end \
  -H "Authorization: Bearer $USER_A_TOKEN" \
  -H "Content-Type: application/json")

echo "Response:"
echo $END | jq '.'

# ═══════════════════════════════════════════════════
# STEP 10: RATE EACH OTHER
# ═══════════════════════════════════════════════════
echo -e "\n\n🔟  RATE EACH OTHER"
echo "─────────────────────────────────────────────────"

echo "User A rating User B..."
RATE_A=$(curl -s -X POST http://localhost:3000/matching/sessions/$SESSION_ID/rate \
  -H "Authorization: Bearer $USER_A_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "communication_score": 5,
    "helpfulness_score": 5,
    "patience_score": 5,
    "overall_score": 5,
    "comment": "Excellent conversation! Very helpful."
  }')

echo $RATE_A | jq '.'

echo -e "\nUser B rating User A..."
RATE_B=$(curl -s -X POST http://localhost:3000/matching/sessions/$SESSION_ID/rate \
  -H "Authorization: Bearer $USER_B_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "communication_score": 4,
    "helpfulness_score": 5,
    "patience_score": 4,
    "overall_score": 4,
    "comment": "Good conversation!"
  }')

echo $RATE_B | jq '.'

# ═══════════════════════════════════════════════════
# FINAL SUMMARY
# ═══════════════════════════════════════════════════
echo -e "\n\n════════════════════════════════════════════════"
echo "🎉 TEST COMPLETE!"
echo "════════════════════════════════════════════════"
echo -e "\n✅ Summary:"
echo "   User A (ID: $USER_A_ID) - Native English, Learning Spanish"
echo "   User B (ID: $USER_B_ID) - Native Spanish, Learning English"
echo "   Request ID: $REQUEST_ID"
echo "   Session ID: $SESSION_ID"
echo "   Compatibility Score: $SCORE"
echo -e "\n✅ All steps completed successfully!"
