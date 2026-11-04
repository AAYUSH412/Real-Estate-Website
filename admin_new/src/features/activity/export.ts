export function exportSummary(headers: Headers) {
  const total = headers.get("X-Export-Total");
  const limit = headers.get("X-Export-Limit");
  const truncated = headers.get("X-Export-Truncated");
  return {
    truncated: truncated === "true",
    text:
      truncated === "true"
        ? `Limited export: ${limit || "10,000"} rows out of ${total || "an unknown total"}. Narrow the filters for a smaller result.`
        : truncated === "false"
          ? `Exported ${total || "matching"} rows (maximum ${limit || "10,000"}).`
          : "CSV downloaded; the server did not supply truncation metadata. Exports are capped at 10,000 rows.",
  };
}
