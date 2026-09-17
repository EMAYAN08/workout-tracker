const captureRef = jest.fn(async () => 'file://shot.png');

module.exports = { captureRef };
module.exports.default = module.exports;
module.exports.captureRef = captureRef;
