var aws         = require('aws-sdk'),
    bodyParser  = require('body-parser'),
    cuid        = require('cuid'),
    express     = require('express'),

    sdbDomain   = 'sdb-rest-darush',

    app         = express(),
    simpledb;

aws.config.loadFromPath('./aws.credentials.json');

//We'll use the Northern Virginia datacenter, change the region / endpoint for other datacenters http://docs.aws.amazon.com/general/latest/gr/rande.html#sdb_region
simpledb = new aws.SimpleDB({
    region: 'US-East',
    endpoint: 'https://sdb.amazonaws.com'
});

simpledb.select({
    // use your own aws database name instead of 'sdb-rest-darush'
    SelectExpression  : 'select * from `sdb-rest-darush` limit 100'
}, function(err,resp) {
    if (err) {
        console.error(err);
    } else {
        //print the data into console
        console.log(JSON.stringify(resp,null,' '));
    }
});


//create
app.post(
    '/inventory',
    bodyParser.json(),
    function(req,res,next) {
        var sdbAttributes = [],
            newItemName = cuid();

        //start with:
        /*
         { attributeN     : ['value1','value2',..'valueN'] }
         */
        Object.keys(req.body).forEach(function(anAttributeName) {
            req.body[anAttributeName].forEach(function(aValue) {
                sdbAttributes.push({
                    Name  : anAttributeName,
                    Value : aValue
                });
            });
        });
        //end up with:
        /*
         [
         { Name : 'attributeN', Value : 'value1' },
         { Name : 'attributeN', Value : 'value2' },
         ...
         { Name : 'attributeN', Value : 'valueN' },
         ]
         */

        simpledb.putAttributes({
            DomainName    : sdbDomain,
            ItemName      : newItemName,
            Attributes    : sdbAttributes
        }, function(err,awsResp) {
            if (err) {
                next(err);  //server error to user
            } else {
                res.send({
                    itemName  : newItemName
                });
            }
        });
    }
);

//Read
app.get('/inventory/:itemID', function (req, res, next) {
   simpledb.getAttributes({
       DomainName:sdbDomain,
       ItemName:req.params.itemID
   }, function (err, awsResp) {
       var attributes = {};

       if(err){
           next(err); // Server error to users
       } else {
           awsResp.Attributes.forEach(function (obj) {
               // if this is the first time we are seeing the aPair.Name, let's add it
               // to the response object, attributes as an array
               if(!attributes[obj.Name]){
                   attributes[obj.Name] = [];
               }
               // push the value into the correct array
               attributes[obj.Name].push(obj.Value);
           });

           res.send({
               itemName:req.params.itemID,
               inventory:attributes
           });
       }

   });
});


app.listen(3000, function () {
    console.log('SimpleDB-powered REST server started.');
});