#!/bin/bash
set -e

# --- Configuration ---
# Your Google Cloud project ID.
# You can find this in the Google Cloud Console.
PROJECT_ID="g3d-gol-test"

# The region to deploy the service to.
# A list of available regions can be found here: https://cloud.google.com/run/docs/locations
REGION="us-central1"

# The name for your Cloud Run service.
SERVICE_NAME="game-of-life"

# The name for your Artifact Registry repository.
REPOSITORY="game-of-life-repo"
# --- End of Configuration ---

IMAGE_NAME="$SERVICE_NAME"
IMAGE_TAG="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${IMAGE_NAME}:latest"

echo "--- Enabling required Google Cloud services... ---"
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  --project="$PROJECT_ID"

echo "--- Creating Artifact Registry repository (if it doesn't exist)... ---"
gcloud artifacts repositories create "$REPOSITORY" \
  --repository-format=docker \
  --location="$REGION" \
  --description="Docker repository for Game of Life" \
  --project="$PROJECT_ID" || echo "Repository '$REPOSITORY' already exists in region '$REGION'."

echo "--- Building and pushing the Docker image using Cloud Build... ---"
gcloud builds submit --tag "$IMAGE_TAG" . --project="$PROJECT_ID"

echo "--- Deploying to Cloud Run... ---"
gcloud run deploy "$SERVICE_NAME" \
  --image="$IMAGE_TAG" \
  --region="$REGION" \
  --platform="managed" \
  --allow-unauthenticated \
  --port=8080 \
  --project="$PROJECT_ID"

echo "--- Deployment successful! ---"
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --platform="managed" --region="$REGION" --project="$PROJECT_ID" --format="value(status.url)")
echo "Your service is available at: $SERVICE_URL"
