// Change this to your deployed backend URL (e.g. "https://your-app.onrender.com").
const API_URL = "http://localhost:5000";

const $ = id => document.getElementById(id);
const samples = {
  spam: "WINNER!! You have been selected to receive a $5,000 gift card. Click http://bit.ly/x123 to claim your prize now. Limited time offer!",
  ham: "Hi Priya, are we still meeting tomorrow at 10:30 to discuss the project plan? I have attached the latest notes. Thanks!"
};
const history = [];

async function api(path, opts) {
  const r = await fetch(API_URL + path, opts);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "Server error " + r.status);
  return data;
}

async function check() {
  const text = $("email").value.trim();
  $("error").hidden = true;
  if (!text) return showError("Please paste some email text first.");
  $("check").disabled = true; $("check").textContent = "Analyzing…";
  try {
    const res = await api("/api/predict", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text })
    });
    render(res); addHistory(text, res);
  } catch (e) {
    showError(e.message === "Failed to fetch" ? "Cannot reach the backend at " + API_URL + ". Is it running?" : e.message);
  } finally { $("check").disabled = false; $("check").textContent = "Check Email"; }
}

function render(r) {
  const pct = (r.spam_probability * 100).toFixed(1);
  $("result").hidden = false;
  $("verdict").className = r.label;
  $("verdict").textContent = r.is_spam ? "🚫 Spam detected" : "✅ Looks legitimate (ham)";
  $("bar").style.width = pct + "%";
  $("bar").style.background = r.is_spam ? "var(--spam)" : "var(--ham)";
  $("detail").textContent = `Spam probability: ${pct}%  ·  Confidence: ${(r.confidence * 100).toFixed(1)}%`;
  $("words").hidden = !r.top_spam_words.length;
  $("wordlist").innerHTML = "";
  r.top_spam_words.forEach(w => { const s = document.createElement("span"); s.textContent = w; $("wordlist").appendChild(s); });
}

function addHistory(text, r) {
  history.unshift({ text, r });
  $("history").innerHTML = "";
  history.slice(0, 10).forEach(h => {
    const li = document.createElement("li");
    li.innerHTML = '<span class="tag"></span><span class="txt"></span><span class="muted"></span>';
    li.children[0].textContent = h.r.label.toUpperCase();
    li.children[0].className = "tag " + h.r.label;
    li.children[1].textContent = h.text;
    li.children[2].textContent = (h.r.spam_probability * 100).toFixed(0) + "%";
    $("history").appendChild(li);
  });
}

function showError(m) { $("error").textContent = m; $("error").hidden = false; }

async function init() {
  try {
    await api("/api/health");
    $("status").textContent = "● server online"; $("status").className = "pill ok";
    const m = await api("/api/metrics");
    $("metrics").hidden = false;
    $("best").textContent = `Deployed model: ${m.best_model} (trained on ${m.train_size} emails, tested on ${m.test_size}).`;
    for (const [name, v] of Object.entries(m.results)) {
      const tr = document.createElement("tr");
      if (name === m.best_model) tr.className = "best";
      [name, ...["accuracy", "precision", "recall", "f1"].map(k => (v[k] * 100).toFixed(1) + "%")]
        .forEach(t => { const td = document.createElement("td"); td.textContent = t; tr.appendChild(td); });
      $("mrows").appendChild(tr);
    }
  } catch { $("status").textContent = "● server offline"; $("status").className = "pill bad"; }
}

$("check").onclick = check;
$("clear").onclick = () => { $("email").value = ""; $("result").hidden = true; $("error").hidden = true; };
document.querySelectorAll("[data-sample]").forEach(b => b.onclick = () => { $("email").value = samples[b.dataset.sample]; });
$("email").addEventListener("keydown", e => { if (e.ctrlKey && e.key === "Enter") check(); });
init();
