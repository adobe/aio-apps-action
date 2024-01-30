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

const Ajv = require('ajv')

/**
 * Validates json according to a schema.
 *
 * @private
 * @param {object} schema the AJV schema
 * @param {object} data the json data to test
 * @returns {object} the result
 */
function validate (schema, data) {
  const ajv = new Ajv({ allErrors: true })
  const validate = ajv.compile(schema)
  const valid = validate(data)

  return { valid, errors: validate.errors }
}

/**
 * Run a cli command.
 *
 * @private
 * @param {object} exec the @actions/exec object
 * @param {string} os the operating system string
 * @param {Array<string>} commands the commands to run
 */
async function runCLICommand (exec, os, commands) {
  for (let command of commands) {
    if (os?.startsWith('ubuntu')) {
      command = `sudo --preserve-env ${command}`
    }
    await exec.exec(command)
  }
}

/**
 * Generate an access token via OAuth Server-to-Server.
 *
 * @private
 */
async function generateOAuthSTSAuthToken (params = {}) {
  const {
    ims,
    scopes,
    clientId,
    clientSecret,
    techAccId,
    techAccEmail,
    imsOrgId
  } = params

  const schema = {
    type: 'object',
    properties: {
      scopes: { type: 'string' },
      clientId: { type: 'string' },
      clientSecret: { type: 'string' },
      techAccId: { type: 'string' },
      techAccEmail: { type: 'string' },
      imsOrgId: { type: 'string' }
    },
    required: ['clientId', 'clientSecret', 'techAccId', 'techAccEmail', 'imsOrgId']
  }

  const { valid, errors } = validate(schema, params)
  if (!valid) {
    throw new Error(`[generateOAuthSTSAuthToken] Validation errors: ${JSON.stringify(errors, null, 2)}`)
  }

  const finalScopes = scopes
    ? scopes.split(',')
    : [
        // Scopes granted by I/O Management API
        'AdobeID', 
        'openid', 
        'read_organizations', 
        'additional_info.projectedProductContext', 
        'additional_info.roles', 
        'adobeio_api', 
        'read_client_secret', 
        'manage_client_secrets'
      ]

  // generate oauth sts auth token
  console.log('Trying to generate oauth sts token')

  const imsContextConfig = {
    client_id: clientId,
    client_secrets: clientSecret.split(','),
    technical_account_email: techAccEmail,
    technical_account_id: techAccId,
    ims_org_id: imsOrgId,
    scopes: [
      ...finalScopes
    ]
  }
  return getAuthToken(ims, imsContextConfig)
}

/**
 * Generate an access token via JWT.
 *
 * @private
 */
async function generateAuthToken (params = {}) {
  const {
    ims,
    key,
    clientId,
    clientSecret,
    techAccId,
    imsOrgId,
    scopes
  } = params

  const schema = {
    type: 'object',
    properties: {
      key: { type: 'string' },
      clientId: { type: 'string' },
      clientSecret: { type: 'string' },
      techAccId: { type: 'string' },
      imsOrgId: { type: 'string' },
      scopes: { type: 'string' }
    },
    required: ['key', 'clientId', 'clientSecret', 'techAccId', 'imsOrgId']
  }

  const { valid, errors } = validate(schema, params)
  if (!valid) {
    throw new Error(`[generateAuthToken] Validation errors: ${JSON.stringify(errors, null, 2)}`)
  }

  let finalScopes = ['ent_adobeio_sdk']

  // check if custom scopes were configured,
  // must be of format ["ent_adobeio_sdk"]
  let parsedScopes
  if (scopes) {
    // If JSON parsing fails, not valid format
    try {
      parsedScopes = JSON.parse(scopes)
    } catch (err) {
      throw new Error('SCOPES environment variable must be an array of strings (e.g. ["meta_scope_1"]) to use the auth command')
    }

    // If not an array, not valid format
    if (!Array.isArray(parsedScopes)) {
      throw new Error('SCOPES environment variable must be an array of strings (e.g. ["meta_scope_1"]) to use the auth command')
    }
    finalScopes = parsedScopes
  }

  const imsConfig = {
    client_id: clientId,
    client_secret: clientSecret,
    technical_account_id: techAccId,
    ims_org_id: imsOrgId,
    private_key: key.toString(),
    meta_scopes: [
      ...finalScopes
    ]
  }

  return getAuthToken(ims, imsConfig)
}

/**
 * Get the auth token for the IMS config.
 *
 * @param {object} ims the ims object
 * @param {object} imsConfig the ims config
 * @returns {string} the token
 */
async function getAuthToken (ims, imsConfig) {
  try {
    console.log('getting token from ims')
    await ims.context.set('genToken', imsConfig, true)
    console.log('getting token from ims...')
    const token = await ims.getToken('genToken')
    return token
  } catch (e) {
    let errorMsg = e.message
    if (e.error?.error === 'invalid_scope') {
      const scopesErrorMsg = `
      Invalid scopes requested during auth command.
      You may need to add the I/O Management API to your credential using either the Developer Console or the aio CLI (e.g. aio app add service).
      Otherwise, if custom scopes were configured using the SCOPES variable, please ensure that the credential has access to the configured scopes by inspecting the credential in the Developer Console.
    `
      errorMsg = scopesErrorMsg
    }
    throw new Error(errorMsg)
  }
}

/**
 * Set the token as an env var.
 *
 * @private
 * @param {object} core the @actions/core object
 * @param {string} token the access token
 */
function setTokenAsEnvVar (core, token) {
  // set token to be used by CLI
  core.exportVariable('AIO_IMS_CONTEXTS_CLI_ACCESS__TOKEN_TOKEN', token)
  // mask the env var for logging
  core.setSecret('AIO_IMS_CONTEXTS_CLI_ACCESS__TOKEN_TOKEN')
  const expiry = Date.now() + 30 * 60 * 1000 // 30 mins from current time
  core.exportVariable('AIO_IMS_CONTEXTS_CLI_ACCESS__TOKEN_EXPIRY', expiry)
  console.log('Done setting env var')
}

module.exports = {
  runCLICommand,
  getAuthToken,
  generateAuthToken,
  generateOAuthSTSAuthToken,
  setTokenAsEnvVar
}
