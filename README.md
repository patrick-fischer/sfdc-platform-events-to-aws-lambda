# SFDC Platform Events using AWS Lambda
Content linked to presentation "Go Serverless with Salesforce Platform Events using AWS Lambda" first presented at London's calling in March 2020.

![Image of AWS Solution 1](https://i.imgur.com/rVL0Is5.png)


## Data Process:
1. Records changes in Salesforce
2. Event is being published to Platform Event or CDC topic
3. AWS subscribes to Salesforce event and forwards it to SNS Event
4. Serverless Lambda function executes for every new event and processes data:
a) Connect to other AWS Services
b) Process Large volumes of data
c) Callouts to other external systems
d) Multi Programming Language


## Set-Up Steps
1. Identify objects/records which require external processing
2. Set up automation to fire events
a) (High-Volumne) Platform Event + Automation 
c) Change Data Capture (CDC)
3. Set up Connected App to allow external connection / subscription
4. Create AWS Account 
5. Create SNS Topic
6. Create AWS Lambda Subscriber function (via CometD to Event Bus) to republish to AWS SNS Topic (review /aws-src/sfdcCometdSubscriber)
7. Move Lambda Dependencies (node / npm) into a Lambda Layer (review and upload /aws-src/nforce-layer)
8. Add AWS Lambda Execute access to Role
9. Use Lambda Layers to handle Libraries (i.e. store ‘nForce’ - a nodeJS Salesforce)
10. Store SF Authentication in Env Vars
11. Schedule Lambda Subscriber Function every 15min
12. Go Serverless: Subscribe to AWS SNS Topic using Lambda (review /aws-src/sfdcProcessComprehend)
13. Lambda to handle Serverless processing


## Further Resources
1. AWS SDK: unofficial by Community https://github.com/bigassforce/aws-sdk
2. nForce: NodeJS Library for Salesforce https://github.com/kevinohara80/nforce
3. AWS for SF Integration Developers https://aws.amazon.com/featured-partners/Salesforce/Developers

