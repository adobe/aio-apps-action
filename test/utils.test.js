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
} = require('../src/utils')

// //////////////////////////////////////////

jest.mock('@actions/core', () => ({
  getInput: jest.fn(),
  // error: jest.fn(),
  // setOutput: jest.fn(),
  // info: jest.fn(),
  setFailed: jest.fn(),
  exportVariable: jest.fn(),
  setSecret: jest.fn()
}))

jest.mock('@actions/exec', () => ({
  exec: jest.fn()
}))

jest.mock('@adobe/aio-lib-ims', () => ({
  context: {
    set: jest.fn()
  },
  getToken: jest.fn()
}))

// //////////////////////////////////////////

beforeEach(() => {
  core.getInput.mockClear()
  // core.error.mockClear()
  // core.setOutput.mockClear()
  // core.info.mockClear()
  core.setFailed.mockClear()
  core.exportVariable.mockClear()
  core.setSecret.mockClear()

  exec.exec.mockClear()

  ims.context.set.mockClear()
  ims.getToken.mockClear()
})

describe('runCLICommand', () => {
  const commands = ['aio app build']

  test('ubuntu os', async () => {
    await runCLICommand(exec, 'ubuntu', commands)
    expect(exec.exec).toHaveBeenCalledWith(`sudo --preserve-env ${commands[0]}`)
  })

  test('any other os', async () => {
    await runCLICommand(exec, 'darwin', commands)
    expect(exec.exec).not.toHaveBeenCalledWith(`sudo --preserve-env ${commands[0]}`)
    expect(exec.exec).toHaveBeenCalledWith(commands[0])
  })
})

describe('generateAuthToken', () => {
  test('no inputs', async () => {
    await expect(generateAuthToken()).rejects.toThrow('[generateAuthToken] Validation errors:')
  })

  test('some required inputs missing', async () => {
    const inputs = {
      ims,
      key: 'key',
      clientId: 'client-id',
      clientSecret: 'client-secret',
      techAccId: 'tech-acct-id'
    }
    await expect(generateAuthToken(inputs)).rejects.toThrow('[generateAuthToken] Validation errors:')
  })

  test('all required inputs available', async () => {
    const inputs = {
      ims,
      key: 'key',
      clientId: 'client-id',
      clientSecret: 'client-secret',
      techAccId: 'tech-acct-id',
      imsOrgId: 'ims-org-id',
      scopes: '["ent_adobeio_sdk"]'
    }
    const token = 'my-token'
    ims.getToken.mockResolvedValue(token)
    await expect(generateAuthToken(inputs)).resolves.toEqual(token)
    expect(ims.context.set).toHaveBeenCalledWith('genToken', expect.objectContaining({ meta_scopes: ['ent_adobeio_sdk'] }), true)
  })

  test('scopes input is not parseable json', async () => {
    const inputs = {
      ims,
      key: 'key',
      clientId: 'client-id',
      clientSecret: 'client-secret',
      techAccId: 'tech-acct-id',
      imsOrgId: 'ims-org-id',
      scopes: '["ent_adobeio_sdk"'
    }

    await expect(generateAuthToken(inputs)).rejects.toThrow('SCOPES environment variable must be an array of strings (e.g. ["meta_scope_1"]) to use the auth command')
  })

  test('scopes input is not an array', async () => {
    const inputs = {
      ims,
      key: 'key',
      clientId: 'client-id',
      clientSecret: 'client-secret',
      techAccId: 'tech-acct-id',
      imsOrgId: 'ims-org-id',
      scopes: '{"foo": "bar"}'
    }

    await expect(generateAuthToken(inputs)).rejects.toThrow('SCOPES environment variable must be an array of strings (e.g. ["meta_scope_1"]) to use the auth command')
  })
})

describe('generateOAuthSTSAuthToken', () => {
  test('no inputs', async () => {
    await expect(generateOAuthSTSAuthToken()).rejects.toThrow('[generateOAuthSTSAuthToken] Validation errors:')
  })

  test('some required inputs missing', async () => {
    const inputs = {
      ims,
      key: 'key',
      clientId: 'client-id',
      clientSecret: 'client-secret',
      techAccId: 'tech-acct-id'
    }
    await expect(generateOAuthSTSAuthToken(inputs)).rejects.toThrow('[generateOAuthSTSAuthToken] Validation errors:')
  })

  test('all required inputs available', async () => {
    const inputs = {
      ims,
      key: 'key',
      clientId: 'client-id',
      clientSecret: 'client-secret',
      techAccId: 'tech-acct-id',
      techAccEmail: 'tech-acct-email',
      imsOrgId: 'ims-org-id',
      scopes: '["ent_adobeio_sdk"]'
    }
    const token = 'my-token'
    ims.getToken.mockResolvedValue(token)
    await expect(generateOAuthSTSAuthToken(inputs)).resolves.toEqual(token)
  })
})

test('setTokenAsEnvVar', () => {
  const token = 'abc-123'

  setTokenAsEnvVar(core, token)
  expect(core.exportVariable).toHaveBeenCalledWith('AIO_IMS_CONTEXTS_CLI_ACCESS__TOKEN_TOKEN', token)
  expect(core.exportVariable).toHaveBeenCalledWith('AIO_IMS_CONTEXTS_CLI_ACCESS__TOKEN_EXPIRY', expect.any(Number))
  expect(core.setSecret).toHaveBeenCalledWith('AIO_IMS_CONTEXTS_CLI_ACCESS__TOKEN_TOKEN')
})
