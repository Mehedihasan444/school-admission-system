#!/bin/sh
# Regenerate runtime config from the API_BASE_URL env var so the browser
# reaches the API on a URL that works outside Docker (e.g. localhost:8080).
cat > /usr/share/nginx/html/config.js <<EOF
window.__CONFIG__ = { API_BASE_URL: "${API_BASE_URL:-http://localhost:8080}" };
EOF
