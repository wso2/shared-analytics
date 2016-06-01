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
var prefs = new gadgets.Prefs();
var svrUrl = gadgetUtil.getGadgetSvrUrl(prefs.getString(PARAM_TYPE));
var client = new AnalyticsClient().init(null,null,svrUrl);
var canvasDiv = "#canvas";
var timeFrom = gadgetUtil.timeFrom();
var timeTo = gadgetUtil.timeTo();
var receivedData = [];
var nanoScrollerSelector = $(".nano");

var meta = {
    "names": ["apiArtifact", "Frequency"],
    "types": ["ordinal", "linear"]
};

var configTable = {
    key: "apiArtifact",
    title: "ArtifactDeployed",
    charts: [{
        type: "table",
        y: "Frequency",
        columns: ["apiArtifact", "Frequency"],
        columnTitles: ["APIM Artifact", "Frequency"]
    }
    ],
    width: $('body').width(),
    height: $('body').height(),
    padding: {"top": 40, "left": 80, "bottom": 70, "right": 100}
};


function initialize() {
    fetch();
}

$(document).ready(function () {
    initialize();
    nanoScrollerSelector.nanoScroller();
});

function fetch() {
    receivedData.length = 0;
    var queryInfo;
    var queryForSearchCount = {
        tableName: "LOGANALYZER_APIM_ARTIFACT_DEPLOYED_DAILY",
        searchParams: {
            query: "_timestamp: [" + timeFrom + " TO " + timeTo + "] AND tenantID:#tenantID#",
        }
    };

    client.searchCount(queryForSearchCount, function (d) {
        if (d["status"] === "success") {
            var totalRecordCount = d["message"];
            if (totalRecordCount > 0) {
                queryInfo = {
                    tableName: "LOGANALYZER_APIM_ARTIFACT_DEPLOYED_DAILY",
                    searchParams: {
                        groupByField: "artifact",
                        query: "_timestamp: [" + timeFrom + " TO " + timeTo + "] AND tenantID:#tenantID#",
                        aggregateFields: [
                            {
                                fields: ["artifactCount"], //Array of field names used as variables for aggregateFunction
                                aggregate: "SUM", //Aggregate Function Name
                                alias: "artifactCountSum"   //Alias given to the result after aggregation
                            }
                        ],
                        aggregateLevel: 0,
                        parentPath: [],
                        noOfRecords: totalRecordCount
                    }
                };
                client.searchWithAggregates(queryInfo, function (d) {
                    var obj = JSON.parse(d["message"]);
                    if (d["status"] === "success") {
                        for (var i = 0; i < obj.length; i++) {
                            receivedData.push([obj[i].values.artifact, obj[i].values.artifactCountSum]);
                        }
                        drawDeployedArtifactTable();
                    }
                }, function (error) {
                    console.log(error);
                    error.message = "Internal server error while data indexing.";
                    onError(error);
                });
            } else {
                $(canvasDiv).html(gadgetUtil.getEmptyRecordsText());
            }
        }
    }, function (error) {
        console.log(error);
        error.message = "Internal server error while data indexing.";
        onError(error);
    });
}

function drawDeployedArtifactTable() {
    $(canvasDiv).empty();
    try {
        var table = new vizg(
            [
                {
                    "metadata": this.meta,
                    "data": receivedData
                }
            ],
            configTable
        );
        table.draw(canvasDiv);
        $('#ArtifactDeployed').DataTable({
            dom: '<"dataTablesTop"' +
            'f' +
            '<"dataTables_toolbar">' +
            '>' +
            'rt' +
            '<"dataTablesBottom"' +
            'lip' +
            '>'
        });
        nanoScrollerSelector[0].nanoscroller.reset();
    } catch (error) {
        console.log(error);
        error.message = "Error while drawing table.";
        error.status = "";
        onError(error);
    }
}

function subscribe(callback) {
    gadgets.HubSettings.onConnect = function () {
        gadgets.Hub.subscribe("subscriber", function (topic, data, subscriber) {
            callback(topic, data, subscriber)
        });
    };
}

subscribe(function (topic, data, subscriber) {
    timeFrom = parseInt(data["timeFrom"]);
    timeTo = parseInt(data["timeTo"]);
    fetch();
});

function onError(msg) {
    $(canvasDiv).html(gadgetUtil.getErrorText(msg));
}