# Security policy

This repository holds documentation, not the application. What follows says where each kind
of report belongs, because sending a vulnerability to the wrong one of three repositories
delays a fix and puts it in public while it waits.

## A vulnerability in Keydra itself

**Report it against the backend, privately, and not here.**

*Security* → *Report a vulnerability* on
[keydra-backend](https://github.com/keydrahq/keydra-backend/security/advisories/new), which is
where the code that holds credentials lives. That repository's
[SECURITY.md](https://github.com/keydrahq/keydra-backend/blob/main/SECURITY.md) says what is
in scope.

Do not open a public issue here to describe it, and do not put the detail in a documentation
issue as a way of "just fixing the docs". A page that says what an unpatched instance is
vulnerable to is a disclosure whichever repository it sits in.

## Documentation that is wrong in a way that costs somebody their security

This is the one to report *here*, and it is worth its own channel — a procedure that quietly
leaves an instance open is a real fault even though no code is involved.

Use *Security* → *Report a vulnerability* on this repository if the manual:

- tells somebody to run with `KEYDRA_SECURITY_ENABLED=false`, or omits what that costs;
- describes a permission as narrower than it is, so a grant hands over more than the reader
  intended;
- gets a credential's storage wrong — says something is encrypted or not returned by the API
  when it is;
- gives a deployment step that skips TLS, a trusted-proxy list, or the public URL;
- writes an example that would put a secret into a manifest, a log or a shell history.

Ordinary mistakes — a stale label, a broken link, a procedure that no longer matches the
interface — are just issues. Open one.

## What this repository publishes

The site is static: AsciiDoc rendered to HTML, with no server and no database behind it. It
runs no JavaScript that talks to anything, sets no cookies, and stores nothing in a browser
beyond the theme a reader picked.

The screenshots are taken from a throwaway instance built for the purpose. If you ever find
one that shows a real key name, a real address, a token or somebody's data, report it here —
that is a leak even when the picture looks harmless.

## What to expect

An acknowledgement within three working days, and an assessment within ten. Credit in the
commit unless you would rather not be named.
