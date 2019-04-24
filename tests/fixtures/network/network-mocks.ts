import nock from 'nock';
import * as path from 'path';

export function mockAppcCoreRequest(version: string) {
	nock('https://registry.platform.axway.com')
		.get('/api/appc/latest')
		.reply(200,{
			"key": "result",
			"request-id": "6c4fb0e4-a84c-4e46-8d21-c4dee184a84d",
			"result": [
				{
					"id": "55d62d2a6c03980c1d58fc47",
					"name": "appc-cli/appcelerator",
					"version": version
				}
			],
			"success": true
		});
}

export function mockSDKRequest(file: string) {
	nock('https://s3-us-west-2.amazonaws.com')
		.get('/appc-mobilesdk-server/releases.json')
		.replyWithFile(200, path.join(__dirname, file));

}

export function mockNpmRequest() {
	nock('https://registry.npmjs.org')
		.get('/appcelerator')
		.replyWithFile(200, path.join(__dirname, 'npm-response.json'));
}
