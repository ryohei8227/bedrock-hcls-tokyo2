# Clinical Study Research Agent

This agent helps users explore, filter, and analyze clinical trial data from public registries like ClinicalTrials.gov. It assists with condition-specific study identification, intervention tracking, sponsor profiling, and outcome analysis using structured search criteria.

## Features

- **Clinical Study Search**: Search for clinical trials based on conditions, interventions, outcomes, and other parameters
- **Trial Details**: Get comprehensive information about specific clinical trials
- **Data Visualization**: Create charts and visualizations of clinical trial data
- **Drug Information**: Retrieve information about approved drugs for specific conditions

## Architecture

The agent consists of three main Lambda functions:

1. **Clinical Study Search Lambda**: Handles searching and retrieving clinical trial data
2. **Clinical Visualizer Lambda**: Creates visualizations of clinical trial data
3. **Drug Information Lambda**: Retrieves information about approved drugs

## Deployment

The agent is deployed using AWS CloudFormation. The template creates all necessary resources including:

- Amazon Bedrock Agent with action groups
- Lambda functions and layers
- IAM roles and permissions
- S3 bucket for storing chart images
- Guardrail for content filtering

### Prerequisites

- AWS CLI configured with appropriate permissions
- Amazon Bedrock access
- IAM role for the Bedrock agent

### Deployment Steps

1. Create the necessary Lambda layers for matplotlib and AWS SDK pandas
2. Deploy the CloudFormation template:

```bash
aws cloudformation deploy \
  --template-file clinical-study-agent.yaml \
  --stack-name clinical-study-research-agent \
  --parameter-overrides \
    AgentIAMRoleArn=<your-agent-role-arn> \
    ChartImageBucketName=<your-bucket-name> \
  --capabilities CAPABILITY_IAM
```

## Usage Examples

### Search for Clinical Trials

"Find clinical trials for diabetes using GLP-1 agonists that measure HbA1c reduction compared to placebo"

### Get Trial Details

"Show me details for clinical trial NCT04000165"

### Create Visualizations

"Create a pie chart showing the distribution of diabetes trials by phase"

### Get Drug Information

"What drugs are approved for type 2 diabetes with oral administration?"

## Customization

You can customize the agent by:

1. Modifying the Lambda function code in the action_groups directory
2. Updating the agent instructions in the CloudFormation template
3. Adding additional action groups for new functionality
