'use strict';

const colors          = require('colors');
const config          = require('./config');
const Device          = require('./device');
const EtherPortClient = require('etherport-client').EtherPortClient;
const JohnnyFive      = require('johnny-five');

class JohnnyFiveSingleDevice extends Device {
  constructor(friendlyName, connectionString, alexaDescriptor, boardPort) {
    super(friendlyName, connectionString, alexaDescriptor);

    // TODO: Try if we can put a JS object instead of JSON text
    this.alexaDescriptor.additionalApplianceDetails.johnnyFivePort = JSON.stringify(boardPort);

    this.board = JohnnyFive.Board({
      port: new EtherPortClient(boardPort),
      repl: false,
      timeout: config.JOHNNY_FIVE_BOARD_TIMEOUT
    });

    this.ready = false;

    this.board.on('ready', () => {
      this.ready = true;

      this.debug('is ready');
      this.send('ready');
      this.boardDidReady(this.board);
    }).on('error', err => {
      console.log(err);
    });
  }

  boardDidReady() {}
  boardDidDisconnected() {}
}

module.exports = JohnnyFiveSingleDevice;
