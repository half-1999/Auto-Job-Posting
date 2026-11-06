/** The three starter templates (PRD FR-4.1). Plain text; placeholders per FR-4.3. */
export const DEFAULT_TEMPLATES = [
  {
    id: 'default-cold-outreach',
    name: 'Cold Outreach',
    isDefault: true,
    subject: '{{job_title}} at {{company_name}}',
    body: `Hi {{recruiter_first_name|there}},

I came across the {{job_title}} role at {{company_name}} and would love to be considered. I build fast, accessible web apps with React and care a lot about the details users notice.

My resume is attached. You can also see my recent work here: {{my_portfolio}}

Would you be open to a short call this week?

Thanks,
{{my_name}}
{{my_phone}} · {{my_linkedin}}`,
  },
  {
    id: 'default-follow-up',
    name: 'Application Follow-up',
    isDefault: true,
    subject: 'Following up: {{job_title}} application',
    body: `Hi {{recruiter_first_name|there}},

I applied for the {{job_title}} role at {{company_name}} recently and wanted to follow up. I'm still very interested and happy to share anything else that would help.

Job posting for reference: {{job_link}}

Best,
{{my_name}}`,
  },
  {
    id: 'default-referral',
    name: 'Referral / Networking Request',
    isDefault: true,
    subject: 'Quick question about {{company_name}}',
    body: `Hi {{recruiter_first_name}},

I'm exploring the {{job_title}} opening at {{company_name}}. If you're open to it, I'd value 15 minutes to hear how the team works, or a referral if you think I'd be a good fit.

My LinkedIn: {{my_linkedin}}

Thank you,
{{my_name}}`,
  },
]
