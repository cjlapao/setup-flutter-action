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

    if (runOptions.clone) {
      releaseEntity = {
        channel: runOptions.channel,
        version: runOptions.version,
        dart_sdk_arch: runOptions.arch
      }
    } else {
      releaseEntity = await getLatestVersion(
        runOptions.osName,
        runOptions.channel,
        runOptions.arch,
        runOptions.version
      )
    }

    releaseEntity.osName = runOptions.osName
    const cacheFolder = path.join(
      runOptions.cacheBaseFolder,
      getCacheKey(releaseEntity)
    )
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
      flutterDirectory = tc.find(
        'flutter',
        releaseEntity.version,
        releaseEntity.dart_sdk_arch
      )

      if (
        flutterDirectory &&
        fs.existsSync(path.join(flutterDirectory, 'bin', 'flutter'))
      ) {
        core.info(
          `Found Flutter in cache ${flutterDirectory}, skipping installation`
        )
        if (runOptions.clone) {
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
          core.info(`Adding ${flutterDirectory} to git safe directory...`)
          await exec.exec(
            'git',
            ['config', '--global', '--add', 'safe.directory', flutterDirectory],
            options
          )

          if (errorOutput !== '') {
            core.error(errorOutput)
            core.setFailed(errorOutput)
            return
          }
        }

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

      if (fs.existsSync(cacheFolder)) {
        core.info(`Cleaning up ${cacheFolder} `)
        fs.rmSync(cacheFolder, { recursive: true })
      }

      try {
        core.info(`Creating ${cacheFolder}...`)
        fs.mkdirSync(cacheFolder, { recursive: true })
      } catch (error) {
        core.error(`Error creating ${cacheFolder}: ${error} `)
        core.setFailed(`Error creating ${cacheFolder}: ${error} `)
        return
      }

      core.info(
        `Installing Flutter ${runOptions.version} from ${runOptions.channel}...`
      )

      try {
        if (runOptions.clone) {
          await cloneVersion(runOptions)
        } else {
          await downloadVersion(releaseEntity)
          core.info(`Moving ${runOptions.flutterFolder} to ${cacheFolder}...`)

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
        }
      } catch (error) {
        core.error(error)
        core.setFailed(error)
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

      // core.info(`Adding ${cacheFolder} to PATH...`)
      // output = ''
      // errorOutput = ''
      // await exec.exec(
      //   'export',
      //   [`PATH="$PATH":"${path.join(cacheFolder, 'bin')}"`],
      //   options
      // )

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
