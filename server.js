var aws = require('aws-sdk'),
    bodyParser = require('body-parser'),
    cuid = require('cuid'),
    express = require('express'),
    async = require('async'),

    sdbDomain = 'sdb-rest-darush',

    app = express(),

    schema = ['pets', 'cars', 'furniture', 'phones'],
    simpledb;

aws.config.loadFromPath('./aws.credentials.json');

//We'll use the Northern Virginia datacenter, change the region / endpoint for other datacenters http://docs.aws.amazon.com/general/latest/gr/rande.html#sdb_region
simpledb = new aws.SimpleDB({
    region: 'US-East',
    endpoint: 'https://sdb.amazonaws.com'
});

/*simpledb.select({
 // use your own aws database name instead of 'sdb-rest-darush'
 SelectExpression  : 'select * from `sdb-rest-darush` limit 100'
 }, function(err,resp) {
 if (err) {
 console.error(err);
 } else {
 //print the data into console
 console.log(JSON.stringify(resp,null,' '));
 }
 });*/


//create
app.post(
    '/inventory',
    bodyParser.json(),
    function (req, res, next) {
        var newAttributes = attributeObjectToAttributeValuePairs(req.body, false),
            newItemName = cuid();

        newAttributes = newAttributes.filter(function (anAttribute) {
            return schema.indexOf(anAttribute.Name) !== -1;
        });

        newAttributes.push({
            Name: 'created',
            Value: '1'
        });

        simpledb.putAttributes({
            DomainName: sdbDomain,
            ItemName: newItemName,
            Attributes: newAttributes
        }, function (err, awsResp) {
            if (err) {
                next(err);  //server error to user
            } else {
                res.status(201).send({
                    itemName: newItemName
                });
            }
        });
    }
);

//Read
app.get('/inventory/:itemID', function (req, res, next) {
    simpledb.getAttributes({
        DomainName: sdbDomain,
        ItemName: req.params.itemID
    }, function (err, awsResp) {
        var attributes = {};

        if (err) {
            next(err); // Server error to users
        } else {

            if (!awsResp.Attributes) {
                //set the status response to 404 because we didn't find any attributes then end it
                res.status(404).end();
            } else {

                awsResp.Attributes.forEach(function (obj) {
                    // if this is the first time we are seeing the aPair.Name, let's add it
                    // to the response object, attributes as an array
                    if (!attributes[obj.Name]) {
                        attributes[obj.Name] = [];
                    }
                    // push the value into the correct array
                    attributes[obj.Name].push(obj.Value);
                });

                res.send({
                    itemName: req.params.itemID,
                    inventory: attributes
                });

            }

        }

    });
});

//Update
app.put('/inventory/:itemID', bodyParser.json(), function (req, res, next) {
    var updateValues = {},
        deleteValues = [];

    schema.forEach(function (anAttribute) {
        if ((!req.body[anAttribute]) || (req.body[anAttribute].length === 0)) {
            deleteValues.push({Name: anAttribute});
        } else {
            updateValues[anAttribute] = req.body[anAttribute];
        }
    });

    async.parallel([
        function (callback) {
            //update anything that is present
            simpledb.putAttributes({
                DomainName: sdbDomain,
                ItemName: req.params.itemID,
                Attributes: attributeObjectToAttributeValuePairs(updateValues, true),
                Expected: {
                    Name: 'created',
                    Value: '1',
                    Exists: true
                }
            }, callback);
        },
        function (callback) {
            //delete any attributes that are not present
            simpledb.deleteAttributes({
                DomainName: sdbDomain,
                ItemName: req.params.itemID,
                Attributes: deleteValues
            }, callback);
        }
    ], function (err) {
        if (err)
            next(err);
        else
            res.status(200).end();
    })
});

//delete
app.delete('/inventory/:itemID', function (req, res, next) {
   var attributesToDelete;

   attributesToDelete = schema.map(function (anAttribute) {
       return {Name: anAttribute};
   });

    attributesToDelete.push({Name: 'created'});

    simpledb.deleteAttributes({
        DomainName: sdbDomain,
        ItemName: req.params.itemID,
        Attributes: attributesToDelete
    }, function (err) {
        if(err)
            next(err);
        else
            res.status(200).end();
    });

});

app.listen(3000, function () {
    console.log('SimpleDB-powered REST server started.');
});

function attributeObjectToAttributeValuePairs(attrObj, replace) {
    var sdbAttributes = [];
    //start with:
    /*
     { attributeN     : ['value1','value2',..'valueN'] }
     */
    Object.keys(attrObj).forEach(function (anAttributeName) {
        attrObj[anAttributeName].forEach(function (aValue) {
            sdbAttributes.push({
                Name: anAttributeName,
                Value: aValue,
                Replace: replace
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

    return sdbAttributes;
}

function attributeValuePairsToAttributeObject(pairs) {
    var attributes = {};

    pairs.filter(function (aPair) {
        return aPair.Name !== 'created';
    }).forEach(function (aPair) {
        if (!attributes[aPair.Name]) {
            attributes[aPair.Name] = [];
        }

        attributes[aPair.Name].push(aPair.Value);
    });

    return attributes;
}