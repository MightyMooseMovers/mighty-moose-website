# Mighty Moose Movers website

The website for Mighty Moose Movers, London, Ontario.

- `index.html`: the home page, with the free price tool and the booking request form
- `checklist.html`: the free moving checklist
- `logo.webp`, `logo-sm.webp`, `favicon.png`, `apple-touch-icon.png`: logo and icons
- `og-image.jpg`: the picture shown when someone shares a link to the site
- `robots.txt`, `sitemap.xml`: help Google find the pages

Live at https://mightymoosemovers.ca (domain from GoDaddy). Netlify project: `inquisitive-ganache-6fdc72`, also at https://inquisitive-ganache-6fdc72.netlify.app.

Netlify publishes this repository. Any change saved here goes live on the website within a minute or two.

## Changing prices

In `index.html`, find `var PRICING` and `var TRUCKS`. They use the same numbers as the Google Sheet
"Mighty Moose Moving - Jobs & Profit" (Settings and Trucks tabs). When you change a number on the sheet,
change it here too so the website and the sheet give the same price.

## Booking requests

The booking form is a Netlify form called `booking`. Requests, with photos, arrive by email.
Netlify: Forms, then notification settings, sets where they go.
