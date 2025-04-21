import json
import os
import logging
from datetime import datetime

# Configure logging
logger = logging.getLogger()
log_level = os.environ.get("LOG_LEVEL", "INFO")
logger.setLevel(log_level)

# Mock database of approved drugs
MOCK_DRUG_DATABASE = {
    "diabetes": [
        {
            "name": "Metformin",
            "brand_names": ["Glucophage", "Glumetza", "Fortamet", "Riomet"],
            "active_ingredient": "Metformin hydrochloride",
            "approval_date": "1995-03-03",
            "route": "Oral",
            "indication": "Type 2 diabetes mellitus",
            "mechanism": "Decreases hepatic glucose production, decreases intestinal absorption of glucose, and improves insulin sensitivity",
            "common_side_effects": ["Diarrhea", "Nausea", "Vomiting", "Abdominal discomfort", "Metallic taste"]
        },
        {
            "name": "Semaglutide",
            "brand_names": ["Ozempic", "Rybelsus", "Wegovy"],
            "active_ingredient": "Semaglutide",
            "approval_date": "2017-12-05",
            "route": "Injection, Oral",
            "indication": "Type 2 diabetes mellitus, Weight management",
            "mechanism": "GLP-1 receptor agonist that increases insulin secretion, decreases glucagon secretion, and slows gastric emptying",
            "common_side_effects": ["Nausea", "Vomiting", "Diarrhea", "Abdominal pain", "Decreased appetite"]
        },
        {
            "name": "Empagliflozin",
            "brand_names": ["Jardiance"],
            "active_ingredient": "Empagliflozin",
            "approval_date": "2014-08-01",
            "route": "Oral",
            "indication": "Type 2 diabetes mellitus, Heart failure, Chronic kidney disease",
            "mechanism": "SGLT2 inhibitor that reduces renal glucose reabsorption and increases urinary glucose excretion",
            "common_side_effects": ["Urinary tract infections", "Genital mycotic infections", "Increased urination", "Thirst"]
        },
        {
            "name": "Insulin Glargine",
            "brand_names": ["Lantus", "Toujeo", "Basaglar"],
            "active_ingredient": "Insulin glargine",
            "approval_date": "2000-04-20",
            "route": "Injection",
            "indication": "Type 1 and Type 2 diabetes mellitus",
            "mechanism": "Long-acting insulin analog that provides basal insulin coverage",
            "common_side_effects": ["Hypoglycemia", "Injection site reactions", "Lipodystrophy", "Weight gain"]
        }
    ],
    "hypertension": [
        {
            "name": "Lisinopril",
            "brand_names": ["Prinivil", "Zestril"],
            "active_ingredient": "Lisinopril",
            "approval_date": "1987-12-29",
            "route": "Oral",
            "indication": "Hypertension, Heart failure, Post-myocardial infarction",
            "mechanism": "ACE inhibitor that prevents conversion of angiotensin I to angiotensin II",
            "common_side_effects": ["Dry cough", "Dizziness", "Headache", "Fatigue", "Hypotension"]
        },
        {
            "name": "Amlodipine",
            "brand_names": ["Norvasc"],
            "active_ingredient": "Amlodipine besylate",
            "approval_date": "1992-07-31",
            "route": "Oral",
            "indication": "Hypertension, Coronary artery disease",
            "mechanism": "Calcium channel blocker that relaxes vascular smooth muscle",
            "common_side_effects": ["Peripheral edema", "Dizziness", "Flushing", "Headache", "Fatigue"]
        }
    ],
    "asthma": [
        {
            "name": "Albuterol",
            "brand_names": ["ProAir HFA", "Ventolin HFA", "Proventil HFA"],
            "active_ingredient": "Albuterol sulfate",
            "approval_date": "1981-05-01",
            "route": "Inhalation",
            "indication": "Bronchospasm, Exercise-induced bronchospasm",
            "mechanism": "Short-acting beta-2 agonist that relaxes bronchial smooth muscle",
            "common_side_effects": ["Tremor", "Nervousness", "Headache", "Tachycardia", "Throat irritation"]
        },
        {
            "name": "Fluticasone",
            "brand_names": ["Flovent", "Flonase"],
            "active_ingredient": "Fluticasone propionate",
            "approval_date": "1996-03-08",
            "route": "Inhalation, Nasal",
            "indication": "Asthma, Allergic rhinitis",
            "mechanism": "Corticosteroid that reduces inflammation in the airways",
            "common_side_effects": ["Throat irritation", "Hoarseness", "Oral candidiasis", "Headache"]
        }
    ]
}

def lambda_handler(event, context):
    """
    Lambda handler for drug information action group
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
        if api_path == 'get_approved_drugs':
            return get_approved_drugs(params)
        else:
            return error_response(f"Unknown API path: {api_path}")
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return error_response(f"Error processing request: {str(e)}")

def get_approved_drugs(params):
    """
    Get approved drugs for a specific condition and optional route
    """
    condition = params.get('condition', '').lower()
    route = params.get('route', '').lower()
    
    if not condition:
        return error_response("Condition parameter is required")
    
    # Find the closest matching condition in our mock database
    matching_condition = None
    for db_condition in MOCK_DRUG_DATABASE.keys():
        if condition in db_condition or db_condition in condition:
            matching_condition = db_condition
            break
    
    if not matching_condition:
        return {
            "messageVersion": "1.0",
            "response": {
                "drugs": [],
                "totalCount": 0,
                "message": f"No approved drugs found for condition: {condition}"
            }
        }
    
    # Get drugs for the matching condition
    drugs = MOCK_DRUG_DATABASE[matching_condition]
    
    # Filter by route if specified
    if route:
        filtered_drugs = []
        for drug in drugs:
            if route.lower() in drug['route'].lower():
                filtered_drugs.append(drug)
        drugs = filtered_drugs
    
    # Format the response
    formatted_drugs = []
    for drug in drugs:
        formatted_drugs.append({
            "name": drug['name'],
            "brandNames": drug['brand_names'],
            "activeIngredient": drug['active_ingredient'],
            "approvalDate": drug['approval_date'],
            "route": drug['route'],
            "indication": drug['indication'],
            "mechanism": drug['mechanism'],
            "commonSideEffects": drug['common_side_effects']
        })
    
    return {
        "messageVersion": "1.0",
        "response": {
            "drugs": formatted_drugs,
            "totalCount": len(formatted_drugs),
            "condition": matching_condition,
            "route": route if route else "All routes"
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
