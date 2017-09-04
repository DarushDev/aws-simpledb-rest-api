var aws = require('aws-sdk'), simpledb;

aws.config.loadFromPath(process.env['HOME'] + '/aws.credentials.json');

//We'll use the Northern Virginia datacenter, change the region / endpoint for other datacenters http://docs.aws.amazon.com/general/latest/gr/rande.html#sdb_region
simpledb = new aws.SimpleDB({
    region: 'US-East',
    endpoint: 'https://sdb.amazonaws.com'
});