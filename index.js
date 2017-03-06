'use strict';

const express = require('express');
const bodyParser = require('body-parser');
var q = require('q');

const restService = express();
var request = require('request');


restService.use(bodyParser.urlencoded({
    extended: true
}));

restService.use(bodyParser.json());

function getStockDetail(stockData) {
    var defer = q.defer();
    if(!stockData.symb || !stockData.xch) defer.reject("cannot find symbol or exchange");

    // var res1 = [
    //     {
    //         // "id": "4674509",
    //         "t" : "RELIANCE"
    //         // ,"e" : "NSE"
    //         ,"l" : "1,258.60"
    //         ,"l_fix" : "1258.60"
    //         ,"l_cur" : "₹1,258.60"
    //         ,"s": "0"
    //         ,"ltt":"3:51PM GMT+5:30"
    //         ,"lt" : "Mar 3, 3:51PM GMT+5:30"
    //         ,"lt_dts" : "2017-03-03T15:51:05Z"
    //         ,"c" : "+21.85"
    //         ,"c_fix" : "21.85"
    //         ,"cp" : "1.77"
    //         ,"cp_fix" : "1.77"
    //         ,"ccol" : "chg"
    //         ,"pcls_fix" : "1236.75"
    //         ,"eo" : ""
    //         ,"delay": ""
    //         ,"op" : "1,241.55"
    //         ,"hi" : "1,287.80"
    //         ,"lo" : "1,241.55"
    //         ,"vo" : "19.27M"
    //         ,"avvo" : ""
    //         ,"hi52" : "1,287.80"
    //         ,"lo52" : "925.65"
    //         ,"mc" : "4.09T"
    //         ,"pe" : "12.93"
    //         ,"fwpe" : ""
    //         ,"beta" : ""
    //         ,"eps" : "97.37"
    //         ,"shares" : "3.24B"
    //         ,"inst_own" : ""
    //         ,"name" : "Reliance Industries Limited"
    //         ,"type" : "Company"
    //     }
    // ];

    request("https://www.google.com/finance/info?infotype=infoquoteall&q=" + stockData.xch + ":" + stockData.symb, function (error, response, body) {
        try {
            if (!error && response.statusCode == 200) {
                var jsonText = body.substr(3);
                jsonText = JSON.parse(jsonText)[0];
                defer.resolve(jsonText);
            } else {
                defer.reject(error);
            }
        } catch (err) {
            defer.reject(err);
        }
    });

    return defer.promise;
}
function getStockDetailMessage(stockDetail) {
    var change= stockDetail["c"].indexOf("+") > -1 ? "↑ " + stockDetail["c"] : "↓ " + stockDetail["c"];

    var message = "Detail of " + stockDetail["name"] + ": "
        + "\n₹"+ stockDetail["l_cur"].replace("₹", "") + change + "(" + stockDetail["cp"] + "%)"
        + "\nOpen: "+stockDetail["op"]
        + "\nHigh: " + stockDetail["hi"]
        + "\nLow: "+ stockDetail["lo"]
        + "\nClose: "+ stockDetail["l_cur"].replace("₹", "")
        + "\nVolume: "+ (stockDetail["vo"] || stockDetail["avvo"])
        + "\n52week High: "+ stockDetail["hi52"]
        + "\n52week Low: "+ stockDetail["lo52"];

    // console.log(JSON.stringify(message));
    return message;
}
function getStockName(reqStockName) {
            var defer = q.defer();
            var xch = "NSE";
            request('https://www.google.com/finance/match?matchtype=matchall&q=' + reqStockName , function(error, response, body) {
                if (!error && response.statusCode == 200) {

                    var matches = JSON.parse(body).matches;
                    if(matches.length) {
                        // console.log("EOM.");
                        reqStockName = matches[0]["t"];
                        xch = matches[0]["e"];
                    }
                }
                defer.resolve({symb: reqStockName, xch: xch});
            });
            return defer.promise;
}

function getStockChartURL(stockName, interval, period) {
    interval = "&i=" + (interval || "60");
    period = "&p=" + (period || "1d");

    return  "https://www.google.com/finance/getchart?q=" + stockName + interval + period;
}

function processPriceRequest(reqParams) {

}


