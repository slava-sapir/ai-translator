// functions/api/translate.js

const ALLOWED_LANGS = new Set(["fr", "es", "ja"]);
const MAX_CHARS = 5000;

const LANG_LABEL = {
  fr: "French",
  es: "Spanish",
  ja: "Japanese",
};

function extractOutputText(respJson) {
  const msg = respJson?.output?.find(
    (item) => item?.type === "message" && item?.role === "assistant"
  );
  const out = msg?.content?.find((c) => c?.type === "output_text")?.text;
  return out || respJson?.output_text || "";
}

// CORS (safe for learning; you can restrict later)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(status, data, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders,
      ...extraHeaders,
    },
  });
}

async function moderateText({ apiKey, text }) {
  const r = await fetch("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
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

export async function onRequestOptions() {
  // Preflight (helps if you ever call this from another origin)
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function onRequestPost(context) {
  try {
    const apiKey = context.env.OPENAI_API_KEY;
    if (!apiKey) {
      return json(500, {
        error: "Translation failed",
        details: "Missing OPENAI_API_KEY on server",
      });
    }

    const body = await context.request.json().catch(() => null);
    if (!body) {
      return json(400, { error: "Invalid input", details: "Request body is required" });
    }

    const text = typeof body.text === "string" ? body.text : "";
    const targetLanguage = typeof body.targetLanguage === "string" ? body.targetLanguage : "";

    if (!text.trim()) {
      return json(400, { error: "Invalid input", details: "text is required" });
    }

    if (text.length > MAX_CHARS) {
      return json(400, {
        error: "Invalid input",
        details: `text is too long (max ${MAX_CHARS} characters)`,
      });
    }

    if (!ALLOWED_LANGS.has(targetLanguage)) {
      return json(400, {
        error: "Invalid input",
        details: `targetLanguage must be one of: ${Array.from(ALLOWED_LANGS).join(", ")}`,
      });
    }

    // Moderate first
    const mod = await moderateText({ apiKey, text });
    if (shouldBlock(mod.categories)) {
      return json(400, {
        error: "Content not allowed",
        details:
          "This text may contain harmful or unsafe content. Please remove it and try again.",
      });
    }

    const languageName = LANG_LABEL[targetLanguage] || targetLanguage;

    // Translate (Responses API)
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
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
      return json(500, {
        error: "Translation failed",
        details: "OpenAI request failed",
        debug: errText.slice(0, 500),
      });
    }

    const data = await r.json();
    const translation = extractOutputText(data);

    if (!translation) {
      return json(500, {
        error: "Translation failed",
        details: "No text returned by model",
      });
    }

    return json(200, { translation, targetLanguage });
  } catch (e) {
    return json(500, {
      error: "Translation failed",
      details: e instanceof Error ? e.message : "Unknown error",
    });
  }
}
