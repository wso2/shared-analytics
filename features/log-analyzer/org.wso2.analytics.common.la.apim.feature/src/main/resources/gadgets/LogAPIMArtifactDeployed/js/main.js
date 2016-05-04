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
var div = "#tblArtifactDeployed";
var table;
var from = new Date(moment().subtract(29, 'days')).getTime();
var to = new Date(moment()).getTime();
var dataM = [];
var initState = true;

var meta = {
    "names": ["apiArtifact", "Frequency"],
    "types": ["ordinal", "linear"]
};

var configTable = {
    key: "apiArtifact",
    title:"ArtifactDeployed",
    charts: [{
        type: "table",
        y: "Frequency",
        columns: ["apiArtifact", "Frequency"],
        columnTitles: ["APIM Artifact", "Frequency"]
    }
    ],
    width: $('body').width(),
    height: $('body').height(),
    padding: { "top": 40, "left": 80, "bottom": 70, "right": 100 }
};


function initialize() {
    fetch();
    //$("#tblLogAPIMArtifact").html(getDefaultText());
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
    console.log("ArtifactDeployedFetching");
    queryInfo = {
        tableName: "LOGANALYZER_APIM_ARTIFACT_DEPLOYED_DAILY",
        searchParams: {
            query: "_timestamp: [" + from + " TO " + to + "]",
            start : 0, //starting index of the matching record set
            count : 100 //page size for pagination
        }
    };
    console.log(queryInfo);
    client.search(queryInfo, function (d) {
        var obj = JSON.parse(d["message"]);
        if (d["status"] === "success") {
            for (var i =0; i < obj.length ;i++){
                dataM.push([obj[i].values.artifact,obj[i].values.artifactCount]);
            }
            if(!initState){
                redrawLogAPIMArtifactTableChart();
            }else{
                drawLogAPIMArtifactTableChart();
                initState =false;
            }
        }
    }, function (error) {
        console.log("error occured: " + error);
    });
}

function drawLogAPIMArtifactTableChart() {
    $(div).empty();
    table = new vizg(
        [
            {
                "metadata": this.meta,
                "data": dataM
            }
        ],
        configTable
    );
    table.draw(div);
    var table2 = $('#ArtifactDeployed').DataTable();
    $('#body').css( 'display', 'block' );
    table2.columns.adjust().draw();
}

function redrawLogAPIMArtifactTableChart(){
    for(var i in dataM){
        table.insert([dataM[i]]);
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
    console.log("From Time : "+parseInt(data["timeFrom"]));
    console.log("To Time : "+parseInt(data["timeTo"]));
    from = parseInt(data["timeFrom"]);
    to = parseInt(data["timeTo"]);
    fetch();
});