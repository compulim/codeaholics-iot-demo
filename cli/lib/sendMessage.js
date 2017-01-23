'use strict';

const config = require('./config');
const Client = require('azure-iothub').Client;
const Message = require('azure-iot-common').Message;

const { promisify } = require('./util');

async function sendMessage(targetDevice, message) {
  const client = Client.fromConnectionString(config.CONNECTION_STRING);

  try {
    await promisify(client.open.bind(client))();
  } catch (err) {
    console.log(err);

    throw err;
  }

  message = new Message(JSON.stringify(message));

  try {
    const res = await promisify(client.send.bind(client))(targetDevice, message);

    console.log(res);
  } catch (err) {
    console.log(err);

    throw err;
  } finally {
    await promisify(client.close.bind(client))();
  }
}

module.exports = sendMessage;
