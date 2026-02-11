import { Amplify } from 'aws-amplify';

const amplifyConfig = {
	Auth: {
		Cognito: {
			userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
			userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
			region: import.meta.env.VITE_COGNITO_REGION,
			loginWith: {
				email: true,
			},
			signUpVerificationMethod: 'code',
			userAttributes: {
				email: {
					required: true,
				},
			},
			allowGuestAccess: false,
		},
	},
};

Amplify.configure(amplifyConfig);

export default amplifyConfig;
