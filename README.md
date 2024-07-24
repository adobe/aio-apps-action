[![Build Status](https://travis-ci.com/adobe/aio-apps-action.svg?branch=master)](https://travis-ci.com/adobe/aio-apps-action)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

# aio-apps-action
[Adobe Developer App Builder](https://github.com/AdobeDocs/project-firefly) support for GitHub actions. This action leverages [AIO CLI](https://github.com/adobe/aio-cli) to build, test and deploy App Builder applications.

# Getting Started
This Github action supports following commands
1) [build](https://github.com/adobe/aio-cli-plugin-app#aio-appbuild) - Builds App Builder application. This is similar to using `aio app build` command using AIO CLI
2) [test](https://github.com/adobe/aio-cli-plugin-app#aio-apptest) - Test App Builder application. This is similar to using `aio app test` command using AIO CLI
3) [deploy](https://github.com/adobe/aio-cli-plugin-app#aio-appdeploy) - Deploys App Builder application. This is similar to running `aio app deploy  --skip-build` command using AIO CLI. Deploy Command also supports `--no-publish` and `--force-deploy` flag for `aio app deploy` command to control publishing of Extensions. See usage section for more details.
4) `auth` - (Deprecated) Generates JWT based IMS Token and adds that to Github Action Environment for AIO CLI to use. The token is required to build and deploy App Builder [Extensions](https://www.adobe.io/app-builder/docs/guides/extensions/).
    * JWT credential used in this step must have scopes attached that allow interaction with the Extension Registry API and Developer Console API. This can be achieved by adding the **I/O Management API** to the credential in the Developer Console. The appropriate scopes will then be automatically requested and attached to the token generated during this step.
    - (Optional) If the credential already has scopes attached that allow access to the Extension Registry API and Developer Console API, see the optional **auth** step below for how to configure the custom **SCOPES** variable to request a specific set of scopes.
 
5) `oauth_sts` - Generates OAuth Server-To-Server based IMS Token and adds that to Github Action Environment for AIO CLI to use. The token is required to build and deploy App Builder [Extensions](https://www.adobe.io/app-builder/docs/guides/extensions/).
    * OAuth Credential used in this step must have scopes attached that allow interaction with the Extension Registry API and Developer Console API. This can be achieved by adding the **I/O Management API** to the credential in the Developer Console. The appropriate scopes will then be automatically requested and attached to the token generated during this step.
    - (Optional) If the credential already has scopes attached that allow access to the Extension Registry API and Developer Console API, see the optional **oauth_sts** step below for how to configure the custom **SCOPES** variable to request a specific set of scopes.

## Prerequisites for Commands

1) `build`
    * Standalone App
      1) AIO_RUNTIME_NAMESPACE - namespace to be used for the App
    * [Extensions](https://www.adobe.io/app-builder/docs/guides/extensions/)
      1) AIO_RUNTIME_NAMESPACE - namespace to be used for the App
      2) AUTH command should have been executed prior to build to make sure required token is available

2) `test` - None
3) `deploy`
    * Standalone App
      1) AIO_RUNTIME_NAMESPACE - namespace to be used for the App
      2) AIO_RUNTIME_AUTH - auth for above namespace
    * [Extensions](https://www.adobe.io/app-builder/docs/guides/extensions/)
      1) AIO_RUNTIME_NAMESPACE - namespace to be used for the App
      2) AIO_RUNTIME_AUTH - auth for above namespace
      3) AIO_PROJECT_ID - Adobe I/O Console project ID
      4) AIO_PROJECT_NAME - Adobe I/O Console project name
      5) AIO_PROJECT_ORG_ID - AMS Org id (e.g. '53444')
      6) AIO_PROJECT_WORKSPACE_ID - Workspace Id
      7) AIO_PROJECT_WORKSPACE_NAME - Workspace name
      8) AIO_PROJECT_WORKSPACE_DETAILS_SERVICES - list of services added to above workspace in following format (ex. '[{"code": "AdobeIOManagementAPISDK", "name": "I/O Management API"}]' )
      9) AUTH command should have been executed prior to build to make sure required token is available in case extensions are to be published. Else use noPublish command flag to disbale app publish
4) `auth`
    * Standalone App
      auth command is not required for standalone Apps
    * [Extensions](https://www.adobe.io/app-builder/docs/guides/extensions/)
      1) CLIENTID - Client id for the Adobe I/O console project
      2) CLIENTSECRET - Client secret for the Adobe I/O console project
      3) TECHNICALACCOUNTID - Technical account Id for the Adobe I/O console project
      4) IMSORGID - IMS Org Id
      5) KEY - Private key associated with project
      6) (optional) SCOPES - List of meta scopes to request for JWT token
          - Example: `["meta_scope1", "meta_scope2"]`
