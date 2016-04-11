var view = {
    id: "chart-0",
    schema: [{
        "metadata": {
            "names": ["timestamp", "key", "value"],
            "types": ["time", "linear", "linear"]
        }
    }],
    chartConfig: {
        x: "key",
        charts: [{ type: "bar", y: "value" }],
        padding: { "top": 20, "left": 50, "bottom": 20, "right": 80 },
        range: false,
        height: 300,
        rangeColor: COLOR_BLUE
    },
    callbacks: [{
        type: "click",
        callback: function() {
            commons.load("chart-1");
        }
    }],
    subscriptions: [{
        topic: "range-selected",
        callback: function(topic, data, subscriberData) {
            //do some stuff
        }
    }],
    data: function() {
        var stream = "sensorStream:1.0.0";
        subscribe(stream.split(":")[0], stream.split(":")[1],
            '10', "carbon.super",
            onRealTimeEventSuccessRecieval, onRealTimeEventErrorRecieval,
            "localhost",
            "9443",
            'WEBSOCKET',
            "SECURED"
        );

    }
};

$(function() {
    try {
        wso2gadgets.init("#canvas", view, "chart-0");
        // var view = wso2gadgets.load("chart-0");
    } catch (e) {
        // alert(e);
        console.error(e);
    }

    $("#next").click(function() {
        wso2gadgets.load("chart-1");
    });

    $("#prev").click(function() {
        wso2gadgets.load("chart-0");
    });

});

function onRealTimeEventSuccessRecieval(streamId,data) {
    console.log(data); 
    wso2gadgets.onDataReady(data,"append");
};

function onRealTimeEventErrorRecieval(error) {
    wso2gadgets.onError(error);
};