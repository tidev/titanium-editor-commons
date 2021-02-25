import nock from 'nock';
import * as path from 'path';

export function mockAppcCoreRequest (version: string): void {
	nock('https://registry.platform.axway.com')
		.get('/api/appc/latest')
		.reply(200, {
			key: 'result',
			'request-id': '6c4fb0e4-a84c-4e46-8d21-c4dee184a84d',
			result: [
				{
					id: '55d62d2a6c03980c1d58fc47',
					name: 'appc-cli/appcelerator',
					version
				}
			],
			success: true
		});
}

export function mockSDKRequest (): void {
	nock('https://appc-mobilesdk-server.s3-us-west-2.amazonaws.com')
		.get('/releases.json')
		.replyWithFile(200, path.join(__dirname, 'sdk-response.json'));

}

export function mockNpmRequest (): void {
	nock('https://registry.npmjs.org')
		.get('/appcelerator')
		.replyWithFile(200, path.join(__dirname, 'appcelerator-npm-response.json'))
		.get('/alloy')
		.replyWithFile(200, path.join(__dirname, 'alloy-npm-response.json'))
		.get('/titanium')
		.replyWithFile(200, path.join(__dirname, 'titanium-npm-response.json'));
}

export function mockNodeRequest(): void {
	nock('https://nodejs.org')
		.get('/download/release/index.json')
		.replyWithFile(200, path.join(__dirname, 'node-response.json'));

}
