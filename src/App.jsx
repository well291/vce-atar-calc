import React, { useMemo, useState } from "react";
import { Plus, X, Info, ArrowUpRight, ArrowDownRight, ArrowRight } from "lucide-react";

/*
  VCE study score + ATAR calculator
  ----------------------------------
  Two linked tools:
   1. Study score → ATAR. Scales raw study scores (VTAC 2025 anchors, monotone-cubic
      interpolation) and builds the aggregate (best English + next 3, +10% of 5th & 6th),
      then maps to an ATAR via VTAC's 2025 aggregate→ATAR table.
   2. SAC + exam → study score. Estimates a raw study score from your SAC rank and
      exam mark, with "school scaling": SACs are moderated against your school cohort's
      strength, mirroring how VCAA statistical moderation works. Results can be pushed
      into the ATAR tool.

  All estimates. Scaling/moderation shift yearly with the cohort; official scores are
  set by VCAA and the ATAR is issued by VTAC.
*/

// code, name, isEnglish, scaled scores at [20,25,30,35,40,45,50]  (VTAC 2025 Scaling Report)
const STUDIES = [
  ["AC", "Accounting", false, [20, 25, 31, 36, 41, 46, 50]],
  ["AH", "Agricultural & Horticultural Studies", false, [15, 19, 24, 29, 34, 41, 50]],
  ["AL", "Algorithmics (HESS)", false, [24, 31, 38, 43, 47, 50, 51]],
  ["IT2", "Applied Computing: Data Analytics", false, [16, 21, 26, 32, 38, 44, 50]],
  ["IT3", "Applied Computing: Software Development", false, [17, 22, 28, 33, 39, 45, 50]],
  ["AT", "Art Creative Practice", false, [16, 21, 27, 32, 38, 44, 50]],
  ["SA", "Art Making and Exhibiting", false, [15, 20, 25, 31, 37, 44, 50]],
  ["BI", "Biology", false, [19, 25, 31, 36, 41, 46, 50]],
  ["BM", "Business Management", false, [17, 22, 27, 32, 38, 44, 50]],
  ["CH", "Chemistry", false, [22, 28, 34, 39, 44, 47, 50]],
  ["CC", "Classical Studies", false, [19, 25, 30, 36, 41, 46, 50]],
  ["DA", "Dance", false, [18, 23, 27, 32, 37, 43, 50]],
  ["DR", "Drama", false, [18, 23, 28, 33, 39, 45, 50]],
  ["EC", "Economics", false, [20, 26, 31, 37, 42, 46, 50]],
  ["EN", "English", true, [17, 22, 28, 33, 39, 45, 50]],
  ["EF", "English as an Additional Language (EAL)", true, [15, 21, 27, 33, 40, 46, 50]],
  ["EG", "English Language", true, [22, 27, 33, 38, 43, 47, 50]],
  ["EV", "Environmental Science", false, [18, 23, 28, 33, 39, 44, 50]],
  ["XI", "Extended Investigation", false, [22, 27, 33, 38, 42, 47, 50]],
  ["FT", "Food Studies", false, [14, 19, 23, 29, 35, 42, 50]],
  ["GE", "Geography", false, [18, 23, 28, 34, 39, 45, 50]],
  ["HH", "Health and Human Development", false, [16, 21, 26, 31, 37, 43, 50]],
  ["HI17", "History: Ancient History", false, [16, 21, 27, 33, 39, 45, 50]],
  ["HA", "History: Australian History", false, [18, 23, 29, 34, 40, 45, 50]],
  ["HR", "History: Revolutions", false, [18, 23, 29, 34, 40, 45, 50]],
  ["IE", "Industry and Enterprise", false, [12, 16, 20, 26, 32, 40, 50]],
  ["AR", "Languages: Arabic", false, [20, 25, 30, 34, 39, 44, 50]],
  ["CN", "Languages: Chinese First Language", false, [18, 25, 33, 39, 45, 48, 50]],
  ["LO57", "Languages: Chinese Language Culture and Society", false, [22, 28, 33, 38, 43, 47, 50]],
  ["CK", "Languages: Chinese Second Language Advanced", false, [24, 31, 37, 42, 47, 50, 52]],
  ["CL", "Languages: Chinese Second Language", false, [29, 35, 41, 45, 49, 52, 54]],
  ["FR", "Languages: French", false, [30, 36, 41, 45, 49, 51, 53]],
  ["GN", "Languages: German", false, [27, 34, 39, 44, 48, 51, 53]],
  ["MG", "Languages: Greek", false, [24, 30, 35, 40, 44, 47, 50]],
  ["HB", "Languages: Hebrew", false, [29, 35, 39, 43, 46, 48, 50]],
  ["HID", "Languages: Hindi", false, [23, 30, 36, 42, 46, 50, 52]],
  ["IX", "Languages: Indonesian Second Language", false, [26, 32, 38, 42, 46, 49, 52]],
  ["IL", "Languages: Italian", false, [27, 33, 38, 42, 45, 48, 50]],
  ["JS", "Languages: Japanese Second Language", false, [26, 32, 38, 43, 46, 49, 51]],
  ["LO55", "Languages: Karen", false, [20, 25, 29, 33, 38, 43, 50]],
  ["KH", "Languages: Khmer", false, [11, 17, 25, 34, 41, 47, 50]],
  ["KS", "Languages: Korean Second Language", false, [21, 29, 36, 42, 47, 51, 53]],
  ["LA", "Languages: Latin", false, [35, 42, 46, 50, 53, 54, 55]],
  ["MA", "Languages: Macedonian", false, [21, 27, 32, 37, 42, 47, 51]],
  ["PN", "Languages: Persian", false, [16, 20, 24, 29, 34, 40, 50]],
  ["LO49", "Languages: Punjabi", false, [22, 28, 33, 39, 43, 47, 50]],
  ["RU", "Languages: Russian", false, [23, 29, 34, 39, 44, 47, 50]],
  ["SE", "Languages: Serbian", false, [22, 26, 31, 36, 40, 45, 50]],
  ["SI", "Languages: Sinhala", false, [25, 30, 35, 39, 43, 47, 50]],
  ["SP", "Languages: Spanish", false, [26, 31, 35, 40, 44, 47, 50]],
  ["TU", "Languages: Turkish", false, [21, 25, 29, 34, 38, 43, 50]],
  ["LO54", "Languages: Vietnamese First Language", false, [19, 24, 29, 35, 40, 45, 50]],
  ["LO31", "Languages: Vietnamese Second Language", false, [26, 31, 36, 40, 43, 47, 50]],
  ["LOS", "Languages: other small LOTE", false, [24, 30, 35, 40, 44, 48, 51]],
  ["LS", "Legal Studies", false, [18, 23, 28, 34, 40, 45, 50]],
  ["LI", "Literature", true, [20, 26, 31, 36, 41, 46, 50]],
  ["MA10", "Mathematics: Foundation Mathematics", false, [12, 16, 20, 26, 32, 40, 50]],
  ["NF", "Mathematics: General Mathematics", false, [18, 23, 28, 33, 38, 44, 50]],
  ["NJ", "Mathematics: Mathematical Methods", false, [21, 28, 35, 41, 46, 49, 51]],
  ["NS", "Mathematics: Specialist Mathematics", false, [29, 36, 43, 48, 51, 54, 55]],
  ["ME", "Media", false, [16, 21, 26, 32, 38, 44, 50]],
  ["MD", "Music: Composition", false, [21, 26, 31, 36, 41, 45, 50]],
  ["MC6", "Music: Contemporary Performance", false, [17, 22, 27, 33, 38, 44, 50]],
  ["MC5", "Music: Inquiry", false, [18, 23, 28, 33, 38, 44, 50]],
  ["MC4", "Music: Repertoire Performance", false, [22, 27, 32, 37, 42, 46, 50]],
  ["OS", "Outdoor and Environmental Studies", false, [15, 20, 24, 30, 36, 42, 50]],
  ["PL", "Philosophy", false, [19, 24, 29, 35, 40, 45, 50]],
  ["PE", "Physical Education", false, [17, 22, 27, 33, 38, 44, 50]],
  ["PH", "Physics", false, [20, 26, 32, 37, 42, 47, 50]],
  ["PS6", "Politics", false, [21, 27, 32, 37, 42, 46, 50]],
  ["DT", "Product Design and Technologies", false, [14, 19, 24, 29, 36, 42, 50]],
  ["PY", "Psychology", false, [18, 23, 28, 34, 39, 45, 50]],
  ["RS", "Religion and Society", false, [18, 23, 28, 34, 39, 45, 50]],
  ["SO3", "Sociology", false, [15, 20, 25, 31, 38, 44, 50]],
  ["SE3", "Systems Engineering", false, [17, 21, 26, 32, 37, 43, 50]],
  ["TT", "Texts and Traditions", false, [17, 22, 27, 32, 37, 43, 50]],
  ["TS", "Theatre Studies", false, [18, 23, 28, 34, 39, 45, 50]],
  ["VC", "Visual Communication Design", false, [16, 21, 26, 32, 38, 44, 50]],
  ["BU23", "VCE VET Business", false, [14, 19, 23, 28, 34, 41, 50]],
  ["CT41", "VCE VET Community Services", false, [15, 19, 24, 30, 35, 42, 50]],
  ["MU07", "VCE VET Creative and Digital Media", false, [17, 21, 26, 30, 36, 42, 50]],
  ["DN17", "VCE VET Dance", false, [20, 24, 28, 32, 36, 41, 50]],
  ["EG47", "VCE VET Engineering", false, [17, 21, 25, 29, 34, 40, 50]],
  ["EQ08", "VCE VET Equine Studies", false, [15, 20, 26, 32, 38, 44, 50]],
  ["FN40", "VCE VET Furnishing", false, [18, 22, 26, 30, 35, 40, 50]],
  ["HL08", "VCE VET Health (Allied)", false, [15, 20, 25, 30, 36, 43, 50]],
  ["HL06", "VCE VET Health Services Assistance", false, [14, 20, 25, 32, 38, 45, 50]],
  ["HS63", "VCE VET Hospitality", false, [15, 19, 24, 29, 35, 42, 50]],
  ["HS65", "VCE VET Hospitality (Cookery)", false, [14, 18, 23, 28, 34, 41, 50]],
  ["IN60", "VCE VET Information Technology", false, [16, 20, 25, 30, 36, 42, 50]],
  ["ET16", "VCE VET Integrated Technologies", false, [20, 25, 30, 35, 40, 45, 50]],
  ["LB26", "VCE VET Laboratory Skills", false, [20, 25, 30, 34, 39, 44, 50]],
  ["MI19", "VCE VET Music Performance", false, [19, 22, 26, 30, 35, 41, 50]],
  ["MI30", "VCE VET Music Sound Production", false, [18, 22, 27, 32, 38, 43, 50]],
  ["SR80", "VCE VET Sport and Recreation", false, [15, 19, 23, 28, 34, 41, 50]],
];

