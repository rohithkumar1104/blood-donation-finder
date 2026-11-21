import { Fragment, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import HomePublicRequests from "../components/HomePublicRequests";

/* ---------- routes ---------- */
// Central place for the Home page's navigation targets.
// Change these to match the routes in your App.jsx.
const ROUTES = {
  login: "/login",
  register: "/register",
  findDonors: "/donors",
  requestBlood: "/request-blood",
  becomeDonor: "/become-donor",
  donorProfile: "/donor-profile",
  inbox: "/inbox",
};

/* ---------- icons ---------- */
const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
};

function DropIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2.5c-.4 0-.8.2-1 .5C8.2 6.7 5 10.4 5 14.2A7 7 0 0 0 12 21a7 7 0 0 0 7-6.8c0-3.8-3.2-7.5-6-11.2-.2-.3-.6-.5-1-.5Z" />
    </svg>
  );
}

function SearchIcon({ className = "h-6 w-6" }) {
  return (
    <svg {...base} className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function HeartIcon({ className = "h-6 w-6" }) {
  return (
    <svg {...base} className={className}>
      <path d="M12 20s-7-4.4-9-9.2C1.8 7.6 3.8 4.5 7 4.5c2 0 3.4 1 5 3 1.6-2 3-3 5-3 3.2 0 5.2 3.1 4 6.3C19 15.6 12 20 12 20Z" />
    </svg>
  );
}

function AlertIcon({ className = "h-6 w-6" }) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3 2.5 20h19L12 3Z" />
      <path d="M12 10v4M12 17.5h.01" />
    </svg>
  );
}

function MenuIcon({ className = "h-6 w-6" }) {
  return (
    <svg {...base} className={className}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon({ className = "h-6 w-6" }) {
  return (
    <svg {...base} className={className}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function ClockIcon({ className = "h-6 w-6" }) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function UsersIcon({ className = "h-6 w-6" }) {
  return (
    <svg {...base} className={className}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <path d="M16 4.7a3.5 3.5 0 0 1 0 6.6M18 14.3c2 .7 3.5 2.6 3.5 5.7" />
    </svg>
  );
}

function ShieldIcon({ className = "h-6 w-6" }) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3 4.5 6v5.5c0 4.6 3.2 8 7.5 9.5 4.3-1.5 7.5-4.9 7.5-9.5V6L12 3Z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </svg>
  );
}

function UserIcon({ className = "h-5 w-5" }) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
    </svg>
  );
}

function MessageIcon({ className = "h-5 w-5" }) {
  return (
    <svg {...base} className={className}>
      <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" />
    </svg>
  );
}

function ChevronIcon({ className = "h-4 w-4" }) {
  return (
    <svg {...base} className={className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

// Step icons for the "How donation works" section (grey line art, red accents).
function RegisterStepIcon({ className = "h-14 w-14" }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="9" y="5" width="26" height="36" rx="3" stroke="#6b7280" />
      <circle cx="22" cy="17" r="4" stroke="#6b7280" />
      <path d="M14.5 30c1-4 4-5.5 7.5-5.5s6.5 1.5 7.5 5.5" stroke="#6b7280" />
      <path d="m28 40 1-5 11-11 4 4-11 11-5 1Z" stroke="#dc2626" fill="#fff" />
    </svg>
  );
}

function ScreeningStepIcon({ className = "h-14 w-14" }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="9" y="8" width="30" height="34" rx="3" stroke="#6b7280" />
      <rect
        x="18"
        y="4"
        width="12"
        height="8"
        rx="2"
        stroke="#6b7280"
        fill="#fff"
      />
      <path d="M13 24h6l3-6 4 11 3-5h6" stroke="#dc2626" />
      <path d="M14 35h20" stroke="#6b7280" />
    </svg>
  );
}

function DonateStepIcon({ className = "h-14 w-14" }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M24 4c-.3 0-.6.2-.8.4C20.5 8 17.5 11.5 17.5 15a6.5 6.5 0 0 0 13 0c0-3.5-3-7-5.7-10.6-.2-.2-.5-.4-.8-.4Z"
        fill="#dc2626"
        stroke="#dc2626"
      />
      <path d="M5 28c1 8 7 14 16 14h6c9 0 15-6 16-14" stroke="#6b7280" />
      <path d="M5 28c3 0 6 2 8 4M43 28c-3 0-6 2-8 4" stroke="#6b7280" />
      <path d="M17 36h14" stroke="#6b7280" />
    </svg>
  );
}

