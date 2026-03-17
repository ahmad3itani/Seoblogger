"use client";

import LegalPageLayout from "@/components/LegalPageLayout";

export default function PrivacyContent() {
  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated="March 17, 2026">
      <p>
        At BloggerSEO (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website at <strong>bloggerseo.ai</strong> and use our services.
      </p>

      <h2>1. Information We Collect</h2>

      <h3>1.1 Personal Information</h3>
      <p>When you register for an account, we may collect:</p>
      <ul>
        <li>Full name and email address</li>
        <li>Google account information (when you sign in with Google)</li>
        <li>Billing information and payment details (processed securely through our payment provider)</li>
        <li>Blogger blog URLs and blog IDs connected to your account</li>
      </ul>

      <h3>1.2 Usage Data</h3>
      <p>We automatically collect certain information when you use our platform:</p>
      <ul>
        <li>IP address and browser type</li>
        <li>Pages visited and features used</li>
        <li>Article generation history and preferences</li>
        <li>Device information and operating system</li>
        <li>Referral source and session duration</li>
      </ul>

      <h3>1.3 Google API Data</h3>
      <p>
        When you connect your Blogger account, we access your blog data through Google&apos;s API in compliance with <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>. We only access the data necessary to provide our services, including blog posts, blog metadata, and publishing capabilities. We do not sell or share your Google data with third parties.
      </p>

      <h2>2. How We Use Your Information</h2>
      <p>We use the information we collect to:</p>
      <ul>
        <li>Provide, maintain, and improve our services</li>
        <li>Generate and publish content to your Blogger blogs</li>
        <li>Process your transactions and manage your subscription</li>
        <li>Send you service-related communications and updates</li>
        <li>Analyze usage patterns to improve our platform</li>
        <li>Detect and prevent fraud or abuse</li>
        <li>Comply with legal obligations</li>
      </ul>

      <h2>3. Data Sharing and Disclosure</h2>
      <p>We do <strong>not</strong> sell your personal information. We may share your data with:</p>
      <ul>
        <li><strong>Service Providers:</strong> Third-party services that help us operate our platform (hosting, payment processing, analytics)</li>
        <li><strong>AI Providers:</strong> Content generation requests are sent to AI model providers (e.g., Anthropic, OpenAI) to generate articles. These requests contain article topics and instructions but not your personal information</li>
        <li><strong>Google APIs:</strong> To publish content to your Blogger blog on your behalf</li>
        <li><strong>Legal Requirements:</strong> When required by law, subpoena, or legal process</li>
      </ul>

      <h2>4. Data Security</h2>
      <p>
        We implement industry-standard security measures to protect your information, including encrypted data transmission (TLS/SSL), secure database storage, and regular security audits. However, no method of electronic transmission or storage is 100% secure, and we cannot guarantee absolute security.
      </p>

      <h2>5. Cookies and Tracking</h2>
      <p>We use cookies and similar technologies to:</p>
      <ul>
        <li>Maintain your login session</li>
        <li>Remember your preferences</li>
        <li>Analyze site traffic and usage (via Google Analytics)</li>
        <li>Improve our services</li>
      </ul>
      <p>
        You can control cookies through your browser settings. Disabling cookies may affect certain features of our platform.
      </p>

      <h2>6. Your Rights</h2>
      <p>Depending on your location, you may have the right to:</p>
      <ul>
        <li>Access, correct, or delete your personal data</li>
        <li>Object to or restrict certain data processing</li>
        <li>Export your data in a portable format</li>
        <li>Withdraw consent at any time</li>
        <li>Lodge a complaint with a supervisory authority</li>
      </ul>
      <p>
        To exercise any of these rights, contact us at <a href="mailto:support@bloggerseo.ai">support@bloggerseo.ai</a>.
      </p>

      <h2>7. Data Retention</h2>
      <p>
        We retain your personal data for as long as your account is active or as needed to provide services. Generated articles and associated data are stored until you delete them or close your account. We may retain certain information as required by law or for legitimate business purposes.
      </p>

      <h2>8. Children&apos;s Privacy</h2>
      <p>
        BloggerSEO is not intended for children under 16. We do not knowingly collect personal information from children. If you believe a child has provided us with personal data, please contact us and we will delete it promptly.
      </p>

      <h2>9. International Data Transfers</h2>
      <p>
        Your data may be processed in countries other than your own. We ensure appropriate safeguards are in place to protect your information in accordance with applicable data protection laws.
      </p>

      <h2>10. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the &quot;Last updated&quot; date. Your continued use of our services after changes constitutes acceptance of the updated policy.
      </p>

      <h2>11. Contact Us</h2>
      <p>
        If you have questions about this Privacy Policy or our data practices, contact us at:
      </p>
      <ul>
        <li><strong>Email:</strong> <a href="mailto:support@bloggerseo.ai">support@bloggerseo.ai</a></li>
        <li><strong>Website:</strong> <a href="https://bloggerseo.ai">bloggerseo.ai</a></li>
      </ul>
    </LegalPageLayout>
  );
}
