import Link from 'next/link';
import {
  ArrowUpRight,
  Coffee,
  Gamepad2,
  Heart,
  Layers,
  Lightbulb,
  Palette,
  PenTool,
  ScanEye,
  Sparkles,
  Users,
  Workflow,
  Zap,
} from 'lucide-react';

const services = [
  {
    icon: PenTool,
    title: 'Product & UI Design',
    description:
      'End-to-end interface design for web and mobile — from wireframes to high-fidelity screens ready for development.',
  },
  {
    icon: Palette,
    title: 'Brand & Visual Identity',
    description:
      'Logos, color systems, typography, and brand guidelines that scale across every touchpoint.',
  },
  {
    icon: Layers,
    title: 'Design Systems',
    description:
      'Component libraries, tokens, and documentation that keep teams aligned and shipping consistently.',
  },
  {
    icon: ScanEye,
    title: 'Visual QA & Handoff',
    description:
      'Pixel-level comparison of mockups vs. live builds. Catch drift before it reaches production.',
  },
];

const tools = [
  { name: 'Figma', category: 'Design' },
  { name: 'DesignLens', category: 'Visual QA' },
  { name: 'Playwright', category: 'Capture' },
  { name: 'Storybook', category: 'Components' },
  { name: 'Tailwind CSS', category: 'Styling' },
  { name: 'Framer', category: 'Prototyping' },
];

const process = [
  { step: '01', title: 'Discover', detail: 'Stakeholder interviews, audits, and success metrics.' },
  { step: '02', title: 'Define', detail: 'Information architecture, flows, and design direction.' },
  { step: '03', title: 'Design', detail: 'Iterative mockups, prototypes, and system foundations.' },
  { step: '04', title: 'Deliver', detail: 'Specs, assets, and visual QA against live builds.' },
];

const team = [
  {
    name: 'Maya Chen',
    role: 'Design Director',
    bio: 'Former agency lead. Obsessed with typography, whitespace, and getting the handoff right the first time.',
    initials: 'MC',
    accent: 'bg-[#6b5c4a]',
  },
  {
    name: 'James Okonkwo',
    role: 'Product Designer',
    bio: 'Ships complex dashboards and flows. Brings engineering empathy to every critique session.',
    initials: 'JO',
    accent: 'bg-[#4a5c6b]',
  },
  {
    name: 'Priya Sharma',
    role: 'Brand & Systems',
    bio: 'Builds token libraries and brand guidelines that teams actually reference six months later.',
    initials: 'PS',
    accent: 'bg-[#5c4a6b]',
  },
  {
    name: 'Alex Rivera',
    role: 'Visual QA Lead',
    bio: 'Built DesignLens. Runs pixel diffs like a detective and documents every drift before launch.',
    initials: 'AR',
    accent: 'bg-[#4a6b5c]',
  },
];

const culture = [
  {
    icon: Lightbulb,
    title: 'Curiosity over credentials',
    detail: 'We ask why before how. Every brief gets a whiteboard session — even the small ones.',
  },
  {
    icon: Heart,
    title: 'Kind, direct feedback',
    detail: 'Critique is a gift. We separate the work from the person and always offer a path forward.',
  },
  {
    icon: Zap,
    title: 'Ship, then polish',
    detail: 'Perfect is the enemy of launched. We iterate in the open with staging builds, not slide decks.',
  },
  {
    icon: Users,
    title: 'Embedded, not outsourced',
    detail: 'We sit in your Slack, join standups, and pair with engineers — not deliver PDFs from afar.',
  },
];

