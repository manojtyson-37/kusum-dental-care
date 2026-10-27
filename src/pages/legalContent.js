// Policy copy for the public site. Facts here mirror what the site actually
// does (audited from the code): no forms, no analytics/ad trackers, no cookies
// of its own; Google Maps loads only after the visitor clicks "Load map".
// Have the clinic owner (and ideally a lawyer) review before relying on it.

export const CLINIC = {
  name: "Dr. Kusum's Dental Care",
  address: '17, 5th Main, 2nd Cross, Malleshpalya, Bangalore – 560075, Karnataka, India',
  phone1: '+91 84319 07976',
  phone2: '+91 81231 07976',
};

// Business details shown on every policy page. Fields left as '' are hidden,
// so nothing is displayed until the clinic supplies the real value.
export const BUSINESS = {
  tradeName: "Dr. Kusum's Dental Care",
  type: 'Multi-specialty dental clinic & implant center',
  address: CLINIC.address,
  phones: [CLINIC.phone1, CLINIC.phone2],
  hours: 'Monday to Sunday, 9:30 AM – 9:00 PM',
  website: 'https://www.kusumsdentalcare.in',
  email: '', // e.g. clinic email for data requests
  practitioner: 'Dr. Kusum',
  practitionerRegistrationNo: '', // Karnataka Medical Council registration number
  clinicRegistrationNo: '', // Karnataka Private Medical Establishments (KPME) registration
  gstin: '', // only if GST-registered
};

export const LAST_UPDATED = '24 September 2026';

