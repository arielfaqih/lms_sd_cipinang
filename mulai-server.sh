#!/bin/sh
# Menjalankan LMS IPA di Linux/macOS
cd "$(dirname "$0")"
command -v node >/dev/null 2>&1 || { echo "Node.js belum terpasang. Lihat PANDUAN.md bagian 2."; exit 1; }
PORT=${PORT:-3000} node server.js
