var aws = require('aws-sdk'), simpledb;

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