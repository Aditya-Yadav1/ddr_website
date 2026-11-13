# HandyHive Delhi launch plan

## The product

HandyHive helps people in the Delhi region compare local home service rates and arrange a visit. Design for customers who watch their household budget, may be using a small Android phone, and want to know the charge before inviting someone home. Use English by default and keep a visible **हिन्दी** switch from sign-in onward. Remember the choice.

The directory currently supports Lajpat Nagar, Dwarka, Rohini and Saket. Start the live pilot in one or two of those areas where there are enough workers to cover appointments and someone available to resolve issues. Add areas based on actual worker coverage. The app supports plumbing, electrical work, home cleaning and painting.

## What customers can choose

| | Everyday | Plus |
| --- | --- | --- |
| Best for | Routine work at the worker’s standard rate | Customers who want specific extra work or a more detailed visit |
| What customers see | The task, price and what the price covers | A higher price and a written list of the extras included |
| How it is offered | Default option for every worker | Optional for workers who can deliver the stated extras |

Both options should have the same standards for safety, punctuality, clear communication and handling complaints. The higher rate buys defined extra work. Any worker verification should apply equally to both options and should appear in the app only once it has been performed.

For example, a demo plumber lists **₹449 for an Everyday diagnostic visit** and **₹749 for a Plus diagnostic visit**. Plus includes checking nearby fittings for related leaks and giving a written repair and parts estimate. Both prices cover a visit. The customer agrees to any repair and parts costs before work starts. These are demo rates. Validate pilot rates with local workers and customers before using them in the live directory.

- Let workers set their own Everyday rate and a higher Plus rate in the same billing unit. Require a concrete description of the extra work before publishing Plus.
- Show prices in rupees with the billing unit next to the amount. For hourly work, display the two-hour minimum as a rupee amount. For packages, identify the scope covered. Show any known exclusions before the request is sent.
- Default to Everyday and keep Plus visible for comparison. Sort by the lowest initial charge within the selected filters. Save the reviewed price, unit and inclusions with each booking. Ask the customer to review again if those terms change before submission.

## How the app should feel and work

**Customer.** Sign in by phone, pick a service and neighbourhood, then compare available workers and both rates. Choose a task and appointment in Delhi time, enter the visit details, and review the scope and price. The worker confirms by accepting. The customer can message the worker, follow progress, cancel before work starts, and find past bookings or request another visit.

**Worker.** Create a profile with service areas, experience, rates and an optional Plus offer. Set working hours, block time and pause the listing when needed. Review new jobs with the task, locality and booking terms. Show the full address and visit notes after acceptance. Let the worker accept or decline, mark travel and arrival, start work, and finish the job.

**Interface.** Use familiar service names, readable prices, clear buttons and a light palette with green actions. Keep the first screen focused on choosing a service and area. Display availability honestly and show useful messages for empty results, unavailable times and weak connections. Translate navigation, booking steps, statuses and worker controls. Let workers supply Hindi descriptions while keeping names, addresses and chat as entered.

## Delivery and rollout

| Stage | Work | Exit check |
| --- | --- | --- |
| **1. Local app — implemented** | Build the Expo customer and worker flows on the existing booking API. Connect service discovery, pricing, profiles, scheduling, booking status, chat and English/Hindi. | The local preview supports a two-account booking through completion. Price changes trigger a fresh review, and both roles see the same booking after reload. |
| **2. Private Android pilot** | Set up a private HTTPS API, persistent storage, backup and restore, and basic error monitoring. Build and install a signed Android test app. Configure and test phone OTP on real handsets. Onboard workers in the pilot areas, confirm rates and Plus inclusions, and set up a contact for complaints, missed visits and price disputes. Start with scheduled visits and payment agreed directly with the worker. | A customer and worker complete the flow on separate phones. Check Hindi, larger text, reconnect and retry, cancellation, appointment conflicts and address privacy. The pilot team can handle a missed appointment or charge dispute end to end. |
| **3. Public release by area** | Add reliable push notifications and test background delivery before offering immediate requests publicly. Finalise worker checks, booking policies and customer support. Measure request acceptance, completion, cancellations, price disputes and repeat bookings by area and tier. | Expand only when workers can cover appointments consistently, customers understand the prices, and the team can resolve common issues. Confirm store readiness on the platforms being released. |
| **4. Expand when the pilot supports it** | Add in-app quotes and approvals for extra work if price disputes show a need. Add in-app payments, receipts, refunds and payouts when the payment and support processes are ready. Evaluate verified post-booking reviews, consent-based live location, and more Delhi-area coverage. | Release each addition after it works through the customer, worker and support flows, including failures and reversals. |

The first pilot should tell us whether customers can explain the difference between Everyday and Plus after seeing the price, whether Plus bookings deliver the listed extras, and where appointments fail. Review those results with workers and customers before adjusting rates or expanding coverage.

## Verification and launch limits

The browser preview was exercised at phone and desktop sizes. Tests covered Hindi persistence, preview phone sign-in, worker setup and availability, a Plus booking through completion, address visibility after acceptance, price changes and customer cancellation. Two-way chat worked, including retry after the server saved a message but the app lost the response. The backend regression suite has nine tests. Android JavaScript export is a build check. An installed Android app, carrier SMS, background push and public hosting still need pilot verification. Payments, live GPS and worker verification are separate launch work.

See [the mobile runbook](mobile/README.md) for local setup, demo accounts and build commands.
