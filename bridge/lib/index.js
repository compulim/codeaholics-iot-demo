'use strict';

const bridge = new (require('./bridge'))();

bridge.addDevice(new (require('./powerStrip1'))());
