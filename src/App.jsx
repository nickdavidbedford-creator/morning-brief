import { useState } from "react";

const API_KEY = import.meta.env.VITE_API_KEY;
const ACTIVITIES = {
  "Drone Spraying": {
    icon: "🚁",
    hazards: [
      "Flyaway / loss of control of drone",
      "Rotor blade contact injury",
      "Chemical spray drift onto bystanders or crew",
      "Electrical hazard from battery or charging equipment",
      "Terrain/obstacle collision",
      "Flying in restricted or sensitive airspace",
      "Eye and skin exposure to herbicide/pesticide",
      "Slips on wet or uneven ground during launch/landing",
    ],
    ppe: ["Chemical-resistant gloves", "Safety glasses / goggles", "Hi-vis vest", "Closed-toe boots", "Sun protection"],
  },
  "Ground Spraying": {
    icon: "💧",
    hazards: [
      "Skin/eye contact with chemicals",
      "Inhalation of spray mist or vapour",
      "Chemical spill or leaks from equipment",
      "Slips, trips on rough terrain",
      "Working near waterways (contamination risk)",
      "Heat stress from PPE in hot conditions",
      "Manual handling of heavy tanks/equipment",
    ],
    ppe: ["Chemical-resistant gloves", "Safety glasses / face shield", "Chemical-resistant apron", "Gumboots", "Respirator (if required by label)"],
  },
  "Machine Cutting": {
    icon: "⚙️",
    hazards: [
      "Thrown debris / projectiles from cutting head",
      "Contact with rotating blade",
      "Vibration white finger (prolonged use)",
      "Noise-induced hearing loss",
      "Fuel spill and fire risk",
      "Vegetation wrap or kickback",
      "Working on steep or unstable terrain",
      "Exhaust fume inhalation",
    ],
    ppe: ["Face shield / visor", "Cut-resistant gloves", "Hearing protection", "Hi-vis clothing", "Leg protection / chaps", "Steel-capped boots"],
  },
  "Hand Cutting": {
    icon: "🪚",
    hazards: [
      "Laceration from hand saw",
      "Falling branches or material",
      "Repetitive strain injury (wrist, shoulder)",
      "Slips on wet or uneven terrain",
      "Working near others with sharp tools",
      "Fatigue leading to reduced concentration",
      "Bee/wasp nests disturbed during cutting",
    ],
    ppe: ["Cut-resistant gloves", "Safety glasses", "Closed-toe boots", "Hi-vis vest", "Sun protection"],
  },
  "Planting": {
    icon: "🌱",
    hazards: [
      "Manual handling / back strain from digging",
      "Sharp tools (spades, mattocks)",
      "Slips on muddy or uneven ground",
      "Sun/heat exposure",
      "Contact with soil-borne pathogens",
      "Insect bites or stings",
      "Working near waterways",
    ],
    ppe: ["Work gloves", "Closed-toe boots", "Sun hat", "Sunscreen", "Eye protection (if using pesticide gel)"],
  },
  "Animal Trapping": {
    icon: "🪤",
    hazards: [
      "Trap spring mechanism causing crush injury",
      "Handling of live or dead animals (zoonotic disease risk)",
      "Needle-stick or bite injury from trapped animal",
      "Slips/trips in remote terrain",
      "Manual handling in awkward positions",
      "Working alone in isolated areas",
      "Exposure to hantavirus from rodent droppings",
    ],
    ppe: ["Heavy-duty gloves", "Closed-toe boots", "Eye protection", "Disposable gloves (animal handling)"],
  },
  "Rat Baiting": {
    icon: "🐀",
    hazards: [
      "Accidental ingestion or skin contact with rodenticide",
      "Secondary poisoning risk to non-target species (dogs, raptors)",
      "Needle-stick from handling bait stations",
      "Slips/trips in dense vegetation",
      "Manual handling of bait containers",
      "Working in confined or dark spaces (under structures)",
      "Exposure to rodent urine/droppings (leptospirosis risk)",
    ],
    ppe: ["Nitrile gloves", "Safety glasses", "Closed-toe boots", "Wash hands thoroughly after handling"],
  },
};

const WEATHER_OPTIONS = ["Fine / sunny", "Overcast", "Light rain", "Heavy rain", "Windy", "Hot (>28°C)", "Cold (<10°C)", "Foggy"];

const todayString = () => {
  const d = new Date();
  return d.toISOString().split("T")[0];
};

const formatDisplayDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-NZ", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
};

