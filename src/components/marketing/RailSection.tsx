import type { ReactNode } from "react";

/**
 * A page section framed by hairline rails, divided from the one above by a hairline
 * with small corner nodes. Gives the whole page one consistent, spacious frame.
 */
export default function RailSection({
  id,
  className = "",
  children,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  const node = "absolute hidden size-1.5 border border-border bg-background lg:block";
  return (
    <section id={id} className={`border-t border-border ${className}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rails relative px-2 py-16 sm:px-8 sm:py-20 lg:px-14 lg:py-24">
          <span aria-hidden="true" className={`${node} -top-[3px] -left-[3px]`} />
          <span aria-hidden="true" className={`${node} -top-[3px] -right-[3px]`} />
          {children}
        </div>
      </div>
    </section>
  );
}
