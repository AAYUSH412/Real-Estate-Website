# Contributing to BuildEstate

Thank you for helping! Contributions of all sizes are welcome, and this project is a good place to make your first open-source pull request.

By taking part, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to help

- **Report a bug:** [open an issue](https://github.com/AAYUSH412/Real-Estate-Website/issues/new/choose) with steps to reproduce it.
- **Suggest a feature:** open an issue explaining the idea and who it helps.
- **Improve the docs:** fixing a confusing sentence is a real contribution.
- **Write code:** start with an issue labelled [good first issue](https://github.com/AAYUSH412/Real-Estate-Website/labels/good%20first%20issue).

Before starting something large, open an issue first so we can agree on the approach.

## Your first pull request

**1. Fork the repository** using the button on GitHub, then get your copy running:

```sh
git clone https://github.com/YOUR_USERNAME/Real-Estate-Website.git
cd Real-Estate-Website
npm run setup
npm run seed
npm run dev
```

No accounts are needed. See the [setup guide](docs/SETUP.md) if you get stuck.

**2. Create a branch:**

```sh
git checkout -b fix/short-description
```

**3. Make your change.** The [architecture guide](docs/ARCHITECTURE.md) shows where things live.

**4. Run the checks:**

```sh
npm test
npm run build
npm run check:docs
```

If you changed the admin panel, also run `npm run lint` inside `admin/`.

**5. Commit** using [conventional commit](https://www.conventionalcommits.org/) messages:

```sh
git commit -m "fix: show an error when the listing fails to load"
```

Common prefixes are `feat:`, `fix:`, `docs:`, `test:` and `chore:`.

**6. Push and open a pull request** against `main`:

```sh
git push origin fix/short-description
```

GitHub then runs the tests, and the quick start on Windows, macOS and Linux.

## What makes a good pull request

- It covers one change.
- It explains what changed and why, and links the issue (`Closes #42`).
- It adds or updates tests when behavior changes.
- It updates the docs when setup or usage changes.
- It includes a screenshot if the interface changed.

## Project rules

These keep the project safe, so please follow them:

- **Never commit secrets,** `.env.local` files, database exports or real user data.
- **Keep secrets out of `VITE_` variables.** They are visible to anyone in the browser.
- **Admin access tokens stay in memory.** Never move them to `localStorage`.
- **Use versioned updates, transactions and audit records** for data changes in the admin flows. See the [architecture guide](docs/ARCHITECTURE.md#keeping-data-safe).
- **NVIDIA is the only AI provider.** Firecrawl keys are supplied by the user.
- **The admin panel is desktop-only** for now.
- **Tests must not call real services** or touch real databases.

Follow the style of the code around your change. Browser testing is manual, so list what you checked in your pull request.

## Questions?

[Open an issue](https://github.com/AAYUSH412/Real-Estate-Website/issues) or email **aayushvaghela12@gmail.com**. To report a security problem, follow [SECURITY.md](SECURITY.md) instead.

Thank you for contributing!
