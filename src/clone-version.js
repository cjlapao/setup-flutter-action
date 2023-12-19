const core = require('@actions/core')
const exec = require('@actions/exec')
const path = require('path')
const fs = require('fs')

async function cloneVersion(runOptions) {
  core.info(
    `Cloning Flutter ${runOptions.version} from ${runOptions.channel} to ${runOptions.cacheFolder}`
  )
  const downloadUrl = 'https://github.com/flutter/flutter.git'
  const options = {}
  options.listeners = {
    stdout: data => {
      output += data.toString()
    },
    stderr: data => {
      errorOutput += data.toString()
    }
  }

  if (fs.existsSync(runOptions.cacheFolder)) {
    core.info(`Cleaning up ${runOptions.cacheFolder}`)
    fs.rmSync(runOptions.cacheFolder, { recursive: true })
  }

  let output = ''
  let errorOutput = ''
  await exec.exec(
    `git`,
    [
      'clone',
      '-b',
      runOptions.channel,
      '--depth',
      '1',
      downloadUrl,
      runOptions.cacheFolder
    ],
    options
  )

  if (
    runOptions.version !== 'any' &&
    runOptions.version !== '' &&
    runOptions.version !== 'latest'
  ) {
    output = ''
    errorOutput = ''
    const checkoutOptions = {}
    checkoutOptions.listeners = {
      stdout: data => {
        output += data.toString()
      },
      stderr: data => {
        errorOutput += data.toString()
      }
    }
    checkoutOptions.cwd = runOptions.cacheFolder
    await exec.exec(`git`, ['checkout', runOptions.version], checkoutOptions)
  }

  if (runOptions.version) {
    core.info(
      `Cloned Flutter ${runOptions.version} from ${runOptions.channel} to ${runOptions.cacheFolder}`
    )
  } else {
    core.info(
      `Cloned Flutter from ${runOptions.channel} to ${runOptions.cacheFolder}`
    )
  }

  output = ''
  errorOutput = ''

  core.info(`Adding ${runOptions.cacheFolder} to git safe directory...`)
  await exec.exec(
    'git',
    ['config', '--global', '--add', 'safe.directory', runOptions.cacheFolder],
    options
  )

  if (errorOutput !== '') {
    core.error(errorOutput)
    core.setFailed(errorOutput)
    return
  }

  return runOptions.cacheFolder
}

module.exports = {
  cloneVersion
}
