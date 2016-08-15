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
var fullChartColorScale = ["#5CB85C", "#438CAD", "#EECA5A", "#D9483D", "#95A5A6"];
var currentChartColorScale = [];
var chartColorScale2 = ["#EECA5A", "#D9483D", "#95A5A6"];
var checkedBars= [true, true, true, true , true];
var xAxisValues= [];

function initialize() {
  xAxisValues.length = 0;
  currentChartColorScale.length=0;
  barColorBuilder();
  xAxisBuilder();
  initState = true;
  gadgetConfig.chartConfig.colorScale = currentChartColorScale;
  async_tasks = xAxisValues.length;

  if(async_tasks> 0){
    fetch();
  }else{
    onErrorCustom("Analytics server not found.", "Please troubleshoot connection problems.");
  }
}

$(document).ready(function () {
    initialize();
 });


function debugClick(checkbox) {
    checkedBars[0] = !checkedBars[0];
    xAxisValues.length = 0;
    currentChartColorScale.length=0;
    barColorBuilder();
    xAxisBuilder();
    initState = true;
    gadgetConfig.chartConfig.colorScale = currentChartColorScale;
    async_tasks = xAxisValues.length;

    var dataArray = checkBoxCheckCounter();
    if(dataArray[0] === 1){
           document.getElementById(gadgetConfig.checkBoxId[dataArray[1]]).disabled= true;
    }else{
           enableCheckBoxes();
    }
    fetch();
}

function infoClick(checkbox) {
    checkedBars[1] = !checkedBars[1];
    xAxisValues.length = 0;
    currentChartColorScale.length=0;
    barColorBuilder();
    xAxisBuilder();
    gadgetConfig.chartConfig.colorScale = currentChartColorScale;
    initState = true;
    async_tasks = xAxisValues.length;
    var dataArray = checkBoxCheckCounter();
    if(dataArray[0] === 1){
           document.getElementById(gadgetConfig.checkBoxId[dataArray[1]]).disabled= true;
    }else{
           enableCheckBoxes();
    }
    fetch();
}

function warnClick(checkbox) {
    checkedBars[2] = !checkedBars[2];
    xAxisValues.length = 0;
    currentChartColorScale.length=0;
    barColorBuilder();
    xAxisBuilder();
    gadgetConfig.chartConfig.colorScale = currentChartColorScale;
    initState = true;
    async_tasks = xAxisValues.length;
    var dataArray = checkBoxCheckCounter();
    if(dataArray[0] === 1){
           document.getElementById(gadgetConfig.checkBoxId[dataArray[1]]).disabled= true;
    }else{
           enableCheckBoxes();
    }
    fetch();
}

function errorClick(checkbox) {
    checkedBars[3] = !checkedBars[3];
    xAxisValues.length = 0;
    currentChartColorScale.length=0;
    barColorBuilder();
    xAxisBuilder();
    gadgetConfig.chartConfig.colorScale = currentChartColorScale;
    initState = true;
    async_tasks = xAxisValues.length;
    var dataArray = checkBoxCheckCounter();
    if(dataArray[0] === 1){
           document.getElementById(gadgetConfig.checkBoxId[dataArray[1]]).disabled= true;
    }else{
           enableCheckBoxes();
    }
    fetch();
}

function fatalClick(checkbox) {
    checkedBars[4] = !checkedBars[4];
    xAxisValues.length = 0;
    currentChartColorScale.length=0;
    barColorBuilder();
    xAxisBuilder();
    gadgetConfig.chartConfig.colorScale = currentChartColorScale;
    initState = true;
    async_tasks = xAxisValues.length;
    var dataArray = checkBoxCheckCounter();
    if(dataArray[0] === 1){
           document.getElementById(gadgetConfig.checkBoxId[dataArray[1]]).disabled= true;
    }else{
           enableCheckBoxes();
    }

    fetch();
}

function enableCheckBoxes(){
    for(var i =0; i < gadgetConfig.checkBoxId.length; i++){
        document.getElementById(gadgetConfig.checkBoxId[i]).disabled= false;
    }
}

function barColorBuilder(){
    for( var i = 0; i < checkedBars.length; i++ ){
        if(checkedBars[i]){
         currentChartColorScale.push(fullChartColorScale[i]);
        }
    }
}

function checkBoxCheckCounter(){
    var position
    var count = 0;
    for (var i= 0; i < checkedBars.length; i++){
        if(checkedBars[i]){
            count++;
            position = i;
        }
    }
    var dataArray = new Array(count,position);
    return dataArray;
}
function xAxisBuilder(){
        for( var i = 0; i < checkedBars.length; i++ ){
           if(checkedBars[i]){
               xAxisValues.push( gadgetConfig.level[i]);
        }}

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
            query: "_level:" + xAxisValues[logLevelIndex] + " AND  _eventTimeStamp: [" + from + " TO " + to + "]"
        }
    };

    client.searchCount(queryInfo, function (d) {
        if (d["status"] === "success") {
            receivedData.push([xAxisValues[logLevelIndex], parseInt(d["message"])]);
            async_tasks--;
            if (async_tasks == 0) {
                if (!initState) {
                    redrawLogLevelChart();
                } else {
                    drawLogLevelChart();
                    initState = false;
                }
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

function drawLogLevelChart() {

chartDefault = null;
configChart = null;
configChart = JSON.parse(JSON.stringify(gadgetConfig.chartConfig));
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
configChartSecondary.colorScale = chartColorScale2;

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
   xAxisValues.length = 0;
   currentChartColorScale.length=0;
   barColorBuilder();
   xAxisBuilder();
   gadgetConfig.chartConfig.colorScale = currentChartColorScale;
   initState = true;
   async_tasks = xAxisValues.length;
   var dataArray = checkBoxCheckCounter();
   if(dataArray[0] === 1){
          document.getElementById(gadgetConfig.checkBoxId[dataArray[1]]).disabled= true;
   }else{
          enableCheckBoxes();
   }

     fetch();
});

function onError(msg) {
    $(canvasDiv).html(gadgetUtil.getErrorText(msg));
}

function onErrorCustom(title, message) {
    $(canvasDiv).html(gadgetUtil.getCustemText(title, message));
}