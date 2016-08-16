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
