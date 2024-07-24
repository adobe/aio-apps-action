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
const { runCLICommand, generateAuthToken, generateOAuthSTSAuthToken, setTokenAsEnvVar } = require('../src/utils')

// //////////////////////////////////////////

jest.mock('@actions/core', () => ({
  getInput: jest.fn(),
  setFailed: jest.fn()
}))

jest.mock('../src/utils', () => ({
  runCLICommand: jest.fn(),
  generateAuthToken: jest.fn(),
  generateOAuthSTSAuthToken: jest.fn(),
  setTokenAsEnvVar: jest.fn()
}))

// //////////////////////////////////////////

beforeEach(() => {
  core.getInput.mockClear()
  core.setFailed.mockClear()

  runCLICommand.mockClear()
  generateAuthToken.mockClear()
  generateOAuthSTSAuthToken.mockClear()
  setTokenAsEnvVar.mockClear()
})

test('no inputs', async () => {
  const actionValues = {} // no inputs
  core.getInput.mockImplementation((key) => {
    return actionValues[key]
  })

  jest.isolateModules(async () => {
    await require('../src/index') // run the action
    return expect(core.setFailed).toHaveBeenCalledWith('No aio command specified')
  })
})

test('unknown command', async () => {
  const actionValues = {
    command: 'some_unknown_command'
  }
  core.getInput.mockImplementation((key) => {
    return actionValues[key]
  })

  jest.isolateModules(async () => {
    await require('../src/index') // run the action
    expect(core.setFailed).toHaveBeenCalledWith(`unknown aio command '${actionValues.command}'`)
  })
})

test('build command', async () => {
  const actionValues = {
    command: 'build'
  }
  core.getInput.mockImplementation((key) => {
    return actionValues[key]
  })

  jest.isolateModules(async () => {
    await require('../src/index') // run the action
    expect(core.setFailed).not.toHaveBeenCalled()
    expect(runCLICommand).toHaveBeenCalledWith(expect.any(Object), actionValues.os, ['aio app build'])
  })
})

describe('deploy command', () => {
  test('noPublish not set', async () => {
    const actionValues = {
      command: 'deploy'
    }
    core.getInput.mockImplementation((key) => {
      return actionValues[key]
    })

    jest.isolateModules(async () => {
      await require('../src/index') // run the action
      expect(core.setFailed).not.toHaveBeenCalled()
      expect(runCLICommand).toHaveBeenCalledWith(expect.any(Object), actionValues.os, ['aio app deploy --no-build'])
      expect(runCLICommand).not.toHaveBeenCalledWith(expect.any(Object), actionValues.os, ['aio app deploy --no-build --no-publish'])
    })
  })

  test('noPublish is true', async () => {
    const actionValues = {
      command: 'deploy',
      noPublish: 'true'
    }
    core.getInput.mockImplementation((key) => {
      return actionValues[key]
    })

    jest.isolateModules(async () => {
      await require('../src/index') // run the action
      expect(core.setFailed).not.toHaveBeenCalled()
      expect(runCLICommand).toHaveBeenCalledWith(expect.any(Object), actionValues.os, ['aio app deploy --no-build --no-publish'])
    })
  })

  test('noPublish and forceDeploy is true', async () => {
    const actionValues = {
      command: 'deploy',
      noPublish: 'true',
      forceDeploy: 'true'
    }
    core.getInput.mockImplementation((key) => {
      return actionValues[key]
    })

    jest.isolateModules(async () => {
      await require('../src/index') // run the action
      expect(core.setFailed).not.toHaveBeenCalled()
      expect(runCLICommand).toHaveBeenCalledWith(expect.any(Object), actionValues.os, ['aio app deploy --no-build --no-publish --force-deploy'])
    })
  })
})

// eslint-disable-next-line jest/valid-title
test('test command', async () => {
  const actionValues = {
    command: 'test'
  }
  core.getInput.mockImplementation((key) => {
    return actionValues[key]
  })

  jest.isolateModules(async () => {
    await require('../src/index') // run the action
    expect(core.setFailed).not.toHaveBeenCalled()
    expect(runCLICommand).toHaveBeenCalledWith(expect.any(Object), actionValues.os, [
      'npm install -g jest',
      'jest --passWithNoTests ./test'
    ])
  })
})

test('auth command', async () => {
  const token = 'abc-123-xyz'
  const actionValues = {
    command: 'auth'
  }
  core.getInput.mockImplementation((key) => {
    return actionValues[key]
  })
  generateAuthToken.mockResolvedValue(token)

  jest.isolateModules(async () => {
    await require('../src/index') // run the action
    expect(core.setFailed).not.toHaveBeenCalled()
    expect(runCLICommand).not.toHaveBeenCalled()
    expect(setTokenAsEnvVar).toHaveBeenCalledWith(expect.any(Object), token)
  })
})

test('oauth_sts command', async () => {
  const token = 'sts-abc-123-xyz'
  const actionValues = {
    command: 'oauth_sts'
  }
  core.getInput.mockImplementation((key) => {
    return actionValues[key]
  })
  generateOAuthSTSAuthToken.mockResolvedValue(token)

  jest.isolateModules(async () => {
    await require('../src/index') // run the action
    expect(core.setFailed).not.toHaveBeenCalled()
    expect(runCLICommand).not.toHaveBeenCalled()
    expect(setTokenAsEnvVar).toHaveBeenCalledWith(expect.any(Object), token)
  })
})
