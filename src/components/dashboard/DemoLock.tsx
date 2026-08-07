import { Lock } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

export function DemoLock({ children }: Props) {
  return (
    <div className="relative">
      {/* Blurred content behind */}
      <div className="pointer-events-none select-none" style={{ filter: "blur(3px)", opacity: 0.45 }}>
        {children}
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-background/60 backdrop-blur-[2px]">
        <div
          className="size-10 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(110,198,186,0.12)", border: "1.5px solid rgba(110,198,186,0.25)" }}
        >
          <Lock className="size-4.5 text-brand" />
        </div>
        <div className="text-center px-4">
          <p className="text-[13px] font-bold text-foreground">Funcionalidade Premium</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Disponível na versão completa</p>
        </div>
      </div>
    </div>
  );
}
