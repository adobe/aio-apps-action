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
  commandStr.push("aio app build")
}
else if(command.toLowerCase() === 'deploy') {
  let deployCmd = 'aio app deploy  --no-build'
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
else if(command.toLowerCase() === 'oauth_sts') {
  generateOAuthSTSAuthToken()
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

function generateOAuthSTSAuthToken() {
  //generate oauth sts auth token
  console.log("Trying to generate oauth sts token")
  const scopes = core.getInput('scopes')

  const clientId = core.getInput('clientId')

  const clientSecret = core.getInput('clientSecret')

  const techAccId = core.getInput('technicalAccountId')

  const techAccEmail = core.getInput('technicalAccountEmail')

  const imsOrgId = core.getInput('imsOrgId')

  try {
    const imsContextConfig = {
    client_id: clientId,
    client_secrets: clientSecret.split(','),
    technical_account_email: techAccEmail,
    technical_account_id: techAccId,
    ims_org_id: imsOrgId,
    scopes: scopes.split(',')
    }
    getAuthToken(imsContextConfig)
    .then(res => {
      console.log('Generated oauth sts token successfully')
      setTokenAsEnvVar(res)
    })
    .catch(e => {
      core.setFailed(e.message)
    })
  } catch (e) {
    console.log("Error while generating token")
    console.error(e)
  }
}

function generateAuthToken() {
  //generate jwt auth
  const key = core.getInput('key')

  let scopes = ["ent_adobeio_sdk"]

  // check if custom scopes were configured,
  // must be of format ["ent_adobeio_sdk"]
  const scopesInput = core.getInput('scopes')
  let parsedScopes
  if (scopesInput) {

    // If JSON parsing fails, not valid format
    try {
      parsedScopes = JSON.parse(scopesInput)
    } catch (err) {
      throw new Error('SCOPES environment variable must be an array of strings (e.g. \["ent_adobeio_sdk"\]) to use the auth command')
    }

    // If not an array, not valid format
    if (!Array.isArray(parsedScopes)) {
      throw new Error('SCOPES environment variable must be an array of strings (e.g. \["ent_adobeio_sdk"\]) to use the auth command')
    }
    scopes = parsedScopes
  }

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

  getAuthToken(imsConfig)
  .then(res => {
    console.log('Generated auth token successfully')
    setTokenAsEnvVar(res)
  })
  .catch(e => {
    let errorMsg = e.message
    if(e.error.error === 'invalid_scope') {
      const scopesErrorMsg = `
        Invalid scopes requested during auth command. 
        
        You may need to add the I/O Management API to your credential using either the Developer Console or the aio CLI (e.g. aio app add service).

        Otherwise, if custom scopes were configured using the SCOPES variable, please ensure that the credential has access to the configured scopes by inspecting the credential in the Developer Console.
      `
      errorMsg = scopesErrorMsg
    }
    core.setFailed(errorMsg)
  })
}

function setTokenAsEnvVar(token) {
  //set token to be used by CLI
  core.exportVariable('AIO_IMS_CONTEXTS_CLI_ACCESS__TOKEN_TOKEN', token)
  //mask the env var for logging
  core.setSecret('AIO_IMS_CONTEXTS_CLI_ACCESS__TOKEN_TOKEN')
  const expiry = Date.now() + 30 * 60 * 1000 //30 mins from current time
  core.exportVariable('AIO_IMS_CONTEXTS_CLI_ACCESS__TOKEN_EXPIRY', expiry)
  console.log("Done setting env var")
}

async function getAuthToken(imsConfig) {
  console.log("getting token from ims")
  await context.set('genToken', imsConfig, true)
  const token = await getToken('genToken')
  console.log("got token from ims")
  return token
}
