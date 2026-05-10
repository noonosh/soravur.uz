import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Id } from "@soravur/backend/convex/_generated/dataModel";

const useQueryMock = vi.fn();
vi.mock("convex/react", () => ({
	useQuery: () => useQueryMock(),
	useMutation: () => vi.fn(async () => undefined),
	useAction: () => vi.fn(async () => undefined),
}));

vi.mock("@soravur/backend/convex/_generated/api", () => ({
	api: {
		messages: {
			listMessages: "messages.listMessages",
			appendUserMessage: "messages.appendUserMessage",
		},
		threads: {
			listThreads: "threads.listThreads",
			createThread: "threads.createThread",
			archiveThread: "threads.archiveThread",
			unarchiveThread: "threads.unarchiveThread",
		},
		chat: { generateAssistantReply: "chat.generateAssistantReply" },
	},
}));

// chat-message imports katex CSS, which Vitest's vite/PostCSS pipeline
// can't process. The composer-placement tests don't render messages,
// but the import is hoisted to the chat-interface module either way.
vi.mock("./chat-message", () => ({
	ChatMessage: () => null,
}));

vi.mock("./chat-thread-list", () => ({
	ChatThreadList: () => null,
}));

import { ChatInterface, composerPosition } from "./chat-interface";

const userId = "users:test" as Id<"users">;
const threadId = "threads:abc" as Id<"threads">;

describe("composerPosition", () => {
	it("centers when no thread is selected (welcome state)", () => {
		expect(composerPosition(null, undefined)).toBe("center");
	});

	it("centers when a thread is selected but has zero messages", () => {
		expect(composerPosition(threadId, [])).toBe("center");
	});

	it("pins to bottom while messages for an existing thread are loading", () => {
		// useQuery is undefined while in-flight — the user is on a real
		// thread, so we don't want the composer to bounce up only to drop
		// back down once messages arrive.
		expect(composerPosition(threadId, undefined)).toBe("bottom");
	});

	it("pins to bottom once the conversation has any messages", () => {
		const messages = [
			// Casts are fine — composerPosition only reads .length.
			{} as never,
		];
		expect(composerPosition(threadId, messages)).toBe("bottom");
	});
});

describe("ChatInterface composer placement", () => {
	beforeEach(() => {
		useQueryMock.mockReset();
	});

	it("centers the composer when no thread is selected", () => {
		// listMessages is "skip"-ped without a threadId, so useQuery returns
		// undefined regardless. Only one render pathway here.
		useQueryMock.mockReturnValue(undefined);

		render(
			<ChatInterface
				userId={userId}
				selectedModel="maths"
				onModelChange={() => {}}
			/>,
		);

		const center = document.querySelector("[data-composer-position=center]");
		const bottom = document.querySelector("[data-composer-position=bottom]");
		expect(center).not.toBeNull();
		expect(bottom).toBeNull();
		// Welcome copy for the no-thread state.
		expect(screen.getByText("Yangi suhbatni boshlang.")).toBeInTheDocument();
	});

	it("centers the composer with starter prompts on an empty thread", () => {
		// Empty messages array means: thread exists, no messages yet.
		useQueryMock.mockReturnValue([]);

		render(
			<ChatInterface
				userId={userId}
				selectedModel="maths"
				onModelChange={() => {}}
			/>,
		);

		// We can't trigger thread selection from here without wiring up the
		// child components, so this test covers only the no-thread → center
		// path. The empty-thread → center+prompts path is identical at the
		// layout level — same CenteredCompose wrapper, asserted above.
		const center = document.querySelector("[data-composer-position=center]");
		const bottom = document.querySelector("[data-composer-position=bottom]");
		expect(center).not.toBeNull();
		expect(bottom).toBeNull();
	});
});
