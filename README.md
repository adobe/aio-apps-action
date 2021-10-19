[![Build Status](https://travis-ci.com/adobe/aio-apps-action.svg?branch=master)](https://travis-ci.com/adobe/aio-apps-action)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

# aio-apps-action
[Adobe Developer App Builder](https://github.com/AdobeDocs/project-firefly) support for GitHub actions. This action leverages [AIO CLI](https://github.com/adobe/aio-cli) to build, test and deploy App Builder applications.

# Getting Started
This Github action supports following commands
1) `build` - Builds Adobe Firefly App. This is similar to using `aio app build` command using AIO CLI
2) `test` - Test Adobe Firefly App. This is similar to using `aio app test` command using AIO CLI
3) `deploy` - Deploys Adobe Firefly App. This is similar to running `aio app deploy  --skip-build` command using AIO CLI. Deploy Command also supports `--no-publish` flag for `aio app deploy` command to control publishing of Extensions. See usage section for more details.
4) `auth` - Generates IMS Token and adds that to Github Action Enviornment for AIO CLI to use. The token is required to build and deploy Adobe Firefly Extensions.

## Prerequisites for Commands

1) `build`
    * Standalone App
      1) AIO_RUNTIME_NAMESPACE - namespace to be used for the App
    * Extensions
      1) AIO_RUNTIME_NAMESPACE - namespace to be used for the App
      2) AUTH command should have been executed prior to build to make sure required token is available

2) `test` - None
3) `deploy`
    * Standalone App
      1) AIO_RUNTIME_NAMESPACE - namespace to be used for the App
      2) AIO_RUNTIME_AUTH - auth for abobe namespace
    * Extensions
      1) AIO_RUNTIME_NAMESPACE - namespace to be used for the App
      2) AIO_RUNTIME_AUTH - auth for abobe namespace
      3) AIO_PROJECT_ID - Adobe I/O Console project ID
      4) AIO_PROJECT_NAME - Adobe I/O Console project name
      5) AIO_PROJECT_ORG_ID - IMS Org id
      6) AIO_PROJECT_WORKSPACE_ID - Workspace Id
      7) AIO_PROJECT_WORKSPACE_NAME - Workspace name
      8) AIO_PROJECT_WORKSPACE_DETAILS_SERVICES - list of services added to above workspace in following format (ex. '[{"code": "AdobeIOManagementAPISDK", "name": "I/O Management API"}]' )
      9) AUTH command should have been executed prior to build to make sure required token is available in case extensions are to be published. Else use noPublish command flag to disbale app publish

## Command Usage and required params
You can include the action in your workflow as adobe/aio-apps-action@<latest version> Example :

### For Standalone App
```
name: AIO App CI

on:
  release:
    types: [released]
jobs:
  deploy:
    name: Deploy to Prod
    runs-on: ${{ matrix.os }}
    strategy:
      max-parallel: 1
      matrix:
        node-version: ['12']
        os: [ubuntu-latest]
    steps:
      - name: Checkout
        uses: actions/checkout@v2
      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v1
        with:
          node-version: ${{ matrix.node-version }}
      - name: npm install
        run: npm i
      - name: Setup CLI
        uses: adobe/aio-cli-setup-action@1.1.0
        with:
          os: ${{ matrix.os }}
          version: 8.x.x
      - name: Build
        env:
          AIO_RUNTIME_NAMESPACE: ${{ secrets.AIO_RUNTIME_NAMESPACE_PROD }}
        uses: adobe/aio-apps-action@2.0.1
        with:
          os: ${{ matrix.os }}
          command: build
      - name: Deploy
        env:
          AIO_RUNTIME_NAMESPACE: ${{ secrets.AIO_RUNTIME_NAMESPACE_PROD }}
          AIO_RUNTIME_AUTH: ${{ secrets.AIO_RUNTIME_AUTH_PROD }}
        uses: adobe/aio-apps-action@2.0.1
        with:
          os: ${{ matrix.os }}
          command: deploy
```

### For Extensions
    Set noPublish flag for Deploy command to true/false to control publishing of Extensions
```
name: AIO App CI

on:
  release:
    types: [released]
jobs:
  deploy:
    name: Deploy to Prod
    runs-on: ${{ matrix.os }}
    strategy:
      max-parallel: 1
      matrix:
        node-version: ['12']
        os: [ubuntu-latest]
    steps:
      - name: Checkout
        uses: actions/checkout@v2
      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v1
        with:
          node-version: ${{ matrix.node-version }}
      - name: npm install
        run: npm i
      - name: Setup CLI
        uses: adobe/aio-cli-setup-action@1.1.0
        with:
          os: ${{ matrix.os }}
          version: 8.x.x
      - name: Auth
        uses: adobe/aio-apps-action@2.0.1
        with:
          os: ${{ matrix.os }}
          command: auth
          CLIENTID: ${{ secrets.CLIENTID_PROD }}
          CLIENTSECRET: ${{ secrets.CLIENTSECRET_PROD }}
          TECHNICALACCOUNTID: ${{ secrets.TECHNICALACCID_PROD }}
          IMSORGID: ${{ secrets.IMSORGID_PROD }}
          SCOPES: ${{ secrets.SCOPES_PROD }}
          KEY: ${{ secrets.KEY_PROD }}
      - name: Build
        env:
          AIO_RUNTIME_NAMESPACE: ${{ secrets.AIO_RUNTIME_NAMESPACE_PROD }}
        uses: adobe/aio-apps-action@2.0.1
        with:
          os: ${{ matrix.os }}
          command: build
      - name: Deploy
        env:
          AIO_RUNTIME_NAMESPACE: ${{ secrets.AIO_RUNTIME_NAMESPACE_PROD }}
          AIO_RUNTIME_AUTH: ${{ secrets.AIO_RUNTIME_AUTH_PROD }}
          AIO_PROJECT_ID: ${{ secrets.AIO_PROJECT_ID_PROD }}
          AIO_PROJECT_NAME: ${{ secrets.AIO_PROJECT_NAME_PROD }}
          AIO_PROJECT_ORG_ID: ${{ secrets.AIO_PROJECT_ORG_ID_PROD }}
          AIO_PROJECT_WORKSPACE_ID: ${{ secrets.AIO_PROJECT_WORKSPACE_ID_PROD }}
          AIO_PROJECT_WORKSPACE_NAME: ${{ secrets.AIO_PROJECT_WORKSPACE_NAME_PROD }}
          AIO_PROJECT_WORKSPACE_DETAILS_SERVICES: ${{ secrets.AIO_PROJECT_WORKSPACE_DETAILS_SERVICES_PROD }}
        uses: adobe/aio-apps-action@2.0.1
        with:
          os: ${{ matrix.os }}
          command: deploy
          noPublish: false
```

 ## Contributing

Contributions are welcomed! Read the [Contributing Guide](./.github/CONTRIBUTING.md) for more information.

## Licensing

This project is licensed under the Apache V2 License. See [LICENSE](LICENSE) for more information.
