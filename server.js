javascriptconst { PeerServer } = require('peer');
const port = process.env.PORT || 9000;
const server = PeerServer({ port, path: '/blizko' });
console.log('Blizko signaling server running on port', port);
