import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/app/agents")({
  beforeLoad: () => {
    throw redirect({ to: "/agents" });
  },
});
