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
var fromTime;
var toTime;
var receivedData = [];
var filteredMessage;
var filteredCount;
var filteringByField;
var nanoScrollerSelector = $(".nano");
var canvasDiv = "#canvas";

var meta = {
    "names": ["message", "class", "timestamp", "action"],
    "types": ["ordinal", "ordinal", "ordinal", "ordinal"]
};

var configTable = {
    key: "timestamp",
    title: "FilteredMessages",
    charts: [{
        type: "table",
        columns: ["timestamp", "message", "class", "action"],
        columnTitles: ["Timestamp", "Message", "Class", "Action"]
    }
    ],
    width: $(window).width() * 0.95,
    height: $(window).width() * 0.65 > $(window).height() ? $(window).height() : $(window).width() * 0.65,
    padding: {"top": 100, "left": 30, "bottom": 22, "right": 70}
};

function initialize() {
    $(canvasDiv).html(gadgetUtil.getCustemText("No content to display","Please click on an error category from the above" +
        " chart to view the log events."));
    nanoScrollerSelector.nanoScroller();
}

$(document).ready(function () {
    initialize();
});

function fetch() {
    receivedData.length = 0;
    var queryInfo;
    queryInfo = {
        tableName: "LOGANALYZER",
        searchParams: {
            query: filteringByField + ": \"" + filteredMessage + "\" AND  _eventTimeStamp: [" + fromTime + " TO " + toTime + "] AND _level: \"ERROR\"",
            start: 0, //starting index of the matching record set
            count: filteredCount //page size for pagination
        }
    };
    client.search(queryInfo, function (d) {
        var obj = JSON.parse(d["message"]);
        if (d["status"] === "success") {
            for (var i = 0; i < obj.length; i++) {
                receivedData.push([obj[i].values._content, obj[i].values._class, new Date(obj[i].values._eventTimeStamp).toUTCString(),
                    "<a href='#' class='btn padding-reduce-on-grid-view' onclick= 'viewFunction(\""+obj[i].values._eventTimeStamp+"\",\""+obj[i].values._content+"\")'> <span class='fw-stack'> " +
                    "<i class='fw fw-ring fw-stack-2x'></i> <i class='fw fw-view fw-stack-1x'></i> </span> <span class='hidden-xs'>View</span> </a>"]);
            }
            drawLogErrorFilteredTable();
        }
    }, function (error) {
        error.message = "Internal server error while data indexing.";
        onError(error);
    });
}

function drawLogErrorFilteredTable() {
    try {
        $(canvasDiv).empty();
        var table = new vizg(
            [
                {
                    "metadata": this.meta,
                    "data": receivedData
                }
            ],
            configTable
        );
        table.draw(canvasDiv);
        var dataTable = $('#FilteredMessages').DataTable({
            dom: '<"dataTablesTop"' +
            'f' +
            '<"dataTables_toolbar">' +
            '>' +
            'rt' +
            '<"dataTablesBottom"' +
            'lip' +
            '>'
        });
        nanoScrollerSelector[0].nanoscroller.reset();
        dataTable.on('draw', function () {
            nanoScrollerSelector[0].nanoscroller.reset();
        });
    } catch (error) {
        error.message = "Error while drawing log event chart.";
        error.status = "";
        onError(error);
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
    $(canvasDiv).html(gadgetUtil.getLoadingText());
    filteredMessage = data["selected"].replace(/\"/g, "\\\"");
    filteredCount = data["count"];
    fromTime = data["fromTime"];
    toTime = data["toTime"];
    filteringByField = data["filter"];
    if (filteringByField === "MESSAGE_LEVEL_ERROR") {
        filteringByField = "_content";
    } else {
        filteringByField = "_class";
    }
    fetch();
});

function viewFunction(timestamp, message) {
    publish({
        timestamp: timestamp,
        message: message
    });
}

function onError(msg) {
    $(canvasDiv).html(gadgetUtil.getErrorText(msg));
}