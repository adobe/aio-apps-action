/*
Copyright 2019 Adobe. All rights reserved.
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

const { context, getToken } = require('@adobe/aio-lib-ims')

//get the command from user
const command = core.getInput('command')
if(!command || command === '')
  throw new Error("No aio command specified")

const os = core.getInput('os');

let commandStr = []
if(command.toLowerCase() === 'build') {
  commandStr.push("aio app deploy --skip-deploy")
}
else if(command.toLowerCase() === 'deploy') {
  let deployCmd = 'aio app deploy  --skip-build'
  const noPublish = (core.getInput('noPublish') === 'true')
  if (noPublish) {
    deployCmd = deployCmd + ' --no-publish'
  }
  commandStr.push(deployCmd)
}
else if(command.toLowerCase() === 'test') {
  commandStr.push("npm install -g jest")
  commandStr.push("jest --passWithNoTests ./test")
}
else if(command.toLowerCase() === 'auth') {
  generateAuthToken()
}

try {
  console.log(`Executing command ${command}!`)
  runCLICommand(os, commandStr)
  .then(() => {
    console.log("action completed")
  })
  .catch(e => {
    core.setFailed(e.message);
  })
} catch (error) {
  core.setFailed(error.message);
}

async function runCLICommand(os, commandStr) {
  let cmd
  for(let i = 0; i < commandStr.length; i++) {
    cmd = commandStr[i]
    if(os && os.startsWith("ubuntu"))
      cmd = 'sudo --preserve-env ' + cmd
      await exec.exec(cmd)
  }
}

function generateAuthToken() {
  //generate jwt auth
  const key = core.getInput('key')

  const scopes = core.getInput('scopes')

  const clientId = core.getInput('clientId')

  const clientSecret = core.getInput('clientSecret')

  const techAccId = core.getInput('technicalAccountId')

  const imsOrgId = core.getInput('imsOrgId')

  const imsConfig = {
    client_id : clientId,
    client_secret: clientSecret,
    technical_account_id: techAccId,
    ims_org_id: imsOrgId,
    private_key: key.toString(),
    meta_scopes: [
      scopes
    ]
  }

  getJwtToken(imsConfig)
  .then(res => {
    console.log('Generated auth token successfully')
    //set token to be used by CLI
    core.exportVariable('AIO_IMS_CONTEXTS_CLI_ACCESS__TOKEN', res)
    //mask the env var for logging
    core.setSecret('AIO_IMS_CONTEXTS_CLI_ACCESS__TOKEN')
  })
  .catch(e => {
    core.setFailed(e.message)
  })
}

async function getJwtToken(imsConfig) {
  await context.set('genjwt', imsConfig, true)
  const token = await getToken('genjwt')
  return token
}
