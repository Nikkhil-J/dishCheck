import 'server-only'

import { getApps, initializeApp, cert, applicationDefault } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

function getServiceAccountCredential() {
  const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    return applicationDefault()
  }

  return cert({
    projectId,
    clientEmail,
    privateKey,
  })
}

function getAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0]
  }

  return initializeApp({
    credential: getServiceAccountCredential(),
  })
}

export const adminAuth = getAuth(getAdminApp())
export const adminDb = getFirestore(getAdminApp())
