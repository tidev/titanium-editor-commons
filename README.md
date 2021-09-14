# titanium-editor-commons

`titanium-editor-commons` is a commons library for the [Atom](https://github.com/appcelerator/atom-appcelerator-titanium) and [VS Code](https://github.com/appcelerator/vscode-appcelerator-titanium) editor plugins for [Titanium SDK](https://github.com/appcelerator/titanium_mobile). It aims to provide a common layer for the two projects.

It aims to be a library that allows sharing code between the two projects that doesn't require interaction with the editor specifc APIs. Currently it focuses on providing:

* Completions generation and loading
* Environment validation
* Checking for and installing product updates

## Completions

The two editor projects use their own completions format for the intellisense feature, this file gets generated from the `api.jsca` file included in the SDK and the `Alloy/commands/compile/parsers` directory in an alloy installation.

### Generating completions

```js
import { completion } from 'titanium-editor-commons';

// Generate a v3 completions file, overwriting it if it already exists. The active Alloy version is detected
const alloyVersion = await completion.generateAlloyCompletions(true, completion.CompletionsFormat.v3);
console.log(alloyVersion) // The Alloy version the completions were generated for

// Generate a v3 completions file for SDK 10.0.2.GA, do not create one if it already exists
const sdkVersion = await completion.generateSDKCompletions(false, '10.0.2.GA', '/Users/user/Library/Application Support/Titanium/mobilesdk/osx/10.0.2.GA', completion.CompletionsFormat.v3);
console.log(sdkVersion) // The SDK version the completions were generated for
```

### Loading completions

```js
import { completion } from 'titanium-editor-commons';

// Load a v3 completions file
const completions = await completion.loadCompletions('10.0.2.GA', completion.CompletionsFormat.v3)
console.log(completions) // An object with `alloy` and `titanium` keys with their respective completions data. View the `CompletionsData` type for full information
```

## Environment

This validates that an environment has the required tooling to perform Titanium development. It does not detect the platform specific tooling like Android SDKs or Xcode. By default it requires the Appc tooling, but can also detect for the OSS tooling

```js
import { environment } from 'titanium-editor-commons';

// Validate the environment has the required Appc tooling. If Node.js is missing, require a version that matches the 12.x || 14.x range
const details = await environment.validateEnvironment({ nodeJS: '12.x || 14.x'}, true);
console.log(details); // An object with `installed` and `missing` keys
```

## Updates

This checks the current version of tooling and then sees if there is a new version. It also provides a way to install these updates.
You can either check for all updates or import the individual products and check individually.

```js
import { updates } from 'titanium-editor-commons';

// Check for updates in the OSS tooling, and check if there is an Node.js update that matches the 12.x || 14.x range
const newUpdates = await updates.checkAllUpdates({ nodeJS: '12.x || 14.x'}, false);
console.log(newUpdates); // An array of products that require updates, sorted in order of the priority they should be instaleld

const alloyUpdate = await updates.alloy.checkForUpdate();
console.log(alloyUpdate); // An object with the following keys.

/**
 * {String} currentVersion - The installed version
 * {String}latestVersion - The version that will be installed
 * {Function} action - Function to call to install the version
 * {String} productName - The pretty product name
 * {String} releaseNotes - The URL for the release notes
 * {Number} priority - The priority of the update
 * {Boolean} hasUpdate - Whether there is an update or not
 */
```
