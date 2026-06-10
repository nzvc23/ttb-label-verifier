export const GOVERNMENT_WARNING =
  "GOVERNMENT WARNING: (1) ACCORDING TO THE SURGEON GENERAL, WOMEN SHOULD NOT DRINK ALCOHOLIC BEVERAGES DURING PREGNANCY BECAUSE OF THE RISK OF BIRTH DEFECTS. (2) CONSUMPTION OF ALCOHOLIC BEVERAGES IMPAIRS YOUR ABILITY TO DRIVE A CAR OR OPERATE MACHINERY, AND MAY CAUSE HEALTH PROBLEMS.";

export function normalizeForComparison(str) {
  if (!str) return "";
  return str.toLowerCase().replace(/[''`]/g, "'").replace(/\s+/g, " ").trim();
}

export function checkGovernmentWarning(extracted) {
  if (!extracted) return { status: "fail", note: "Government warning not detected on label." };
  const clean = extracted.replace(/\s+/g, " ").trim();
  const expected = GOVERNMENT_WARNING.replace(/\s+/g, " ").trim();
  if (!clean.startsWith("GOVERNMENT WARNING:")) {
    return { status: "fail", note: "Warning statement must begin with 'GOVERNMENT WARNING:' in all capital letters." };
  }
  if (clean === expected) return { status: "pass", note: null };
  if (normalizeForComparison(clean) === normalizeForComparison(expected)) {
    return { status: "warn", note: "Warning text matches but may have minor capitalization or punctuation differences. Agent review recommended." };
  }
  if (clean.includes("SURGEON GENERAL") && clean.includes("BIRTH DEFECTS")) {
    return { status: "warn", note: "Warning statement detected but wording does not match the required text exactly. Agent review required." };
  }
  return { status: "fail", note: "Warning statement is present but does not match the required TTB language." };
}

export function compareField(submitted, extracted) {
  if (!extracted || extracted.trim() === "") return { status: "missing", note: "Could not read this field from the label image." };
  if (!submitted || submitted.trim() === "") return { status: "missing", note: "Not provided in application — unable to verify." };
  const a = normalizeForComparison(submitted);
  const b = normalizeForComparison(extracted);
  if (a === b) return { status: "pass", note: null };
  if (a.includes(b) || b.includes(a)) return { status: "warn", note: "Values are similar but not identical. Agent review recommended." };
  if (levenshteinDistance(a, b) <= Math.max(2, Math.floor(Math.min(a.length, b.length) * 0.1))) {
    return { status: "warn", note: "Minor difference detected. Could be a formatting variation — agent review recommended." };
  }
  return { status: "fail", note: "Values do not match." };
}

function levenshteinDistance(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j-1], dp[i-1][j], dp[i][j-1]);
    }
  }
  return dp[m][n];
}

export function fileToBase64(file) {
  return new Pro
