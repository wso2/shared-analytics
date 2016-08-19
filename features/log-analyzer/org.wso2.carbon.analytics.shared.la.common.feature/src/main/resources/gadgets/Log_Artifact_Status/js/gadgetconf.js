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

var charts = [{
    "name": "ESB_Artifact_Deployed",
    "title": "Log Event",
    "barData": {
        "datasources": ["LOGANALYZER_ARTIFACT_DEPLOYMENT_DAILY", "LOGANALYZER_ARTIFACT_DELETED_DAILY"],
        "names": ["Deployed Artifacts", "Removed Artifacts"]
    },
    "classes": ["API", "Proxy service", "Template", "Local entry", "Endpoint", "Sequence", "Startup", "Event source", "Priority executor", "Inbound Endpoint"],
    "barCount": 2,
    "meta": {
        "names": ["class", "Status", "Frequency"],
        "types": ["ordinal", "ordinal", "linear"]
    },

    "queryParams": {
        "fieldNames": [[["ArtifactType"], ["ArtifactType"], ["ArtifactType"], ["ArtifactType"], ["ArtifactType"], ["ArtifactType"], ["ArtifactType"], ["ArtifactType"], ["ArtifactType"], ["ArtifactType"]], [["ArtifactType"], ["ArtifactType"], ["ArtifactType"], ["ArtifactType"], ["ArtifactType"], ["ArtifactType"], ["ArtifactType"], ["ArtifactType"], ["ArtifactType"], ["ArtifactType"]]],
        "searchParams": [[["API"], ["Proxy service"], ["Template"], ["Local entry"], ["Endpoint"], ["Sequence"], ["Startup"], ["Event source"], ["Priority executor"], ["Inbound Endpoint"]], [["API"], ["Proxy service"], ["Template"], ["Local entry"], ["Endpoint"], ["Sequence"], ["Startup"], ["Event source"], ["Priority executor"], ["Inbound Endpoint"]]]
    },

    "chartConfig": {
        mode: "group",
        colorScale: ["#5CB85C", "#FF0000"],
        type: "bar",
        x: "class",
        charts: [{type: "bar", y: "Frequency", color: "Status", mode: "group"}],
        width: $('body').width(),
        height: $('body').height(),
        padding: {"top": 10, "left": 80, "bottom": 70, "right": 200},
        tooltip: {
            "enabled": true,
            "color": "#e5f2ff",
            "type": "symbol",
            "content": ["classes", "Frequency", "Status"],
            "label": true
        }
    }
    },
    {
        "name": "APIM_Artifact_Deployed",
        "title": "Artifact Distribution",
        "barData": {
            "datasources": ["LOGANALYZER_APIM_AUDIT_LOG", "LOGANALYZER_APIM_AUDIT_LOG", "LOGANALYZER_APIM_AUDIT_LOG"],
            "values": ["created", "deleted", "updated"],
            "titles": ["Created Artifacts", "Deleted Artifacts", "Updated Artifacts"]
        },
        "classes": ["API", "Subscription", "Application"],
        "barCount": 3,
        "meta": {
            "names": ["Artifact Type", "Status", "Frequency"],
            "types": ["ordinal", "ordinal", "linear"]
        },

        "queryParams": {
            "fieldNames": [
                [
                    ["type", "action"], ["type", "action"], ["type", "action"]
                ],
                [
                    ["type", "action"], ["type", "action"], ["type", "action"]
                ],
                [
                    ["type", "action"], ["type", "action"], ["type", "action"]
                ]
            ],
            "searchParams": [
                [
                    ["API", "created"], ["Subscription", "created"], ["Application", "created"]
                ],
                [
                    ["API", "deleted"], ["Subscription", "deleted"], ["Application", "deleted"]
                ],
                [
                    ["API", "updated"], ["Subscription", "updated"], ["Application", "updated"]
                ]
            ]
        },

        "publisherParameters":{
            "filters":["type", "action"],
            "values":["Artifact Type", "Status"]
        },

        "chartConfig": {
            mode: "group",
            colorScale: ["#27ae60", "#e74c3c", "#95a5a6"],
            colorDomain:["Created Artifacts", "Deleted Artifacts", "Updated Artifacts"],
            type: "bar",
            x: "Artifact Type",
            charts: [{type: "bar", y: "Frequency", color: "Status", mode: "group"}],
            width: $('body').width(),
            height: $('body').height(),
            padding: {"top": 10, "left": 80, "bottom": 70, "right": 200},
            tooltip: {
                "enabled": true,
                "color": "#e5f2ff",
                "type": "symbol",
                "content": ["Artifact Type", "Frequency", "Status"],
                "label": true
            }
        }
    }
];
