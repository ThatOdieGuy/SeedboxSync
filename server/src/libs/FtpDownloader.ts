import {Socket} from "net";
import mkdirp = require('mkdirp');
import fs = require('fs');
import once = require('once');
import {FtpFile} from "../objects/FtpFile";
import {TransferSpeedAverage} from "../objects/TransfersSpeedAverage";

const logger = require('./Logger');
import {FtpController} from './FtpController';

import {Utils} from './Utils'

class FtpDownloader {
    private _file: FtpFile;
    private _destinationDirectory: string;

    private _downloadDoneCallback;

    private _downloadSpeed = new TransferSpeedAverage();

    constructor(file: FtpFile, destinationDirectory: string) {
        this._file = file;
        this._destinationDirectory = destinationDirectory;
    }

    public start(callback) {
        const self = this;

        this._downloadDoneCallback = callback;

        const file = this._file;
        const localDirectory = this._destinationDirectory;

        file.destinationRoot = localDirectory;

        file.downloading = true;

        logger.info("Downloading", file.fullPath);

        logger.info("mkdirp", localDirectory);

        //Create the full path. jsftp will not error if the directory doesn't exist.
        mkdirp.sync(localDirectory, function (err) {
            if (err) logger.error(err);
            else logger.info('dir created')
        });

        let localPath = FtpFile.appendSlash(localDirectory) + Utils.sanitizeFtpPath(file.name);
        let tempPath = localPath + ".tmp";

        const ftp = FtpController.ftpForDownloading();

        let fd;
        let socket;

        let downloadDone = function(err) {
            //Make sure no more data can come in
            if (socket) {
                socket.destroy();
            }

            if (err) {
                logger.error("Error downloading file\r\n", err);
            }

            FtpController.doneWithFtpObj(ftp);

            if (fd) {
                try {
                    fs.closeSync(fd);
                } catch(exception) {
                    logger.error('Error closing file descriptor.?', exception);
                    err = exception;
                }
            }

            if (!err) {
                let localSize = fs.statSync(tempPath).size;

                if (localSize < file.size) {
                    logger.info("File downloaded, but not completely. Will try again.");
                    err = "Not completely downloaded";
                }
            }

            if (!err) {
                try {
                    fs.renameSync(tempPath, localPath);
                } catch (exception) {
                    logger.error('Error renaming temp file', tempPath, exception);
                    err = exception;
                }
            }

            if (!err) {
                logger.info("File downloaded successfully", localPath);
            }

            self._file.downloading = false;

            self._downloadDoneCallback(err, file);
        };

        //There's a bunch of error listeners and one success listener tied to this, only call once.
        downloadDone = once(downloadDone);


        ftp.on('error', downloadDone);
        ftp.on('timeout', function() {
                downloadDone('timeout');
            });

        let skipBytes;

        try {
            fd = fs.openSync(tempPath, "a");

            skipBytes = fs.fstatSync(fd).size;

            if (skipBytes) {
                logger.info("file already exists, skipping bytes " + skipBytes);
            }

            //For displaying on the client.
            file.transferred = skipBytes;
        } catch(exception) {
            logger.info("Error opening file for writing", tempPath);
            downloadDone(exception);
            return;
        }

        // Retrieve the file using async streams
        ftp.getGetSocket(file.fullPath, skipBytes, function(err: Error, sock: Socket) {
            socket = sock;
            
            if (err) {
                logger.error('Error calling ftp.getGetSocket');
                downloadDone(err);
                return;
            }

            // `sock` is a stream. attach events to it.
            sock.on("data", function(p) {
                fs.writeSync(fd, p, 0, p.length, null);

                //Or should this be fs.bytesWritten?
                file.transferred = sock.bytesRead + skipBytes;

                self._downloadSpeed.dataReceived(p.length);

                file.downloadRate = self._downloadSpeed.average();
            });

            sock.on("close", downloadDone);

            // The sock stream is paused. Call resume() on it to start reading.
            sock.resume();
        });
    }
}

export { FtpDownloader };