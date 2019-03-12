#!/usr/bin/env node

'use strict'

const process = require('process')
const exec = require('child_process').execSync


const config = require('./lib/config')
const hasLockfileCommit = require('./lib/git-helpers').hasLockfileCommit

const lockfile = require('./lib/update-lockfile')
const setupGitUser = lockfile.setupGitUser
const stageLockfile = lockfile.stageLockfile
const commitLockfiles = lockfile.commitLockfiles


const ci = require('./ci-services')

module.exports = function update () {
  const info = ci()

  // legacy support
  if (config.branchPrefix === 'greenkeeper/' && info.branchName.startsWith('greenkeeper-')) {
    config.branchPrefix = 'greenkeeper-'
  }

  if (!info.branchName) {
    return console.error('No branch details set, so assuming not a Greenkeeper branch')
  }

  if (!info.branchName.startsWith(config.branchPrefix)) {
    return console.error(`'${info.branchName}' is not a Greenkeeper branch`)
  }

  if (info.branchName === `${config.branchPrefix}initial`) {
    // This should be possible to do, Contributions are welcome!
    return console.error(`'${info.branchName}' is the initial Greenkeeper branch, please update the lockfile manualy`)
  }

  if (!info.correctBuild) {
    console.warn('WARNING: This build should not update the lockfile. It could be a PR, not a branch build. Continuing anyway.', {
      CI_PULL_REQUEST: process.env.CI_PULL_REQUEST,
      CIRCLE_PREVIOUS_BUILD_NUM: process.env.CIRCLE_PREVIOUS_BUILD_NUM,
    })
  }

  if (hasLockfileCommit(info)) { // Note this performs side effects and is needed even if we discard the result
    // In the workspaces case, this is not fatal.
    console.warn('WARNING: greenkeeper-lockfile already has a commit on this branch, continuing anyway')
  }

  // make sure that we have a clean working tree
  setupGitUser()
  exec('git stash')
  exec('yarn install')
  stageLockfile({
    ignoreOutput: false
  })
  commitLockfiles()

  if (process.env.NODE_ENV && process.env.NODE_ENV !== 'test') {
    console.log('Lockfiles updated')
  }
}
if (require.main === module) module.exports()
