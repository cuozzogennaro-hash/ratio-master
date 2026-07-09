type Props = { className?: string; alt?: string };

export function Logo({ className, alt = "RatioVault" }: Props) {
  return (
    <img
      src="/favicon.png"
      alt={alt}
      className={className ?? "h-9 w-9 rounded-lg"}
      draggable={false}
    />
  );
}
