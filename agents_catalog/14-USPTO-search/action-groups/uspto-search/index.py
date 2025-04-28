# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import boto3
import datetime
import json
import logging
import os
import urllib.parse
import urllib.request

session = boto3.session.Session()
secrets_manager = session.client(service_name="secretsmanager")

log_level = os.environ.get("LOG_LEVEL", "INFO").strip().upper()
logging.basicConfig(
    format="[%(asctime)s] p%(process)s {%(filename)s:%(lineno)d} %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)
logger.setLevel(log_level)

BASE_URL = "https://api.uspto.gov/api/v1/patent/applications/search"
FUNCTION_NAMES = []
SLEEP_AFTER_429 = 0.1
SLEEP_BETWEEN_HTTP = 0
HTTP_RETRY = 5
LIMIT = 25
total_429 = 0
total_rate = 0


def get_from_env_or_secretstore(SecretId: str) -> str:
    """Get the secret from the environment or secret store"""
    secret = None
    if SecretId in os.environ:
        logger.debug(f"getting {SecretId} from environment")
        secret = os.environ[SecretId].strip()
    else:
        logger.debug(f"getting {SecretId} from secrets manager")
        try:
            secret = secrets_manager.get_secret_value(SecretId=SecretId).get(
                "SecretString", ""
            )
        except Exception as e:
            logger.error(f"could not get secret {SecretId} from secrets manager: {e}")
            raise e

    return secret


try:
    API_KEY_NAME = os.environ.get("USPTO_API_KEY_NAME", "USPTO_API_KEY")
    API_KEY = get_from_env_or_secretstore(SecretId=API_KEY_NAME)
    FUNCTION_NAMES.append("uspto_search")
except Exception as e:
    logger.error(f"could not get API key: {e}")
    API_KEY = None


def uspto_search(
    search_query: str,
    filing_days_in_past: int = None,
) -> str:
    logger.info(f"executing USPTO search with {urllib.parse.quote(search_query)}")

    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-API-KEY": API_KEY,
    }
    payload = {
        "q": search_query,
        "sort": [{"field": "applicationMetaData.effectiveFilingDate", "order": "desc"}],
        "fields": [
            "applicationNumberText",
            "applicationMetaData.firstInventorName",
            "applicationMetaData.effectiveFilingDate",
            "applicationMetaData.applicationTypeLabelName",
            "applicationMetaData.firstApplicantName",
            "applicationMetaData.inventionTitle",
        ],
        "pagination": {"offset": 0, "limit": LIMIT},
    }

    if filing_days_in_past:
        end_date = datetime.date.today()
        start_date = end_date - datetime.timedelta(days=int(filing_days_in_past))
        payload["rangeFilters"] = [
            {
                "field": "applicationMetaData.effectiveFilingDate",
                "valueFrom": str(start_date),
                "valueTo": str(end_date),
            }
        ]
    data = json.dumps(payload).encode("utf-8")
    logger.info(f"search payload: {data}")
    request = urllib.request.Request(BASE_URL, data=data, headers=headers)  # nosec: B310 fixed url we want to open

    try:
        response = urllib.request.urlopen(request)  # nosec: B310 fixed url we want to open
        response_data: str = response.read().decode("utf-8")
        results = json.loads(response_data)
        logger.info(f"Response from USPTO search {results}")
        return json.dumps(results, separators=(",", ":"))
    except urllib.error.HTTPError as e:
        logger.error(f"failed to retrieve search results, error: {e.code}")

    return ""


def lambda_handler(event, context):
    logging.debug(f"{event=}")

    agent = event["agent"]
    actionGroup = event["actionGroup"]
    function = event["function"]
    parameters = event.get("parameters", [])
    responseBody = {"TEXT": {"body": "Error, no function was called"}}

    logger.info(f"{agent=}\n{actionGroup=}\n{function=}")

    if function in FUNCTION_NAMES:
        if function == "uspto_search":
            search_query = None
            days = None

            for param in parameters:
                if param["name"] == "search_query":
                    search_query = param["value"]
                if param["name"] == "days":
                    days = param["value"]

            if not search_query:
                responseBody = {
                    "TEXT": {"body": "Missing mandatory parameter: search_query"}
                }
            else:
                search_results = uspto_search(search_query, days)
                responseBody = {
                    "TEXT": {
                        "body": f"Here are the top search results for the query '{search_query}': {search_results} "
                    }
                }

                logger.debug(f"query results {search_results=}")
    else:
        responseBody = {"TEXT": {"body": f"{function} is not a valid function"}}

    action_response = {
        "actionGroup": actionGroup,
        "function": function,
        "functionResponse": {"responseBody": responseBody},
    }

    function_response = {
        "response": action_response,
        "messageVersion": event["messageVersion"],
    }

    logger.debug(f"lambda_handler: {function_response=}")

    return function_response


if __name__ == "__main__":
    search_query = "nanobody"
    filing_days_in_past = 100
    search_results = uspto_search(search_query, filing_days_in_past)
    print(f"search results: {search_results}")

    logger.info("Testing uspto_search")

    search_query = "Nanobody"
    days = 100
    event = {
        "messageVersion": "1.0",
        "agent": {
            "name": "test",
            "id": "ABCDEF",
            "alias": "123456",
            "version": "1",
        },
        "sessionId": "123456789",
        "actionGroup": "testGroup",
        "function": "uspto_search",
        "parameters": [
            {
                "name": "search_query",
                "value": search_query,
            },
            {"name": "days", "value": days},
        ],
    }
    response = lambda_handler(event, None)
    logger.info(response)
