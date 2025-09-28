// src/app/privacy/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy – Quirra",
  description:
    "How the Quirra extension and website collect, use, and protect data. Learn about permissions, retention, and your privacy rights.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Privacy Policy – Quirra",
    description:
      "How the Quirra extension and website collect, use, and protect data. Learn about permissions, retention, and your privacy rights.",
    url: "/privacy",
    type: "article",
  },
};

const EFFECTIVE_DATE = "September 27, 2025";

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Quirra Privacy Policy</h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Effective date: <time dateTime="2025-09-27">{EFFECTIVE_DATE}</time>
        </p>
      </header>

      <section className="space-y-6 text-[15px] leading-7">
        <p>
          This Privacy Policy explains how <strong>Quirra</strong> (the browser extension and any related
          web properties, collectively the “Service”) collects, uses, and protects information. By using the
          Service, you agree to this policy.
        </p>

        <div className="rounded-xl border border-[color:var(--card-border)] bg-[color:var(--card)] p-4">
          <p className="text-sm text-[color:var(--muted)]">
            <strong>Quick summary:</strong> Quirra analyzes AI prompts and responses to provide
            originality, style, and provenance insights. We minimize data, avoid unnecessary permissions,
            and never sell personal data.
          </p>
        </div>

        <h2 id="who-we-are" className="mt-4 text-xl font-semibold">Who we are & contact</h2>
        <p>
          “We”, “us”, and “our” refer to the Quirra team. For questions or privacy requests, contact:
        </p>
        <address className="not-italic">
          Email:{" "}
          <a className="underline" href="mailto:duahsylvester24@gmail.com">
            duahsylvester24@gmail.com
          </a>
          <br />
          Postal (optional): Quirra / USA
        </address>
        <p className="text-sm text-[color:var(--muted)]">
          <em>duahsylvester24@gmail.com</em>
        </p>

        <h2 id="scope" className="text-xl font-semibold">Scope</h2>
        <p>
          This policy covers: (1) the Quirra browser extension (“Extension”) and (2) the Quirra website /
          dashboard (“Site”). It does not cover third-party websites you visit or services you connect to.
        </p>

        <h2 id="data-we-collect" className="text-xl font-semibold">Data we collect</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Extension usage data you generate:</strong> When you interact with AI tools in your
            browser, the Extension may analyze <em>prompt text</em> and <em>AI responses</em> to compute
            originality, duplication, style, and provenance scores. We also capture minimal context such as
            the current page URL, timestamp, and a coarse “context” label (e.g., “drafting”, “summarizing”).
          </li>
          <li>
            <strong>Anonymous identifier:</strong> The Extension stores a random, stable identifier in
            browser storage and may hash it before sending to the backend to avoid a direct identifier.
          </li>
          <li>
            <strong>Settings and preferences:</strong> Your extension settings (e.g., backend URL, enabled
            features) are kept in the browser’s storage.
          </li>
          <li>
            <strong>Site analytics (if enabled):</strong> We may collect basic events (e.g., page views) in
            aggregate form to improve the product. We do not sell this data.
          </li>
        </ul>
        <p>
          <strong>Sensitive data:</strong> We do not intentionally collect passwords, payment information,
          or government identifiers. Please avoid entering sensitive personal information into prompts. If
          you believe sensitive data was transmitted, contact us so we can assist with deletion.
        </p>

        <h2 id="permissions" className="text-xl font-semibold">Why the Extension needs permissions</h2>
        <div className="rounded-xl border border-[color:var(--card-border)] bg-[color:var(--card)] p-4">
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>storage</strong>: Save extension settings and an anonymous, randomly generated ID.
            </li>
            <li>
              <strong>activeTab</strong>: Run analysis <em>only</em> on the tab you’re interacting with (e.g., to
              read visible prompt/response text for scoring) and show the overlay UI.
            </li>
            <li>
              <strong>scripting</strong>: Inject the lightweight overlay interface and logic required to compute
              on-page results. We do not run remote code.
            </li>
            <li>
              <strong>Host permissions</strong> (if configured, e.g. specific AI domains):
              allow the Extension to read AI prompt/response text on those pages in order to compute scores
              and show suggestions. We limit scope to what’s necessary for the single purpose.
            </li>
          </ul>
        </div>

        <h2 id="how-we-use-data" className="text-xl font-semibold">How we use data</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>Provide core features: compute duplication/style/provenance risk and show advice.</li>
          <li>Improve the Service: aggregate statistics and diagnostics to enhance accuracy and UX.</li>
          <li>Protect users and our Service: detect abuse or misuse, and maintain reliability.</li>
        </ul>
        <p>
          <strong>No selling of data:</strong> We do not sell personal data. We do not use data for targeted
          advertising.
        </p>

        <h2 id="retention" className="text-xl font-semibold">Data retention</h2>
        <p>
          We retain event data only as long as needed for the purpose it was collected (e.g., computing
          scores and short-term quality checks) and then either delete or aggregate it. If you request
          deletion, we will delete records associated with your identifier (subject to legal obligations).
        </p>

        <h2 id="sharing" className="text-xl font-semibold">Sharing</h2>
        <p>
          We may share data with trusted service providers (e.g., hosting, logging, error monitoring) under
          agreements that require them to use data solely to provide services to us. We may disclose data if
          required by law, to protect rights and safety, or during a business transfer. We do not sell data.
        </p>

        <h2 id="security" className="text-xl font-semibold">Security</h2>
        <p>
          We use reasonable administrative, technical, and organizational measures (e.g., TLS in transit,
          access controls). No system is perfectly secure; if you suspect an issue, contact us immediately.
        </p>

        <h2 id="international" className="text-xl font-semibold">International transfers</h2>
        <p>
          Depending on your location, data may be processed in countries that may have different data
          protection laws. When we transfer personal data internationally, we use appropriate safeguards
          where required by law.
        </p>

        <h2 id="your-rights" className="text-xl font-semibold">Your rights & choices</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Access / correction / deletion:</strong> You can request a copy, correction, or deletion
            of personal data we hold about you. We may need to verify your request (e.g., via your contact
            email and/or an identifier associated with your browser).
          </li>
          <li>
            <strong>Opt out:</strong> You can disable the Extension on specific sites or remove it at any
            time. Some settings are available in the Extension’s options page.
          </li>
          <li>
            <strong>EEA/UK residents:</strong> You may have additional rights under GDPR (e.g., portability,
            restrict/object to processing, lodge a complaint with your local supervisory authority).
          </li>
          <li>
            <strong>California residents:</strong> We do not sell personal information. You may request
            access and deletion under the CCPA/CPRA.
          </li>
        </ul>

        <h2 id="remote-code" className="text-xl font-semibold">Remote code</h2>
        <p>
          The Extension does <strong>not</strong> execute remote JavaScript/Wasm. All code runs from the
          packaged extension. Any network calls are limited to our API endpoints to fetch analysis results.
        </p>

        <h2 id="children" className="text-xl font-semibold">Children’s privacy</h2>
        <p>
          The Service is not directed to children under 13, and we do not knowingly collect data from them.
          If you believe a child has provided us personal data, contact us to remove it.
        </p>

        <h2 id="changes" className="text-xl font-semibold">Changes to this policy</h2>
        <p>
          We may update this policy to reflect changes in our practices or applicable laws. We will update
          the “Effective date” above and, where required, provide additional notice.
        </p>

        <h2 id="contact" className="text-xl font-semibold">Contact</h2>
        <p>
          For privacy questions or requests:{" "}
          <a className="underline" href="mailto:duahsylvester24@gmail.com">
            duahsylvester24@gmail.com
          </a>
          .
        </p>
      </section>
    </main>
  );
}
