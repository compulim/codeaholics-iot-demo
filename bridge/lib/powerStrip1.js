'use strict';

const config = require('./config');
const Device = require('./device');
const JohnnyFive = require('johnny-five');
const JohnnyFiveDevice = require('./johnnyFiveDevice');
const { promisify, sleep } = require('./util');

class PowerStrip1 extends JohnnyFiveDevice {
  constructor() {
    super(
      'Power strip 1',
      config.POWER_STRIP_1_CONNECTION_STRING,
      {
        friendlyDescription: 'Power strip in bedroom',
        manufacturer       : 'Schneider',
        modelName          : 'Powex'
      },
      {
        host: '192.168.0.198',
        port: 3030
      }
    );

    this.registerMethod('turnOn', this.handleTurnOn.bind(this));
    this.registerMethod('turnOff', this.handleTurnOff.bind(this));
  }

  boardDidReady(board) {
    this.ready = true;

    this._ledPin = new JohnnyFive.Pin(4);
    this._relayPin = new JohnnyFive.Pin(15);

    this._ledPin.read = promisify(this._ledPin.read.bind(this._ledPin));
    this._relayPin.low();
  }

  async handleTurnOn() {
    if (!this.ready) {
      throw new Error('board is not ready');
    }

    if (!(await this._ledPin.read())) {
      this._relayPin.high();
      await sleep(500);
      this._relayPin.low();

      return { result: 'turned on' };
    } else {
      return { result: 'already on' };
    }
  }

  async handleTurnOff() {
    if (!this.ready) {
      throw new Error('board is not ready');
    }

    if (await this._ledPin.read()) {
      this._relayPin.high();
      await sleep(500);
      this._relayPin.low();

      return { result: 'turned off' };
    } else {
      return { result: 'already off' };
    }
  }
}

module.exports = PowerStrip1;
