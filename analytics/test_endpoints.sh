#!/usr/bin/env bash
# ============================================================
# WelfareWatch Analytics Engine - Endpoint Test Script
# ============================================================
# Usage:
#   chmod +x test_endpoints.sh
#   ./test_endpoints.sh
#
# Requires: curl, bash
# ============================================================

BASE_URL="${ANALYTICS_BASE_URL:-http://localhost:3001}"
SECRET="${ENGINE_SECRET:-Ip6DWzGZkbhrwF38MKGv8kPLTLhAKQbOtZrCMi/j8jFlx/1Z9/jwfOY9ZbhxJUQLCPJzVqXKi1ROn7JPXItwhQ==}"

# Sample IDs from mock data
ANOMALY_ID="aaaaaaaa-0000-0000-0000-000000000001"
OFFICER_ID="11111111-0000-0000-0000-000000000006"
DISTRICT="Villupuram"
SCHEME_ID="PDS"

# Counters
PASS=0
FAIL=0
TOTAL=0

# ── Helper ───────────────────────────────────────────────────
test_endpoint() {
  local description="$1"
  local url="$2"
  local expect_auth="${3:-true}"

  TOTAL=$((TOTAL + 1))
  printf "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
  printf "TEST %02d: %s\n" "$TOTAL" "$description"
  printf "URL:  %s\n" "$url"
  printf "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"

  if [ "$expect_auth" = "false" ]; then
    HTTP_CODE=$(curl -s -o /tmp/analytics_response.json -w "%{http_code}" "$url")
  else
    HTTP_CODE=$(curl -s -o /tmp/analytics_response.json -w "%{http_code}" \
      -H "X-Engine-Secret: $SECRET" \
      -H "Content-Type: application/json" \
      "$url")
  fi

  if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
    printf "✅ PASS (HTTP %s)\n" "$HTTP_CODE"
    PASS=$((PASS + 1))
  else
    printf "❌ FAIL (HTTP %s)\n" "$HTTP_CODE"
    FAIL=$((FAIL + 1))
  fi

  # Pretty-print response (first 40 lines max)
  if command -v python3 &>/dev/null; then
    python3 -m json.tool /tmp/analytics_response.json 2>/dev/null | head -40
  elif command -v python &>/dev/null; then
    python -m json.tool /tmp/analytics_response.json 2>/dev/null | head -40
  else
    cat /tmp/analytics_response.json | head -c 2000
  fi
  echo ""
}

echo "============================================================"
echo "  WelfareWatch Analytics Engine - Endpoint Tests"
echo "  Base URL: $BASE_URL"
echo "============================================================"

# ═══════════════════════════════════════════════════════════════
# 1. HEALTH CHECK (no auth required)
# ═══════════════════════════════════════════════════════════════
test_endpoint \
  "Health Check" \
  "$BASE_URL/health" \
  "false"

# ═══════════════════════════════════════════════════════════════
# 2. DASHBOARD
# ═══════════════════════════════════════════════════════════════
test_endpoint \
  "Dashboard Overview (last 7 days)" \
  "$BASE_URL/api/analytics/dashboard/overview?days=7"

test_endpoint \
  "Dashboard Overview (date range)" \
  "$BASE_URL/api/analytics/dashboard/overview?start_date=2024-11-01&end_date=2024-11-30"

test_endpoint \
  "Dashboard Trends (last 30 days)" \
  "$BASE_URL/api/analytics/dashboard/trends?days=30"

test_endpoint \
  "Dashboard Trends (filtered by district & scheme)" \
  "$BASE_URL/api/analytics/dashboard/trends?days=30&district=$DISTRICT&scheme_id=$SCHEME_ID"

test_endpoint \
  "Dashboard District Summary" \
  "$BASE_URL/api/analytics/dashboard/district-summary?days=30"

test_endpoint \
  "Dashboard District Summary (filtered by scheme)" \
  "$BASE_URL/api/analytics/dashboard/district-summary?days=30&scheme_id=$SCHEME_ID"

# ═══════════════════════════════════════════════════════════════
# 3. ANOMALIES
# ═══════════════════════════════════════════════════════════════
test_endpoint \
  "Anomalies List (default)" \
  "$BASE_URL/api/analytics/anomalies?days=30"

test_endpoint \
  "Anomalies List (filtered: CRITICAL + PDS)" \
  "$BASE_URL/api/analytics/anomalies?severity=CRITICAL&scheme_id=PDS&page=1&limit=10"

test_endpoint \
  "Anomalies List (filtered: district + status)" \
  "$BASE_URL/api/analytics/anomalies?district=$DISTRICT&status=ASSIGNED&page=1&limit=10"

