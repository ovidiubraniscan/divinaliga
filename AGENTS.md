# AGENTS.md

## Project Name
DIVINA LIGA

## Project Goal
Build a mobile-first football league check-in app for tablet use.

The app is used on match day to scan physical QR/barcode tickets, validate tickets, collect player details, record arrivals, and create balanced teams.

## Main Check-In Flow
1. User presses START CHECK-IN.
2. The tablet camera opens.
3. The app scans the QR/barcode from a physical ticket.
4. The scanned value must match one of the valid ticket numbers.
5. If the ticket is valid and unused:
   - Show ticket number.
   - Ask player to insert name.
   - Allow player to select football positions.
   - Allow player to mark themselves as captain.
   - Allow player to choose rating from 1 to 10.
   - User presses I HAVE ARRIVED.
6. Save:
   - player name
   - ticket number
   - selected positions
   - captain status
   - rating
   - timestamp of arrival

## Valid Ticket Format
Tickets use this style:

TCK-839201

The QR/barcode content should be the ticket number exactly.

## Valid Tickets
Use this list as the current valid ticket list:

TCK-839201
TCK-472915
TCK-193847
TCK-650284
TCK-908173
TCK-274659
TCK-561902
TCK-784320
TCK-129875
TCK-346781
TCK-902134
TCK-675489
TCK-218903
TCK-543210
TCK-889761
TCK-332198
TCK-771245
TCK-459872
TCK-610394
TCK-285617
TCK-947302
TCK-136580
TCK-864209
TCK-703418
TCK-592731
TCK-418659
TCK-256904
TCK-980143
TCK-374628
TCK-621759

## Position Selection
Players can select multiple positions.

Buttons:
- GOALKEEPER
- DEFENDER
- MID FIELD
- ATTACKER

Each button works like a toggle:
- first tap activates it
- second tap resets it to default

## Captain Selection
There should be a CAPTAIN toggle button.

## Rating
Player rating is from 1 to 10.
Use stars.
The stars should visually progress from red to green.
Display the selected rating clearly, for example: 7/10.

## Arrivals List
After check-in, show a list of arrived players.

Each player row/card should show:
- name
- ticket number
- selected positions
- captain status if selected
- rating
- arrival timestamp

Prevent the same ticket from being checked in twice.

## Team Randomiser
At the front/top of the page, include buttons to randomise into:
- 2 teams
- 3 teams

The goal is to make teams as balanced as possible.

Balancing rules:
- Balance average rating across teams.
- Keep team sizes as equal as possible.
- If possible, spread goalkeepers across teams.
- If possible, spread defenders, midfielders, and attackers across teams.
- A player can have multiple positions, so use all selected positions when balancing.
- Captains can be distributed across teams where possible.

After randomising, display:
- Team 1, Team 2, and optionally Team 3
- player names
- positions
- rating
- captain marker if selected
- overall average rating for each team

## Storage
Use localStorage for now so data stays after refreshing the tablet page.

Later this may be moved to Supabase for online storage.

## Design Style
Mobile-first.
Modern, clean, premium football app style.
Dark theme preferred.
Large touch-friendly buttons.
Good spacing.
Simple and fast for tablet use.
Avoid outdated design.
Avoid clutter.

## Tech Preferences
Use:
- HTML
- JavaScript
- Tailwind CSS
- DaisyUI style where useful
- html5-qrcode for QR scanning

## Important Behaviour
Camera scanning must work on tablet.
Use the front camera if possible, but allow fallback if browser limitations require it.
Camera usually requires HTTPS or localhost.

## Do Not Do
- Do not overcomplicate the UI.
- Do not require login for this version.
- Do not remove existing features unless asked.
- Do not change ticket format unless asked.
- Do not use backend storage unless specifically requested.