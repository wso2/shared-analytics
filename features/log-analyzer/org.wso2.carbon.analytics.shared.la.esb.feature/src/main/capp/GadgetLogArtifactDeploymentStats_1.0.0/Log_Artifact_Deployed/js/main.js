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
var async_tasks = gadgetConfig.ArtifactType.length;
var receivedData = [];
var initState = true;
var meta = gadgetConfig.meta;
var configChart = gadgetConfig.chartConfig;
var canvasDiv = "#canvas";
var prefs = new gadgets.Prefs();
var svrUrl = gadgetUtil.getGadgetSvrUrl("ESB");
var client = new AnalyticsClient().init(null,null,svrUrl);

function initialize() {
    fetchDeployed();
}

$(document).ready(function () {
    initialize();
});

function fetchDeployed(logLevelIndex) {
    if (!logLevelIndex) {
        receivedData.length = 0;
        logLevelIndex = 0;
    }
    var queryInfo = {
        tableName: gadgetConfig.datasourceOne,
        searchParams: {
            query: "ArtifactType:\"" + gadgetConfig.ArtifactType[logLevelIndex] + "\" AND  _timestamp: [" + from + " TO " + to + "]"
        }
    };

    client.searchCount(queryInfo, function (d) {
        if (d["status"] === "success") {

            receivedData.push([gadgetConfig.ArtifactType[logLevelIndex],"Deployed Artifacts", parseInt(d["message"])]);


            async_tasks--;
            if (async_tasks == 0) {
            async_tasks = gadgetConfig.ArtifactType.length;
                fetchRemoved(0);
            } else {
                fetchDeployed(++logLevelIndex);
            }
        }
    }, function (error) {
        if(error === undefined){
            onErrorCustom("Analytics server not found.", "Please troubleshoot connection problems.");
            console.log("Analytics server not found : Please troubleshoot connection problems.");
        }else{
            error.message = "Internal server error while data indexing.";
            onError(error);
            console.log(error);
        }
    });
}


function fetchRemoved(logLevelIndex) {
    console.log("ASdasda");
    if (!logLevelIndex) {
        logLevelIndex = 0;
    }

    var queryInfo = {
        tableName: gadgetConfig.datasourceTwo,
        searchParams: {
            query: "ArtifactType:\"" + gadgetConfig.ArtifactType[logLevelIndex] + "\" AND  _timestamp: [" + from + " TO " + to + "]"
        }
    };

    client.searchCount(queryInfo, function (d) {
        if (d["status"] === "success") {

            receivedData.push([gadgetConfig.ArtifactType[logLevelIndex],"Removed Artifacts", parseInt(d["message"])]);

            async_tasks--;
            if (async_tasks == 0) {
                if (!initState) {
                    redrawLogLevelChart();
                } else {
                    drawLogLevelChart();
                    initState = false;
                }
            } else {
                fetchRemoved(++logLevelIndex);
            }
        }
    }, function (error) {
        if(error === undefined){
            onErrorCustom("Analytics server not found.", "Please troubleshoot connection problems.");
            console.log("Analytics server not found : Please troubleshoot connection problems.");
        }else{
            error.message = "Internal server error while data indexing.";
            onError(error);
            console.log(error);
        }
    });
}

function drawLogLevelChart() {
    try {
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
        console.log(error);
        error.message = "Error while drawing log event chart.";
        error.status = "";
        onError(error);
    }
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
    from = parseInt(data["timeFrom"]);
    to = parseInt(data["timeTo"]);
    async_tasks = gadgetConfig.ArtifactType.length;
    fetchDeployed();
});

function onError(msg) {
    $(canvasDiv).html(gadgetUtil.getErrorText(msg));
}

function onErrorCustom(title, message) {
    $(canvasDiv).html(gadgetUtil.getCustemText(title, message));
}

var onclick = function (event, item) {
    if (item != null) {
    console.log("Asda");
           publish(
                {
                    "ArtifactType": item.datum["ArtifactType"],
                    "Status": item.datum["Status"],
                    "fromTime": from,
                    "toTime": to,
                }
            );
        }
};