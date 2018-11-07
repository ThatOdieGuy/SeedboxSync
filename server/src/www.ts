#!/usr/bin/env node

import {NetworkEvent} from "../../shared/NetworkConstants";
import * as yaml from 'js-yaml';
import * as fs from 'fs';

/**
 * Module dependencies.
 */


const debug = require('debug')('seedboxsync:server');
import * as http from 'http';
import * as socketIO from 'socket.io';
import * as logger from './libs/Logger';
import * as upath from 'upath';

// load config:
try {
    var doc = yaml.safeLoad(fs.readFileSync(upath.normalize(__dirname + '/../../config.yml'), 'utf-8'));
    console.log(doc);
} catch (e) {
    console.log(e);
}


// import * as config from '../Config');

// const config = require('../Config');

import * as syncController from './libs/SyncController';
const app = require('./app');

/**
 * Get port from environment and store in Express.
 */
let port = normalizePort(45532);
app.set('port', port);

/**
 * Create HTTP server.
 */
const server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

//TODO: Put sockets.io setup somewhere else
const io = socketIO(server);

io.on('connect', (socket) => {
    // logger.debug('client connected');

    socket.on('disconnect', () => {
        // logger.debug('client disconnected');
    });
});

setInterval(() => {
    if (io.engine["clientsCount"]) {
        // io.emit(NetworkEvent.DOWNLOADS.name(), syncController.downloadsStatus());
    }
}, 1000);


/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
    const port = parseInt(val, 10);

    if (isNaN(port)) {
        // named pipe
        return val;
    }

    if (port >= 0) {
        // port number
        return port;
    }


    return val
    // return config.originalValues.port;
}

/**
 * Event listener for HTTP server "error" event.
 */

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
            // logger.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            // logger.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
    const addr = server.address();
    const bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr.port;
    debug('Listening on ' + bind);
}