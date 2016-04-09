/*
 *
 *  Copyright (c) 2016, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 * /
 */
var client = new AnalyticsClient().init();
var div = "#chartErrorClass";
var from = 1460313000000;
var to = 1460658600000;
var dataM = [];
var names = ["day", "count", "class"];
var types = ["ordinal", "linear", "ordinal"];

function initialize() {
    fetch();
}

$(document).ready(function () {
    initialize();
});

function fetch() {
    dataM.length = 0;
    var queryInfo = {
        tableName: "LOGANALYZER_CLASS_LEVEL_ERROR",
        searchParams: {
            query: "_timestamp: [" + abs(from-2000*60*60*24) + " TO " + to + "]",
            start : 0, //starting index of the matching record set
            count : 100 //page size for pagination
        }
    };

    client.search(queryInfo, function (d) {
        if (d["status"] === "success") {
            var tomorrow = new Date(from);
            var diffDays = daysBetween(new Date(from), new Date(to));
            for (var i= 0; i< diffDays;i++){
                dataM.push([tomorrow.toDateString(),0,"No Entry"]);
                tomorrow = new Date(tomorrow.getTime()+1000*60*60*24);
            }
            var obj = JSON.parse(d["message"]);
            for (var i =0; i < obj.length ;i++){
                var tempDay = new Date(obj[i].timestamp);
                dataM.push([tempDay.toDateString(),obj[i].values.count,obj[i].values.class]);
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
        x : "day",
        colorScale:["#ecf0f1","#1abc9c", "#3498db", "#9b59b6", "#f1c40f","#e67e22","#e74c3c","#95a5a6","#2c3e50"],
        xAxisAngle: "true",
        color:"class",
        charts : [{type: "bar",  y : "count", mode:"stack"}],
        width: 700,
        height: 200
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
    console.log("From Time : "+parseInt(data["timeFrom"]));
    console.log("To Time : "+parseInt(data["timeTo"]));
    from = parseInt(data["timeFrom"]);
    to = parseInt(data["timeTo"]);
    isRedraw = true;
    fetch();
});

function daysBetween( date1, date2 ) {
    //Get 1 day in milliseconds
    var one_day=1000*60*60*24;

    // Convert both dates to milliseconds
    var date1_ms = date1.getTime();
    var date2_ms = date2.getTime();

    // Calculate the difference in milliseconds
    var difference_ms = Math.abs(date2_ms - date1_ms);

    // Convert back to days and return
    return Math.round(difference_ms/one_day);
}