function CheckIcon({ className = "h-4 w-4" }) {
  return (
    <svg {...base} strokeWidth={3} className={className}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

/* ---------- BloodDrive ---------- */
// Original flat illustration: a donated blood bag, a drop and a heart.
// Inline SVG, so no image files or extra dependencies are needed.
function BloodDrive({ className = "" }) {
  return (
    <svg
      viewBox="0 0 440 400"
      className={className}
      role="img"
      aria-label="Illustration of a blood bag, a blood drop and a heart"
    >
      <circle cx="220" cy="200" r="170" fill="#fee2e2" />
      <circle cx="220" cy="200" r="120" fill="#fecaca" opacity="0.55" />

      {/* hanging hook and tube */}
      <path
        d="M220 36v34"
        stroke="#991b1b"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M200 36h40"
        stroke="#991b1b"
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* bag */}
      <path
        d="M162 78h116a20 20 0 0 1 20 20v150c0 44-34 76-78 76s-78-32-78-76V98a20 20 0 0 1 20-20Z"
        fill="#ffffff"
        stroke="#b91c1c"
        strokeWidth="6"
      />
      <path
        d="M170 190h100v58c0 33-22 56-50 56s-50-23-50-56v-58Z"
        fill="#dc2626"
      />
      <path
        d="M170 190c18-9 34 9 50 0s32-9 50 0"
        fill="none"
        stroke="#ef4444"
        strokeWidth="6"
      />
      <rect
        x="182"
        y="102"
        width="76"
        height="40"
        rx="8"
        fill="#fef2f2"
        stroke="#fca5a5"
        strokeWidth="3"
      />
      <path
        d="M220 111c-1 0-2 .6-2.5 1.4C213 118 209 122 209 126.5a11 11 0 0 0 22 0c0-4.5-4-8.5-8.5-14.1-.5-.8-1.5-1.4-2.5-1.4Z"
        fill="#dc2626"
      />
      <path
        d="M196 232v30"
        stroke="#fca5a5"
        strokeWidth="6"
        strokeLinecap="round"
        opacity="0.8"
      />

      {/* outlet tube */}
      <path
        d="M220 320v28c0 12 10 20 22 20h30"
        fill="none"
        stroke="#b91c1c"
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* floating drop */}
      <g transform="translate(330 86) scale(2.2)">
        <path
          d="M12 2.5c-.4 0-.8.2-1 .5C8.2 6.7 5 10.4 5 14.2A7 7 0 0 0 12 21a7 7 0 0 0 7-6.8c0-3.8-3.2-7.5-6-11.2-.2-.3-.6-.5-1-.5Z"
          fill="#dc2626"
        />
        <path
          d="M8.5 14.5a3.5 3.5 0 0 0 2.5 3.3"
          fill="none"
          stroke="#fecaca"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </g>

      {/* heart */}
      <g transform="translate(58 250) scale(3.2)">
        <path
          d="M12 20s-7-4.4-9-9.2C1.8 7.6 3.8 4.5 7 4.5c2 0 3.4 1 5 3 1.6-2 3-3 5-3 3.2 0 5.2 3.1 4 6.3C19 15.6 12 20 12 20Z"
          fill="#ffffff"
          stroke="#dc2626"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </g>

      {/* small accents */}
      <circle cx="96" cy="120" r="7" fill="#fca5a5" />
      <circle cx="370" cy="270" r="9" fill="#fca5a5" />
      <circle cx="116" cy="330" r="5" fill="#ef4444" opacity="0.6" />
    </svg>
  );
}