test_endpoint \
  "Anomalies List (filtered: detector_type + level)" \
  "$BASE_URL/api/analytics/anomalies?detector_type=NO_SPIKE&level=PINCODE"

test_endpoint \
  "Anomalies List (filtered: ai_classification)" \
  "$BASE_URL/api/analytics/anomalies?ai_classification=SUPPLY_FAILURE"

test_endpoint \
  "Anomalies Summary" \
  "$BASE_URL/api/analytics/anomalies/summary?days=30"

test_endpoint \
  "Anomalies Summary (filtered by district)" \
  "$BASE_URL/api/analytics/anomalies/summary?district=$DISTRICT&scheme_id=$SCHEME_ID"

test_endpoint \
  "Anomalies Heatmap" \
  "$BASE_URL/api/analytics/anomalies/heatmap?days=30"

test_endpoint \
  "Anomaly Detail by ID" \
  "$BASE_URL/api/analytics/anomalies/$ANOMALY_ID"

# ═══════════════════════════════════════════════════════════════
# 4. REPORTS
# ═══════════════════════════════════════════════════════════════
test_endpoint \
  "Reports List (default)" \
  "$BASE_URL/api/analytics/reports?days=30"

test_endpoint \
  "Reports List (filtered by district)" \
  "$BASE_URL/api/analytics/reports?district=$DISTRICT&page=1&limit=10"

test_endpoint \
  "Reports by District" \
  "$BASE_URL/api/analytics/reports/district/$DISTRICT?days=30"