restService.post('/webhook', function (req, res) {
    // console.log(JSON.stringify(req.body));
    // res.send("hello");
    //
    // req.body = {
    //     "id": "80bc8c45-f0dc-494c-82b7-7f062a3d5314",
    //     "timestamp": "2017-03-03T14:23:57.452Z",
    //     "lang": "en",
    //     "result": {
    //         "source": "agent",
    //         "resolvedQuery": "what is price of reliance?",
    //         "action": "getStockPrice",
    //         "actionIncomplete": false,
    //         "parameters": {
    //             "stock": "suryaprakash"
    //         },
    //         "contexts": [],
    //         "metadata": {
    //             "intentId": "a403c854-35a7-481e-a848-1658389282c7",
    //             "webhookUsed": "false",
    //             "webhookForSlotFillingUsed": "false",
    //             "intentName": "Action: Get Stock price"
    //         },
    //         "fulfillment": {
    //             "speech": "Getting price of reliance...",
    //             "messages": [
    //                 {
    //                     "type": 0,
    //                     "speech": "Getting price of reliance..."
    //                 }
    //             ]
    //         },
    //         "score": 1
    //     },
    //     "status": {
    //         "code": 200,
    //         "errorType": "success"
    //     },
    //     "sessionId": "6e9a7a1a-09f1-4214-a561-3b4cbb9a13dd"
    // };

    console.log("Start.");
    var speech = "Cannot process without stock symbol.";

    if(req.body && req.body.result && req.body.result.parameters && req.body.result.parameters.stock) {

        var reqStockName = req.body.result.parameters.stock;

            console.log(1);
            // Get stock details
            speech = "Cannot get details of "+ reqStockName +".";

            getStockName(reqStockName).then(function (data) {

                speech = "Cannot get details of "+ data.symb +".";

                if(req.body.result.action === "getStockPrice") {
                    getStockDetail(data).then(function (stockDetail) {
                        speech = getStockDetailMessage(stockDetail);
                        console.log("1.1.1");

                        return res.send({
                            speech: speech,
                            displayText: speech,
                            source: 'besloi-speak'
                        });
                    }, function (err) {
                        // console.log("Error in getting details");
                        console.log("1.1.2");
                        return res.send({
                            speech: speech,
                            displayText: speech,
                            source: 'besloi-speak'
                        });
                    });
                } else if(req.body.result.action === "getStockChart") {
                    console.log(2);
                    var chartURL = getStockChartURL(data.symb);
                    speech = "Chart: " + chartURL;
                    return res.send({
                        speech: speech,
                        displayText: speech,
                        source: 'besloi-speak',
                        data: {
                            "facebook": {
                                "attachment": {
                                    "type": "image",
                                    "payload": {
                                        "url": chartURL
                                    }
                                }
                            }
                        }
                    });
                } else {
                    return res.send({
                        speech: speech,
                        displayText: speech,
                        source: 'besloi-speak'
                    });
                }
            }, function (err) {
                console.log(1.2);
                return res.send({
                    speech: speech,
                    displayText: speech,
                    source: 'besloi-speak'
                });
            });


    } else {
        console.log(4);
        return res.send({
            speech: speech + "..!",
            displayText: speech + "..!",
            source: 'besloi-speak'
        });
    }

    console.log(5);


    // console.log(reqStockName);
    //
    // if(req.body) {
    //
    //     if(req.body.result.action === "getStockChart") {
    //         speech = "Cannot get chart of stock.";
    //     } else {
    //         speech = "Cannot get price of stock.";
    //     }
    //
    //     if(req.body.result.parameters && req.body.result.parameters.stock) {
    //
    //         if(req.body.result.action === "getStockChart") {
    //             speech = "Cannot get chart of " + req.body.result.parameters.stock + ".";
    //         } else {
    //             speech = "Cannot get price of " +  req.body.result.parameters.stock + ".";
    //         }
    //
    //         var stockQuery = "NSE:" + req.body.result.parameters.stock;
    //
    //         request('https://www.google.com/finance/info?q=' + stockQuery, function (error, response, body) {
    //             if (!error && response.statusCode == 200) {
    //
    //                 try {
    //
    //                     // Replace body
    //
    //                     var jsonText = body.substr(3);
    //                     jsonText = JSON.parse(jsonText)[0];
    //
    //                     var stockName = jsonText["t"];
    //
    //
    //                     speech = "Price of " + stockName + " is ₹ " + jsonText["l_cur"].replace("&#8377;", "") + ". ";
    //
    //                     if(req.body.result.action === "getStockPrice") {
    //                         return res.send({
    //                             speech: speech,
    //                             displayText: speech,
    //                             source: 'besloi-speak'
    //                         });
    //                     } else if(req.body.result.action === "getStockChart") {
    //                         return res.send({
    //                             speech: speech,
    //                             displayText: speech,
    //                             source: 'besloi-speak',
    //                             data: {
    //                                 "facebook": {
    //                                     "attachment": {
    //                                         "type": "image",
    //                                         "payload": {
    //                                             "url": "https://www.google.com/finance/getchart?q=" + stockName
    //                                         }
    //                                     }
    //                                 }
    //                             }
    //                         });
    //                     }
    //
    //                 } catch (err) {
    //
    //                     return res.send({
    //                         speech: speech,
    //                         displayText: speech,
    //                         source: 'besloi-speak'
    //                     });
    //                 }
    //
    //             }else{
    //                 return res.send({
    //                     speech: speech,
    //                     displayText: speech,
    //                     source: 'besloi-speak'
    //                 });
    //             }
    //         }); // End of require
    //
    //     }
    //
    //     // return res.send({
    //     //     speech: speech,
    //     //     displayText: speech,
    //     //     source: 'besloi-speak'
    //     // });
    //
    // }else{
    //     return res.send({
    //         speech: speech + "..!",
    //         displayText: speech + "..!",
    //         source: 'besloi-speak'
    //     });
    //
    // }
});

restService.listen((process.env.PORT || 8000), function () {
    console.log("Server up and listening");
});
