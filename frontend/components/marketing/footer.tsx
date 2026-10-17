import Link from "next/link";
import { Instagram, Facebook, Linkedin, Mail } from "lucide-react";
import { Logo } from "@/components/brand/logo";

function PinterestIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345-.09.375-.293 1.194-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.546.535 6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
    </svg>
  );
}

function WhatsAppIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.004 2C6.48 2 2 6.48 2 12.004c0 1.764.46 3.484 1.332 5.004L2 22l5.12-1.316a9.96 9.96 0 0 0 4.884 1.32h.004c5.524 0 10.004-4.48 10.004-10.004C22.012 6.48 17.528 2 12.004 2zm5.836 14.188c-.244.688-1.42 1.316-1.956 1.4-.536.084-1.228.12-3.568-.844-2.988-1.232-4.912-4.28-5.06-4.48-.148-.2-1.2-1.6-1.2-3.052 0-1.452.76-2.164 1.032-2.46.272-.296.592-.37.788-.37.196 0 .392.004.564.012.18.008.42-.068.656.496.244.584.836 2.04.908 2.19.072.15.12.324.024.52-.096.196-.144.32-.288.492-.144.172-.304.384-.436.516-.148.148-.3.308-.132.6.168.292.748 1.232 1.604 1.996 1.104.984 2.036 1.292 2.328 1.436.292.144.464.124.636-.072.172-.196.736-.856.932-1.148.196-.292.392-.244.656-.148.264.096 1.676.788 1.964.932.288.144.48.216.552.34.072.124.072.72-.172 1.408z" />
    </svg>
  );
}

const socialLinks = [
  { Icon: Instagram, href: "https://instagram.com/prajnaafarm", label: "Instagram", isExternal: true },
  { Icon: Facebook, href: "https://facebook.com/prajnaafarm", label: "Facebook", isExternal: true },
  { Icon: PinterestIcon, href: "https://pinterest.com/prajnaafarm", label: "Pinterest", isExternal: true },
  { Icon: Mail, href: "mailto:prajnaafarm@gmail.com", label: "Email", isExternal: false },
  { Icon: WhatsAppIcon, href: "https://wa.me/917650065690", label: "WhatsApp", isExternal: true },
  { Icon: Linkedin, href: "https://linkedin.com/company/prajnaafarm", label: "LinkedIn", isExternal: true },
];

export function MarketingFooter() {
  return (
    <footer className="mt-0 border-t border-border bg-secondary/60">
      <div className="container-prj grid gap-12 py-16 md:grid-cols-12">
        <div className="md:col-span-4">
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            From Soil to Soul, Naturally. Authentic farm produce, sourced directly from trusted
            farmers across India.
          </p>

          {/* Social Icons */}
          <div className="mt-6 flex items-center gap-[10px] flex-wrap">
            {socialLinks.map(({ Icon, href, label, isExternal }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="grid h-[36px] w-[36px] place-items-center rounded-full border border-[#dcd5c2] bg-white text-[#173328] transition-all duration-200 hover:-translate-y-[2px] hover:bg-[#173328] hover:border-[#173328] hover:text-[#f4efe1] shadow-xs cursor-pointer"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-2 md:col-span-8 md:grid-cols-4 md:gap-4">
          <FooterCol
            title="Shop"
            links={[
              { href: "/shop", label: "All products" },
              { href: "/category/dry-fruits", label: "Dry fruits" },
              { href: "/category/spices", label: "Spices" },
              { href: "/category/pickles", label: "Pickles" },
              { href: "/wishlist", label: "Wishlist" },
              { href: "/track-order", label: "Track order" },
            ]}
          />
          <FooterCol
            title="Farmers"
            links={[
              { href: "/farmers", label: "Meet the farmers" },
              { href: "/farmer-login", label: "Become a seller" },
              { href: "/sustainability", label: "Sustainability" },
              { href: "/farmer-login", label: "Farmer login" },
            ]}
          />
          <FooterCol
            title="Company"
            links={[
              { href: "/about", label: "About us" },
              { href: "/blog", label: "The Journal" },
              { href: "/press", label: "Press" },
              { href: "/careers", label: "Careers" },
              { href: "/contact", label: "Contact" },
            ]}
          />
          <FooterCol
            title="Help"
            links={[
              { href: "/faq", label: "FAQ" },
              { href: "/shipping", label: "Shipping" },
              { href: "/returns", label: "Returns & refunds" },
              { href: "/account", label: "My account" },
              { href: "/contact", label: "Support" },
            ]}
          />
        </div>
      </div>

      {/* Footer Bottom with P1-4 Payment Badges */}
      <div className="border-t border-border text-center">
        <div className="container-prj flex flex-col md:flex-row items-center justify-between gap-4 py-8 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Prajnaa Farm. All rights reserved.</p>
          
          {/* Payment Badges */}
          <div className="flex items-center gap-2 text-[10px] font-semibold text-foreground/75">
            <span className="rounded bg-background px-2 py-1 border border-border">UPI</span>
            <span className="rounded bg-background px-2 py-1 border border-border">Razorpay</span>
            <span className="rounded bg-background px-2 py-1 border border-border">Visa</span>
            <span className="rounded bg-background px-2 py-1 border border-border">Mastercard</span>
            <span className="rounded bg-background px-2 py-1 border border-border">COD</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/shipping" className="hover:text-foreground">
              Shipping
            </Link>
            <Link href="/returns" className="hover:text-foreground">
              Returns
            </Link>
            <span>· Made with care in India.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <h4 className="font-subhead text-xs uppercase tracking-[0.16em] text-foreground/85">
        {title}
      </h4>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l.href + l.label}>
            <Link
              href={l.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
