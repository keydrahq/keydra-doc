# KEYDRA DOCUMENTATION PLATFORM
# COMPLETE IMPLEMENTATION SPECIFICATION
# RED HAT ECOSYSTEM / PATTERNFLY 6 / ASCIIDOC / ENGLISH + TURKISH

You are operating as a senior software architect, senior technical writer, documentation platform engineer, UX engineer, build engineer, and release engineer.

Your task is to inspect the existing **Keydra** project source code and build a complete, production-grade, bilingual documentation platform for it.

This is an implementation task.

Do NOT only give recommendations.

Do NOT only create an architecture document.

Do NOT only scaffold directories.

Do NOT stop after installing dependencies.

Do NOT stop after creating a demo page.

Do NOT create documentation based on assumptions.

You must:

1. inspect the actual Keydra source code;
2. understand the real backend and frontend behavior;
3. discover the real product features;
4. determine the actual UI terminology;
5. determine the actual configuration model;
6. determine the actual REST/API surface;
7. determine the actual security model;
8. determine Redis/Valkey capabilities from source;
9. create the documentation architecture;
10. implement the documentation renderer;
11. implement the PatternFly 6 documentation UI;
12. implement English documentation;
13. implement Turkish documentation;
14. implement language switching;
15. implement version-aware documentation;
16. implement search;
17. implement validation;
18. implement Vale;
19. implement PDF generation;
20. implement CI;
21. build the documentation;
22. run tests;
23. render the site locally;
24. verify representative pages;
25. fix discovered problems;
26. leave the repository in a production-usable state.

Do not consider the task complete until the documentation website builds successfully and representative pages have been verified.

---

# 1. KEYDRA SOURCE CODE LOCATION

The complete Keydra source code is located at:

```text
/home/mehmetozturk/Projects/Personal/Firat/keydra/
```

This directory is the primary source of truth.

You MUST inspect this directory before making architectural or documentation decisions.

Begin by navigating to:

```bash
cd /home/mehmetozturk/Projects/Personal/Firat/keydra/
```

Do not assume the project structure from this prompt.

Discover it.

---

# 2. SOURCE CODE IS THE PRIMARY SOURCE OF TRUTH

The documentation must represent the actual Keydra implementation.

Do not invent functionality.

Do not create generic Redis documentation and pretend that Keydra supports it.

Do not describe UI pages that do not exist.

Do not describe buttons that do not exist.

Do not describe REST endpoints that do not exist.

Do not describe configuration properties that do not exist.

Do not claim support for Redis/Valkey capabilities unless the source code demonstrates that support.

Do not assume Keycloak.

Do not assume Kubernetes.

Do not assume OpenShift.

Do not assume Helm.

Do not assume backup providers.

Do not assume observability integrations.

Discover the implementation from the repository.

If a capability is planned but not implemented, do not document it as a current feature.

If necessary, clearly categorize it as planned or omit it.

---

# 3. FIRST PHASE — REPOSITORY DISCOVERY

Before writing any documentation, inspect the repository.

At minimum inspect:

```text
.git/
.gitignore
.github/
README*
LICENSE*
CONTRIBUTING*
pom.xml
build.gradle
settings.gradle
package.json
pnpm-lock.yaml
yarn.lock
package-lock.json
Containerfile*
Dockerfile*
compose*
application.properties
application.yaml
application.yml
src/
frontend/
backend/
web/
ui/
docs/
```

Determine:

- repository type;
- monorepo or multi-module structure;
- backend directory;
- frontend directory;
- Maven or Gradle;
- frontend package manager;
- Java version;
- Node version;
- Quarkus version;
- PatternFly version;
- React version;
- build commands;
- CI system;
- existing documentation;
- existing branding assets;
- application version;
- release strategy.

Do not modify anything before understanding these basics.

---

# 4. CREATE A SOURCE ANALYSIS INVENTORY

Before implementing docs, internally build a structured inventory of Keydra.

Identify at least:

```text
Product capabilities
Frontend routes
Frontend navigation
Frontend page titles
Frontend visible button labels
Frontend forms
Frontend field labels
Frontend validation rules
Backend REST resources
REST endpoints
Request DTOs
Response DTOs
Configuration properties
Environment variables
Security configuration
OIDC configuration
Authorization roles
Database abstractions
Redis functionality
Valkey functionality
Connection management
Cluster management
Backup functionality
Restore functionality
Migration functionality
Health endpoints
Metrics
Tracing
Logging
OpenAPI
Error handling
Persistence/database usage
Scheduler/background jobs
Import/export functionality
Notification functionality
User management functionality
Tenant functionality
Feature flags
Runtime configuration
External integrations
```

Use this inventory as the basis for documentation.

---

# 5. BACKEND SOURCE CODE ANALYSIS

Find the real Quarkus backend.

Inspect it thoroughly.

Search for Java classes and configuration related to:

```text
@Path
@GET
@POST
@PUT
@PATCH
@DELETE
@RestPath
@RestQuery
@RestForm
@RestHeader
@RolesAllowed
@PermitAll
@Authenticated
SecurityIdentity
Oidc
OIDC
ConfigProperty
ConfigMapping
application.properties
application.yaml
OpenAPI
SmallRye
Health
Liveness
Readiness
Micrometer
OpenTelemetry
Tracer
Span
Redis
Valkey
backup
restore
migration
cluster
connection
instance
database
credential
secret
tenant
user
role
permission
notification
```

Inspect:

- resource/controller classes;
- service classes;
- domain models;
- entities;
- DTOs;
- enums;
- validation annotations;
- exception mappers;
- response structures;
- configuration mappings;
- runtime settings;
- scheduled jobs;
- migrations;
- database schemas;
- integration code.

Documentation must use actual implementation names.

---

# 6. QUARKUS CONFIGURATION ANALYSIS

Inspect all configuration sources.

At minimum search for:

```text
application.properties
application.yaml
application.yml
%dev.
%test.
%prod.
quarkus.
mp.
smallrye.
otel.
oidc.
redis.
datasource.
http.
log.
health.
metrics.
```

Create a machine-derived configuration inventory containing:

```text
Property name
Environment variable equivalent where applicable
Description
Type
Default
Required/optional
Sensitive/non-sensitive
Profile applicability
Source location
```

Never publish secret values.

Never copy credentials from development files into documentation.

If an actual secret is found in the repository, do NOT repeat it in generated documentation or final reports.

---

# 7. REST API ANALYSIS

Discover the actual REST API.

For each resource identify:

```text
HTTP method
Path
Purpose
Authentication requirement
Authorization requirement
Request model
Response model
Status codes
Validation rules
Important failure scenarios
```

Do not manually document every DTO when OpenAPI can provide the reference automatically.

Instead separate:

```text
Conceptual API documentation
+
Generated API reference
```

If Quarkus OpenAPI is available, use it as the authoritative API schema.

---

# 8. OPENAPI ANALYSIS

Search for:

```text
quarkus-smallrye-openapi
smallrye-openapi
@Operation
@APIResponse
@Schema
@Tag
OpenAPI
Swagger UI
```

If OpenAPI exists:

Build an integration path similar to:

```text
Quarkus backend
     ↓
OpenAPI specification
     ↓
docs build
     ↓
versioned API reference
```

Do not require the backend to be running merely to browse already-built documentation if the spec can be exported during CI/build.

---

# 9. FRONTEND SOURCE CODE ANALYSIS

Inspect the actual frontend in detail.

Determine:

- framework;
- React version;
- PatternFly packages;
- PatternFly version;
- router;
- application shell;
- navigation definition;
- page structure;
- REST clients;
- localization framework;
- authentication integration;
- error handling;
- branding;
- themes.

Search for:

```text
@patternfly
Page
Masthead
Nav
NavList
NavItem
PageSidebar
Breadcrumb
Button
Form
FormGroup
TextInput
Select
Menu
Tabs
Table
Modal
Alert
Drawer
SearchInput
Toolbar
Title
Content
```

Also inspect routes and labels.

