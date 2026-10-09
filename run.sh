#!/usr/bin/env sh
# Rebuild everything, then verify. Usage: sh run.sh [walk|taxi|factory]
set -e
cd "$(dirname "$0")"
python3 src/gen.py
python3 src/page.py
python3 verify/verify.py "$@"
