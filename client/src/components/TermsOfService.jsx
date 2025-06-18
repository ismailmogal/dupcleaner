import React from 'react';
import './LegalPages.css';

function TermsOfService() {
  return (
    <div className="legal-page">
      <h1>Terms of Service</h1>
      <div className="legal-content">
        <section>
          <h2>1. Acceptance of Terms</h2>
          <p>By accessing and using this application, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this application.</p>
        </section>

        <section>
          <h2>2. Use License</h2>
          <p>Permission is granted to temporarily use this application for personal, non-commercial purposes. This is the grant of a license, not a transfer of title, and under this license you may not:</p>
          <ul>
            <li>Modify or copy the materials</li>
            <li>Use the materials for any commercial purpose</li>
            <li>Attempt to decompile or reverse engineer any software contained in the application</li>
            <li>Remove any copyright or other proprietary notations from the materials</li>
            <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
          </ul>
        </section>

        <section>
          <h2>3. Microsoft Account and OneDrive Integration</h2>
          <p>This application integrates with Microsoft OneDrive and requires a Microsoft account. By using this application, you agree to:</p>
          <ul>
            <li>Comply with Microsoft's Terms of Service and Privacy Policy</li>
            <li>Maintain the security of your Microsoft account credentials</li>
            <li>Not use the application for any unauthorized or illegal purposes</li>
            <li>Not attempt to access other users' data or accounts</li>
          </ul>
        </section>

        <section>
          <h2>4. Disclaimer</h2>
          <p>The materials on this application are provided on an 'as is' basis. We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.</p>
        </section>

        <section>
          <h2>5. Limitations</h2>
          <p>In no event shall we or our suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on this application.</p>
        </section>

        <section>
          <h2>6. Revisions and Errata</h2>
          <p>The materials appearing on this application could include technical, typographical, or photographic errors. We do not warrant that any of the materials on the application are accurate, complete, or current. We may make changes to the materials contained on the application at any time without notice.</p>
        </section>

        <section>
          <h2>7. Links</h2>
          <p>We have not reviewed all of the sites linked to this application and are not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by us of the site. Use of any such linked website is at the user's own risk.</p>
        </section>

        <section>
          <h2>8. Modifications to Terms of Service</h2>
          <p>We may revise these terms of service at any time without notice. By using this application, you are agreeing to be bound by the then current version of these terms of service.</p>
        </section>

        <section>
          <h2>9. Governing Law</h2>
          <p>These terms and conditions are governed by and construed in accordance with the laws of your jurisdiction and you irrevocably submit to the exclusive jurisdiction of the courts in that location.</p>
        </section>

        <section>
          <h2>10. Contact Information</h2>
          <p>If you have any questions about these Terms of Service, please contact us at [Your Contact Information].</p>
        </section>
      </div>
    </div>
  );
}

export default TermsOfService; 