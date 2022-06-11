import { RenderHookResult } from '@testing-library/react';
import { EMPTY, IDirectoryCharacterConnectionInfo } from 'pandora-common';
import {
	RegisterResponse,
	useConnectToCharacter,
	useCreateNewCharacter,
	useDirectoryPasswordReset,
	useDirectoryPasswordResetConfirm,
	useDirectoryRegister,
	useDirectoryResendVerification,
	useLogin,
	useLogout,
} from '../../src/networking/account_manager';
import { MockDirectoryConnector } from '../mocks/networking/mockDirectoryConnector';
import { MockConnectionInfo, MockShardConnector } from '../mocks/networking/mockShardConnector';
import { ProvidersProps, RenderHookWithProviders } from '../testUtils';

describe('Account Manager', () => {
	const setShardConnector = jest.fn();
	let directoryConnector: MockDirectoryConnector;
	let shardConnector: MockShardConnector;

	beforeEach(() => {
		directoryConnector = new MockDirectoryConnector();
		shardConnector = new MockShardConnector();
	});

	describe('useLogin', () => {
		it('should login with the provided username and password', async () => {
			await testLogin('test-user', 'password123');
		});

		it('should login with the provided username, password and verification token', async () => {
			await testLogin('test-user', 'password123', '304222');
		});

		async function testLogin(username: string, password: string, verificationToken?: string): Promise<void> {
			directoryConnector.login.mockResolvedValue('ok');
			const { result } = renderHookWithTestProviders(useLogin);
			expect(directoryConnector.login).not.toHaveBeenCalled();

			const loginResponse = await result.current(username, password, verificationToken);

			expect(directoryConnector.login).toHaveBeenCalledTimes(1);
			expect(directoryConnector.login).toHaveBeenCalledWith(username, password, verificationToken);
			expect(loginResponse).toBe('ok');
		}
	});

	describe('useLogout', () => {
		it('should logout from the directory', () => {
			const { result } = renderHookWithTestProviders(useLogout);
			expect(directoryConnector.logout).not.toHaveBeenCalled();

			result.current();
			expect(directoryConnector.logout).toHaveBeenCalledTimes(1);
		});
	});

	describe('useCreateNewCharacter', () => {
		it('should return false if character creation was not successful', async () => {
			directoryConnector.awaitResponse.mockResolvedValue({ result: 'failed' });
			const { result } = renderHookWithTestProviders(useCreateNewCharacter);
			expect(await result.current()).toBe(false);
		});

		it('should create a new character successfully and connect to the given shard', async () => {
			const connectionInfo = { ...MockConnectionInfo({ id: 'useCreateNewCharacter' }), result: 'ok' };
			directoryConnector.awaitResponse.mockResolvedValue(connectionInfo);
			const { result } = renderHookWithTestProviders(useCreateNewCharacter, { setShardConnector });

			const success = await result.current();
			expect(success).toBe(true);
			expect(directoryConnector.awaitResponse).toHaveBeenCalledTimes(1);
			expect(directoryConnector.awaitResponse).toHaveBeenCalledWith('createCharacter', EMPTY);
			expectNewShardConnection(connectionInfo);
		});
	});

	describe('useConnectToCharacter', () => {
		const characterId = 'c12345';

		it('should return false if the directory was unable to connect to the given character', async () => {
			directoryConnector.awaitResponse.mockResolvedValue({ result: 'failed' });
			const { result } = renderHookWithTestProviders(useConnectToCharacter);
			expect(await result.current(characterId)).toBe(false);
		});

		it('should connect to the given character successfully and connect to the provided shard', async () => {
			const connectionInfo = { ...MockConnectionInfo({ characterId }), result: 'ok' };
			directoryConnector.awaitResponse.mockResolvedValue(connectionInfo);
			const { result } = renderHookWithTestProviders(useConnectToCharacter);

			const success = await result.current(characterId);
			expect(success).toBe(true);
			expect(directoryConnector.awaitResponse).toHaveBeenCalledTimes(1);
			expect(directoryConnector.awaitResponse).toHaveBeenCalledWith('connectCharacter', { id: characterId });
			expectNewShardConnection(connectionInfo);
		});
	});

	describe('useDirectoryRegister', () => {
		const registerResponses: RegisterResponse[] = [
			'ok',
			'usernameTaken',
			'emailTaken',
			'invalidBetaKey',
		];

		it.each(registerResponses)(
			'should make a register request to the directory with the provided username, password and email [%p]',
			async (response) => {
				await testRegister(
					'test-user',
					'123456',
					'TyVsAI5QPt44dp/57gYlN1U0BhgLBVV6B3rLlRoyXNmD2eL8XlC74qTa9AdNaEcI4k7pA7zYbv38ahQkT3aqQQ==',
					'test@test.com',
					response,
				);
			},
		);

		it.each(registerResponses)(
			'should make a register request to the directory with the provided username, password and email [%p]',
			async (response) => {
				await testRegister(
					'test-user',
					'123456789',
					'i67CRYOrMlOjOcZHXI+hJSbNNnboweM2Ku2utFasNC35HRX4bghzXFS1RHR7BMmaX0CrHn7v6gfrAbEHe4vFPw==',
					'test@test.com',
					response,
					'test-beta-key',
				);
			},
		);

		async function testRegister(
			username: string,
			password: string,
			passwordSha512: string,
			email: string,
			expectedResponse: RegisterResponse,
			betaKey?: string,
		): Promise<void> {
			directoryConnector.awaitResponse.mockResolvedValue({ result: expectedResponse });
			const { result } = renderHookWithTestProviders(useDirectoryRegister);

			const response = await result.current(username, password, email, betaKey);
			expect(response).toBe(expectedResponse);
			expect(directoryConnector.awaitResponse).toHaveBeenCalledTimes(1);
			expect(directoryConnector.awaitResponse).toHaveBeenCalledWith('register', {
				username, passwordSha512, email, betaKey,
			});
		}
	});

	describe('useDirectoryResendVerification', () => {
		it('should make a request to the directory to resend a verification email', async () => {
			directoryConnector.awaitResponse.mockResolvedValue({ result: 'maybeSent' });
			const { result } = renderHookWithTestProviders(useDirectoryResendVerification);

			const response = await result.current('test@test.com');
			expect(response).toBe('maybeSent');
			expect(directoryConnector.awaitResponse).toHaveBeenCalledTimes(1);
			expect(directoryConnector.awaitResponse).toHaveBeenCalledWith(
				'resendVerificationEmail',
				{ email: 'test@test.com' },
			);
		});
	});

	describe('useDirectoryPasswordReset', () => {
		it('should make a password reset request to the directory', async () => {
			directoryConnector.awaitResponse.mockResolvedValue({ result: 'maybeSent' });
			const { result } = renderHookWithTestProviders(useDirectoryPasswordReset);

			const response = await result.current('test@test.com');
			expect(response).toBe('maybeSent');
			expect(directoryConnector.awaitResponse).toHaveBeenCalledTimes(1);
			expect(directoryConnector.awaitResponse).toHaveBeenCalledWith(
				'passwordReset',
				{ email: 'test@test.com' },
			);
		});
	});

	describe('useDirectoryPasswordResetConfirm', () => {
		it.each(['ok', 'unknownCredentials'])(
			'should make a password reset confirmation request to the directory',
			async (directoryResponse) => {
				directoryConnector.awaitResponse.mockResolvedValue({ result: directoryResponse });
				const { result } = renderHookWithTestProviders(useDirectoryPasswordResetConfirm);

				const response = await result.current('test-user', '123456', 'qwerty');
				expect(response).toBe(directoryResponse);
				expect(directoryConnector.awaitResponse).toHaveBeenCalledTimes(1);
				expect(directoryConnector.awaitResponse).toHaveBeenCalledWith('passwordResetConfirm', {
					username: 'test-user',
					token: '123456',
					passwordSha512: '3pxNDzPgVbuz9CUcrKZkup3gCVgXvECda7tiSrTHaoUiDf7E7hjtAtJEFm4tdnlgGV17x+Gm6AxkisMHP3iNrA==',
				});
			},
		);
	});

	function renderHookWithTestProviders<Result, Props>(
		hook: (initialProps?: Props) => Result,
		providerPropOverrides?: Partial<Omit<ProvidersProps, 'children'>>,
	): RenderHookResult<Result, Props> {
		const props = { directoryConnector, shardConnector, setShardConnector, ...providerPropOverrides };
		return RenderHookWithProviders(hook, props);
	}

	function expectNewShardConnection(connectionInfo: IDirectoryCharacterConnectionInfo): void {
		expect(directoryConnector.setShardConnectionInfo).toHaveBeenCalledTimes(1);
		expect(directoryConnector.setShardConnectionInfo).toHaveBeenCalledWith(connectionInfo);
		expect(setShardConnector).toHaveBeenCalledTimes(2);
		const setShardConnectorCalls = setShardConnector.mock.calls;
		expect(setShardConnectorCalls).toEqual([[null], [expect.any(MockShardConnector)]]);
		const newShardConnector = (setShardConnectorCalls[1] as [MockShardConnector])[0];
		expect(newShardConnector).not.toBe(shardConnector);
		expect(newShardConnector.connectionInfo.value).toBe(connectionInfo);
		expect(newShardConnector.connect).toHaveBeenCalledTimes(1);
	}
});

