interface NexoLogoProps {
  size?: number;
  showText?: boolean;
}

export function NexoMark({ size = 36 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: "linear-gradient(140deg, #52b8ac, #6ec6ba)",
        boxShadow: "0 4px 14px -2px rgba(110,198,186,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg
        width={size * 0.58}
        height={size * 0.58}
        viewBox="0 0 22 22"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* N letterform as stroke */}
        <path
          d="M4 18 L4 4 L11 15 L18 4 L18 18"
          stroke="white"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Connection dots — reinforce the "nexo" (network) concept */}
        <circle cx="4" cy="4" r="1.8" fill="white" />
        <circle cx="18" cy="18" r="1.8" fill="white" />
      </svg>
    </div>
  );
}

export function NexoLogo({ size = 36, showText = true }: NexoLogoProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
      <NexoMark size={size} />
      {showText && (
        <div>
          <div
            style={{
              fontSize: size * 0.42,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 1,
              color: "inherit",
              fontFamily: "var(--font-heading-family)",
            }}
          >
            nexo
          </div>
          <div
            style={{
              fontSize: size * 0.27,
              color: "var(--color-muted-foreground)",
              marginTop: 2,
              lineHeight: 1,
              letterSpacing: "0.01em",
            }}
          >
            Orçamento pessoal
          </div>
        </div>
      )}
    </div>
  );
}
