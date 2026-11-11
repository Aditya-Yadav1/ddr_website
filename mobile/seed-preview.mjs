const port = Number(process.env.HANDYHIVE_PORT || 4174);
const base = "http://127.0.0.1:" + port + "/api/v1/";
const password = "HandyHive-local-demo";

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
      const saved = await post("profile", profile, token);
      if (!saved.response.ok) throw new Error(saved.result.error || "Could not create the sample worker profile.");
    }
  } finally {
    await post("logout", {}, token);
  }
}

try {
  await account("customer-demo");
  await account("worker-demo", {
    name: "Delhi Plumbing Demo",
    service: "plumbing",
    areas: ["Saket", "Dwarka"],
    years: 3,
    price: 500,
    unit: "visit",
    bio: "Sample plumbing profile for local booking tests.",
  });
  console.log("Preview accounts ready: customer-demo and worker-demo.");
  console.log("Local test password: " + password);
} catch (error) {
  console.error("Could not seed the preview. Check that the local preview API is running.", error.message);
  process.exitCode = 1;
}
