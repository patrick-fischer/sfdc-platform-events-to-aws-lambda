var nforce = require('nforce');
var AWS = require('aws-sdk');

// All the authenication is part of the configuration for a Connected App in Salesforce
var org = nforce.createConnection({ 
    clientId: process.env.SFDC_CLIENT_ID,
    clientSecret: process.env.SFDC_CLIENT_SECRET, 
    redirectUri: 'http://localhost:3000/oauth/_callback',
    mode: 'single'
});

exports.handler = function(event, context, callback) {
    var payload = JSON.parse(event.Records[0].Sns.Message);
    var comprehend = new AWS.Comprehend();

    // authenticate via oauth process to SFDC
    org.authenticate({ username: process.env.SFDC_USERNAME, password: process.env.SFDC_PASSWORD }, function(err, oauth) {
        if(err) return console.log("Error authenticating to Salesforce, " + err);

        // AWS Comprehend - Detect Dominant Language
        var dominantLangParams = {
          Text: payload.Message__c
        };
        var dominantLangPromise = comprehend.detectDominantLanguage(dominantLangParams).promise();
        dominantLangPromise.then(function(language) {
            var languageCode = language.Languages[0].LanguageCode;

            // AWS Comprehend - Detect Entities
            var detectEntitiesParams = {
                LanguageCode: languageCode,
                Text: payload.Message__c
            };
            var detectEntitiesPromise = comprehend.detectEntities(detectEntitiesParams).promise();
            
            // AWS Comprehend - Detect Sentiment
            var detectSentimentPromise = comprehend.detectSentiment(detectEntitiesParams).promise();
                        
            Promise.all([detectEntitiesPromise, detectSentimentPromise]).then(function(data) {

                // Salesforce - Update Lead 
                var lead = nforce.createSObject('Lead');
                lead.set('Id', payload.Record_Id__c);
                lead.set('Language__c', language.Languages[0].LanguageCode);
                lead.set('Language_Accuracy__c', language.Languages[0].Score * 100);
                lead.set('Response__c', JSON.stringify(language));
                lead.set('Sentiment__c', data[1].Sentiment);
                org.update({ sobject: lead, oauth: oauth }, function(err, resp){
                    if(err) console.log(err, err.stack); // an error occurred
                });
                
                // Salesforce - Delete existing Lead Entities
                var q = 'SELECT Id FROM Lead_Entity__c WHERE Lead__c = \'' + payload.Record_Id__c + '\' LIMIT 200';
                org.query({ query: q }, function(err, resp){
                    
                  if(!err && resp.records) {
                    var deleteIds = '';
                    for (var oldRecord of resp.records) {
                        if(deleteIds) deleteIds += ',';
                        deleteIds += JSON.parse(JSON.stringify(oldRecord)).id;
                    }
                    org.deleteUrl( { url: '/services/data/v48.0/composite/sobjects?ids=' + deleteIds } , function(err, resp){
                        if(err) console.log(err, err.stack); // an error occurred
                    });
                  }
                });
                // Salesforce - Insert Lead Entitites
                var leadEntities = [];
                for (var entity of data[0].Entities) {
                    var leadEntity = nforce.createSObject('Lead_Entity__c');
                    leadEntity.set('attributes', { 'type' : 'Lead_Entity__c' } );
                    leadEntity.set('Lead__c', payload.Record_Id__c);
                    leadEntity.set('Accuracy__c', entity.Score * 100);
                    leadEntity.set('Type__c', entity.Type);
                    leadEntity.set('Text__c', entity.Text);
                    leadEntity.set('Name', entity.Type + ' ' + entity.Text);
                    leadEntities.push(leadEntity);
                }
                org.postUrl( { url: '/services/data/v48.0/composite/sobjects/' , body : { records : leadEntities } } , function(err, resp){
                    if(err) console.log(err, err.stack); // an error occurred
                });
                
                // return the result to the caller of the Lambda function
                callback(null, data);
            });

        }).catch(function(err) {
            console.log(err);
        });
    }); //end of org auth
};