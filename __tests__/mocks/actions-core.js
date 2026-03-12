module.exports = {
  getInput: jest.fn(() => ''),
  getBooleanInput: jest.fn(() => false),
  setOutput: jest.fn(),
  setFailed: jest.fn(),
  addPath: jest.fn(),
  exportVariable: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}
