const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  const headers = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { name, email, city, state, zip, timestamp } = payload;

  if (!name || !email || !city || !state || !zip) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing required fields" }) };
  }

  const emailKey = String(email).trim().toLowerCase();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(emailKey)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid email" }) };
  }

  const signatures = getStore("signatures");
  const meta = getStore("meta");

  // Reject duplicate signer (same email = same person)
  const existing = await signatures.get(emailKey);
  if (existing) {
    return { statusCode: 409, headers, body: JSON.stringify({ error: "duplicate", reason: "This email has already signed." }) };
  }

  // Store the signature
  await signatures.setJSON(emailKey, {
    name: String(name).trim(),
    city: String(city).trim(),
    state: String(state).trim(),
    zip: String(zip).trim(),
    timestamp: timestamp || new Date().toISOString(),
    ip: event.headers["x-nf-client-connection-ip"] || null
  });

  // Increment the running total (best-effort counter; see README note on scale)
  const BASE_COUNT = 0; // starting offset if you're seeding an initial number
  const currentRaw = await meta.get("count");
  const current = currentRaw ? parseInt(currentRaw, 10) : BASE_COUNT;
  const next = current + 1;
  await meta.set("count", String(next));

  return { statusCode: 200, headers, body: JSON.stringify({ ok: true, count: next }) };
};
