# Mighty Moose Moving website

The website for Mighty Moose Moving, London, Ontario.

- `index.html`: the home page, with the free price tool and the booking request form
- `checklist.html`: the free moving checklist
- `logo.webp`, `logo-sm.webp`, `favicon.png`, `apple-touch-icon.png`: logo and icons

Netlify publishes this repository. Any change saved here goes live on the website within a minute or two.

## Changing prices

In `index.html`, find `var PRICING` and `var TRUCKS`. They use the same numbers as the Google Sheet
"Mighty Moose Moving - Jobs & Profit" (Settings and Trucks tabs). When you change a number on the sheet,
change it here too so the website and the sheet give the same price.

## Booking requests

The booking form is a Netlify form called `booking`. Requests, with photos, arrive by email.
Netlify: Forms, then notification settings, sets where they go.
