export function configureGoogle(_config: unknown) {}
export async function startGoogle(): Promise<string | null> { throw new Error("Google sign-in is currently available on the website."); }
export async function finishGoogleRedirect(): Promise<string | null> { return null; }
export async function signOutGoogle(): Promise<void> {}

export async function resumeGoogle(): Promise<string | null> { return null; }
