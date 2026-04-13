const express = require('express');
const { ExpressPeerServer } = require('peer');

const app = express();
const port = process.env.PORT || 9000;

app.get('/', (req, res) => res.json({ status: 'ok', app: 'blizko-server' }));

const server = app.listen(port, () => {
  console.log('Blizko signaling server running on port', port);
});

const peerServer = ExpressPeerServer(server, {
  path: '/',
  allow_discovery: true,
  expire_timeout: 5000,    // Old connection expires after 5 seconds
  alive_timeout: 60000,    // Keep-alive timeout
  concurrent_limit: 5000,
  cleanup_out_msgs: 1000,
});

app.use('/blizko', peerServer);
