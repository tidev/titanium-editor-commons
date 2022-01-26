import nock from 'nock';
import * as fs from 'fs';
import * as path from 'path';

// we use nock.reply and fs.readFileSync instead of nock.replyWithFile to ensure that the files are
// read before setting up any fs mocks. If we used nock.replyWitFile we get errors

export function mockNpmRequest (): void {
	nock('https://registry.npmjs.org')
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
