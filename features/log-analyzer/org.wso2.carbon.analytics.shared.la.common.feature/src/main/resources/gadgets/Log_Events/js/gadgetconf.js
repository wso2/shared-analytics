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
    "id": "logEventChart",
    "title": "Log Event",
    "datasource": "LOGANALYZER",
    "level": ["DEBUG", "INFO", "WARN", "ERROR", "FATAL"],
    "meta": {
        "names": ["LogLevel", "Frequency"],
        "types": ["ordinal", "linear"]
    },
    "chartConfig": {
        colorScale: ["#1abc9c", "#3498db", "#9b59b6", "#f1c40f", "#e67e22", "#e74c3c", "#2c3e50", "#2ecc71", "#F16272","#bcbd22"],
        type: "bar",
        x: "LogLevel",
        color: "LogLevel",
        charts: [{y: "Frequency"}],
        width: $(document).width()/1.27,
        height: $(document).height()/1.2,
        legend: false,
        padding: {"top": 10, "left": 80, "bottom": 70, "right": 200}
    },
    "domain": "carbon.super"
};

