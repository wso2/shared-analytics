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
    "name": "Log_Artifact_Deployed",
    "title": "Log Event",
    "barData": {
            "datasources": ["LOGANALYZER_ARTIFACT_DEPLOYMENT_DAILY", "LOGANALYZER_ARTIFACT_DELETED_DAILY"],
            "names": ["Deployed Artifacts","Removed Artifacts"]
        },
    "classes": ["API", "Proxy service", "Template", "Local entry", "Endpoint", "Sequence","Startup","Event source","Priority executor", "Inbound Endpoint"],
    "barCount" : 2,
    "meta": {
        "names": ["class", "Status", "Count"],
        "types": ["ordinal","ordinal", "linear"]
    },

    "queryParams" : { "fieldNames" : [[["ArtifactType"],["ArtifactType"],["ArtifactType"],["ArtifactType"],["ArtifactType"],["ArtifactType"],["ArtifactType"],["ArtifactType"],["ArtifactType"],["ArtifactType"]],[["ArtifactType"],["ArtifactType"],["ArtifactType"],["ArtifactType"],["ArtifactType"],["ArtifactType"],["ArtifactType"],["ArtifactType"],["ArtifactType"],["ArtifactType"]]],
                      "searchParams" : [[["API"],["Proxy service"], ["Template"], ["Local entry"], ["Endpoint"], ["Sequence"],["Startup"],["Event source"],["Priority executor"], ["Inbound Endpoint"]],[["API"], ["Proxy service"], ["Template"], ["Local entry"], ["Endpoint"], ["Sequence"],["Startup"],["Event source"],["Priority executor"], ["Inbound Endpoint"] ]]
},

    "chartConfig": {
        mode:"group",
        colorScale: ["#5CB85C", "#FF0000"],
        type: "bar",
        x: "class",
       charts : [{type: "bar",  y : "Count", color: "Status", mode:"group"}],
        width: $('body').width(),
        height: $('body').height(),
        padding: {"top": 10, "left": 80, "bottom": 70, "right": 200},
        tooltip: {"enabled":true, "color":"#e5f2ff", "type":"symbol", "content":["classes","Frequency","Status"], "label":true}
    },
    "domain": "carbon.super"
}];
