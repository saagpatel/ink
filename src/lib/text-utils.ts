export function wordCount(text: string): number {
	const trimmed = text.trim();
	if (trimmed.length === 0) return 0;
	return trimmed.split(/\s+/).length;
}

export function getAnchorRange(
	content: string,
	cursorOffset: number,
): { start: number; end: number; text: string } {
	const clampedCursor = Math.max(0, Math.min(cursorOffset, content.length));

	// Scan backward for sentence boundary or double newline
	let start = clampedCursor;
	while (start > 0) {
		const ch = content[start - 1];
		if (ch === "." || ch === "!" || ch === "?") {
			// Found sentence end — start after it (skip whitespace)
			break;
		}
		if (
			start >= 2 &&
			content[start - 1] === "\n" &&
			content[start - 2] === "\n"
		) {
			break;
		}
		start--;
	}

	// Scan forward for sentence boundary or double newline
	let end = clampedCursor;
	while (end < content.length) {
		const ch = content[end];
		if (ch === "." || ch === "!" || ch === "?") {
			end++; // Include the punctuation
			break;
		}
		if (
			end + 1 < content.length &&
			content[end] === "\n" &&
			content[end + 1] === "\n"
		) {
			break;
		}
		end++;
	}

	// Trim whitespace from boundaries
	while (start < end && /\s/.test(content[start])) start++;
	while (end > start && /\s/.test(content[end - 1])) end--;

	// Clamp to reasonable length (20-200 chars)
	if (end - start > 200) {
		end = start + 200;
	}
	if (end - start < 20 && content.length >= 20) {
		// Expand to at least 20 chars centered on cursor
		const center = clampedCursor;
		start = Math.max(0, center - 10);
		end = Math.min(content.length, center + 10);
	}

	const text = content.slice(start, end);
	return { start, end, text };
}
