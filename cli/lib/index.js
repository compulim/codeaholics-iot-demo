'use strict';

const config = require('./config');
const program = require('commander');
const callMethod = require('./callMethod');
const sendMessage = require('./sendMessage');

program
  .version(require('../package.json').version)
  .option('-c, --connection-string <connection string>', 'Connection string for Azure IoT, can be set by AZURE_IOT_CONNECTION_STRING environment variable', process.env.AZURE_IOT_CONNECTION_STRING)
  .action(function () {
    const options = arguments[arguments.length - 1];

    config.CONNECTION_STRING = options.connectionString;
  });

program
  .command('on <device>')
  .action(deviceID => {
    callMethod(deviceID, 'turnOn', {});
    // sendMessage(deviceID, { action: 'on' });
  });

program
  .command('off <device>')
  .action(deviceID => {
    callMethod(deviceID, 'turnOff', {});
    // sendMessage(deviceID, { action: 'off' });
  });

program
  .command('discover')
  .action(() => {
    callMethod('deviceRegistry', 'discover', {});
  });

program
  .command('unknown')
  .action(() => {
    callMethod('deviceRegistry', 'abc', {});
  });

program.parse(process.argv);