---

# 10. USER-FACING TERMINOLOGY MUST COME FROM FRONTEND

Documentation procedures must use the exact UI labels displayed by Keydra.

Example:

If the actual frontend button says:

```text
Add database
```

documentation should say:

```asciidoc
Click *Add database*.
```

Do NOT substitute:

```text
Create database
Create data source
New connection
```

unless those are actual labels.

---

# 11. IMPORTANT RULE FOR TURKISH DOCUMENTATION AND UI LABELS

Turkish documentation must remain technically accurate to the application UI.

If Keydra UI itself supports Turkish localization and the current screen label is Turkish, use that Turkish label.

If Keydra UI is English-only, do NOT invent Turkish translations of clickable UI elements.

For example:

Correct Turkish documentation for an English-only UI:

```asciidoc
*Databases* sayfasına gidin ve *Add database* düğmesine tıklayın.
```

Do not write:

```asciidoc
*Veritabanları* sayfasına gidin ve *Veritabanı ekle* düğmesine tıklayın.
```

unless the application actually displays those Turkish labels.

This is critical for procedural accuracy.

---

# 12. EXISTING BRANDING ANALYSIS

Find existing Keydra assets:

```text
logo
SVG
wordmark
favicon
icons
brand colors
CSS variables
theme tokens
PatternFly overrides
```

Reuse them.

Do not generate a replacement brand.

Do not use Red Hat logos.

Do not claim Red Hat affiliation.

The intended equation is:

```text
PatternFly / Red Hat ecosystem design discipline
+
Keydra branding
```

not:

```text
copy Red Hat branding
```

---

# 13. DOCUMENTATION PLATFORM GOAL

Build a documentation system that follows the public Red Hat documentation engineering ecosystem as closely as practical.

The platform must use:

```text
AsciiDoc
Asciidoctor
Red Hat-style modular documentation
Vale
Red Hat writing conventions
PatternFly 6
Red Hat typography
static site generation
versioned documentation
multi-language documentation
CI validation
```

Do not use a generic documentation portal theme.

---

# 14. DO NOT USE THESE AS THE PRIMARY DOCUMENTATION UI

Do NOT solve the task with:

```text
Docusaurus
MkDocs Material
GitBook
Nextra
VitePress default theme
VuePress
Starlight
Docsify
Bootstrap documentation template
Tailwind documentation template
Material UI
Ant Design
Chakra UI
shadcn
Antora Default UI
```

If a low-level library is useful for search or parsing, that is acceptable.

The presentation system itself must be PatternFly 6.

---

# 15. DOCUMENTATION ARCHITECTURE

Use this conceptual architecture:

```text
                     Git repository
                           │
                    Keydra source code
                           │
                  documentation source
                           │
             ┌─────────────┴─────────────┐
             │                           │
          English                     Turkish
          AsciiDoc                    AsciiDoc
             │                           │
             └─────────────┬─────────────┘
                           │
                       Asciidoctor
                           │
                   semantic HTML
                           │
                    metadata model
                           │
                   PatternFly 6 shell
                           │
                static documentation
                           │
          ┌────────────────┼─────────────────┐
          │                │                 │
       search            HTML               PDF
          │
        index
```

---

# 16. STRICT SEPARATION OF CONCERNS

Maintain independent layers:

```text
Content
Localization
Build
Renderer
Navigation
Search
Versioning
Presentation
Validation
Deployment
```

Documentation authors should edit `.adoc` files.

They should not need React knowledge.

---

# 17. DOCUMENTATION ROOT

Unless an existing project convention strongly suggests another path, create:

```text
/home/mehmetozturk/Projects/Personal/Firat/keydra/docs/
```

Do not create documentation outside the repository.

---

# 18. TARGET DOCUMENTATION STRUCTURE

Adapt if necessary after repository inspection, but target approximately:

```text
docs/
├── README.adoc
├── CONTRIBUTING.adoc
├── Makefile
├── package.json
├── tsconfig.json
├── .vale.ini
├── site.yml
├── versions.yml
│
├── content/
│   ├── en/
│   │   ├── attributes/
│   │   │   └── attributes.adoc
│   │   ├── assemblies/
│   │   │   ├── assembly_getting-started.adoc
│   │   │   ├── assembly_installation.adoc
│   │   │   ├── assembly_database-management.adoc
│   │   │   ├── assembly_backup-restore.adoc
│   │   │   ├── assembly_migration.adoc
│   │   │   ├── assembly_security.adoc
│   │   │   ├── assembly_configuration.adoc
│   │   │   ├── assembly_observability.adoc
│   │   │   └── assembly_troubleshooting.adoc
│   │   ├── modules/
│   │   │   ├── con_*.adoc
│   │   │   ├── proc_*.adoc
│   │   │   └── ref_*.adoc
│   │   ├── snippets/
│   │   └── images/
│   │
│   └── tr/
│       ├── attributes/
│       │   └── attributes.adoc
│       ├── assemblies/
│       │   ├── assembly_getting-started.adoc
│       │   ├── assembly_installation.adoc
│       │   ├── assembly_database-management.adoc
│       │   ├── assembly_backup-restore.adoc
│       │   ├── assembly_migration.adoc
│       │   ├── assembly_security.adoc
│       │   ├── assembly_configuration.adoc
│       │   ├── assembly_observability.adoc
│       │   └── assembly_troubleshooting.adoc
│       ├── modules/
│       │   ├── con_*.adoc
│       │   ├── proc_*.adoc
│       │   └── ref_*.adoc
│       ├── snippets/
│       └── images/
│
├── navigation/
│   ├── en.yml
│   └── tr.yml
│
├── locales/
│   ├── en.yml
│   └── tr.yml
│
├── glossary/
│   ├── en.yml
│   └── tr.yml
│
├── renderer/
│   ├── src/
│   │   ├── build/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── navigation/
│   │   ├── search/
│   │   ├── i18n/
│   │   ├── versioning/
│   │   ├── styles/
│   │   ├── scripts/
│   │   ├── utilities/
│   │   └── types/
│   └── package.json
│
├── scripts/
│   ├── build.ts
│   ├── build-language.ts
│   ├── build-version.ts
│   ├── build-search.ts
│   ├── build-pdf.ts
│   ├── validate-asciidoc.ts
│   ├── validate-links.ts
│   ├── validate-navigation.ts
│   ├── validate-localization.ts
│   ├── validate-source-references.ts
│   └── serve.ts
│
├── pdf/
│
├── tests/
│
└── dist/
```

---

# 19. BILINGUAL DOCUMENTATION IS MANDATORY

The platform must support at least:

```text
English: en
Turkish: tr
```

Both languages are first-class documentation languages.

Do not implement Turkish as an afterthought.

Do not use browser machine translation.

Do not dynamically send text to a third-party translation API.

Both language versions must be stored in source control.

---

# 20. ENGLISH AND TURKISH CONTENT PARITY

For production documentation, English and Turkish must have matching documentation structures.

For each published English file such as:

```text
content/en/modules/proc_connecting-redis.adoc
```

there should normally be a corresponding:

```text
content/tr/modules/proc_connecting-redis.adoc
```

The same applies to assemblies.

Build validation must detect missing translations.

---

# 21. LOCALIZATION VALIDATOR

Implement:

```text
validate-localization
```

It should detect at minimum:

```text
English page missing Turkish equivalent
Turkish page missing English equivalent
Navigation mismatch
Missing page title
Missing locale key
Broken language counterpart mapping
Version mismatch
Duplicate localized URL
```

For production builds, missing required translations should fail validation.

Allow explicitly declared exceptions for intentionally untranslated draft/internal pages.

---

# 22. TRANSLATION ARCHITECTURE

Do not use one giant file with conditional language blocks such as:

```text
ifdef::lang-en[]
...
endif::[]
```

for complete articles.

Keep English and Turkish content as independently reviewable AsciiDoc sources.

Shared technical assets may be reused where language-neutral.

---

# 23. CANONICAL LANGUAGE

