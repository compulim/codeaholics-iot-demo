'use strict';

const config = require('./config');
const Client = require('azure-iothub').Client;
const Message = require('azure-iot-common').Message;

const { promisify } = require('./util');

async function callMethod(targetDevice, methodName, payload) {
  const client = Client.fromConnectionString(config.CONNECTION_STRING);

  try {
    await promisify(client.open.bind(client))();
  } catch (err) {
    console.log(err);

    throw err;
  }

  try {
    const res = await promisify(client.invokeDeviceMethod.bind(client))(
      targetDevice,
      {
        methodName,
        payload,
        responseTimeoutInSeconds: 5
      }
    );

    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.log(err);

    throw err;
  } finally {
    await promisify(client.close.bind(client))();
  }
}

module.exports = callMethod;
