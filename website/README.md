# UNIT Netlify Website

Static marketing site for the UNIT mobile app.

## Local Preview

```bash
npx serve website
```

## Netlify Deploy

The root `netlify.toml` publishes the `website/` folder. In Netlify, create a
new site from this repository and use:

- Build command: empty
- Publish directory: `website`

The `/portal` path redirects to the live advertiser portal at
`https://unit-portal-one.vercel.app`.
