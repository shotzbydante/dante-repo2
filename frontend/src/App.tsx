import { useState } from "react";
import type { GenerateResponse, AdConcept } from "./types";

async function generate(url: string): Promise<GenerateResponse> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data as GenerateResponse;
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button type="button" className="copy-btn" onClick={handleCopy}>
      {copied ? "Copied!" : label ?? "Copy"}
    </button>
  );
}

function AdCard({ ad, index }: { ad: AdConcept; index: number }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="ad-card">
      <div
        className="ad-card-header"
        onClick={() => setExpanded((e) => !e)}
        onKeyDown={(ev) => ev.key === "Enter" && setExpanded((e) => !e)}
        role="button"
        tabIndex={0}
      >
        <h3>Ad {index + 1}: {ad.duration_seconds}s</h3>
        <span className="badge">{ad.duration_seconds}s</span>
      </div>
      {expanded && (
        <div className="ad-card-body">
          <div className="ad-section">
            <dt>Hook</dt>
            <dd>
              {ad.hook}
              <CopyButton text={ad.hook} label="Copy" />
            </dd>
          </div>
          <div className="ad-section">
            <dt>Angle</dt>
            <dd>{ad.angle}</dd>
          </div>
          <div className="ad-section">
            <dt>Voiceover</dt>
            <dd>
              {ad.voiceover_script}
              <CopyButton text={ad.voiceover_script} label="Copy" />
            </dd>
          </div>
          <div className="ad-section">
            <dt>CTA options</dt>
            <dd>
              {ad.cta_options.join(" · ")}
              <CopyButton text={ad.cta_options.join("\n")} label="Copy" />
            </dd>
          </div>
          <div className="ad-section">
            <dt>Storyboard</dt>
            <dd>
              <ul className="storyboard">
                {ad.storyboard.map((s, i) => (
                  <li key={i}>
                    <span className="timestamp">{s.timestamp}</span> — {s.description}
                    {s.on_screen_text && ` [Text: "${s.on_screen_text}"]`}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
          <div className="ad-section">
            <dt>Platform notes</dt>
            <dd>
              Meta 9:16: {ad.platform_variants.meta_vertical_9_16} — YouTube 16:9:{" "}
              {ad.platform_variants.youtube_horizontal_16_9}
            </dd>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const data = await generate(url.trim());
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ad-brief-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="app">
      <h1>Ad Brief Generator</h1>
      <form onSubmit={handleSubmit}>
        <div className="input-row">
          <input
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
          />
          <button type="submit" disabled={loading}>
            {loading ? "Generating…" : "Generate"}
          </button>
        </div>
      </form>

      {error && <div className="error">{error}</div>}
      {loading && <div className="loading">Fetching and analyzing website…</div>}

      {result && (
        <>
          <section className="profile">
            <h2>{result.profile.business_name}</h2>
            <p>
              {result.profile.category_guess}
              {result.profile.location_guess && ` · ${result.profile.location_guess}`}
            </p>
            <p>Tone: {result.profile.tone}</p>
            {result.profile.value_props.length > 0 && (
              <ul>
                {result.profile.value_props.map((v, i) => (
                  <li key={i}>{v}</li>
                ))}
              </ul>
            )}
            {result.profile.keywords.length > 0 && (
              <p>Keywords: {result.profile.keywords.join(", ")}</p>
            )}
            {result.profile.assets_needed && result.profile.assets_needed.length > 0 && (
              <p><strong>Assets needed:</strong> {result.profile.assets_needed.join(", ")}</p>
            )}
          </section>

          <section className="ads-grid">
            {result.ads.map((ad, i) => (
              <AdCard key={i} ad={ad} index={i} />
            ))}
          </section>

          <div className="actions-bar">
            <button type="button" className="download-btn" onClick={handleDownload}>
              Download JSON
            </button>
          </div>
        </>
      )}
    </div>
  );
}