const STUDY_BY_CODE = Object.fromEntries(STUDIES.map((s) => [s[0], s]));

// VTAC 2025 aggregate -> minimum-ATAR table  [aggregate, ATAR]
const ATAR_TABLE = [
  [80.53, 40], [87.44, 45], [94.06, 50], [100.64, 55], [107.03, 60],
  [109.74, 62], [112.34, 64], [113.64, 65], [114.99, 66], [117.73, 68],
  [120.42, 70], [123.27, 72], [126.21, 74], [127.68, 75], [129.18, 76],
  [132.22, 78], [135.65, 80], [139.0, 82], [142.52, 84], [144.45, 85],
  [146.36, 86], [150.51, 88], [155.19, 90], [157.79, 91], [160.53, 92],
  [163.3, 93], [166.49, 94], [169.85, 95], [173.56, 96], [178.1, 97],
  [180.84, 97.5], [183.81, 98], [187.53, 98.5], [192.1, 99], [194.8, 99.25],
  [198.2, 99.5], [199.91, 99.6], [201.93, 99.7], [204.33, 99.8], [208.08, 99.9],
];

// Victorian school reference medians = whole-school median VCE study score (publicly reported
// 2024 data; ≈ where the median-ranked student lands). Per-subject moderation varies, so each
// subject can override below. "approx." marks figures inferred from public ranking position.
const SCHOOLS = [
  { key: "mentone", name: "Mentone Grammar", mean: 35, band: "Strong" },
  { key: "macrob", name: "Mac.Robertson Girls' High (selective)", mean: 37, band: "Very strong" },
  { key: "melbhigh", name: "Melbourne High School (selective)", mean: 36, band: "Very strong" },
  { key: "nossal", name: "Nossal High School (selective, approx.)", mean: 36, band: "Very strong" },
  { key: "clarendon", name: "Ballarat Clarendon College", mean: 37, band: "Very strong" },
  { key: "scotch", name: "Scotch College (approx.)", mean: 36, band: "Strong" },
  { key: "haileybury", name: "Haileybury College", mean: 36, band: "Strong" },
  { key: "melbgrammar", name: "Melbourne Grammar School", mean: 36, band: "Strong" },
  { key: "mentonegirls", name: "Mentone Girls' Grammar", mean: 36, band: "Strong" },
  { key: "brighton", name: "Brighton Grammar School (approx.)", mean: 34, band: "Strong" },
  { key: "pegs", name: "Penleigh & Essendon Grammar", mean: 34, band: "Strong" },
  { key: "caulfield", name: "Caulfield Grammar School (approx.)", mean: 33, band: "Above average" },
  { key: "balwyn", name: "Balwyn High School (approx.)", mean: 33, band: "Above average" },
  { key: "mckinnon", name: "McKinnon Secondary College (approx.)", mean: 33, band: "Above average" },
  { key: "sandringham", name: "Sandringham College (approx.)", mean: 30, band: "Average" },
  { key: "beaumaris", name: "Beaumaris Secondary College", mean: 30, band: "Average" },
  { key: "typical", name: "Typical school — state median", mean: 30, band: "Average" },
  { key: "belowmed", name: "Below state median (reference)", mean: 27, band: "Below average" },
  { key: "custom", name: "Other / enter custom median", mean: 30, band: "Custom" },
];

