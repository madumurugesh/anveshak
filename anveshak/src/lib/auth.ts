import { Amplify } from 'aws-amplify'
import { signIn as amplifySignIn, signOut as amplifySignOut, fetchAuthSession } from 'aws-amplify/auth'
import { DEMO_EMAIL, DEMO_PASSWORD } from './mockData'

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true'

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ?? '',
      userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? '',
    },
  },
})

export const signIn = async (email: string, password: string) => {
  // Always accept demo credentials (works in both mock and real-API modes)
  if (email === process.env.NEXT_PUBLIC_ADMIN_EMAIL && password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
    return { isSignedIn: true }
  }
  if (IS_MOCK) {
    throw new Error('Invalid demo credentials')
  }
  return await amplifySignIn({ username: email, password })
}

export const signOut = async () => {
  if (IS_MOCK) return
  return await amplifySignOut()
}

export const getToken = async (): Promise<string> => {
  if (IS_MOCK) return 'mock-jwt-token'
  const session = await fetchAuthSession()
  return session.tokens?.accessToken?.toString() ?? ''
}
