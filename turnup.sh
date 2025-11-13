#!/bin/bash
export GCP_PROJECT_ID="image-editor-477100"
export COMPUTE_SERVICE_ACCOUNT="818341435051-compute@developer.gserviceaccount.com"
export APP_SERVER_IP="app-server-ip"

# GCP auth
gcloud auth application-default login
gcloud config set project $GCP_PROJECT_ID

# Create the builder service account
gcloud iam service-accounts create app-builder

# Grant permissions to the builder service account
gcloud projects add-iam-policy-binding $GCP_PROJECT_ID --member="serviceAccount:app-builder@$GCP_PROJECT_ID.iam.gserviceaccount.com" --role='roles/cloudbuild.builds.builder' --condition=None
gcloud projects add-iam-policy-binding $GCP_PROJECT_ID --member="serviceAccount:app-builder@$GCP_PROJECT_ID.iam.gserviceaccount.com" --role='roles/container.developer' --condition=None
gcloud projects add-iam-policy-binding $GCP_PROJECT_ID --member="serviceAccount:app-builder@$GCP_PROJECT_ID.iam.gserviceaccount.com" --role='roles/compute.instanceAdmin.v1' --condition=None

# Grant permissions to the default compute engine service account
gcloud projects add-iam-policy-binding $GCP_PROJECT_ID --member="serviceAccount:$COMPUTE_SERVICE_ACCOUNT" --role='roles/datastore.user' --condition=None

# Create VM instance
gcloud compute instances create app --project=$GCP_PROJECT_ID --zone=us-west1-b --machine-type=e2-micro --tags=http-server,https-server --image-family=cos-stable --image-project=cos-cloud --metadata-from-file=startup-script=vm_startup_script.sh --scopes=https://www.googleapis.com/auth/cloud-platform --address=$APP_SERVER_IP
