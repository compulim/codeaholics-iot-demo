///////////////////////////////////////////////////////////////////////////////////////////////////
// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

#include <stdlib.h>

#include <stdio.h>
#include <stdint.h>
#include <string.h>
#include <pgmspace.h>
#include <Arduino.h>
#include <time.h>

#include "command_center.h"

/* This sample uses the _LL APIs of iothub_client for example purposes.
That does not mean that HTTP or MQTT only works with the _LL APIs.
Simply changing the using the convenience layer (functions not having _LL)
and removing calls to _DoWork will yield the same results. */

#include "AzureIoTHub.h"
// #include "sdk/schemaserializer.h"

/* CODEFIRST_OK is the new name for IOT_AGENT_OK. The follow #ifndef helps during the name migration. Remove it when the migration ends. */
#ifndef  IOT_AGENT_OK
#define  IOT_AGENT_OK CODEFIRST_OK
#endif // ! IOT_AGENT_OK

static const char* connectionString = "HostName=[host].azure-devices.net;DeviceId=[device];SharedAccessKey=[key]";

static int relayPin = 15;
static int indicatorPin = 4;

int turnOff(unsigned char** response, size_t* resp_size, void* userContext)
{
  char* responseString;

  if (digitalRead(indicatorPin) == HIGH)
  {
    LogInfo("Turning off.\r\n");

    digitalWrite(relayPin, HIGH);
    delay(500);
    digitalWrite(relayPin, LOW);

    responseString = "{\"message\":\"turned off\"}";
  }
  else
  {
    LogInfo("Already turned off.\r\n");

    responseString = "{\"message\":\"already turned off\"}";
  }

  *resp_size = strlen(responseString);
  if ((*response = malloc(*resp_size)) == NULL)
  {
    return -1;
  }
  else
  {
    (void)memcpy(*response, responseString, *resp_size);
  }

  return 200;
}

int turnOn(unsigned char** response, size_t* resp_size, void* userContext)
{
  char* responseString;

  if (digitalRead(indicatorPin) == LOW)
  {
    LogInfo("Turning on.\r\n");

    digitalWrite(relayPin, HIGH);
    delay(500);
    digitalWrite(relayPin, LOW);

    responseString = "{\"message\":\"turned on\"}";
  }
  else
  {
    LogInfo("Already turned on.\r\n");

    responseString = "{\"message\":\"already turned on\"}";
  }

  *resp_size = strlen(responseString);
  if ((*response = malloc(*resp_size)) == NULL)
  {
    return -1;
  }
  else
  {
    (void)memcpy(*response, responseString, *resp_size);
  }

  return 200;
}

int ping(unsigned char** response, size_t* resp_size, void* userContext)
{
  char* responseString;

  responseString = "{\"healthy\":true}";

  *resp_size = strlen(responseString);
  if ((*response = malloc(*resp_size)) == NULL)
  {
    return -1;
  }
  else
  {
    (void)memcpy(*response, responseString, *resp_size);
  }

  return 200;
}

// void sendCallback(IOTHUB_CLIENT_CONFIRMATION_RESULT result, void* userContextCallback)
// {
//   int messageTrackingId = (intptr_t)userContextCallback;

//   LogInfo("Message Id: %d Received.\r\n", messageTrackingId);

//   LogInfo("Result Call Back Called! Result is: %s \r\n", ENUM_TO_STRING(IOTHUB_CLIENT_CONFIRMATION_RESULT, result));
// }

// static void sendMessage(IOTHUB_CLIENT_LL_HANDLE iotHubClientHandle, const unsigned char* buffer, size_t size)
// {
//   static unsigned int messageTrackingId;
//   IOTHUB_MESSAGE_HANDLE messageHandle = IoTHubMessage_CreateFromByteArray(buffer, size);
//   if (messageHandle == NULL)
//   {
//     LogInfo("unable to create a new IoTHubMessage\r\n");
//   }
//   else
//   {
//     if (IoTHubClient_LL_SendEventAsync(iotHubClientHandle, messageHandle, sendCallback, (void*)(uintptr_t)messageTrackingId) != IOTHUB_CLIENT_OK)
//     {
//       LogInfo("failed to hand over the message to IoTHubClient");
//     }
//     else
//     {
//       LogInfo("IoTHubClient accepted the message for delivery\r\n");
//     }
//     IoTHubMessage_Destroy(messageHandle);
//   }
//   free((void*)buffer);
//   messageTrackingId++;
// }

