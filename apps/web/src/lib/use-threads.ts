"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@soravur/backend/convex/_generated/api";
import type {
	Doc,
	Id,
} from "@soravur/backend/convex/_generated/dataModel";

export type ThreadsView = "active" | "archived";

export interface UseThreadsResult {
	threads: Array<Doc<"threads">> | undefined;
	archive: (threadId: Id<"threads">) => Promise<unknown>;
	unarchive: (threadId: Id<"threads">) => Promise<unknown>;
}

// Single source of thread state for both the sidebar list and the
// chat shell. Issue 15A picked subscription-per-view (tab swap = sub
// swap) so this hook subscribes only to the requested view; the hook
// shape stays identical for both, with mutations bound on the side.
export function useThreads(
	userId: Id<"users">,
	view: ThreadsView,
): UseThreadsResult {
	const threads = useQuery(api.threads.listThreads, { userId, view }) as
		| Array<Doc<"threads">>
		| undefined;
	const archiveMutation = useMutation(api.threads.archiveThread);
	const unarchiveMutation = useMutation(api.threads.unarchiveThread);

	return {
		threads,
		archive: (threadId) => archiveMutation({ threadId }),
		unarchive: (threadId) => unarchiveMutation({ threadId }),
	};
}
