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
var gatewayPort = location.port -9443 + 8243; //Calculate the port offset based gateway port.
var serverUrl = "https://"+location.hostname +":"+ gatewayPort+"/LogAnalyzerRestApi/1.0";
var client = new AnalyticsClient().init(null, null, serverUrl);
var chart;
var from = new Date(moment().subtract(29, 'days')).getTime();
var to = new Date(moment()).getTime();
var async_tasks = gadgetConfig.level.length;
var dataM = [];
var initState = true;
var meta = gadgetConfig.meta;
var configChart = gadgetConfig.chartConfig;
var div = "#chartLogLevel";


function initialize() {
    fetch();
}

function getDefaultText() {
    return '<div class="status-message">'+
        '<div class="message message-info">'+
        '<h4><i class="icon fw fw-info"></i>No content to display</h4>'+
        '<p>Please select a date range to view stats.</p>'+
        '</div>'+
        '</div>';
};

function getEmptyRecordsText() {
    return '<div class="status-message">'+
        '<div class="message message-info">'+
        '<h4><i class="icon fw fw-info"></i>No records found</h4>'+
        '<p>Please select a date range to view stats.</p>'+
        '</div>'+
        '</div>';
}

$(document).ready(function () {
    initialize();
});

function fetch(ch) {
    if (!ch) {
        dataM.length = 0;
        ch = 0;
    }
    var queryInfo = {
        tableName: gadgetConfig.datasource,
        searchParams: {
            query: "_level:" + gadgetConfig.level[ch] + " AND  _eventTimeStamp: [" + from + " TO " + to + "]"
        }
    };

    client.searchCount(queryInfo, function (d) {
        if (d["status"] === "success") {
            dataM.push([gadgetConfig.level[ch], parseInt(d["message"])]);
            async_tasks--;
            if (async_tasks == 0) {
                if(!initState){
                    redrawLogLevelChart();
                }else{
                    drawLogLevelChart();
                    initState =false;
                }
            } else {
                fetch(++ch);
            }
        }
    }, function (error) {
        console.log("error occured: " + error);
    });
}

function drawLogLevelChart() {
    $("#chartLogLevel").empty();

    chart = new vizg(
        [
            {
                "metadata": this.meta,
                "data": dataM
            }
        ],
        configChart
    );
    chart.draw(div);
}

function redrawLogLevelChart(){
    for(var i in dataM){
        chart.insert([dataM[i]]);
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