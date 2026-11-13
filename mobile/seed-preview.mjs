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
      const saved = await post("profile", { languages: ["Hindi", "English"], ...profile }, token);
      if (!saved.response.ok) throw new Error(saved.result.error || "Could not create the sample worker profile.");
      const immediate = await post("immediate", { enabled: true }, token);
      if (!immediate.response.ok) throw new Error(immediate.result.error || "Could not enable immediate requests.");
    }
  } finally {
    await post("logout", {}, token);
  }
}

const workers = [
  ["worker-demo", {
    name: "Delhi Plumbing Demo", service: "plumbing", areas: ["Saket", "Dwarka", "Lajpat Nagar"], years: 5, price: 449, unit: "visit",
    bio: "Demo profile for leaks, drains and fittings. The visit covers diagnosing the problem.",
    bioHi: "लीकेज, नाली और फिटिंग की डेमो प्रोफ़ाइल। विज़िट में समस्या की जाँच शामिल है।",
    plus: { price: 749, includes: "Check nearby fittings for related leaks and give a written repair and parts estimate.",
      includesHi: "आस-पास की फिटिंग में लीकेज की जाँच और मरम्मत व पुर्ज़ों का लिखित अनुमान।" },
  }],
  ["electric-demo", {
    name: "Rohini Electrical Demo", service: "electrical", areas: ["Rohini", "Dwarka"], years: 7, price: 499, unit: "visit",
    bio: "Demo profile for lights, fans, sockets and wiring checks.",
    bioHi: "लाइट, पंखे, सॉकेट और वायरिंग की जाँच की डेमो प्रोफ़ाइल।",
    plus: { price: 799, includes: "Inspect two adjacent sockets and share a written fault summary and next steps.",
      includesHi: "पास के दो सॉकेट की जाँच, खराबी का लिखित विवरण और आगे के काम की जानकारी।" },
  }],
  ["cleaning-demo", {
    name: "Saket Cleaning Demo", service: "cleaning", areas: ["Saket", "Lajpat Nagar", "Dwarka"], years: 4, price: 349, unit: "hourly",
    bio: "Demo profile for floors, dusting and accessible surfaces.",
    bioHi: "फ़र्श, धूल और आसानी से पहुँचने वाली सतहों की सफ़ाई की डेमो प्रोफ़ाइल।",
    plus: { price: 549, includes: "Detail skirting and wipe the cabinet fronts in the room being cleaned.",
      includesHi: "साफ़ किए जा रहे कमरे में स्कर्टिंग और अलमारियों के सामने के हिस्सों की बारीक सफ़ाई।" },
  }],
  ["painting-demo", {
    name: "Dwarka Painting Demo", service: "painting", areas: ["Dwarka", "Rohini"], years: 6, price: 399, unit: "visit",
    bio: "Demo profile for wall assessments, touch-ups and interior painting.",
    bioHi: "दीवार की जाँच, टच-अप और अंदरूनी पेंटिंग की डेमो प्रोफ़ाइल।",
    plus: { price: 699, includes: "Include a moisture check on the affected wall and a written surface preparation plan.",
      includesHi: "प्रभावित दीवार की नमी की जाँच और सतह की तैयारी का लिखित प्लान।" },
  }],
];

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
