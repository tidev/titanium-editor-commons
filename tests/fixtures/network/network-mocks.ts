import nock from 'nock';
import * as fs from 'fs';
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

// we use nock.reply and fs.readFileSync instead of nock.replyWithFile to ensure that the files are
// read before setting up any fs mocks. If we used nock.replyWitFile we get errors

export function mockSDKRequest (): void {
	nock('https://appc-mobilesdk-server.s3-us-west-2.amazonaws.com')
		.get('/releases.json')
		.reply(200, fs.readFileSync(path.join(__dirname, 'sdk-response.json'), 'utf8'));

}

export function mockNpmRequest (): void {
	nock('https://registry.npmjs.org')
		.get('/appcelerator/latest')
		.reply(200, fs.readFileSync(path.join(__dirname, 'appcelerator-npm-response.json'), 'utf8'))
		.get('/alloy/latest')
		.reply(200, fs.readFileSync(path.join(__dirname, 'alloy-npm-response.json'), 'utf8'))
		.get('/titanium/latest')
		.reply(200, fs.readFileSync(path.join(__dirname, 'titanium-npm-response.json'), 'utf8'));
}

export function mockNodeRequest(): void {
	nock('https://nodejs.org')
		.get('/download/release/index.json')
		.reply(200, fs.readFileSync(path.join(__dirname, 'node-response.json'), 'utf8'))
		.get('/dist/v1.2.3/node-v1.2.3.pkg')
		.reply(200, () => {
			return fs.createReadStream(path.join(__dirname, 'node-installer.pkg'));
		});

}
