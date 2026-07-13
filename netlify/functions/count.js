const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  const headers = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers };
  }

  const meta = getStore({
    name: "meta",
    siteID: process.env.BLOBS_SITE_ID,
    token: process.env.BLOBS_TOKEN,
  });

  const raw = await meta.get("count");
  const count = raw ? parseInt(raw, 10) : 0;

  return { statusCode: 200, headers, body: JSON.stringify({ count }) };
};
