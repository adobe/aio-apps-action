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
  setTokenAsEnvVar,
  setS2SCredentialsAsEnvVars
} = require('../src/utils')

// //////////////////////////////////////////

jest.mock('@actions/core', () => ({
  getInput: jest.fn(),
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
    expect(exec.exec).not.toHaveBeenCalledWith(`sudo --preserve-env ${commands[0]}`)
  })

  test('all os', async () => {
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

  describe('all required inputs available', () => {
    test('all', async () => {
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

    test('default scope input', async () => {
      const inputs = {
        ims,
        key: 'key',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        techAccId: 'tech-acct-id',
        imsOrgId: 'ims-org-id'
      }
      const token = 'my-token'
      ims.getToken.mockResolvedValue(token)
      await expect(generateAuthToken(inputs)).resolves.toEqual(token)
      expect(ims.context.set).toHaveBeenCalledWith('genToken', expect.objectContaining({ meta_scopes: ['ent_adobeio_sdk'] }), true)
    })

    test('scope input value is unknown', async () => {
      const inputs = {
        ims,
        key: 'key',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        techAccId: 'tech-acct-id',
        imsOrgId: 'ims-org-id',
        scopes: '["some_unknown_scope"]'
      }

      ims.getToken.mockRejectedValue({
        error: {
          error: 'invalid_scope'
        }
      })
      await expect(generateAuthToken(inputs)).rejects.toThrow('Invalid scopes requested during auth command')
    })

    test('coverage: ims.getToken non invalid-scope error', async () => {
      const inputs = {
        ims,
        key: 'key',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        techAccId: 'tech-acct-id',
        imsOrgId: 'ims-org-id',
        scopes: '["ent_adobeio_sdk"]'
      }

      const errorMessage = 'some IMS error'
      ims.getToken.mockRejectedValue({ message: errorMessage })
      await expect(generateAuthToken(inputs)).rejects.toThrow(errorMessage)
    })
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

  test('scopes is an empty string', async () => {
    const inputs = {
      ims,
      key: 'key',
      clientId: 'client-id',
      clientSecret: 'client-secret',
      techAccId: 'tech-acct-id',
      techAccEmail: 'tech-acct-email',
      imsOrgId: 'ims-org-id',
      scopes: ''
    }
    await expect(generateOAuthSTSAuthToken(inputs)).rejects.toThrow('[generateOAuthSTSAuthToken] Validation errors:')
  })

  test('use default scopes', async () => {
    const inputs = {
      ims,
      key: 'key',
      clientId: 'client-id',
      clientSecret: 'client-secret',
      techAccId: 'tech-acct-id',
      techAccEmail: 'tech-acct-email',
      imsOrgId: 'ims-org-id'
    }
    const token = 'my-token'
    ims.getToken.mockResolvedValue(token)
    await expect(generateOAuthSTSAuthToken(inputs)).resolves.toEqual(token)
    expect(ims.context.set).toHaveBeenCalledWith('genToken', expect.objectContaining({
      scopes: [
        'AdobeID',
        'openid',
        'read_organizations',
        'additional_info.projectedProductContext',
        'additional_info.roles',
        'adobeio_api',
        'read_client_secret',
        'manage_client_secrets'
      ]
    }), true)
  })

  test('invalid scope format', async () => {
    const inputs = {
      ims,
      key: 'key',
      clientId: 'client-id',
      clientSecret: 'client-secret',
      techAccId: 'tech-acct-id',
      techAccEmail: 'tech-acct-email',
      imsOrgId: 'ims-org-id',
      scopes: '[scope1, scope2]'
    }
    await expect(generateOAuthSTSAuthToken(inputs)).rejects.toThrow('[generateOAuthSTSAuthToken] Validation errors:')
  })

  test('invalid scope format, deprecated jwt', async () => {
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
    await expect(generateOAuthSTSAuthToken(inputs)).rejects.toThrow('[generateOAuthSTSAuthToken] Validation errors:')
  })

  test('all required inputs available, no spaces between scopes', async () => {
    const inputs = {
      ims,
      key: 'key',
      clientId: 'client-id',
      clientSecret: 'client-secret',
      techAccId: 'tech-acct-id',
      techAccEmail: 'tech-acct-email',
      imsOrgId: 'ims-org-id',
      scopes: 'scope1,scope2'
    }
    const token = 'my-token'
    ims.getToken.mockResolvedValue(token)
    await expect(generateOAuthSTSAuthToken(inputs)).resolves.toEqual(token)
  })

  test('all required inputs available, additional accepted chars in scopes', async () => {
    const inputs = {
      ims,
      key: 'key',
      clientId: 'client-id',
      clientSecret: 'client-secret',
      techAccId: 'tech-acct-id',
      techAccEmail: 'tech-acct-email',
      imsOrgId: 'ims-org-id',
      scopes: 'scope_1, scope2.projectedContext'
    }
    const token = 'my-token'
    ims.getToken.mockResolvedValue(token)
    await expect(generateOAuthSTSAuthToken(inputs)).resolves.toEqual(token)
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
      scopes: 'scope1, scope2'
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

describe('setS2SCredentialsAsEnvVars', () => {
  const baseParams = {
    clientId: 'client-id',
    clientSecret: 'client-secret',
    imsOrgId: 'org-id'
  }

  const defaultScopes = [
    'AdobeID', 'openid', 'read_organizations',
    'additional_info.projectedProductContext', 'additional_info.roles',
    'adobeio_api', 'read_client_secret', 'manage_client_secrets'
  ]

  test('exports all four IMS_OAUTH_S2S env vars', () => {
    setS2SCredentialsAsEnvVars(core, { ...baseParams, scopes: 'scope1,scope2' })
    expect(core.exportVariable).toHaveBeenCalledWith('IMS_OAUTH_S2S_CLIENT_ID', 'client-id')
    expect(core.exportVariable).toHaveBeenCalledWith('IMS_OAUTH_S2S_CLIENT_SECRET', 'client-secret')
    expect(core.exportVariable).toHaveBeenCalledWith('IMS_OAUTH_S2S_ORG_ID', 'org-id')
    expect(core.exportVariable).toHaveBeenCalledWith('IMS_OAUTH_S2S_SCOPES', JSON.stringify(['scope1', 'scope2']))
  })

  test('masks client secret', () => {
    setS2SCredentialsAsEnvVars(core, { ...baseParams })
    expect(core.setSecret).toHaveBeenCalledWith('IMS_OAUTH_S2S_CLIENT_SECRET')
  })

  test('uses default scopes when scopes not provided', () => {
    setS2SCredentialsAsEnvVars(core, { ...baseParams })
    expect(core.exportVariable).toHaveBeenCalledWith('IMS_OAUTH_S2S_SCOPES', JSON.stringify(defaultScopes))
  })

  test('uses only first secret from comma-separated clientSecret', () => {
    setS2SCredentialsAsEnvVars(core, { ...baseParams, clientSecret: 'secret-one,secret-two' })
    expect(core.exportVariable).toHaveBeenCalledWith('IMS_OAUTH_S2S_CLIENT_SECRET', 'secret-one')
  })

  test('trims whitespace from scopes', () => {
    setS2SCredentialsAsEnvVars(core, { ...baseParams, scopes: 'scope1, scope2' })
    expect(core.exportVariable).toHaveBeenCalledWith('IMS_OAUTH_S2S_SCOPES', JSON.stringify(['scope1', 'scope2']))
  })
})
