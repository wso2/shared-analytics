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
var client = new AnalyticsClient().init(null,null,svrUrl);
var fromTime;
var toTime;
var receivedData = [];
var filteredMessageArray  = [];
var filteringByField;
var nanoScrollerSelector = $(".nano");
var canvasDiv = "#canvas";
var iteratorCount = 0;
var dataTable;
var ArtifactType;
var status;

function initialize() {
    $(canvasDiv).html(gadgetUtil.getCustemText("No content to display","Please click on an error category from the above" +
        " chart to view the log events."));
    nanoScrollerSelector.nanoScroller();
}

$(document).ready(function () {
    initialize();
});

function fetch(artifactType, status) {
    var queryInfo;
    var queryArtifactStatus;
    if(status === "Deployed Artifacts"){
       queryArtifactStatus = "added"
    }else{
       queryArtifactStatus = "removed"
    }
    queryInfo = {
        tableName: "LOGANALYZER",
        searchParams: {
            query: "_content : \"" + artifactType + "\" AND _class:\"org.wso2.carbon.mediation.dependency.mgt.DependencyTracker\" AND _timestamp: [" + fromTime + " TO " + toTime + "] AND _content : \"" + queryArtifactStatus +"\"",
            start: 0, //starting index of the matching record set
            count: 90 //page size for pagination
        }
    };
    client.search(queryInfo, function (d) {
        var obj = JSON.parse(d["message"]);
        if (d["status"] === "success") {
            var artifactName;
            for (var i = 0; i < obj.length; i++) {
                artifactName = (obj[i].values._content).match(/(\ : )(.*?)(?=\ )/);
                artifactName = artifactName[0].substring(2, artifactName[0].length);
                var msg = obj[i].values._content.replace('\n',"");
                msg = msg.replace(/[\r\n]/g, "");
                receivedData.push([moment(obj[i].timestamp).format("YYYY-MM-DD HH:mm:ss.SSS"), artifactType, artifactName , obj[i].values._content, '<a href="#" class="btn padding-reduce-on-grid-view" onclick= "viewFunction(\''+obj[i].values._eventTimeStamp+'\',\''+msg+'\')"> <span class="fw-stack"> ' +
                                                                                                                                                                        '<i class="fw fw-ring fw-stack-2x"></i> <i class="fw fw-view fw-stack-1x"></i> </span> <span class="hidden-xs">View</span> </a>']);
            }
                drawLogErrorFilteredTable();
        }
    }, function (error) {
        console.log(error);
        error.message = "Internal server error while data indexing.";
        onError(error);
    });
}

function viewFunction(timestamp, message) {
    publish({
        timestamp: timestamp,
        message: message,
        type: true
    });
}

function drawLogErrorFilteredTable() {
    try {
        $(canvasDiv).empty();
        if ( $.fn.dataTable.isDataTable( '#tblMessages' ) ) {
            dataTable.destroy();
        }
        dataTable = $("#tblMessages").DataTable({
            data: receivedData,
            columns: [
                { title: "Timestamp" },
                { title: "ArtifactType" },
                { title: "ArtifactName" },
                { title: "LogLine" },
                { title: "View" }
            ],
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
        console.log(error);
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
    ArtifactType = data["ArtifactType"];
    status = data["Status"];
    fromTime = data["fromTime"];
    toTime = data["toTime"];
    iteratorCount=0;
    receivedData.length = 0;
    fetch(ArtifactType,status);
});


function onError(msg) {
    $(canvasDiv).html(gadgetUtil.getErrorText(msg));
}

