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

var charts = [
    {
        name: "INVALID_LOGIN_ATTEMPT",
        columns: ["timestamp", "InvalidLoginCount", "AgentId"],
        additionalColumns: ["week"],
        orderedField: "InvalidLoginCount",
        schema: [{
            "metadata": {
                "names": ["day", "InvalidLoginCount", "AgentId", "ID"],
                "types": ["ordinal", "linear", "ordinal", "linear"]
            },
            "data": []
        }],
        "chartConfig": {
            type: "bar",
            x: "day",
            colorScale: [],
            colorDomain: [],
            xAxisAngle: true,
            color: "AgentId",
            charts: [{type: "bar", y: "InvalidLoginCount", mode: "stack"}],
            width: $('canvas').width(),
            height: $('canvas').height(),
            padding: {"top": 10, "left": 80, "bottom": 70, "right": 50},
            legend: false,
            tooltip: {
                "enabled": true,
                "color": "#e5f2ff",
                "type": "symbol",
                "content": ["ID", "InvalidLoginCount", "day"],
                "label": true
            }
        }
    }
];

var serverUrls = [
    { name: "ESB", svrUrl: "/portal/apis/analytics"},
    { name: "APIM", svrUrl: "https://"+location.hostname +":"+ location.port +"/admin-dashboard/modules/la/log-analyzer-proxy.jag"}

];