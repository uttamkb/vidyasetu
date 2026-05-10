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
RUNNER_SA="vidyasetu-runner"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "\033[0;31mError: gcloud is not installed or not in PATH.\033[0m"
    echo -e "Please install the Google Cloud CLI: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

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
    cloudresourcemanager.googleapis.com \
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

# 4. Create/Ensure Dedicated Service Account
echo -e "${BLUE}Configuring Service Account: ${RUNNER_SA}...${NC}"
gcloud iam service-accounts describe ${RUNNER_SA}@${PROJECT_ID}.iam.gserviceaccount.com > /dev/null 2>&1
if [ $? -ne 0 ]; then
    gcloud iam service-accounts create $RUNNER_SA \
        --display-name="VidyaSetu Cloud Run Runner"
fi

# 5. Grant Secret Access to the Service Account
echo -e "${BLUE}Granting Secret Manager access...${NC}"
SECRETS=("DATABASE_URL" "AUTH_SECRET" "GEMINI_API_KEY" "AUTH_GOOGLE_ID" "AUTH_GOOGLE_SECRET")
for secret in "${SECRETS[@]}"; do
    gcloud secrets add-iam-policy-binding $secret \
        --member="serviceAccount:${RUNNER_SA}@${PROJECT_ID}.iam.gserviceaccount.com" \
        --role="roles/secretmanager.secretAccessor" \
        --project=$PROJECT_ID > /dev/null
done

# 6. Run Database Migrations (via Cloud Build)
echo -e "${BLUE}Running Prisma Migrations...${NC}"
# We use a one-off Cloud Build to run migrations against the DB
gcloud builds submit --config - . <<EOF
steps:
- name: 'node:20-slim'
  entrypoint: 'sh'
  args:
  - '-c'
  - |
    apt-get update && apt-get install -y openssl
    npm ci
    npx prisma migrate deploy
  secretEnv: ['DATABASE_URL']
availableSecrets:
  secretManager:
  - versionName: projects/${PROJECT_ID}/secrets/DATABASE_URL/versions/latest
    env: 'DATABASE_URL'
EOF

# 7. Build and Push Application Image
echo -e "${BLUE}Building and pushing image to Artifact Registry...${NC}"
IMAGE_TAG="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$IMAGE_NAME:latest"
gcloud builds submit --tag $IMAGE_TAG .

# 8. Deployment to Cloud Run
echo -e "${BLUE}Deploying to Cloud Run...${NC}"
gcloud run deploy $SERVICE_NAME \
    --image $IMAGE_TAG \
    --region $REGION \
    --platform managed \
    --allow-unauthenticated \
    --service-account="${RUNNER_SA}@${PROJECT_ID}.iam.gserviceaccount.com" \
    --memory=1Gi \
    --cpu=1 \
    --max-instances=10 \
    --set-secrets="DATABASE_URL=DATABASE_URL:latest,AUTH_SECRET=AUTH_SECRET:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest,AUTH_GOOGLE_ID=AUTH_GOOGLE_ID:latest,AUTH_GOOGLE_SECRET=AUTH_GOOGLE_SECRET:latest"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Deployment successful!${NC}"
    SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)')
    echo -e "${BLUE}Your app is live at: ${GREEN}${SERVICE_URL}${NC}"
else
    echo -e "\033[0;31mDeployment failed.${NC}"
    exit 1
fi
