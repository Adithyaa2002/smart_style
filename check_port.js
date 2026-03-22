const net = require('net');
const port = 5000;
const host = 'localhost';

const client = new net.Socket();
client.setTimeout(2000);

client.connect(port, host, () => {
    console.log(`CONNECTED to ${host}:${port}`);
    client.destroy();
});

client.on('error', (err) => {
    console.log(`CONNECTION FAILED: ${err.message}`);
    client.destroy();
});

client.on('timeout', () => {
    console.log(`CONNECTION TIMEOUT`);
    client.destroy();
});
