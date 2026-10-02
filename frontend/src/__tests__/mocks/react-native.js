const Alert = {
  alert: jest.fn((title, message, buttons) => ({ title, message, buttons })),
};

const Platform = {
  OS: 'ios',
  select: (spec = {}) => (Object.prototype.hasOwnProperty.call(spec, 'ios') ? spec.ios : spec.default),
};

module.exports = {
  Platform,
  Alert,
};
module.exports.default = module.exports;
module.exports.Platform = Platform;
module.exports.Alert = Alert;
