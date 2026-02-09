import { useState } from "react";
import Loading from "./Loading.jsx";
import ErrorMessage from "./Error.jsx";
import jpnFlag from "../assets/flags/jpn-flag.png";
import frFlag from "../assets/flags/fr-flag.png";
import spFlag from "../assets/flags/sp-flag.png";

const LANGS = [
  { id: "ja", name: "Japanese", flagSrc: jpnFlag },
  { id: "fr", name: "French", flagSrc: frFlag },
  { id: "es", name: "Spanish", flagSrc: spFlag },
];

  export default function TranslationCard() {
  const [text, setText] = useState("");
  const [translation, setTranslation] = useState("");
  const [selectedLang, setSelectedLang] = useState("ja");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function selectLang(id) {
    setSelectedLang(id);
  }

  function clearAll() {
  setText("");
  setTranslation("");
  setError("");
  }
   async function onTranslate(e) {
    e.preventDefault();

    setError("");

    const trimmed = text.trim();
    if (!trimmed) {
      setError("Please enter text to translate.");
      return;
    }

    setLoading(true);

    try {
      const r = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          targetLanguage: selectedLang,
        }),
      });

      let payload = null;
      // Try to parse JSON once
      try {
        payload = await r.json();
      } catch {
        payload = null;
      }

      if (!r.ok) {
        const msg =
          (payload && (payload.details || payload.error)) ||
          `Request failed (${r.status})`;
          console.log("msg:", msg); // optional debug
        throw new Error(msg);
      }
      setTranslation(payload?.translation ?? "");
      setError("");
    } catch (err) {
      console.log("catch err:", err); // optional debug
          setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onTranslate}
      className="relative flex flex-col gap-7 p-5 sm:p-6"
      >
      {loading ? (
        <Loading/>
      ) : null}

      <div className="flex flex-col gap-4">
        <h2 className="text-accent text-3xl font-semibold">
          Type or paste text to translate
        </h2>
        <textarea
           value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type or paste text here..."
            className={[
              "min-h-35 w-full resize-y rounded-xl bg-accent p-4 text-white placeholder-white/70 outline-none focus:ring-2",
              error ? "ring-2 ring-red-400" : "focus:ring-accent/40",
            ].join(" ")}
        />
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-accent text-3xl font-semibold">
          Your translation
        </h2>
        <textarea
          value={translation}
          readOnly
          aria-readonly="true"
          placeholder="Translation will appear here..."
          className="min-h-35 w-full resize-y border border-accent rounded-xl p-4 text-blackish placeholder-offblack/70 outline-none focus:ring-2 focus:ring-accent/50 focus:bg-brand "
        />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-accent text-3xl font-semibold">
          Select language.
        </h2>

        <div className="flex flex-col gap-3">
         {LANGS.map((lang) => (
            <label key={lang.id} className="flex items-center gap-3 text-offblack">
              <input
                  type="radio"
                  name="language"
                  checked={selectedLang === lang.id}
                  onChange={() => {
                    selectLang(lang.id);
                    setTranslation("");
                    setError("");
                  }}
                  className="h-4 w-4 accent-accent"
              />
              <img
                src={lang.flagSrc}
                alt={`${lang.name} flag`}
                className="h-4 w-6 rounded-sm object-cover"
              />
              <span className="text-sm font-medium">{lang.name}</span>
            </label>
          ))}
        </div>
      </div>

      {error ? (<ErrorMessage error={error} /> ) : null}

     <div className="flex flex-col gap-3 sm:flex-row">
      <button
        type="button"
        onClick={clearAll}
        disabled={loading && (!text && !translation)}
        className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white hover:opacity-90 active:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Clear
      </button>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white hover:opacity-90 active:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Translating..." : "Translate"}
      </button>
    </div>

    </form>
  );
}


