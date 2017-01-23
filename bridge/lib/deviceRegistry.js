'use strict';

const config          = require('./config');
const Device          = require('./device');
const packageJSON     = require('../package.json');

class DeviceRegistry extends Device {
  constructor() {
    super('Device registry', config.DEVICE_REGISTRY_CONNECTION_STRING);

    this._devices = [];

    this.registerMethod('discover', this.discover.bind(this));
    this.registerMethod('healthCheck', this.healthCheck.bind(this));
  }

  addDevice(device) {
    if (!(device instanceof Device)) {
      throw new Error('must be an instance of Device');
    }

    this._devices.push(device);
  }

  // addDevice(deviceID, friendlyName, friendlyDescription, azureIotConnectionString, handlers) {
  //   this._devices.push({
  //     deviceID,
  //     friendlyName,
  //     friendlyDescription,
  //     azureIotConnectionString,
  //     handlers
  //   });
  // }

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

module.exports = DeviceRegistry;
