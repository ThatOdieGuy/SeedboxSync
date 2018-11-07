import * as winston from "winston";

const logger : winston.LoggerInstance = new (winston.createLogger)({
    transports: [
        new winston.transports.File(
            {
                filename: 'seedsync.log',
                level: 'debug',
                timestamp: true,
                maxsize: 1000000,
                handleExceptions: true,
                humanReadableUnhandledException: true
            }),
        new winston.transports.Console(
            {
                level: 'debug',
                colorize: true,
                timestamp: true,
                handleExceptions: true,
                humanReadableUnhandledException: true
            })
    ],
    exitOnError: false, // <--- set this to false
});

module.exports = logger;
