const core = require('@actions/core')
const path = require('path')
const fs = require('fs')
const { decompressTempFolder } = require('./constants')
const _ = require('lodash')

/**
 * Generates a cache key based on the provided release entity.
 * If no release entity is provided, the cache key is generated based on the current environment variables.
 *
 * @param {Object} releaseEntity - The release entity object.
 * @returns {string} The generated cache key.
 */
function getCacheKey(releaseEntity) {
  const options = getOptions()
  const cacheKey = core.getInput('cache-key')
  if (cacheKey && cacheKey !== '') {
    return cacheKey
  }

  if (!releaseEntity) {
    return `flutter-${options.osName}-${options.arch}`
  }

  const key = `flutter-${releaseEntity.channel}-${releaseEntity.version}-${releaseEntity.dart_sdk_arch}-${releaseEntity.hash}-${releaseEntity.sha256}`
  console.log(key)
  return key
}

/**
 * Cleans up the temporary folder used for decompression.
 */
function clean() {
  const options = getOptions()
  if (fs.existsSync(options.tempFolder)) {
    core.info(`Cleaning up ${options.tempFolder}`)
    fs.rm(options.tempFolder, { recursive: true }, err => {
      if (err) {
        core.warning(`Error cleaning up ${options.tempFolder}: ${err}`)
      }
    })
  }
}

function getOptions() {
  const runOptions = {}

  let arch = core.getInput('architecture')
  let version = core.getInput('flutter-version')
  let channel = core.getInput('channel')

  let osName = process.env['RUNNER_OS']
  if (!osName || osName === '') {
    osName = process.platform
  }
  if (osName === 'darwin') {
    osName = 'macos'
  }

  if (!arch || arch === '') {
    arch = process.env['RUNNER_ARCH']
    if (!arch || arch === '') {
      arch = process.arch
    }

    // linux does not have arm64 builds
    if (osName === 'linux' && arch === 'arm64') {
      arch = 'x64'
      channel = 'master'
    }
  }

  if (
    process.env['FLUTTER_CHANNEL'] !== undefined &&
    process.env['FLUTTER_CHANNEL'] !== ''
  ) {
    channel = process.env['FLUTTER_CHANNEL']
  }

  if (!channel || channel === '') {
    channel = 'stable'
  }

  if (
    process.env['FLUTTER_VERSION'] !== undefined &&
    process.env['FLUTTER_VERSION'] !== ''
  ) {
    version = process.env['FLUTTER_VERSION']
  }

  if (version === 'any' || version === 'latest' || !version) {
    version = process.env['FLUTTER_VERSION']
    version = ''
  }

  // sometimes the x64 architecture is reported as amd64
  if (arch !== undefined && arch !== '') {
    if (arch === 'amd64') {
      arch = 'x64'
    }
  }

  if (!osName) {
    core.error('OS was not detected')
    return
  }
  osName = osName.toLocaleLowerCase()
  if (!channel) {
    core.error('Channel was not defined')
    return
  }
  channel = channel.toLocaleLowerCase()
  if (!arch) {
    core.error('Architecture was not set')
    return
  }
  arch = arch.toLocaleLowerCase()

  if (version || version !== '') {
    version = version.toLocaleLowerCase()
  }

  const baseFolder = process.env['RUNNER_TEMP']
  if (!baseFolder || baseFolder === '') {
    core.error('Could not get temp folder')
    return
  }

  const tempFolder = path.join(baseFolder, decompressTempFolder)
  const flutterFolder = path.join(tempFolder, 'flutter')
  let cacheBaseFolder = core.getInput('cache-path')
  if (!cacheBaseFolder || cacheBaseFolder === '') {
    cacheBaseFolder = process.env['RUNNER_TOOL_CACHE']
  }

  // defining the options object
  runOptions.arch = arch
  runOptions.osName = osName
  runOptions.channel = channel
  runOptions.version = version
  runOptions.baseFolder = process.env['RUNNER_TEMP']
  runOptions.tempFolder = tempFolder
  runOptions.flutterFolder = flutterFolder
  runOptions.cacheBaseFolder = cacheBaseFolder

  return runOptions
}

function matchVersion(version, pattern) {
  const regex = new RegExp(pattern)
  return regex.test(version)
}

function getHighestVersion(versions, pattern) {
  // Replace '*' in the pattern with a regex wildcard
  const regexPattern = pattern.replace(/\*/g, '\\d+')

  // Filter versions that match the pattern
  const matchingVersions = versions.filter(version =>
    matchVersion(version, regexPattern)
  )

  // Sort the matching versions in descending order
  matchingVersions.sort((a, b) =>
    b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' })
  )

  // Return the highest version
  return matchingVersions[0]
}

function matchSimpleVersion(version, pattern) {
  pattern = pattern.toLocaleLowerCase()
  const parts = pattern.split('.')
  for (let i = 0; i < parts.length; i++) {
    parts[i] = _.escapeRegExp(parts[i].toLocaleLowerCase())
    if (parts[i] === '\\*') {
      parts[i] = '\\d+'
    }
    if (parts[i] === 'x') {
      parts[i] = '\\d+'
    }
    if (!isNaN(parts[i])) {
      continue
    }
  }
  let matchPattern = ''
  for (let i = 0; i < parts.length; i++) {
    if (i === 0) {
      matchPattern += '^'
    }
    matchPattern += '('
    matchPattern += parts[i]
    if (i < parts.length - 1) {
      matchPattern += '\\.'
    }
    matchPattern += ')'
  }
  matchPattern += '.*$'
  return matchVersion(version, matchPattern)
}

module.exports = {
  getCacheKey,
  clean,
  getOptions,
  getHighestVersion,
  matchSimpleVersion
}
