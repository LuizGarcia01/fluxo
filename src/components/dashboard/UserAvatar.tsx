interface UserAvatarProps {
  initials: string;
  color: string;
  size?: "xs" | "sm" | "md";
  title?: string;
}

export function UserAvatar({ initials, color, size = "sm", title }: UserAvatarProps) {
  const sizeClass = size === "xs" ? "size-5 text-[9px]" : size === "sm" ? "size-6 text-[10px]" : "size-8 text-xs";
  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-bold text-white shrink-0 select-none`}
      style={{ backgroundColor: color }}
      title={title}
    >
      {initials}
    </div>
  );
}