Use English as the canonical technical authoring baseline unless the existing repository clearly indicates otherwise.

Workflow:

```text
Actual Keydra source code
        ↓
English technical documentation
        ↓
Turkish technical documentation
```

However, Turkish must not be low-quality literal translation.

It must read naturally as professional Turkish technical documentation.

---

# 24. TURKISH TECHNICAL WRITING RULES

Turkish documentation must:

- use clear professional Turkish;
- avoid unnecessary Ottoman/archaic vocabulary;
- avoid awkward machine translation;
- preserve established software terminology where appropriate;
- preserve product names;
- preserve API names;
- preserve configuration names;
- preserve environment variables;
- preserve commands;
- preserve class/field names;
- preserve exact UI labels where the UI itself is English;
- use Turkish explanations around those terms.

Examples:

Preferred:

```text
OIDC sağlayıcısı
erişim belirteci
kimlik doğrulama
yetkilendirme
veritabanı bağlantısı
yedekleme
geri yükleme
küme
örnek
yapılandırma
```

Do not translate code identifiers.

---

# 25. GLOSSARY

Create a localization glossary.

At minimum define treatment for:

```text
Keydra
Redis
Valkey
Quarkus
PatternFly
OIDC
OpenID Connect
API
REST
endpoint
instance
cluster
node
connection
backup
restore
migration
credential
secret
role
permission
health check
readiness
liveness
metrics
tracing
OpenTelemetry
```

The glossary should specify:

```text
English term
Preferred Turkish term
Terms that must remain untranslated
Usage notes
```

Use it consistently.

---

# 26. DOCUMENTATION URL STRUCTURE

URLs must include language and version.

Prefer:

```text
/docs/en/latest/
/docs/tr/latest/
```

Examples:

```text
/docs/en/latest/getting-started/
/docs/tr/latest/getting-started/

/docs/en/latest/databases/redis/connecting/
/docs/tr/latest/databases/redis/connecting/

/docs/en/1.0/security/
/docs/tr/1.0/security/
```

Language and version must be explicit.

---

# 27. LANGUAGE SWITCHER

The masthead must provide a language selector.

At minimum:

```text
English
Türkçe
```

When switching language, preserve:

1. version;
2. current page;
3. current section anchor where practical.

Example:

Current:

```text
/docs/en/1.2/databases/redis/connecting/#verification
```

Switching to Turkish should attempt:

```text
/docs/tr/1.2/databases/redis/connecting/#verification
```

provided the translated target exists.

---

# 28. LANGUAGE FALLBACK

Never silently mix English and Turkish article content.

If a translation is unexpectedly unavailable:

- do not render half the page in another language;
- do not silently redirect to an unrelated article;
- show a clear localized message;
- provide a link to the available language;
- production validation should normally prevent this condition.

---

# 29. LOCALIZED UI STRINGS

The documentation shell itself must be localized.

Examples:

English:

```text
Documentation
Search
Version
On this page
Previous
Next
Edit this page
View source
Copy
Copied
Language
Table of contents
```

Turkish:

```text
Dokümantasyon
Ara
Sürüm
Bu sayfada
Önceki
Sonraki
Bu sayfayı düzenle
Kaynağı görüntüle
Kopyala
Kopyalandı
Dil
İçindekiler
```

Store UI translations centrally.

Do not scatter string literals across components.

---

# 30. RED HAT MODULAR DOCUMENTATION MODEL

All human-authored content must follow modular documentation concepts.

File prefixes:

```text
con_      concept
proc_     procedure
ref_      reference
assembly_ assembly
```

Do not create arbitrary monolithic pages when modular composition is appropriate.

---

# 31. CONCEPT MODULES

Concept modules answer questions such as:

```text
What is Keydra?
What is a managed database connection?
How does Keydra communicate with Redis?
How does Keydra communicate with Valkey?
How is authentication handled?
How does backup architecture work?
How does migration work?
```

They must explain concepts, not become operation manuals.

---

# 32. PROCEDURE MODULES

Procedure modules should normally follow:

```text
Title
Short goal statement
Prerequisites
Procedure
Verification
Next steps
```

Use imperative steps.

Example English:

```asciidoc
[id="connecting-redis_{context}"]
= Connecting a Redis database

Connect a Redis database to Keydra to manage it from the Keydra console.

.Prerequisites

* The Redis endpoint is reachable from Keydra.
* You have valid credentials.

.Procedure

. In the Keydra console, navigate to *Databases*.
. Click *Add database*.
...
```

Turkish counterpart:

```asciidoc
[id="connecting-redis_{context}"]
= Redis veritabanı bağlantısı oluşturma

Redis veritabanını Keydra üzerinden yönetmek için veritabanını Keydra'ya bağlayın.

.Ön koşullar

* Redis uç noktasına Keydra üzerinden erişilebildiğini doğrulayın.
* Geçerli bağlantı bilgilerine sahip olduğunuzdan emin olun.

.Prosedür

. Keydra konsolunda *Databases* sayfasına gidin.
. *Add database* düğmesine tıklayın.
...
```

Adapt labels to the actual frontend.

---

# 33. REFERENCE MODULES

Reference modules are for factual lookup.

Examples:

```text
Configuration properties
Environment variables
API behavior
Permissions
Supported versions
Ports
Error codes
Resource requirements
Database compatibility
```

Use tables where useful.

---

# 34. ASSEMBLIES

Assemblies combine reusable modules.

Example:

```asciidoc
[id="managing-redis"]
= Managing Redis databases

:context: managing-redis

include::../modules/con_redis-management.adoc[leveloffset=+1]

include::../modules/proc_connecting-redis.adoc[leveloffset=+1]

include::../modules/proc_verifying-redis-connection.adoc[leveloffset=+1]

include::../modules/ref_redis-connection-options.adoc[leveloffset=+1]
```

Do not copy module contents manually into assemblies.

---

# 35. ASCIIDOC ATTRIBUTES

Maintain locale-aware attributes.

English example:

```asciidoc
:product-name: Keydra
:redis-name: Redis
:valkey-name: Valkey
```

Turkish equivalent may reuse product attributes but provide localized reusable strings where necessary.

Do not over-engineer attributes.

---

# 36. SOURCE TRACEABILITY

Every significant generated documentation statement should be traceable to actual implementation.

Where practical, create internal metadata or generation comments that identify source paths.

Example:

```text
Derived from:
backend/src/.../DatabaseResource.java
frontend/src/.../DatabaseForm.tsx
```

Do not necessarily display internal source paths to public users.

But maintainers should be able to discover why documentation says something.

---

# 37. AUTOMATED SOURCE DISCOVERY REPORT

Create an internal generated development artifact such as:

```text
docs/.generated/source-inventory.json
```

or equivalent.

It can contain:

```json
{
  "backend": {},
  "frontend": {},
  "api": {},
  "configuration": {},
  "features": {},
  "uiLabels": {}
}
```

Do not commit secrets.

If generated files are not intended for source control, add them to `.gitignore`.

---

# 38. DOCUMENTATION INFORMATION ARCHITECTURE

Build the documentation around user tasks and product concepts, not package/class names.

Initial high-level categories should include, when supported by actual code:

```text
Getting started
Installation
Administration
Databases
Backup and restore
Migration
Security
Configuration
Observability
API reference
Troubleshooting
Release notes
```

Modify categories if actual Keydra functionality differs.

---

# 39. LANDING PAGE

Create a documentation-first landing page.

Do NOT create:

- giant marketing hero;
- customer testimonials;
- pricing cards;
- animated backgrounds;
- startup gradients;
- fake usage statistics.

Use a restrained PatternFly layout.

The page should answer:

```text
What is Keydra?
How do I install it?
How do I connect a database?
How do I configure authentication?
How do I create backups?
How do I migrate?
Where is the API?
How do I troubleshoot problems?
```

---

# 40. REQUIRED PATTERNFLY VERSION

Inspect the existing frontend package manifest.

Use the same compatible PatternFly major version as Keydra.

