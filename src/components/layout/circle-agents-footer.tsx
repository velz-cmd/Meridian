import {
  CIRCLE_AGENTS_DOCS_URL,
  CIRCLE_AGENTS_MARKETPLACE_URL,
} from "@/lib/circle-agents";

/** NEXUS — Circle Agent Stack + x402 attribution */
export function CircleAgentsFooter({ className = "" }: { className?: string }) {
  return (
    <p
      className={`text-center text-[10px] leading-relaxed tracking-wide text-white/45 ${className}`}
    >
      Powered by{" "}
      <a
        href={CIRCLE_AGENTS_MARKETPLACE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-cyan-300/90 underline-offset-2 hover:text-cyan-200 hover:underline"
      >
        Circle Agents
      </a>
      {" · "}
      Pay with{" "}
      <a
        href={CIRCLE_AGENTS_DOCS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-violet-300/90 underline-offset-2 hover:text-violet-200 hover:underline"
      >
        x402
      </a>
    </p>
  );
}
