import Link from "next/link";
const logoImg = "/assets/logo.png?v=2";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`group inline-flex items-center ${className}`}>
      <img
        src={logoImg}
        alt="Prajnaa Market"
        className="h-10 sm:h-12 md:h-14 w-auto object-contain transition-transform duration-300 group-hover:scale-[1.03] max-w-full"
      />
    </Link>
  );
}

