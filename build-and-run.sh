#!/bin/bash

echo "=============================================="
echo "VidyaSetu - Clean, Build, and Run Script"
echo "=============================================="

echo ""
echo "[1/4] Cleaning previous builds (.next folder)..."
if [ -d ".next" ]; then
    rm -rf .next
    echo "  - Cleaned .next directory."
else
    echo "  - No .next directory found."
fi

echo ""
echo "[2/4] Generating Prisma Client..."
npx prisma generate
if [ $? -ne 0 ]; then
    echo "  - ERROR: Prisma generation failed!"
    exit 1
fi

echo ""
echo "[3/4] Building Next.js Application..."
npm run build
if [ $? -ne 0 ]; then
    echo "  - ERROR: Next.js build failed!"
    exit 1
fi

echo ""
echo "[4/4] Starting the Application in Production Mode..."
npm run start
