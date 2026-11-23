import workers from "./shared/demo-workers.js";
import postal from "./shared/pin-codes.js";

const port = Number(process.env.HANDYHIVE_PORT || 4174);
const base = (process.env.HANDYHIVE_PUBLIC_ORIGIN || "http://127.0.0.1:" + port) + "/api/v1/";
const password = "HandyHive-local-demo";
const mode = await fetch(base + "config").then((response) => response.json());
if (mode.phoneMode !== "preview") throw new Error("Demo accounts may only be seeded in preview mode.");

async function post(action, body, token) {
  const response = await fetch(base + action, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  const result = await response.json();
  return { response, result };
}

async function account(handle, profile) {
  let { response, result } = await post("register", { handle, password });
  if (response.status === 409) ({ response, result } = await post("login", { handle, password }));
  if (!response.ok) throw new Error(result.error || "Could not sign in to the local API.");
  const { token } = result.session;
  try {
    if (profile && !result.state.profile) {
      const saved = await post("profile", { languages: ["Hindi", "English"], ...profile, pinCodes: postal.demoPinCodes }, token);
      if (!saved.response.ok) throw new Error(saved.result.error || "Could not create the sample worker profile.");
      const immediate = await post("immediate", { enabled: true }, token);
      if (!immediate.response.ok) throw new Error(immediate.result.error || "Could not enable immediate requests.");
    }
  } finally {
    await post("logout", {}, token);
  }
}

try {
  const config = await fetch(base + "config", { signal: AbortSignal.timeout(8000) });
  if (!config.ok || (await config.json()).phoneMode !== "preview") throw new Error("Seed accounts require a preview API.");
  await account("customer-demo");
  for (const [handle, profile] of workers) await account(handle, profile);
  console.log("Preview accounts ready: customer-demo, " + workers.map(([handle]) => handle).join(", ") + ".");
  console.log("Local test password: " + password);
} catch (error) {
  console.error("Could not seed the preview. Check that the local preview API is running.", error.message);
  process.exitCode = 1;
}
