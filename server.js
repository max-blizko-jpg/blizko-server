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
  expire_timeout: 5000,
  alive_timeout: 60000,
  concurrent_limit: 5000,
  cleanup_out_msgs: 1000,
});

// Track connected peers so we can kick old connections (latest device wins)
const connectedPeers = new Map();

peerServer.on('connection', (client) => {
  const id = client.getId();
  console.log('[Blizko] Peer connecting:', id);

  // If another peer with same ID exists, disconnect it after short delay
  if (connectedPeers.has(id)) {
    const oldClient = connectedPeers.get(id);
    console.log('[Blizko] Kicking old connection for:', id);
    setTimeout(() => {
      try { oldClient.getSocket()?.close(); } catch(e) {}
    }, 500);
  }

  connectedPeers.set(id, client);
  console.log('[Blizko] Peer connected:', id, '| Total:', connectedPeers.size);
});

peerServer.on('disconnect', (client) => {
  const id = client.getId();
  console.log('[Blizko] Peer disconnected:', id);
  if (connectedPeers.get(id) === client) {
    connectedPeers.delete(id);
  }
});

app.use('/blizko', peerServer);
