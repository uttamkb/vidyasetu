#!/bin/bash

# ==============================================================================
# VidyaSetu Secret Setup Script
# ==============================================================================
# This script uploads your local environment variables to GCP Secret Manager.

PROJECT_ID="vidyasetu-495001"
REGION="us-east1"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Uploading secrets to Project: ${PROJECT_ID}${NC}"

function create_secret() {
    local name=$1
    local value=$2

    echo -n "Setting secret $name... "
    
    # Check if secret exists
    gcloud secrets describe $name --project=$PROJECT_ID > /dev/null 2>&1
    if [ $? -ne 0 ]; then
        gcloud secrets create $name --replication-policy="automatic" --project=$PROJECT_ID
    fi

    # Add version
    echo -n "$value" | gcloud secrets versions add $name --data-file=- --project=$PROJECT_ID
    
    # Grant access to the Cloud Run service account
    # By default, Cloud Run uses the Compute Engine default service account
    PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
    gcloud secrets add-iam-policy-binding $name \
        --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
        --role="roles/secretmanager.secretAccessor" \
        --project=$PROJECT_ID > /dev/null
    
    echo -e "${GREEN}Done${NC}"
}

# --- 1. Neon Database URL ---
NEON_DB_URL="postgresql://neondb_owner:npg_N3ZcA4SWzsIG@ep-plain-math-amxix52z-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
create_secret "DATABASE_URL" "$NEON_DB_URL"

# --- 2. Other Secrets ---
# If you have these in your .env.local, you can automate them.
# For now, I will create placeholders or you can run this script with values.

# Example: read from .env.local if it exists
if [ -f .env.local ]; then
    echo -e "${BLUE}Reading additional secrets from .env.local...${NC}"
    # Extract values (basic parsing)
    AUTH_SECRET=$(grep "^AUTH_SECRET=" .env.local | cut -d'=' -f2- | tr -d '"')
    GEMINI_API_KEY=$(grep "^GEMINI_API_KEY=" .env.local | cut -d'=' -f2- | tr -d '"')
    AUTH_GOOGLE_ID=$(grep "^AUTH_GOOGLE_ID=" .env.local | cut -d'=' -f2- | tr -d '"')
    AUTH_GOOGLE_SECRET=$(grep "^AUTH_GOOGLE_SECRET=" .env.local | cut -d'=' -f2- | tr -d '"')

    [ ! -z "$AUTH_SECRET" ] && create_secret "AUTH_SECRET" "$AUTH_SECRET"
    [ ! -z "$GEMINI_API_KEY" ] && create_secret "GEMINI_API_KEY" "$GEMINI_API_KEY"
    [ ! -z "$AUTH_GOOGLE_ID" ] && create_secret "AUTH_GOOGLE_ID" "$AUTH_GOOGLE_ID"
    [ ! -z "$AUTH_GOOGLE_SECRET" ] && create_secret "AUTH_GOOGLE_SECRET" "$AUTH_GOOGLE_SECRET"
else
    echo -e "${BLUE}No .env.local found. Please ensure you create the following secrets manually or update this script:${NC}"
    echo "- AUTH_SECRET"
    echo "- GEMINI_API_KEY"
    echo "- AUTH_GOOGLE_ID"
    echo "- AUTH_GOOGLE_SECRET"
fi

echo -e "${GREEN}Secret setup complete!${NC}"
