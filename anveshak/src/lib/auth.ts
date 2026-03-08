import { Amplify } from 'aws-amplify'
import { signIn as amplifySignIn, signOut as amplifySignOut, fetchAuthSession } from 'aws-amplify/auth'
import { DEMO_EMAIL, DEMO_PASSWORD } from './mockData'

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true'

// Only configure Amplify when real Cognito pool IDs are present
const COGNITO_POOL_ID = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ?? ''
const COGNITO_CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? ''
const COGNITO_ENABLED = COGNITO_POOL_ID.includes('_') && COGNITO_CLIENT_ID.length > 10

if (COGNITO_ENABLED) {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: COGNITO_POOL_ID,
        userPoolClientId: COGNITO_CLIENT_ID,
      },
    },
  })
}

export { COGNITO_ENABLED }

export const signIn = async (email: string, password: string) => {
  // Always accept demo credentials (works in both mock and real-API modes)
  if (email === process.env.NEXT_PUBLIC_ADMIN_EMAIL && password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
    return { isSignedIn: true }
  }
  if (IS_MOCK || !COGNITO_ENABLED) {
    throw new Error('Invalid credentials')
  }
  return await amplifySignIn({ username: email, password })
}

export const signOut = async () => {
  if (IS_MOCK || !COGNITO_ENABLED) return
  return await amplifySignOut()
}

export const getToken = async (): Promise<string> => {
  if (IS_MOCK || !COGNITO_ENABLED) return 'mock-jwt-token'
  try {
    const session = await fetchAuthSession()
    return session.tokens?.accessToken?.toString() ?? ''
  } catch {
    return ''
  }
}