export default function App() {
  const [step, setStep] = useState(1);
  const [selectedActivities, setSelectedActivities] = useState([]);
  const [weather, setWeather] = useState([]);
  const [site, setSite] = useState("");
  const [supervisor, setSupervisor] = useState("");
  const [briefDate, setBriefDate] = useState(todayString());
  const [crewNotes, setCrewNotes] = useState("");
  const [workers, setWorkers] = useState([{ name: "", signed: false }]);
  const [customHazards, setCustomHazards] = useState({});
  const [loading, setLoading] = useState(false);
  const [brief, setBrief] = useState("");
  const [expandedActivity, setExpandedActivity] = useState(null);

  const toggleActivity = (name) => {
    setSelectedActivities((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]
    );
  };

  const toggleWeather = (w) => {
    setWeather((prev) => (prev.includes(w) ? prev.filter((x) => x !== w) : [...prev, w]));
  };

  const addWorker = () => setWorkers([...workers, { name: "", signed: false }]);

  const updateWorker = (i, field, value) => {
    const updated = [...workers];
    updated[i][field] = value;
    setWorkers(updated);
  };

  const generateBrief = async () => {
    setLoading(true);
    setStep(3);

    const activitySummary = selectedActivities.map((a) => {
      const hazards = ACTIVITIES[a].hazards.join(", ");
      const extra = customHazards[a] ? ` Additional site-specific hazards: ${customHazards[a]}` : "";
      return `${a} (standard hazards: ${hazards}${extra})`;
    }).join("\n");

    const prompt = `You are a health and safety coordinator for an environmental services crew in New Zealand. Write a professional morning toolbox brief for today's field crew.

Date: ${formatDisplayDate(briefDate)}
Site/Location: ${site || "Not specified"}
Supervisor: ${supervisor || "Not specified"}
Weather conditions: ${weather.join(", ") || "Not noted"}
Today's activities:
 ${activitySummary}

Additional crew notes: ${crewNotes || "None"}

Write a clear, practical morning brief that covers:
1. A short intro / welcome
2. Today's weather and how it affects the work
3. For each activity: key hazards to watch for and any important controls or reminders
4. General reminders (communication, buddy system if working remote, emergency procedures)
5. A closing message encouraging the crew

Keep it conversational and direct — this is read out loud to a field crew. No bullet walls, just clear sections. Around 350-450 words.`;

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await response.json();
      const text = data.content?.map((b) => b.text || "").join("") || "Could not generate brief.";
      setBrief(text);
    } catch (e) {
      setBrief("Error generating brief. Please try again.");
    }
    setLoading(false);
  };

  const saveBrief = () => {
    const signedOn = workers.filter(w => w.name).map(w => `${w.name} - ${w.signed ? "Signed on" : "Not signed"}`).join("\n");
    const content = `MORNING FIELD BRIEF
Date: ${formatDisplayDate(briefDate)}
Site: ${site || "Not specified"}
Supervisor: ${supervisor || "Not specified"}
Weather: ${weather.join(", ") || "Not noted"}
Activities: ${selectedActivities.join(", ")}

---

${brief}

---

CREW SIGN-ON:
${signedOn}

Generated by Morning Brief App`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Morning-Brief-${briefDate}-${site || "site"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetAll = () => {
    setStep(1);
    setBrief("");
    setSelectedActivities([]);
    setWeather([]);
    setSite("");
    setSupervisor("");
    setBriefDate(todayString());
    setCrewNotes("");
    setWorkers([{ name: "", signed: false }]);
    setCustomHazards({});
  };

  const s = {
    container: { fontFamily: "'Georgia', serif", minHeight: "100vh", background: "#1a1f1a", color: "#e8e4d8" },
    header: { background: "#2d3b2d", borderBottom: "3px solid #5a8a3c", padding: "20px 24px", display: "flex", alignItems: "center", gap: "12px" },
    headerTitle: { fontSize: "20px", fontWeight: "bold", color: "#a8d47a", letterSpacing: "0.5px" },
    headerDate: { fontSize: "13px", color: "#8aab6a", marginTop: "2px" },
    inner: { maxWidth: "680px", margin: "0 auto", padding: "24px 16px" },
    label: { display: "block", fontSize: "13px", color: "#8aab6a", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "1px" },
    input: { width: "100%", padding: "10px 12px", background: "#2a352a", border: "1px solid #4a5a4a", borderRadius: "6px", color: "#e8e4d8", fontSize: "15px", boxSizing: "border-box" },
    card: { background: "#2a352a", border: "1px solid #4a5a4a", borderRadius: "10px", padding: "16px", marginBottom: "12px" },
    cardLabel: { fontSize: "12px", color: "#8aab6a", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" },
    btnPrimary: { width: "100%", padding: "14px", background: "#5a8a3c", color: "#fff", border: "none", borderRadius: "8px", fontSize: "16px", cursor: "pointer", fontFamily: "Georgia, serif" },
    btnSecondary: { padding: "12px 20px", background: "#2a352a", border: "1px solid #4a5a4a", borderRadius: "8px", color: "#8aab6a", cursor: "pointer", fontSize: "14px" },
    stepTitle: { color: "#a8d47a", fontSize: "18px", marginBottom: "20px", fontStyle: "italic" },
  };

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <div style={{ fontSize: "28px" }}>🌿</div>
        <div>
          <div style={s.headerTitle}>Morning Field Brief</div>
          <div style={s.headerDate}>{formatDisplayDate(briefDate)}</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
          {[1, 2, 3].map((n) => (
            <div key={n} onClick={() => { if (n < step) setStep(n); }} style={{
              width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "13px", fontWeight: "bold", cursor: n < step ? "pointer" : "default",
              background: step >= n ? "#5a8a3c" : "#3a4a3a",
              color: step >= n ? "#fff" : "#6a7a6a",
              border: step === n ? "2px solid #a8d47a" : "2px solid transparent"
            }}>{n}</div>
          ))}
        </div>
      </div>

      <div style={s.inner}>

        {/* STEP 1 */}
        {step === 1 && (
          <div>
            <h2 style={s.stepTitle}>Step 1 — Site & Crew Setup</h2>

            <div style={{ marginBottom: "16px" }}>
              <label style={s.label}>Brief Date</label>
              <input type="date" value={briefDate} onChange={(e) => setBriefDate(e.target.value)}
                style={{ ...s.input, colorScheme: "dark" }} />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={s.label}>Site / Location</label>
              <input value={site} onChange={(e) => setSite(e.target.value)} placeholder="e.g. Hunua Ranges Block 4" style={s.input} />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={s.label}>Supervisor / Team Leader</label>
              <input value={supervisor} onChange={(e) => setSupervisor(e.target.value)} placeholder="Name" style={s.input} />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={s.label}>Today's Weather</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {WEATHER_OPTIONS.map((w) => (
                  <button key={w} onClick={() => toggleWeather(w)} style={{
                    padding: "7px 14px", borderRadius: "20px", fontSize: "13px", cursor: "pointer",
                    background: weather.includes(w) ? "#5a8a3c" : "#2a352a",
                    color: weather.includes(w) ? "#fff" : "#aab89a",
                    border: weather.includes(w) ? "1px solid #a8d47a" : "1px solid #4a5a4a"
                  }}>{w}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={s.label}>Today's Activities</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {Object.entries(ACTIVITIES).map(([name, data]) => (
                  <button key={name} onClick={() => toggleActivity(name)} style={{
                    padding: "12px", borderRadius: "8px", cursor: "pointer", textAlign: "left",
                    background: selectedActivities.includes(name) ? "#3a5a2a" : "#2a352a",
                    border: selectedActivities.includes(name) ? "1px solid #a8d47a" : "1px solid #4a5a4a",
                    color: selectedActivities.includes(name) ? "#e8e4d8" : "#8aab6a",
                  }}>
                    <span style={{ fontSize: "20px" }}>{data.icon}</span>
                    <span style={{ display: "block", fontSize: "13px", marginTop: "4px", fontWeight: selectedActivities.includes(name) ? "bold" : "normal" }}>{name}</span>
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => setStep(2)} disabled={selectedActivities.length === 0}
              style={{ ...s.btnPrimary, background: selectedActivities.length ? "#5a8a3c" : "#3a4a3a", color: selectedActivities.length ? "#fff" : "#5a6a5a", cursor: selectedActivities.length ? "pointer" : "not-allowed" }}>
              Next: Review Hazards →
            </button>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div>
            <h2 style={s.stepTitle}>Step 2 — Hazards & Sign-on</h2>

            {selectedActivities.map((name) => (
              <div key={name} style={{ background: "#2a352a", border: "1px solid #4a5a4a", borderRadius: "10px", marginBottom: "12px", overflow: "hidden" }}>
                <button onClick={() => setExpandedActivity(expandedActivity === name ? null : name)}
                  style={{ width: "100%", padding: "14px 16px", background: "none", border: "none", color: "#e8e4d8", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", textAlign: "left" }}>
                  <span style={{ fontSize: "22px" }}>{ACTIVITIES[name].icon}</span>
                  <span style={{ flex: 1, fontSize: "15px", fontWeight: "bold" }}>{name}</span>
                  <span style={{ color: "#8aab6a", fontSize: "18px" }}>{expandedActivity === name ? "▲" : "▼"}</span>
                </button>
                {expandedActivity === name && (
                  <div style={{ padding: "0 16px 16px" }}>
                    <div style={s.cardLabel}>Standard Hazards</div>
                    {ACTIVITIES[name].hazards.map((h, i) => (
                      <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid #3a4a3a", fontSize: "14px", color: "#c8c4b0", display: "flex", gap: "8px" }}>
                        <span style={{ color: "#e87a3c" }}>⚠</span> {h}
                      </div>
                    ))}
                    <div style={{ ...s.cardLabel, marginTop: "14px" }}>PPE</div>
                    <div style={{ fontSize: "14px", color: "#a8c488" }}>{ACTIVITIES[name].ppe.join(" · ")}</div>
                    <div style={{ marginTop: "14px" }}>
                      <label style={{ ...s.cardLabel, display: "block", marginBottom: "6px" }}>Site-specific hazards to add</label>
                      <textarea value={customHazards[name] || ""} onChange={(e) => setCustomHazards({ ...customHazards, [name]: e.target.value })}
                        placeholder="Any extra hazards specific to today's site..."
                        style={{ width: "100%", padding: "8px 10px", background: "#1a251a", border: "1px solid #4a5a4a", borderRadius: "6px", color: "#e8e4d8", fontSize: "14px", minHeight: "60px", boxSizing: "border-box", resize: "vertical" }} />
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div style={{ ...s.card }}>
              <div style={s.cardLabel}>Crew Notes / Anything to Add</div>
              <textarea value={crewNotes} onChange={(e) => setCrewNotes(e.target.value)}
                placeholder="Any crew member can add notes here — site access issues, concerns, equipment problems..."
                style={{ width: "100%", padding: "8px 10px", background: "#1a251a", border: "1px solid #4a5a4a", borderRadius: "6px", color: "#e8e4d8", fontSize: "14px", minHeight: "70px", boxSizing: "border-box", resize: "vertical" }} />
            </div>

            <div style={{ ...s.card }}>
              <div style={s.cardLabel}>Worker Sign-on</div>
              {workers.map((w, i) => (
                <div key={i} style={{ display: "flex", gap: "10px", marginBottom: "8px", alignItems: "center" }}>
                  <input value={w.name} onChange={(e) => updateWorker(i, "name", e.target.value)} placeholder={`Worker ${i + 1} name`}
                    style={{ flex: 1, padding: "8px 10px", background: "#1a251a", border: "1px solid #4a5a4a", borderRadius: "6px", color: "#e8e4d8", fontSize: "14px" }} />
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#8aab6a", cursor: "pointer", whiteSpace: "nowrap" }}>
                    <input type="checkbox" checked={w.signed} onChange={(e) => updateWorker(i, "signed", e.target.checked)} style={{ width: "16px", height: "16px", accentColor: "#5a8a3c" }} />
                    Signed on
                  </label>
                </div>
              ))}
              <button onClick={addWorker} style={{ marginTop: "6px", padding: "7px 14px", background: "#1a251a", border: "1px dashed #5a6a5a", borderRadius: "6px", color: "#8aab6a", cursor: "pointer", fontSize: "13px" }}>+ Add worker</button>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
              <button onClick={() => setStep(1)} style={s.btnSecondary}>← Back</button>
              <button onClick={generateBrief} style={{ ...s.btnPrimary, flex: 1, width: "auto" }}>
                Generate Morning Brief ✓
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div>
            <h2 style={s.stepTitle}>Morning Brief — {site || "Field Site"}</h2>
            <div style={{ fontSize: "13px", color: "#8aab6a", marginBottom: "16px" }}>{formatDisplayDate(briefDate)}</div>

            {loading ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <div style={{ fontSize: "32px", marginBottom: "16px" }}>🌿</div>
                <div style={{ color: "#8aab6a", fontSize: "15px" }}>Generating your brief...</div>
              </div>
            ) : (
              <>
                <div style={{ background: "#2a352a", border: "1px solid #5a8a3c", borderRadius: "10px", padding: "20px", marginBottom: "16px", lineHeight: "1.75", fontSize: "15px", color: "#e8e4d8", whiteSpace: "pre-wrap" }}>
                  {brief}
                </div>

                <div style={s.card}>
                  <div style={s.cardLabel}>Crew Signed On</div>
                  {workers.filter(w => w.name).map((w, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #3a4a3a", fontSize: "14px" }}>
                      <span>{w.name}</span>
                      <span style={{ color: w.signed ? "#a8d47a" : "#e87a3c" }}>{w.signed ? "✓ Signed on" : "Not signed"}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button onClick={() => setStep(2)} style={s.btnSecondary}>← Back</button>
                  <button onClick={saveBrief} style={{ flex: 1, padding: "12px", background: "#3a6a8a", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", cursor: "pointer" }}>
                    💾 Save Brief
                  </button>
                  <button onClick={resetAll} style={{ flex: 1, padding: "12px", background: "#2a352a", border: "1px solid #4a5a4a", borderRadius: "8px", color: "#8aab6a", cursor: "pointer", fontSize: "14px" }}>
                    New Brief
                  </button>
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
