import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function PolicyPage() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/policy")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load policy");
        return res.json();
      })
      .then((data) => setContent(data.content))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="page-main">
      <section className="panel policy-panel anim-panel-in">
        <div className="panel-header">
          <h2>Company Refund Policy</h2>
          <span className="panel-tag">Customer</span>
        </div>
        <div className="policy-content">
          {loading && <p className="policy-loading">Loading policy…</p>}
          {error && <p className="lookup-error">{error}</p>}
          {!loading && !error && (
            <article className="policy-markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </article>
          )}
        </div>
      </section>
    </main>
  );
}
