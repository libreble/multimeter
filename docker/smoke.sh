#!/bin/sh
# Smoke-test a running image: ./docker/smoke.sh http://localhost:8080/
set -eu
url="${1:-http://localhost:8080/}"
origin=$(printf '%s' "$url" | sed -E 's#(https?://[^/]+).*#\1#')
fail() { echo "FAIL: $*" >&2; exit 1; }

for i in $(seq 1 30); do curl -fs "$origin/healthz" >/dev/null && break; sleep 1; done
curl -fsS "$origin/healthz" | grep -q ok || fail healthz

html=$(curl -fsS "$url") || fail "index at $url"
echo "$html" | grep -q '<div id="root"' || fail "no #root in index"

# Every asset the page references must resolve.
for a in $(echo "$html" | grep -oE '(src|href)="[^"]+\.(js|css|svg|png|webmanifest)"' | sed -E 's/^[a-z]+="//; s/"$//' | grep -v '^http'); do
  case "$a" in /*) u="$origin$a" ;; *) u="$url$a" ;; esac
  curl -fsS -o /dev/null "$u" || fail "asset $u"
done

curl -fsS "${url}sw.js" | grep -q . || fail sw.js
curl -fsSI "${url}manifest.webmanifest" | grep -qi 'content-type: application/manifest+json' || fail "manifest content-type"
curl -fsS "${url}some/deep/link" | grep -q '<div id="root"' || fail "SPA fallback"
echo "smoke OK: $url"
