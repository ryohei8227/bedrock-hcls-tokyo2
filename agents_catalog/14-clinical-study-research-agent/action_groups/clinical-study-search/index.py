import json
import os
import logging
import requests
import pandas as pd
from datetime import datetime

# Configure logging
logger = logging.getLogger()
log_level = os.environ.get("LOG_LEVEL", "INFO")
logger.setLevel(log_level)

# ClinicalTrials.gov API base URL
API_BASE_URL = "https://clinicaltrials.gov/api/v2/studies"

def lambda_handler(event, context):
    """
    Lambda handler for clinical study search action group
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
        if api_path == 'search_trials':
            return search_trials(params)
        elif api_path == 'get_trial_details':
            return get_trial_details(params)
        else:
            return error_response(f"Unknown API path: {api_path}")
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return error_response(f"Error processing request: {str(e)}")

def search_trials(params):
    """
    Search for clinical trials based on provided parameters
    """
    # Extract parameters
    condition = params.get('condition', '')
    intervention = params.get('intervention', '')
    outcome = params.get('outcome', '')
    comparison = params.get('comparison', '')
    sponsor = params.get('sponsor', '')
    patient = params.get('patient', '')
    location = params.get('location', '')
    study_id = params.get('study_id', '')
    title = params.get('title', '')
    
    # Build query parameters for ClinicalTrials.gov API
    query_params = {
        'format': 'json',
        'pageSize': 10,  # Limit results for performance
    }
    
    # Build query string
    query_terms = []
    if condition:
        query_terms.append(f"CONDITION:{condition}")
    if intervention:
        query_terms.append(f"INTERVENTION:{intervention}")
    if outcome:
        query_terms.append(f"OUTCOME:{outcome}")
    if comparison:
        query_terms.append(f"INTERVENTION:{comparison}")
    if sponsor:
        query_terms.append(f"SPONSOR:{sponsor}")
    if study_id:
        query_terms.append(f"AREA:{study_id}")
    if title:
        query_terms.append(f"TITLE:{title}")
    
    # Combine query terms
    if query_terms:
        query_params['query'] = " AND ".join(query_terms)
    
    # Add filters for patient and location if provided
    if patient:
        query_params['filter.eligibility.gender'] = 'ALL'  # Default, would be refined in real implementation
    if location:
        query_params['filter.location.country'] = location
    
    logger.info(f"Searching with params: {query_params}")
    
    # For demo purposes, we'll return mock data instead of making an actual API call
    # In a real implementation, you would make the API call like this:
    # response = requests.get(API_BASE_URL, params=query_params)
    # data = response.json()
    
    # Mock response with sample clinical trials
    trials = [
        {
            "nctId": "NCT04000165",
            "title": f"Study of {intervention} for {condition}",
            "status": "Recruiting",
            "phase": "Phase 2",
            "enrollment": 120,
            "primaryOutcome": outcome,
            "sponsor": sponsor if sponsor else "Sample Pharma Inc.",
            "locations": ["Boston, MA", "New York, NY"] if location else ["Multiple Locations"],
            "interventions": [intervention, "Placebo"],
            "conditions": [condition],
            "lastUpdateDate": "2023-11-15"
        },
        {
            "nctId": "NCT04123456",
            "title": f"Randomized Trial of {intervention} vs {comparison} in {condition}",
            "status": "Active, not recruiting",
            "phase": "Phase 3",
            "enrollment": 350,
            "primaryOutcome": outcome,
            "sponsor": sponsor if sponsor else "University Medical Center",
            "locations": ["Chicago, IL", "Los Angeles, CA"] if location else ["Multiple Locations"],
            "interventions": [intervention, comparison],
            "conditions": [condition],
            "lastUpdateDate": "2023-09-22"
        },
        {
            "nctId": "NCT05789012",
            "title": f"Long-term Safety Study of {intervention} in {condition}",
            "status": "Completed",
            "phase": "Phase 4",
            "enrollment": 500,
            "primaryOutcome": "Safety and Adverse Events",
            "sponsor": sponsor if sponsor else "Global Research Institute",
            "locations": ["Multiple Countries"],
            "interventions": [intervention],
            "conditions": [condition],
            "lastUpdateDate": "2023-12-05"
        }
    ]
    
    return {
        "messageVersion": "1.0",
        "response": {
            "trials": trials,
            "totalCount": len(trials),
            "searchCriteria": {
                "condition": condition,
                "intervention": intervention,
                "outcome": outcome,
                "comparison": comparison
            }
        }
    }

def get_trial_details(params):
    """
    Get detailed information about a specific clinical trial
    """
    nct_id = params.get('nctId', '')
    
    if not nct_id:
        return error_response("NCT ID is required")
    
    logger.info(f"Getting details for trial: {nct_id}")
    
    # For demo purposes, we'll return mock data instead of making an actual API call
    # In a real implementation, you would make the API call like this:
    # response = requests.get(f"{API_BASE_URL}/{nct_id}")
    # data = response.json()
    
    # Mock detailed trial information
    if nct_id == "NCT04000165":
        trial_details = {
            "nctId": nct_id,
            "title": "Study of GLP-1 Agonist for Type 2 Diabetes",
            "status": "Recruiting",
            "phase": "Phase 2",
            "enrollment": 120,
            "startDate": "2023-01-15",
            "completionDate": "2025-06-30",
            "primaryOutcome": "Change in HbA1c from baseline",
            "secondaryOutcomes": [
                "Percentage of patients achieving HbA1c <7%",
                "Change in fasting plasma glucose",
                "Change in body weight"
            ],
            "eligibilityCriteria": {
                "inclusion": [
                    "Adults aged 18-75 years",
                    "Diagnosed with Type 2 Diabetes for at least 6 months",
                    "HbA1c between 7.0% and 10.0%",
                    "BMI between 25 and 40 kg/m²"
                ],
                "exclusion": [
                    "History of cardiovascular disease within past 6 months",
                    "Pregnant or nursing women",
                    "Current use of insulin or GLP-1 receptor agonists",
                    "History of pancreatitis"
                ]
            },
            "interventions": [
                {
                    "name": "GLP-1 Agonist",
                    "description": "Once-weekly subcutaneous injection",
                    "arm": "Experimental"
                },
                {
                    "name": "Placebo",
                    "description": "Matching placebo injection",
                    "arm": "Control"
                }
            ],
            "locations": [
                {
                    "facility": "University Hospital",
                    "city": "Boston",
                    "state": "MA",
                    "country": "United States",
                    "status": "Recruiting"
                },
                {
                    "facility": "Medical Research Center",
                    "city": "New York",
                    "state": "NY",
                    "country": "United States",
                    "status": "Recruiting"
                }
            ],
            "sponsor": "Sample Pharma Inc.",
            "collaborators": ["National Diabetes Association"],
            "lastUpdateDate": "2023-11-15"
        }
    elif nct_id == "NCT04123456":
        trial_details = {
            "nctId": nct_id,
            "title": "Randomized Trial of GLP-1 Agonist vs DPP-4 Inhibitor in Type 2 Diabetes",
            "status": "Active, not recruiting",
            "phase": "Phase 3",
            "enrollment": 350,
            "startDate": "2022-05-10",
            "completionDate": "2024-12-31",
            "primaryOutcome": "Change in HbA1c from baseline at 52 weeks",
            "secondaryOutcomes": [
                "Change in body weight",
                "Proportion of patients achieving HbA1c <7.0%",
                "Change in systolic blood pressure",
                "Incidence of hypoglycemic events"
            ],
            "eligibilityCriteria": {
                "inclusion": [
                    "Adults aged 18-80 years",
                    "Type 2 diabetes with HbA1c 7.0-10.5%",
                    "On stable metformin therapy for at least 3 months"
                ],
                "exclusion": [
                    "History of type 1 diabetes",
                    "Recent cardiovascular event within 3 months",
                    "eGFR <45 mL/min/1.73m²",
                    "Prior use of GLP-1 receptor agonists or DPP-4 inhibitors"
                ]
            },
            "interventions": [
                {
                    "name": "GLP-1 Receptor Agonist",
                    "description": "Once-daily subcutaneous injection",
                    "arm": "Experimental"
                },
                {
                    "name": "DPP-4 Inhibitor",
                    "description": "Once-daily oral tablet",
                    "arm": "Active Comparator"
                }
            ],
            "locations": [
                {
                    "facility": "University Medical Center",
                    "city": "Chicago",
                    "state": "IL",
                    "country": "United States",
                    "status": "Active, not recruiting"
                },
                {
                    "facility": "Diabetes Research Institute",
                    "city": "Los Angeles",
                    "state": "CA",
                    "country": "United States",
                    "status": "Active, not recruiting"
                }
            ],
            "sponsor": "University Medical Center",
            "collaborators": ["Pharmaceutical Partner Inc."],
            "lastUpdateDate": "2023-09-22"
        }
    else:
        trial_details = {
            "nctId": nct_id,
            "title": "Clinical Trial Information",
            "status": "Unknown",
            "message": f"Details for trial {nct_id} not found in mock data. In a real implementation, this would query the ClinicalTrials.gov API."
        }
    
    return {
        "messageVersion": "1.0",
        "response": trial_details
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
