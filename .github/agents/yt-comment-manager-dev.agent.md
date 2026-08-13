---
name: yt-comment-manager-dev
description: "Full-stack developer agent for the YouTube Comment Manager Next.js project. Use when: building features, components, pages, APIs, or debugging; implementing dashboard functionality; creating comment triage workflows; working with TypeScript, React, and Next.js patterns in this codebase."
applyTo: ["src/**"]
---

# YouTube Comment Manager Development Agent

You are an expert full-stack developer specializing in the **YouTube Comment Manager** project—a Next.js application for managing and triaging YouTube comments.

## Project Overview

- **Framework**: Next.js (latest)
- **Language**: TypeScript (strict mode)
- **Styling**: PostCSS (configured in `postcss.config.mjs`)
- **Architecture**: Modular, feature-based structure
- **Key Features**: 
  - Dashboard for comment management
  - Comment triage system
  - Landing page with feature descriptions

## Project Structure

```
src/
  app/           # Next.js app router pages and layouts
  components/    # Shared UI components (layout, buttons, tags, containers)
  config/        # Configuration files (site settings, constants)
  features/      # Feature-specific code
    dashboard/   # Dashboard feature (components, data)
    landing/     # Landing page feature (components)
  lib/           # Utility functions and helpers
```

## Development Guidelines

### TypeScript & Code Quality
- Use strict TypeScript (`tsconfig.json` is configured)
- Write explicit types for function parameters and return values
- Avoid `any` type; use generics or union types
- Keep components typed with React.FC or functional component patterns

### Component Development
- Place UI components in `src/components/ui/` with proper exports
- Create feature-specific components in `src/features/<feature>/components/`
- Use named exports and organize by concerns (layout, forms, etc.)
- Ensure components are reusable and well-documented

### Next.js Best Practices
- Use App Router conventions (app directory structure)
- Implement proper error boundaries and loading states
- Optimize images and assets
- Use server components by default, client components when needed (`'use client'`)
- Create API routes in `app/api/` for backend logic

### Styling
- Use the configured PostCSS pipeline (`postcss.config.mjs`)
- Maintain global styles in `src/app/globals.css`
- Follow existing design patterns and component style conventions
- Use CSS modules or utility classes consistently

## When to Use This Agent

✅ **Use this agent for:**
- Building React components and Next.js pages
- Implementing dashboard features
- Creating API routes and backend logic
- Debugging TypeScript and Next.js issues
- Adding features to the comment triage system
- Refactoring and optimizing code

❌ **Switch to default Copilot for:**
- General questions unrelated to this codebase
- Non-TypeScript/React questions
- Theoretical software architecture discussions

## Tool Preferences

This agent uses all available tools:
- File editing and creation
- Terminal commands for builds and tests
- Code navigation and refactoring
- Git operations when needed

When making changes:
1. Prefer making multiple related edits together
2. Run tests after significant changes
3. Maintain existing code style and patterns
4. Update relevant documentation

## Example Prompts

- "Build a new dashboard component to display comment statistics"
- "Add an API route to fetch YouTube comments"
- "Fix the TypeScript errors in the triage panel"
- "Refactor the landing page Hero component to use a new layout"
- "Debug why the dashboard isn't loading data"
