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
var gatewayPort = location.port - 9443 + 8243; //Calculate the port offset based gateway port.
var serverUrl = "https://" + location.hostname + ":" + gatewayPort + "/LogAnalyzerRestApi/1.0";
var client = new AnalyticsClient().init(null, null, serverUrl);
var from = gadgetUtil.timeFrom();
var to = gadgetUtil.timeTo();
var dataM = [];
var filteredMessage;
var filteredTime;
var logError = "<ul class='logError'>{{#arr}}<li class='data'>{{date}}</li><li class='level'>{{level}}</li><li class='class'>{{class}}</li><li class='content'>{{content}}</li><li class='trace'>{{trace}}</li>{{/arr}}</ul>";
var logDebug = "<ul class='logDebug'>{{#arr}}<li class='data'>{{date}}</li><li class='level'>{{level}}</li><li class='class'>{{class}}</li><li class='content'>{{content}}</li><li class='trace'>{{trace}}</li>{{/arr}}</ul>";
var logWarn = "<ul class='logWarn'>{{#arr}}<li class='data'>{{date}}</li><li class='level'>{{level}}</li><li class='class'>{{class}}</li><li class='content'>{{content}}</li><li class='trace'>{{trace}}</li>{{/arr}}</ul>";
var logInfo = "<ul class='logInfo'>{{#arr}}<li class='data'>{{date}}</li><li class='level'>{{level}}</li><li class='class'>{{class}}</li><li class='content'>{{content}}</li><li class='trace'>{{trace}}</li>{{/arr}}</ul>";
var logSelectedError = "<ul id = 'selectedError' class='logSelectedError'>{{#arr}}<li class='data'>{{date}}</li><li class='level'>{{level}}</li><li class='class'>{{class}}</li><li class='content'>{{content}}</li><li class='trace'>{{trace}}</li>{{/arr}}</ul>";
var logSelectedWarn = "<ul id = 'selectedWarn' class='logSelectedWarn'>{{#arr}}<li class='data'>{{date}}</li><li class='level'>{{level}}</li><li class='class'>{{class}}</li><li class='content'>{{content}}</li><li class='trace'>{{trace}}</li>{{/arr}}</ul>";
var nanoScrollerSelector = $(".nano");
var canvasDiv = "#canvas";

function initialize() {
    $(canvasDiv).html(gadgetUtil.getDefaultText());
    nanoScrollerSelector.nanoScroller();
}

$(document).ready(function () {
    initialize();
});

function fetch() {
    dataM.length = 0;
    var queryInfo;
    var queryForSearchCount = {
        tableName: "LOGANALYZER",
        searchParams: {
            query: "_eventTimeStamp: [" + from + " TO " + to + "]",
        }
    };

    client.searchCount(queryForSearchCount, function (d) {
        if (d["status"] === "success") {
            var totalRecordCount = d["message"];
            queryInfo = {
                tableName: "LOGANALYZER",
                searchParams: {
                    query: "_eventTimeStamp: [" + from + " TO " + to + "]",
                    start: 0, //starting index of the matching record set
                    count: totalRecordCount //page size for pagination
                }
            };
            client.search(queryInfo, function (d) {
                var obj = JSON.parse(d["message"]);
                if (d["status"] === "success") {
                    for (var i = 0; i < obj.length; i++) {
                        dataM.push([{
                            date: new Date(parseInt(obj[i].values._eventTimeStamp)).toUTCString(),
                            level: obj[i].values._level,
                            class: obj[i].values._class,
                            content: obj[i].values._content,
                            trace: (obj[i].values._trace ? obj[i].values._trace : ""),
                            timestamp: parseInt(obj[i].values._eventTimeStamp)
                        }]);
                    }
                    drawLogViewer();
                }
            }, function (error) {
                error.message = "Internal server error while data indexing.";
                onError(error);
            });
        }
    }, function (error) {
        error.message = "Internal server error while data indexing.";
        onError(error);
    });
}

function drawLogViewer() {
    $(canvasDiv).empty();
    var selectedDiv = "logViewer";
    for (var i = 0; i < dataM.length; i++) {
        if (dataM[i][0].level === "ERROR") {
            if (dataM[i][0].content === filteredMessage && dataM[i][0].timestamp === filteredTime) {
                $(canvasDiv).append(Mustache.to_html(logSelectedError, {arr: dataM[i]}));
            } else {
                $(canvasDiv).append(Mustache.to_html(logError, {arr: dataM[i]}));
            }
            selectedDiv = "selectedError";
        } else if (dataM[i][0].level === "WARN") {
            if (dataM[i][0].content === filteredMessage && dataM[i][0].timestamp === filteredTime) {
                $(canvasDiv).append(Mustache.to_html(logSelectedWarn, {arr: dataM[i]}));
            } else {
                $(canvasDiv).append(Mustache.to_html(logDebug, {arr: dataM[i]}));
            }
            selectedDiv = "selectedWarn";
        } else if (dataM[i][0].level === "DEBUG") {
            $(canvasDiv).append(Mustache.to_html(logWarn, {arr: dataM[i]}));
        } else {
            $(canvasDiv).append(Mustache.to_html(logInfo, {arr: dataM[i]}));
        }
    }
    nanoScrollerSelector[0].nanoscroller.reset();
    document.getElementById(selectedDiv).scrollIntoView();
}

function subscribe(callback) {
    gadgets.HubSettings.onConnect = function () {
        gadgets.Hub.subscribe("subscriber", function (topic, data, subscriber) {
            callback(topic, data, subscriber)
        });
    };
}

subscribe(function (topic, data, subscriber) {
    $(canvasDiv).html(gadgetUtil.getLoadingText());
    filteredTime = parseInt(data["timestamp"]);
    filteredMessage = data["message"];
    var fromDate = filteredTime - (gadgetConfig.timeDomain);
    var toDate = filteredTime + (gadgetConfig.timeDomain);
    from = fromDate;
    to = toDate;
    fetch();
});

function onError(msg) {
    $(canvasDiv).html(gadgetUtil.getErrorText(msg));
}