The target is PatternFly 6.

Do not introduce PatternFly 5 if the application is on PatternFly 6.

Avoid duplicate versions.

---

# 41. REQUIRED UI LIBRARIES

Use existing compatible packages, normally including:

```text
@patternfly/react-core
@patternfly/react-icons
```

Use actual installed package names.

Do not add a second competing design system.

---

# 42. DOCUMENTATION PAGE ARCHITECTURE

Use the PatternFly conceptual structure:

```text
Page
├── Masthead
├── PageSidebar
│   └── Nav
├── Main
│   ├── Breadcrumb
│   └── Documentation content area
│       ├── Article
│       └── On this page
```

Use actual PatternFly components where applicable.

---

# 43. DESKTOP UI

Desktop pages should resemble:

```text
┌───────────────────────────────────────────────────────────────────────────────┐
│ Keydra  Documentation       Search      English ▾    Version 1.x ▾   GitHub │
├───────────────────────────────────────────────────────────────────────────────┤
│ Documentation / Databases / Redis / Connecting                               │
├───────────────────┬────────────────────────────────────┬──────────────────────┤
│                   │                                    │                      │
│ Getting started   │ Connecting a Redis database        │ On this page         │
│ Installation      │                                    │                      │
│ Administration    │ Intro                              │ Prerequisites         │
│                   │                                    │ Procedure             │
│ Databases         │ Prerequisites                      │ Verification          │
│  ├ Redis          │                                    │ Next steps            │
│  ├ Valkey         │ Procedure                          │                      │
│  └ Connections    │                                    │                      │
│                   │ 1. Navigate to...                  │                      │
│ Backup & restore  │ 2. Click...                        │                      │
│ Migration         │                                    │                      │
│ Security          │ Verification                       │                      │
│ Configuration     │                                    │                      │
└───────────────────┴────────────────────────────────────┴──────────────────────┘
```

---

# 44. MASTHEAD

Include:

```text
Keydra logo
Documentation
Search
Language selector
Version selector
GitHub link
Theme selector if implemented
Mobile navigation button
```

Use PatternFly.

Keep it restrained.

---

# 45. LEFT NAVIGATION

Requirements:

- hierarchical;
- responsive;
- keyboard accessible;
- generated from navigation metadata;
- active item highlighting;
- active group expansion;
- locale aware;
- version aware.

Navigation metadata should not be independently hardcoded in React.

---

# 46. RIGHT TABLE OF CONTENTS

Implement:

```text
On this page
Bu sayfada
```

depending on locale.

Generate from H2/H3-equivalent headings.

Requirements:

- active section indication;
- stable anchors;
- keyboard accessible;
- sticky on desktop;
- responsive behavior on smaller screens.

---

# 47. BREADCRUMBS

Generate from navigation metadata.

Do not manually add per-page breadcrumb markup.

English:

```text
Documentation / Databases / Redis / Connecting a Redis database
```

Turkish:

```text
Dokümantasyon / Veritabanları / Redis / Redis veritabanı bağlantısı oluşturma
```

---

# 48. ARTICLE WIDTH

Documentation body must have a readable text measure.

Do not stretch text across the entire monitor.

Use PatternFly layout/token conventions.

---

# 49. TYPOGRAPHY

Use:

```text
Red Hat Display — headings
Red Hat Text — body
Red Hat Mono — code
```

Use supported packages/assets.

Do not distribute copied proprietary font files.

Use fallback fonts.

---

# 50. PATTERNFLY TOKENS

Use PatternFly design tokens for:

```text
spacing
typography
colors
borders
backgrounds
breakpoints
interactive states
shadows
status indicators
```

Avoid arbitrary custom values where PatternFly tokens exist.

---

# 51. CUSTOM CSS POLICY

Custom CSS is allowed only for documentation-specific requirements such as:

```text
article width
heading anchors
Asciidoctor output normalization
code block presentation
TOC sticky positioning
print styling
```

Do not recreate PatternFly in custom CSS.

---

# 52. DARK MODE

If the existing Keydra frontend and PatternFly 6 setup supports dark theme cleanly, implement:

```text
System
Light
Dark
```

Persist explicit preference.

Do not add a fragile homemade dark mode if PatternFly does not support it cleanly in the current dependency set.

---

# 53. MOBILE

Test at least representative widths approximately around:

```text
375 px
768 px
1280+ px
```

On mobile:

- left navigation becomes accessible through drawer/menu;
- article remains readable;
- TOC becomes collapsible;
- tables scroll horizontally;
- code blocks scroll;
- copy controls remain usable;
- masthead does not overflow.

---

# 54. ACCESSIBILITY

Target WCAG 2.2 AA principles.

Implement at minimum:

```text
semantic HTML
logical headings
skip-to-content link
keyboard navigation
visible focus
accessible buttons
accessible menus
accessible search
accessible language selector
accessible version selector
ARIA only when needed
meaningful alt text
sufficient contrast
reduced motion consideration
```

Do not remove PatternFly focus indicators.

---

# 55. ASCIIDOCTOR PROCESSING

Use a maintained Asciidoctor implementation.

For Node-based build tooling, evaluate:

```text
@asciidoctor/core
```

Prefer an architecture that converts AsciiDoc at build time.

Do not parse AsciiDoc in the browser.

---

# 56. STATIC GENERATION

Preferred architecture:

```text
AsciiDoc
   ↓
Asciidoctor
   ↓
HTML fragment + document metadata
   ↓
PatternFly React build-time renderer
   ↓
Static HTML
   ↓
Minimal runtime JavaScript
```

Core content should remain available even if JavaScript fails.

---

# 57. SEARCH

Implement static documentation search.

Index separately by:

```text
language
version
```

Index:

```text
title
description
headings
body
keywords
category
version
language
```

Default search must operate on the current language and current version.

---

# 58. SEARCH UI

Use PatternFly search components.

English placeholder:

```text
Search documentation
```

Turkish:

```text
Dokümantasyonda ara
```

Search results should contain:

```text
title
section/category
short excerpt
version when relevant
```

Do not mix languages in results.

---

# 59. SEARCH IMPLEMENTATION

A lightweight static search library can be used internally.

Possible options may include maintained local/static index libraries.

Do not use its built-in UI.

Do not require Algolia or another hosted SaaS unless no reasonable local solution exists.

---

# 60. CODE BLOCKS

Support at minimum:

```text
bash
shell
java
javascript
typescript
json
yaml
properties
sql
xml
http
dockerfile
```

Requirements:

- syntax highlighting;
- copy button;
- accessible controls;
- horizontal overflow;
- exact copy content.

---

# 61. ADMONITIONS

Support:

```text
NOTE
TIP
IMPORTANT
WARNING
CAUTION
```

English and Turkish documentation can use localized titles in rendered UI where practical.

Use restrained PatternFly-compatible visual language.

---

# 62. TABLES

Handle:

```text
configuration tables
permission tables
compatibility tables
API tables
environment variable tables
```

Requirements:

- responsive;
- readable;
- horizontal overflow where required;
- code-safe cells.

---

# 63. CROSS REFERENCES

Support proper AsciiDoc xrefs.

Broken internal references must fail validation.

Do not ship:

```text
xref:
include::
image::
```

references that resolve to missing files.

---

# 64. VERSIONING

Documentation must support multiple Keydra versions.

Discover the real release version from:

```text
Git tags
pom.xml
package.json
release configuration
CI
```

Do not fabricate versions.

Architecture must support future releases.

---

# 65. VERSION URLS

Use:

```text
/docs/{language}/{version}/...
```

Examples:

```text
/docs/en/latest/
/docs/tr/latest/
/docs/en/1.0/
/docs/tr/1.0/
```

---

# 66. VERSION SELECTOR

Must preserve:

```text
language
current page
```

when switching versions where the target exists.

Fall back sensibly if it does not.

Do not silently display another version under an incorrect URL.

---

# 67. VERSION SOURCE MODEL

Prefer Git-based versioning.

Conceptual flow:

