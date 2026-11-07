import Link from "next/link";
import Image from "next/image";

export function LiravaMark({ className = "size-9" }: { className?: string }) {
  return (
    <span className={`inline-grid shrink-0 place-items-center overflow-hidden rounded-[10px] bg-[#f6f1e7] shadow-sm ${className}`} aria-hidden="true">
      <Image src="/brand/Icon.png" alt="" width={96} height={96} sizes="36px" className="size-full object-cover" />
    </span>
  );
}

export function LiravaLockup({ className = "" }: { className?: string }) {
  return <Image src="/brand/Lirava-1.png" alt="Lirava" width={832} height={464} sizes="208px" className={`h-12 w-52 rounded-lg object-cover object-center ${className}`} />;
}

export function LiravaLogo({ href = "/", className = "" }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={`inline-flex items-center gap-2.5 ${className}`} aria-label="Lirava home">
      <LiravaMark />
      <span className="font-serif text-[21px] font-semibold tracking-[-0.045em] text-foreground">Lirava</span>
    </Link>
  );
}
