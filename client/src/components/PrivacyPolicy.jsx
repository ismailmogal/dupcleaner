import React from 'react';
import './LegalPages.css';

function PrivacyPolicy() {
  return (
    <div className="legal-page">
      <h1>Privacy Policy</h1>
      <div className="legal-content">
        <section>
          <h2>1. Introduction</h2>
          <p>This Privacy Policy describes how we collect, use, and handle your personal information when you use our application. We are committed to protecting your privacy and ensuring you have a positive experience on our application.</p>
        </section>

        <section>
          <h2>2. Information We Collect</h2>
          <h3>2.1 Microsoft Account Information</h3>
          <p>When you use our application with your Microsoft account, we collect:</p>
          <ul>
            <li>Basic profile information (name, email address)</li>
            <li>OneDrive file metadata (file names, sizes, and types)</li>
            <li>Authentication tokens for accessing OneDrive</li>
          </ul>

          <h3>2.2 Usage Information</h3>
          <p>We collect information about how you use our application, including:</p>
          <ul>
            <li>Log data (IP address, browser type, pages visited)</li>
            <li>Device information</li>
            <li>Usage patterns and preferences</li>
          </ul>
        </section>

        <section>
          <h2>3. How We Use Your Information</h2>
          <p>We use the collected information for:</p>
          <ul>
            <li>Providing and maintaining the application</li>
            <li>Authenticating your Microsoft account</li>
            <li>Accessing and displaying your OneDrive files</li>
            <li>Improving our application</li>
            <li>Communicating with you about updates or changes</li>
          </ul>
        </section>

        <section>
          <h2>4. Data Storage and Security</h2>
          <p>We implement appropriate security measures to protect your personal information. However, no method of transmission over the Internet or electronic storage is 100% secure.</p>
        </section>

        <section>
          <h2>5. Microsoft's Privacy Policy</h2>
          <p>Our application integrates with Microsoft services. Your use of Microsoft services is also governed by Microsoft's Privacy Policy. We encourage you to review Microsoft's Privacy Policy to understand how they handle your data.</p>
        </section>

        <section>
          <h2>6. Data Sharing and Disclosure</h2>
          <p>We do not sell, trade, or otherwise transfer your personal information to third parties. We may share your information with:</p>
          <ul>
            <li>Microsoft (for authentication and OneDrive access)</li>
            <li>Service providers who assist in operating our application</li>
            <li>Law enforcement when required by law</li>
          </ul>
        </section>

        <section>
          <h2>7. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access your personal information</li>
            <li>Correct inaccurate information</li>
            <li>Request deletion of your information</li>
            <li>Opt-out of certain data collection</li>
            <li>Export your data</li>
          </ul>
        </section>

        <section>
          <h2>8. Cookies and Tracking</h2>
          <p>We use cookies and similar tracking technologies to improve your experience. You can control cookies through your browser settings.</p>
        </section>

        <section>
          <h2>9. Children's Privacy</h2>
          <p>Our application is not intended for children under 13. We do not knowingly collect personal information from children under 13.</p>
        </section>

        <section>
          <h2>10. Changes to Privacy Policy</h2>
          <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.</p>
        </section>

        <section>
          <h2>11. Contact Us</h2>
          <p>If you have any questions about this Privacy Policy, please contact us at [Your Contact Information].</p>
        </section>
      </div>
    </div>
  );
}

export default PrivacyPolicy; 