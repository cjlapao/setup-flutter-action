module.exports = {
  find: jest.fn(() => ''),
  cacheDir: jest.fn(async dir => dir),
  extractZip: jest.fn(async (_archive, destination) => destination),
  extractTar: jest.fn(async (_archive, destination) => destination)
}
