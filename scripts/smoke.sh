#!/usr/bin/env bash
# Smoke test: signs in as each demo role and checks that every page returns the expected status.
# Usage: BASE=http://localhost:3000 bash scripts/smoke.sh
set -u
BASE="${BASE:-http://localhost:3000}"
PASS="Marqova123!"
TMP=".smoke-tmp"; mkdir -p "$TMP"
fail=0

login() { # $1 = email, $2 = cookie jar
  local csrf
  csrf=$(curl -s -c "$2" -b "$2" "$BASE/api/auth/csrf" | sed -E 's/.*"csrfToken":"([^"]+)".*/\1/')
  curl -s -o /dev/null -c "$2" -b "$2" -X POST "$BASE/api/auth/callback/credentials" \
    -H "content-type: application/x-www-form-urlencoded" \
    --data-urlencode "csrfToken=$csrf" --data-urlencode "email=$1" --data-urlencode "password=$PASS" --data-urlencode "callbackUrl=$BASE/"
}

check() { # $1 = jar, $2 = path, $3 = expected code
  local code
  code=$(curl -s -o "$TMP/body" -w "%{http_code}" -b "$1" "$BASE$2")
  if [ "$code" != "$3" ]; then
    echo "FAIL $2 -> $code (expected $3)"
    fail=1
  else
    echo "ok   $2 $code"
  fi
}

GUEST="$TMP/guest"; touch "$GUEST"
SLUG=$(curl -s "$BASE/api/search/suggest?q=shirt" | sed -E 's/.*"slug":"([^"]+)".*/\1/')
for p in / /search "/search?q=linen&sort=price_asc" /c/fashion "/c/men-s-clothing?a_size=M" /deals "/p/$SLUG" /try-on /sell /compare /cart /login /register /legal/terms /legal/privacy /sitemap.xml /robots.txt /store/northline /sample/shirt.svg; do check "$GUEST" "$p" 200; done
check "$GUEST" /p/does-not-exist 404
check "$GUEST" /account 307
check "$GUEST" /seller 307
check "$GUEST" /admin 307

SHOP="$TMP/shopper"; login shopper@marqova.dev "$SHOP"
for p in /account /account/orders /account/wishlist /account/alerts /account/avatars /account/addresses /account/returns /account/messages /cart; do check "$SHOP" "$p" 200; done
check "$SHOP" /admin 307

SELL="$TMP/seller"; login seller@marqova.dev "$SELL"
for p in /seller /seller/listings "/seller/listings?tab=attention" /seller/listings/new /seller/listings/ai /seller/bulk /seller/inventory /seller/orders /seller/returns /seller/messages /seller/promotions /seller/analytics /seller/payouts /seller/api; do check "$SELL" "$p" 200; done
FIRST=$(curl -s -b "$SELL" "$BASE/seller/listings" | grep -oE '/seller/listings/c[a-z0-9]{20,}' | head -1)
[ -n "$FIRST" ] && check "$SELL" "$FIRST" 200

ADMIN="$TMP/admin"; login admin@marqova.dev "$ADMIN"
for p in /admin /admin/sellers /admin/listings "/admin/listings?view=all" /admin/reviews /admin/categories /admin/disputes /admin/homepage /admin/users /admin/jobs; do check "$ADMIN" "$p" 200; done

rm -rf "$TMP"
[ "$fail" = 0 ] && echo "ALL SMOKE CHECKS PASSED" || { echo "SMOKE CHECKS FAILED"; exit 1; }
