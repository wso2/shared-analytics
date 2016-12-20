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


var chart;
var from = gadgetUtil.timeFrom();
var to = gadgetUtil.timeTo();
var receivedData = [];
var initState = true;
var canvasDiv = "#canvas";
var prefs = new gadgets.Prefs();
var gadgetConfig = gadgetUtil.getChart("Log_Artifact_Deployed");
var async_tasks = gadgetConfig.classes.length;
var meta = gadgetConfig.meta;
var configChart;
var svrUrl = gadgetUtil.getGadgetSvrUrl("ESB");
var client = new AnalyticsClient().init(null, null, svrUrl);
var initialBarCount = gadgetConfig.barCount;
var currentBarCount = gadgetConfig.barCount;
var dataSourceCount = 0;

function initialize() {
    fetchDeployed(null, gadgetConfig.barData.names[initialBarCount - currentBarCount]);
}

$(document).ready(function () {
    initialize();
});

function fetchDeployed(logLevelIndex, param) {
    if (!logLevelIndex) {
        logLevelIndex = 0;
        if (dataSourceCount == 0) {
            receivedData.length = 0;
        }
    }

    var initialQuery = queryBuilder(logLevelIndex);

    var queryInfo = {
        tableName: gadgetConfig.barData.datasources[dataSourceCount],
        searchParams: {
            query: initialQuery + " AND  _timestamp: [" + from + " TO " + to + "]"
        }
    };

    client.searchCount(queryInfo, function (d) {
        if (d["status"] === "success") {
            receivedData.push([gadgetConfig.classes[logLevelIndex], param, parseInt(d["message"])]);
            async_tasks--;
            if (async_tasks == 0) {
                async_tasks = gadgetConfig.classes.length;

                if (--currentBarCount > 0) {
                    dataSourceCount++;
                    fetchDeployed(0, gadgetConfig.barData.names[currentBarCount]);

                } else {
                    if (initState) {
                        drawLogLevelChart();
                    } else {
                        initState = false;
                        redrawLogLevelChart();
                    }

                }
            } else {
                fetchDeployed(++logLevelIndex, gadgetConfig.barData.names[initialBarCount - currentBarCount]);
            }
        }
    }, function (error) {
        if (error === undefined) {
            onErrorCustom("Analytics server not found.", "Please troubleshoot connection problems.");
        } else {
            error.message = "Internal server error while data indexing.";
            onError(error);
        }
    });
}

function queryBuilder(logLevelIndex) {
    for (var i = 0; i < gadgetConfig.queryParams.fieldNames[dataSourceCount][logLevelIndex].length; i++) {
        return gadgetConfig.queryParams.fieldNames[dataSourceCount][logLevelIndex][i] + ": \"" + gadgetConfig.queryParams.searchParams[dataSourceCount][logLevelIndex][i] + "\"";
    }
}

function drawLogLevelChart() {
    try {

        chart = null;
        configChart = null;
        configChart = JSON.parse(JSON.stringify(gadgetConfig.chartConfig))
        var maxValue = getMaximumValue(receivedData);
        if (maxValue < 10) {
            configChart.yTicks = maxValue;
        }

        $(canvasDiv).empty();
        chart = new vizg(
            [
                {
                    "metadata": this.meta,
                    "data": receivedData
                }
            ],
            configChart
        );

        chart.draw(canvasDiv, [
            {
                type: "click",
                callback: onclick
            }
        ]);
    } catch (error) {
        error.message = "Error while drawing log event chart.";
        error.status = "";
        onError(error);
    }
}

function getMaximumValue(receivedData) {
    var max = 0;
    for (var i = 0; i < receivedData.length; i++) {
        if (receivedData[i][2] > max) {
            max = receivedData[i][2];
        }
    }
    return max;
}

function redrawLogLevelChart() {
    for (var i in receivedData) {
        chart.insert([receivedData[i]]);
    }
}

function publish(data) {
    gadgets.Hub.publish("publisher", data);
};

function subscribe(callback) {
    gadgets.HubSettings.onConnect = function () {
        gadgets.Hub.subscribe("subscriber", function (topic, data, subscriber) {
            callback(topic, data, subscriber)
        });
    };
}

subscribe(function (topic, data, subscriber) {
    $(canvasDiv).empty();
    from = parseInt(data["timeFrom"]);
    to = parseInt(data["timeTo"]);
    async_tasks = gadgetConfig.classes.length;
    currentBarCount = gadgetConfig.barCount;
    dataSourceCount = 0;
    fetchDeployed(null, gadgetConfig.barData.names[initialBarCount - gadgetConfig.barCount]);
});

function onError(msg) {
    $(canvasDiv).html(gadgetUtil.getErrorText(msg));
}

function onErrorCustom(title, message) {
    $(canvasDiv).html(gadgetUtil.getCustemText(title, message));
}

var onclick = function (event, item) {
    if (item != null) {
        publish(
            {
                "ArtifactType": item.datum["Artifact Type"],
                "Status": item.datum["Status"],
                "fromTime": from,
                "toTime": to
            }
        );
    }
};