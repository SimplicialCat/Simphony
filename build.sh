#!/bin/bash
# Build script for gitpublish project
# Usage: ./build.sh

set -e  # Exit on error

echo "===================================="
echo "Building project with kodama..."
echo "===================================="
kodama build

echo ""
echo "===================================="
echo "Running insert-script.py..."
echo "===================================="
python insert-script.py

echo ""
echo "===================================="
echo "Build completed successfully!"
echo "===================================="
