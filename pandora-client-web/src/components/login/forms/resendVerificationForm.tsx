import { AssertNever, IsEmail } from 'pandora-common';
import React, { ReactElement, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useDirectoryResendVerification } from '../../../networking/account_manager';
import { Button } from '../../common/button/button';
import { Form, FormField, FormFieldCaptcha, FormFieldError, FormLink } from '../../common/form/form';

export interface ResendVerificationFormData {
	email: string;
}

export function ResendVerificationForm(): ReactElement {
	const navigate = useNavigate();
	const resendVerification = useDirectoryResendVerification();
	const [captchaToken, setCaptchaToken] = useState('');
	const [captchaFailed, setCaptchaFailed] = useState(false);

	const {
		formState: { errors, submitCount, isSubmitting },
		handleSubmit,
		register,
	} = useForm<ResendVerificationFormData>({ shouldUseNativeValidation: true, progressive: true });

	const onSubmit = handleSubmit(async ({ email }) => {
		setCaptchaFailed(false);

		const result = await resendVerification(email, captchaToken);

		if (result === 'maybeSent') {
			navigate('/login', {
				state: {
					message: 'An email with a verification code has been sent to the submitted email address, if there is an account registered using it.',
				},
			});
			return;
		} else if (result === 'invalidCaptcha') {
			setCaptchaFailed(true);
		} else {
			AssertNever(result);
		}
	});

	return (
		<Form className='ForgotPasswordForm' dirty={ submitCount > 0 } onSubmit={ onSubmit }>
			<h1>Resend email</h1>
			<FormField>
				<label htmlFor='forgot-password-email'>Enter your email</label>
				<input
					type='email'
					id='forgot-password-email'
					autoComplete='email'
					{ ...register('email', {
						required: 'Email is required',
						validate: (email) => IsEmail(email) || 'Invalid email format',
					}) }
				/>
				<FormFieldError error={ errors.email } />
			</FormField>
			<FormFieldCaptcha setCaptchaToken={ setCaptchaToken } invalidCaptcha={ captchaFailed } />
			<Button type='submit' className='fadeDisabled' disabled={ isSubmitting }>Resend verification email</Button>
			<FormLink to='/override_verification'>Advanced form with feedback</FormLink>
			<FormLink to='/login'>◄ Return to login</FormLink>
		</Form>
	);
}
