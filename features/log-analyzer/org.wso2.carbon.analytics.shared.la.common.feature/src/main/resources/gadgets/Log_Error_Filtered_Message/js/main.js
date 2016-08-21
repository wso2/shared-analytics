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

var prefs = new gadgets.Prefs();
var svrUrl = gadgetUtil.getGadgetSvrUrl(prefs.getString(PARAM_TYPE));
var client = new AnalyticsClient().init(null, null, svrUrl);
var fromTime;
var toTime;
var receivedData = [];
var canvasDiv = "#canvas";
var gadgetData = gadgetUtil.getTable(prefs.getString(PARAM_TYPE));
var viewFunctionMap = [];
var nanoScrollerSelector = $(".nano");
var dataTable;
var queryString = "";
var count = 0;

function initialize() {
    $(canvasDiv).html(gadgetUtil.getCustemText("No content to display", "Please click on an error category from the above" +
        " chart to view the log events."));
    nanoScrollerSelector.nanoScroller();
}

$(document).ready(function () {
    initialize();
});

function fetch() {
    viewFunctionMap.length = 0;
    receivedData.length = 0;
    var queryInfo = {
        tableName: gadgetData.dataSource,
        searchParams: {
            query: queryString,
            start: 0, //starting index of the matching record set
            count: count //page size for pagination
        }
    };
    client.search(queryInfo, function (d) {
        var obj = JSON.parse(d["message"]);
        if (d["status"] === "success") {
            var formattedEntry = [];
            for (var i = 0; i < obj.length; i++) {
                formattedEntry.length = 0;
                formattedEntry.push(moment(obj[i].timestamp).format("YYYY-MM-DD HH:mm:ss.SSS"));
                for (var column in gadgetData.schema.columns) {
                    var columnData = obj[i].values[gadgetData.schema.columns[column]];
                    for (var advancedColumn in gadgetData.advancedColumns) {
                        if (gadgetData.advancedColumns[advancedColumn].id === gadgetData.schema.columns[column]) {
                            columnData = columnFormatter(columnData, gadgetData.advancedColumns[advancedColumn].formatters)
                        }
                    }
                    formattedEntry.push(columnData);
                }
                if (gadgetData.actionParameters.length > 0) {
                    var viewFunctionParamerters = {};
                    for (var actionParameter in gadgetData.actionParameters) {
                        if (gadgetData.actionParameters[actionParameter] === "timestamp") {
                            viewFunctionParamerters["timestamp"] = obj[i].timestamp;
                        } else {
                            viewFunctionParamerters[gadgetData.actionParameters[actionParameter]] = obj[i].values[gadgetData.actionParameters[actionParameter]];
                        }
                    }
                    viewFunctionMap.push(viewFunctionParamerters);
                    formattedEntry.push('<a href="#" class="btn padding-reduce-on-grid-view" onclick= "viewFunction(\'' + viewFunctionMap.length + '\')"> <span class="fw-stack"> ' +
                        '<i class="fw fw-ring fw-stack-2x"></i> <i class="fw fw-view fw-stack-1x"></i> </span> <span class="hidden-xs">View</span> </a>')
                }
                receivedData.push(formattedEntry);
            }
            drawLogErrorFilteredTable();
        }
    }, function (error) {
        console.log(error);
        error.message = "Internal server error while data indexing.";
        onError(error);
    });
}

function columnFormatter(columnData, formatters) {
    var processedMessage = "";
    for (var formatter in formatters) {
        if (formatters[formatter].type === "json") {
            columnData = JSON.parse(columnData);
            for (var i = 0; i < formatters[formatter].keys.length; i++) {
                if (columnData[formatters[formatter].keys[i]] != undefined) {
                    processedMessage = processedMessage.concat(formatters[formatter].titles[i] + " : " + columnData[formatters[formatter].keys[i]] + formatters[formatter].delimiter);
                }
            }
        }

        if (formatters[formatter].type === "regx") {
            processedMessage = (processedMessage).match(formatters[formatter].pattern);
        }

        if (formatters[formatter].type === "substring") {
            processedMessage = processedMessage.substring(formatters[formatter].start, formatters[formatter].end);
        }
    }
    return processedMessage;
}

function drawLogErrorFilteredTable() {
    try {
        $(canvasDiv).empty();
        if ($.fn.dataTable.isDataTable('#tblMessages')) {
            dataTable.destroy();
        }
        var colNames = [];
        colNames.push({title: "Timestamp"});
        for (var i = 0; i < gadgetData.schema.titles.length; i++) {
            colNames.push({title: gadgetData.schema.titles[i]})
        }
        if (gadgetData.actionParameters.length > 0) {
            colNames.push({title: ""})
        }
        dataTable = $("#tblMessages").DataTable({
            data: receivedData,
            columns: colNames,
            dom: '<"dataTablesTop"' +
            'f' +
            '<"dataTables_toolbar">' +
            '>' +
            'rt' +
            '<"dataTablesBottom"' +
            'lip' +
            '>',
            columnDefs: [
                {"orderable": false, "targets": -1}
            ]
        });
        nanoScrollerSelector[0].nanoscroller.reset();
        dataTable.on('draw', function () {
            nanoScrollerSelector[0].nanoscroller.reset();
        });
    } catch (error) {
        console.log(error);
        error.message = "Error while drawing log event chart.";
        error.status = "";
        onError(error);
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
    $(canvasDiv).html(gadgetUtil.getLoadingText());
    var selectedArray = data["selected"];
    queryString = "";
    for (var i = 0; i < selectedArray.length; i++) {
        if (i != 0) {
            queryString = queryString.concat(" AND ");
        }
        for (var j = 0; j < selectedArray[i].values.length; j++) {
            if (j != 0) {
                queryString = queryString.concat(" OR ");
            }
            queryString = queryString.concat(selectedArray[i].filter + " : \"" + selectedArray[i].values[j] + "\"");
        }
    }
    fromTime = data["fromTime"];
    toTime = data["toTime"];
    count = data["count"];
    queryString = queryString.concat(" AND  _timestamp: [" + fromTime + " TO " + toTime + "]");
    fetch();
});

function viewFunction(data) {
    gadgets.Hub.publish("publisher", viewFunctionMap[data-1]);
}

function onError(msg) {
    $(canvasDiv).html(gadgetUtil.getErrorText(msg));
}