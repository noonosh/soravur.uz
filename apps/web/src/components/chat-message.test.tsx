import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Doc } from "@soravur/backend/convex/_generated/dataModel";

// chat-message pulls in katex CSS at module-eval time, which Vitest's
// PostCSS pipeline rejects. Stub the bare CSS import so the component
// loads in jsdom. (We don't need real KaTeX to assert on the header.)
vi.mock("katex/dist/katex.min.css", () => ({}));

// react-markdown + plugins are heavy and unrelated to what we're
// asserting (the message-header copy). Replace with a passthrough
// that just renders the message content as text.
vi.mock("react-markdown", () => ({
	default: ({ children }: { children: string }) => children,
}));
vi.mock("remark-gfm", () => ({ default: () => null }));
vi.mock("remark-math", () => ({ default: () => null }));
vi.mock("rehype-katex", () => ({ default: () => null }));

import { ChatMessage } from "./chat-message";

function makeAssistantMessage(model: string): Doc<"messages"> {
	return {
		_id: "m1" as Doc<"messages">["_id"],
		_creationTime: Date.now(),
		threadId: "t1" as Doc<"messages">["threadId"],
		role: "assistant",
		content: "Salom",
		model,
	} as Doc<"messages">;
}

describe("ChatMessage header", () => {
	it("renders the assistant label without exposing the underlying model id", () => {
		// Regression: an earlier version surfaced the OpenRouter slug
		// (e.g. "deepseek-v3.2") next to the assistant name. The model
		// is an implementation detail — users shouldn't see it.
		render(<ChatMessage message={makeAssistantMessage("deepseek/deepseek-v4-flash")} />);

		expect(screen.getByText("Yordamchi")).toBeInTheDocument();
		expect(screen.queryByText(/deepseek/i)).not.toBeInTheDocument();
		expect(screen.queryByText(/v4-flash/i)).not.toBeInTheDocument();
		// The previous fallback "Soravur" was also a model-label artifact
		// — make sure it's gone too.
		expect(screen.queryByText(/^Soravur$/)).not.toBeInTheDocument();
	});

	it("does not surface a model label even if model is unset", () => {
		const { _id, _creationTime, threadId } = makeAssistantMessage("");
		const message = {
			_id,
			_creationTime,
			threadId,
			role: "assistant" as const,
			content: "Hi",
		} as unknown as Doc<"messages">;
		render(<ChatMessage message={message} />);
		expect(screen.queryByText(/^Soravur$/)).not.toBeInTheDocument();
	});
});
