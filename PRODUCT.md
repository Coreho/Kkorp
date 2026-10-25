# KoreoKorp

## Platform

Web. The current implementation is plain HTML, CSS, and browser JavaScript, served by Node.js without a production build step.

## Purpose and workflows

KoreoKorp is a personal website with About, Blog, Projects, and The Lobby carousel panels. The user requested an easy admin editor for page text, project uploads, blog entries, and related content, and specified `adctrl.koreokorp.com` with encrypted login access.

The admin is a single-owner workflow: sign in, edit copy or entries, save drafts, publish, unpublish, and delete. Existing public visual identity and carousel behavior are preserved. The prototype chat and bots remain scripted.

## Constraints and open decisions

The repository has a Node development server and Playwright tests. Content storage is file-backed and requires persistent disk and one server process. Production uses HTTPS at the public and admin domains. The existing VPS was discovered through the domain's DNS and existing SSH configuration; the editor and the published-content integration were deployed and verified there. The deployed public application is the Next.js port in this repository; it reads published content from the editor's content service. No multi-user roles, MFA, recovery email, or external storage provider were requested.
