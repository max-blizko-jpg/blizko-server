const express = require('express');
const { ExpressPeerServer } = require('peer');
const https = require('https');

const app = express();
const port = process.env.PORT || 9000;
const API_URL = 'https://blizko-api.onrender.com';

app.get('/', (req, res) => res.json({ status: 'ok', app: 'blizko-server' }));

const server = app.listen(port, () => {
  console.log('Blizko signaling server running on port', port);
});

// Verify JWT token with blizko-api
function verifyToken(token) {
  return new Promise((resolve) => {
    if (!token || token === 'free') {
      resolve(true); // Allow free users
      return;
    }

    const data = JSON.stringify({ token });
    const options = {
      hostname: 'blizko-api.onrender.com',
      path: '/auth/verify-token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve(parsed.valid === true);
        } catch {
          resolve(false);
        }
      });
    });

    req.on('error', () => resolve(true)); // Fail open — don't block calls if API is down
    req.setTimeout(3000, () => { req.destroy(); resolve(true); }); // 3s timeout
    req.write(data);
    req.end();
  });
}

const peerServer = ExpressPeerServer(server, {
  path: '/',
  allow_discovery: true,
  expire_timeout: 5000,
  alive_timeout: 60000,
  concurrent_limit: 5000,
  cleanup_out_msgs: 1000,
});

// Track connected peers so we can kick old connections
const connectedPeers = new Map();

peerServer.on('connection', async (client) => {
  const id = client.getId();
  const token = client.getToken();
  console.log('[Blizko] Peer connecting:', id);

  // Verify token
  const valid = true; // Temporarily disabled for debugging
  if (!valid) {
    console.log('[Blizko] Invalid token, rejecting:', id);
    try { client.getSocket()?.close(); } catch(e) {}
    return;
  }

  // If another peer with same ID exists, kick it after a delay (latest device wins)
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
