# Contributing to BuildEstate



Thank you for considering contributing to BuildEstate! This document outlines the process for contributing to this project.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone. Please be courteous and respectful in your interactions.

## How to Contribute

There are several ways you can contribute to the BuildEstate project:

1. **Reporting Bugs**: Open an issue describing the bug, how to reproduce it, and any potential solutions.
2. **Suggesting Features**: Open an issue describing your feature idea and how it would benefit the project.
3. **Submitting Code**: Make a pull request with your code changes.
4. **Improving Documentation**: Help improve the documentation through pull requests.

## Development Process

### Setup Local Environment

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Real-Estate-Website.git
   cd Real-Estate-Website
   ```
3. Install dependencies for each app:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   cd ../admin && npm install
   ```
4. Set up environment files:
   ```bash
   cp backend/.env.example backend/.env.local
   cp frontend/.env.example frontend/.env.local
   cp admin/.env.example admin/.env.local
   ```
5. Edit each `.env.local` with your credentials — see [README.md](README.md) for the full list of required variables

### Making Changes

1. Create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   # or for bug fixes:
   git checkout -b fix/your-bug-description
   ```
2. Make your changes and test thoroughly
3. Commit using conventional commits:
   ```bash
   git commit -m "feat: add your feature"
   git commit -m "fix: resolve the bug"
   git commit -m "docs: update readme"
   ```
4. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
5. Open a Pull Request against the `main` branch

## Pull Request Guidelines

- Keep PRs focused on a single feature or fix
- Include a clear description of what was changed and why
- Reference any related issues (e.g. `Closes #42`)
- Update documentation if your change affects setup or usage
- Ensure `npm run build` succeeds in the affected app(s)
- Run `npm run lint` and fix any errors before submitting

## Code Style

- Follow the existing code style and formatting
- Use meaningful variable and function names
- Write comments for complex logic
- Include JSDoc comments for functions

## Testing

- Add appropriate tests for new features
- Ensure all existing tests pass
- Manual testing should be performed on different devices and browsers

## Documentation

- Update the README.md if necessary
- Document API changes in the appropriate documentation files
- Keep code comments up-to-date

## Project Structure Quick Reference

| Directory | App | Port |
|---|---|---|
| `backend/` | Node.js + Express REST API | 4000 |
| `frontend/` | React + TypeScript user site | 5173 |
| `admin/` | React 19 + TypeScript desktop admin | 5175 |

## Questions?

Feel free to [open an issue](https://github.com/AAYUSH412/Real-Estate-Website/issues) or reach out at **aayushvaghela12@gmail.com**.

Thank you for contributing to BuildEstate!