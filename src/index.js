/*
Copyright 2024 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const core = require('@actions/core')
const exec = require('@actions/exec')
const ims = require('@adobe/aio-lib-ims')
const {
  runCLICommand,
  generateAuthToken,
  generateOAuthSTSAuthToken,
  setTokenAsEnvVar
} = require('./utils')

/**
 * Main function.
 *
 * @private
 */
async function main () {
  // get inputs
  const os = core.getInput('os')
  const command = core.getInput('command')
  const noPublish = core.getInput('noPublish')
  const key = core.getInput('key')
  const scopes = core.getInput('scopes') || undefined
  const clientId = core.getInput('clientId')
  const clientSecret = core.getInput('clientSecret')
  const techAccId = core.getInput('technicalAccountId')
  const techAccEmail = core.getInput('technicalAccountEmail')
  const imsOrgId = core.getInput('imsOrgId')
  const forceDeploy = core.getInput('forceDeploy')

  // check command
  if (!command) {
    throw new Error('No aio command specified')
  }

  switch (command.toLowerCase()) {
    case 'build':
      console.log(`Executing command ${command}!`)
      await runCLICommand(exec, os, [
        'aio app build'
      ])
      break
    case 'deploy':
      {
        let deployCmd = 'aio app deploy --no-build'
        if (noPublish === 'true') {
          deployCmd = `${deployCmd} --no-publish`
        }
        if (forceDeploy === 'true') {
          deployCmd = `${deployCmd} --force-deploy`
        }
        console.log(`Executing command ${command}!`)
        await runCLICommand(exec, os, [
          deployCmd
        ])
      }
      break
    case 'test':
      console.log(`Executing command ${command}!`)
      await runCLICommand(exec, os, [
        'npm install -g jest',
        'jest --passWithNoTests ./test'
      ])
      break
    case 'auth':
      {
        const token = await generateAuthToken({
          ims,
          key,
          clientId,
          clientSecret,
          techAccId,
          imsOrgId,
          scopes
        })
        console.log('Generated auth token successfully')
        setTokenAsEnvVar(core, token)
      }
      break
    case 'oauth_sts':
      {
        const token = await generateOAuthSTSAuthToken({
          ims,
          scopes,
          clientId,
          clientSecret,
          techAccId,
          techAccEmail,
          imsOrgId
        })
        console.log('Generated oauth sts token successfully')
        setTokenAsEnvVar(core, token)
      }
      break
    default:
      throw new Error(`unknown aio command '${command}'`)
  }
}

// Run main ///////////////

module.exports = main()
  .catch((e) => core.setFailed(e.message))