const experiences = [
  {
    client: 'Finova',
    industry: 'Fintech',
    headline: 'Redesigned a trading dashboard used by 40k daily active users',
    outcome: 'Cut onboarding drop-off by 28% and unified three legacy UIs into one design system.',
    duration: '14 weeks',
  },
  {
    client: 'Greenline',
    industry: 'Climate SaaS',
    headline: 'Brand refresh and marketing site for a Series B launch',
    outcome: 'New identity rolled out across product, docs, and investor deck in six weeks.',
    duration: '8 weeks',
  },
  {
    client: 'Carepath',
    industry: 'Healthtech',
    headline: 'Mobile patient portal from zero to App Store',
    outcome: 'End-to-end UX, accessibility audit, and visual QA on every release candidate.',
    duration: '20 weeks',
  },
];

const testimonials = [
  {
    quote:
      'Lens Studio didn\'t just make things pretty — they caught layout bugs our QA missed for months. DesignLens alone saved us two release cycles.',
    author: 'Sarah Kim',
    title: 'VP Product, Finova',
  },
  {
    quote:
      'The team embedded like they were ours. Standups, Figma comments at midnight, the works. Our engineers finally stopped asking "which spacing token?"',
    author: 'Marcus Webb',
    title: 'Eng Lead, Greenline',
  },
  {
    quote:
      'Best design partner we\'ve had. Direct feedback, no ego, and they actually understand how things get built.',
    author: 'Dr. Anya Patel',
    title: 'Founder, Carepath',
  },
];

const funAtWork = [
  {
    icon: Coffee,
    title: 'Friday sketch club',
    detail: 'One hour, no briefs. We draw interfaces for fictional apps — last month was a cat café POS.',
  },
  {
    icon: Gamepad2,
    title: 'Pixel-perfect Olympics',
    detail: 'Monthly challenge: spot the diff between mockup and build. Winner picks lunch.',
  },
  {
    icon: Sparkles,
    title: 'Studio playlist wars',
    detail: 'Shared Spotify queue. Jazz vs. lo-fi debates are unresolved since 2023.',
  },
];

const recentProjects = [
  {
    title: 'Meridian Analytics',
    category: 'Dashboard · 2025',
    description: 'Real-time data viz for enterprise ops teams. Dark mode, 12 chart types, full token system.',
    tag: 'Product Design',
    color: 'from-[#1a1a18] to-[#3d3a35]',
  },
  {
    title: 'Bloom & Co.',
    category: 'E-commerce · 2025',
    description: 'DTC skincare rebrand — packaging, Shopify theme, and email templates.',
    tag: 'Brand',
    color: 'from-[#6b5c4a] to-[#8a7355]',
  },
  {
    title: 'Relay Docs',
    category: 'Developer tools · 2024',
    description: 'API documentation platform. Information architecture and component library for technical writers.',
    tag: 'Design System',
    color: 'from-[#4a5c6b] to-[#6b8090]',
  },
  {
    title: 'Northwind Mobile',
    category: 'Field service · 2024',
    description: 'Offline-first app for technicians. Rugged UI, large touch targets, visual QA on 6 viewports.',
    tag: 'Visual QA',
    color: 'from-[#5c4a6b] to-[#7a6590]',
  },
];

