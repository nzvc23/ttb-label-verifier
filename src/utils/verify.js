export const GOVERNMENT_WARNING =
  "GOVERNMENT WARNING: (1) ACCORDING TO THE SURGEON GENERAL, WOMEN SHOULD NOT DRINK ALCOHOLIC BEVERAGES DURING PREGNANCY BECAUSE OF THE RISK OF BIRTH DEFECTS. (2) CONSUMPTION OF ALCOHOLIC BEVERAGES IMPAIRS YOUR ABILITY TO DRIVE A CAR OR OPERATE MACHINERY, AND MAY CAUSE HEALTH PROBLEMS.";

export function normalizeForComparison(str) {
  if (!str) return "";
  return str.toLowerCase().replace(/\s+/g, " ").trim();
}

export function checkGovernmentWarning(extracted) {
  if (!extracted) return { status: "fail", note: "Government warning not detected on label." };
  const clean = extracted.replace(/\s+/g, " ").trim();
  const expected = GOVERNMENT_WARNING.replace(/\s+/g, " ").trim();
  if (!clean.startsWith("GOVERNMENT WARNING:")) {
    return { status: "fail", note: "Warning statement must begin with GOVERNMENT WARNING: in all capital letters." };
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
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function extractLabelFields(imageBase64, mimeType, apiKey) {
  const prompt = `You are a TTB compliance tool. Examine this alcohol beverage label and extract the following fields. Return ONLY a JSON object with no markdown or explanation.

Fields to extract exactly as printed:
- brand_name
- class_type
- alcohol_content
- net_contents
- bottler_producer
- country_of_origin
- government_warning (preserve ALL capitalization exactly)

Return empty string for any field not visible.

{"brand_name":"","class_type":"","alcohol_content":"","net_contents":"","bottler_producer":"","country_of_origin":"","government_warning":""}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-5",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mimeType, data: imageBase64 } },
            { type: "text", text: prompt },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || "API error " + response.status);
  }

  const data = await response.json();
  const text = data.content.map((c) => c.text || "").join("");
  try {
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch {
    throw new Error("Could not parse label data from AI response. Please try again.");
  }
}

export function runVerification(extracted, submitted) {
  const govWarningResult = checkGovernmentWarning(extracted.government_warning);
  const fields = [
    { key: "brand_name", label: "Brand Name", ...compareField(submitted.brand_name, extracted.brand_name), extracted: extracted.brand_name, submitted: submitted.brand_name },
    { key: "class_type", label: "Class / Type", ...compareField(submitted.class_type, extracted.class_type), extracted: extracted.class_type, submitted: submitted.class_type },
    { key: "alcohol_content", label: "Alcohol Content", ...compareField(submitted.alcohol_content, extracted.alcohol_content), extracted: extracted.alcohol_content, submitted: submitted.alcohol_content },
    { key: "net_contents", label: "Net Contents", ...compareField(submitted.net_contents, extracted.net_contents), extracted: extracted.net_contents, submitted: submitted.net_contents },
    { key: "bottler_producer", label: "Bottler / Producer", ...compareField(submitted.bottler_producer, extracted.bottler_producer), extracted: extracted.bottler_producer, submitted: submitted.bottler_producer },
    { key: "country_of_origin", label: "Country of Origin", ...compareField(submitted.country_of_origin, extracted.country_of_origin), extracted: extracted.country_of_origin, submitted: submitted.country_of_origin },
    { key: "government_warning", label: "Government Warning", ...govWarningResult, extracted: extracted.government_warning, submitted: GOVERNMENT_WARNING },
  ];
  const hasFail = fields.some((f) => f.status === "fail");
  const hasWarn = fields.some((f) => f.status === "warn");
  return { fields, overallStatus: hasFail ? "fail" : hasWarn ? "warn" : "pass" };
}
