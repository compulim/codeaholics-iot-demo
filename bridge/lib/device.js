'use strict';

const colors          = require('colors');
const config          = require('./config');
const Client          = require('azure-iot-device').Client;
const Message         = require('azure-iot-device').Message;
const Protocol        = require('azure-iot-device-mqtt').Mqtt;
const qs              = require('qs');

const { promisify }   = require('./util');

class Device {
  constructor(friendlyName, azureIotConnectionString, alexaDescriptor) {
    const deviceID = qs.parse(azureIotConnectionString, { delimiter: ';' }).DeviceId;

    this.client = Client.fromConnectionString(azureIotConnectionString, Protocol);
    this.client.on('disconnect', () => setTimeout(this._connectAzure, config.AZURE_IOTHUB_DISCONNECT_BACKOFF));

    this.debug = require('debug')(`device:${ deviceID }`);

    this.alexaDescriptor = Object.assign({
      additionalApplianceDetails: {},
      applianceId               : deviceID,
      friendlyDescription       : friendlyName,
      friendlyName              : friendlyName,
      manufacturerName          : 'Windows Azure',
      modelName                 : friendlyName,
      version                   : require('../package.json').version
    }, alexaDescriptor);

    this.methods = {};
    this.ready = true;

    this._connectAzure();
  }

  _connectAzure() {
    this.azureConnected = false;

    this.client.removeAllListeners();

    this.client.open(err => {
      if (err) {
        return this._connectAzure();
      }

      this.azureConnected = true;

      // Re-register all methods on reconnect
      Object.keys(this.methods).forEach(methodName => {
        this._registerMethod(methodName, this.methods[methodName]);
      });
    });
  }

  _registerMethod(methodName, callback) {
    this.client.onDeviceMethod(methodName, async (req, res) => {
      this.debug(`invoking ${ colors.magenta(methodName) } with ${ colors.magenta(JSON.stringify(req.payload)) }`);

      try {
        const result = await callback(req.payload);

        res.send(200, result);
        this.debug(`invoke ${ colors.green('succeeded') } with ${ colors.magenta(JSON.stringify(result)) }`);
      } catch (err) {
        res.send(typeof err.code === 'number' && err.code >= 400 && err.code < 500 ? err.code : 500, { message: err.message, stack: err.stack });
        this.debug(`invoke ${ colors.red('failed') } with ${ err }`);
      }
    });
  }

  registerMethod(methodName, callback) {
    this.methods[methodName] = callback;
    this.azureConnected && this._registerMethod(methodName, callback);
  }

  async send(message) {
    await promisify(this.client.sendEvent.bind(this.client))(new Message(JSON.stringify(message)));
  }
}

module.exports = Device;
