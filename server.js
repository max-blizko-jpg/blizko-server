const express = require('express');
const { ExpressPeerServer } = require('peer');

const app = express();
const port = process.env.PORT || 9000;

app.get('/', (req, res) => res.json({ status: 'ok', app: 'blizko-server' }));

const server = app.listen(port, () => {
  console.log('Blizko signaling server running on port', port);
});

const peerServer = ExpressPeerServer(server, { path: '/blizko' });
app.use('/blizko', peerServer);
