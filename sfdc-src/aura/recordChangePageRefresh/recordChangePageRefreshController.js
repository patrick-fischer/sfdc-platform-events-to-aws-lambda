({
    subscribe: function(component, event, helper) {
        const empApi = component.find('empApi');
        const channel = component.get("v.channelName");
        const replayId = -1;

        empApi.subscribe(channel, replayId, $A.getCallback(eventReceived => {
            console.log('eventReceived: ' + JSON.stringify(eventReceived));
            if(eventReceived.data.payload.ChangeEventHeader.recordIds[0] == component.get('v.recordId')
            && eventReceived.data.payload.ChangeEventHeader.changeOrigin !== "com/salesforce/api/soap/48.0;client=SfdcInternalAPI/") {
            	location.reload(); // is external change
            }
        }))
        .then(subscription => {
            console.log('Subscribed to channel ', subscription.channel);
            component.set('v.subscription', subscription);
        });

        empApi.onError(function(error){
            console.log("Received error ", error);
        }.bind(this));
    },
    
    unsubscribe : function (component, event, helper) {
        try{
            var empApi = component.find("empApi");
            var channel = component.get("v.channelName");
            var unsubscribeCallback = function (message) {
                console.log("Unsubscribed from channel " + channel);
            }.bind(this);
            var errorHandler = function (message) {
                console.log("Received error ", message);
            }.bind(this);
            var subscription = {"id": component.get("v.subscription")["id"],
                                "channel": component.get("v.subscription")["channel"]};
            empApi.onError(function (error) {
                console.log("Received error ", error);
            }.bind(this));
            empApi.unsubscribe(subscription, unsubscribeCallback);
        }catch(e){}
    }
});