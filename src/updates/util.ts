export class InstallError extends Error {
	public code: string;
	public metadata: object;

	constructor (
		message: string,
		metadata: object
	) {
		super(message);

		this.code = 'EINSTALLFAILED';
		this.metadata = metadata || {};
	}
}
