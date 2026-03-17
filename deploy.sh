#!/bin/bash
set -e

# This script deploys the application to Google Cloud Run.
# It accepts one argument: the environment to deploy to (e.g., "prod" or "test").

# --- Environment setup ---
ENV=$1

if [ -z "$ENV" ]; then
  echo "Usage: ./deploy.sh [prod|test]"
  exit 1
fi

# --- Configuration ---
PROJECT_ID="g3d-gol-test"
REGION="us-central1"
REPOSITORY="game-of-life-repo"

if [ "$ENV" == "test" ]; then
  SERVICE_NAME="goncalves-3d-game-of-life-test"
elif [ "$ENV" == "prod" ]; then
  SERVICE_NAME="game-of-life"
else
  echo "Invalid environment: $ENV. Use 'prod' or 'test'."
  exit 1
fi
# --- End of Configuration ---

IMAGE_NAME="$SERVICE_NAME"
IMAGE_TAG="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${IMAGE_NAME}:latest"

echo "--- Deploying to environment: $ENV ---"
echo "Service Name: $SERVICE_NAME"
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo "Image: $IMAGE_TAG"

echo
echo "--- Enabling required Google Cloud services... ---"
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  --project="$PROJECT_ID"

echo
echo "--- Creating Artifact Registry repository (if it doesn't exist)... ---"
gcloud artifacts repositories create "$REPOSITORY" \
  --repository-format=docker \
  --location="$REGION" \
  --description="Docker repository for Game of Life" \
  --project="$PROJECT_ID" || echo "Repository '$REPOSITORY' already exists in region '$REGION'."

echo
echo "--- Building and pushing the Docker image using Cloud Build... ---"
gcloud builds submit --tag "$IMAGE_TAG" . --project="$PROJECT_ID"

echo
echo "--- Deploying to Cloud Run... ---"
gcloud run deploy "$SERVICE_NAME" \
  --image="$IMAGE_TAG" \
  --region="$REGION" \
  --platform="managed" \
  --allow-unauthenticated \
  --port=8080 \
  --project="$PROJECT_ID"

echo
echo "--- Deployment successful! ---"
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --platform="managed" --region="$REGION" --project="$PROJECT_ID" --format="value(status.url)")
echo "Your service is available at: $SERVICE_URL"
