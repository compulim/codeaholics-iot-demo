'use strict';

const config          = require('./config');
const Device          = require('./device');
const packageJSON     = require('../package.json');

class Bridge extends Device {
  constructor() {
    super('Bridge', config.BRIDGE_CONNECTION_STRING);

    this._devices = [];

    this.registerMethod('discover', this.discover.bind(this));
    this.registerMethod('healthCheck', this.healthCheck.bind(this));
  }

  addDevice(device) {
    if (!(device instanceof Device)) {
      throw new Error('must be an instance of Device');
    }

    // TODO: Auto create device on IoT hub
    // TODO: Auto retrieve connection string for IoT hub

    this._devices.push(device);
  }

  async healthCheck(payload) {
    return payload;
  }

  async discover() {
    return {
      discoveredAppliances: this._devices.map(device => Object.assign(
        {
          actions    : Object.keys(device.methods),
          isReachable: device.ready
        },
        device.alexaDescriptor
      ))
    };
  }
}

module.exports = Bridge;
