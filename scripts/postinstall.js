/* Scripts are run in Node, so don't make use of the logger or ES imports */
/* eslint-disable no-console, @typescript-eslint/no-var-requires*/
const { constants } = require('fs');
const { copyFile } = require('fs/promises');
const { resolve } = require('path');

postinstall();

async function postinstall() {
	await copyDotenv();
}

async function copyDotenv() {
	try {
		await copyFile(
			resolve(__dirname, '..', '.env.template'),
			resolve(__dirname, '..', '.env'),
			constants.COPYFILE_EXCL,
		);
		console.log('No .env file found - template copied');
	} catch (error) {
		if (error.code !== 'EEXIST') {
			throw error;
		}
	}
}
