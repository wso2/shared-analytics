/*
 * Copyright (c)  2016, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 Inc. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

var gadgetConfig = {
    "id": "logErrorByClass",
    "title": "logErrorByClass",
    "datasource": "LOGANALYZER_SUMARIES",
    "type": "batch",
    "level": ["ERROR","INFO","WARN","DEBUG"],
    "maxUpdateValue": 10,
    "chartConfig": {"yAxis": 2, "xAxis": 1, "chartType": "bar"},
    "domain": "carbon.super"
};

var charts = [
    {
        name: "ERROR_CODE_DISTRIBUTION",
        columns: ["timestamp", "errorCount", "errorCode"],
        additionalColumns: ["week"],
        orderedField: "messageCount",
        schema: [{
            "metadata": {
                "names": ["day", "errorCount", "errorCode", "ID"],
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
            color: "errorCode",
            charts: [{type: "bar", y: "errorCount", mode: "stack"}],
            width: $(document).width()/1.27,
            height: $(document).height()/1.2,
            padding: {"top": 10, "left": 80, "bottom": 70, "right": 50},
            legend: false,
            tooltip: {
                "enabled": true,
                "color": "#e5f2ff",
                "type": "symbol",
                "content": ["ID", "errorCount", "day"],
                "label": true
            }
        }
    }
];
