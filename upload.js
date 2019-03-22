#!/usr/bin/env node

'use strict'

const exec = require('child_process').execSync
const fs = require('fs')

const config = require('./lib/config')
const info = require('./ci-services')()
const hasLockfileCommit = require('./lib/git-helpers').hasLockfileCommit

const setupGitUser = require('./lib/update-lockfile').setupGitUser

module.exports = function upload () {
  if (!info.branchName) {
    return console.error('No branch details set, so assuming not a Greenkeeper branch')
  }

  // legacy support
  if (config.branchPrefix === 'greenkeeper/' && info.branchName.startsWith('greenkeeper-')) {
    config.branchPrefix = 'greenkeeper-'
  }

  if (!info.branchName.startsWith(config.branchPrefix)) {
    return console.error(`'${info.branchName}' is not a Greenkeeper branch`)
  }

  const isInitial = info.branchName === (config.branchPrefix + 'initial') ||
    info.branchName === (config.branchPrefix + 'update-all')

  if (isInitial) {
    return console.error('Not running on the initial Greenkeeper branch. Will only run on Greenkeeper branches that update a specific dependency')
  }

  if (!info.uploadBuild) {
    console.warn('WARNING: Not an uploadBuild job (either not the first CircleCI job, or isLockfileUpdate returned false). Continuing anyway', {
      CIRCLE_NODE_INDEX: process.env.CIRCLE_NODE_INDEX,
      BUILD_LEADER_ID: process.env.BUILD_LEADER_ID,
    })
  }

  setupGitUser()
  if (hasLockfileCommit(info)) { // Note: this has a side-effect that is required for the exec('git push') below
    console.warn('WARNING: greenkeeper-lockfile already has a commit on this branch, continuing anyway')
  }

  const err = fs.openSync('gk-lockfile-git-push.err', 'w')
  const pushCommand = `git push${process.env.GK_LOCK_COMMIT_AMEND ? ` --force-with-lease=${info.branchName}:origin/${info.branchName}` : ''} gk-origin HEAD:${info.branchName}`
  console.log('About to execute: ', pushCommand)
  exec(pushCommand, {
    stdio: [
      'pipe',
      'pipe',
      err
    ]
  })
}

if (require.main === module) module.exports()
