// File: server/utils/sendJobApplication.js
import nodemailer from "nodemailer";
import { MailtrapTransport } from "mailtrap";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

export const sendJobApplication = async (companyData) => {
  try {
    const transport = nodemailer.createTransport(
      MailtrapTransport({
        token: process.env.MAILTRAP_API_TOKEN,
      })
    );

    const { name: companyName, email: companyEmail } = companyData;

    const cvPath = path.join(process.cwd(), "data", "James_Gitere_Cv.pdf");

    if (!fs.existsSync(cvPath)) {
      throw new Error(`CV file not found at ${cvPath}`);
    }

    const mailOptions = {
      from: {
        address: "info@jamesgitere.tech",
        name: "James Gitere",
      },
      to: companyEmail,
      subject: "Full-Stack Developer with 3+ Years Experience – James Gitere",
      html: `
<p>Hello ${companyName} Team,</p>

<p>
I am writing to express my keen interest in the Full-Stack Software Developer position at ${companyName}.
With over 3 years of experience building robust, secure, and scalable full-stack applications,
I am confident I can contribute effectively to your dynamic team.
</p>

<p>
My expertise spans the entire development cycle, from designing responsive user interfaces
with React and Tailwind CSS to building secure backend systems with Node.js, Python,
and scalable databases. I have a proven track record in integrating critical financial
systems like M-Pesa and Paystack, implementing JWT authentication, and optimizing
DevOps CI/CD pipelines.
</p>

<p>
Here are a few of my recent featured projects that demonstrate my capabilities:
</p>

<p>
Multi-Tenant Accounting System<br>
Built a secure, scalable system with invoicing, financial reporting, and robust data encryption
using Next.js, React, Node.js, and PostgreSQL.
</p>

<p>
Learning Management System (LMS)<br>
Architected a full-featured platform with automated payment processing (Paystack/M-Pesa),
secure APIs, and real-time transaction handling using React, Node.js, and MongoDB.
</p>

<p>
AI-Powered Chatbot System<br>
Developed an intelligent chatbot by integrating the OpenAI API with a custom backend
(Node.js, Express) and a responsive React frontend, showcasing advanced API integration.
</p>

<p>
I am passionate about leveraging technology to create efficient solutions and would be
thrilled to bring my skills in full-stack development, system integration, and collaborative
problem-solving to your team.
</p>

<p>
Live projects:<br>
Multi-Tenant Accounting System: https://accounting.jepaks.systems/<br>
Learning Management System: https://academy.jepaks.systems/<br>
AI Chatbot System: https://icipe-chatbot.vercel.app/
</p>

<p>
Profile links:<br>
LinkedIn: https://www.linkedin.com/in/james-gitere/<br>
Portfolio: https://www.jamesgitere.tech/<br>
GitHub: https://github.com/gitere001
</p>

<p>
My detailed CV is attached for your review. I would love to discuss how I can contribute
to your development team by building secure, scalable, and efficient solutions.
</p>

<p>
Sincerely,<br>
James Mwangi Gitere
</p>

<p>
Phone: +254 714 584 667<br>
Email: gitere.dev@gmail.com<br>
Portfolio: https://www.jamesgitere.tech/
</p>
      `,
      text: `
Full-Stack Developer with 3+ Years Experience – James Gitere

Hello ${companyName} Team,

I am writing to express my keen interest in the Full-Stack Software Developer position at ${companyName}. With over 3 years of experience building robust, secure, and scalable full-stack applications, I am confident I can contribute effectively to your dynamic team.

My expertise spans the entire development cycle, from designing responsive user interfaces with React and Tailwind CSS to building secure backend systems with Node.js, Python, and scalable databases. I have a proven track record in integrating critical financial systems like M-Pesa and Paystack, implementing JWT authentication, and optimizing DevOps CI/CD pipelines.

Here are a few of my recent featured projects that demonstrate my capabilities:

Multi-Tenant Accounting System
Built a secure, scalable system with invoicing, financial reporting, and robust data encryption using Next.js, React, Node.js, and PostgreSQL.

Learning Management System (LMS)
Architected a full-featured platform with automated payment processing (Paystack/M-Pesa), secure APIs, and real-time transaction handling using React, Node.js, and MongoDB.

AI-Powered Chatbot System
Developed an intelligent chatbot by integrating the OpenAI API with a custom backend (Node.js, Express) and a responsive React frontend, showcasing advanced API integration.

I am passionate about leveraging technology to create efficient solutions and would be thrilled to bring my skills in full-stack development, system integration, and collaborative problem-solving to your team.

Live projects:
Multi-Tenant Accounting System: https://accounting.jepaks.systems/
Learning Management System: https://academy.jepaks.systems/
AI Chatbot System: https://icipe-chatbot.vercel.app/

Profile links:
LinkedIn: https://www.linkedin.com/in/james-gitere/
Portfolio: https://www.jamesgitere.tech/
GitHub: https://github.com/gitere001

My detailed CV is attached for your review. I would love to discuss how I can contribute to your development team by building secure, scalable, and efficient solutions.

Sincerely,
James Mwangi Gitere

Phone: +254 714 584 667
Email: gitere.dev@gmail.com
Portfolio: https://www.jamesgitere.tech/
      `,
      attachments: [
        {
          filename: "James_Gitere_CV.pdf",
          path: cvPath,
          contentType: "application/pdf",
        },
      ],
    };

    const response = await transport.sendMail(mailOptions);

    console.log(`📧 Job application sent to ${companyName} (${companyEmail})`);

    return {
      success: true,
      company: companyName,
      email: companyEmail,
      response,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Application error for ${companyData.name}:`, error);
    return {
      success: false,
      company: companyData.name,
      error: error.message,
    };
  }
};
