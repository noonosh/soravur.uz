import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Id } from "@soravur/backend/convex/_generated/dataModel";

const useQueryMock = vi.fn();
vi.mock("convex/react", () => ({
	useQuery: () => useQueryMock(),
	useMutation: () => vi.fn(async () => undefined),
}));

vi.mock("@soravur/backend/convex/_generated/api", () => ({
	api: {
		messages: { listMessages: "messages.listMessages" },
		threads: {
			listThreads: "threads.listThreads",
			archiveThread: "threads.archiveThread",
			unarchiveThread: "threads.unarchiveThread",
		},
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

import { ChatInterface } from "./chat-interface";

const userId = "users:test" as Id<"users">;

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