5) `oauth_sts`
      1) CLIENTID - Client id of Adobe I/O console project
      2) CLIENTSECRET - Comma separated String of Client secrets of Adobe I/O console project
      3) TECHNICALACCOUNTID - Technical account Id of Adobe I/O console project
      4) TECHNICALACCOUNTEMAIL -  Technical account email of Adobe I/O console project
      5) IMSORGID - IMS Org Id
      6) (optional) SCOPES - comma-separated list of scopes for OAuth Server-To-Server Credentials
          - Example: `AdobeID, openid, read_organizations`

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
        node-version: ['20']
        os: [ubuntu-latest]
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - name: npm install
        run: npm i
      - name: Setup CLI
        uses: adobe/aio-cli-setup-action@1.3.0
        with:
          os: ${{ matrix.os }}
          version: 10.x.x
      - name: Build
        env:
          AIO_RUNTIME_NAMESPACE: ${{ secrets.AIO_RUNTIME_NAMESPACE_PROD }}
        uses: adobe/aio-apps-action@3.3.0
        with:
          os: ${{ matrix.os }}
          command: build
      - name: Deploy
        env:
          AIO_RUNTIME_NAMESPACE: ${{ secrets.AIO_RUNTIME_NAMESPACE_PROD }}
          AIO_RUNTIME_AUTH: ${{ secrets.AIO_RUNTIME_AUTH_PROD }}
        uses: adobe/aio-apps-action@3.3.0
        with:
          os: ${{ matrix.os }}
          command: deploy
```

### For [Extensions](https://www.adobe.io/app-builder/docs/guides/extensions/) - JWT based (Deprecated)
    Set noPublish flag for Deploy command to true/false to control publishing of Extensions. Set forceDeploy flag to true to force deploy the Extension.
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
        node-version: ['20']
        os: [ubuntu-latest]
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - name: npm install
        run: npm i
      - name: Setup CLI
        uses: adobe/aio-cli-setup-action@1.3.0
        with:
          os: ${{ matrix.os }}
          version: 10.x.x
      - name: Auth
        uses: adobe/aio-apps-action@3.3.0
        with:
          os: ${{ matrix.os }}
          command: auth
          CLIENTID: ${{ secrets.CLIENTID_PROD }}
          CLIENTSECRET: ${{ secrets.CLIENTSECRET_PROD }}
          TECHNICALACCOUNTID: ${{ secrets.TECHNICALACCID_PROD }}
          IMSORGID: ${{ secrets.IMSORGID_PROD }}
          KEY: ${{ secrets.KEY_PROD }}
      - name: Build
        env:
          AIO_RUNTIME_NAMESPACE: ${{ secrets.AIO_RUNTIME_NAMESPACE_PROD }}
        uses: adobe/aio-apps-action@3.3.0
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
        uses: adobe/aio-apps-action@3.3.0
        with:
          os: ${{ matrix.os }}
          command: deploy
          noPublish: false
```

### For [Extensions](https://www.adobe.io/app-builder/docs/guides/extensions/) OAuth Server-To-Server based
    Set noPublish flag for Deploy command to true/false to control publishing of Extensions. Set forceDeploy flag to true to force deploy the Extension.
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
        node-version: ['20']
        os: [ubuntu-latest]
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - name: npm install
        run: npm i
      - name: Setup CLI
        uses: adobe/aio-cli-setup-action@1.3.0
        with:
          os: ${{ matrix.os }}
          version: 10.x.x
      - name: Auth
        uses: adobe/aio-apps-action@3.3.0
        with:
          os: ${{ matrix.os }}
          command: oauth_sts
          CLIENTID: ${{ secrets.CLIENTID_PROD }}
          CLIENTSECRET: ${{ secrets.CLIENTSECRET_PROD }}
          TECHNICALACCOUNTID: ${{ secrets.TECHNICALACCID_PROD }}
          TECHNICALACCOUNTEMAIL: ${{ secrets.TECHNICALACCEMAIL_PROD }}
          IMSORGID: ${{ secrets.IMSORGID_PROD }}
          SCOPES: ${{ secrets.SCOPES_PROD }}
      - name: Build
        env:
          AIO_RUNTIME_NAMESPACE: ${{ secrets.AIO_RUNTIME_NAMESPACE_PROD }}
        uses: adobe/aio-apps-action@3.3.0
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
        uses: adobe/aio-apps-action@3.3.0
        with:
          os: ${{ matrix.os }}
          command: deploy
          noPublish: false
```

 ## Contributing

Contributions are welcomed! Read the [Contributing Guide](./.github/CONTRIBUTING.md) for more information.

## Licensing

This project is licensed under the Apache V2 License. See [LICENSE](LICENSE) for more information.