// /*this function "links" IoTHub to the serialization library*/
// static IOTHUBMESSAGE_DISPOSITION_RESULT IoTHubMessage(IOTHUB_MESSAGE_HANDLE message, void* userContextCallback)
// {
//   LogInfo("Command Received\r\n");
//   IOTHUBMESSAGE_DISPOSITION_RESULT result;
//   const unsigned char* buffer;
//   size_t size;
//   if (IoTHubMessage_GetByteArray(message, &buffer, &size) != IOTHUB_MESSAGE_OK)
//   {
//     LogInfo("unable to IoTHubMessage_GetByteArray\r\n");
//     result = EXECUTE_COMMAND_ERROR;
//   }
//   else
//   {
//     /*buffer is not zero terminated*/
//     char* temp = malloc(size + 1);
//     if (temp == NULL)
//     {
//       LogInfo("failed to malloc\r\n");
//       result = EXECUTE_COMMAND_ERROR;
//     }
//     else
//     {
//       memcpy(temp, buffer, size);
//       temp[size] = '\0';
//       EXECUTE_COMMAND_RESULT executeCommandResult = EXECUTE_COMMAND(userContextCallback, temp);
//       result =
//         (executeCommandResult == EXECUTE_COMMAND_ERROR) ? IOTHUBMESSAGE_ABANDONED :
//         (executeCommandResult == EXECUTE_COMMAND_SUCCESS) ? IOTHUBMESSAGE_ACCEPTED :
//         IOTHUBMESSAGE_REJECTED;
//       free(temp);
//     }
//   }
//   return result;
// }

static int IoTHubDeviceMethod(const char* method_name, const unsigned char* payload, size_t size, unsigned char** response, size_t* resp_size, void* userContextCallback)
{
  LogInfo("Device Method name:    %s\r\n", method_name);
  LogInfo("Device Method payload: %.*s\r\n", (int)size, (const char*)payload);

  if (strcmp(method_name, "turnOn") == 0)
  {
    return turnOn(response, resp_size, userContextCallback);
  }
  else if (strcmp(method_name, "turnOff") == 0)
  {
    return turnOff(response, resp_size, userContextCallback);
  }
  else if (strcmp(method_name, "ping") == 0)
  {
    return ping(response, resp_size, userContextCallback);
  }

  char* RESPONSE_STRING = "{\"message\":\"unknown method\"}";

  *resp_size = strlen(RESPONSE_STRING);
  if ((*response = malloc(*resp_size)) == NULL)
  {
    return -1;
  }
  else
  {
    (void)memcpy(*response, RESPONSE_STRING, *resp_size);
  }

  return 500;
}

void command_center_run(void)
{
  pinMode(relayPin, OUTPUT);
  pinMode(indicatorPin, INPUT);
  digitalWrite(relayPin, LOW);

  if (platform_init() != 0)
  {
    LogError("Failed to initialize the platform.\r\n");
  }
  else
  {
    if (serializer_init(NULL) != SERIALIZER_OK)
    {
      LogError("Failed on serializer_init.\r\n");
    }
    else
    {
      IOTHUB_CLIENT_LL_HANDLE iotHubClientHandle = IoTHubClient_LL_CreateFromConnectionString(connectionString, MQTT_Protocol);
      srand((unsigned int)time(NULL));

      if (iotHubClientHandle == NULL)
      {
        LogError("Failed on IoTHubClient_LL_Create\r\n");
      }
      else
      {
        unsigned int minimumPollingTime = 9; /*because it can poll "after 9 seconds" polls will happen effectively at ~10 seconds*/
        if (IoTHubClient_LL_SetOption(iotHubClientHandle, "MinimumPollingTime", &minimumPollingTime) != IOTHUB_CLIENT_OK)
        {
          LogError("failure to set option \"MinimumPollingTime\"\r\n");
        }

        bool traceOn = true;
        if (IoTHubClient_LL_SetOption(iotHubClientHandle, "logtrace", &traceOn) != IOTHUB_CLIENT_OK)
        {
          LogError("failure to set option \"logtrace\"\r\n");
        }

#ifdef MBED_BUILD_TIMESTAMP
        // For mbed add the certificate information
        if (IoTHubClient_LL_SetOption(iotHubClientHandle, "TrustedCerts", certificates) != IOTHUB_CLIENT_OK)
        {
          LogError("failure to set option \"TrustedCerts\"\r\n");
        }
#endif // MBED_BUILD_TIMESTAMP

        if (IoTHubClient_LL_SetDeviceMethodCallback(iotHubClientHandle, IoTHubDeviceMethod, NULL) != IOTHUB_CLIENT_OK)
        {
          LogInfo("unable to IoTHubClient_LL_SetDeviceMethodCallback\r\n");
        }
        else
        {
          while (1)
          {
            IoTHubClient_LL_DoWork(iotHubClientHandle);
            ThreadAPI_Sleep(100);
          }
        }
      }

      IoTHubClient_LL_Destroy(iotHubClientHandle);
    }
  }

  platform_deinit();
}
