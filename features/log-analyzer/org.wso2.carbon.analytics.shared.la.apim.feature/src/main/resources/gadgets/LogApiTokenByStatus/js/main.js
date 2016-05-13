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
var canvasDiv = "#canvas";
var table, chart;
var from = gadgetUtil.timeFrom();
var to = gadgetUtil.timeTo();
var async_tasks = gadgetConfig.status.length;
var dataM = [];
var initState = true;


var meta = {
    "names": ["Status", "Count", "StatusId"],
    "types": ["ordinal", "linear", "ordinal"]
};


var configChart = {
    colorScale: ["#438CAD", "#5CB85C", "#EECA5A", "#95A5A6"],
    type: "bar",
    x: "Status",
    color: "Status",
    charts: [{y: "Count"}],
    width: $('body').width(),
    height: $('body').height(),
    padding: {"top": 10, "left": 80, "bottom": 70, "right": 200}
};


function initialize() {
    fetch();
    $(canvasDiv).html(gadgetUtil().getDefaultText());
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
        tableName: "LOGANALYZER_APIKEY_STATUS",
        searchParams: {
            query: "status:" + gadgetConfig.status[ch] + " AND  _timestamp: [" + from + " TO " + to + "]"
        }
    };

    client.searchCount(queryInfo, function (d) {
        if (d["status"] === "success") {
            dataM.push([gadgetConfig.statusDescription[ch], parseInt(d["message"]), gadgetConfig.status[ch]]);
            async_tasks--;
            if (async_tasks == 0) {
                if (!initState) {
                    redrawApiKeyStatus();
                } else {
                    drawApiKeyStatus();
                    initState = false;
                }
            } else {
                fetch(++ch);
            }
        }
    }, function (error) {
        error.message = "Internal server error while data indexing.";
        onError(error);
    });

}

function drawApiKeyStatus() {
    try {
        $(canvasDiv).empty();
        chart = new vizg(
            [
                {
                    "metadata": this.meta,
                    "data": dataM
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
        error.message = "Error while drawing log event chart.";
        error.status = "";
        onError(error);
    }
}

function redrawApiKeyStatus() {
    try {
        for (var i in dataM) {
            chart.insert([dataM[i]]);
        }
    } catch (error) {
        error.message = "Error while drawing log event chart.";
        error.status = "";
        onError(error);
    }
}

function publish(data) {
    gadgets.Hub.publish("publisher", data);
};

var onclick = function (event, item) {
    if (item != null) {
        publish(
            {
                "filter": gadgetConfig.id,
                "selected": item.datum.StatusId
            }
        );
    }
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
    async_tasks = gadgetConfig.status.length;
    fetch();
});

function onError(msg) {
    $(canvasDiv).html(gadgetUtil.getErrorText(msg));
}