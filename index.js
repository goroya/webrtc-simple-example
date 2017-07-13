const log4js = require('log4js');
logger = log4js.getLogger();
logger.level = 'debug';

const express = require('express');
const app = express();

const fs = require('fs');
const path = require('path');
const util = require('util');

let server = null;
if (process.env.heroku === 'true') {
  const http = require('http');
  server = http.createServer(app);
} else {
  const https = require('https');
  server = https.createServer(
    {
      key: fs.readFileSync(path.join(__dirname, 'key', 'server_key.pem')),
      cert: fs.readFileSync(path.join(__dirname, 'key', 'server_crt.pem')),
    },
    app
  );
}


app.use(express.static('public'));
app.use(function(req, res, next) {
  logger.info('request to: ' + req.path);
  next();
});

const io = require('socket.io')(server);
io.on('connection', (socket) => {
  logger.debug('Socket connection:' + util.inspect(socket.id));
  socket.emit('log', {hello: 'world'});
  socket.on('signaling', (data) => {
    console.log(data);
    socket.to(data.to).emit('signaling', data);
  });
});

server.listen((process.env.PORT || 3000));
server.on('error', onError);
server.on('listening', onListening);

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

function onListening() {
  const addr = server.address();
  const bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  logger.debug('Listening on ' + bind);
}