// Per-subject override bands (anchor = cohort median study score)
const BANDS = [
  { key: "school", label: "Same as my school" },
  { key: "verystrong", label: "Very strong (\u224837)", mean: 37 },
  { key: "strong", label: "Strong (\u224834)", mean: 34 },
  { key: "above", label: "Above average (\u224832)", mean: 32 },
  { key: "average", label: "Average \u2014 state median (30)", mean: 30 },
  { key: "below", label: "Below average (\u224827)", mean: 27 },
  { key: "custom", label: "Custom median\u2026" },
];

function resolveMean(row, schoolMean) {
  if (!row.cohortKey || row.cohortKey === "school") return schoolMean;
  if (row.cohortKey === "custom") return row.customMean !== "" ? Number(row.customMean) : 30;
  const b = BANDS.find((x) => x.key === row.cohortKey);
  return b && b.mean != null ? b.mean : schoolMean;
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Inverse normal CDF (Acklam) — probit
function normInv(p) {
  if (p <= 0) return -3.5;
  if (p >= 1) return 3.5;
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const plow = 0.02425, phigh = 1 - plow;
  let q, r;
  if (p < plow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p <= phigh) {
    q = p - 0.5; r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
}

// Monotone cubic (Fritsch–Carlson) interpolator through (0,0) + the 7 anchors.
function makeInterpolator(points) {
  const xs = [0, 20, 25, 30, 35, 40, 45, 50];
  const ys = [0, ...points];
  const n = xs.length;
  const h = [], d = [];
  for (let i = 0; i < n - 1; i++) { h[i] = xs[i + 1] - xs[i]; d[i] = (ys[i + 1] - ys[i]) / h[i]; }
  const m = new Array(n);
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) m[i] = 0;
    else {
      const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1];
      m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
    }
  }
  return (x) => {
    let q = x;
    if (q <= 0) return 0;
    if (q >= 50) q = 50;
    let i = 0;
    while (i < n - 2 && q > xs[i + 1]) i++;
    const t = (q - xs[i]) / h[i], t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h[i] * m[i] +
      (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h[i] * m[i + 1];
  };
}

const round05 = (v) => Math.round(v / 0.05) * 0.05;

function aggregateToAtar(agg) {
  if (agg < ATAR_TABLE[0][0]) return { value: null, label: "< 40" };
  const top = ATAR_TABLE[ATAR_TABLE.length - 1];
  if (agg >= top[0]) return { value: Math.min(99.95, round05(top[1] + (agg - top[0]) * (0.05 / 3))) };
  for (let i = 0; i < ATAR_TABLE.length - 1; i++) {
    const [a0, t0] = ATAR_TABLE[i], [a1, t1] = ATAR_TABLE[i + 1];
    if (agg >= a0 && agg <= a1) {
      return { value: Math.min(99.95, round05(t0 + ((agg - a0) / (a1 - a0)) * (t1 - t0))) };
    }
  }
  return { value: null, label: "< 40" };
}

const FMT = (n, d = 2) => (n == null ? "—" : Number(n).toFixed(d));
// VCAA graded-assessment structure per study (2023–2027 study designs).
// Single-exam studies that aren't the 25/25/50 default: store the exam fraction here.
const SINGLE_EXAM_WEIGHT = {
  BI: 0.60, CH: 0.60, PH: 0.60, PY: 0.60, EV: 0.60, // sciences: SAC 40 / exam 60
  DT: 0.30,                                          // Product Design (School-assessed Task heavy)
  MA10: 0.40,                                        // Foundation Maths: SAC 60 / exam 40
};

// Studies with MULTIPLE externally-assessed components. SAC weight = 1 − sum of these.
const LANG_CODES = ["AR","CN","LO57","CK","CL","FR","GN","MG","HB","HID","IX","IL","JS","LO55","KH","KS","LA","MA","PN","LO49","RU","SE","SI","SP","TU","LO54","LO31","LOS"];
const LANG_COMPONENTS = [
  { key: "oral", label: "Oral exam", weight: 0.125 },
  { key: "written", label: "Written exam", weight: 0.375 },
];
const EXAM_COMPONENTS = {
  NJ: [{ key: "e1", label: "Exam 1 (tech-free)", weight: 0.20 }, { key: "e2", label: "Exam 2 (tech-active)", weight: 0.40 }],
  NS: [{ key: "e1", label: "Exam 1 (tech-free)", weight: 0.30 }, { key: "e2", label: "Exam 2 (tech-active)", weight: 0.30 }],
  NF: [{ key: "e1", label: "Exam 1", weight: 0.30 }, { key: "e2", label: "Exam 2", weight: 0.30 }],
  MC6: [{ key: "perf", label: "Performance exam", weight: 0.50 }, { key: "aw", label: "Aural & written exam", weight: 0.20 }],
  MC4: [{ key: "perf", label: "Performance exam", weight: 0.50 }, { key: "aw", label: "Aural & written exam", weight: 0.20 }],
};
LANG_CODES.forEach((c) => { EXAM_COMPONENTS[c] = LANG_COMPONENTS; });

function getComponents(code) {
  if (EXAM_COMPONENTS[code]) return EXAM_COMPONENTS[code];
  const w = SINGLE_EXAM_WEIGHT[code] != null ? SINGLE_EXAM_WEIGHT[code] : 0.5;
  return [{ key: "exam", label: "Exam", weight: w }];
}
const fmtPct = (w) => String(Number((w * 100).toFixed(1)));

const INITIAL_ATAR_ROWS = [
  { id: 1, code: "", score: "30" },
  { id: 2, code: "", score: "30" },
  { id: 3, code: "", score: "30" },
  { id: 4, code: "", score: "30" },
  { id: 5, code: "", score: "30" },
];

const INITIAL_SS_ROWS = [
  { id: 1, code: "", rank: "", size: "", cohortKey: "school", customMean: "", exams: {} },
  { id: 2, code: "", rank: "", size: "", cohortKey: "school", customMean: "", exams: {} },
  { id: 3, code: "", rank: "", size: "", cohortKey: "school", customMean: "", exams: {} },
];

