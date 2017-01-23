'use strict';

const AZURE_IOTHUB_CONNECTION_STRING  = 'HostName=codeaholics-iothub.azure-devices.net;SharedAccessKeyName=service;SharedAccessKey=ftHSBjm+qdxO0+XwpzsRVkjp9quzZeXNTVfZjezGP5M=';
const AZURE_IOTHUB_TIMEOUT_IN_SECONDS = 5;
const AZURE_IOTHUB_BRIDGE_DEVICE_ID   = 'bridge';

const Client  = require('azure-iothub').Client;
const debug   = require('debug')('lambda');
const Message = require('azure-iot-common').Message;
const uuidV4  = require('uuid/v4');

exports.handler = function (event, context) {
  debug('handler', `received a request ${ JSON.stringify(event) }`);

  let promise;

  switch (event.header.namespace) {
  case 'Alexa.ConnectedHome.Discovery':
    promise = handleDiscovery(event);
    break;

  case 'Alexa.ConnectedHome.Control':
    promise = handleControl(event);
    break;

  case 'Alexa.ConnectedHome.System':
    promise = handleSystem(event);
    break;
  }

  if (!promise) {
    const notSupportedError = new Error('not supported');

    notSupportedError.alexaHeader = {
      namespace     : event.header.namespace,
      name          : 'UnsupportedOperationError',
      payloadVersion: '2'
    };

    promise = Promise.reject(notSupportedError);
  }

  promise.then(
    res => {
      context.succeed({
        header: Object.assign({
          messageId     : uuidV4(),
          namespace     : event.header.namespace,
          name          : generateResponseName(event.header.name),
          payloadVersion: '2'
        }, res.header),
        payload: res.payload
      });
    },
    err => {
      context.fail({
        header: Object.assign({
          messageId     : uuidV4(),
          namespace     : event.header.namespace,
          name          : 'DriverInternalError',
          payloadVersion: '2'
        }, err.alexaHeader),
        payload: {
          code        : (err.response && err.response.headers) ? err.response.headers['iothub-errorcode'] : (err.code || 'UNKNOWN'),
          description : err.message,
          responseBody: err.responseBody,
          stack       : err.stack,
          statusCode  : err.response && err.response.statusCode
        }
      });
    }
  )
};

function handleDiscovery(event) {
  switch (event.header.name) {
  case 'DiscoverAppliancesRequest':
    return handleDiscoverAppliances(event.payload);
  }
}

function handleDiscoverAppliances() {
  debug('discovery', 'handling discovery appliances request');

  return invokeDeviceMethod(AZURE_IOTHUB_BRIDGE_DEVICE_ID, 'discover', { source: 'alexa' }, 'DiscoverAppliancesResponse');
}

function handleControl(event) {
  switch (event.header.name) {
  case 'TurnOnRequest':
    return handleTurnOnRequest(event.payload);

  case 'TurnOffRequest':
    return handleTurnOffRequest(event.payload);
  }
}

function handleTurnOnRequest(payload) {
  return invokeDeviceMethod(payload.appliance.applianceId, 'turnOn', { source: 'alexa' }, 'TurnOnConfirmation');
}

function handleTurnOffRequest(payload) {
  return invokeDeviceMethod(payload.appliance.applianceId, 'turnOff', { source: 'alexa' }, 'TurnOffConfirmation');
}

function handleSystem(event) {
  switch (event.header.name) {
  case 'HealthCheckRequest':
    return handleHealthCheckRequest(event.payload);
  }
}

function handleHealthCheckRequest(payload) {
  return invokeDeviceMethod(AZURE_IOTHUB_BRIDGE_DEVICE_ID, 'healthCheck', {})
    .then(
      () => ({
        header: {
          name: 'HealthCheckResponse'
        },
        payload: {
          description: 'The system is currently healthy',
          isHealthy: true
        }
      }),
      err => ({
        header: {
          name: 'HealthCheckResponse'
        },
        payload: {
          description: 'The system is currently down',
          isHealthy: false
        }
      })
    );
}

function invokeDeviceMethod(deviceID, methodName, payload, responseName) {
  return new Promise((resolve, reject) => {
    executeOnAzure(
      (client, callback) => {
        client.invokeDeviceMethod(
          deviceID,
          {
            methodName              : methodName,
            payload                 : payload,
            responseTimeoutInSeconds: AZURE_IOTHUB_TIMEOUT_IN_SECONDS
          },
          callback
        );
      },
      (err, result) => {
        if (!err && result.status === 200) {
          resolve({
            header: {
              name: responseName
            },
            payload: result.payload
          });
        } else if (err) {
          switch (err.response && err.response.headers['iothub-errorcode']) {
          case 'DeviceNotOnline':
            err.alexaHeader = { name: 'TargetOfflineError' };
            break;

          case 'DeviceNotFound':
            err.alexaHeader = { name: 'NoSuchTargetError' };
            break;
          }

          reject(err);
        } else {
          const error = new Error(`server returned ${ result.status }`);

          error.message = result.payload.message;
          error.stack = result.payload.stack;

          reject(error);
        }
      }
    );
  });
}

function executeOnAzure(executor, callback) {
  const client = Client.fromConnectionString(AZURE_IOTHUB_CONNECTION_STRING);

  debug('iothub', 'connecting');

  client.open(err => {
    if (err) {
      debug('iothub', 'failed to connect');
      return callback(err);
    }

    debug('iothub', 'connected');

    executor(client, (err, res) => {
      if (err) {
        debug('iothub', `operation failed with ${ err }`);
        return callback(err);
      }

      debug('iothub', `operation succeeded with ${ JSON.stringify(res) }`);

      client.close(err => {
        debug('iothub', 'disconnecting');

        callback(err, err ? null : res);
      });
    });
  });
}

function generateResponseName(name) {
  return name.replace(/Request$/, 'Response');
}
