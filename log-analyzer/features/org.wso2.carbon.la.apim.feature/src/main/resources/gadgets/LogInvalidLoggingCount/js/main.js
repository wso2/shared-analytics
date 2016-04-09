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
var client = new AnalyticsClient().init();
var div = "#chartInvalidLoginAttempts";
var from = new Date(moment().subtract(1, 'year')).getTime();
var to = new Date(moment()).getTime();
var fromTime;
var toTime;
var dataM = [];
var mockData = [];
var newDataM =[];
var newDataOtherM=[];
var chartData = [];
var names = ["day", "count", "message"];
var types = ["ordinal", "linear", "linear"];
var mS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
var msgMap = new Map();
var msgCount=0;
var receivedData;

function initialize() {
    fetch();
    //$("#chartErrorMessage").html(getDefaultText());
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
    msgMap.length = 0;
    msgCount = 0;
    dataM.length = 0;
    mockData.length = 0;
    newDataM.length = 0;
    newDataOtherM.length = 0;
    chartData.length = 0;
    var queryInfo;
    var timeFrame;
    var newFrom;
    var newTo;
    var tomorrow;
    console.log("logErrorMessage");
    var diffDays = daysBetween(new Date(from), new Date(to));
    if(diffDays>90){
        timeFrame = "monthly";
        queryInfo = {
            tableName: "LOGANALYZER_INVALID_LOGIN_ATTEMPT_MONTHLY",
            searchParams: {
                query: "_timestamp: [" + from + " TO " + to + "]",
                start : 0, //starting index of the matching record set
                count : 100, //page size for pagination
                sortBy : [
                    {
                        field : "agentCount",
                        sortType : "DESC", // This can be ASC, DESC
                        reversed : "false" //optional
                    }
                ]
            }
        };
    }else if (diffDays>30){
        timeFrame = "weekly";
        queryInfo = {
            tableName: "LOGANALYZER_INVALID_LOGIN_ATTEMPT_WEEKLY",
            searchParams: {
                query: "_timestamp: [" + from + " TO " + to + "]",
                start : 0, //starting index of the matching record set
                count : 100, //page size for pagination
                sortBy : [
                    {
                        field : "agentCount",
                        sortType : "DESC", // This can be ASC, DESC
                        reversed : "false" //optional
                    }
                ]
            }
        };
    }else{
        timeFrame = "daily";
        queryInfo = {
            tableName: "LOGANALYZER_INVALID_LOGIN_ATTEMPT_DAILY",
            searchParams: {
                query: "_timestamp: [" + from + " TO " + to + "]",
                start : 0, //starting index of the matching record set
                count : 100, //page size for pagination
                sortBy : [
                    {
                        field : "agentCount",
                        sortType : "DESC", // This can be ASC, DESC
                        reversed : "false" //optional
                    }
                ]
            }
        };
    }

    console.log(queryInfo);
    client.search(queryInfo, function (d) {
        newFrom = new Date(from);
        newTo = new Date(to);
        var msgHash;
        receivedData = JSON.parse(d["message"]);
        if (d["status"] === "success") {
            tomorrow = new Date(from);
            if(timeFrame==="daily"){
                newFrom.setHours(0);
                newFrom.setMinutes(0);
                newFrom.setSeconds(0);
                newTo.setHours(0);
                newTo.setMinutes(0);
                newTo.setSeconds(0);
                while(!(newFrom.getTime() >= newTo.getTime())){
                    mockData.push([newFrom.toDateString(),0,"No Entry","No Entry",0]);
                    newFrom.setHours(newFrom.getHours()+24);
                }
                for (var i =0; i < receivedData.length ;i++){
                    var tempDay = new Date(receivedData[i].timestamp);
                    dataM.push([tempDay.toDateString(),receivedData[i].values.agentCount,receivedData[i].values.agent]);
                }
            }else if(timeFrame === "monthly"){
                newFrom.setDate(1);
                newTo.setDate(1);
                while(!(newFrom.getTime() >= newTo.getTime())){
                    mockData.push([mS[newFrom.getMonth()]+" - "+newFrom.getFullYear(),0,"No Entry","No Entry",0]);
                    newFrom.setMonth(newFrom.getMonth()+1);
                }
                for (var i =0; i < receivedData.length ;i++){
                    msgHash  =hashCode(receivedData[i].values.message);
                    if(!msgMap.hasOwnProperty(msgHash)){
                        msgCount++;
                        msgMap.set(msgHash,msgCount);
                    }
                    var tempDay = new Date(receivedData[i].timestamp);
                    dataM.push([mS[tempDay.getMonth()]+" - "+tempDay.getFullYear(),receivedData[i].values.classCount,receivedData[i].values.message,"ID :"+msgMap.get(msgHash)+"  - "+receivedData[i].values.message.substring(1,60)+"...",msgMap.get(msgHash)]);
                }
            }else if(timeFrame === "weekly"){
                var weekNo =0;
                while(!(newFrom.getTime() > newTo.getTime())){
                    mockData.push(["W"+(++weekNo)+" "+mS[newFrom.getMonth()]+" - "+newFrom.getFullYear(),0,"No Entry","No Entry",0]);
                    newFrom.setHours(newFrom.getHours()+(24*7));
                }
                for (var i =0; i < receivedData.length ;i++){
                    msgHash  =hashCode(receivedData[i].values.message);
                    if(!msgMap.hasOwnProperty(msgHash)){
                        msgCount++;
                        msgMap.set(msgHash,msgCount);
                    }
                    var tempDay = new Date(receivedData[i].timestamp);
                    dataM.push(["W"+receivedData[i].values.week+" "+mS[tempDay.getMonth()]+" - "+tempDay.getFullYear(),receivedData[i].values.classCount,receivedData[i].values.message,"ID :"+msgMap.get(msgHash)+"  - "+receivedData[i].values.message.substring(1,60)+"...",msgMap.get(msgHash)]);
                }
            }
            drawChartByClass();
        }
    }, function (error) {
        console.log("error occured: " + error);
    });
}

