> **Scenario:** A fictional mid-sized company building an HR operations platform. All answers are illustrative.

# Client Discovery Brief — Filled Example

**Date:** March 15, 2026

**Prepared by:** Sarah Hamid, Head of People Operations — FlowWorks Design Studio

---

## 1. Company & Background

**What is your company name?**
FlowWorks Design Studio

**What does your company do today?**
We're a mid-sized creative agency with 185 employees across offices in Kuala Lumpur, Singapore, and Jakarta. We do branding, UI/UX, and motion design for regional clients. Most of our staff are designers, project managers, and account managers — plus a remote freelance pool of about 50 people.

**Why are you pursuing this product now?**
We've outgrown our current setup. We use a patchwork of tools — Clockify for hours, Asana for tasks, Google Sheets for leave tracking, and email for approvals. Nothing talks to each other. Our HR team spends 15+ hours a week manually reconciling timesheets, chasing missing clock-ins, and moving data between systems. With hybrid work here to stay, we need a unified HR operations platform that handles time tracking, task automation, and people management in one place.

**Who is the primary decision-maker for this project?** *(Name and role)*
Sarah Hamid, Head of People Operations — final approval. Technical stakeholder is Ravi Tan, our Head of Engineering (he'll own the integration side).

---

## 2. Target Users

**Who is the primary user** — the main person who will use the product daily?
Employees (designers, PMs, account managers) who need to clock in/out, log hours against projects, submit leave requests, and see their schedule. Ages 22–45, mostly Mac users, comfortable with Slack and Notion but frustrated by too many tools.

**Who are the secondary users** — other people who interact with the product?
Project managers (need to approve timesheets and see team availability), finance team (need approved hours for payroll and client billing), and the HR team (need absence tracking, onboarding checklists, and compliance reporting).

**Who is the administrator** — who manages the system (permissions, settings)?
HR team (3 people) manages user roles, company policies (leave types, overtime rules), approval workflows, and integrations with payroll and accounting.

**How many users do you expect in the first 6 months?** 185 full-time employees + 50 freelancers. Roll out to the KL office first (~100 people), then SG and Jakarta by month 4.

---

## 3. Problem Statement

**What is the main problem you're trying to solve?**
Time tracking is broken. Employees forget to clock in, log hours to the wrong project, or submit timesheets late. HR spends hours each week chasing people and fixing errors. Task creation is manual — when someone goes on leave, nobody is automatically reassigned their tasks. There's no real-time visibility into who's working on what, who's overloaded, or who's available for new projects.

**Who experiences this problem the most?**
HR team (3 people) feels it most acutely — they're drowning in manual reconciliation. But project managers also struggle because they can't see team availability without emailing everyone individually.

**How do users solve this problem today?** *(Current workaround)*
Clockify for time tracking (but nobody uses it consistently), Asana for tasks, a Google Sheet for leave tracking, email threads for overtime approvals, and Slack messages for "who's free next week?" questions. HR runs a weekly manual reconciliation that takes 4–5 hours every Monday.

**What happens if you don't solve this problem?** *(Cost of inaction)*
We're overpaying on contractor hours due to tracking errors (estimated RM 8,000/month in leakage). Project margins are slipping because we can't accurately track time against budgets. Employee frustration with admin overhead is growing — our last engagement survey scored 3.2/5 on "tools help me do my work efficiently." And as we grow to 250+ people, this patchwork will completely break.

---

## 4. Product Vision

**Imagine it's 3 years from now and the product is a huge success. What does the world look like?**
It's 2029. An employee walks in (or logs in from home), opens the app, and taps "Start Work." The system knows what project they're on, what tasks are due, and automatically tracks time against the right billing code. When a task is overdue, it reassigns it based on who has capacity. When someone takes leave, their active tasks are automatically redistributed and an out-of-office reply is generated.

HR spends zero time on manual data entry. Approvals happen in one tap. Payroll is auto-fed with verified hours. Managers can see real-time dashboards of team capacity, project profitability, and attendance trends. The system flags anomalies — someone clocking 60 hours a week, consistently late clock-ins, a project going over budget on hours — before they become problems. It feels like the company runs itself on autopilot.

---

## 5. Feature Priorities

**Must-have (MVP)** — the absolute minimum to launch:
1. Clock in / clock out with project and task tagging
2. Weekly timesheet submission and manager approval
3. Leave request (annual, sick, personal) with approval workflow
4. Dashboard showing who's in/out/on leave today
5. Auto-creation of tasks when someone is marked absent (reassign to next available)

**Nice-to-have (Phase 2+)** — can wait until after launch:
1. Overtime tracking and automated approval escalation
2. Freelancer/contractor portal (separate from employee interface)
3. Shift scheduling for non-desk staff
4. Integration with payroll (auto-export verified hours)
5. Mobile app for clock-in with geolocation

**Out of scope** — explicitly not building (for now):
1. Payroll processing itself (we'll integrate with existing payroll)
2. Recruitment / applicant tracking
3. Performance reviews and 360 feedback
4. Learning management / training courses
5. Expense reimbursement tracking
