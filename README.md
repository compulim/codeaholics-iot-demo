# Codeaholics meetup: Alexa + Azure IoT + Arduino

This is the repository for Codeaholics meetup on 2017 January, presented by William Wong.

## Devices

| Device name      | Description                                  |
| ---------------- | -------------------------------------------- |
| `deviceRegistry` | Bridge for device discovery and health check |
| `powerStrip1`    | Power strip controller                       |

## Preparation

Log into IoT hub

`iothub-explorer login HostName=<iot hub name>.azure-devices.net;SharedAccessKeyName=iothubowner;SharedAccessKey=<iot hub key>`

Create `deviceRegistry` device

`iothub-explorer create deviceRegistry`

Create `powerStrip1` device

`iothub-explorer create powerStrip1`
