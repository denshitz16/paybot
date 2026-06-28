# Shadcn-UI Template Usage Instructions

## technology stack

This project is built with:

<<<<<<< HEAD
- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
=======
- **Real-time Analytics**: Live sales tracking and successful payment metrics.
- **Wallet Management**: Visual oversight of PHP/USD balances and TRC20 addresses.
- **Terminal Control**: Remote management and assignment of POS hardware.
- **KYB/KYC Review**: Approval interface for new merchant registrations.
- **Payment Tools**: Generate invoices, links, and QR codes directly from the browser.
>>>>>>> parent of c6d943c (feat: delete KYC and KYB features from dashboard and telegram bot)

All shadcn/ui components have been downloaded under `@/components/ui`.

## File Structure

- `index.html` - HTML entry point
- `vite.config.ts` - Vite configuration file
- `tailwind.config.js` - Tailwind CSS configuration file
- `package.json` - NPM dependencies and scripts
- `src/app.tsx` - Root component of the project
- `src/main.tsx` - Project entry point
- `src/index.css` - Existing CSS configuration

## Components

- All shadcn/ui components are pre-downloaded and available at `@/components/ui`

## Styling

- Add global styles to `src/index.css` or create new CSS files as needed
- Use Tailwind classes for styling components

## Development

- Import components from `@/components/ui` in your React components
- Customize the UI by modifying the Tailwind configuration

## Note

The `@/` path alias points to the `src/` directory

# Commands

**Install Dependencies**

```shell
pnpm i
```

**Start Preview**

```shell
pnpm run dev
```

**To build**

```shell
pnpm run build
```
