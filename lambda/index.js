'use strict';

const AZURE_IOTHUB_CONNECTION_STRING         = 'HostName=codeaholics-iothub.azure-devices.net;SharedAccessKeyName=service;SharedAccessKey=ftHSBjm+qdxO0+XwpzsRVkjp9quzZeXNTVfZjezGP5M=';
const AZURE_IOTHUB_TIMEOUT_IN_SECONDS        = 5;
const AZURE_IOTHUB_DEVICE_REGISTRY_DEVICE_ID = 'deviceRegistry';

const Client  = require('azure-iothub').Client;
const debug   = require('debug')('lambda');
const Message = require('azure-iot-common').Message;

exports.handler = function (event, context) {
  debug('handler', `received a request ${ JSON.stringify(event) }`);

  switch (event.header.namespace) {
  case 'Alexa.ConnectedHome.Discovery':
    handleDiscovery(event, context);
    break;

  case 'Alexa.ConnectedHome.Control':
    handleControl(event, context);
    break;

  case 'Alexa.ConnectedHome.System':
    handleSystem(event, context);
    break;

  default:
    return event.fail(generateError(
      event,
      new Error('not supported'),
      'UnsupportedOperationError'
    ));
  }
};

function handleDiscovery(event, context) {
  switch (event.header.name) {
  case 'DiscoverAppliancesRequest':
    return handleDiscoverAppliances(event, context);

  default:
    return event.fail(generateError(
      event,
      new Error('not supported'),
      'UnsupportedOperationError'
    ));
  }
}

function handleDiscoverAppliances(event, context) {
  debug('discovery', 'handling discovery appliances request');

  invokeDeviceMethod(event, context, AZURE_IOTHUB_DEVICE_REGISTRY_DEVICE_ID, 'discover', {});
}

function handleControl(event, context) {
  switch (event.header.name) {
  case 'TurnOnRequest':
    handleTurnOnRequest(event, context);
    break;

  case 'TurnOffRequest':
    handleTurnOffRequest(event, context);
    break;

  default:
    context.fail(
      generateError(
        event,
        new Error('not supported'),
        'UnsupportedOperationError'
      )
    );

    break;
  }
}

function handleTurnOnRequest(event, context) {
  invokeDeviceMethod(event, context, event.payload.appliance.applianceId, 'turnOn', { source: 'alexa' }, 'TurnOnConfirmation');
}

function handleTurnOffRequest(event, context) {
  invokeDeviceMethod(event, context, event.payload.appliance.applianceId, 'turnOff', { source: 'alexa' }, 'TurnOffConfirmation');
}

function handleSystem(event, context) {
  switch (event.header.name) {
  case 'HealthCheckRequest':
    handleHealthCheckRequest(event, context);
    break;

  default:
    context.fail(
      generateError(
        event,
        new Error('not supported'),
        'UnsupportedOperationError'
      )
    );

    break;
  }
}

function handleHealthCheckRequest(event, context) {
  invokeDeviceMethod(event, context, AZURE_IOTHUB_DEVICE_REGISTRY_DEVICE_ID, 'healthCheck', { description: 'The system is currently healthy', isHealthy: true }, 'HealthCheckResponse');
}

function invokeDeviceMethod(event, context, deviceID, methodName, payload, responseName) {
  executeOnAzure(
    function (client, callback) {
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
    function (err, result) {
      if (!err && result.status === 200) {
        context.succeed(generateResponse(event, result.payload, responseName));
      } else {
        switch (err && err.response && err.response.headers['iothub-errorcode']) {
        case 'DeviceNotOnline':
          context.fail(generateError(event, err, 'TargetOfflineError'));
          break;

        case 'DeviceNotFound':
          context.fail(generateError(event, err, 'NoSuchTargetError'));
          break;

        default:
          context.fail(generateError(event, err, 'DriverInternalError'));
          break;
        }
      }
    }
  );
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

function generateResponse(event, payload, responseName) {
  return {
    header: {
      messageId     : event.header.messageId,
      namespace     : event.header.namespace,
      name          : responseName || generateResponseName(event.header.name),
      payloadVersion: event.header.payloadVersion
    },
    payload: payload
  };
}

function generateError(event, err, responseName) {
  return generateResponse(
    event,
    err ?
      {
        exception: {
          code        : (err.response && err.response.headers) ? err.response.headers['iothub-errorcode'] : (err.code || 'UNKNOWN'),
          description : err.message,
          responseBody: err.responseBody,
          statusCode  : err.response && err.response.statusCode
        }
      }
    :
      {},
    responseName
  );
}

function generateResponseName(name) {
  return name.replace(/Request$/, 'Response');
}