# Note: Report ID is auto-generated, we fetch one dynamically
REPORT_ID=$(curl -s \
  -H "X-Engine-Secret: $SECRET" \
  -H "Content-Type: application/json" \
  "$BASE_URL/api/analytics/reports?days=365&limit=1" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data'][0]['id'])" 2>/dev/null)

if [ -n "$REPORT_ID" ]; then
  test_endpoint \
    "Report Detail by ID" \
    "$BASE_URL/api/analytics/reports/$REPORT_ID"

  test_endpoint \
    "Report PDF Download URL" \
    "$BASE_URL/api/analytics/reports/$REPORT_ID/pdf"
else
  echo ""
  echo "⚠️  Skipping Report Detail - no reports found to get an ID from."
  TOTAL=$((TOTAL + 1))
  FAIL=$((FAIL + 1))
fi

# ═══════════════════════════════════════════════════════════════
# 5. OFFICERS
# ═══════════════════════════════════════════════════════════════
test_endpoint \
  "Officers List (all)" \
  "$BASE_URL/api/analytics/officers"

test_endpoint \
  "Officers List (filtered by district)" \
  "$BASE_URL/api/analytics/officers?district=$DISTRICT"

test_endpoint \
  "Officer Detail by ID" \
  "$BASE_URL/api/analytics/officers/$OFFICER_ID"

test_endpoint \
  "Officer Actions (paginated)" \
  "$BASE_URL/api/analytics/officers/$OFFICER_ID/actions?days=30&page=1&limit=10"

# ═══════════════════════════════════════════════════════════════
# 6. BENEFICIARIES
# ═══════════════════════════════════════════════════════════════
test_endpoint \
  "Beneficiary Stats (group by district)" \
  "$BASE_URL/api/analytics/beneficiaries/stats?group_by=district"

test_endpoint \
  "Beneficiary Stats (group by scheme)" \
  "$BASE_URL/api/analytics/beneficiaries/stats?group_by=scheme_id"

test_endpoint \
  "Beneficiary Stats (group by gender)" \
  "$BASE_URL/api/analytics/beneficiaries/stats?group_by=gender"

test_endpoint \
  "Beneficiary Stats (group by block)" \
  "$BASE_URL/api/analytics/beneficiaries/stats?group_by=block"

test_endpoint \
  "Beneficiary Distribution (all)" \
  "$BASE_URL/api/analytics/beneficiaries/distribution"

test_endpoint \
  "Beneficiary Distribution (filtered by district)" \
  "$BASE_URL/api/analytics/beneficiaries/distribution?district=$DISTRICT"

test_endpoint \
  "Beneficiary Distribution (filtered by scheme)" \
  "$BASE_URL/api/analytics/beneficiaries/distribution?scheme_id=$SCHEME_ID"

test_endpoint \
  "Beneficiary Coverage" \
  "$BASE_URL/api/analytics/beneficiaries/coverage?days=30"

test_endpoint \
  "Beneficiary Coverage (filtered)" \
  "$BASE_URL/api/analytics/beneficiaries/coverage?district=$DISTRICT&scheme_id=$SCHEME_ID"

# ═══════════════════════════════════════════════════════════════
# 7. SCHEMES
# ═══════════════════════════════════════════════════════════════
test_endpoint \
  "All Schemes" \
  "$BASE_URL/api/analytics/schemes?days=30"

test_endpoint \
  "Scheme Detail - PDS" \
  "$BASE_URL/api/analytics/schemes/PDS?days=30"

test_endpoint \
  "Scheme Detail - PM_KISAN" \
  "$BASE_URL/api/analytics/schemes/PM_KISAN?days=30"

test_endpoint \
  "Scheme Detail - OLD_AGE_PENSION" \
  "$BASE_URL/api/analytics/schemes/OLD_AGE_PENSION?days=30"

test_endpoint \
  "Scheme Detail - LPG" \
  "$BASE_URL/api/analytics/schemes/LPG?days=30"

# ═══════════════════════════════════════════════════════════════
# 8. RESPONSES
# ═══════════════════════════════════════════════════════════════
test_endpoint \
  "Daily Responses (paginated)" \
  "$BASE_URL/api/analytics/responses/daily?days=30&page=1&limit=10"

test_endpoint \
  "Daily Responses (filtered)" \
  "$BASE_URL/api/analytics/responses/daily?district=$DISTRICT&scheme_id=$SCHEME_ID&page=1&limit=10"

test_endpoint \
  "Response Trends (30 days)" \
  "$BASE_URL/api/analytics/responses/trends?days=30"

test_endpoint \
  "Response Trends (filtered by district)" \
  "$BASE_URL/api/analytics/responses/trends?days=30&district=$DISTRICT"

test_endpoint \
  "Response Rejections" \
  "$BASE_URL/api/analytics/responses/rejections?days=30"

test_endpoint \
  "Response Rejections (filtered by scheme)" \
  "$BASE_URL/api/analytics/responses/rejections?scheme_id=$SCHEME_ID"

test_endpoint \
  "Response Baselines" \
  "$BASE_URL/api/analytics/responses/baselines"

test_endpoint \
  "Response Baselines (filtered)" \
  "$BASE_URL/api/analytics/responses/baselines?district=$DISTRICT&scheme_id=$SCHEME_ID"

# ═══════════════════════════════════════════════════════════════
# 9. AI USAGE & PERFORMANCE
# ═══════════════════════════════════════════════════════════════
test_endpoint \
  "AI Usage" \
  "$BASE_URL/api/analytics/ai/usage?days=30"

test_endpoint \
  "AI Performance" \
  "$BASE_URL/api/analytics/ai/performance?days=30"

test_endpoint \
  "AI Classification Accuracy" \
  "$BASE_URL/api/analytics/ai/classification-accuracy?days=30"

test_endpoint \
  "AI Classification Accuracy (filtered by scheme)" \
  "$BASE_URL/api/analytics/ai/classification-accuracy?scheme_id=$SCHEME_ID"

# ═══════════════════════════════════════════════════════════════
# 10. AUTH ERROR TESTS
# ═══════════════════════════════════════════════════════════════
printf "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
printf "TEST: Missing Auth Header (expect 401)\n"
printf "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
TOTAL=$((TOTAL + 1))
HTTP_CODE=$(curl -s -o /tmp/analytics_response.json -w "%{http_code}" \
  "$BASE_URL/api/analytics/dashboard/overview")
if [ "$HTTP_CODE" = "401" ]; then
  printf "✅ PASS - Correctly returned 401\n"
  PASS=$((PASS + 1))
else
  printf "❌ FAIL - Expected 401, got %s\n" "$HTTP_CODE"
  FAIL=$((FAIL + 1))
fi

printf "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
printf "TEST: Invalid Auth Secret (expect 403)\n"
printf "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
TOTAL=$((TOTAL + 1))
HTTP_CODE=$(curl -s -o /tmp/analytics_response.json -w "%{http_code}" \
  -H "X-Engine-Secret: wrong-secret" \
  "$BASE_URL/api/analytics/dashboard/overview")
if [ "$HTTP_CODE" = "403" ]; then
  printf "✅ PASS - Correctly returned 403\n"
  PASS=$((PASS + 1))
else
  printf "❌ FAIL - Expected 403, got %s\n" "$HTTP_CODE"
  FAIL=$((FAIL + 1))
fi

# ═══════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════
echo ""
echo "============================================================"
echo "  RESULTS: $PASS passed / $FAIL failed / $TOTAL total"
echo "============================================================"

# Cleanup
rm -f /tmp/analytics_response.json

exit $FAIL