// Searchable subject picker (used wherever there's a long study list)
function SubjectSelect({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((o) => o[0] === value);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o[1].toLowerCase().includes(q));
  }, [query, options]);
  return (
    <div className="vce-combo">
      <input
        className="vce-select"
        type="text"
        value={open ? query : selected ? selected[1] : ""}
        placeholder="Search study…"
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => { setQuery(""); setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && (
        <ul className="vce-combolist">
          {matches.length ? matches.map((o) => (
            <li key={o[0]} className={`vce-comboitem ${o[0] === value ? "sel" : ""}`} onMouseDown={() => { onChange(o[0]); setOpen(false); }}>
              <span className="vce-comboname">{o[1]}</span>
            </li>
          )) : <li className="vce-comboempty">No match</li>}
        </ul>
      )}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("atar");
  const [rows, setRows] = useState(INITIAL_ATAR_ROWS);
  const [ssRows, setSsRows] = useState(INITIAL_SS_ROWS);
  const [schoolKey, setSchoolKey] = useState("");
  const [schoolQuery, setSchoolQuery] = useState("");
  const [schoolOpen, setSchoolOpen] = useState(false);
  const [schoolCustomMean, setSchoolCustomMean] = useState("");
  const [showMethod, setShowMethod] = useState(false);

  const schoolMean = useMemo(() => {
    if (schoolKey === "custom") return schoolCustomMean !== "" ? Number(schoolCustomMean) : 30;
    const s = SCHOOLS.find((x) => x.key === schoolKey);
    return s ? s.mean : 30;
  }, [schoolKey, schoolCustomMean]);

  const schoolMatches = useMemo(() => {
    const q = schoolQuery.trim().toLowerCase();
    if (!q) return SCHOOLS;
    const sel = SCHOOLS.find((s) => s.key === schoolKey);
    if (sel && sel.name === schoolQuery) return SCHOOLS; // showing current selection — list all
    return SCHOOLS.filter((s) => s.name.toLowerCase().includes(q) || s.band.toLowerCase().includes(q));
  }, [schoolQuery, schoolKey]);

  const selectSchool = (s) => { setSchoolKey(s.key); setSchoolQuery(s.name); setSchoolOpen(false); };

  const interps = useMemo(() => {
    const map = {};
    for (const [code, , , pts] of STUDIES) map[code] = makeInterpolator(pts);
    return map;
  }, []);
  const sortedStudies = useMemo(() => [...STUDIES].sort((a, b) => a[1].localeCompare(b[1])), []);

  // ---------- ATAR engine ----------
  const result = useMemo(() => {
    const valid = rows
      .filter((r) => r.code && r.score !== "" && !isNaN(Number(r.score)))
      .map((r) => {
        const raw = clamp(Number(r.score), 0, 50);
        const study = STUDY_BY_CODE[r.code];
        return { rowId: r.id, code: r.code, name: study[1], isEnglish: study[2], raw, scaled: interps[r.code](raw) };
      });
    const englishEntries = valid.filter((v) => v.isEnglish);
    const hasEnglish = englishEntries.length > 0;
    const roles = {};
    let aggregate = 0;
    const contributions = [];
    if (hasEnglish) {
      const bestEnglish = englishEntries.reduce((a, b) => (b.scaled > a.scaled ? b : a));
      roles[bestEnglish.rowId] = "english";
      contributions.push({ entry: bestEnglish, role: "english", amount: bestEnglish.scaled });
      aggregate += bestEnglish.scaled;
      const others = valid.filter((v) => v.rowId !== bestEnglish.rowId).sort((a, b) => b.scaled - a.scaled);
      others.forEach((e, i) => {
        if (i < 3) { roles[e.rowId] = "primary"; contributions.push({ entry: e, role: "primary", amount: e.scaled }); aggregate += e.scaled; }
        else if (i < 5) { roles[e.rowId] = "increment"; const amt = e.scaled * 0.1; contributions.push({ entry: e, role: "increment", amount: amt }); aggregate += amt; }
        else roles[e.rowId] = "excluded";
      });
    } else valid.forEach((v) => (roles[v.rowId] = "excluded"));
    const atar = hasEnglish ? aggregateToAtar(aggregate) : null;
    return { valid, roles, aggregate, contributions, atar, hasEnglish, countedStudies: contributions.length };
  }, [rows, interps]);

  // ---------- SAC + exam estimator ----------
  const ssResults = useMemo(() => {
    return ssRows.map((row) => {
      if (!row.code) return { id: row.id, incomplete: true };
      const size = Number(row.size), rank = Number(row.rank);
      const haveSac = row.rank !== "" && row.size !== "" && size > 0 && rank >= 1 && rank <= size;
      const comps = getComponents(row.code);
      const exams = row.exams || {};
      const provided = comps.filter((c) => exams[c.key] !== undefined && exams[c.key] !== "" && !isNaN(Number(exams[c.key])));
      const haveExam = provided.length > 0;
      if (!haveSac && !haveExam)
        return { id: row.id, code: row.code, name: STUDY_BY_CODE[row.code][1], ssRaw: 30, scaled: interps[row.code](30), isDefault: true, haveSac: false, haveExam: false };
      const examTotalW = comps.reduce((s, c) => s + c.weight, 0);
      const sacW = 1 - examTotalW;
      let q = null, zSac = null, ssSac = null;
      if (haveSac) {
        q = 1 - (rank - 0.5) / size;
        ssSac = clamp(resolveMean(row, schoolMean) + 6.5 * normInv(q), 0, 50);
        zSac = (ssSac - 30) / 7;
      }
      // Weighted combine over whichever components are present (normalised by included weight).
      let num = 0, den = 0, examNum = 0, examDen = 0;
      if (haveSac) { num += sacW * zSac; den += sacW; }
      provided.forEach((c) => {
        const z = (Number(exams[c.key]) - 60) / 15;
        num += c.weight * z; den += c.weight;
        examNum += c.weight * z; examDen += c.weight;
      });
      const zFinal = den > 0 ? num / den : 0;
      const ssRaw = Math.round(clamp(30 + 7 * zFinal, 0, 50));
      const ssExam = examDen > 0 ? clamp(30 + 7 * (examNum / examDen), 0, 50) : null;
      return {
        id: row.id, code: row.code, name: STUDY_BY_CODE[row.code][1],
        q, ssSac, ssExam, ssRaw, scaled: interps[row.code](ssRaw), haveSac, haveExam,
      };
    });
  }, [ssRows, interps, schoolMean]);

  // ---------- row helpers ----------
  const nextAtarId = useMemo(() => Math.max(0, ...rows.map((r) => r.id)) + 1, [rows]);
  const nextSsId = useMemo(() => Math.max(0, ...ssRows.map((r) => r.id)) + 1, [ssRows]);
  const addRow = () => setRows((r) => [...r, { id: nextAtarId, code: "", score: "30" }]);
  const removeRow = (id) => setRows((r) => r.filter((x) => x.id !== id));
  const update = (id, patch) => setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const addSs = () => setSsRows((r) => [...r, { id: nextSsId, code: "", rank: "", size: "", cohortKey: "school", customMean: "", exams: {} }]);
  const removeSs = (id) => setSsRows((r) => r.filter((x) => x.id !== id));
  const updateSs = (id, patch) => setSsRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const pushToAtar = () => {
    const built = ssResults
      .filter((r) => r.code && !r.incomplete && r.ssRaw != null)
      .map((r, i) => ({ id: i + 1, code: r.code, score: String(r.ssRaw) }));
    if (built.length) { setRows(built); setTab("atar"); }
  };

  const { atar, aggregate, hasEnglish, valid, countedStudies } = result;
  const atarValue = atar && atar.value != null ? atar.value : null;
  const markerPct = atarValue != null ? clamp((atarValue / 99.95) * 100, 2, 98) : 12;
  const MAX_AGG = 211;
  const roleMeta = {
    english: { tag: "English · primary 4", cls: "vce-pill-eng" },
    primary: { tag: "Primary 4", cls: "vce-pill-pri" },
    increment: { tag: "+10% increment", cls: "vce-pill-inc" },
    excluded: { tag: "Not counted", cls: "vce-pill-exc" },
  };

  return (
    <div className="vce-root">
      <style>{CSS}</style>

      <header className="vce-head">
        <div className="vce-eyebrow">VCE · Victorian Certificate of Education</div>
        <h1 className="vce-title">Study score &amp; ATAR calculator</h1>
        <p className="vce-sub">
          Work backwards from SAC ranks and exam marks to a study score, or forwards from
          study scores to an ATAR. Built on VTAC&rsquo;s 2025 scaling figures.
        </p>
        <button className="vce-methodbtn" onClick={() => setShowMethod((s) => !s)}>
          <Info size={14} /> {showMethod ? "Hide" : "How this works"}
        </button>
        {showMethod && (
          <div className="vce-method">
            <p><b>Study score → ATAR.</b> Each raw score is scaled along VTAC&rsquo;s published 2025 curve. Your best English-study score plus the next three best form the &ldquo;primary four&rdquo;; 10% of the 5th and 6th best are added. The aggregate is read off VTAC&rsquo;s 2025 aggregate-to-ATAR table.</p>
            <p><b>SAC + exam → study score.</b> Your raw study score is your statewide percentile in the subject. The exam is already statewide-comparable; your SACs are <b>moderated</b> against your school cohort&rsquo;s strength (school scaling) and your rank within it. Everything is combined using VCAA&rsquo;s fixed graded-assessment weightings for that study — including each separate exam component where they exist (oral + written for languages, two technology exams for maths, performance + aural/written for music performance) — then read on the 0–50 study-score scale (mean 30).</p>
            <p className="vce-disclaimer">Estimates only. Moderation and scaling move every year with the cohort, and exact mark-to-percentile curves vary by subject. School medians are whole-school figures from publicly reported 2024 VCE results (some inferred from ranking position, marked &ldquo;approx.&rdquo;) and a school strong overall can be weaker in a given subject — so override per subject where it matters. Official study scores are set by VCAA; the ATAR is issued by VTAC.</p>
          </div>
        )}

        <div className="vce-tabs" role="tablist">
          <button className={`vce-tab ${tab === "ss" ? "active" : ""}`} onClick={() => setTab("ss")}>SAC + exam → study score</button>
          <button className={`vce-tab ${tab === "atar" ? "active" : ""}`} onClick={() => setTab("atar")}>Study score → ATAR</button>
        </div>
      </header>

      {tab === "atar" ? (
        <div className="vce-grid">
          {/* INPUTS */}
          <section className="vce-panel">
            <div className="vce-panel-head">
              <h2>Your studies</h2>
              <span className="vce-count">{valid.length} entered</span>
            </div>
            <div className="vce-rows">
              <div className="vce-row vce-row-labels"><span>Study</span><span>Raw</span><span>Scaled</span><span /></div>
              {rows.map((row) => {
                const study = row.code ? STUDY_BY_CODE[row.code] : null;
                const ev = valid.find((v) => v.rowId === row.id);
                const role = result.roles[row.id];
                const delta = ev ? ev.scaled - ev.raw : 0;
                return (
                  <div className="vce-row" key={row.id}>
                    <div className="vce-selwrap">
                      <SubjectSelect value={row.code} options={sortedStudies} onChange={(code) => update(row.id, { code })} />
                      {study && role && <span className={`vce-pill ${roleMeta[role].cls}`}>{roleMeta[role].tag}</span>}
                    </div>
                    <input className="vce-score" type="number" min="0" max="50" placeholder="–" value={row.score}
                      onChange={(e) => update(row.id, { score: e.target.value })} />
                    <div className="vce-scaled">
                      {ev ? (
                        <>
                          <span className="vce-scaledval">{FMT(ev.scaled, 1)}</span>
                          <span className={`vce-delta ${delta >= 0 ? "vce-up" : "vce-down"}`}>
                            {delta >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{Math.abs(delta).toFixed(1)}
                          </span>
                        </>
                      ) : <span className="vce-scaledval vce-muted">—</span>}
                    </div>
                    <button className="vce-remove" onClick={() => removeRow(row.id)} aria-label="Remove study"><X size={15} /></button>
                  </div>
                );
              })}
            </div>
            <button className="vce-add" onClick={addRow}><Plus size={15} /> Add a study</button>
            {!hasEnglish && <div className="vce-warn">An ATAR needs an English study (English, EAL, English Language or Literature). Add one to calculate.</div>}
            {hasEnglish && valid.length < 4 && <div className="vce-note">A full ATAR uses at least four studies. Add more for a complete estimate.</div>}
          </section>

          {/* RESULTS */}
          <section className="vce-results">
            <div className="vce-hero">
              <div className="vce-hero-label">Estimated ATAR</div>
              <div className="vce-atar">{atarValue != null ? atarValue.toFixed(2) : atar ? atar.label : "—"}</div>
              <div className="vce-rank">
                {atarValue != null ? `Ranked higher than about ${Math.round(atarValue)}% of your age group`
                  : hasEnglish ? "Below the reported range — keep adding scores" : "Add an English study to see your rank"}
              </div>
              <div className="vce-track">
                <div className="vce-track-bar" />
                <div className="vce-track-fill" style={{ width: `${markerPct}%` }} />
                <div className="vce-track-marker" style={{ left: `${markerPct}%` }} />
                <div className="vce-track-scale"><span>0</span><span>50</span><span>90</span><span>99.95</span></div>
              </div>
              <div className="vce-aggline">Scaled aggregate <b>{FMT(aggregate)}</b><span className="vce-aggmax"> / ~211 max</span></div>
            </div>
            <div className="vce-build">
              <div className="vce-build-head"><h3>How the aggregate is built</h3><span className="vce-count">{countedStudies} of 6 count</span></div>
              {countedStudies > 0 ? (
                <>
                  <div className="vce-stack">
                    {result.contributions.map((c) => (
                      <div key={c.entry.rowId} className={`vce-seg vce-seg-${c.role}`}
                        style={{ width: `${(c.amount / MAX_AGG) * 100}%` }} title={`${c.entry.name}: +${c.amount.toFixed(2)}`} />
                    ))}
                  </div>
                  <ul className="vce-clist">
                    {result.contributions.map((c) => (
                      <li key={c.entry.rowId}>
                        <span className={`vce-dot vce-seg-${c.role}`} />
                        <span className="vce-cname">{c.entry.name}</span>
                        <span className={`vce-pill ${roleMeta[c.role].cls}`}>{roleMeta[c.role].tag}</span>
                        <span className="vce-camt">{c.role === "increment" ? `${c.entry.scaled.toFixed(1)} × 10% = +${c.amount.toFixed(2)}` : `+${c.amount.toFixed(2)}`}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : <p className="vce-empty">Enter scores with an English study to see each subject&rsquo;s contribution.</p>}
            </div>
          </section>
        </div>
      ) : (
        /* ---------- SAC + EXAM ESTIMATOR ---------- */
        <div className="vce-sswrap">
          <div className="vce-schoolbar">
            <div className="vce-field vce-schoolfield">
              <label>Your school <span className="vce-hint">type to search — sets the default SAC moderation for every subject</span></label>
              <div className="vce-schoolrow">
                <div className="vce-combo">
                  <input
                    className="vce-select vce-schoolsel"
                    type="text"
                    value={schoolQuery}
                    placeholder="Search your school…"
                    onChange={(e) => { setSchoolQuery(e.target.value); setSchoolOpen(true); }}
                    onFocus={() => setSchoolOpen(true)}
                    onBlur={() => setTimeout(() => setSchoolOpen(false), 150)}
                  />
                  {schoolOpen && (
                    <ul className="vce-combolist">
                      {schoolMatches.length ? schoolMatches.map((s) => (
                        <li key={s.key} className={`vce-comboitem ${s.key === schoolKey ? "sel" : ""}`} onMouseDown={() => selectSchool(s)}>
                          <span className="vce-comboname">{s.mine ? "★ " : ""}{s.name}</span>
                          <span className="vce-comboband">{s.band === "Custom" ? "custom" : `${s.band} · ${s.mean}`}</span>
                        </li>
                      )) : <li className="vce-comboempty">No match — pick &ldquo;Other&rdquo; to set a custom median</li>}
                    </ul>
                  )}
                </div>
                <span className="vce-schoolmean">median <b>~{schoolMean}</b></span>
              </div>
              {schoolKey === "custom" && (
                <input className="vce-mini vce-customMean" type="number" min="0" max="50" placeholder="your school's median study score"
                  value={schoolCustomMean} onChange={(e) => setSchoolCustomMean(e.target.value)} />
              )}
            </div>
          </div>

          <div className="vce-ssbar">
            <p className="vce-ssintro">
              Enter your <b>SAC rank</b> in the cohort and your expected <b>exam mark</b>. Your school sets how
              SACs are moderated; a stronger cohort lifts the same rank higher. Override any subject below.
            </p>
            <button className="vce-pushbtn" onClick={pushToAtar}>Use these in ATAR calculator <ArrowRight size={15} /></button>
          </div>

          <div className="vce-sscards">
            {ssRows.map((row) => {
              const res = ssResults.find((r) => r.id === row.id);
              return (
                <div className="vce-sscard" key={row.id}>
                  <div className="vce-sscard-top">
                    <SubjectSelect value={row.code} options={sortedStudies} onChange={(code) => updateSs(row.id, { code })} />
                    <button className="vce-remove" onClick={() => removeSs(row.id)} aria-label="Remove study"><X size={15} /></button>
                  </div>

                  <div className="vce-field">
                    <label>SAC rank in cohort</label>
                    <div className="vce-rankrow">
                      <input className="vce-mini" type="number" min="1" placeholder="rank" value={row.rank}
                        onChange={(e) => updateSs(row.id, { rank: e.target.value })} />
                      <span className="vce-of">of</span>
                      <input className="vce-mini" type="number" min="1" placeholder="cohort" value={row.size}
                        onChange={(e) => updateSs(row.id, { size: e.target.value })} />
                      {res && res.q != null && <span className="vce-pctile">top {Math.max(1, Math.round((1 - res.q) * 100))}%</span>}
                    </div>
                  </div>

                  <div className="vce-field">
                    <label>Cohort strength <span className="vce-hint">anchor ≈ {resolveMean(row, schoolMean)} median</span></label>
                    <select className="vce-select" value={row.cohortKey} onChange={(e) => updateSs(row.id, { cohortKey: e.target.value })}>
                      {BANDS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                    {row.cohortKey === "custom" && (
                      <input className="vce-mini vce-customMean" type="number" min="0" max="50" placeholder="cohort median study score"
                        value={row.customMean} onChange={(e) => updateSs(row.id, { customMean: e.target.value })} />
                    )}
                  </div>

                  {row.code && (() => {
                    const comps = getComponents(row.code);
                    const sacW = fmtPct(1 - comps.reduce((s, c) => s + c.weight, 0));
                    return (
                      <>
                        <div className="vce-field">
                          <label>{comps.length > 1 ? "Expected exam marks" : "Expected exam mark"} <span className="vce-hint">~60% ≈ 30, ~80% ≈ 40, ~90% ≈ 45</span></label>
                          {comps.map((c) => (
                            <div className="vce-examrow" key={c.key}>
                              <span className="vce-examlabel">{c.label} <span className="vce-examwt">{fmtPct(c.weight)}%</span></span>
                              <div className="vce-rankrow">
                                <input className="vce-mini" type="number" min="0" max="100" placeholder="%"
                                  value={(row.exams && row.exams[c.key]) || ""}
                                  onChange={(e) => updateSs(row.id, { exams: { ...(row.exams || {}), [c.key]: e.target.value } })} />
                                <span className="vce-of">%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="vce-weightline">
                          VCAA · <b>{sacW}%</b> SAC{comps.map((c) => `  ·  ${c.label} ${fmtPct(c.weight)}%`).join("")}
                        </div>
                      </>
                    );
                  })()}

                  <div className="vce-ssout">
                    {res && !res.incomplete ? (
                      <>
                        <div className="vce-ssraw">
                          <span className={`vce-ssraw-num ${res.isDefault ? "vce-default" : ""}`}>{res.ssRaw}</span>
                          <span className="vce-ssraw-lab">est. raw study score</span>
                        </div>
                        <div className="vce-ssscaled">
                          <span className={`vce-ssscaled-num ${res.isDefault ? "vce-default" : ""}`}>{res.scaled.toFixed(1)}</span>
                          <span className="vce-ssraw-lab">scaled</span>
                        </div>
                      </>
                    ) : <div className="vce-ssempty">Select a study to begin</div>}
                  </div>
                  {res && res.isDefault && <div className="vce-ssbreak">default (30) — add a SAC rank or exam mark to refine</div>}
                  {res && !res.incomplete && !res.isDefault && (res.haveSac || res.haveExam) && (
                    <div className="vce-ssbreak">
                      {res.haveSac && <span>SAC&nbsp;≈&nbsp;{res.ssSac.toFixed(0)}</span>}
                      {res.haveSac && res.haveExam && <span className="vce-ssdot">·</span>}
                      {res.haveExam && <span>exam&nbsp;≈&nbsp;{res.ssExam.toFixed(0)}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <button className="vce-add" onClick={addSs}><Plus size={15} /> Add a study</button>
        </div>
      )}

      <footer className="vce-foot">Built on VTAC&rsquo;s 2025 Scaling Report. Estimates for planning only — your real scores come from VCAA and VTAC.</footer>
    </div>
  );
}

const CSS = `
.vce-root{
  --ink:#16182f; --ink2:#222547; --paper:#eceef4; --card:#ffffff;
  --accent:#3f3ddb; --gold:#e7a013; --up:#1d9d6b; --down:#dd5b53;
  --muted:#6a6e88; --line:#e3e5ef; --line2:#d3d6e4;
  --mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;
  --sans:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  font-family:var(--sans); color:var(--ink); background:var(--paper);
  padding:28px 20px 48px; min-height:100%; box-sizing:border-box;
}
.vce-root *{box-sizing:border-box;}
.vce-head{max-width:1080px;margin:0 auto 22px;}
.vce-eyebrow{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--accent);font-weight:700;}
.vce-title{font-size:34px;line-height:1.05;margin:8px 0 6px;letter-spacing:-.02em;font-weight:800;}
.vce-sub{margin:0;color:var(--muted);font-size:15px;max-width:62ch;line-height:1.5;}
.vce-methodbtn{margin-top:14px;display:inline-flex;align-items:center;gap:6px;background:none;border:1px solid var(--line2);
  color:var(--ink2);padding:6px 11px;border-radius:99px;font-size:12.5px;font-weight:600;cursor:pointer;font-family:inherit;}
.vce-methodbtn:hover{border-color:var(--accent);color:var(--accent);}
.vce-method{margin-top:14px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 18px;max-width:74ch;}
.vce-method p{margin:0 0 10px;font-size:13.5px;line-height:1.55;color:var(--ink2);}
.vce-method p:last-child{margin-bottom:0;}
.vce-method b{color:var(--ink);}
.vce-disclaimer{color:var(--muted)!important;font-size:12.5px!important;border-top:1px solid var(--line);padding-top:10px;}

.vce-tabs{display:flex;gap:4px;margin-top:20px;background:#e2e4ee;padding:4px;border-radius:12px;width:fit-content;max-width:100%;flex-wrap:wrap;}
.vce-tab{border:none;background:none;padding:9px 16px;border-radius:9px;font-size:13.5px;font-weight:700;color:var(--muted);cursor:pointer;font-family:inherit;}
.vce-tab.active{background:#fff;color:var(--ink);box-shadow:0 1px 3px rgba(20,20,40,.12);}

.vce-grid{max-width:1080px;margin:0 auto;display:grid;grid-template-columns:1fr;gap:18px;}
@media(min-width:920px){.vce-grid{grid-template-columns:0.9fr 1.1fr;align-items:start;}}
.vce-panel,.vce-results{display:flex;flex-direction:column;gap:14px;}
.vce-panel{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:20px;}
.vce-panel-head,.vce-build-head{display:flex;align-items:baseline;justify-content:space-between;}
.vce-panel-head h2,.vce-build-head h3{margin:0;font-size:16px;font-weight:800;letter-spacing:-.01em;}
.vce-count{font-size:11.5px;color:var(--muted);font-family:var(--mono);}

.vce-rows{display:flex;flex-direction:column;gap:9px;}
.vce-row{display:grid;grid-template-columns:1fr 58px 78px 30px;gap:9px;align-items:center;}
.vce-row-labels{font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);font-weight:700;padding:0 2px;}
.vce-row-labels span:nth-child(2),.vce-row-labels span:nth-child(3){text-align:right;}
.vce-selwrap{display:flex;flex-direction:column;gap:5px;min-width:0;}
.vce-select{width:100%;border:1px solid var(--line2);border-radius:10px;padding:9px 10px;font-size:13px;background:#fff;
  font-family:inherit;color:var(--ink);appearance:none;cursor:pointer;}
.vce-select:focus{outline:2px solid var(--accent);outline-offset:-1px;border-color:var(--accent);}
.vce-score{width:100%;border:1px solid var(--line2);border-radius:10px;padding:9px 8px;font-size:14px;text-align:right;
  font-family:var(--mono);color:var(--ink);background:#fff;}
.vce-score:focus{outline:2px solid var(--accent);outline-offset:-1px;border-color:var(--accent);}
.vce-scaled{display:flex;flex-direction:column;align-items:flex-end;gap:1px;}
.vce-scaledval{font-family:var(--mono);font-size:15px;font-weight:700;}
.vce-delta{display:inline-flex;align-items:center;gap:1px;font-family:var(--mono);font-size:11px;font-weight:600;}
.vce-up{color:var(--up);} .vce-down{color:var(--down);} .vce-muted{color:var(--line2);}
.vce-remove{border:none;background:none;color:var(--line2);cursor:pointer;display:flex;justify-content:center;padding:4px;border-radius:6px;}
.vce-remove:hover{color:var(--down);background:#fbecec;}

.vce-pill{font-size:9.5px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;padding:2px 7px;border-radius:99px;width:fit-content;}
.vce-pill-eng{background:#efe9ff;color:#5b3fd9;}
.vce-pill-pri{background:#e7f7f0;color:#157f55;}
.vce-pill-inc{background:#fdf2dd;color:#a9760a;}
.vce-pill-exc{background:#f0f1f6;color:#8a8da3;}

.vce-add{display:inline-flex;align-items:center;gap:6px;align-self:flex-start;background:var(--ink);color:#fff;border:none;
  padding:9px 14px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;margin-top:4px;}
.vce-add:hover{background:var(--ink2);}
.vce-warn{background:#fbecec;border:1px solid #f3cfcd;color:#a23a35;padding:11px 13px;border-radius:11px;font-size:13px;line-height:1.45;}
.vce-note{background:#fdf6e6;border:1px solid #f0e0bd;color:#8a6a1a;padding:11px 13px;border-radius:11px;font-size:13px;line-height:1.45;}

.vce-hero{background:var(--ink);color:#fff;border-radius:18px;padding:24px 24px 20px;position:relative;overflow:hidden;}
.vce-hero-label{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#a7abce;font-weight:700;}
.vce-atar{font-family:var(--mono);font-size:68px;line-height:1;font-weight:700;color:var(--gold);letter-spacing:-.02em;margin:6px 0 4px;}
.vce-rank{font-size:13.5px;color:#c9cce6;margin-bottom:18px;}
.vce-track{position:relative;padding-bottom:18px;}
.vce-track-bar{height:6px;border-radius:99px;background:#2c2f55;}
.vce-track-fill{position:absolute;top:0;left:0;height:6px;border-radius:99px;background:linear-gradient(90deg,#5a58e6,var(--gold));transition:width .35s ease;}
.vce-track-marker{position:absolute;top:-3px;width:12px;height:12px;border-radius:50%;background:#fff;border:3px solid var(--gold);transform:translateX(-50%);transition:left .35s ease;}
.vce-track-scale{display:flex;justify-content:space-between;font-family:var(--mono);font-size:10px;color:#8a8eb4;margin-top:9px;}
.vce-aggline{margin-top:6px;font-size:13px;color:#c9cce6;}
.vce-aggline b{font-family:var(--mono);color:#fff;font-size:15px;}
.vce-aggmax{color:#8a8eb4;font-family:var(--mono);font-size:11px;}
.vce-build{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:20px;}
.vce-stack{display:flex;gap:2px;height:30px;margin:12px 0 16px;border-radius:7px;overflow:hidden;background:#f3f4f9;}
.vce-seg{height:100%;transition:width .35s ease;min-width:2px;}
.vce-seg-english{background:#6a4fe0;} .vce-seg-primary{background:#2aa978;} .vce-seg-increment{background:#edb441;}
.vce-clist{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px;}
.vce-clist li{display:flex;align-items:center;gap:9px;font-size:13px;}
.vce-dot{width:10px;height:10px;border-radius:3px;flex-shrink:0;}
.vce-cname{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.vce-camt{font-family:var(--mono);font-size:12.5px;color:var(--ink2);font-weight:600;white-space:nowrap;}
.vce-empty{color:var(--muted);font-size:13.5px;margin:12px 0 0;}

/* estimator */
.vce-sswrap{max-width:1080px;margin:0 auto;}
.vce-schoolbar{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:14px 16px;margin-bottom:14px;}
.vce-schoolfield{gap:8px;}
.vce-schoolrow{display:flex;align-items:center;gap:12px;flex-wrap:wrap;}
.vce-schoolsel{max-width:440px;}
.vce-schoolmean{font-size:12.5px;color:var(--muted);white-space:nowrap;}
.vce-schoolmean b{font-family:var(--mono);color:var(--ink);font-size:15px;}
.vce-combo{position:relative;width:100%;}
.vce-combo input{width:100%;}
.vce-schoolrow .vce-combo{flex:1;min-width:240px;max-width:460px;}
.vce-sscard-top .vce-combo{flex:1;min-width:0;}
.vce-combo .vce-schoolsel{max-width:none;}
.vce-combolist{position:absolute;z-index:20;top:calc(100% + 4px);left:0;right:0;min-width:230px;margin:0;padding:4px;list-style:none;
  background:#fff;border:1px solid var(--line2);border-radius:12px;box-shadow:0 10px 30px rgba(20,20,40,.16);max-height:280px;overflow-y:auto;}
.vce-comboitem{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px;border-radius:8px;cursor:pointer;}
.vce-comboitem:hover{background:#eef0fb;}
.vce-comboitem.sel{background:#eae8fc;}
.vce-comboname{font-size:13px;color:var(--ink);}
.vce-comboband{font-family:var(--mono);font-size:10.5px;color:var(--muted);white-space:nowrap;}
.vce-comboempty{padding:10px;font-size:12.5px;color:var(--muted);}
.vce-default{color:var(--line2)!important;}
.vce-ssbar{display:flex;gap:14px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-bottom:16px;}
.vce-ssintro{margin:0;font-size:13.5px;color:var(--ink2);line-height:1.5;max-width:62ch;}
.vce-pushbtn{display:inline-flex;align-items:center;gap:6px;background:var(--accent);color:#fff;border:none;padding:10px 15px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;}
.vce-pushbtn:hover{background:#332fc4;}
.vce-sscards{display:grid;grid-template-columns:1fr;gap:14px;}
@media(min-width:760px){.vce-sscards{grid-template-columns:1fr 1fr;}}
@media(min-width:1100px){.vce-sscards{grid-template-columns:1fr 1fr 1fr;}}
.vce-sscard{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:12px;}
.vce-sscard-top{display:flex;gap:8px;align-items:center;}
.vce-field{display:flex;flex-direction:column;gap:6px;}
.vce-field label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--ink2);}
.vce-hint{font-weight:500;text-transform:none;letter-spacing:0;color:var(--muted);font-size:10.5px;}
.vce-rankrow{display:flex;align-items:center;gap:8px;}
.vce-mini{width:74px;border:1px solid var(--line2);border-radius:9px;padding:8px;font-size:14px;text-align:center;font-family:var(--mono);background:#fff;color:var(--ink);}
.vce-mini:focus{outline:2px solid var(--accent);outline-offset:-1px;}
.vce-customMean{width:100%;text-align:left;margin-top:6px;}
.vce-of{font-size:12.5px;color:var(--muted);}
.vce-pctile{font-size:11px;font-weight:700;color:#157f55;background:#e7f7f0;padding:3px 9px;border-radius:99px;margin-left:auto;}
.vce-range{width:100%;accent-color:var(--accent);}
.vce-ssout{display:flex;gap:18px;align-items:flex-end;border-top:1px solid var(--line);padding-top:12px;margin-top:2px;}
.vce-ssraw,.vce-ssscaled{display:flex;flex-direction:column;}
.vce-ssraw-num{font-family:var(--mono);font-size:34px;font-weight:700;line-height:1;color:var(--ink);}
.vce-ssscaled-num{font-family:var(--mono);font-size:34px;font-weight:700;line-height:1;color:var(--accent);}
.vce-ssraw-lab{font-size:10.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-top:4px;font-weight:600;}
.vce-ssempty{font-size:13px;color:var(--muted);padding:6px 0;}
.vce-ssbreak{font-family:var(--mono);font-size:11.5px;color:var(--muted);display:flex;gap:7px;}
.vce-ssdot{color:var(--line2);}
.vce-weightline{font-size:11.5px;color:var(--muted);background:#f3f4f9;border-radius:8px;padding:7px 10px;}
.vce-weightline b{color:var(--ink2);font-family:var(--mono);}
.vce-examrow{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:7px;}
.vce-examrow:last-child{margin-bottom:0;}
.vce-examlabel{font-size:12.5px;color:var(--ink2);}
.vce-examwt{font-family:var(--mono);font-size:10.5px;color:var(--muted);}

.vce-foot{max-width:1080px;margin:22px auto 0;font-size:11.5px;color:var(--muted);text-align:center;line-height:1.5;}
@media(prefers-reduced-motion:reduce){.vce-track-fill,.vce-track-marker,.vce-seg{transition:none;}}
`;
