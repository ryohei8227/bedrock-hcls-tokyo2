import json
import os
import logging
import uuid
import boto3
import matplotlib.pyplot as plt
import io
import base64
import numpy as np
from datetime import datetime

# Configure logging
logger = logging.getLogger()
log_level = os.environ.get("LOG_LEVEL", "INFO")
logger.setLevel(log_level)

# Get environment variables
CHART_IMAGE_BUCKET = os.environ.get('CHART_IMAGE_BUCKET')

def lambda_handler(event, context):
    """
    Lambda handler for clinical visualizer action group
    """
    logger.info(f"Received event: {json.dumps(event)}")
    
    # Extract the action name and parameters
    action_group = event.get('actionGroup')
    api_path = event.get('apiPath')
    parameters = event.get('parameters', [])
    
    # Convert parameters list to dictionary
    params = {}
    for param in parameters:
        params[param['name']] = param['value']
    
    try:
        # Route to appropriate function based on API path
        if api_path == 'create_pie_chart':
            return create_pie_chart(params)
        else:
            return error_response(f"Unknown API path: {api_path}")
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return error_response(f"Error processing request: {str(e)}")

def create_pie_chart(params):
    """
    Create a pie chart based on provided data
    """
    title = params.get('title', 'Clinical Trial Distribution')
    data = params.get('data', [])
    
    # If no data is provided, use sample data
    if not data:
        data = [
            {"label": "Phase 1", "value": 25},
            {"label": "Phase 2", "value": 40},
            {"label": "Phase 3", "value": 30},
            {"label": "Phase 4", "value": 5}
        ]
    
    # Extract labels and values
    labels = [item.get('label', f'Item {i}') for i, item in enumerate(data)]
    values = [item.get('value', 1) for item in data]
    
    # Set up the figure with a clean, modern style
    plt.figure(figsize=(10, 6))
    plt.style.use('seaborn-v0_8-whitegrid')
    
    # Create the pie chart with a slight explode effect on the largest slice
    explode = [0.05 if v == max(values) else 0 for v in values]
    colors = plt.cm.Pastel1(np.arange(len(values)))
    
    wedges, texts, autotexts = plt.pie(
        values, 
        labels=None,  # We'll add a legend instead
        autopct='%1.1f%%',
        explode=explode,
        shadow=False,
        startangle=90,
        colors=colors,
        wedgeprops={'edgecolor': 'white', 'linewidth': 1}
    )
    
    # Customize the appearance
    plt.title(title, fontsize=16, pad=20)
    plt.legend(wedges, labels, title="Categories", loc="center left", bbox_to_anchor=(1, 0, 0.5, 1))
    
    # Make the percentage labels more readable
    for autotext in autotexts:
        autotext.set_color('black')
        autotext.set_fontsize(10)
        autotext.set_weight('bold')
    
    plt.tight_layout()
    
    # Save to a buffer
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=300, bbox_inches='tight')
    buf.seek(0)
    
    try:
        # Upload to S3
        s3_client = boto3.client('s3')
        file_name = f"{uuid.uuid4()}.png"
        s3_path = f"charts/{file_name}"
        
        logger.info(f"Uploading chart to S3 bucket: {CHART_IMAGE_BUCKET}, path: {s3_path}")
        
        s3_client.put_object(
            Bucket=CHART_IMAGE_BUCKET,
            Key=s3_path,
            Body=buf,
            ContentType='image/png'
        )
        
        # Generate a pre-signed URL for the image (valid for 1 hour)
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': CHART_IMAGE_BUCKET, 'Key': s3_path},
            ExpiresIn=3600
        )
        
        return {
            "messageVersion": "1.0",
            "response": {
                "chartUrl": url,
                "chartTitle": title,
                "chartType": "pie",
                "categories": labels,
                "values": values
            }
        }
    except Exception as e:
        logger.error(f"Error uploading chart to S3: {str(e)}")
        
        # If S3 upload fails, return the chart as base64
        encoded_img = base64.b64encode(buf.getvalue()).decode('utf-8')
        return {
            "messageVersion": "1.0",
            "response": {
                "chartBase64": encoded_img,
                "chartTitle": title,
                "chartType": "pie",
                "categories": labels,
                "values": values,
                "error": "Failed to upload to S3, returning base64 encoded image"
            }
        }

def error_response(message):
    """
    Create an error response
    """
    return {
        "messageVersion": "1.0",
        "response": {
            "error": message
        }
    }
