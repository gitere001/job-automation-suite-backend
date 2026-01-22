// File: server/utils/sendJobApplication.js
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendJobApplication = async (companyData) => {
  try {
    const { name: companyName, email: companyEmail } = companyData;

    const response = await resend.emails.send({
      from: "James Gitere <info@jamesgitere.tech>", // must match your verified domain
      to: companyEmail,
      subject: "Full-Stack Developer – How I Can Contribute to Your Team",
      html: `
<p>Hi ${companyName} team,</p>

<p>
I’m <strong>James Gitere</strong>, a Full-Stack Engineer with 3+ years of experience building secure, scalable applications using React and Node.js.
I would love to contribute my skills to help ${companyName} achieve its development goals.
</p>

<p><strong>Key Project:</strong></p>
<ul>
  <li>
    <strong>Multi-Tenant Accounting System</strong><br>
    <em>Technologies:</em> Next.js, React, Node.js, PostgreSQL<br>
    <em>What I built:</em> Secure multi-tenant invoicing, reporting, and financial dashboards<br>
    <a href="https://accounting.jepaks.systems">View Project</a>
  </li>
</ul>

<p><strong>Portfolio & GitHub:</strong></p>
<ul>
  <li><a href="https://www.jamesgitere.tech">Portfolio website</a></li>
  <li><a href="https://github.com/gitere001">GitHub</a></li>
</ul>

<p>
I would love the opportunity to discuss how my skills can directly contribute to ${companyName}’s development team.
</p>

<p>Best regards,<br>
<strong>James Gitere</strong><br>
Phone: +254 714 584 667<br>
Email: gitere.dev@gmail.com</p>
website: <a href="https://www.jamesgitere.tech">www.jamesgitere.tech</a>
      `,
    });

    console.log(`📧 Job application sent to ${companyName} (${companyEmail})`);
    return { success: true, company: companyName, email: companyEmail, response };
  } catch (error) {
    console.error(`Application error for ${companyData.name}:`, error);
    return { success: false, company: companyData.name, error: error.message };
  }
};
