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


var chartDefault;
var chartSecondary;
var from = gadgetUtil.timeFrom();
var to = gadgetUtil.timeTo();
var async_tasks = gadgetConfig.level.length;
var receivedData = [];
var initState = true;
var meta = gadgetConfig.meta;
var configChart = JSON.parse(JSON.stringify(gadgetConfig.chartConfig));
var configChartSecondary = JSON.parse(JSON.stringify(gadgetConfig.chartConfig));
var canvasDiv = "#canvasDefault";
var canvasDivSecondary = "#canvasSecondary";
var prefs = new gadgets.Prefs();
var svrUrl = gadgetUtil.getGadgetSvrUrl(prefs.getString(PARAM_TYPE));
var client = new AnalyticsClient().init(null,null,svrUrl);
var chartColorScale = ["#1abc9c", "#3498db", "#9b59b6", "#f1c40f", "#e67e22"];

function initialize() {
    gadgetConfig.chartConfig.colorScale = chartColorScale;
    fetch();
}

$(document).ready(function () {
    initialize();
    drawLegends();
 });

function drawLegends(){

    $("#legend").empty();
    $("#legendTitleDefault").append("<div style='position:absolute;top: 50px;left: "+(gadgetConfig.chartConfig.width-50)+";'>Legend</div>");
    for (var i = 0; i < gadgetConfig.level.length; i++) {
        $("#legendDefault").append(createLegendList(chartColorScale[i], "legendText2",gadgetConfig.level[i]));
    }

    $("#legendSecondary").empty();
    $("#legendTitleSecondary").append("<div style='position:absolute;top: 50px;left: "+(gadgetConfig.chartConfig.width-50)+";'>Legend</div>");
    for (var i = 0; i < gadgetConfig.level.length-2; i++) {
        $("#legendSecondary").append(createLegendList(chartColorScale[i], "legendText2",gadgetConfig.level[i+2]));
    }

    document.getElementById('drawCanvasDefault').style.display='block';
    document.getElementById('drawCanvasSecondary').style.display='none';

    $("#checkBox").append("<ul class='checkBoxText' style='list-style-type:none;position:absolute;bottom: 140px;left: "+(gadgetConfig.chartConfig.width-57)+";'><li class='context'><a class='legendTooltip' " +
                                                             "data-toggle='tooltip' data-placement='bottom' title=\""+"\" style='cursor:default'>"+"<input type=\"checkbox\" checked=\"checked\" onclick='onClickSelector(this);'> Enable Debug and Info Logs<br>"+"</a></span></li></ul>");
}

function onClickSelector(checkbox) {
    if(checkbox.checked){
       document.getElementById('drawCanvasDefault').style.display='block';
       document.getElementById('drawCanvasSecondary').style.display='none';
    }else{
       document.getElementById('drawCanvasDefault').style.display='none';
       document.getElementById('drawCanvasSecondary').style.display='block';
    }

}

function createLegendList(bulletColor, fullContext, subContext){
    return "<ul class='" +fullContext+"' style='list-style-type:none;'><li class='context'><svg width='10' height='10'>" +
        "<circle cx='5' cy='5' r='6' fill="+bulletColor+"/></svg><span class='textContext'><a class='legendTooltip' " +
        "data-toggle='tooltip' data-placement='bottom' title=\""+"\" style='cursor:default'>"+subContext+"</a></span></li></ul>";
}

function fetch(logLevelIndex) {
    if (!logLevelIndex) {
        receivedData.length = 0;
        logLevelIndex = 0;
    }

    var queryInfo = {
        tableName: gadgetConfig.datasource,
        searchParams: {
            query: "_level:" + gadgetConfig.level[logLevelIndex] + " AND  _eventTimeStamp: [" + from + " TO " + to + "]"
        }
    };

    client.searchCount(queryInfo, function (d) {
    if (d["status"] === "success") {
            console.log(gadgetConfig.level[logLevelIndex]);
            receivedData.push([gadgetConfig.level[logLevelIndex], parseInt(d["message"])]);
            async_tasks--;
            if (async_tasks == 0) {
                if (!initState) {
                    redrawDefaultLogLevelChart();

                } else {
                    drawDefaultLogLevelChart();
                    initState = true;
                }
                receivedData.length = 0;
                async_tasks = 3;
                fetchWithDebugAndInfo(2);
            } else {
                fetch(++logLevelIndex);
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

function fetchWithDebugAndInfo(logLevelIndex) {
    if (!logLevelIndex) {
        receivedData.length = 0;
        logLevelIndex = 0;
    }

    var queryInfo = {
        tableName: gadgetConfig.datasource,
        searchParams: {
            query: "_level:" + gadgetConfig.level[logLevelIndex] + " AND  _eventTimeStamp: [" + from + " TO " + to + "]"
        }
    };

    client.searchCount(queryInfo, function (d) {

    if (d["status"] === "success") {
        console.log(gadgetConfig.level[logLevelIndex]);
        receivedData.push([gadgetConfig.level[logLevelIndex], parseInt(d["message"])]);
        async_tasks--;
        if (async_tasks == 0) {
            if (!initState) {
                 redrawDefaultLogLevelChart(true);
            } else {
                 drawWithDebugLogLevelChart();
                 initState = false;
                }
            } else {
                fetchWithDebugAndInfo(++logLevelIndex);
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

function drawDefaultLogLevelChart() {
    try {
        $(canvasDiv).empty();

                chartDefault = new vizg(
                    [
                        {
                            "metadata": this.meta,
                            "data": receivedData
                        }
                    ],
                    configChart
                );
                chartDefault.draw(canvasDiv);

    } catch (error) {
        console.log(error);
        error.message = "Error while drawing log event chart.";
        error.status = "";
        onError(error);
    }
}

function drawWithDebugLogLevelChart() {
    try {
       $(canvasDivSecondary).empty();
       chartSecondary = new vizg(
           [
               {
                   "metadata": {
                   "names": ["LogLevel", "Frequency"],
                   "types": ["ordinal", "linear"]
                    },
                   "data": receivedData
               }
           ],
       configChartSecondary
       );
       chartSecondary.draw(canvasDivSecondary);
    } catch (error) {
        console.log(error);
        error.message = "Error while drawing log event chart.";
        error.status = "";
        onError(error);
    }
}

function redrawDefaultLogLevelChart(withDebugAndInfo) {
     for (var i in receivedData) {
          if(!withDebugAndInfo){
                chartDefault.insert([receivedData[i]]);
          }else{
                chartSecondary.insert([receivedData[i]]);
          }
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
    from = parseInt(data["timeFrom"]);
    to = parseInt(data["timeTo"]);
    async_tasks = gadgetConfig.level.length;
    fetch();
});

function onError(msg) {
    $(canvasDiv).html(gadgetUtil.getErrorText(msg));
}

function onErrorCustom(title, message) {
    $(canvasDiv).html(gadgetUtil.getCustemText(title, message));
}