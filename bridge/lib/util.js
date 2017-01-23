'use strict';

function promisify(fn) {
  return function () {
    return new Promise((resolve, reject) => {
      fn.apply(
        null,
        [].slice.call(arguments).concat((err, result) => err ? reject(err) : resolve(result))
      );
    });
  };
}

function sleep(duration) {
  return new Promise(resolve => setTimeout(resolve, duration));
}

module.exports = {
  promisify,
  sleep
};