export default function StudioPage() {
  return (
    <div className="studio-page min-h-screen bg-[#faf9f7] text-[#1a1a18]">
      {/* Nav */}
      <header className="border-b border-[#e8e6e1] bg-[#faf9f7]/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#1a1a18] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#faf9f7]" />
            </div>
            <div>
              <p className="font-display text-lg tracking-tight leading-none">Lens Studio</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#8a8780] mt-0.5">
                Design Practice
              </p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-[#5c5a55]">
            <a href="#services" className="hover:text-[#1a1a18] transition-colors">
              Services
            </a>
            <a href="#team" className="hover:text-[#1a1a18] transition-colors">
              Team
            </a>
            <a href="#projects" className="hover:text-[#1a1a18] transition-colors">
              Work
            </a>
            <a href="#culture" className="hover:text-[#1a1a18] transition-colors">
              Culture
            </a>
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-[#1a1a18] font-medium hover:opacity-70 transition-opacity"
            >
              DesignLens
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 md:pt-28 md:pb-32">
        <p className="text-xs uppercase tracking-[0.25em] text-[#8a8780] mb-6">
          Design studio · Visual craft · Ship-ready
        </p>
        <h1 className="font-display text-5xl md:text-7xl lg:text-8xl leading-[0.95] tracking-tight max-w-4xl">
          We design products people{' '}
          <span className="italic text-[#6b5c4a]">actually</span> use.
        </h1>
        <p className="mt-8 text-lg md:text-xl text-[#5c5a55] max-w-xl leading-relaxed">
          Lens Studio partners with product teams on interface design, brand systems, and
          visual quality — from first sketch to pixel-perfect launch.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <a
            href="#services"
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#1a1a18] text-[#faf9f7] text-sm font-medium rounded-full hover:bg-[#2d2d2a] transition-colors"
          >
            View services
          </a>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3.5 border border-[#d4d1ca] text-sm font-medium rounded-full hover:border-[#1a1a18] transition-colors"
          >
            Try DesignLens
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="border-t border-[#e8e6e1] bg-white">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-[#8a8780] mb-3">
                What we do
              </p>
              <h2 className="font-display text-3xl md:text-5xl tracking-tight">Services</h2>
            </div>
            <p className="text-[#5c5a55] max-w-md text-sm leading-relaxed">
              Focused engagements — no bloated retainers. We embed with your team and leave
              you with systems that outlast the project.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-px bg-[#e8e6e1] border border-[#e8e6e1]">
            {services.map((service) => (
              <article key={service.title} className="bg-white p-8 md:p-10 group">
                <service.icon className="w-5 h-5 text-[#6b5c4a] mb-6" strokeWidth={1.5} />
                <h3 className="font-display text-xl md:text-2xl tracking-tight mb-3">
                  {service.title}
                </h3>
                <p className="text-sm text-[#5c5a55] leading-relaxed">{service.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section id="team" className="border-t border-[#e8e6e1]">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-[#8a8780] mb-3">
                The people
              </p>
              <h2 className="font-display text-3xl md:text-5xl tracking-tight">Meet the team</h2>
            </div>
            <p className="text-[#5c5a55] max-w-md text-sm leading-relaxed">
              A tight crew of designers who code-adjacent, critique hard, and care about the
              last pixel as much as the first wireframe.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map((member) => (
              <article key={member.name} className="group">
                <div
                  className={`${member.accent} aspect-[4/5] rounded-2xl flex items-end p-6 mb-4 transition-transform group-hover:scale-[1.02] duration-300`}
                >
                  <span className="font-display text-5xl text-white/20 select-none">
                    {member.initials}
                  </span>
                </div>
                <h3 className="font-display text-xl tracking-tight">{member.name}</h3>
                <p className="text-xs uppercase tracking-[0.15em] text-[#6b5c4a] mt-1 mb-3">
                  {member.role}
                </p>
                <p className="text-sm text-[#5c5a55] leading-relaxed">{member.bio}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Projects */}
      <section id="projects" className="border-t border-[#e8e6e1] bg-white">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-[#8a8780] mb-3">
                Portfolio
              </p>
              <h2 className="font-display text-3xl md:text-5xl tracking-tight">
                Recent projects
              </h2>
            </div>
            <p className="text-[#5c5a55] max-w-md text-sm leading-relaxed">
              A sample of work from the last two years — product, brand, systems, and the
              visual QA passes that shipped them.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {recentProjects.map((project) => (
              <article
                key={project.title}
                className="group rounded-2xl overflow-hidden border border-[#e8e6e1] hover:border-[#c4a882] transition-colors"
              >
                <div
                  className={`h-48 bg-gradient-to-br ${project.color} flex items-end p-6`}
                >
                  <span className="text-[10px] uppercase tracking-[0.15em] text-white/70 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full">
                    {project.tag}
                  </span>
                </div>
                <div className="p-6 md:p-8">
                  <p className="text-xs text-[#8a8780] mb-2">{project.category}</p>
                  <h3 className="font-display text-2xl tracking-tight mb-3 group-hover:text-[#6b5c4a] transition-colors">
                    {project.title}
                  </h3>
                  <p className="text-sm text-[#5c5a55] leading-relaxed">
                    {project.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Client Experiences */}
      <section id="experiences" className="border-t border-[#e8e6e1]">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <p className="text-xs uppercase tracking-[0.25em] text-[#8a8780] mb-3">
            Client stories
          </p>
          <h2 className="font-display text-3xl md:text-5xl tracking-tight mb-14">
            Experiences
          </h2>
          <div className="space-y-px bg-[#e8e6e1] border border-[#e8e6e1]">
            {experiences.map((exp) => (
              <article
                key={exp.client}
                className="bg-[#faf9f7] p-8 md:p-10 grid md:grid-cols-[1fr_2fr_auto] gap-6 md:gap-10 items-start"
              >
                <div>
                  <p className="font-display text-2xl tracking-tight">{exp.client}</p>
                  <p className="text-xs uppercase tracking-[0.15em] text-[#8a8780] mt-1">
                    {exp.industry}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-[#1a1a18] mb-2 leading-snug">
                    {exp.headline}
                  </h3>
                  <p className="text-sm text-[#5c5a55] leading-relaxed">{exp.outcome}</p>
                </div>
                <p className="text-xs uppercase tracking-[0.15em] text-[#6b5c4a] md:text-right shrink-0">
                  {exp.duration}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="border-t border-[#e8e6e1] bg-[#1a1a18] text-[#faf9f7]">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <p className="text-xs uppercase tracking-[0.25em] text-[#8a8780] mb-3">
            In their words
          </p>
          <h2 className="font-display text-3xl md:text-5xl tracking-tight mb-14">
            Testimonials
          </h2>
          <div className="grid md:grid-cols-3 gap-8 md:gap-10">
            {testimonials.map((t) => (
              <blockquote key={t.author} className="flex flex-col">
                <p className="font-display text-xl md:text-2xl leading-snug italic text-[#faf9f7]/90 flex-1">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <footer className="mt-8 pt-6 border-t border-white/10">
                  <p className="font-medium text-sm">{t.author}</p>
                  <p className="text-xs text-[#8a8780] mt-1">{t.title}</p>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* Culture */}
      <section id="culture" className="border-t border-[#e8e6e1] bg-white">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-[#8a8780] mb-3">
                How we operate
              </p>
              <h2 className="font-display text-3xl md:text-5xl tracking-tight mb-6">
                Culture
              </h2>
              <p className="text-[#5c5a55] text-sm leading-relaxed mb-8">
                We&apos;re a remote-first studio with a shared studio day every Thursday.
                Async by default, synchronous when it matters — critiques, kickoffs, and
                the occasional victory lap when a staging build finally matches the mockup.
              </p>
              <div className="grid sm:grid-cols-2 gap-6">
                {culture.map((value) => (
                  <div key={value.title}>
                    <value.icon
                      className="w-5 h-5 text-[#6b5c4a] mb-3"
                      strokeWidth={1.5}
                    />
                    <h3 className="font-medium text-sm mb-1.5">{value.title}</h3>
                    <p className="text-xs text-[#5c5a55] leading-relaxed">{value.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Fun at work */}
            <div id="fun" className="rounded-2xl bg-[#faf9f7] border border-[#e8e6e1] p-8 md:p-10">
              <p className="text-xs uppercase tracking-[0.25em] text-[#6b5c4a] mb-3">
                Not all work
              </p>
              <h3 className="font-display text-2xl md:text-3xl tracking-tight mb-8">
                Fun at work
              </h3>
              <ul className="space-y-8">
                {funAtWork.map((item) => (
                  <li key={item.title} className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-white border border-[#e8e6e1] flex items-center justify-center shrink-0">
                      <item.icon className="w-4 h-4 text-[#6b5c4a]" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-1">{item.title}</h4>
                      <p className="text-xs text-[#5c5a55] leading-relaxed">{item.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-10 pt-6 border-t border-[#e8e6e1] text-xs text-[#8a8780] italic">
                We take the craft seriously. Ourselves, slightly less so.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tools */}
      <section id="tools" className="border-t border-[#e8e6e1]">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-[#8a8780] mb-3">
                Stack
              </p>
              <h2 className="font-display text-3xl md:text-5xl tracking-tight mb-6">
                Tools we use daily
              </h2>
              <p className="text-[#5c5a55] text-sm leading-relaxed max-w-md">
                We pick tools that fit the workflow — not the other way around. DesignLens,
                our in-house visual comparison tool, closes the gap between mockup and
                implementation.
              </p>
              <div className="mt-8 p-6 rounded-2xl bg-[#1a1a18] text-[#faf9f7]">
                <div className="flex items-center gap-2 mb-3">
                  <Workflow className="w-4 h-4 text-[#c4a882]" />
                  <span className="text-xs uppercase tracking-[0.15em] text-[#c4a882]">
                    Flagship tool
                  </span>
                </div>
                <p className="font-display text-xl mb-2">DesignLens</p>
                <p className="text-sm text-[#a8a59e] leading-relaxed mb-4">
                  Upload a Figma frame or mockup, navigate a live staging URL in a headless
                  browser, and get pixel-level diff reports with match scores and annotated
                  regions.
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[#c4a882] hover:text-[#faf9f7] transition-colors"
                >
                  Open DesignLens
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
            <ul className="grid grid-cols-2 gap-3">
              {tools.map((tool) => (
                <li
                  key={tool.name}
                  className="flex flex-col justify-between p-5 rounded-xl border border-[#e8e6e1] bg-white hover:border-[#c4a882] transition-colors"
                >
                  <span className="font-medium text-[#1a1a18]">{tool.name}</span>
                  <span className="text-[10px] uppercase tracking-[0.15em] text-[#8a8780] mt-3">
                    {tool.category}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Process */}
      <section id="process" className="border-t border-[#e8e6e1] bg-white">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <p className="text-xs uppercase tracking-[0.25em] text-[#8a8780] mb-3">
            How we work
          </p>
          <h2 className="font-display text-3xl md:text-5xl tracking-tight mb-14">
            Process
          </h2>
          <ol className="grid md:grid-cols-4 gap-8 md:gap-6">
            {process.map((item) => (
              <li key={item.step}>
                <span className="font-display text-4xl text-[#e8e6e1]">{item.step}</span>
                <h3 className="font-display text-xl mt-4 mb-2">{item.title}</h3>
                <p className="text-sm text-[#5c5a55] leading-relaxed">{item.detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[#e8e6e1]">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28 text-center">
          <h2 className="font-display text-3xl md:text-5xl tracking-tight mb-4">
            Ready to tighten the design–dev loop?
          </h2>
          <p className="text-[#5c5a55] max-w-lg mx-auto mb-8 text-sm leading-relaxed">
            Start with a visual QA pass on your staging build, or reach out for a full
            product design engagement.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#1a1a18] text-[#faf9f7] text-sm font-medium rounded-full hover:bg-[#2d2d2a] transition-colors"
            >
              Run a comparison
              <ArrowUpRight className="w-4 h-4" />
            </Link>
            <a
              href="mailto:hello@lensstudio.design"
              className="inline-flex items-center gap-2 px-8 py-3.5 border border-[#d4d1ca] text-sm font-medium rounded-full hover:border-[#1a1a18] transition-colors"
            >
              hello@lensstudio.design
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#e8e6e1] py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#8a8780]">
          <p>© {new Date().getFullYear()} Lens Studio</p>
          <p className="uppercase tracking-[0.15em]">Design · Systems · Visual QA</p>
        </div>
      </footer>
    </div>
  );
}
