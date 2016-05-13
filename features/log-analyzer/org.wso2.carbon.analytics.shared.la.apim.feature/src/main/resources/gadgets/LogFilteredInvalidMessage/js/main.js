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
var div = "#tblFilteredMessages2";
var from = new Date(moment().subtract(29, 'days')).getTime();
var to = new Date(moment()).getTime();
var dataM = [];
var initState = true;
var filterdMessage;
var time;
var fromTime = new Date();
var toTime = new Date();
var ID = 0;

var meta = {
    "names": ["message", "class", "timestamp", "trace", "ID"],
    "types": ["ordinal", "ordinal", "ordinal", "ordinal", "linear"]
};

var configTable = {
    key: "ID",
    title:"FilteredMessages",
    charts: [{
        type: "table",
        columns: ["message", "class", "timestamp", "trace", "ID"],
        columnTitles: ["ERROR Message", "Class", "Event Time Stamp", "Error Trace", "ID"]
    }
    ],
    width: $(window).width()* 0.95,
    height: $(window).width() * 0.65 > $(window).height() ? $(window).height() : $(window).width() * 0.65,
    padding: { "top": 100, "left": 30, "bottom": 22, "right": 70 }
};


function initialize() {
    //fetch();
    //$("#tblArtifactDeleted").html(getDefaultText());
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




function fetch() {
    dataM.length = 0;
    var queryInfo;
    queryInfo = {
        tableName: "LOGANALYZER",
        searchParams: {
            query: "logstream: \"" +filterdMessage+"\" AND _content:\"login attempt\" AND _eventTimeStamp:[" +fromTime+ " TO " + toTime + "]",
            start : 0, //starting index of the matching record set
            count : 100 //page size for pagination
        }
    };
    console.log(queryInfo);
    client.search(queryInfo, function (d) {
        var obj = JSON.parse(d["message"]);
        console.log(obj);
        var hash;
        if (d["status"] === "success") {
            for (var i =0; i < obj.length ;i++){
                hash  =hashCode(d["message"] + "  " +obj[i].values._eventTimeStamp );
                dataM.push([obj[i].values._content,obj[i].values._class,obj[i].values._eventTimeStamp,obj[i].values.logstream, ID++]);
            }
            drawLogAPIMArtifactTableChart();

        }
    }, function (error) {
        console.log("error occured: " + error);
    });
}

function drawLogAPIMArtifactTableChart() {
    $("#tblFilteredMessages").empty();
    var table = new vizg(
        [
            {
                "metadata": this.meta,
                "data": dataM
            }
        ],
        configTable
    );
    table.draw(div);
    var table2 = $('#FilteredMessages').DataTable();
    //$('#body').css( 'display', 'block' );
    //table2.columns.adjust().draw();
    $("#tableChart-FilteredMessages > tr").on( "click", function( event ) {
        //alert(this.getElementsByClassName("timestamp")[0].textContent);
        publish({timestamp : this.getElementsByClassName("timestamp")[0].textContent});
    });
}

function publish (data) {
    gadgets.Hub.publish("publisher2", data);
};

function subscribe(callback) {
    gadgets.HubSettings.onConnect = function () {
        gadgets.Hub.subscribe("subscriber2", function (topic, data, subscriber) {
            callback(topic, data, subscriber)
        });
    };
    console.log("APIM subscribed");
}

subscribe(function (topic, data, subscriber) {
    console.log("Received Data :"+data["selected"]);
    filterdMessage = data["selected"];
    fromTime = data["fromTime"];
    toTime =  data["toTime"];
    fetch();
});

function hashCode(str){
    var hash = 0;
    if (str.length == 0) return hash;
    for (i = 0; i < str.length; i++) {
        char = str.charCodeAt(i);
        hash = ((hash<<5)-hash)+char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return zeroPad(Math.abs(hash),13);
}

function zeroPad(num, places) {
    var zero = places - num.toString().length + 1;
    return Array(+(zero > 0 && zero)).join("0") + num;
}
