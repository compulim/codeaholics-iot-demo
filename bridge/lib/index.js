'use strict';

const deviceRegistry = new (require('./deviceRegistry'))();

deviceRegistry.addDevice(new (require('./powerStrip1'))());
