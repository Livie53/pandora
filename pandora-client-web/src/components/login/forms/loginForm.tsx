import { IsUsername } from 'pandora-common';
import React, { ReactElement } from 'react';
import { Button } from '../../common/button/button';
import { Form, FormErrorMessage, FormField, FormFieldError, FormLink } from '../../common/form/form';
import { LocationStateMessage } from '../../common/locationStateMessage/locationStateMessage';
import { useAuthToken, useCurrentAccount } from '../../gameContext/directoryConnectorContextProvider';
import { useLoginForm } from './useLoginForm';
import pandoraLogo from '../../../assets/icons/pandora.svg';

export function LoginForm(): ReactElement {
	const auth = useAuthToken();
	const loggedIn = useCurrentAccount() != null;
	const { dirty, errorMessage, errors, onSubmit, register } = useLoginForm();

	if (loggedIn) {
		return <div>Club membership was confirmed</div>;
	} else if (auth && auth.expires >= Date.now()) {
		return (
			<form>
				<div className='input-container'>
					<label htmlFor='login-uname'>Username</label>
					<input autoComplete='username' type='text' id='login-uname' value={ auth.username }
						disabled={ true } />
				</div>
				<div className='message'>
					Awaiting automatic login...
				</div>
			</form>
		);
	}

	return (
		<Form className='LoginForm' dirty={ dirty } onSubmit={ onSubmit }>
			<p>
				<img src={ pandoraLogo } alt='Pandora Logo' width='282em' height='70em' />
			</p>
			<LocationStateMessage />
			<FormField>
				<label htmlFor='login-username'>Username</label>
				<input
					type='text'
					id='login-username'
					autoComplete='username'
					{ ...register('username', {
						required: 'Username is required',
						validate: (username) => IsUsername(username) || 'Invalid username format',
					}) }
				/>
				<FormFieldError error={ errors.username } />
			</FormField>
			<FormField>
				<label htmlFor='login-password'>Password</label>
				<input
					type='password'
					id='login-password'
					autoComplete='current-password'
					{ ...register('password', { required: 'Password is required' }) }
				/>
				<FormFieldError error={ errors.password } />
			</FormField>
			{ errorMessage && <FormErrorMessage>{ errorMessage }</FormErrorMessage> }
			<Button type='submit'>Sign in</Button>
			<FormLink to='/forgot_password'>Forgot your password?</FormLink>
			<FormLink to='/register'>Not a member? <strong>Sign up</strong></FormLink>
		</Form>
	);
}
