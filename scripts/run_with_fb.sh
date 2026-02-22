#!/usr/bin/env bash
set -e
if [ ! -f /tmp/fbsa.json ]; then
  echo "/tmp/fbsa.json not found. Extracting from .env"
  node -e "const fs=require('fs');const s=fs.readFileSync('.env','utf8');const i=s.indexOf('{');const j=s.lastIndexOf('}');if(i>=0&&j>i){fs.writeFileSync('/tmp/fbsa.json',JSON.stringify(JSON.parse(s.slice(i,j+1))));console.log('wrote /tmp/fbsa.json')}else{console.error('no json found in .env');process.exit(2)}"
fi
export FIREBASE_SERVICE_ACCOUNT="$(cat /tmp/fbsa.json)"
echo "FIREBASE_SERVICE_ACCOUNT length: $(echo -n "$FIREBASE_SERVICE_ACCOUNT" | wc -c)"
node -e 'console.log("FIREBASE_SERVICE_ACCOUNT present?", !!process.env.FIREBASE_SERVICE_ACCOUNT)'

npm run dev
