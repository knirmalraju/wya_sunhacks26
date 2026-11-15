import { redirect } from "next/navigation";
import { FadeIn, Float, Item, Pulse, Stagger } from "@/components/motion";
import { Avatar, Chip, Icon, Logo } from "@/components/ui";
import { currentUser, studentDomain } from "@/lib/auth";
import { emailConfigured } from "@/lib/emailCode";
import { SignInButtons } from "./SignInButtons";

const ERRORS: Record<string, string> = {
  CredentialsSignin: "That code didn't work. Send a new one and try again.",
};

const FEATURES = [
  { icon: "clock" as const, title: "Quick Connect", text: "Got 30 minutes before class? Post it. See who's nearby, into the same things, and free right now." },
  { icon: "cal" as const, title: "Scheduled Connect", text: "Share open blocks, not your class schedule. Friends request a time and you accept or pass." },
  { icon: "users" as const, title: "Your niches", text: "From robotics to Assassin's Creed. Grouped interests turn into chats, events and real friends." },
];

export default async function SignIn({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const me = await currentUser();
  if (me?.verified) redirect(me.onboarded ? "/" : "/welcome");
  const { error } = await searchParams;
  return (
    <div className="canvas-glow min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 md:px-8">
        <Logo height={56} />
        <a href="#signin" className="rounded-full px-4 py-2 text-sm font-bold text-maroon hover:bg-maroon-tint">Sign in</a>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pt-6 pb-16 md:px-8 lg:grid-cols-[1.05fr_1fr] lg:pt-14">
        <div className="flex flex-col gap-7">
          <FadeIn className="flex">
            <span className="flex items-center gap-2 rounded-full border border-line/80 bg-white px-3.5 py-2 text-xs font-bold tracking-[0.04em] uppercase shadow-[var(--shadow-card)]">
              <Pulse /> Built for ASU commuters
            </span>
          </FadeIn>
          <FadeIn delay={0.05}>
            <h1 className="text-[40px] leading-[1.04] font-extrabold tracking-[-0.04em] md:text-[60px]">
              Turn the gaps between classes into <span className="text-maroon">friendships.</span>
            </h1>
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="max-w-xl text-[17px] leading-relaxed text-muted">
              wya finds students who share your niches, are on campus right now, and are actually free when you are.
            </p>
          </FadeIn>
          <FadeIn delay={0.15} id="signin" className="glass max-w-md scroll-mt-6 rounded-[32px] border border-white/70 p-6 shadow-[var(--shadow-float)]">
            <h2 className="mb-4 text-lg font-bold">Sign in or create an account</h2>
            {error && <p role="alert" className="mb-3 rounded-2xl bg-maroon-tint p-3 text-sm font-semibold text-maroon">{ERRORS[error] ?? "Sign-in didn't work. Try again."}</p>}
            <SignInButtons domain={studentDomain} devCodes={!emailConfigured} />
          </FadeIn>
        </div>

        <div aria-hidden="true" className="relative hidden h-[560px] lg:block">
          <Float className="absolute top-4 right-6 left-10" delay={0.2}>
            <div className="rounded-[28px] border border-line/80 bg-white p-5 shadow-[var(--shadow-float)]">
              <div className="flex items-center gap-3">
                <Avatar initials="MC" status="available" size={48} />
                <div className="flex flex-1 flex-col">
                  <span className="font-bold">Maya Chen</span>
                  <span className="text-[13px] text-muted">Free 40 min · Memorial Union · 1 min away</span>
                </div>
              </div>
              <p className="mt-3 text-[15px]">Anyone want to look at the robotics club arm build? I have coffee.</p>
              <div className="mt-3 flex gap-1.5"><Chip>Robotics</Chip><Chip>AI</Chip><Chip>Assassin&apos;s Creed</Chip></div>
            </div>
          </Float>
          <Float className="absolute top-[250px] left-0 w-[300px]" delay={0.6} distance={10}>
            <div className="rounded-[28px] bg-maroon p-5 text-white shadow-[var(--shadow-sheet)]">
              <span className="text-[11px] font-bold tracking-[0.08em] text-gold uppercase">Quick Connect</span>
              <p className="mt-1 text-2xl font-extrabold tracking-tight">Free for 1 h</p>
              <div className="mt-3 flex h-6 items-end justify-between">
                {Array.from({ length: 12 }, (_, i) => <span key={i} className="w-[3px] rounded-sm" style={{ height: (i + 1) % 4 === 0 ? 22 : 12, background: i < 4 ? "#FFC627" : "rgba(255,255,255,.35)" }} />)}
              </div>
              <span className="mt-3 block text-[13px] text-white/80">Memorial Union · until 3:12 PM</span>
            </div>
          </Float>
          <Float className="absolute top-[300px] right-0 w-[290px]" delay={1} distance={6}>
            <div className="glass rounded-[28px] border border-white/70 p-5 shadow-[var(--shadow-float)]">
              <span className="flex items-center gap-2 text-xs font-bold text-blue"><Icon name="cal" size={16} />Hoops crew · shared calendar</span>
              <p className="mt-2 font-bold">Pickup basketball</p>
              <p className="text-[13px] text-muted">Thu 4:00 PM · SDFC</p>
              <div className="mt-3 flex -space-x-2">
                {["JR", "PS", "DK", "JD"].map((x) => <span key={x} className="rounded-full ring-2 ring-white"><Avatar initials={x} size={30} /></span>)}
              </div>
            </div>
          </Float>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20 md:px-8">
        <Stagger className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {FEATURES.map((f) => (
            <Item key={f.title} lift className="rounded-[28px] border border-line/80 bg-white p-6 shadow-[var(--shadow-card)]">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-maroon-tint text-maroon"><Icon name={f.icon} size={22} /></span>
              <h3 className="mt-4 text-lg font-bold">{f.title}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{f.text}</p>
            </Item>
          ))}
        </Stagger>
        <p className="mt-8 flex items-center justify-center gap-2 text-center text-[13px] text-muted"><Icon name="lock" size={16} />Only verified students get in. Location and activity are opt-in, and you control every setting.</p>
      </section>
    </div>
  );
}