```text
Git tag / release branch
        ↓
docs source from that ref
        ↓
build
        ↓
/docs/en/1.x/
/docs/tr/1.x/
```

Avoid manually maintaining duplicate release trees where Git history already provides isolation.

---

# 68. LATEST

Define:

```text
latest = latest stable release
```

unless repository release conventions strongly indicate another strategy.

Development documentation should be explicitly distinguishable, for example:

```text
next
development
main
```

Do not confuse development documentation with stable production docs.

---

# 69. VALE

Integrate Vale.

Use Red Hat-oriented packages when compatible.

Conceptual configuration:

```ini
StylesPath = .vale/styles

Packages = RedHat, AsciiDoc

MinAlertLevel = suggestion
```

Configure per-language behavior appropriately.

English content should use Red Hat English style rules.

Turkish content should not be incorrectly evaluated by English grammar rules.

---

# 70. VALE AND TURKISH

Separate:

```text
AsciiDoc structural rules
English Red Hat language/style rules
Turkish project terminology/style rules
```

Do not run English-specific prose rules against Turkish content when they create meaningless failures.

Implement a Turkish Vale style where useful for:

- forbidden inconsistent product names;
- terminology;
- whitespace;
- punctuation;
- heading conventions;
- UI label consistency.

---

# 71. DOCUMENTATION STYLE

English should follow public Red Hat documentation style conventions where practical:

```text
clear
concise
active voice
task oriented
minimal marketing language
sentence-style headings
imperative procedures
consistent terminology
```

Turkish should follow the same documentation discipline.

---

# 72. NO MARKETING LANGUAGE

Avoid documentation language such as:

```text
revolutionary
best-in-class
next-generation
amazing
powerful
incredible
seamless
effortless
```

unless quoting actual product marketing in a clearly distinct context.

Technical documentation must be factual.

---

# 73. CONFIGURATION REFERENCE

Generate or maintain a reliable reference based on actual backend configuration.

For each property, capture where possible:

```text
Property
Environment variable
Type
Default
Required
Description
Sensitive
Example
```

Never publish actual secrets.

---

# 74. ENVIRONMENT VARIABLE RULE

If Quarkus converts property names to environment variables, document the correct canonical mapping only after verifying behavior.

Do not guess transformation rules for unusual property names.

---

# 75. SECURITY DOCUMENTATION

Inspect the real authentication architecture.

Document:

```text
OIDC flow
identity provider requirements
redirect behavior
backend authorization
roles
permissions
token expectations
logout behavior
session/token handling
```

only when supported by code.

Do NOT turn the docs into Keycloak-specific documentation unless Keydra truly depends on Keycloak.

Prefer provider-neutral terminology.

---

# 76. DATABASE SUPPORT DOCUMENTATION

Discover real support for:

```text
Redis
Valkey
Redis-compatible services
standalone
replica
sentinel
cluster
TLS
authentication
ACL
database selection
```

Document only supported modes.

Create a compatibility matrix only from evidence.

---

# 77. BACKUP DOCUMENTATION

Inspect source code for:

```text
backup services
storage targets
RDB
AOF
export
snapshot
scheduler
retention
restore
```

Do not claim capabilities that do not exist.

---

# 78. MIGRATION DOCUMENTATION

Inspect:

```text
source connection
target connection
migration jobs
status
progress
validation
rollback
failure handling
```

Document actual behavior only.

---

# 79. OBSERVABILITY

Inspect:

```text
health
liveness
readiness
metrics
Micrometer
OpenTelemetry
tracing
logging
structured logging
traceparent
```

Document only enabled capabilities.

Include actual endpoint paths when discovered.

---

# 80. ERROR AND TROUBLESHOOTING DOCUMENTATION

Use actual application errors where possible.

Search:

```text
ExceptionMapper
error code enums
HTTP error responses
frontend error notifications
toast/alerts
validation messages
connection errors
```

Create troubleshooting content around real failure modes.

---

# 81. API REFERENCE

If OpenAPI exists:

- provide API introduction;
- authentication information;
- version information;
- generated endpoint reference;
- schemas;
- examples where safe.

Do not manually duplicate generated schema definitions.

---

# 82. CONTRIBUTOR EXPERIENCE

`docs/README.adoc` must explain:

```text
architecture
requirements
local setup
build
serve
lint
check
PDF
language workflow
translation workflow
new page workflow
new module workflow
new assembly workflow
new version workflow
search architecture
release process
```

---

# 83. CONTRIBUTING GUIDE

Create `docs/CONTRIBUTING.adoc`.

Explain how to create:

```text
concept module
procedure module
reference module
assembly
English translation pair
Turkish translation pair
navigation entry
redirect
release note
```

Include examples.

---

# 84. TRANSLATION WORKFLOW

Document a workflow such as:

```text
1. Change English source.
2. Update corresponding Turkish source.
3. Run localization validation.
4. Run Vale.
5. Run docs-check.
6. Preview both languages.
```

CI must make stale/missing translations visible.

---

# 85. OPTIONAL TRANSLATION STATUS METADATA

If practical, support translation metadata such as:

```text
source_revision
translation_revision
```

or a content hash mechanism.

Use it to detect when English content changes but Turkish content has not yet been updated.

Do not over-engineer if it substantially increases complexity.

---

# 86. MAKE COMMANDS

Provide:

```text
make docs
make docs-serve
make docs-lint
make docs-check
make docs-clean
make docs-pdf
make docs-en
make docs-tr
```

Optionally:

```text
make docs-source-inventory
```

---

# 87. COMMAND EXPECTATIONS

## make docs

Build all:

```text
English
Turkish
search indexes
static pages
assets
```

## make docs-en

Build English only.

## make docs-tr

Build Turkish only.

## make docs-serve

Serve local documentation.

## make docs-lint

Run relevant language/style linting.

## make docs-check

Run deterministic validation and complete production build.

## make docs-pdf

Generate English and Turkish PDFs.

---

# 88. DOCS CHECK PIPELINE

`make docs-check` should include:

```text
source inventory validation
AsciiDoc validation
include validation
xref validation
navigation validation
localization validation
terminology validation
Vale
internal link checking
renderer tests
search index tests
production static build
HTML smoke tests
```

Return non-zero on failure.

---

# 89. PDF

Generate separate PDFs:

```text
Keydra Documentation — English
Keydra Dokümantasyonu — Türkçe
```

Prefer Asciidoctor PDF or another maintained AsciiDoc-native solution.

The PDF should include:

```text
cover/title
product version
language
table of contents
article hierarchy
code blocks
tables
admonitions
page numbers
```

---

# 90. PRINT

Web pages should provide usable print output.

Hide unnecessary:

```text
navigation
search
language controls
version controls
interactive buttons
```

Preserve article content.

---

# 91. STATIC HOSTING

Final output must be deployable without an application backend.

Support:

```text
GitHub Pages
nginx/static HTTP server
container
OpenShift
```

---

# 92. CONTAINER

Create a production Containerfile.

Prefer Red Hat UBI-based runtime where practical.

Requirements:

```text
multi-stage build
non-root
OpenShift-compatible
no development dependencies in runtime
static immutable assets
minimal runtime image
```

Do not require root.

---

# 93. OPENSHIFT COMPATIBILITY

Do not rely on a fixed user ID.

Ensure static assets can be served under arbitrary OpenShift-assigned UID where necessary.

Do not write application state into immutable directories.

---

# 94. CI

Inspect the repository's existing CI.

If GitHub Actions is used, integrate documentation workflows into `.github/workflows/`.

At minimum:

```text
docs-check
docs-publish
```

Pull requests must validate documentation.

---

# 95. CI MATRIX

Where practical run documentation checks across:

```text
English
Turkish
```

or run one job that validates both.

Do not publish one language if the other production language fails.

---

# 96. GITHUB PAGES

If GitHub Pages is appropriate for the repository:

- configure build artifacts correctly;
- use minimum permissions;
- avoid publishing from untrusted PRs;
- preserve version/language paths.

