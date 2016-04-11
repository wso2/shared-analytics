var views = [{
    id: "chart-0",
    schema: [{
        "metadata": {
            "names": ["metro_area", "min_usage", "max_usag", "avg_usage"],
            "types": ["ordinal", "linear", "linear", "linear"]
        }
    }],
    chartConfig: {
        x: "metro_area",
        charts: [{ type: "bar", y: "avg_usage" }],
        padding: { "top": 20, "left": 50, "bottom": 20, "right": 80 },
        range: false,
        height: 300,
        rangeColor: COLOR_BLUE
    },
    callbacks: [{
        type: "click",
        callback: function() {
            wso2gadgets.load("chart-1");
        }
    }],
    subscriptions: [{
        topic: "range-selected",
        callback: function(topic, data, subscriberData) {
            //do some stuff
        }
    }],
    data: function() {
        var SERVER_URL = "/portal/apis/analytics";
        var TABLE_NAME = "CITY_USAGE";
        var client = new AnalyticsClient().init(null, null, SERVER_URL);
        var params = {
            tableName: TABLE_NAME,
            start: 0,
            count: 10
        };
        client.getRecordsByRange(
            params,
            function(response) {
                var results = [];
                var data = JSON.parse(response.message);
                data.forEach(function(record, i) {
                    var values = record.values;
                    var result = [values["metro_area"], values["min_usage"], values["max_usage"], values["avg_usage"]];
                    results.push(result);
                });
                //Call the framework to draw the chart with received data. Note that data should be in VizGrammar ready format
                wso2gadgets.onDataReady(results);
            },
            function(e) {
                //throw it to upper level 
                onError(e);
            }
        );
    }
}, {
    id: "chart-1",
    schema: [{
        "metadata": {
            "names": ["metro_area", "min_usage", "max_usag", "avg_usage"],
            "types": ["ordinal", "linear", "linear", "linear"]
        }
    }],
    chartConfig: {
        x: "metro_area",
        height: 300,
        charts: [{ type: "line", y: "avg_usage" }],
        padding: { "top": 20, "left": 50, "bottom": 20, "right": 80 },
        range: false,
        rangeColor: COLOR_BLUE
    },
    callbacks: [{
        type: "click",
        callback: function() {
            wso2gadgets.load("chart-0");
        }
    }],
    subscriptions: [{
        topic: "range-selected2",
        callback: function(topic, data, subscriberData) {
            //do some stuff
        }
    }],
    data: function() {
        var data = [
            ["California", 23.4, 45.6, 25.6],
            ["Texas", 12, 65, 56]
        ];
        wso2gadgets.onDataReady(data);
    }
}];

$(function() {
    try {
        wso2gadgets.init("#canvas",views);
        var view = wso2gadgets.load("chart-0");
    } catch (e) {
        console.error(e); 
    }

    $("#update").click(function() {
        var data = [
            ["Colombo", 23.4, 45.6, 25.6],
            ["Galle", 12, 65, 56]
        ];
        wso2gadgets.onDataReady(data,"append");
    });

    $("#next").click(function() {
        wso2gadgets.load("chart-1");
    });

    $("#prev").click(function() {
        wso2gadgets.load("chart-0");
    });



});
