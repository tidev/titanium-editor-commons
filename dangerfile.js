/* global process, fail */

const tslint = require('@awam/danger-plugin-tslint').default;
const junit = require('@seadub/danger-plugin-junit').default;
const dependencies = require('@seadub/danger-plugin-dependencies').default;

async function main() {
	await Promise.all([
		tslint(),
		junit({ pathToReport: './junit-report.xml' }),
		dependencies({ type: 'npm' })
	]);
}
main()
	.then(() => process.exit(0))
	.catch(err => {
		fail(err.toString());
		process.exit(1);
	});