export const LEGAL_PAGES = {
  privacy: {
    title: 'Privacy Policy',
    intro: `${CLINIC.name} ("we", "us") respects your privacy. This policy explains what information we handle when you visit our website or contact and visit our clinic, and the choices you have. It is written with India's Digital Personal Data Protection Act, 2023 in mind.`,
    sections: [
      {
        h: 'What this website collects',
        p: [
          'Our public website does not have sign-up, login, contact or booking forms, and it does not run advertising or analytics trackers. We do not ask you to create an account.',
          'Like any web server, our hosting provider (Vercel) automatically records technical request data such as IP address, browser type and pages requested, for security and reliability. We do not use this data to identify you.',
        ],
      },
      {
        h: 'Booking and contacting us',
        p: [
          'Buttons on the site open WhatsApp or your phone dialler. When you message or call us, the details you choose to share (for example your name, phone number and reason for visit) are received by us through WhatsApp or by phone. WhatsApp is operated by Meta and is governed by its own privacy policy. Please do not send sensitive medical documents over WhatsApp unless needed for your care.',
        ],
      },
      {
        h: 'Patient records at the clinic',
        p: [
          'If you become a patient, our staff record only what is needed to treat you and run the clinic: name, age, gender, phone number, address, optional email, and visit, treatment and billing details. These are stored in our secure practice-management system (hosted on Supabase) and are accessible only to authorised clinic staff.',
          'We collect this information with your knowledge at the time of your visit, use it only for your care, appointments, billing and legal record-keeping, and do not sell it or use it for advertising.',
        ],
      },
      {
        h: 'Third-party services',
        p: [
          'Google Maps: the map in our footer is not loaded until you click "Load map". Once loaded, Google may set cookies and receive your IP address, under Google\'s privacy policy.',
          'Google reviews: our reviews section is fetched by our server from a review-data service (SerpApi). Your browser does not contact Google or SerpApi for this.',
          'Fonts are hosted on our own server. We do not use Google Analytics, Meta Pixel or similar tools.',
        ],
      },
      {
        h: 'How long we keep information',
        p: ['Patient records are kept for as long as needed for your treatment and as required by applicable medical-record and tax rules, and are then securely deleted or anonymised.'],
      },
      {
        h: 'Your rights',
        p: [
          'You may ask us to access, correct or delete your personal data, withdraw consent, or raise a grievance. Deletion may be limited where the law requires us to retain medical or financial records.',
          `To exercise these rights, use our Data Request page (/data-request), call us on ${CLINIC.phone1}, or visit the clinic at the address below.`,
        ],
      },
      {
        h: "Children's data",
        p: ['Children\'s information is recorded only through a parent or guardian who consents on their behalf at the clinic.'],
      },
      {
        h: 'Changes to this policy',
        p: ['We may update this policy. The "last updated" date at the top shows the current version.'],
      },
    ],
  },

  terms: {
    title: 'Terms of Service',
    intro: `By using this website you agree to these terms. If you do not agree, please do not use the site.`,
    sections: [
      {
        h: 'About the site',
        p: [`This website is operated by ${CLINIC.name}, ${CLINIC.address}. It provides general information about our clinic and services and links to contact us.`],
      },
      {
        h: 'Not medical advice',
        p: ['Content on this site is for general information only and is not a diagnosis or a substitute for professional advice. Treatment decisions are made only after an in-person examination. In an emergency, contact us or your nearest hospital immediately.'],
      },
      {
        h: 'Appointments',
        p: [
          'Appointments are requested by phone or WhatsApp and are confirmed only when our staff confirm them. Timings shown on the site may change; please confirm before visiting.',
          'Please tell us as early as you can if you need to reschedule or cancel.',
        ],
      },
      {
        h: 'Fees',
        p: ['Fees depend on your diagnosis and treatment plan and are explained by the doctor before treatment begins. See our Refund Policy for how payments are handled.'],
      },
      {
        h: 'Acceptable use',
        p: ['You agree not to misuse the site, attempt to disrupt or gain unauthorised access to it or our systems, or copy our content or images for commercial use without permission.'],
      },
      {
        h: 'Intellectual property',
        p: ["The clinic name, logo, text, photos and design are owned by or licensed to Dr. Kusum's Dental Care and may not be reused without written permission."],
      },
      {
        h: 'Third-party links',
        p: ['Links to WhatsApp, Google Maps and Google reviews lead to services we do not control. We are not responsible for their content or practices.'],
      },
      {
        h: 'Liability',
        p: ['We work to keep the site accurate and available but provide it "as is". To the extent permitted by law, we are not liable for losses arising from use of the website. Nothing here limits your rights under applicable consumer law or our duties as a healthcare provider.'],
      },
      {
        h: 'Governing law',
        p: ['These terms are governed by the laws of India. Courts at Bangalore, Karnataka have jurisdiction, subject to any rights you have under law.'],
      },
    ],
  },

  refund: {
    title: 'Refund Policy',
    intro: 'This policy explains how payments for dental treatment at our clinic are handled if plans change.',
    sections: [
      {
        h: 'Treatment already performed',
        p: ['Fees for procedures already carried out, and for materials, laboratory work or custom appliances already ordered or made for you, are not refundable, because the service or cost has already been incurred.'],
      },
      {
        h: 'Advance payments',
        p: [
          'If you paid an advance for a treatment or appliance that has not started, and you decide not to proceed, the unused amount will be refunded after deducting the cost of any consultation, diagnostics, materials or lab work already provided or ordered.',
        ],
      },
      {
        h: 'Overpayment or billing errors',
        p: ['If you were charged in error or paid more than the agreed amount, the difference will be refunded in full once we verify the bill.'],
      },
      {
        h: 'Treatment we cannot complete',
        p: ['If we are unable to carry out a planned treatment for clinical reasons, you will be refunded for the portion not carried out.'],
      },
      {
        h: 'How refunds are paid',
        p: ['Approved refunds are made using the same method as the original payment where possible, normally within 7 working days of approval.'],
      },
      {
        h: 'Requesting a refund',
        p: [`Please contact the clinic on ${CLINIC.phone1} with your name, visit date and receipt. We will review your request and tell you the outcome.`],
      },
      {
        h: 'Clinical outcomes',
        p: ['Dental results vary between patients. If you are unhappy with a result, please tell us. We will review it and, where appropriate, correct or redo the work at our discretion rather than treating it as a refund.'],
      },
    ],
  },

  licenses: {
    title: 'Licences & Credits',
    intro: 'This website is built with free and open-source fonts and software. Their licences permit use on a commercial website, and we credit them here.',
    sections: [
      {
        h: 'Fonts (SIL Open Font License 1.1)',
        p: [
          'Inter — © The Inter Project Authors. Licensed under the SIL Open Font License 1.1.',
          'Fraunces — © The Fraunces Project Authors. Licensed under the SIL Open Font License 1.1.',
          'IBM Plex Mono — © IBM Corp. Licensed under the SIL Open Font License 1.1.',
          'Noto Sans Kannada and Noto Serif Kannada — © Google LLC / The Noto Project Authors. Licensed under the SIL Open Font License 1.1.',
          'Fonts are served from our own server via the Fontsource packages, not from Google.',
        ],
      },
      {
        h: 'Icons and software',
        p: [
          'Lucide icons — ISC License. React, React Router, Framer Motion, Three.js, Tailwind CSS and Vite — MIT License.',
          'The full licence texts ship with each package and are available from their project pages.',
        ],
      },
      {
        h: 'Photographs, logo and illustrations',
        p: [`Clinic photographs, the logo and service illustrations are used on this website by ${CLINIC.name}. Please do not copy them without permission.`],
      },
    ],
  },

  cookies: {
    title: 'Cookie Policy',
    intro: 'This policy explains how cookies and similar technologies are used on our website.',
    sections: [
      {
        h: 'What are cookies',
        p: ['Cookies are small files stored on your device by websites. Similar technologies, such as local storage, work in a comparable way.'],
      },
      {
        h: 'What we use',
        p: [
          'Our website does not set advertising, analytics or tracking cookies.',
          'It stores two small items in your browser\'s local storage: your cookie choice (accept or decline) and your language choice (English or Kannada), so we do not ask or reset them on every visit. These are needed for the site to work as you set it and contain no personal information.',
        ],
      },
      {
        h: 'Google Maps (only if you allow it)',
        p: ['The clinic map in the footer is a Google Maps embed. It is not loaded until you click "Load map" or accept optional content in the cookie banner. Once loaded, Google may set its own cookies and collect information such as your IP address, as described in Google\'s privacy policy.'],
      },
      {
        h: 'Managing your choice',
        p: [
          'You can change your choice at any time with the "Cookie settings" link in the footer. You can also delete cookies and site data in your browser settings; the banner will then ask again.',
        ],
      },
    ],
  },
};
