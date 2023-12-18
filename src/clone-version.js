const core = require('@actions/core')
const exec = require('@actions/exec')
const path = require('path')
const fs = require('fs')

async function cloneVersion(runOptions) {
  core.info(`Cloning Flutter ${runOptions.version} from ${runOptions.channel}`)
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
  const clonePath = path.join(runOptions.tempFolder, 'flutter')

  if (fs.existsSync(clonePath)) {
    core.info(`Cleaning up ${clonePath}`)
    fs.rmSync(clonePath, { recursive: true })
  }

  let output = ''
  let errorOutput = ''
  await exec.exec(
    `git`,
    ['clone', '-b', runOptions.channel, '--depth', '1', downloadUrl, clonePath],
    options
  )

  if (
    runOptions.version !== 'any' &&
    runOptions.version !== '' &&
    runOptions.version !== 'latest'
  ) {
    output = ''
    errorOutput = ''
    await exec.exec(`git`, ['checkout', runOptions.version], options)
  }

  if (runOptions.version) {
    core.info(
      `Cloned Flutter ${runOptions.version} from ${runOptions.channel} to ${clonePath}`
    )
  } else {
    core.info(`Cloned Flutter from ${runOptions.channel} to ${clonePath}`)
  }

  return clonePath
}

module.exports = {
  cloneVersion
}
