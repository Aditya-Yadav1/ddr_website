# HandyHive color and navigation plan

Prepared with Astra for implementation by Sol. Target the shared Expo app in `mobile/` so the web and phone interfaces use the same rules.

## 1. Give color a specific job

Keep warm ivory behind the page and light cards behind content. Leave amounts, names, and body copy in dark ink. Use the following palette for the parts customers scan when deciding what to do next.

| Meaning | Appearance | Where to use it |
| --- | --- | --- |
| Next action | White on deep blue `#27567C` | Find workers, Book this worker, Review request, Pay, Submit review. Give the current step one prominent filled action. |
| Information or help | Blue `#27567C` on pale blue `#EDF4FA` | Customer Support, contact links, and active visit updates. Use a text link, outline or small badge according to importance. |
| Confirmed outcome | Forest `#286348` on mist `#EAF2E9`, with a check and label | Booking confirmed, payment received, review submitted. Keep forest in the brand. |
| Waiting or attention needed | Amber `#805322` on cream `#FFF0DC`, with a clock or text cue | Awaiting worker response, payment awaiting confirmation, or a valid PIN with no coverage. Show the next available action. |
| Report, error or destructive action | Red `#9B3430` on blush `#FBEDEC` | Use a red outlined flag and the existing **Report** label. Put a short red error message beside a field that needs correction. Use stronger red emphasis for a final destructive action. |
| Rating or Plus | Honey star beside a dark score and count, or a small champagne Plus detail | Worker cards, profile reviews, the rating picker and Plus comparison. Use the existing neutral empty state for an unrated worker. |

Neutral bordered buttons suit secondary choices. A selected time, service, or material option gets a blue outline, light fill and check. Keep disabled actions neutral and retain the explanation of what is needed to proceed. Use the existing imagery, whitespace, and type hierarchy for category cards. Keep saturated fills concentrated on the next action.

## 2. Apply the system in the shared UI, then along the customer journey

1. In `mobile/src/ui.tsx`, extend the existing Button, Tag, Panel, Guide and feedback styles with semantic roles. Keep action emphasis separate from meaning so blue Support and red Report can both be secondary buttons. Resolve hover, focus, pressed, selected and disabled styles for each role. Today the generic hover style can turn a danger button green.
2. Use a single booking-status mapping in lists and details. Map pending to amber, accepted and completed to green, en route/arrived/in progress to blue, and cancelled/declined/expired history to a legible neutral label. Show payment state separately. A completed job can still have an outstanding balance.
3. Apply the roles through `mobile/src/location.tsx`, discovery and worker cards, `mobile/app/providers/[id].tsx`, and `mobile/app/request/[id].tsx`. For the request form, keep the reason Review request is unavailable beside that action. Distinguish an incomplete PIN, an unsupported PIN and a failed lookup with specific text.
4. Update `mobile/src/provider-actions.tsx` and `mobile/src/visit-controls.tsx` so each existing Report entry opens its current menu. Give Contact Customer Support the blue help treatment there and on Home, Account, and Support. Apply reporting colors according to purpose. Recording an offline payment is an ordinary payment action.
5. Apply the same hierarchy to booking details, payment controls, online checkout, the worker workspace and `mobile/src/booking-rating.tsx`. For a worker with reviews, emphasize the star, keep the numeric score and count readable, and give the review picker a clear selection such as **4 of 5 stars**. Use existing booking and payment state to determine when review is available.

## 3. Make the header predictable

- In `mobile/src/ui.tsx`, turn Brand into one accessible Home link for the whole H mark and HandyHive wordmark. Give it a localized accessible name, visible keyboard focus and a touch target at least 44 by 44. Use the existing Expo Router Home route `/` and avoid stacking duplicate Home screens.
- In `mobile/app/_layout.tsx`, use the full linked wordmark on Home and sign-in. On other screens, put the linked brand in the space freed by the language switch, retaining the native Back control and translated screen title. Use the compact H mark when the full name would crowd the title on a phone. Home must also work when a visitor opens a worker profile through a direct link.
- Move the language switch from global stack options into the index screen's header. Keep it available on Home before PIN entry and after workers load. Remove the separate Language panel in `mobile/app/account.tsx`. Keep the existing global LanguageProvider and stored preference so the language chosen on Home follows the customer through the app and survives a refresh.

## 4. Acceptance checks for Sol

- On a narrow phone and desktop web, inspect Home, worker selection, request, booking, payment, review, Support and the worker workspace. Check English and Hindi layouts. Labels, icons and visible focus must communicate each action in grayscale. Target 4.5:1 for normal text and 3:1 for meaningful control outlines and focus indicators. The proposed blue, red, green and amber text each exceed 5.8:1 on their listed tints.
- Check that Home shows one language switch and the other routes show zero. Activate the brand by tap and keyboard from a direct-linked profile and from booking details. Verify Home displays the selected PIN, retains the session and language, and handles repeated Home taps. Verify Back still behaves normally before using the Home link.
- In the demo, enter a covered PIN, choose a worker, send the request, complete the visit, confirm payment and leave a review. Check an invalid PIN, an unsupported PIN, pending and confirmed payment, a worker without reviews, and both Report menus. Verify the review option appears after completed work and confirmed payment.
- Run the repository type check, tests and Expo web build. Inspect the running web preview and a phone-sized layout. Record which native device or emulator was exercised separately from web verification.
