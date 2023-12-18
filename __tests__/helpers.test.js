const core = require('@actions/core')
const path = require('path')
const { getOptions } = require('../src/helpers')

// Mock the GitHub Actions core library
const errorMock = jest.spyOn(core, 'error').mockImplementation()

describe('getOptions', () => {
  beforeEach(() => {
    process.env['RUNNER_OS'] = 'macos'
    process.env['RUNNER_ARCH'] = 'x64'
    process.env['FLUTTER_CHANNEL'] = ''
    process.env['FLUTTER_VERSION'] = ''
    process.env['RUNNER_TEMP'] = '/tmp'
    process.env['RUNNER_TOOL_CACHE'] = '/cache'
    jest.clearAllMocks()
  })

  it('returns options with default values', () => {
    const options = getOptions()

    expect(options.arch).toBe('x64')
    expect(options.osName).toBe('macos')
    expect(options.channel).toBe('stable')
    expect(options.version).toBe('')
    expect(options.baseFolder).toBe('/tmp')
    expect(options.tempFolder).toBe(path.join('/tmp', '__decompress_temp'))
    expect(options.flutterFolder).toBe(
      path.join('/tmp', '__decompress_temp', 'flutter')
    )
    expect(options.cacheBaseFolder).toBe('/cache')
    expect(errorMock).not.toHaveBeenCalled()
  })

  it('returns options with custom values', () => {
    process.env['FLUTTER_CHANNEL'] = 'beta'
    process.env['FLUTTER_VERSION'] = '2.0.0'
    process.env['RUNNER_TEMP'] = '/custom-temp'
    process.env['RUNNER_TOOL_CACHE'] = '/custom-cache'

    const options = getOptions()

    expect(options.arch).toBe('x64')
    expect(options.osName).toBe('macos')
    expect(options.channel).toBe('beta')
    expect(options.version).toBe('2.0.0')
    expect(options.baseFolder).toBe('/custom-temp')
    expect(options.tempFolder).toBe(
      path.join('/custom-temp', '__decompress_temp')
    )
    expect(options.flutterFolder).toBe(
      path.join('/custom-temp', '__decompress_temp', 'flutter')
    )
    expect(options.cacheBaseFolder).toBe('/custom-cache')
    expect(errorMock).not.toHaveBeenCalled()
  })
})
