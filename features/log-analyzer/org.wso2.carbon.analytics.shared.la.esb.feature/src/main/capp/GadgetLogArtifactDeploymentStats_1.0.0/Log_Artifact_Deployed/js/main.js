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
var gadgetConfig = gadgetUtil.getGadgetConf("Log_Artifact_Deployed");
var async_tasks = gadgetConfig.classes.length;
var meta = gadgetConfig.meta;
var configChart = gadgetConfig.chartConfig;
var svrUrl = gadgetUtil.getGadgetSvrUrl("ESB");
var client = new AnalyticsClient().init(null,null,svrUrl);
var initialBarCount = gadgetConfig.barCount;
var dataSourceCount = 0;

function initialize() {
    fetchDeployed(null,gadgetConfig.barData.names[initialBarCount - gadgetConfig.barCount]);
}

$(document).ready(function () {
    initialize();
});

function fetchDeployed(logLevelIndex, param) {
    if (!logLevelIndex ) {
        logLevelIndex = 0;
        if(dataSourceCount == 0){
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
            receivedData.push([gadgetConfig.classes[logLevelIndex],param, parseInt(d["message"])]);
            async_tasks--;
            if (async_tasks == 0) {
            async_tasks = gadgetConfig.classes.length;

                if(--gadgetConfig.barCount > 0){
                    dataSourceCount++;
                    fetchDeployed(0, gadgetConfig.barData.names[gadgetConfig.barCount]);

                }else{
                    if(initState){
                       drawLogLevelChart();
                    }else{
                       initState=  false;
                       redrawLogLevelChart();
                    }

                }
            } else {
                if(gadgetConfig.barCount > 1){
                    fetchDeployed(++logLevelIndex,gadgetConfig.barData.names[initialBarCount - gadgetConfig.barCount]);
                    }
                else{
                    fetchDeployed(++logLevelIndex,gadgetConfig.barData.names[initialBarCount - gadgetConfig.barCount]);
                }
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

function queryBuilder(logLevelIndex){
     for(i=0; i < gadgetConfig.queryParams.fieldNames[dataSourceCount][logLevelIndex].length; i++){
              return gadgetConfig.queryParams.fieldNames[dataSourceCount][logLevelIndex][i] +": \"" + gadgetConfig.queryParams.searchParams[dataSourceCount][logLevelIndex][i] + "\"";
    }
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
    $(canvasDiv).empty();
    from = parseInt(data["timeFrom"]);
    to = parseInt(data["timeTo"]);
    async_tasks = gadgetConfig.classes.length;
    gadgetConfig.barCount = 2;
    dataSourceCount = 0;
    fetchDeployed(null,gadgetConfig.barData.names[initialBarCount - gadgetConfig.barCount]);
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
                    "ArtifactType": item.datum["class"],
                    "Status": item.datum["Status"],
                    "fromTime": from,
                    "toTime": to,
                }
            );
        }
};