Do not force GitHub Pages if the repository already has a different deployment model.

---

# 97. REDIRECTS

Implement redirect metadata.

Example:

```yaml
redirects:
  - from: /docs/en/latest/old-location/
    to: /docs/en/latest/new-location/
```

Support Turkish equivalents.

Validate redirect loops.

---

# 98. 404 PAGE

Create localized 404 pages.

English:

```text
Page not found
```

Turkish:

```text
Sayfa bulunamadı
```

Provide:

```text
search
documentation home
navigation
language
version
```

where sensible.

---

# 99. SEO / METADATA

For each generated page:

```text
<title>
description
lang attribute
canonical
Open Graph basics
version
```

HTML must correctly use:

```html
<html lang="en">
```

or:

```html
<html lang="tr">
```

according to the page.

---

# 100. SITEMAP

If a public base URL is configured, generate sitemap entries for both languages and all public versions.

Use alternate-language metadata where practical.

Do not fabricate the production hostname.

Make it configurable.

---

# 101. SEARCH INDEX SECURITY

Index only public documentation content.

Never index:

```text
.env
secrets
credentials
private source files
backend source
frontend source
internal generated analysis
```

unless explicitly intended for public docs.

---

# 102. DOCUMENTATION BUILD SECURITY

Do not allow arbitrary shell execution from AsciiDoc.

Restrict include paths.

Avoid uncontrolled remote includes.

Bundle runtime assets locally.

Avoid `eval`.

---

# 103. PERFORMANCE

The documentation site should be lightweight.

Do not ship the full Keydra application.

Avoid unnecessary hydration.

Generate article HTML at build time.

Keep search efficient.

Use optimized static assets.

---

# 104. SOURCE MAPS

Do not expose sensitive development paths in production source maps.

If production JS source maps are enabled, evaluate whether they are appropriate.

---

# 105. TESTING

Add automated tests for:

```text
AsciiDoc conversion
language routing
version routing
URL generation
breadcrumbs
navigation
language switching
version switching
heading IDs
TOC extraction
search indexing
localization parity
broken links
missing includes
404 generation
```

---

# 106. BROWSER TESTING

If Playwright already exists in the repository, reuse it.

Otherwise add browser-level testing only when justified.

Representative flows:

```text
Open English home
Open Turkish home
Navigate to English article
Switch to Turkish
Switch version
Use left navigation
Use page TOC
Search
Copy code
Open mobile menu
```

---

# 107. VISUAL VALIDATION

Actually render the documentation website.

Do not assume compiled React means correct UI.

Inspect at minimum:

```text
English landing page
Turkish landing page
English procedure page
Turkish procedure page
configuration reference
API reference entry page
404
mobile page
dark theme if implemented
```

Fix obvious UI defects.

---

# 108. BROWSER CONSOLE

Check for:

```text
React errors
hydration errors
missing assets
404 resources
duplicate keys
runtime exceptions
CSS loading failures
```

Do not finish with browser console errors.

---

# 109. BUILD WARNINGS

Review significant build warnings.

Do not ignore unresolved AsciiDoc references.

Do not ignore missing PatternFly CSS.

Do not ignore missing locales.

---

# 110. SOURCE CODE MODIFICATION BOUNDARY

Do not unnecessarily refactor the Keydra backend or frontend.

The primary goal is documentation.

Application changes are acceptable only when clearly required to:

```text
expose generated OpenAPI
share existing branding
support documentation deployment
fix clearly incorrect documentation integration
```

Avoid unrelated code cleanup.

---

# 111. PRESERVE EXISTING WORK

Before modifying files:

```bash
git status
```

Inspect uncommitted changes.

Do not overwrite unrelated user work.

Do not reset the repository.

Do not run:

```bash
git reset --hard
git clean -fd
```

unless explicitly instructed by the repository owner.

Never discard existing local changes.

---

# 112. DO NOT COMMIT AUTOMATICALLY

Do not create Git commits unless explicitly asked.

You may prepare all changes and provide a summary.

---

# 113. EXISTING DOCS

If `docs/` already exists:

- inspect it;
- preserve useful content;
- migrate carefully;
- do not blindly delete it.

If incompatible legacy documentation exists, explain/migrate rather than silently destroying it.

---

# 114. EXISTING README

Do not replace the project's root README with documentation platform details.

Add only small appropriate references to the docs platform if necessary.

Keep detailed contributor instructions inside `docs/`.

---

# 115. VERSION CONTROL IGNORE RULES

Generated files such as:

```text
dist/
cache/
temporary source inventory
build artifacts
```

should be ignored where appropriate.

Do not ignore source content.

---

# 116. SOURCE-DRIVEN INITIAL DOCUMENTATION

Create actual documentation based on the discovered source.

At minimum produce meaningful content for the implemented subset of:

```text
What is Keydra?
Architecture
Getting started
Installation
Connecting Redis
Connecting Valkey
Managing database connections
Backup and restore
Migration
OIDC
Security
Configuration
Environment variables
Observability
API
Troubleshooting
Release notes
```

If some feature does not exist, omit or clearly mark it.

---

# 117. NO PLACEHOLDER SPAM

Do not create pages that only contain:

```text
TODO
Coming soon
Lorem ipsum
Placeholder
```

A small deliberate future placeholder is acceptable only if clearly justified.

The initial site must contain enough real content to evaluate the whole architecture.

---

# 118. DOCUMENTING FRONTEND PROCEDURES

For every UI procedure:

1. inspect the actual route;
2. inspect the actual component;
3. inspect button labels;
4. inspect field labels;
5. inspect required fields;
6. inspect validation;
7. inspect confirmation dialogs;
8. inspect success state;
9. inspect failure state.

Then write the procedure.

Do not infer workflows from filenames alone.

---

# 119. DOCUMENTING BACKEND CONFIGURATION

For every configuration reference:

1. find source/config definition;
2. determine data type;
3. determine default;
4. determine whether required;
5. determine environment variable form;
6. determine security sensitivity;
7. determine applicable profile;
8. write description.

Do not publish sample values that could be mistaken for credentials.

---

# 120. DOCUMENTING SECURITY

Never expose:

```text
client secrets
passwords
tokens
private endpoints
developer credentials
personal information
```

found in local files.

Use placeholders:

```text
<client-secret>
<password>
<redis-host>
```

---

# 121. DOCUMENTING DATABASE CREDENTIALS

Examples must encourage secure practices.

Avoid:

```bash
--password mypassword
```

where better secret mechanisms exist.

Do not invent a secret management feature Keydra does not support.

---

# 122. UI LANGUAGE VS DOCUMENTATION LANGUAGE

Keep three concepts separate:

```text
Documentation language
Application UI language
Technical identifier language
```

Example:

Turkish docs + English Keydra UI + Java property:

```text
*Settings* sayfasında `keydra.example.timeout` yapılandırma değerini ayarlayın.
```

Do not translate technical identifiers.

---

# 123. FILE NAMING

Prefer language-neutral source filenames where practical.

Good:

```text
proc_connecting-redis.adoc
```

for both:

```text
en/modules/proc_connecting-redis.adoc
tr/modules/proc_connecting-redis.adoc
```

This simplifies translation pairing.

---

# 124. STABLE PAGE IDENTIFIERS

Use shared language-neutral page IDs.

Example:

```text
connecting-redis
```

The displayed title differs by language.

This allows language switching to map equivalent pages.

---

# 125. NAVIGATION IDENTIFIERS

Navigation records should have stable IDs independent of display text.

Example concept:

```yaml
id: databases
label:
  en: Databases
  tr: Veritabanları
```

or maintain locale-specific nav files with shared IDs.

Choose the cleaner implementation.

---

# 126. LANGUAGE SWITCH MAPPING

Do not infer language counterpart solely from translated title strings.

Use stable page IDs.

Example:

```text
pageId: connecting-redis
```

English title:

```text
Connecting a Redis database
```

Turkish title:

```text
Redis veritabanı bağlantısı oluşturma
```

