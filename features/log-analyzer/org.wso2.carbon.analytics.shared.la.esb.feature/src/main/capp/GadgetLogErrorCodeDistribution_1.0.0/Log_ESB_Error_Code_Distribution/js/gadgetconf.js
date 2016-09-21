/*
 * Copyright (c) 2016, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 Inc. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

var gadgetConfig = {
    "id": "logESBErrorCodeDistirbution",
    "title": "Error Code Distribution",
    "datasource": "LOGANALYZER_ERROR_CODE_DISTRIBUTION_DAILY",
    "errorType": ["Transport Error", "General Errors", "Failure on Endpoint in the Session", "Non-Fatal Warnings", "Referring Real Endpoint is Null", "Callout Operation Failed", "Custom"],
    "checkBoxId" : ["checkboxTransportErrors", "checkboxGeneralErrors", "checkboxEndpointFailures", "checkboxNonFatelWarnings", "checkboxEndpointIsNull", "checkboxCalloutOpFailures", "checkboxCutom" ],
    "meta": {
        "names": ["Error Type", "Count"],
        "types": ["ordinal", "linear"]
    },
    "errorCodes": [
        {
            "type" : "Transport Error"
        },
        {
            "type" : "General Errors"
        },
        {
            "type" : "Failure on Endpoint in the Session"
        },
        {
            "type" : "Non-Fatal Warnings"
        },
        {
            "type" : "Referring Real Endpoint is Null"
        },
        {
            "type" : "Callout Operation Failed"
        },
        {
            "type" : "Custom"
        }
    ],
    "chartConfig": {
        colorScale: ["#CD5C5C", "#F08080", "#DC143C", "#FF0000", "#B22222", "#800080", "#700080" ],
        type: "bar",
        x: "Error Type",
        color: "Error Type",
        charts: [{y: "Count"}],
        width: $(document).width()/1.2,
        height: $(document).height()/1.2,
        legend: false,
        padding: {"top": 10, "left": 80, "bottom": 70, "right": 200}
    },
    "domain": "carbon.super"
};

