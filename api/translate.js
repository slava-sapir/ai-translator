const ALLOWED_LANGS = new Set(["fr", "es", "ja"]);
const MAX_CHARS = 5000;

const LANG_LABEL = {
  fr: "French",
  es: "Spanish",
  ja: "Japanese",
};

function extractOutputText(respJson) {
  // Some SDKs provide output_text helper; for raw HTTP we extract from output items.
  const msg = respJson?.output?.find(
    (item) => item?.type === "message" && item?.role === "assistant"
  );
  const out = msg?.content?.find((c) => c?.type === "output_text")?.text;

  // Fallback if present
  return out || respJson?.output_text || "";
}

async function moderateText({ apiKey, text }) {
  const r = await fetch("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "omni-moderation-latest",
      input: text,
    }),
  });

  if (!r.ok) {
    const errText = await r.text().catch(() => "");
    throw new Error(`Moderation request failed: ${errText.slice(0, 200)}`);
  }

  const data = await r.json();
  const result = data?.results?.[0];

  return {
    flagged: Boolean(result?.flagged),
    categories: result?.categories ?? null,
  };
}

function shouldBlock(categories) {
  if (!categories) return false;

  // Different moderation models may use slightly different keys.
  // We'll support common ones and default safely.
  const isTrue = (k) => categories?.[k] === true;

  return (
    // Hate
    isTrue("hate") ||
    isTrue("hate/threatening") ||

    // Self-harm
    isTrue("self-harm") ||
    isTrue("self-harm/intent") ||
    isTrue("self-harm/instructions") ||

    // Violence (threats / instructions)
    isTrue("violence/threat") ||
    isTrue("violence/instructions") ||

    // Sexual minors
    isTrue("sexual/minors")
  );
}


export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed", details: "Use POST /api/translate" });
  }

  let body = req.body;
  if (!body) return res.status(400).json({ error: "Invalid input", details: "Request body is required" });
  if (typeof body === "string") {
    try { body = JSON.parse(body); }
    catch { return res.status(400).json({ error: "Invalid input", details: "Body must be valid JSON" }); }
  }

  const text = typeof body.text === "string" ? body.text : "";
  const targetLanguage = typeof body.targetLanguage === "string" ? body.targetLanguage : "";

  if (!text.trim()) return res.status(400).json({ error: "Invalid input", details: "text is required" });
  if (text.length > MAX_CHARS)
    return res.status(400).json({ error: "Invalid input", details: `text is too long (max ${MAX_CHARS} characters)` });
  if (!ALLOWED_LANGS.has(targetLanguage))
    return res.status(400).json({
      error: "Invalid input",
      details: `targetLanguage must be one of: ${Array.from(ALLOWED_LANGS).join(", ")}`,
    });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "Translation failed",
      details: "Missing OPENAI_API_KEY on server",
    });
  }

  // 1) Moderate input first
    const mod = await moderateText({ apiKey, text });

    if (shouldBlock(mod.categories)) {
    return res.status(400).json({
      error: "Content not allowed",
      details:
        "This text may contain harmful or unsafe content. Please remove it and try again.",
    });
  }

  const languageName = LANG_LABEL[targetLanguage] || targetLanguage;

  try {
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        // "instructions" is the system/developer-style message for Responses API.
        instructions:
          "You are a translation engine. Return ONLY the translated text. " +
          "Preserve meaning, tone, formatting, line breaks, and punctuation. " +
          "Do not add explanations or extra quotes.",
        input: `Translate the following text into ${languageName}:\n\n${text}`,
        temperature: 0.2,
        max_output_tokens: 1200,
        store: false,
      }),
    });

    if (!r.ok) {
      const errText = await r.text().catch(() => "");
      return res.status(500).json({
        error: "Translation failed",
        details: "OpenAI request failed",
        debug: errText.slice(0, 500),
      });
    }

    const data = await r.json();
    const translation = extractOutputText(data);

    if (!translation) {
      return res.status(500).json({
        error: "Translation failed",
        details: "No text returned by model",
      });
    }

    return res.status(200).json({ translation, targetLanguage });
  } catch (e) {
    return res.status(500).json({
      error: "Translation failed",
      details: e instanceof Error ? e.message : "Unknown error",
    });
  }
}
