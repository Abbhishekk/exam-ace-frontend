#!/bin/bash

# Deploy Supabase Edge Functions
echo "Deploying Edge Functions..."

# Deploy all functions
supabase functions deploy start-exam
supabase functions deploy submit-exam  
supabase functions deploy generate-question-paper
supabase functions deploy exam-analytics

echo "Edge Functions deployed successfully!"

# Check function status
echo "Checking function status..."
supabase functions list