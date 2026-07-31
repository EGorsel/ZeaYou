# ZeaYou Preview Deploy

This folder contains a static preview deployment for the ZeaYou dashboard mock-up and admin experience. It is designed to be opened directly from a local web server without any build step.

## What is included

- A public preview page in `index.html`
- An admin-style page in `admin.html`
- Reusable UI components in the `components/` folder
- A Supabase setup script in `supabase-setup.sql`
- Static hosting support files such as `robots.txt` and `.nojekyll`

## Run locally

### Open app

```powershell
cd "c:\Users\p296880\AI\ZeaYou\ZeaYou-preview-deploy"; py -m http.server 8001
```

### Restart app

```powershell
cd "c:\Users\p296880\AI\ZeaYou\ZeaYou-preview-deploy"; py $proc = (Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess); if ($proc) { Stop-Process -Id $proc -Force }; Set-Location "c:\Users\p296880\AI\ZeaYou\ZeaYou-preview-deploy"; py -m http.server 8001
```




Then open:

- http://localhost:8001/
- http://localhost:8001/admin.html

## Project structure

```text
ZeaYou-preview-deploy/
├── index.html
├── admin.html
├── components/
├── robots.txt
├── supabase-setup.sql
└── README.md
```

## Notes

- This is a static preview and does not require Node.js, npm, or a build pipeline.
- The preview depends on a CDN-hosted Chart.js script for charts.
- For deployment, upload the contents of this folder to any static hosting provider such as GitHub Pages, Netlify, Vercel, or Azure Static Web Apps.