/* ---------- SiteHeader ---------- */
const NAV_LINKS = [
  { label: "Home", href: "#top" },
  { label: "Services", href: "#services" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Why donate", href: "#why-donate" },
  { label: "Blood groups", href: "#blood-groups" },
  { label: "Eligibility", href: "#eligibility" },
];

function SiteHeader({
  isAuthenticated,
  onLogin,
  onRegister,
  onDonorProfile,
  onInbox,
  onLogout,
}) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const handleUnreadCount = (event) => {
      setUnreadCount(event.detail || 0);
    };

    window.addEventListener("chat-unread-count", handleUnreadCount);

    return () => {
      window.removeEventListener("chat-unread-count", handleUnreadCount);
    };
  }, []);
  const [open, setOpen] = useState(false);

  const closeThen = (action) => () => {
    setOpen(false);
    action();
  };

  const profileButton = (extra = "") => (
    <button
      type="button"
      onClick={closeThen(onDonorProfile)}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 transition hover:border-red-600 hover:text-red-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-100 ${extra}`}
    >
      <UserIcon className="h-4 w-4" />
      Donor profile
    </button>
  );

  const loginButton = (extra = "") => (
    <button
      type="button"
      onClick={closeThen(onLogin)}
      className={`rounded-lg border border-red-600 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-100 ${extra}`}
    >
      Login
    </button>
  );

  const registerButton = (extra = "") => (
    <button
      type="button"
      onClick={closeThen(onRegister)}
      className={`rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-200 ${extra}`}
    >
      Register
    </button>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <a href="#top" className="flex shrink-0 items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600 text-white">
            <DropIcon className="h-6 w-6" />
          </span>
          <span className="leading-tight">
            <span className="block text-xl font-bold tracking-tight text-neutral-900">
              BloodLink
            </span>
            <span className="block text-xs text-neutral-500">
              Find donors. Save lives.
            </span>
          </span>
        </a>

        {/* Desktop navigation */}
        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="rounded-md px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-red-50 hover:text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              {profileButton("hidden md:inline-flex")}
              <button
                type="button"
                onClick={closeThen(onInbox)}
                aria-label="Open inbox"
                title="My Inbox"
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-300 bg-white text-neutral-700 transition hover:border-red-600 hover:bg-red-50 hover:text-red-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-100"
              >
                <MessageIcon className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500" />
                )}
              </button>
              <button
                type="button"
                onClick={closeThen(onLogout)}
                className="hidden rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 sm:inline-block"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              {loginButton("hidden sm:inline-block")}
              {registerButton("hidden sm:inline-block")}
            </>
          )}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="rounded-md p-2 text-neutral-700 hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {/* Mobile / tablet menu */}
      {open && (
        <nav
          id="mobile-nav"
          aria-label="Primary"
          className="border-t border-neutral-200 bg-white lg:hidden"
        >
          <ul className="mx-auto max-w-7xl px-2 py-2 sm:px-4">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-4 py-3 text-sm font-medium text-neutral-800 hover:bg-red-50 hover:text-red-700"
                >
                  {link.label}
                </a>
              </li>
            ))}
            {isAuthenticated ? (
              <>
                <li className="px-2 pb-2 pt-2">
                  <button
                    type="button"
                    onClick={closeThen(onLogout)}
                    className="w-full rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Logout
                  </button>
                </li>
              </>
            ) : (
              <li className="flex gap-2 px-2 pb-2 pt-2 sm:hidden">
                {loginButton("flex-1")}
                {registerButton("flex-1")}
              </li>
            )}
          </ul>
        </nav>
      )}
    </header>
  );
}

/* ---------- Hero ---------- */
function Hero({ onRequestBlood }) {
  return (
    <section id="top" className="border-b border-neutral-200 bg-red-50">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:py-20">
        <div>
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl">
            Blood when it is needed,
            <br className="hidden sm:block" /> from people who care.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-neutral-600 sm:text-lg">
            BloodLink helps patients and families reach registered blood donors
            quickly, and helps willing donors respond when someone is in need.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              onClick={onRequestBlood}
              className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-neutral-300"
            >
              <AlertIcon className="h-5 w-5" />
              Request blood in an emergency
            </button>
            <a
              href="#services"
              className="text-sm font-semibold text-red-700 underline-offset-4 hover:underline"
            >
              See all services
            </a>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md lg:max-w-none">
          <BloodDrive className="h-auto w-full" />
        </div>
      </div>
    </section>
  );
}

/* ---------- ServiceCards ---------- */
function ServiceCards({ onFindDonors, onRequestBlood, onBecomeDonor }) {
  const [activeId, setActiveId] = useState(null);
  const detailsRef = useRef(null);

  const services = [
    {
      id: "find",
      title: "Find Blood Donors",
      text: "Look up registered donors by blood group and location.",
      Icon: SearchIcon,
      intro:
        "Search for registered donors who match the blood group you need and are close to the patient.",
      points: [
        "Choose the blood group you need",
        "Enter the city or area",
        "See the donors who are available and contact them",
      ],
      action: "Find donors",
      onClick: onFindDonors,
    },
    {
      id: "request",
      title: "Request Blood",
      text: "Post an emergency blood request for nearby donors to see.",
      Icon: AlertIcon,
      intro:
        "When a patient needs blood urgently, post a request so that donors nearby can see it and respond.",
      points: [
        "Enter the blood group and number of units needed",
        "Add the hospital and a contact number",
        "Donors who can help will get in touch with you",
      ],
      action: "Request blood now",
      onClick: onRequestBlood,
    },
    {
      id: "donate",
      title: "Become a Donor",
      text: "Create your donor profile and help when someone needs you.",
      Icon: HeartIcon,
      intro:
        "Register as a donor so that people in need can find you when your blood group is required.",
      points: [
        "Add your blood group and city",
        "Share your contact details",
        "Keep your availability up to date",
      ],
      action: "Register as donor",
      onClick: onBecomeDonor,
    },
  ];

  const active = services.find((s) => s.id === activeId);

  // Bring the details into view when a card is chosen (helps on phones).
  useEffect(() => {
    if (activeId && detailsRef.current) {
      detailsRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [activeId]);

  return (
    <section id="services" className="scroll-mt-20 bg-white py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
            What would you like to do?
          </h2>
          <p className="mt-2 text-neutral-600">
            Select a service to see how it works.
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {services.map(({ id, title, text, Icon }) => {
            const selected = id === activeId;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveId(selected ? null : id)}
                aria-pressed={selected}
                aria-controls="service-details"
                className={`group flex flex-col rounded-2xl border p-7 text-left transition duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-200 ${
                  selected
                    ? "border-red-600 bg-red-600 text-white shadow-lg shadow-red-900/20"
                    : "border-neutral-200 bg-neutral-50 text-neutral-900 hover:-translate-y-0.5 hover:border-red-600 hover:bg-red-600 hover:text-white hover:shadow-lg hover:shadow-red-900/20"
                }`}
              >
                <span
                  className={`flex h-14 w-14 items-center justify-center rounded-xl transition ${
                    selected
                      ? "bg-white text-red-600"
                      : "bg-red-100 text-red-700 group-hover:bg-white group-hover:text-red-600"
                  }`}
                >
                  <Icon className="h-7 w-7" />
                </span>

                <span className="mt-6 text-xl font-bold">{title}</span>
                <span
                  className={`mt-2 flex-1 text-sm leading-relaxed transition ${
                    selected
                      ? "text-red-50"
                      : "text-neutral-600 group-hover:text-red-50"
                  }`}
                >
                  {text}
                </span>

                <span
                  className={`mt-6 inline-flex items-center gap-1.5 text-sm font-semibold transition ${
                    selected
                      ? "text-white"
                      : "text-red-700 group-hover:text-white"
                  }`}
                >
                  {selected ? "Hide details" : "View details"}
                  <ChevronIcon
                    className={`h-4 w-4 transition-transform ${selected ? "rotate-180" : ""}`}
                  />
                </span>
              </button>
            );
          })}
        </div>

        {/* Details for the chosen service */}
        <div id="service-details" ref={detailsRef} aria-live="polite">
          {active && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-6 sm:p-8">
              <div className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
                <div>
                  <h3 className="text-xl font-bold text-neutral-900">
                    {active.title}
                  </h3>
                  <p className="mt-2 max-w-2xl text-neutral-700">
                    {active.intro}
                  </p>

                  <ol className="mt-4 space-y-2">
                    {active.points.map((point, index) => (
                      <li
                        key={point}
                        className="flex items-start gap-3 text-sm text-neutral-800"
                      >
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
                          {index + 1}
                        </span>
                        {point}
                      </li>
                    ))}
                  </ol>
                </div>

                <button
                  type="button"
                  onClick={active.onClick}
                  className="w-full rounded-lg bg-red-600 px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-red-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-200 md:w-auto"
                >
                  {active.action}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------- HowItWorks ---------- */
const STEPS = [
  {
    title: "Create your profile",
    text: "Sign up and add your blood group and city so people can find you.",
    Icon: RegisterStepIcon,
  },
  {
    title: "Health check",
    text: "At the blood bank, staff check that you are fit to donate.",
    Icon: ScreeningStepIcon,
  },
  {
    title: "Donation day",
    text: "Trained staff look after you while you donate. It takes only a few minutes.",
    Icon: DonateStepIcon,
  },
];

// Blood bag, dotted path and heart, drawn as one wide strip.
function DonationPath() {
  return (
    <svg
      viewBox="0 0 1000 150"
      preserveAspectRatio="xMidYMid meet"
      className="mx-auto hidden h-auto w-full max-w-5xl sm:block"
      aria-hidden="true"
    >
      <defs>
        <clipPath id="heart-low">
          <rect x="0" y="11" width="24" height="10" />
        </clipPath>
      </defs>

      {/* dotted path from bag to heart */}
      <path
        d="M96 84C150 4 238 22 206 86C176 142 104 110 160 66C230 14 330 120 470 112C640 102 760 128 868 70"
        fill="none"
        stroke="#9ca3af"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="1 9"
      />

      {/* blood bag */}
      <g transform="translate(34 14)">
        <path
          d="M30 0v14"
          stroke="#6b7280"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M12 14h44a8 8 0 0 1 8 8v52c0 20-14 34-30 34S4 94 4 74V22a8 8 0 0 1 8-8Z"
          fill="#fff"
          stroke="#6b7280"
          strokeWidth="3"
        />
        <path d="M8 56h52v18c0 16-11 28-26 28S8 90 8 74V56Z" fill="#dc2626" />
        <path
          d="M34 108v14c0 6 5 10 12 10"
          fill="none"
          stroke="#6b7280"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>

      {/* heart */}
      <g transform="translate(866 6) scale(3.6)">
        <path
          d="M12 20s-7-4.4-9-9.2C1.8 7.6 3.8 4.5 7 4.5c2 0 3.4 1 5 3 1.6-2 3-3 5-3 3.2 0 5.2 3.1 4 6.3C19 15.6 12 20 12 20Z"
          fill="#fff"
          stroke="#6b7280"
          strokeWidth="0.9"
          strokeLinejoin="round"
        />
      </g>
      <g transform="translate(866 6) scale(3.6)">
        <path
          d="M12 20s-7-4.4-9-9.2C1.8 7.6 3.8 4.5 7 4.5c2 0 3.4 1 5 3 1.6-2 3-3 5-3 3.2 0 5.2 3.1 4 6.3C19 15.6 12 20 12 20Z"
          fill="#dc2626"
          clipPath="url(#heart-low)"
        />
      </g>
    </svg>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 bg-white pb-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="rounded-3xl bg-gradient-to-r from-red-50 via-white to-slate-100 px-5 py-10 sm:px-10">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-red-900 sm:text-3xl">
              How donation works
            </h2>
            <p className="mx-auto mt-2 max-w-md text-neutral-600">
              Register, get a quick health check and donate. A simple process
              that helps save lives.
            </p>
          </div>

          <div className="mt-4">
            <DonationPath />
          </div>

          <ol className="mt-6 grid gap-10 md:grid-cols-[1fr_4rem_1fr_4rem_1fr] md:gap-0">
            {STEPS.map(({ title, text, Icon }, index) => (
              <Fragment key={title}>
                <li className="flex flex-col items-center text-center">
                  <Icon />
                  <h3 className="mt-3 text-lg font-bold text-neutral-900">
                    <span className="mr-1.5 text-red-600">{index + 1}.</span>
                    {title}
                  </h3>
                  <p className="mt-1 max-w-[16rem] text-sm leading-relaxed text-neutral-600">
                    {text}
                  </p>
                </li>
                {index < STEPS.length - 1 && (
                  <li
                    aria-hidden="true"
                    className="mt-6 hidden self-start border-t border-dashed border-neutral-400 md:block"
                  />
                )}
              </Fragment>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ---------- WhyDonate ---------- */
const REASONS = [
  {
    title: "One donation helps more than one patient",
    text: "A single donation can be separated into red cells, plasma and platelets, so it can support several patients.",
    Icon: UsersIcon,
  },
  {
    title: "Blood cannot be made in a lab",
    text: "Hospitals depend entirely on voluntary donors for the blood used in surgery, accidents, childbirth and cancer care.",
    Icon: HeartIcon,
  },
  {
    title: "Blood does not keep for long",
    text: "Donated blood and its components can only be stored for a limited time, so regular donors keep the supply steady.",
    Icon: ClockIcon,
  },
  {
    title: "Donating is safe and supervised",
    text: "Trained staff screen every donor and use sterile, single-use equipment. The donation itself takes only a few minutes.",
    Icon: ShieldIcon,
  },
];

function WhyDonate() {
  return (
    <section
      id="why-donate"
      className="scroll-mt-20 border-y border-neutral-200 bg-neutral-50 py-16"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
            Why blood donation matters
          </h2>
          <p className="mt-3 leading-relaxed text-neutral-600">
            In an emergency there is rarely time to look for a donor. A
            community of willing, registered donors means help can be found when
            minutes count.
          </p>
        </div>

        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {REASONS.map(({ title, text, Icon }) => (
            <li
              key={title}
              className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-6 transition hover:border-red-200 hover:shadow-md"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-700">
                <Icon className="h-6 w-6" />
              </span>
              <h3 className="mt-5 text-base font-semibold text-neutral-900">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                {text}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------- BloodGroupChart ---------- */
const GROUP_ORDER = ["O−", "O+", "A−", "A+", "B−", "B+", "AB−", "AB+"];

// Standard red blood cell compatibility (ABO and Rh), worked out from the rules
// rather than typed by hand: group O can give to any ABO group, AB can receive
// from any, and Rh-negative blood can go to Rh-negative or Rh-positive patients.
function canDonate(donor, recipient) {
  const abo = (g) => g.replace(/[+−]/, "");
  const rhPositive = (g) => g.endsWith("+");

  const aboOk =
    abo(donor) === "O" ||
    abo(recipient) === "AB" ||
    abo(donor) === abo(recipient);
  const rhOk = !rhPositive(donor) || rhPositive(recipient);

  return aboOk && rhOk;
}

function Badge({ children, dark = false }) {
  return (
    <span
      className={`inline-flex h-8 min-w-[2.75rem] items-center justify-center rounded-md px-2 text-sm font-bold ${
        dark ? "bg-white/15 text-white" : "bg-red-600 text-white"
      }`}
    >
      {children}
    </span>
  );
}

function BloodGroupChart() {
  return (
    <section id="blood-groups" className="scroll-mt-20 bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
            Who can give to whom
          </h2>
          <p className="mt-3 leading-relaxed text-neutral-600">
            Red blood cell compatibility between blood groups. Read across a row
            to see which patients that donor group can help. The hospital always
            confirms the match with a cross-match test.
          </p>
        </div>

        <div className="mt-10 overflow-hidden rounded-2xl border border-neutral-200 shadow-sm">
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-center text-sm">
              <caption className="sr-only">
                Red blood cell compatibility: donor groups in rows, recipient
                groups in columns
              </caption>
              <thead>
                <tr className="bg-red-700 text-white">
                  <th
                    scope="col"
                    rowSpan={2}
                    className="sticky left-0 z-10 bg-red-700 px-4 py-3 text-left font-semibold"
                  >
                    Donor group
                  </th>
                  <th
                    scope="colgroup"
                    colSpan={GROUP_ORDER.length}
                    className="border-l border-red-600 px-4 py-3 font-semibold"
                  >
                    Can donate red cells to recipient group
                  </th>
                </tr>
                <tr className="bg-red-800 text-white">
                  {GROUP_ORDER.map((group) => (
                    <th
                      key={group}
                      scope="col"
                      className="border-l border-red-700 px-2 py-2.5 font-semibold"
                    >
                      {group}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {GROUP_ORDER.map((donor, rowIndex) => (
                  <tr
                    key={donor}
                    className={`transition hover:bg-red-50 ${
                      rowIndex % 2 === 0 ? "bg-white" : "bg-neutral-50"
                    }`}
                  >
                    <th
                      scope="row"
                      className={`sticky left-0 z-10 px-4 py-2.5 text-left ${
                        rowIndex % 2 === 0 ? "bg-white" : "bg-neutral-50"
                      }`}
                    >
                      <Badge>{donor}</Badge>
                    </th>
                    {GROUP_ORDER.map((recipient) => {
                      const ok = canDonate(donor, recipient);
                      return (
                        <td
                          key={recipient}
                          className="border-l border-neutral-200 px-2 py-2.5"
                        >
                          {ok ? (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white">
                              <CheckIcon className="h-3.5 w-3.5" />
                              <span className="sr-only">Compatible</span>
                            </span>
                          ) : (
                            <span className="text-neutral-300">
                              <span aria-hidden="true">–</span>
                              <span className="sr-only">Not compatible</span>
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-neutral-600">
          <span className="inline-flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white">
              <CheckIcon className="h-3 w-3" />
            </span>
            Compatible
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-5 text-center text-neutral-400">–</span>
            Not compatible
          </span>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
            <Badge>O−</Badge>
            <div>
              <h3 className="font-semibold text-neutral-900">
                Universal red cell donor
              </h3>
              <p className="mt-1 text-sm text-neutral-600">
                O negative red cells can be given to patients of every blood
                group.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
            <Badge>AB+</Badge>
            <div>
              <h3 className="font-semibold text-neutral-900">
                Universal red cell recipient
              </h3>
              <p className="mt-1 text-sm text-neutral-600">
                AB positive patients can receive red cells from every blood
                group.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Eligibility ---------- */
const criteria = [
  { label: "Age", value: "18 to 65 years" },
  { label: "Weight", value: "At least 45 kg" },
  { label: "Haemoglobin", value: "At least 12.5 g/dL" },
  { label: "Gap between donations", value: "At least 3 months" },
];

function Eligibility({ onBecomeDonor }) {
  return (
    <section
      id="eligibility"
      className="scroll-mt-20 border-t border-neutral-200 bg-neutral-50 py-14"
    >
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_1fr]">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
            Can you donate?
          </h2>
          <p className="mt-3 max-w-lg leading-relaxed text-neutral-600">
            These are the general requirements for donating whole blood in
            India. A doctor at the blood bank checks your health and makes the
            final decision on the day, and the rules can differ slightly between
            centres.
          </p>
          <button
            onClick={onBecomeDonor}
            className="mt-6 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-200"
          >
            Become a donor
          </button>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2">
          {criteria.map(({ label, value }) => (
            <div
              key={label}
              className="rounded-2xl border border-neutral-200 bg-white p-5"
            >
              <dt className="text-sm text-neutral-500">{label}</dt>
              <dd className="mt-1 text-lg font-semibold text-neutral-900">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* ---------- SiteFooter ---------- */
const QUICK_LINKS = [
  { label: "Services", href: "#services" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Why donate", href: "#why-donate" },
  { label: "Blood groups", href: "#blood-groups" },
  { label: "Eligibility", href: "#eligibility" },
];

function SiteFooter({
  isAuthenticated,
  onLogin,
  onRegister,
  onDonorProfile,
  onLogout,
}) {
  const accountLinks = isAuthenticated
    ? [
        { label: "Donor profile", onClick: onDonorProfile },
        { label: "Logout", onClick: onLogout },
      ]
    : [
        { label: "Login", onClick: onLogin },
        { label: "Register", onClick: onRegister },
      ];

  return (
    <footer className="bg-neutral-900 text-neutral-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-white">
              <DropIcon />
            </span>
            <span className="text-lg font-bold text-white">BloodLink</span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed">
            A community platform that connects people who need blood with
            willing donors. Donate blood, save lives.
          </p>
        </div>

        <nav aria-label="Footer">
          <h2 className="text-sm font-semibold text-white">Quick links</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {QUICK_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="hover:text-white hover:underline"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-sm font-semibold text-white">Your account</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {accountLinks.map(({ label, onClick }) => (
              <li key={label}>
                <button
                  type="button"
                  onClick={onClick}
                  className="hover:text-white hover:underline focus:outline-none focus-visible:text-white focus-visible:underline"
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-neutral-800">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs leading-relaxed text-neutral-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} BloodLink. All rights reserved.</p>
          <p>
            BloodLink is not a substitute for professional medical advice. In an
            emergency, contact your nearest hospital.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ---------- Home page ---------- */
function Home() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    Boolean(localStorage.getItem("authToken")),
  );
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    const syncAuthentication = () => {
      setIsAuthenticated(Boolean(localStorage.getItem("authToken")));
    };
    window.addEventListener("storage", syncAuthentication);
    window.addEventListener("focus", syncAuthentication);
    return () => {
      window.removeEventListener("storage", syncAuthentication);
      window.removeEventListener("focus", syncAuthentication);
    };
  }, []);

  const goToLogin = () => navigate(ROUTES.login);
  const goToRegister = () => navigate(ROUTES.register);

  const requireLogin = (action) => {
    if (!localStorage.getItem("authToken")) {
      setShowLoginPrompt(true);
      return;
    }
    action();
  };

  const goToFindDonors = () => requireLogin(() => navigate(ROUTES.findDonors));
  const goToRequestBlood = () =>
    requireLogin(() => navigate(ROUTES.requestBlood));
  const goToBecomeDonor = () =>
    requireLogin(() => navigate(ROUTES.becomeDonor));
  const goToDonorProfile = () =>
    requireLogin(() => navigate(ROUTES.donorProfile));
  const goToInbox = () => requireLogin(() => navigate(ROUTES.inbox));

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    setIsAuthenticated(false);
    setShowLoginPrompt(false);
    navigate("/home");
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      {showLoginPrompt && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-prompt-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2
              id="login-prompt-title"
              className="text-xl font-bold text-neutral-900"
            >
              Login required
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">
              Please login or create an account to continue.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowLoginPrompt(false)}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLoginPrompt(false);
                  goToLogin();
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Login now
              </button>
            </div>
          </div>
        </div>
      )}
      <a
        href="#services"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-red-700"
      >
        Skip to services
      </a>

      <SiteHeader
        isAuthenticated={isAuthenticated}
        onLogin={goToLogin}
        onRegister={goToRegister}
        onDonorProfile={goToDonorProfile}
        onInbox={goToInbox}
        onLogout={handleLogout}
      />

      <main>
        {/* Public blood requests — visible to everyone */}
        <HomePublicRequests />

        <Hero onRequestBlood={goToRequestBlood} />

        <ServiceCards
          onFindDonors={goToFindDonors}
          onRequestBlood={goToRequestBlood}
          onBecomeDonor={goToBecomeDonor}
        />

        <HowItWorks />
        <WhyDonate />
        <BloodGroupChart />
        <Eligibility onBecomeDonor={goToBecomeDonor} />
      </main>

      <SiteFooter
        isAuthenticated={isAuthenticated}
        onLogin={goToLogin}
        onRegister={goToRegister}
        onDonorProfile={goToDonorProfile}
        onLogout={handleLogout}
      />
    </div>
  );
}

export default Home;
