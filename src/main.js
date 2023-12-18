/**
 * @fileoverview This file contains the main logic for the setup-flutter action.
 * It exports the `run` and `getLatestVersion` functions.
 * The `run` function is the entry point of the action and handles the main workflow.
 * The `getLatestVersion` function retrieves the latest version of Flutter based on the specified channel, architecture, and version.
 */

const fs = require('fs')
const core = require('@actions/core')
const path = require('path')
const { getLatestVersion } = require('./get-latest-version')
const exec = require('@actions/exec')
const { clean, getCacheKey, getOptions } = require('./helpers')
const { downloadVersion } = require('./download-version')
const tc = require('@actions/tool-cache')
const { cloneVersion } = require('./clone-version')

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
async function run() {
  core.info('Setting up Flutter...')
  try {
    const runOptions = getOptions()
    let releaseEntity = undefined
    if (!runOptions || runOptions === undefined) {
      core.setFailed('Invalid options')
      return
    }

    if (runOptions.channel !== 'main' && runOptions.channel !== 'master') {
      releaseEntity = await getLatestVersion(
        runOptions.osName,
        runOptions.channel,
        runOptions.arch,
        runOptions.version
      )
    }

    const cacheFolder = path.join(
      runOptions.cacheBaseFolder,
      getCacheKey(releaseEntity)
    )
    console.log(cacheFolder)
    runOptions.cacheFolder = cacheFolder

    if (
      core.getInput('query-only') !== '' &&
      core.getBooleanInput('query-only')
    ) {
      core.setOutput('channel', releaseEntity.channel)
      core.setOutput('version', releaseEntity.version)
      core.setOutput('architecture', releaseEntity.dart_sdk_arch)
      core.setOutput('cache-path', cacheFolder)
      core.setOutput('cache-key', getCacheKey(releaseEntity))
    } else {
      let flutterDirectory = ''
      if (releaseEntity !== undefined) {
        flutterDirectory = tc.find(
          'flutter',
          releaseEntity.version,
          releaseEntity.dart_sdk_arch
        )
      } else {
        flutterDirectory = tc.find(
          'flutter',
          runOptions.osName,
          runOptions.arch
        )
      }

      if (
        flutterDirectory &&
        fs.existsSync(path.join(flutterDirectory, 'bin', 'flutter'))
      ) {
        core.info(
          `Found Flutter in cache ${flutterDirectory}, skipping installation`
        )
        core.setOutput('used-cached', 'true')
        core.addPath(path.join(flutterDirectory, 'bin'))
        core.exportVariable('FLUTTER_HOME', flutterDirectory)
        core.exportVariable(
          'PUB_CACHE',
          path.join(flutterDirectory, '.pub-cache')
        )
        core.addPath(path.join(flutterDirectory, 'bin'))
        core.addPath(
          path.join(flutterDirectory, 'bin', 'cache', 'dart-sdk', 'bin')
        )
        core.addPath(path.join(flutterDirectory, '.pub-cache', 'bin'))

        core.setOutput('channel', releaseEntity.channel)
        core.setOutput('version', releaseEntity.version)
        core.setOutput('architecture', releaseEntity.dart_sdk_arch)
        core.setOutput('cache-path', cacheFolder)
        core.setOutput('cache-key', getCacheKey(releaseEntity))
        return
      }

      try {
        if (runOptions.channel === 'main' || runOptions.channel === 'master') {
          await cloneVersion(runOptions)
        } else {
          await downloadVersion(releaseEntity)
        }
      } catch (error) {
        core.setFailed(error)
        return
      }

      if (releaseEntity === undefined) {
        releaseEntity = {
          channel: runOptions.channel,
          version: runOptions.version,
          dart_sdk_arch: runOptions.arch
        }

        if (runOptions.version) {
          core.info(
            `Installing Flutter ${runOptions.version} from ${runOptions.channel}...`
          )
        } else {
          core.info(`Installing Flutter from ${runOptions.channel}...`)
        }
      } else {
        core.info(`Installing Flutter ${releaseEntity.version}...`)
      }

      if (fs.existsSync(cacheFolder)) {
        core.info(`Cleaning up ${cacheFolder} `)
        fs.rmSync(cacheFolder, { recursive: true })
      }

      fs.mkdirSync(cacheFolder, { recursive: true })
      try {
        fs.renameSync(runOptions.flutterFolder, cacheFolder)
      } catch (error) {
        core.error(
          `Error moving ${runOptions.flutterFolder} to ${cacheFolder}: ${error} `
        )
        core.setFailed(
          `Error moving ${runOptions.flutterFolder} to ${cacheFolder}: ${error} `
        )
        return
      }

      let output = ''
      let errorOutput = ''

      const options = {}
      options.listeners = {
        stdout: data => {
          output += data.toString()
        },
        stderr: data => {
          errorOutput += data.toString()
        }
      }
      output = ''
      errorOutput = ''
      await exec.exec(
        `"${path.join(cacheFolder, 'bin', 'flutter')}"`,
        ['precache'],
        options
      )

      output = ''
      errorOutput = ''
      core.setOutput('doctor-output', output)
      await exec.exec(
        `"${path.join(cacheFolder, 'bin', 'flutter')}"`,
        ['doctor', '-v'],
        options
      )
      core.setOutput('doctor-output', output)

      output = ''
      errorOutput = ''
      await exec.exec(
        `"${path.join(cacheFolder, 'bin', 'flutter')}"`,
        ['--version'],
        options
      )
      core.setOutput('version-output', output)
      core.setOutput('precache-output', output)

      core.exportVariable('FLUTTER_HOME', path.join(cacheFolder))
      core.exportVariable('PUB_CACHE', path.join(cacheFolder, '.pub-cache'))
      core.addPath(path.join(cacheFolder, 'bin'))
      core.addPath(path.join(cacheFolder, 'bin', 'cache', 'dart-sdk', 'bin'))
      core.addPath(path.join(cacheFolder, '.pub-cache', 'bin'))

      core.setOutput('channel', releaseEntity.channel)
      core.setOutput('version', releaseEntity.version)
      core.setOutput('architecture', releaseEntity.dart_sdk_arch)
      core.setOutput('cache-path', cacheFolder)
      core.setOutput('cache-key', getCacheKey(releaseEntity))
      clean()

      if (core.getInput('cache') !== '' && core.getBooleanInput('cache')) {
        core.info(`Caching ${cacheFolder}...`)
        const cachePath = await tc.cacheDir(
          cacheFolder,
          'flutter',
          releaseEntity.version,
          releaseEntity.dart_sdk_arch
        )
        core.info(`Cache ID: ${cachePath} `)
        core.addPath(cachePath)
      }
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    core.setFailed(error.message)
  }
}

module.exports = {
  run
}
