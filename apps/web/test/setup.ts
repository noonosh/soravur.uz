import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
import * as React from "react";

// Next 16 + React 19's app router primitives throw outside a real
// route. Stub them with vitest mocks so component tests can render
// forms in isolation.
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: vi.fn(),
		replace: vi.fn(),
		back: vi.fn(),
	}),
	useSearchParams: () => new URLSearchParams(),
	usePathname: () => "/",
}));

// next/link is replaced with a passthrough <a>. createElement avoids
// JSX in this .ts setup file (vite oxc only parses JSX in .tsx).
vi.mock("next/link", () => ({
	default: (props: { children: React.ReactNode; href: unknown }) => {
		const { children, href, ...rest } = props as {
			children: React.ReactNode;
			href: unknown;
			[key: string]: unknown;
		};
		return React.createElement(
			"a",
			{ href: typeof href === "string" ? href : "#", ...rest },
			children,
		);
	},
}));
