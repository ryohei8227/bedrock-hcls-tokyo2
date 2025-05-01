#!/bin/bash

# Debug: Print current location and S3 bucket
echo "Current directory: $(pwd)"
echo "S3 Bucket: ${S3_BUCKET}"

# Process Subagent templates
cd agents || exit
echo "Processing agent templates..."
for agent_file in *.yaml; do
  if [ -f "${agent_file}" ]; then
    echo "Found agent file: ${agent_file}"
    agent_name=$(basename "${agent_file}" .yaml)
    echo "Packaging agent: ${agent_name}"
    aws cloudformation package \
      --template-file "${agent_file}" \
      --s3-bucket "${S3_BUCKET}" \
      --output-template-file "../packaged_${agent_name}.yaml"
    
    # Copy to S3 immediately after packaging
    aws s3 cp "../packaged_${agent_name}.yaml" "s3://${S3_BUCKET}/packaged_${agent_name}.yaml"
  fi
done
cd ..

# Process Supervisor agent template - note the quotes around directory name
cd SupervisorAgent || exit
echo "Processing supervisor agent template..."
if [ -f "supervisor_agent.yaml" ]; then
  echo "Packaging supervisor agent"
  aws cloudformation package \
    --template-file supervisor_agent.yaml \
    --s3-bucket "${S3_BUCKET}" \
    --output-template-file "../packaged_supervisor_agent.yaml"
  
  # Copy to S3 immediately after packaging
  aws s3 cp "../packaged_supervisor_agent.yaml" "s3://${S3_BUCKET}/packaged_supervisor_agent.yaml"
fi
cd ..

# Process agent build template
echo "Processing agent build template..."
if [ -f "agent_build.yaml" ]; then
  echo "Packaging agent build template"
  aws cloudformation package \
    --template-file agent_build.yaml \
    --s3-bucket "${S3_BUCKET}" \
    --output-template-file "packaged_agent_build.yaml"
  
  # Copy to S3
  aws s3 cp "packaged_agent_build.yaml" "s3://${S3_BUCKET}/packaged_agent_build.yaml"
fi

# Process streamlit app
if [ -d "streamlitapp" ] && [ -f "streamlitapp/streamlit_build.yaml" ]; then
  echo "Processing streamlit app..."
  cd streamlitapp || exit
  aws cloudformation package \
    --template-file streamlit_build.yaml \
    --s3-bucket "${S3_BUCKET}" \
    --output-template-file "../packaged_streamlit_build.yaml"
  
  # Copy to S3
  aws s3 cp "../packaged_streamlit_build.yaml" "s3://${S3_BUCKET}/packaged_streamlit_build.yaml"
  cd ..
fi

# Prepare UI artifact and upload to S3
if [ -d "ui" ]; then
  echo "Preparing React UI artifact..."
  cd ui || exit
  zip -r ui_artifact.zip . -x "node_modules/*" 
  echo "Uploading React UI artifact to S3..."
  aws s3 cp "ui_artifact.zip" "s3://${S3_BUCKET}/ui/ui_artifact.zip"
  echo "React UI artifact uploaded to S3, deleting local copy"
  rm "ui_artifact.zip"
  cd ..
fi

# Process react app docker build template
echo "Processing react app docker build template..."
if [ -d "ui" ] && [ -f "ui/cloudformation/docker_build_pipeline.yml" ]; then
  echo "Copying react app docker build template"
  aws s3 cp "ui/cloudformation/docker_build_pipeline.yml" "s3://${S3_BUCKET}/ui/docker_build_pipeline.yml"
fi

# Process react app ECS service build template
echo "Processing react app ECS service build template..."
if [ -d "ui" ] && [ -f "ui/cloudformation/ecs.yml" ]; then
  echo "Copying react app ECS build template"
  aws s3 cp "ui/cloudformation/ecs.yml" "s3://${S3_BUCKET}/ui/ecs.yml"
fi
echo "All templates packaged and uploaded to S3"