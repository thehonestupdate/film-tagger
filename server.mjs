import express from "express";

const app = express();
app.use(express.json({ limit: "1mb" }));

app.post("/api/generate", async (req, res) => {
  try {
    const prompt = String(req.body?.prompt ?? "").trim();
    if (!prompt) return res.status(400).json({ error: "Missing prompt" });

    const key = process.env.GEMINI_API_KEY;
    if (!key) return res.status(500).json({ error: "Missing GEMINI_API_KEY on server" });

    const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const r = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 450 },
      }),
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = data?.error?.message || `Gemini HTTP ${r.status}`;
      return res.status(r.status).json({ error: msg, raw: data });
    }

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((p) => p?.text)
        .filter(Boolean)
        .join("") || "";

    if (!text.trim()) return res.status(502).json({ error: "Empty Gemini response", raw: data });

    res.json({ text: text.trim() });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.listen(8787, () => console.log("Gemini backend running on http://localhost:8787"));