---

# 127. SEARCH NORMALIZATION

For Turkish search, handle Turkish characters correctly:

```text
ç
ğ
ı
İ
ö
ş
ü
```

Do not corrupt Unicode normalization.

Search should correctly handle:

```text
yapılandırma
kimlik doğrulama
veritabanı
```

---

# 128. CHARACTER ENCODING

Use UTF-8 everywhere.

Ensure:

```text
AsciiDoc
YAML
JSON
HTML
search indexes
PDF
```

support Turkish characters correctly.

---

# 129. TURKISH CASE CONVERSION

Be careful with:

```text
I / ı
İ / i
```

Do not rely on naive English locale case conversion for Turkish search normalization.

Use locale-aware handling where needed.

---

# 130. RED HAT ECOSYSTEM BUILD IMAGE

When choosing builder/runtime images, prefer Red Hat ecosystem images where technically appropriate.

For example, evaluate:

```text
UBI
UBI minimal
UBI micro
```

Do not force them if they prevent a correct build.

---

# 131. DEPENDENCY STRATEGY

Before adding a dependency:

- confirm existing equivalent does not exist;
- verify maintenance status;
- avoid unnecessary package duplication;
- prefer upstream-supported tooling;
- pin reproducibly.

---

# 132. PACKAGE MANAGER

Reuse the frontend's package manager whenever practical.

If the project uses `pnpm`, do not introduce Yarn for docs.

If it uses npm, do not introduce pnpm without a clear reason.

---

# 133. LOCKFILES

Maintain reproducible lockfiles.

Do not manually edit lockfile contents.

---

# 134. NODE VERSION

Determine from:

```text
.nvmrc
.node-version
package.json engines
CI
Containerfiles
```

Align docs build with the repository.

---

# 135. JAVA VERSION

If any docs tooling uses JVM-based Asciidoctor, align with project-supported Java where practical.

Avoid adding a second unnecessary Java toolchain.

---

# 136. MAKEFILE

The docs Makefile should be a convenient frontend to underlying reproducible commands.

Do not hide important errors.

Use `.PHONY` correctly.

---

# 137. LOCAL PREVIEW

`make docs-serve` should print useful local URLs such as:

```text
English:
http://localhost:<port>/docs/en/latest/

Türkçe:
http://localhost:<port>/docs/tr/latest/
```

Do not hardcode a conflicting port without checking project conventions.

---

# 138. LIVE RELOAD

Implement live reload if reasonably straightforward.

It should watch:

```text
AsciiDoc
navigation
renderer
styles
locales
```

Do not make live reload a requirement for production build correctness.

---

# 139. BASE PATH

Static output must work under a configurable base path.

For example both:

```text
/
```

and:

```text
/keydra/
```

should be technically possible.

Do not hardcode absolute `/assets/...` paths if this breaks GitHub Pages subpaths.

---

# 140. ASSET FINGERPRINTING

Fingerprint generated JS/CSS assets for production caching where practical.

Do not fingerprint article URLs.

---

# 141. CACHE HEADERS

If container server config is included:

- fingerprinted assets can have long cache;
- HTML should use conservative cache rules.

---

# 142. SITE CONFIGURATION

Create a central site config that can define:

```text
product name
repository URL
base URL
default language
languages
versions
latest version
logo
favicon
source edit URL
```

Avoid duplicated constants.

---

# 143. EDIT THIS PAGE

Generate links to the exact source `.adoc` file.

English pages should link to English source.

Turkish pages should link to Turkish source.

Use repository branch/version mapping.

---

# 144. VIEW SOURCE

Provide a source link where appropriate.

Do not expose local filesystem paths such as:

```text
/home/mehmetozturk/...
```

in production output.

---

# 145. LOCAL PATH PRIVACY

The source root:

```text
/home/mehmetozturk/Projects/Personal/Firat/keydra/
```

is for local implementation only.

It MUST NOT appear in generated public documentation pages, HTML metadata, JavaScript, search index, or PDFs.

---

# 146. GIT HISTORY

Use Git metadata where useful for:

```text
version
last update
release tags
```

Do not display "last updated" if it is derived inaccurately from the entire repository instead of the page.

---

# 147. RELEASE NOTES

Use actual Git tags/releases if available.

Do not invent historical release notes.

If no release notes exist yet, create the release-note architecture and a truthful initial/current entry based on repository evidence.

---

# 148. ARCHITECTURE DOCUMENTATION

Create an architecture overview based on actual code.

Include an SVG diagram if useful.

Potentially show:

```text
Browser
  ↓
PatternFly frontend
  ↓
Quarkus REST API
  ↓
Keydra services
  ↓
Redis / Valkey targets
```

but only if this matches the implementation.

---

# 149. ARCHITECTURE DIAGRAM SOURCE

If you generate SVG diagrams, keep editable source if generated from a diagram DSL.

Avoid proprietary editor-only files.

---

# 150. MULTI-PAGE HTML

Primary web output must be multi-page HTML.

Pages should have clean URLs.

---

# 151. SINGLE-PAGE GUIDE OUTPUT

Where appropriate, support a single-page build of selected assemblies.

This can be used for:

```text
offline reading
printing
guide-level distribution
```

Do not replace normal multi-page browsing.

---

# 152. PDF BY LANGUAGE AND VERSION

The architecture must support:

```text
Keydra-{version}-Documentation-en.pdf
Keydra-{version}-Documentation-tr.pdf
```

Use sensible sanitized filenames.

---

# 153. SITE FOOTER

Keep footer simple.

Potential content:

```text
Keydra
Documentation version
GitHub
License
```

Do not imitate Red Hat corporate footer branding.

---

# 154. LICENSE

Inspect the project's actual license.

Do not assume Apache 2.0.

Documentation footer/contributor guidance should match the actual project license where appropriate.

---

# 155. EXTERNAL REFERENCES

When documentation must link to external sources, prefer authoritative sources:

```text
Redis official docs
Valkey official docs
Quarkus official docs
PatternFly official docs
OpenID Connect specification
OpenTelemetry official docs
```

Avoid random blog references.

---

# 156. RED HAT REFERENCE POLICY

When checking Red Hat documentation practices, use only public resources.

Do not attempt to reproduce proprietary internal Red Hat publishing systems.

The target is public methodology compatibility, not proprietary infrastructure cloning.

---

# 157. PANTHEON

Do not attempt to recreate Red Hat Pantheon.

Instead build an open-source static equivalent preserving:

```text
AsciiDoc
modular content
style validation
versioning
multi-format publishing
structured information architecture
```

---

# 158. ANTORA

Do not use Antora Default UI.

If Antora is considered for low-level content organization, first verify it provides real architectural value.

The presentation must remain custom PatternFly 6.

Do not add Antora simply because it was mentioned historically.

A clean custom Asciidoctor build is acceptable and may be preferable.

---

# 159. CSS FRAMEWORK BAN

Do not add:

```text
Tailwind
Bootstrap
Bulma
Material CSS
```

PatternFly is the design system.

---

# 160. ICONS

Use PatternFly icons or the existing Keydra icon system.

Do not introduce Font Awesome solely for documentation if PatternFly already covers the requirement.

---

# 161. ICON ACCESSIBILITY

Decorative icons must be hidden appropriately from assistive technologies.

Meaningful icon-only buttons require labels.

---

# 162. COPY BUTTON

Code copy button labels:

English:

```text
Copy
Copied
```

Turkish:

```text
Kopyala
Kopyalandı
```

Copy exact code text.

---

# 163. PROCEDURE NUMBERING

Use AsciiDoc ordered lists.

Do not hardcode numeric prefixes in text.

---

# 164. SCREENSHOTS

Do not rely heavily on screenshots.

Screenshots age rapidly.

Use them only where visual orientation is genuinely useful.

Prefer procedures based on accurate UI labels.

---

# 165. IMAGE LOCALIZATION

If screenshots contain language-specific UI, keep locale-specific image directories or metadata.

