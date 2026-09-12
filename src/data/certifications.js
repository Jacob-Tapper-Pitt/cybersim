export const CYBERSECURITY_FIELDS = [
  { id: "security-fundamentals", name: "Security Fundamentals", shortName: "Fundamentals", color: "cyan", relatedFields: ["network-security", "security-operations"] },
  { id: "network-security", name: "Network Security", shortName: "Network", color: "blue", relatedFields: ["security-fundamentals", "security-operations", "offensive-security"] },
  { id: "cloud-security", name: "Cloud Security", shortName: "Cloud", color: "violet", relatedFields: ["identity-access", "security-operations"] },
  { id: "application-security", name: "Application Security", shortName: "AppSec", color: "orange", relatedFields: ["offensive-security", "security-fundamentals"] },
  { id: "governance-risk-compliance", name: "Governance, Risk & Compliance", shortName: "GRC", color: "amber", relatedFields: ["security-fundamentals", "identity-access"] },
  { id: "incident-response", name: "Incident Response", shortName: "Response", color: "rose", relatedFields: ["digital-forensics", "security-operations"] },
  { id: "digital-forensics", name: "Digital Forensics", shortName: "Forensics", color: "emerald", relatedFields: ["incident-response", "security-operations"] },
  { id: "offensive-security", name: "Offensive Security", shortName: "Offensive", color: "red", relatedFields: ["application-security", "network-security"] },
  { id: "identity-access", name: "Identity & Access", shortName: "Identity", color: "teal", relatedFields: ["cloud-security", "governance-risk-compliance"] },
  { id: "security-operations", name: "Security Operations", shortName: "SecOps", color: "sky", relatedFields: ["incident-response", "network-security", "digital-forensics"] },
];

export const CERTIFICATIONS = [
  { id: "security-plus", name: "CompTIA Security+", issuer: "CompTIA", fields: ["security-fundamentals", "network-security", "identity-access", "security-operations"], recognition: 94, beginnerFit: 96, level: "Beginner", summary: "Broad foundational credential and a common first industry certification." },
  { id: "isc2-cc", name: "ISC2 Certified in Cybersecurity", issuer: "ISC2", fields: ["security-fundamentals", "security-operations", "governance-risk-compliance"], recognition: 78, beginnerFit: 99, level: "Beginner", summary: "Entry-level introduction to core security concepts with no work experience required." },
  { id: "network-plus", name: "CompTIA Network+", issuer: "CompTIA", fields: ["network-security", "security-operations"], recognition: 87, beginnerFit: 91, level: "Beginner", summary: "A strong networking base for anyone moving toward infrastructure security." },
  { id: "ccna", name: "Cisco Certified Network Associate", issuer: "Cisco", fields: ["network-security", "security-operations"], recognition: 93, beginnerFit: 78, level: "Intermediate", summary: "Highly recognized networking credential with practical routing and switching depth." },
  { id: "cysa-plus", name: "CompTIA CySA+", issuer: "CompTIA", fields: ["security-operations", "incident-response", "digital-forensics"], recognition: 83, beginnerFit: 67, level: "Intermediate", summary: "Blue-team credential focused on detection, analysis, and response workflows." },
  { id: "cissp", name: "ISC2 CISSP", issuer: "ISC2", fields: ["security-fundamentals", "governance-risk-compliance", "cloud-security", "identity-access"], recognition: 99, beginnerFit: 28, level: "Advanced", summary: "Globally known senior-level credential for experienced security professionals." },
  { id: "cism", name: "ISACA CISM", issuer: "ISACA", fields: ["governance-risk-compliance", "security-operations", "incident-response"], recognition: 91, beginnerFit: 34, level: "Advanced", summary: "Management-focused certification covering security governance and program leadership." },
  { id: "aws-security", name: "AWS Certified Security - Specialty", issuer: "AWS", fields: ["cloud-security", "identity-access", "security-operations"], recognition: 90, beginnerFit: 42, level: "Advanced", summary: "Cloud security specialization for practitioners working deeply in AWS environments." },
  { id: "azure-security", name: "Microsoft Certified: Azure Security Engineer", issuer: "Microsoft", fields: ["cloud-security", "identity-access", "security-operations"], recognition: 86, beginnerFit: 47, level: "Intermediate", summary: "Role-based certification for securing identities, workloads, and services in Azure." },
  { id: "oscp", name: "OffSec OSCP", issuer: "OffSec", fields: ["offensive-security", "application-security", "network-security"], recognition: 95, beginnerFit: 35, level: "Advanced", summary: "Practical penetration testing credential known for its hands-on exam." },
  { id: "ceh", name: "EC-Council CEH", issuer: "EC-Council", fields: ["offensive-security", "security-fundamentals", "application-security"], recognition: 88, beginnerFit: 70, level: "Intermediate", summary: "Widely recognized ethical hacking survey credential with broad topic coverage." },
  { id: "gpen", name: "GIAC Penetration Tester", issuer: "GIAC", fields: ["offensive-security", "application-security", "network-security"], recognition: 89, beginnerFit: 39, level: "Advanced", summary: "Rigorous practical penetration testing certification from SANS/GIAC." },
  { id: "gsec", name: "GIAC Security Essentials", issuer: "GIAC", fields: ["security-fundamentals", "network-security", "security-operations"], recognition: 86, beginnerFit: 58, level: "Intermediate", summary: "Technical security fundamentals credential with strong practitioner credibility." },
  { id: "gcia", name: "GIAC Certified Incident Handler", issuer: "GIAC", fields: ["incident-response", "digital-forensics", "security-operations"], recognition: 84, beginnerFit: 43, level: "Advanced", summary: "Specialist certification for detecting, responding to, and investigating incidents." },
  { id: "csslp", name: "ISC2 CSSLP", issuer: "ISC2", fields: ["application-security", "security-fundamentals"], recognition: 71, beginnerFit: 45, level: "Intermediate", summary: "Secure software lifecycle credential for developers and application security teams." },
];

export const getFieldCertifications = (fieldId) => CERTIFICATIONS
  .filter(certification => certification.fields.includes(fieldId))
  .sort((a, b) => (b.recognition + b.beginnerFit) - (a.recognition + a.beginnerFit));

export const getCertificationScore = (certification) =>
  Math.round((certification.recognition + certification.beginnerFit) / 2);