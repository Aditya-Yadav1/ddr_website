import { getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { getAuth, GoogleAuthProvider, getRedirectResult, signInWithPopup, signInWithRedirect, signOut } from "firebase/auth";

let options: FirebaseOptions | null = null;
function auth() {
  if (!options) throw new Error("Google sign-in is not configured.");
  const app = getApps().find((item) => item.name === "handyhive-auth") || initializeApp(options, "handyhive-auth");
  return getAuth(app);
}
export function configureGoogle(config: FirebaseOptions | null) { options = config; }
export async function startGoogle() {
  const client = auth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try { return await (await signInWithPopup(client, provider)).user.getIdToken(true); }
  catch (error) {
    if ((error as { code?: string }).code === "auth/popup-blocked") {
      await signInWithRedirect(client, provider);
      return null;
    }
    throw error;
  }
}
export async function finishGoogleRedirect() {
  const result = await getRedirectResult(auth());
  return result ? result.user.getIdToken(true) : null;
}
export async function signOutGoogle() {
  if (options) await signOut(auth());
}

export async function resumeGoogle() {
  if (!options) return null;
  const client = auth();
  await client.authStateReady();
  return client.currentUser ? client.currentUser.getIdToken() : null;
}
