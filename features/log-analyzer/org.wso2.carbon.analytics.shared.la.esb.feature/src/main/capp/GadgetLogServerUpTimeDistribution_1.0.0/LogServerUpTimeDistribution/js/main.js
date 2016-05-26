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

var client = new AnalyticsClient().init(null,null,"/portal/apis/analytics");
var div = "#tblServerUpTimeDistribution";
var table;
var from = new Date(moment().subtract(29, 'days')).getTime();
var to = new Date(moment()).getTime();
var dataM = [];
var initState = true;
var timeFrame = "seconds";

var meta = {
    "names": ["tenantId", "ServerUpTime"],
    "types": ["ordinal", "linear"]
};

var configTable = {
    key: "tenantId",
    title:"LogServerUpTime",
    charts: [{
        type: "table",
        y: "ServerUpTime",
        columns: ["tenantId", "ServerUpTime"],
        columnTitles: ["Tenant ID", "Average server up time (" + timeFrame + ")"]
    }
    ],
    width: $('body').width(),
    height: $('body').height(),
    padding: { "top": 40, "left": 80, "bottom": 70, "right": 100 }
};


function initialize() {
    fetch();
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
    console.log("ArtifactDeletedFetching");
    queryInfo = {
        tableName: "LOGANALYZER_SERVER_UP_TIME_DISTRIBUTION",
        searchParams: {
            query: "*:*",
            start : 0, //starting index of the matching record set
            count : 100, //page size for pagination
             sortBy : [
                       {
                          field : "AverageServerUpTime",
                          sortType : "DESC", // This can be ASC, DESC
                          reversed : "false" //optional
                       }
                      ]
        }
    };
    console.log(queryInfo);
    client.search(queryInfo, function (d) {
        var obj = JSON.parse(d["message"]);

        if (d["status"] === "success") {

            for (var i =0; i < obj.length ;i++){
                if(i===0){
                    var max =  obj[0].values.AverageServerUpTime/1000;
                }
                if (max < 3600){
                    dataM.push([obj[i].values.AgentId,obj[i].values.AverageServerUpTime/1000]);
                    timeFrame = "seconds";
                }else if(max < 86400){
                    dataM.push([obj[i].values.AgentId,obj[i].values.AverageServerUpTime/60000]);
                    timeFrame = "hours";
                }else{
                    dataM.push([obj[i].values.AgentId,obj[i].values.AverageServerUpTime/86400000]);
                    timeFrame = "days";
                }
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

Array.max = function( array ){
    return Math.max.apply( Math, array );
};

function drawLogAPIMArtifactTableChart() {
    $("#tblServerUpTimeDistribution").empty();
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
    //$("#LogLevel").DataTable();

    var table2 = $('#LogServerUpTime').DataTable();
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