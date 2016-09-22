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
var async_tasks = gadgetConfig.errorType.length;
var receivedData = [];
var initState = true;
var meta = gadgetConfig.meta;
var configChart = JSON.parse(JSON.stringify(gadgetConfig.chartConfig));
var configChartSecondary = JSON.parse(JSON.stringify(gadgetConfig.chartConfig));
var canvasDiv = "#canvasDefault";
var canvasDivSecondary = "#canvasSecondary";
var prefs = new gadgets.Prefs();
var svrUrl = gadgetUtil.getGadgetSvrUrl("ESB");
var client = new AnalyticsClient().init(null,null,svrUrl);
var fullChartColorScale = ["#5CB85C", "#438CAD", "#EECA5A", "#D9483D", "#95A5A6", "#800080", "#700080"];
var currentChartColorScale = [];
var checkedBars= [true, true, true, true , true, true, true];
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


function transportErrorsClick(checkbox) {
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

function generalErrorsClick(checkbox) {
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

function endpointFailuresClick(checkbox) {
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

function nonFatelWarningClick(checkbox) {
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

function endpointIsNullClick(checkbox) {
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

function calloutOpFailuresClick(checkbox) {
    checkedBars[5] = !checkedBars[5];
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

function checkboxCutomClick(checkbox) {
    checkedBars[6] = !checkedBars[6];
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
               xAxisValues.push(gadgetConfig.errorType[i]);
        }}

}



function createLegendList(bulletColor, fullContext, subContext){
    return "<ul class='" +fullContext+"' style='list-style-type:none;'><li class='context'><svg width='10' height='10'>" +
        "<circle cx='5' cy='5' r='6' fill="+bulletColor+"/></svg><span class='textContext'><a class='legendTooltip' " +
        "data-toggle='tooltip' data-placement='bottom' title=\""+"\" style='cursor:default'>"+subContext+"</a></span></li></ul>";
}

function fetch(errorCodeTypeIndex) {
    if (!errorCodeTypeIndex) {
        receivedData.length = 0;
        errorCodeTypeIndex = 0;
    }

    var query = "ErrorType:\"" + xAxisValues[errorCodeTypeIndex] + "\" AND  _timestamp: [" + from + " TO " + to + "]";
    var sorting = [
        {
            field: "ErrorType",
            sortType: "DESC", // This can be ASC, DESC
            reversed: "false" //optional
        }
    ];

    var queryInfo = queryBuilder(gadgetConfig.datasource, query, 0, 100, sorting);

    client.search(queryInfo, function (d) {
        var result = JSON.parse(d["message"]);
        
        if (d["status"] === "success") {
            receivedData.push([result[0].values.ErrorType, parseInt(result[0].values.ErrorCount)]);
            async_tasks--;
            if (async_tasks == 0) {
                if (!initState) {
                    redrawLogLevelChart();
                } else {
                    drawLogLevelChart();
                    initState = false;
                }
            } else {
                fetch(++errorCodeTypeIndex);
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

var maxValue = getMaximumValue(receivedData);
    if(maxValue < 10){
      configChart.yTicks = maxValue;
    }

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
                chartDefault.draw(canvasDiv, [
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

var onclick = function (event, item) {
	 publish(
            {
                "selected":
                {
                    "type": item.datum["Error Type"]
                },
                "count": item.datum["Count"],
                "fromTime": from,
                "toTime": to
            }
        );
};


function publish(data) {
    gadgets.Hub.publish("publisher", data);
};

function redrawDefaultLogLevelChart(withDebugAndInfo) {
     for (var i in receivedData) {
          if(!withDebugAndInfo){
                chartDefault.insert([receivedData[i]]);
          }else{
                chartSecondary.insert([receivedData[i]]);
          }
     }
}

function getMaximumValue(receivedData){
    var max = 0;
    for(var i=0;i<receivedData.length;i++){
        if(receivedData[i][1] > max){
            max = receivedData[i][1];
        }
    }
    return max;
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

function queryBuilder(tableName, query, start, count, sortBy) {
    return {
        tableName: tableName,
        searchParams: {
            query: query,
            start: start, //starting index of the matching record set
            count: count, //page size for pagination
            sortBy: sortBy
        }
    };
}

function onError(msg) {
    $(canvasDiv).html(gadgetUtil.getErrorText(msg));
}

function onErrorCustom(title, message) {
    $(canvasDiv).html(gadgetUtil.getCustemText(title, message));
}