Do not show English screenshot as though it were Turkish UI without explanation.

---

# 166. IMAGE ALT TEXT

Provide meaningful localized alt text.

---

# 167. DOCUMENT STATUS

Support:

```text
draft
published
deprecated
```

at minimum where useful.

Draft content should not enter production builds by default.

---

# 168. DEPRECATION

Deprecated content should display localized notices.

Do not delete documentation from historical versions merely because a feature is removed in latest.

---

# 169. FEATURE SUPPORT MATRIX

If the code supports meaningful differences between Redis and Valkey, create an actual support matrix.

Do not manufacture entries.

---

# 170. COMMAND SAFETY

When running build/test commands, do not execute destructive deployment actions.

Do not:

```text
deploy to production
push Docker images
publish npm packages
push Git commits
create Git tags
release GitHub versions
```

unless explicitly asked.

Local builds and tests are expected.

---

# 171. NETWORK DEPENDENCY

Prefer builds that remain reproducible after dependencies are installed.

Do not require online API calls during every documentation page render.

---

# 172. BUILD OUTPUT

Place final generated site under something predictable, for example:

```text
docs/dist/
```

or an existing project-standard build directory.

Document it.

---

# 173. EXAMPLE BUILD OUTPUT

Conceptually:

```text
dist/
└── docs/
    ├── en/
    │   ├── latest/
    │   └── <versions>/
    └── tr/
        ├── latest/
        └── <versions>/
```

Adapt to the configured base path.

---

# 174. HTML VALIDATION

Where practical validate generated HTML for structural errors.

At minimum ensure no malformed document output from Asciidoctor transformations.

---

# 175. NO RAW ASCIIDOC LEAKAGE

Generated pages must not visibly contain unresolved syntax such as:

```text
include::
xref:
ifdef::
:attribute:
[source,bash]
```

unless intentionally shown as documentation examples.

---

# 176. SEARCH INDEX VALIDATION

Tests must verify:

- English page appears in English index;
- Turkish page appears in Turkish index;
- Turkish characters survive;
- drafts are not indexed;
- wrong version is not leaked into current index.

---

# 177. LOCALIZATION PARITY TEST

Create automated parity checks based on stable page/module identifiers.

The system should report clear messages such as:

```text
Missing Turkish translation:
content/en/modules/proc_connecting-redis.adoc
Expected:
content/tr/modules/proc_connecting-redis.adoc
```

---

# 178. NAVIGATION PARITY

English and Turkish navigation should represent equivalent documentation hierarchy.

Labels differ.

Stable page identity should remain equivalent.

---

# 179. SOURCE CODE CHANGE DETECTION

Where practical, structure the system so future automation can detect documentation impact.

For example changes under:

```text
REST resources
configuration mappings
frontend routes
UI labels
```

could later trigger documentation review.

Do not build a giant complex analyzer unless it provides immediate value.

---

# 180. FINAL IMPLEMENTATION WORKFLOW

Follow this order.

## Phase 1 — Inspect

Inspect:

```text
repository
Git state
backend
frontend
configuration
routes
PatternFly
branding
CI
release model
existing docs
```

## Phase 2 — Inventory

Build source-derived inventory.

## Phase 3 — Architecture

Choose exact tooling.

Document why.

## Phase 4 — Scaffold

Create docs architecture.

## Phase 5 — Renderer

Build PatternFly documentation shell.

## Phase 6 — Content

Create English real documentation.

## Phase 7 — Localization

Create Turkish equivalent documentation.

## Phase 8 — Search/versioning

Implement.

## Phase 9 — Validation

Implement Vale, links, localization, navigation.

## Phase 10 — PDF

Implement both languages.

## Phase 11 — CI/container

Implement production workflow.

## Phase 12 — Test

Run all checks.

## Phase 13 — Visual verification

Open representative pages.

## Phase 14 — Fix

Resolve errors.

## Phase 15 — Final report

Summarize implementation.

---

# 181. IMPORTANT — DO NOT STOP TO ASK BASIC QUESTIONS

You have access to the Keydra source repository.

Resolve implementation questions by inspecting the repository first.

Do not ask questions such as:

```text
What is the backend directory?
What package manager do you use?
What PatternFly version do you use?
What routes exist?
Does the project use OpenAPI?
```

Discover those from source.

Only report genuine blockers that cannot be resolved from source code or reasonable architecture decisions.

---

# 182. DO NOT CREATE FAKE FACTS TO AVOID QUESTIONS

If something is genuinely unknowable:

- make it configurable;
- document the assumption;
- avoid fabricating a product fact.

---

# 183. BUILD EVERYTHING YOU CAN

Do not stop because one optional component is difficult.

For example, if advanced API rendering is blocked:

- finish the documentation site;
- finish languages;
- finish navigation;
- finish search;
- finish linting;
- finish build;
- create a clean API integration extension point.

A partially implemented optional feature must not block the entire task.

---

# 184. FINAL QUALITY GATE

The work is not complete until the following succeeds:

```bash
cd /home/mehmetozturk/Projects/Personal/Firat/keydra/

# appropriate dependency installation

make docs-check
make docs
make docs-pdf
```

If commands differ because of repository conventions, provide equivalent root-level or docs-level commands.

---

# 185. REQUIRED MANUAL/PROGRAMMATIC VERIFICATION

Verify at minimum:

```text
English landing page
Turkish landing page
language switching
English article
Turkish counterpart
left navigation
breadcrumbs
On this page
search
version selector
code copy
mobile navigation
404
PDF generation
internal links
```

---

# 186. REPRESENTATIVE END-TO-END TEST

Choose a real workflow discovered from Keydra source, such as connecting a Redis or Valkey database.

Verify:

```text
actual frontend workflow
English procedure
Turkish procedure
navigation entry
search result
language switch
code/config snippets
source link
PDF appearance
```

---

# 187. FINAL REPORT FORMAT

When implementation is complete, provide a concise but detailed final report in **Turkish**.

Include:

## Repository analysis

```text
Detected backend
Detected frontend
Quarkus version
PatternFly version
Package manager
Build tooling
OIDC/security findings
Redis/Valkey findings
Important features
```

## Documentation architecture

Explain chosen implementation.

## Created files

Summarize important directories/files.

## English/Turkish support

Explain how localization works.

## Source-derived documentation

State which documentation was derived directly from backend/frontend.

## Validation

List commands executed and their results.

## Build

Provide output paths.

## Remaining limitations

List only real remaining limitations.

Do not claim success for commands that were not actually run.

---

# 188. FINAL RULE

The finished result must not merely look like another modern documentation template.

It must feel architecturally consistent with the rest of Keydra:

```text
Backend:       Quarkus
Frontend:      PatternFly 6
Authentication: OIDC
Documentation: AsciiDoc + modular documentation + PatternFly 6
Quality:       Vale + source validation
Languages:     English + Turkish
Publishing:    static/versioned/multi-format
Container:     Red Hat ecosystem oriented
```

The entire documentation platform must preserve the same design philosophy:

```text
enterprise
open-source
structured
maintainable
accessible
versioned
source-controlled
Red Hat ecosystem aligned
```

---

# 189. ABSOLUTE PRIORITIES

When two choices conflict, prioritize in this order:

```text
1. Accuracy against actual Keydra source code
2. Build correctness
3. Maintainability
4. Red Hat public documentation methodology alignment
5. PatternFly 6 consistency
6. English/Turkish parity
7. Accessibility
8. Static deployment
9. Performance
10. Visual polish
```

Never sacrifice factual accuracy merely to make the documentation look complete.

---

# 190. START NOW

Begin by inspecting:

```text
/home/mehmetozturk/Projects/Personal/Firat/keydra/
```

First run appropriate non-destructive repository discovery commands.

Inspect `git status`.

Determine the real backend and frontend structure.

Inspect the actual Quarkus and PatternFly implementations.

Build the source-derived product inventory.

Then implement the documentation system described above.

Do not stop after analysis.

Continue through implementation, testing, build verification, localization validation, and final reporting.