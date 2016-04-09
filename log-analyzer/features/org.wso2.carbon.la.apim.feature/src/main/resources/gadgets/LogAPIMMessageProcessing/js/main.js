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
var client = new AnalyticsClient().init();
var div = "#chartAPIMMessageProcessing";
var from = new Date(moment().subtract(1, 'year')).getTime();
var to = new Date(moment()).getTime();
var dataM = [];
var names = ["count", "apiName"];
var types = ["linear", "ordinal"];

function initialize() {
    fetch();
}

$(document).ready(function () {
    initialize();
});

function fetch() {
    dataM.length = 0;
    var queryInfo;
    var newFrom;
    var newTo;
    queryInfo = {
        tableName: "LOGANALYZER_APIM_MESSAGE_PROCESSING_DAILY",
        searchParams: {
            query: "_timestamp: [" + from + " TO " + to + "]",
            start: 0, //starting index of the matching record set
            count: 100 //page size for pagination
        }
    };

    console.log(queryInfo);

    client.search(queryInfo, function (d) {
        newFrom = new Date(from);
        newTo = new Date(to);
        var obj = JSON.parse(d["message"]);
        if (d["status"] === "success") {
            for (var i = 0; i < obj.length; i++) {
                dataM.push([obj[i].values.apiCount, obj[i].values.apiName]);
            }
            drawChartByClass();
        }
    }, function (error) {
        console.log("error occured: " + error);
    });
}

function drawChartByClass() {
    $("#chartErrorClass").empty();
    var configChart = {
        type: "bar",
        x: "apiName",
        title: "ApiName",
        colorScale: ["#1abc9c", "#3498db", "#9b59b6", "#f1c40f", "#e67e22", "#e74c3c", "#95a5a6", "#2c3e50"],
        xAxisAngle: "true",
        color: "apiName",
        charts: [{type: "bar", y: "count", mode: "stack"}],
        width: $('body').width() + 100,
        height: $('body').height(),
        padding: {"top": 10, "left": 80, "bottom": 130, "right": 400},
        tooltip: {"enabled": true, "color": "#e5f2ff", "type": "symbol", "content": ["apiName", "count"], "label": true}
    };

    var meta = {
        "names": names,
        "types": types
    };

    var chart = new vizg(
        [
            {
                "metadata": meta,
                "data": dataM
            }
        ],
        configChart
    );
    chart.draw(div);
}


function subscribe(callback) {
    gadgets.HubSettings.onConnect = function () {
        gadgets.Hub.subscribe("subscriber", function (topic, data, subscriber) {
            callback(topic, data, subscriber)
        });
    };
}

subscribe(function (topic, data, subscriber) {
    console.log("From Time : " + parseInt(data["timeFrom"]));
    console.log("To Time : " + parseInt(data["timeTo"]));
    from = parseInt(data["timeFrom"]);
    to = parseInt(data["timeTo"]);
    isRedraw = true;
    fetch();
});

function daysBetween(date1, date2) {
    //Get 1 day in milliseconds
    var one_day = 1000 * 60 * 60 * 24;

    // Convert both dates to milliseconds
    var date1_ms = date1.getTime();
    var date2_ms = date2.getTime();

    // Calculate the difference in milliseconds
    var difference_ms = Math.abs(date2_ms - date1_ms);

    // Convert back to days and return
    return Math.round(difference_ms / one_day);
}