function drawChartByClass() {
    $("#chartInvalidLoginAttempts").empty();
    $("#tableErrorMessage").empty();
    var configChart = {
        type: "bar",
        x : "day",
        colorScale:["#ecf0f1","#1abc9c", "#3498db", "#9b59b6", "#f1c40f","#e67e22","#e74c3c","#95a5a6","#2c3e50","#2ecc71","#F16272"],
        xAxisAngle: "true",
        color:"message",
        charts : [{type: "bar",  y : "count", mode:"stack"}],
        width: $('body').width()+100,
        height: $('body').height(),
        padding: { "top": 10, "left": 80, "bottom": 70, "right": 500 },
        tooltip: {"enabled":true, "color":"#e5f2ff", "type":"symbol", "content":["message","count","ID"], "label":true}
    };

    var configTable = {
        key: "ID",
        title:"LogErrorMessage",
        charts: [{
            type: "table",
            columns: ["ID", "message","shortMessage","count","day" ],
            columnTitles: ["Message ID", "Long Message", "Shorted Message", "Count", "Day"]
        }
        ],
        width: $(window).width()* 0.95,
        height: $(window).width() * 0.65 > $(window).height() ? $(window).height() : $(window).width() * 0.65,
        padding: { "top": 100, "left": 30, "bottom": 22, "right": 70 }
    };

    var meta = {
        "names": names,
        "types": types
    };
    if(dataM.length > 9){
        var duplicate = false;
        console.log(dataM.length);
        var mapOther = [];
        newDataM = dataM.slice(0,9);
       // newDataOtherM = dataM.slice(9,dataM.length);
        for (var i=9;i<dataM.length;i++){
            for(var k = 0; k < 10; k++){
            if(dataM[i][2] === dataM[k][2] ){
            duplicate = true;
            }
            }

        if(!duplicate){
        newDataOtherM.push([dataM[i],i]);
         if(isNaN(mapOther[dataM[i][0]])){
                        mapOther[dataM[i][0]] = dataM[i][1];
                    }else{
                        mapOther[dataM[i][0]] = mapOther[dataM[i][0]] + dataM[i][1];
                    }
        }else{
        newDataM.push(dataM[i]);
        }
        duplicate = false;
        }
        for (var key in mapOther) {
            var value = mapOther[key];
            newDataM.push([key,value,"Other","Other",key]);
        }
    }else{
        for(var i=0; i<dataM.length;i++){
            newDataM.push(dataM[i]);
        }
    }

    for(var i=0; i<mockData.length;i++){
        chartData.push(mockData[i]);
    }

    for(var i=0; i<newDataM.length;i++){
        chartData.push(newDataM[i]);
    }

    var chart = new vizg(
        [
            {
                "metadata": meta,
                "data": chartData
            }
        ],
        configChart
    );

    chart.draw(div,[
        {
            type: "click",
            callback: onclick
        }
    ]);
}



function publish (data) {
    gadgets.Hub.publish("publisher", data);
};

function publish2 (data) {
    gadgets.Hub.publish("publisher2", data);
};

 var onclick = function(event, item) {
    if (item != null) {
        fromTime = new Date(item.datum.day);

        getFromToTime(fromTime,"daily");
        if(item.datum.message === "Other"){
            for (var i =0; i< newDataOtherM.length;i++){

                if(newDataOtherM[i][0][0] === item.datum.day){

                    publish(
                        {
                            "selected":receivedData[newDataOtherM[i][1]].values.agent,
                            "fromTime": fromTime.getTime(),
                            "toTime": toTime.getTime()
                        }
                    );
                }
            }
        }else{
            publish(
                {
                    "filter": gadgetConfig.id,
                    "selected": item.datum.message,
                     "fromTime": fromTime.getTime(),
                     "toTime": toTime.getTime()
                }
            );
        }
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

 function getMonday(d) {
   d = new Date(d);
   var day = d.getDay(),
       diff = d.getDate() - day + (day == 0 ? -6:1); // adjust when day is sunday
   return new Date(d.setDate(diff));
 }



function getFromToTime(time, period){
toTime = new Date();

if(period === "daily"){
    toTime.setDate(fromTime.getDate() + 1);
    console.log(fromTime);
        console.log(toTime);
}else if(period === "weekly"){
    fromTime = getMonday(fromTime);
    toTime.setDate(fromTime.getDate() + 6);
    console.log(fromTime);
    console.log(toTime);

}else{
    fromTime = new Date(fromTime.getFullYear(), fromTime.getMonth(), 1);
    toTime = new Date(fromTime.getFullYear(), fromTime.getMonth() + 1, 0);
}

}

function zeroPad(num, places) {
    var zero = places - num.toString().length + 1;
    return Array(+(zero > 0 && zero)).join("0") + num;
}
