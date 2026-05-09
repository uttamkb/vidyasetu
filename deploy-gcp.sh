#!/bin/bash

# ==============================================================================
# VidyaSetu GCP Deployment Script
# ==============================================================================
# This script automates the build, push, and deployment of VidyaSetu to Cloud Run.

# Configuration
PROJECT_ID="vidyasetu-495001"
REGION="us-east1" # Changed to match Neon DB region for lower latency
REPO_NAME="vidyasetu-repo"
IMAGE_NAME="vidyasetu-app"
SERVICE_NAME="vidyasetu-service"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Starting deployment for Project: ${PROJECT_ID}${NC}"

# 1. Set the project
gcloud config set project $PROJECT_ID

# 2. Enable necessary APIs
echo -e "${BLUE}Enabling required APIs...${NC}"
gcloud services enable \
    run.googleapis.com \
    artifactregistry.googleapis.com \
    cloudbuild.googleapis.com \
    secretmanager.googleapis.com \
    sqladmin.googleapis.com

# 3. Create Artifact Registry Repository (if not exists)
echo -e "${BLUE}Checking Artifact Registry...${NC}"
gcloud artifacts repositories describe $REPO_NAME --location=$REGION > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Creating repository $REPO_NAME..."
    gcloud artifacts repositories create $REPO_NAME \
        --repository-format=docker \
        --location=$REGION \
        --description="Docker repository for VidyaSetu"
fi

# 4. Build and Push using Cloud Build (Remote build, faster than local upload)
echo -e "${BLUE}Building and pushing image to Artifact Registry...${NC}"
IMAGE_TAG="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$IMAGE_NAME:latest"
gcloud builds submit --tag $IMAGE_TAG .

# 5. Deployment Information
echo -e "${GREEN}Image pushed successfully: ${IMAGE_TAG}${NC}"
echo -e "${BLUE}Ready to deploy to Cloud Run.${NC}"

# NOTE: Before deploying, ensure you have set up your secrets in Secret Manager:
# - AUTH_SECRET
# - AUTH_GOOGLE_ID
# - AUTH_GOOGLE_SECRET
# - GEMINI_API_KEY
# - DATABASE_URL (The Neon connection string)

echo -e "${GREEN}Suggested deployment command (requires secrets setup):${NC}"
echo "gcloud run deploy $SERVICE_NAME \\
    --image $IMAGE_TAG \\
    --region $REGION \\
    --platform managed \\
    --allow-unauthenticated \\
    --set-secrets=\"DATABASE_URL=DATABASE_URL:latest,AUTH_SECRET=AUTH_SECRET:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest,AUTH_GOOGLE_ID=AUTH_GOOGLE_ID:latest,AUTH_GOOGLE_SECRET=AUTH_GOOGLE_SECRET:latest\""

echo -e "${BLUE}Would you like me to help you create the 'setup-secrets.sh' script to upload your Neon DB URL and other keys?${NC}"
