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
var from = new Date(moment().subtract(1, 'year')).getTime();
var to = new Date(moment()).getTime();
var dataM = [];
var filterdMessage;
var template1 = "<ul class='template1'>{{#arr}}<li class='data'>{{date}}</li><li class='level'>{{level}}</li><li class='class'>{{class}}</li><li class='content'>{{content}}</li><li class='trace'>{{trace}}</li>{{/arr}}</ul>";
var template2 = "<ul class='template2'>{{#arr}}<li class='data'>{{date}}</li><li class='level'>{{level}}</li><li class='class'>{{class}}</li><li class='content'>{{content}}</li><li class='trace'>{{trace}}</li>{{/arr}}</ul>";
var template3 = "<ul class='template3'>{{#arr}}<li class='data'>{{date}}</li><li class='level'>{{level}}</li><li class='class'>{{class}}</li><li class='content'>{{content}}</li><li class='trace'>{{trace}}</li>{{/arr}}</ul>";
var template4 = "<ul class='template4'>{{#arr}}<li class='data'>{{date}}</li><li class='level'>{{level}}</li><li class='class'>{{class}}</li><li class='content'>{{content}}</li><li class='trace'>{{trace}}</li>{{/arr}}</ul>";

function initialize() {
    //fetch();
    //$("#tblArtifactDeleted").html(getDefaultText());
}

function getDefaultText() {
    return '<div class="status-message">' +
        '<div class="message message-info">' +
        '<h4><i class="icon fw fw-info"></i>No content to display</h4>' +
        '<p>Please select a date range to view stats.</p>' +
        '</div>' +
        '</div>';
};

function getEmptyRecordsText() {
    return '<div class="status-message">' +
        '<div class="message message-info">' +
        '<h4><i class="icon fw fw-info"></i>No records found</h4>' +
        '<p>Please select a date range to view stats.</p>' +
        '</div>' +
        '</div>';
}

$(document).ready(function () {
    initialize();
});

function fetch() {
    dataM.length = 0;
    var queryInfo;
    console.log("sajith12345");
    queryInfo = {
        tableName: "LOGANALYZER_NON_DUPLICATION",
        searchParams: {
            query: "_eventTimeStamp: [" + from + " TO " + to + "]",
            start: 0, //starting index of the matching record set
            count: 100 //page size for pagination
        }
    };
    console.log(queryInfo);
    client.search(queryInfo, function (d) {
        var obj = JSON.parse(d["message"]);

        if (d["status"] === "success") {
            for (var i = 0; i < obj.length; i++) {
                dataM.push([{
                    date: new Date(parseInt(obj[i].values._eventTimeStamp)).toUTCString(),
                    level: obj[i].values._level,
                    class: obj[i].values._class,
                    content: obj[i].values._content,
                    trace: (obj[i].values._trace ? obj[i].values._trace:"")
                }]);
            }
            writeToLogViewer();
        }
    }, function (error) {
        console.log("error occured: " + error);
    });
}

function writeToLogViewer() {
    $("#logViewer").empty();
    for (var i=0;i<dataM.length;i++)
    {
        if(dataM[i][0].level==="ERROR"){
            $('#logViewer').append(Mustache.to_html(template1, {arr:dataM[i]}));
        }else if(dataM[i][0].level==="WARN"){
            $('#logViewer').append(Mustache.to_html(template2, {arr:dataM[i]}));
        }else if(dataM[i][0].level==="DEBUG"){
            $('#logViewer').append(Mustache.to_html(template3, {arr:dataM[i]}));
        }else {
        $('#logViewer').append(Mustache.to_html(template4, {arr:dataM[i]}));
    }
    }
}

function subscribe(callback) {
    gadgets.HubSettings.onConnect = function () {
        gadgets.Hub.subscribe("subscriber3", function (topic, data, subscriber) {
            callback(topic, data, subscriber)
        });
    };
}

subscribe(function (topic, data, subscriber) {
    console.log("Date :" + data["timestamp"]);
    filterdMessage = parseInt(data["timestamp"]);
    var fromDate = filterdMessage - (1000 * 60 * 60 * 10);
    var toDate = filterdMessage + (1000 * 60 * 60 * 10);
    from = fromDate;
    to = toDate;
    fetch();
});