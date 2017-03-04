'use strict';

const express = require('express');
const bodyParser = require('body-parser');

const restService = express();
var request = require('request');


restService.use(bodyParser.urlencoded({
    extended: true
}));

restService.use(bodyParser.json());

restService.post('/webhook', function (req, res) {
    // console.log(JSON.stringify(req.body));
    // res.send("hello");

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
    //             "stock": "reliance"
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


    var speech = "Cannot get price of stock.";


    if(req.body) {

        if(req.body.result.action === "getStockChart") {
            speech = "Cannot get chart of stock.";
        } else {
            speech = "Cannot get price of stock.";
        }

        if(req.body.result.parameters && req.body.result.parameters.stock) {

            if(req.body.result.action === "getStockChart") {
                speech = "Cannot get chart of " + req.body.result.parameters.stock + ".";
            } else {
                speech = "Cannot get price of " +  req.body.result.parameters.stock + ".";
            }

            var stockQuery = "NSE:" + req.body.result.parameters.stock;

            request('https://www.google.com/finance/info?q=' + stockQuery, function (error, response, body) {
                if (!error && response.statusCode == 200) {

                    try {

                        // Replace body

                        var jsonText = body.substr(3);
                        jsonText = JSON.parse(jsonText)[0];

                        var stockName = jsonText["t"];


                        speech = "Price of " + stockName + " is ₹ " + jsonText["l_cur"].replace("&#8377;", "") + ". ";

                        if(req.body.result.action === "getStockPrice") {
                            return res.send({
                                speech: speech,
                                displayText: speech,
                                source: 'besloi-speak'
                            });
                        } else if(req.body.result.action === "getStockChart") {
                            return res.send({
                                speech: speech,
                                displayText: speech,
                                source: 'besloi-speak',
                                data: {
                                    "facebook": {
                                        "attachment": {
                                            "type": "image",
                                            "payload": {
                                                "url": "https://www.google.com/finance/getchart?q=" + stockName
                                            }
                                        }
                                    }
                                }
                            });
                        }

                    } catch (err) {

                        return res.send({
                            speech: speech,
                            displayText: speech,
                            source: 'besloi-speak'
                        });
                    }

                }else{
                    return res.send({
                        speech: speech,
                        displayText: speech,
                        source: 'besloi-speak'
                    });
                }
            }); // End of require

        }

        // return res.send({
        //     speech: speech,
        //     displayText: speech,
        //     source: 'besloi-speak'
        // });

    }else{
        return res.send({
            speech: speech + "..!",
            displayText: speech + "..!",
            source: 'besloi-speak'
        });

    }
});

restService.listen((process.env.PORT || 8000), function () {
    console.log("Server up and listening");
});
