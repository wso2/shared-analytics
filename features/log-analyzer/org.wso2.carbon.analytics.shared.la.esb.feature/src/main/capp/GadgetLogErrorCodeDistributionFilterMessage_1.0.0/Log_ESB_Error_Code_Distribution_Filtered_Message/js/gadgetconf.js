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

var tables = [
    {
        name: "APIM",
        dataSource: "LOGANALYZER",
        schema: {
            columns: ["_content", "_class"],
            titles: ["Message", "Class"]
        },
        advancedColumns: [],
        actionParameters: ["_content", "timestamp"]
    },
    {
        name: "ESB",
        dataSource: "LOGANALYZER",
        schema: {
            columns: ["_content", "_class"],
            titles: ["Message", "Class"]
        },
        advancedColumns: [],
        actionParameters: ["_content", "timestamp"]
    },
    {
        name: "APIM_AUDIT_LOG",
        dataSource: "LOGANALYZER_APIM_AUDIT_LOG",
        schema: {
            columns: ["user", "action", "type", "info"],
            titles: ["User", "API Action", "Type", "Info"]
        },
        advancedColumns: [
            {
                id: "info",
                formatters: [
                    {
                        type: "json",
                        keys: ["name", "context", "provider", "version", "tier", "callbackURL", "application_name", "api_name"],
                        titles: ["Name", "Context", "Provider", "Version", "Tier", "Callback URL", "Application Name", "API Name"],
                        delimiter: "<br>"
                    }
                ]
            }
        ],
        actionParameters: []
    }
];


var errorDescriptions = [
    {
        type: "Transport Error",
        codes : ["101000", "101001", "101500", "101501", "101503", "101504", "101505", "101506", "101507", "101508", "101509", "101510"],
        descriptions : [
            "Receiver input/output error sending ",
            "Receiver input/output error receiving ",
            "Sender input/output error sending",
            "Sender input/output error receiving ",
            "Connection failed",
            "Connection timed out",
            "Connection closed",
            "NHTTP protocol violation",
            "Connection canceled",
            "Request to establish new connection timed out",
            "Send abort",
            "Response processing failed"
        ]
    },
    {
        type : "General Errors",
        codes : ["303000", "303001", "303002"],
        descriptions : [
            "Load Balance, Recipient list or Failover endpoint is not ready to connect",
            "Address Endpoint is not ready to connect",
            "WSDL Address is not ready to connect"
        ]

    },
    {
        type : "Failure on Endpoint in the Session",
        codes : ["309001", "309002", "309003"],
        descriptions : [
            "Session aware load balance endpoint, No ready child endpoints",
            "Session aware load balance endpoint, Invalid reference",
            "Session aware load balance endpoint, Failed session "
        ]
    },
    {
        type : "Non-Fatal Warnings",
        codes : ["303100", "304100"],
        descriptions : [
            "A failover occurred in a Load balance endpoint ",
            "A failover occurred in a Failover endpoint "
        ]
    },
    {
        type : "Referring Real Endpoint is Null",
        codes : ["305100"],
        descriptions : [
            "Indirect endpoint not ready "
        ]
    },
    {
        type : "Callout Operation Failed",
        codes : ["401000"],
        descriptions : [
            "Callout operation failed (from the callout mediator)"
        ]
    }
]


