var nforce = require('nforce');
var AWS = require('aws-sdk');

// All the authenication is part of the configuration for a Connected App in Salesforce
var org = nforce.createConnection({ 
    clientId: process.env.SFDC_CLIENT_ID,
    clientSecret: process.env.SFDC_CLIENT_SECRET, 
    redirectUri: 'http://localhost:3000/oauth/_callback',
    mode: 'single'
});

var REPLAY_ID = -1;  // -1 (only recent); -2 (all last 72h); or all since a specific Id (i.e. 2051)

exports.handler = function(event, context, callback) {
    // authenticate via oauth process to SFDC
    org.authenticate({ username: process.env.SFDC_USERNAME, password: process.env.SFDC_PASSWORD }, function(err, oauth) {
        if(err) return console.log("Error authenticating to Salesforce, " + err);
        
        const client = org.createStreamClient();
        const sub = client.subscribe({topic: process.env.SFDC_TOPIC, isEvent:true, replayId: REPLAY_ID });
        console.log('connecting to topic: ' + process.env.SFDC_TOPIC);

        client.on('connect', function () {
            console.log('streaming client transport: up');
        });
        
        client.on('disconnect', function (data) {
            console.log('streaming disconnect: ' + data.reason);
            console.log('disconnect data', data);
        });
        
        sub.on('error', function (error) {
            console.log('error pf: ' + error);
            sub.cancel();
            client.disconnect();
        });
        
        // When data is received, this is executed; forward payload as SNS Message
        sub.on('data', function (data) {
            console.log("New SFDC event on topic " + process.env.SFDC_TOPIC + " detected\nEvent:" + JSON.stringify(data.payload));
            //var recordId = data.payload.Record_Id__c;
            var params = {
                Message: JSON.stringify(data.payload),
                TopicArn: process.env.AWS_TOPIC_ARN
            };
            
            // Create promise and SNS service object
            var publishTextPromise = new AWS.SNS({ apiVersion: '2010-03-31' }).publish(params).promise();
            
            // Handle promise's fulfilled/rejected states 
            publishTextPromise.then(
                function(data) {
                    console.log('SNS event published to ' + params.TopicArn + ' with Id ' + data.MessageId);
                }).catch(function(err) {
                    console.error(err, err.stack);
                });
        }); // end data event
    }); //end of org auth
};