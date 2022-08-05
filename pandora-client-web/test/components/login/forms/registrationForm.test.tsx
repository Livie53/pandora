import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserEvent } from '@testing-library/user-event/dist/types/setup';
import React from 'react';
import { RegistrationForm } from '../../../../src/components/login/forms/registrationForm';
import { RenderWithRouter } from '../../../testUtils';
import { ExpectFieldToBeInvalid, TestFieldIsRendered, TestSubmitButtonIsRendered } from '../../../formTestUtils';
import { INVALID_EMAILS, INVALID_USERNAMES } from '../loginTestData';

describe('Registration Form', () => {
	const defaultUsername = 'test-user';
	const defaultEmail = 'test-user@domain.com';
	const defaultPassword = 'password123';

	let user: UserEvent;
	let pathname: string;

	beforeEach(() => {
		user = userEvent.setup();
		RenderWithRouter(<RegistrationForm />, {
			initialEntries: ['/register'],
			onPathnameUpdate: (newPathname) => {
				pathname = newPathname;
			},
		});
	});

	TestFieldIsRendered('username', 'Username', 'text', 'username');
	TestFieldIsRendered('email', 'Email', 'email', 'email');
	TestFieldIsRendered('password', 'Password', 'password', 'new-password');
	TestFieldIsRendered('password confirmation', 'Confirm password', 'password', 'new-password');
	TestSubmitButtonIsRendered();

	it('should not permit an empty username to be submitted', async () => {
		// TODO: Expand this to actually check that a WS message hasn't been sent
		expect(screen.queryByText('Username is required')).not.toBeInTheDocument();

		await user.type(screen.getByLabelText('Email'), defaultEmail);
		await user.type(screen.getByLabelText('Password'), defaultPassword);
		await user.type(screen.getByLabelText('Confirm password'), defaultPassword);
		await user.click(screen.getByRole('button'));

		await ExpectFieldToBeInvalid('Username', 'Username is required');
	});

	it('should not permit an empty email to be submitted', async () => {
		// TODO: Expand this to actually check that a WS message hasn't been sent
		expect(screen.queryByText('Email is required')).not.toBeInTheDocument();

		await user.type(screen.getByLabelText('Username'), defaultUsername);
		await user.type(screen.getByLabelText('Password'), defaultPassword);
		await user.type(screen.getByLabelText('Confirm password'), defaultPassword);
		await user.click(screen.getByRole('button'));

		await ExpectFieldToBeInvalid('Email', 'Email is required');
	});

	it('should not permit an empty password to be submitted', async () => {
		// TODO: Expand this to actually check that a WS message hasn't been sent
		expect(screen.queryByText('Password is required')).not.toBeInTheDocument();

		await user.type(screen.getByLabelText('Username'), defaultUsername);
		await user.type(screen.getByLabelText('Email'), defaultEmail);
		await user.type(screen.getByLabelText('Confirm password'), defaultPassword);
		await user.click(screen.getByRole('button'));

		await ExpectFieldToBeInvalid('Password', 'Password is required');
	});

	it('should not permit an empty confirmation password to be submitted', async () => {
		// TODO: Expand this to actually check that a WS message hasn't been sent
		expect(screen.queryByText('Please confirm your password')).not.toBeInTheDocument();

		await user.type(screen.getByLabelText('Username'), defaultUsername);
		await user.type(screen.getByLabelText('Email'), defaultEmail);
		await user.type(screen.getByLabelText('Password'), defaultPassword);
		await user.click(screen.getByRole('button'));

		await ExpectFieldToBeInvalid('Confirm password', 'Please confirm your password');
	});

	it.each(INVALID_USERNAMES)('should not permit the invalid username %p to be submitted', async (invalidUsername) => {
		// TODO: Expand this to actually check that a WS message hasn't been sent
		expect(screen.queryByText('Invalid username format')).not.toBeInTheDocument();

		await fillInAndSubmitForm(invalidUsername, defaultEmail, defaultPassword, defaultPassword);

		await ExpectFieldToBeInvalid('Username', 'Invalid username format');
	});

	it.each(INVALID_EMAILS)('should not permit the invalid email %p to be submitted', async (invalidEmail) => {
		// TODO: Expand this to actually check that a WS message hasn't been sent
		expect(screen.queryByText('Invalid email format')).not.toBeInTheDocument();

		await fillInAndSubmitForm(defaultUsername, invalidEmail, defaultPassword, defaultPassword);

		await ExpectFieldToBeInvalid('Email', 'Invalid email format');
	});

	it.each([
		'notTheSamePassword',
		`${ defaultPassword }1`,
		defaultPassword.slice(0, -1),
		defaultPassword.slice(1),
	])(
		'should not permit the non-matching password confirmation %p to be submitted',
		async (invalidPasswordConfirm) => {
			// TODO: Expand this to actually check that a WS message hasn't been sent
			expect(screen.queryByText('Passwords do not match')).not.toBeInTheDocument();

			await fillInAndSubmitForm(defaultUsername, defaultEmail, defaultPassword, invalidPasswordConfirm);

			await ExpectFieldToBeInvalid('Confirm password', 'Passwords do not match');
		},
	);

	// TODO: Add a test for end-to-end form submission once we have a decent framework for mocking socket stuff

	it('should provide a link to the login form', async () => {
		await verifyPathname('/register');
		const link = screen.getByRole('link', { name: 'Already have an account? Sign in' });
		expect(link).toBeVisible();

		await user.click(link);

		await verifyPathname('/login');
	});

	async function fillInAndSubmitForm(
		username: string,
		email: string,
		password: string,
		passwordConfirm: string,
	): Promise<void> {
		await user.type(screen.getByLabelText('Username'), username);
		await user.type(screen.getByLabelText('Email'), email);
		await user.type(screen.getByLabelText('Password'), password);
		await user.type(screen.getByLabelText('Confirm password'), passwordConfirm);
		await user.click(screen.getByRole('button'));
	}

	async function verifyPathname(expectedPath: string): Promise<void> {
		await waitFor(() => {
			expect(pathname).toBe(expectedPath);
		});
	}
});

