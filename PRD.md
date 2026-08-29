============================================================
PRODUCT REQUIREMENTS DOCUMENT (PRD)
============================================================

PROJECT NAME:
SiBangku

PROJECT TYPE:
Dedicated-Tenant White-Label Restaurant Reservation SaaS

VERSION:
3.0.0

DOCUMENT STATUS:
MASTER IMPLEMENTATION SPECIFICATION

PRIMARY OBJECTIVE:
Build a production-ready dedicated-tenant restaurant reservation
and food pre-order platform consisting of:

1. Web Application
2. Android APK
3. Platform Control Plane
4. Dedicated Tenant Application
5. Dedicated Tenant Database
6. Automated Tenant Provisioning
7. Trial Management
8. Subscription Management
9. Restaurant Administration
10. Customer Reservation
11. Visual Table Management
12. Menu Management
13. Food Pre-Order
14. Payment Integration Architecture
15. Automated Web + APK Generation
16. Docker-based Infrastructure
17. Security and Tenant Isolation
18. External Expired Experience

============================================================
0. MASTER AGENT INSTRUCTIONS
============================================================

THIS DOCUMENT IS THE SOURCE OF TRUTH.

The coding agent MUST follow this PRD.

The agent MUST NOT invent unspecified business requirements.

The agent MUST NOT silently remove required functionality.

The agent MUST NOT silently change architectural decisions.

The agent MUST NOT declare the project complete merely because:

- the application starts
- the frontend renders
- the backend compiles
- some API endpoints exist
- unit tests pass
- mock data is displayed

A feature is complete only when its complete execution path works.

Required execution path:

UI
↓
API
↓
Business Logic
↓
Database
↓
External Service when applicable
↓
Response
↓
UI

============================================================
0.1 ANTI-HALLUCINATION RULE
============================================================

When the PRD does not define a specific implementation detail:

1. Do not invent a business requirement.
2. Choose a standard production-grade implementation.
3. Keep the implementation modular.
4. Document the decision.
5. Do not change existing business rules.
6. Do not introduce unrelated features.

If ambiguity affects security, tenant isolation, payment,
subscription, authentication, or data integrity:

STOP AND ANALYZE THE ARCHITECTURE BEFORE IMPLEMENTATION.

============================================================
0.2 NO FAKE COMPLETION
============================================================

The agent MUST NOT use:

fake success

fake payment

fake reservation

fake subscription

fake authentication

fake database

fake tenant

fake API

placeholder response

hardcoded production data

dummy production implementation

to claim a feature is complete.

Mocks are allowed only when explicitly isolated for:

development

testing

local development

integration testing

============================================================
0.3 CODEBASE MUST BE AI-READABLE
============================================================

The repository MUST be understandable by:

1. Human developers
2. New developers
3. Future maintainers
4. Other AI coding agents

Another developer or AI agent must be able to:

- understand architecture
- run the project
- locate modules
- locate business rules
- modify features
- run tests
- debug errors
- build Web
- build APK
- run Docker
- understand tenant isolation

without relying on undocumented knowledge.

============================================================
1. PRODUCT OVERVIEW
============================================================

SiBangku is a White-Label SaaS platform for restaurants.

Each restaurant becomes an independent tenant.

Each tenant receives:

- dedicated tenant identity
- dedicated tenant database
- dedicated restaurant configuration
- dedicated branding
- dedicated admin account
- dedicated restaurant data
- dedicated Web configuration
- dedicated Android APK configuration
- dedicated subscription/trial lifecycle

The platform owner manages all tenants through a centralized
Control Plane.

============================================================
2. BUSINESS MODEL
============================================================

SiBangku uses:

TRIAL
+
SUBSCRIPTION

Lifecycle:

PROVISIONED
↓
TRIAL
↓
ACTIVE SUBSCRIPTION
↓
RENEWAL
↓
ACTIVE

Possible interruption:

TRIAL
↓
TRIAL_EXPIRED

ACTIVE
↓
PAST_DUE
↓
GRACE_PERIOD
↓
SUSPENDED
↓
SUBSCRIPTION_EXPIRED

============================================================
3. CRITICAL TRIAL DECISION
============================================================

SiBangku DOES NOT require a Trial Key.

Do NOT implement a trial activation code as the primary
trial mechanism.

Do NOT distribute a shared trial key.

Do NOT use:

TRIAL-XXXX-XXXX

for normal client onboarding.

Trial is controlled through:

tenant

trialStart

trialEnd

subscriptionStatus

server-side lifecycle management.

============================================================
4. TRIAL ACCOUNT MODEL
============================================================

Every tenant receives a UNIQUE administrator account.

Never use:

admin/admin

for real clients.

Example:

Tenant A:

admin@restaurant-a.com

Tenant B:

admin@restaurant-b.com

Tenant C:

admin@restaurant-c.com

Each has a unique temporary password.

============================================================
5. DEVELOPMENT ACCOUNT
============================================================

For LOCAL DEVELOPMENT ONLY:

username:

admin

password:

admin

This account MUST:

- only exist in development
- never exist in production
- never be generated for clients
- never be included in production seed
- never be used as a shared tenant account

CI/CD should detect and reject production use of:

admin/admin

============================================================
6. TRIAL DURATION
============================================================

Default:

60 DAYS

The duration MUST be configurable.

Supported examples:

7

14

30

60

90

CUSTOM

Trial duration belongs to platform configuration.

============================================================
7. TRIAL START
============================================================

Default behavior:

Trial begins when tenant provisioning completes successfully.

Example:

Provisioned:

2026-08-29

Trial:

2026-08-29
→
2026-10-27

Trial MUST NOT reset because:

- user logs out
- browser is cleared
- application is reinstalled
- APK is reinstalled
- localStorage is deleted
- device time is changed
- customer changes device

Trial state is server-side.

============================================================
8. TRIAL EXPIRATION
============================================================

When:

current server time >= trialEnd

tenant becomes:

TRIAL_EXPIRED

Expiration MUST be enforced server-side.

============================================================
9. TRIAL WARNING
============================================================

System may notify:

7 days remaining

3 days remaining

1 day remaining

Trial expired

Notification thresholds must be configurable.

============================================================
10. EXPIRED EXPERIENCE
============================================================

When trial or subscription expires, normal customer operations
are blocked.

Customer is redirected to:

EXPIRED EXPERIENCE

Example:

------------------------------------------------------------

TRIAL PERIOD ENDED

Terima kasih telah menggunakan SiBangku.

Masa uji coba sistem restoran ini telah berakhir.

Untuk melanjutkan penggunaan layanan,
silakan hubungi pengelola.

[ WHATSAPP ]

[ INSTAGRAM ]

[ TIKTOK ]

------------------------------------------------------------

The expired page must be professional.

============================================================
11. EXPIRED EXPERIENCE DESIGN
============================================================

The expired experience should contain:

large headline

short explanation

restaurant/platform message

WhatsApp button

Instagram button

TikTok button

optional phone button

optional email button

optional contact button

animated downward arrow

subtle background animation

professional typography

responsive design

mobile support

desktop support

============================================================
12. EXPIRED EXPERIENCE ANIMATION
============================================================

The expired experience may use:

electric glow

electric line effect

neon-like text energy

subtle particle animation

animated border

animated downward arrow

lightning/electric text effect

The animation MUST remain:

professional

smooth

lightweight

accessible

not distracting

Do not use excessive animation that harms performance.

============================================================
13. EXPIRED HOSTING
============================================================

Expired Experience MUST be independently deployable.

Example:

Restaurant Application:

distroavenue.sibangku.app

Expired Experience:

expired.sibangku.app

or:

expired-distroavenue.sibangku.app

The expired experience MUST NOT depend on the tenant frontend
being alive.

============================================================
14. EXPIRATION REDIRECTION
============================================================

Architecture:

Customer
↓
Tenant Application
↓
Server-side Tenant Status
↓
ACTIVE?
├── YES → Application
└── NO → Expired Experience

Prefer server-side middleware/API enforcement.

Frontend-only redirect is insufficient.

============================================================
15. TENANT MODEL
============================================================

Every tenant must have:

tenantId

tenantCode

tenantName

restaurantName

status

subscriptionStatus

trialStart

trialEnd

subscriptionStart

subscriptionEnd

databaseIdentifier

storageIdentifier

webIdentifier

apkIdentifier

createdAt

updatedAt

============================================================
16. TENANT STATUS
============================================================

Allowed states:

PROVISIONING

TRIAL

ACTIVE

PAST_DUE

SUSPENDED

TRIAL_EXPIRED

SUBSCRIPTION_EXPIRED

CANCELLED

ARCHIVED

============================================================
17. TENANT ARCHITECTURE
============================================================

SiBangku uses:

CONTROL PLANE

+

TENANT PLANES

Architecture:

                    PLATFORM OWNER
                           |
                           ↓
                    CONTROL PLANE
                           |
          ┌────────────────┼────────────────┐
          ↓                ↓                ↓
      TENANT A          TENANT B          TENANT C
          |                |                |
          ↓                ↓                ↓
        WEB A            WEB B            WEB C
          |                |                |
          ↓                ↓                ↓
        APK A            APK B            APK C
          |                |                |
          ↓                ↓                ↓
        DB A             DB B             DB C

============================================================
18. CONTROL PLANE
============================================================

Control Plane manages:

tenants

tenant metadata

provisioning

trial

subscription

billing metadata

deployment

APK metadata

domain metadata

database metadata

audit logs

platform configuration

tenant health

============================================================
19. TENANT PLANE
============================================================

Tenant application manages:

restaurant

staff

customers

tables

table layout

menu

categories

reservations

orders

payments

branding

reports

notifications

restaurant settings

============================================================
20. DATABASE ARCHITECTURE
============================================================

CRITICAL:

DATABASE PER TENANT.

Tenant A:

Database A

Tenant B:

Database B

Tenant C:

Database C

Operational tenant data MUST NOT be stored in a shared tenant
database.

============================================================
21. CONTROL DATABASE
============================================================

Control database stores:

tenant metadata

subscription

trial

provisioning state

deployment metadata

database reference

audit logs

platform users

It MUST NOT become a storage location for all tenant operational
data.

============================================================
22. TENANT DATABASE
============================================================

Each tenant database may contain:

users

customers

tables

table_layout

menus

menu_categories

reservations

orders

payments

branding

restaurant_settings

notifications

reports

audit records relevant to tenant

============================================================
23. DATABASE ISOLATION
============================================================

Tenant A MUST NOT access:

Tenant B database

Tenant B customers

Tenant B reservations

Tenant B orders

Tenant B menus

Tenant B branding

Tenant B staff

============================================================
24. TENANT IDENTITY
============================================================

Every tenant must have globally unique ID.

Example:

TEN-2026-8F4K2M

Do not use restaurant name alone as primary identity.

============================================================
25. TENANT CODE
============================================================

Human-readable code.

Example:

DISTRO-AVENUE

or:

RESTO-BOGOR-001

Must be unique.

============================================================
26. PLATFORM SUPER ADMIN
============================================================

Role:

SUPER_ADMIN

Capabilities:

create tenant

provision tenant

view tenants

inspect tenant

activate tenant

suspend tenant

expire tenant

extend trial

change trial

activate subscription

manage subscription

view deployment

generate Web

generate APK

reset tenant admin

backup tenant

restore tenant

archive tenant

audit activity

============================================================
27. TENANT ADMIN
============================================================

Each restaurant gets its own:

TENANT_ADMIN

Capabilities:

restaurant settings

branding

images

menu

categories

tables

table layout

reservation rules

orders

customers

payments

staff

reports

account

============================================================
28. TENANT STAFF
============================================================

Optional roles:

MANAGER

CASHIER

KITCHEN

WAITER

HOST

Role-based authorization MUST be implemented.

============================================================
29. CUSTOMER
============================================================

Customer can:

view restaurant

view menu

view availability

select date

select time

select table

reserve

pre-order

pay

view reservation

cancel according to policy

receive confirmation

============================================================
30. WHITE LABEL
============================================================

Tenant can configure:

restaurant name

logo

favicon

primary color

secondary color

font

hero image

gallery

menu images

promotion images

address

phone

WhatsApp

email

Instagram

TikTok

Facebook

Google Maps

opening hours

restaurant description

reservation policy

terms

============================================================
31. IMAGE MANAGEMENT
============================================================

Tenant Admin can manage ALL tenant images.

Image categories:

logo

favicon

hero

gallery

menu

promotion

banner

table

other restaurant media

Actions:

upload

replace

delete

activate

deactivate

reorder

============================================================
32. IMAGE STORAGE
============================================================

Storage namespace:

tenants/{tenantId}/

Example:

tenants/TEN-2026-8F4K2M/logo.png

Tenant storage MUST be isolated.

============================================================
33. IMAGE SECURITY
============================================================

Validate:

MIME

extension

size

filename

content type

storage path

Prevent:

path traversal

malicious uploads

unsafe file types

tenant path manipulation

============================================================
34. RESTAURANT PROFILE
============================================================

Fields:

restaurantName

description

address

phone

WhatsApp

email

Instagram

TikTok

Facebook

Google Maps

openingHours

holidaySchedule

reservationRules

============================================================
35. TABLE MANAGEMENT
============================================================

Admin can:

create table

edit table

delete table

duplicate table

move table

resize table

rotate table

change capacity

change shape

change section

change status

============================================================
36. TABLE ENTITY
============================================================

Fields:

id

tableNumber

name

capacity

shape

positionX

positionY

width

height

rotation

section

status

createdAt

updatedAt

============================================================
37. TABLE STATUS
============================================================

AVAILABLE

RESERVED

OCCUPIED

BLOCKED

MAINTENANCE

============================================================
38. TABLE SHAPE
============================================================

ROUND

SQUARE

RECTANGLE

BOOTH

BAR

CUSTOM

============================================================
39. VISUAL TABLE LAYOUT
============================================================

Customer sees an interactive floor plan.

Example:

        TABLE 01

     ┌───────────┐
     │           │
     └───────────┘

         TABLE 02

Table layout is tenant-specific.

============================================================
40. TABLE BUILDER
============================================================

Tenant Admin can:

drag

drop

move

resize

rotate

rename

duplicate

delete

change capacity

change shape

group by section

save

preview

============================================================
41. TABLE AVAILABILITY
============================================================

Availability depends on:

date

time

duration

existing reservation

capacity

table status

reservation policy

============================================================
42. RESERVATION MODES
============================================================

MODE A:

RESERVATION ONLY

Flow:

date

↓

time

↓

guest count

↓

table

↓

confirmation

MODE B:

RESERVATION + PRE-ORDER

Flow:

date

↓

time

↓

guest count

↓

table

↓

menu

↓

quantity

↓

checkout

↓

payment

↓

confirmation

============================================================
43. RESERVATION ENTITY
============================================================

Fields:

id

reservationNumber

customerId

tableId

date

startTime

endTime

guestCount

status

paymentStatus

preOrderEnabled

totalAmount

notes

createdAt

updatedAt

============================================================
44. RESERVATION STATUS
============================================================

PENDING

CONFIRMED

ARRIVED

SEATED

COMPLETED

CANCELLED

NO_SHOW

EXPIRED

============================================================
45. RESERVATION CONFLICT
============================================================

Backend MUST prevent:

double booking

overlapping reservation

same table same slot

race conditions

duplicate booking requests

Client-side availability is NOT authoritative.

============================================================
46. CONCURRENCY CONTROL
============================================================

Reservation creation should use appropriate:

database transactions

locking

unique constraints

optimistic/pessimistic concurrency where appropriate

idempotency

Two simultaneous requests for the same table and slot:

Only one may succeed.

============================================================
47. TIME SLOT
============================================================

Tenant config:

openingTime

closingTime

slotDuration

reservationDuration

bufferTime

Example:

opening:

10:00

closing:

22:00

slot:

30 minutes

reservation:

120 minutes

buffer:

15 minutes

============================================================
48. MENU MANAGEMENT
============================================================

Admin can:

create category

edit category

delete category

create menu item

edit menu item

delete menu item

activate

deactivate

set price

set stock

set availability

set preparation time

upload image

reorder

============================================================
49. MENU CATEGORY
============================================================

Examples:

MAIN COURSE

DRINKS

DESSERT

SNACK

COFFEE

SPECIAL

============================================================
50. MENU ITEM
============================================================

Fields:

id

name

description

price

image

categoryId

available

stock

preparationTime

sortOrder

createdAt

updatedAt

============================================================
51. PRE-ORDER
============================================================

Customer can add:

menu item

quantity

notes

price

subtotal

============================================================
52. ORDER STATUS
============================================================

PENDING

CONFIRMED

PREPARING

READY

SERVED

COMPLETED

CANCELLED

============================================================
53. PAYMENT ARCHITECTURE
============================================================

Payment must use an adapter architecture.

Example:

PaymentProvider

↓

MidtransPaymentProvider

XenditPaymentProvider

ManualTransferProvider

CashProvider

MockPaymentProvider

============================================================
54. PAYMENT METHODS
============================================================

FULL_PAYMENT

DEPOSIT

PAY_AT_RESTAURANT

MANUAL_CONFIRMATION

============================================================
55. PAYMENT INTERFACE
============================================================

Provider abstraction must support where applicable:

createPayment()

getPaymentStatus()

cancelPayment()

refundPayment()

verifyWebhook()

============================================================
56. PAYMENT SECURITY
============================================================

Never store:

raw card number

CVV

payment secret

payment credentials

in tenant database.

Store only safe transaction metadata.

============================================================
57. PAYMENT WEBHOOK
============================================================

Webhook MUST:

verify signature

validate payload

support idempotency

prevent duplicate state transitions

update payment safely

update reservation/order safely

============================================================
58. SUBSCRIPTION
============================================================

Subscription belongs to tenant.

Fields:

id

tenantId

plan

status

startDate

endDate

billingCycle

amount

currency

provider

externalSubscriptionId

createdAt

updatedAt

============================================================
59. BILLING CYCLE
============================================================

MONTHLY

YEARLY

CUSTOM

============================================================
60. SUBSCRIPTION STATUS
============================================================

TRIAL

ACTIVE

PAST_DUE

SUSPENDED

EXPIRED

CANCELLED

============================================================
61. TRIAL → SUBSCRIPTION
============================================================

Flow:

TRIAL

↓

Client agrees

↓

Platform Owner activates subscription

↓

Tenant:

ACTIVE

↓

subscriptionStart

↓

subscriptionEnd

============================================================
62. TRIAL EXTENSION
============================================================

SUPER_ADMIN may extend trial.

Example:

60 days

+

14 days

=

74 days

Every change MUST be audited.

============================================================
63. SUBSCRIPTION EXPIRATION
============================================================

When:

currentTime >= subscriptionEnd

Tenant:

SUBSCRIPTION_EXPIRED

Customer:

EXPIRED EXPERIENCE

============================================================
64. GRACE PERIOD
============================================================

Optional configurable period.

Example:

7 days

Behavior must be configurable.

============================================================
65. TENANT SUSPENSION
============================================================

Suspended tenant:

customer operations blocked

reservation blocked

new order blocked

application shows suspended/expired experience

Admin access policy configurable.

============================================================
66. ADMIN ACCESS AFTER EXPIRATION
============================================================

Recommended:

Tenant Admin may still access:

billing

subscription status

account

support

data export

Operational features may be disabled.

============================================================
67. AUTOMATED TENANT PROVISIONING
============================================================

This is a CORE SYSTEM.

When creating tenant:

generate tenant ID

generate tenant code

create database

run migration

create storage namespace

create admin

generate temporary password

configure trial

configure branding

configure API

configure Web

configure APK

validate

mark tenant READY

============================================================
68. TENANT PROVISIONING CLI
============================================================

Required CLI:

sibangku tenant create

Example:

sibangku tenant create \
  --name "Distro Avenue Store" \
  --code "DISTRO-AVENUE" \
  --admin-email "owner@example.com" \
  --trial-days 60

============================================================
69. CLI COMMANDS
============================================================

Required commands:

sibangku tenant create

sibangku tenant list

sibangku tenant inspect

sibangku tenant activate

sibangku tenant suspend

sibangku tenant expire

sibangku tenant extend-trial

sibangku tenant reset-admin

sibangku tenant build

sibangku tenant build-web

sibangku tenant build-apk

sibangku tenant backup

sibangku tenant restore

sibangku tenant archive

sibangku tenant destroy

============================================================
70. ADMIN ACCOUNT GENERATOR
============================================================

The provisioning system must generate unique credentials.

Generate:

tenant ID

admin identity

temporary password

firstLoginRequired

password expiration if configured

Never use predictable passwords.

============================================================
71. TEMPORARY PASSWORD
============================================================

Password MUST be generated using cryptographically secure
randomness.

Temporary password:

- unique
- high entropy
- never hardcoded
- never predictable

============================================================
72. FIRST LOGIN
============================================================

Admin logs in using temporary credentials.

System detects:

mustChangePassword = true

Admin must create permanent password.

Temporary password becomes invalid.

============================================================
73. PASSWORD STORAGE
============================================================

Use:

Argon2id

or:

bcrypt with secure configuration.

Never store plaintext passwords.

============================================================
74. CREDENTIAL DELIVERY
============================================================

Credentials may be shown once during provisioning.

Do not:

commit credentials to Git

store permanent passwords in logs

include permanent credentials in APK

include passwords in generated frontend files

============================================================
75. PROVISIONING IDEMPOTENCY
============================================================

Running:

tenant create

twice with the same tenant identifier MUST NOT create duplicate:

tenant

database

admin

storage

domain

package ID

============================================================
76. PROVISIONING STATE
============================================================

PROVISIONING

DATABASE_CREATING

DATABASE_READY

MIGRATING

AUTH_CREATING

STORAGE_CREATING

CONFIGURING

WEB_BUILDING

APK_BUILDING

VERIFYING

READY

FAILED

ARCHIVED

============================================================
77. PROVISIONING FAILURE
============================================================

If:

database = SUCCESS

web = SUCCESS

apk = FAILED

Tenant MUST NOT be destroyed automatically.

Allow:

retry APK

retry deployment

retry failed step

============================================================
78. TENANT BUILD GENERATOR
============================================================

Required:

sibangku tenant build --all TEN-2026-8F4K2M

Pipeline:

load tenant

↓

load branding

↓

load configuration

↓

validate tenant

↓

generate Web

↓

generate Android

↓

build APK

↓

validate artifacts

↓

generate deployment configuration

↓

generate build report

============================================================
79. WEB GENERATOR
============================================================

Web build must support tenant-specific:

name

logo

favicon

colors

fonts

images

API endpoint

domain

configuration

============================================================
80. WEB BUILD OUTPUT
============================================================

Example:

output/

TEN-2026-8F4K2M/

web/

deployment/

metadata/

build-report.json

============================================================
81. APK GENERATOR
============================================================

Each tenant receives a unique Android application configuration.

Configure:

application name

application icon

splash screen

colors

branding

API endpoint

package identifier

version

============================================================
82. APK PACKAGE ID
============================================================

Must be unique.

Example:

com.sibangku.distroavenue

Never use the same package ID for unrelated tenants.

============================================================
83. APK SIGNING
============================================================

Production APK/AAB must be signed.

Signing keys MUST:

never be committed

never be included in tenant source

never be logged

never be exposed to clients

Use secure signing infrastructure.

============================================================
84. BUILD OUTPUT
============================================================

Example:

output/

TEN-2026-8F4K2M/

    web/

    android/

    apk/

        SiBangku-Distro-Avenue.apk

    deployment/

    config/

    metadata/

    build-report.json

============================================================
85. BUILD REPORT
============================================================

Example:

TENANT BUILD REPORT

Tenant:
Distro Avenue Store

Tenant ID:
TEN-2026-8F4K2M

Database:
READY

Web:
SUCCESS

APK:
SUCCESS

Branding:
SUCCESS

Trial:
60 DAYS

Status:
READY

============================================================
86. WEB DEPLOYMENT
============================================================

Supported deployment targets may include:

Vercel

Docker

self-hosted

other supported hosting

Tenant deployment configuration must be isolated.

============================================================
87. DOMAIN
============================================================

Support:

tenant.sibangku.example

Example:

distroavenue.sibangku.example

Custom domain may later be supported.

============================================================
88. API ISOLATION
============================================================

Tenant A Web:

API A

Tenant B Web:

API B

Tenant A APK:

API A

Tenant B APK:

API B

Clients MUST NOT be able to select arbitrary tenant APIs through
normal client input.

============================================================
89. TENANT RESOLUTION
============================================================

Tenant can be resolved using:

subdomain

custom domain

tenant identifier

trusted deployment configuration

Server MUST validate tenant identity.

============================================================
90. AUTHORIZATION
============================================================

Every protected request must verify:

authentication

tenant

role

permission

resource ownership

============================================================
91. TENANT SECURITY BOUNDARY
============================================================

Never trust client-provided tenant ID without validation.

Never allow:

tenant A token
→ tenant B resource

Expected:

403

or safe 404.

============================================================
92. CUSTOMER AUTHENTICATION
============================================================

Support configurable:

guest reservation

email account

phone

OTP

customer account

Tenant controls enabled methods where applicable.

============================================================
93. CUSTOMER DATA ISOLATION
============================================================

Customer data belongs to tenant operational scope.

Customer from Tenant A must not automatically become a customer
of Tenant B.

============================================================
94. ADMIN DASHBOARD
============================================================

Tenant Dashboard displays:

today

reservations

occupied tables

upcoming reservations

orders

revenue

popular menu

table utilization

============================================================
95. RESERVATION DASHBOARD
============================================================

Display:

calendar

time slots

tables

customer

guest count

status

payment

pre-order

============================================================
96. CUSTOMER APPLICATION
============================================================

Customer homepage:

restaurant branding

hero

restaurant information

menu

reservation CTA

table availability

opening hours

contact

social media

============================================================
97. CUSTOMER CHECKOUT
============================================================

Display:

restaurant

date

time

table

guest count

pre-order

subtotal

deposit/full payment

fees if applicable

total

payment method

confirmation

============================================================
98. RESERVATION CONFIRMATION
============================================================

After successful booking:

reservation number

restaurant

date

time

table

guest count

pre-order

payment status

optional QR code

============================================================
99. QR CODE
============================================================

Optional.

If implemented:

use signed verification token.

Never place sensitive customer data directly inside QR.

============================================================
100. NOTIFICATION ARCHITECTURE
============================================================

Notification adapters may include:

Email

WhatsApp provider

SMS

Push

Do not hardcode one provider into business logic.

============================================================
101. ADMIN NOTIFICATIONS
============================================================

Notify when:

new reservation

payment received

reservation cancelled

new pre-order

trial approaching expiration

subscription expired

============================================================
102. REPORTING
============================================================

Tenant reports:

reservations

revenue

orders

popular menus

table utilization

cancellation

no-show

daily

weekly

monthly

============================================================
103. PLATFORM REPORTING
============================================================

Platform Admin:

total tenants

trial tenants

active tenants

expired tenants

suspended tenants

subscriptions

provisioning failures

deployment health

database health

============================================================
104. ADMIN ROUTES
============================================================

Tenant:

/admin

/admin/dashboard

/admin/reservations

/admin/tables

/admin/table-layout

/admin/menu

/admin/orders

/admin/customers

/admin/branding

/admin/payments

/admin/settings

/admin/reports

/admin/account

============================================================
105. PLATFORM ROUTES
============================================================

/platform

/platform/dashboard

/platform/tenants

/platform/tenants/[id]

/platform/provisioning

/platform/subscriptions

/platform/trials

/platform/deployments

/platform/settings

/platform/audit

============================================================
106. CUSTOMER ROUTES
============================================================

/

/menu

/reservation

/table

/checkout

/reservation/[id]

/account

============================================================
107. EXPIRED ROUTE
============================================================

/expired

But external expired hosting is preferred.

============================================================
108. DOCKER
============================================================

Platform MUST support Docker.

Potential services:

control-api

tenant-api

worker

web

redis

postgres-control

tenant database services

reverse proxy

build service

============================================================
109. DOCKER DEVELOPMENT
============================================================

Developer should be able to start core environment with:

docker compose up

where appropriate.

============================================================
110. DATABASE DEPLOYMENT
============================================================

Development may use:

one PostgreSQL server

with separate databases.

Example:

sibangku_control

tenant_distroavenue

tenant_restaurant_b

tenant_restaurant_c

Production architecture MUST allow stronger physical isolation
when required.

============================================================
111. DATABASE PROVISIONING
============================================================

Provisioner must:

create database

create credentials

run migrations

seed defaults

verify connection

mark READY

============================================================
112. DATABASE MIGRATIONS
============================================================

Migrations must be:

versioned

reproducible

reviewable

safe

automatable

============================================================
113. DATABASE BACKUP
============================================================

Each tenant must support:

backup

retention

restore

backup status

============================================================
114. DATABASE RESTORE
============================================================

Restore must require explicit operation.

Do not overwrite production without confirmation.

============================================================
115. VERSIONING
============================================================

Tenant tracks:

applicationVersion

databaseSchemaVersion

minimumSupportedVersion

============================================================
116. UPDATE STRATEGY
============================================================

Before update:

backup

compatibility check

migration

deployment

health check

rollback if necessary

============================================================
117. APK VERSION
============================================================

Store:

versionName

versionCode

tenantId

buildDate

commitHash

============================================================
118. BUILD METADATA
============================================================

Every artifact should contain:

tenant ID

version

build timestamp

commit hash

environment

============================================================
119. OBSERVABILITY
============================================================

Use:

structured logging

request ID

correlation ID

tenant ID

operation ID where appropriate

latency

status

error code

============================================================
120. SECURITY LOGGING
============================================================

NEVER log:

password

access token

refresh token

database password

payment secret

API secret

private key

APK signing key

============================================================
121. HEALTH CHECK
============================================================

Provide:

/health

/liveness

/readiness

============================================================
122. TENANT HEALTH
============================================================

Platform Admin can see:

database

API

storage

Web

APK version

subscription

trial

last activity

============================================================
123. RATE LIMITING
============================================================

Protect:

login

reservation

payment

password reset

admin APIs

file upload

public APIs

============================================================
124. INPUT VALIDATION
============================================================

Validate:

dates

times

prices

capacity

email

URLs

currency

file uploads

payment webhooks

CLI arguments

external API responses

============================================================
125. API ERROR MODEL
============================================================

Standard response:

code

message

requestId

details

timestamp

Do not expose stack traces.

============================================================
126. ERROR CODES
============================================================

Examples:

TENANT_NOT_FOUND

TENANT_SUSPENDED

TRIAL_EXPIRED

SUBSCRIPTION_EXPIRED

TABLE_UNAVAILABLE

RESERVATION_CONFLICT

PAYMENT_FAILED

INVALID_CREDENTIALS

FORBIDDEN_OPERATION

DATABASE_UNAVAILABLE

PROVISIONING_FAILED

============================================================
127. SECURITY
============================================================

Implement appropriate:

RBAC

authentication

authorization

password hashing

secure session/token handling

rate limiting

CSRF protection where applicable

XSS protection

SQL injection protection

SSRF protection

secure file upload

security headers

audit logging

secret management

============================================================
128. PASSWORD RESET
============================================================

Password reset uses:

one-time token

expiration

secure validation

token invalidation after use

============================================================
129. SECRET MANAGEMENT
============================================================

Never commit:

database passwords

JWT secrets

API keys

payment secrets

storage secrets

APK signing keys

private keys

============================================================
130. ENVIRONMENT CONFIGURATION
============================================================

Provide:

.env.example

Development:

.env.development

Production secrets MUST come from secure deployment
configuration.

============================================================
131. INTERNATIONALIZATION
============================================================

Initial languages:

Indonesian

English

Tenant may configure default language.

============================================================
132. CURRENCY
============================================================

Default:

IDR

Support configurable currencies.

Examples:

USD

SGD

MYR

etc.

============================================================
133. TIMEZONE
============================================================

Default:

Asia/Jakarta

Store timestamps in UTC.

Render using tenant timezone.

============================================================
134. BUSINESS CONFIGURATION
============================================================

Do NOT hardcode:

trial duration

reservation duration

slot duration

deposit percentage

cancellation window

grace period

opening hours

payment mode

These belong to configuration.

============================================================
135. CONFIGURATION HIERARCHY
============================================================

Platform defaults

↓

Tenant configuration

↓

Context-specific override when required

============================================================
136. OFFLINE POLICY
============================================================

Web/Mobile may cache non-sensitive UI.

Reservation creation requires server confirmation.

Do NOT confirm a reservation offline unless a dedicated offline
reservation architecture exists.

============================================================
137. API CONTRACT
============================================================

API contracts must be explicit.

Use:

DTO

Schema

Request Model

Response Model

Command

Query

where appropriate.

Do not expose database entities directly when it creates security
or coupling problems.

============================================================
138. SHARED TYPES
============================================================

Where technically appropriate:

share API contract/types between:

Web

Mobile

API

Do not copy-paste contracts.

============================================================
139. BACKWARD COMPATIBILITY
============================================================

API changes must consider:

existing Web clients

existing APK versions

existing tenant deployments

============================================================
140. ARCHITECTURE PRINCIPLES
============================================================

Use:

separation of concerns

modularity

dependency inversion where appropriate

domain-oriented organization

testability

clear boundaries

============================================================
141. MODULES
============================================================

Recommended logical modules:

Authentication

Authorization

Tenants

Provisioning

Subscriptions

Reservations

Tables

Table Layout

Menus

Orders

Payments

Customers

Branding

Storage

Notifications

Reports

Audit

Health

Deployment

============================================================
142. CONTROLLER RULE
============================================================

Controllers must be thin.

Controller responsibilities:

receive

validate

authorize

call service/use case

return response

Do NOT put large business algorithms in controllers.

============================================================
143. SERVICE RULE
============================================================

Services should contain business logic.

Do not create one giant service containing unrelated features.

============================================================
144. DATABASE ACCESS RULE
============================================================

Database access must be isolated through:

repository

data access layer

ORM

or equivalent persistence boundary.

Do not scatter database queries throughout UI components.

============================================================
145. SINGLE RESPONSIBILITY
============================================================

Each class/function/module should have one clear responsibility.

Avoid:

GOD CLASS

GOD SERVICE

GOD CONTROLLER

GOD COMPONENT

GOD FUNCTION

============================================================
146. READABLE CODE
============================================================

Code MUST be:

clear

explicit

consistent

logical

easy to navigate

easy to debug

easy to modify

Avoid unnecessarily clever code.

Avoid excessive one-liners.

Avoid deep nesting.

Use descriptive names.

============================================================
147. NAMING
============================================================

Use descriptive names for:

variables

functions

classes

services

repositories

controllers

DTOs

interfaces

types

components

hooks

utilities

constants

============================================================
148. BAD NAMING
============================================================

Avoid:

x

y

tmp

foo

bar

thing

stuff

newData

finalData

test1

test2

unless genuinely appropriate to context.

============================================================
149. MAGIC VALUES
============================================================

Avoid:

if (days > 60)

Prefer:

if (days > DEFAULT_TRIAL_DAYS)

Avoid unexplained:

numbers

strings

status values

timeouts

limits

============================================================
150. ENUMS / CONSTANTS
============================================================

Use type-safe representations for important states.

Example:

TenantStatus.TRIAL_EXPIRED

ReservationStatus.CONFIRMED

PaymentStatus.PAID

============================================================
151. TYPE SAFETY
============================================================

Use strict typing where supported.

Avoid unnecessary:

any

dynamic

unsafe casts

untyped objects

============================================================
152. COMMENTS
============================================================

Comments should explain WHY.

Do not write comments that merely repeat code.

Required comments for:

complex business rules

security decisions

workarounds

external provider limitations

concurrency decisions

important architectural decisions

============================================================
153. TODO POLICY
============================================================

Do not leave meaningless:

TODO

FIXME

placeholder

unfinished code.

Production TODO must contain:

reason

scope

expected resolution

tracking reference if available.

============================================================
154. ERROR HANDLING
============================================================

Never silently swallow errors.

Forbidden:

empty catch

ignored promise rejection

console.log as sole error handling

Every significant error must be:

handled

logged safely

represented with error code

returned safely

============================================================
155. DEBUGGABILITY
============================================================

Important operations must be traceable using:

requestId

correlationId

tenantId

operationId where appropriate

============================================================
156. NO DUPLICATED BUSINESS LOGIC
============================================================

Do not duplicate:

trial calculation

subscription expiration

reservation conflict

pricing

payment state

authorization

tenant resolution

across:

Web

APK

API

Worker

Admin UI

The server/control plane is authoritative.

============================================================
157. BUSINESS RULE LOCATION
============================================================

Business rules should exist in one logical authoritative location.

Example:

Trial expiration:

Control Plane / backend

Not:

Web timer

APK timer

localStorage

============================================================
158. UI COMPONENT RULE
============================================================

UI components should focus on presentation and interaction.

Do not place all of the following into one component:

API calls

payment logic

reservation algorithm

authentication

large state machine

large rendering tree

Separate where appropriate.

============================================================
159. API CLIENT RULE
============================================================

Do not scatter raw HTTP calls throughout UI components.

Use centralized API client/services.

============================================================
160. MOBILE API RULE
============================================================

APK must use defined backend APIs.

Do not duplicate authoritative business rules inside APK.

============================================================
161. TESTABILITY
============================================================

Business logic must be independently testable.

Avoid unnecessary tight coupling to:

HTTP

database

filesystem

external APIs

framework lifecycle.

============================================================
162. TEST NAMING
============================================================

Tests should describe behavior.

GOOD:

should_reject_reservation_when_table_is_already_booked

should_expire_trial_when_current_time_reaches_trial_end

should_prevent_tenant_a_from_accessing_tenant_b

BAD:

test1

test2

works

============================================================
163. UNIT TESTS
============================================================

Test:

tenant

trial

subscription

reservation

table availability

pricing

payment state

authentication

authorization

tenant resolution

provisioning

============================================================
164. INTEGRATION TESTS
============================================================

Test:

tenant provisioning

database creation

migration

admin creation

trial creation

storage

API

============================================================
165. E2E TEST
============================================================

Flow:

Create tenant

↓

Login admin

↓

Change password

↓

Create table

↓

Create layout

↓

Create menu

↓

Configure branding

↓

Customer opens Web

↓

Select table

↓

Reservation

↓

Pre-order

↓

Payment

↓

Confirmation

============================================================
166. MULTI-TENANT E2E
============================================================

Create:

Tenant A

Tenant B

Tenant C

Verify:

different database

different admin

different branding

different menu

different table layout

different reservation

different API configuration

============================================================
167. TRIAL E2E
============================================================

Create:

trialDays = 1

Verify:

TRIAL

↓

TRIAL_EXPIRED

↓

EXPIRED EXPERIENCE

Changing:

browser date

device date

APK date

localStorage

MUST NOT bypass expiration.

============================================================
168. CROSS-TENANT SECURITY TEST
============================================================

Tenant A attempts:

Tenant B API

Tenant B reservation

Tenant B customer

Tenant B database

Expected:

DENIED.

============================================================
169. RESERVATION CONCURRENCY TEST
============================================================

Customer A:

Table 5

20:00

Customer B:

Table 5

20:00

Expected:

Only one succeeds.

============================================================
170. PAYMENT IDEMPOTENCY TEST
============================================================

Same payment webhook:

received twice

Expected:

one logical state transition.

============================================================
171. PRODUCTION CREDENTIAL TEST
============================================================

Production build MUST NOT contain:

admin/admin

default password

hardcoded secret

hardcoded API key

============================================================
172. APK ISOLATION TEST
============================================================

APK A:

Tenant A API

APK B:

Tenant B API

Verify:

different package IDs

different branding

different API configuration.

============================================================
173. WEB ISOLATION TEST
============================================================

Web A:

Tenant A branding/data

Web B:

Tenant B branding/data

Verify no cross-tenant data.

============================================================
174. CODE QUALITY
============================================================

The codebase must be:

readable

maintainable

testable

modular

documented

debuggable

observable

secure

AI-readable

developer-readable

============================================================
175. REFACTORING POLICY
============================================================

If code becomes difficult to understand:

STOP

Refactor

Then continue implementation.

Do not keep adding code to a poorly structured module.

============================================================
176. FILE ORGANIZATION
============================================================

Organize code by logical domain/module.

Example:

src/

    auth/

    tenants/

    provisioning/

    subscriptions/

    reservations/

    tables/

    menus/

    orders/

    payments/

    customers/

    branding/

    storage/

    notifications/

    reports/

    audit/

    health/

    deployment/

============================================================
177. FILE SIZE
============================================================

Do not create unnecessarily huge source files.

If a file contains multiple unrelated responsibilities:

split it.

Do not split files mechanically without improving cohesion.

============================================================
178. DEPENDENCY POLICY
============================================================

Do not add dependencies without justification.

Before adding dependency:

check necessity

check security

check maintenance

check license

check compatibility

============================================================
179. DEAD CODE
============================================================

Remove verified:

unused imports

unused services

unused components

unused routes

unused functions

unused dependencies

unused configuration

============================================================
180. PLACEHOLDER POLICY
============================================================

Production path MUST NOT contain fake:

payment success

reservation success

subscription

authentication

tenant

database

unless explicitly configured as a development/mock adapter.

============================================================
181. MOCK ARCHITECTURE
============================================================

Example:

PaymentProvider

├── MidtransPaymentProvider

├── XenditPaymentProvider

├── ManualPaymentProvider

└── MockPaymentProvider

Mock MUST NOT accidentally run in production.

============================================================
182. ARCHITECTURE DOCUMENTATION
============================================================

Generate:

README.md

ARCHITECTURE.md

TENANT_MODEL.md

PROVISIONING.md

TRIAL_AND_SUBSCRIPTION.md

DATABASE_ISOLATION.md

AUTHENTICATION.md

AUTHORIZATION.md

RESERVATION.md

TABLE_LAYOUT.md

MENU.md

PAYMENT.md

APK_BUILD.md

WEB_BUILD.md

DOCKER.md

SECURITY.md

DEPLOYMENT.md

TESTING.md

OPERATIONS.md

CODE_STRUCTURE.md

============================================================
183. ARCHITECTURE DECISION RECORDS
============================================================

Document important decisions.

Examples:

ADR-001-database-per-tenant

ADR-002-server-side-trial

ADR-003-no-trial-key

ADR-004-payment-adapter

ADR-005-external-expired-experience

ADR-006-automated-tenant-provisioning

ADR-007-web-apk-generation

============================================================
184. AI HANDOFF
============================================================

A new AI agent must be able to read:

README

architecture

module structure

environment setup

database setup

Docker setup

test commands

build commands

deployment process

without hidden context.

============================================================
185. CHANGE IMPACT
============================================================

Changing reservation rules should primarily affect:

reservation domain

reservation tests

configuration

related API/UI behavior

It should not unexpectedly require modifications to unrelated
modules.

============================================================
186. CLEAN ARCHITECTURE
============================================================

Use clean architectural principles where appropriate.

Prioritize:

clear boundaries

testability

separation

dependency inversion

maintainability

Do not apply patterns mechanically.

============================================================
187. OVER-ENGINEERING
============================================================

Avoid unnecessary:

microservices

factories

interfaces

abstractions

design patterns

services

Do not add architecture merely to appear sophisticated.

============================================================
188. UNDER-ENGINEERING
============================================================

Do not under-engineer:

authentication

authorization

tenant isolation

payment

reservation concurrency

trial expiration

subscription

database provisioning

secret management

file uploads

============================================================
189. MAINTAINABILITY PRIORITY
============================================================

When choosing between implementations:

Prefer the one that is:

clearer

safer

more testable

more maintainable

more observable

provided performance remains acceptable.

============================================================
190. PRODUCTION CONFIGURATION
============================================================

Production configuration MUST be externalized.

Never hardcode:

production URL

database password

JWT secret

payment secret

storage credentials

tenant database credentials

APK signing key

============================================================
191. SECURITY BOUNDARY
============================================================

Every protected operation must verify:

authentication

tenant

role

permission

resource ownership

============================================================
192. AUDIT LOG
============================================================

Audit:

tenant created

tenant provisioned

database created

admin created

trial started

trial extended

trial expired

subscription activated

subscription renewed

subscription expired

tenant suspended

tenant activated

APK generated

Web generated

branding changed

payment settings changed

admin reset

tenant archived

tenant deleted

============================================================
193. DATA PRIVACY
============================================================

System must support:

tenant isolation

data export

data deletion

backup

restore

audit

secure storage

============================================================
194. TENANT DELETION
============================================================

Destructive operation requires:

explicit confirmation

tenant code

confirmation phrase where appropriate

audit

backup according to policy

============================================================
195. ARCHIVE
============================================================

Archived tenant:

operational access disabled

data retained according to policy

database may be moved to archival storage

============================================================
196. MONITORING
============================================================

Monitor:

Control API

Tenant API

Worker

Database

Redis

Storage

Payment adapters

Provisioning

Web deployments

Build service

============================================================
197. PROVISIONING MONITORING
============================================================

Track:

duration

step

success

failure

retry count

error reason

tenant ID

============================================================
198. CI/CD
============================================================

Pipeline should execute:

install

lint

typecheck

unit tests

integration tests

E2E

Web build

API build

Docker build

security checks

============================================================
199. WEB VALIDATION
============================================================

Before declaring Web build successful:

build

lint

typecheck

tests

smoke test

configuration validation

tenant identity validation

============================================================
200. APK VALIDATION
============================================================

Before declaring APK successful:

build

tests

package ID validation

manifest validation

application name validation

API endpoint validation

branding validation

============================================================
201. DATABASE VALIDATION
============================================================

Verify:

connection

migration

tables

indexes

constraints

seed

tenant isolation

============================================================
202. BUILD CACHE SAFETY
============================================================

Build caching MUST NOT accidentally reuse tenant-specific:

logos

icons

branding

API URLs

package IDs

configuration

============================================================
203. TENANT BUILD SECURITY
============================================================

Generated tenant artifacts must not expose:

control plane secrets

database passwords

payment secrets

platform admin credentials

APK signing keys

============================================================
204. FINAL SYSTEM FLOW
============================================================

PLATFORM ADMIN

↓

CREATE TENANT

↓

TENANT PROVISIONER

↓

TENANT ID

↓

DATABASE

↓

MIGRATION

↓

ADMIN ACCOUNT

↓

STORAGE

↓

TRIAL

↓

BRANDING

↓

WEB BUILD

↓

APK BUILD

↓

VALIDATION

↓

READY

============================================================
205. CUSTOMER FLOW
============================================================

CUSTOMER

↓

OPEN RESTAURANT WEB/APK

↓

VIEW RESTAURANT

↓

VIEW MENU

↓

SELECT DATE

↓

SELECT TIME

↓

SELECT GUEST COUNT

↓

VIEW TABLE MAP

↓

SELECT TABLE

↓

OPTIONAL PRE-ORDER

↓

CHECKOUT

↓

PAYMENT

↓

RESERVATION CONFIRMED

============================================================
206. TRIAL FLOW
============================================================

TENANT CREATED

↓

TRIAL START

↓

TRIAL ACTIVE

↓

WARNING

↓

TRIAL END

↓

TRIAL_EXPIRED

↓

EXPIRED EXPERIENCE

============================================================
207. SUBSCRIPTION FLOW
============================================================

TRIAL

↓

CLIENT AGREES

↓

SUBSCRIPTION ACTIVATED

↓

ACTIVE

↓

RENEWAL

↓

ACTIVE

OR

PAST_DUE

↓

GRACE PERIOD

↓

SUSPENDED

↓

SUBSCRIPTION_EXPIRED

↓

EXPIRED EXPERIENCE

============================================================
208. EXPIRED FLOW
============================================================

TENANT STATUS CHECK

↓

ACTIVE?

YES
↓
NORMAL APPLICATION

NO
↓
EXPIRED EXPERIENCE

Expired Experience contains:

message

WhatsApp

Instagram

TikTok

optional email

optional phone

animated arrow

professional animation

============================================================
209. FINAL TENANT EXAMPLE
============================================================

Restaurant:

Distro Avenue Store

Tenant ID:

TEN-2026-8F4K2M

Tenant Code:

DISTRO-AVENUE

Admin:

owner@distroavenue.example

Temporary Password:

SECURELY GENERATED

Trial:

60 DAYS

Database:

tenant_distroavenue

Web:

distroavenue.sibangku.example

APK:

com.sibangku.distroavenue

============================================================
210. FINAL ACCOUNT SECURITY EXAMPLE
============================================================

Tenant A:

unique account

unique password

unique database

unique API configuration

unique branding

Tenant B:

unique account

unique password

unique database

unique API configuration

unique branding

NEVER:

Tenant A → admin/admin

Tenant B → admin/admin

============================================================
211. FINAL PROVISIONING COMMAND EXAMPLE
============================================================

sibangku tenant create \
  --name "Distro Avenue Store" \
  --code "DISTRO-AVENUE" \
  --admin-email "owner@example.com" \
  --trial-days 60

Then:

sibangku tenant build --all TEN-2026-8F4K2M

Expected:

DATABASE:
SUCCESS

ADMIN:
SUCCESS

TRIAL:
SUCCESS

BRANDING:
SUCCESS

WEB:
SUCCESS

APK:
SUCCESS

VALIDATION:
SUCCESS

STATUS:
READY

============================================================
212. FINAL CODE QUALITY AUDIT
============================================================

The agent MUST inspect the entire repository for:

TODO

FIXME

placeholder

dummy

fake

mock

hardcoded

admin/admin

hardcoded tenant

hardcoded branding

hardcoded API

unused route

unused component

unused service

unused dependency

broken import

security bypass

dead code

duplicate business logic

============================================================
213. FINAL ARCHITECTURE AUDIT
============================================================

Trace every major system path:

Platform Admin

↓

Tenant Provisioning

↓

Control Plane

↓

Tenant Database

↓

Tenant Admin

↓

Customer Web

↓

Customer APK

↓

Reservation

↓

Table

↓

Menu

↓

Order

↓

Payment

↓

Trial

↓

Subscription

↓

Expiration

↓

Expired Experience

Every path must be connected.

============================================================
214. FINAL CROSS-TENANT AUDIT
============================================================

Create:

Tenant A

Tenant B

Tenant C

Verify:

Database A != Database B

Database B != Database C

Admin A != Admin B

Branding A != Branding B

Menu A != Menu B

Tables A != Tables B

Reservations A != Reservations B

API A != API B

APK A != APK B

============================================================
215. FINAL SECURITY AUDIT
============================================================

Verify:

No production admin/admin

No plaintext password

No exposed secrets

No cross-tenant access

No arbitrary tenant switching

No client-side trial bypass

No payment webhook bypass

No insecure file upload

No sensitive logs

No exposed database credentials

No exposed signing keys

============================================================
216. FINAL TRIAL AUDIT
============================================================

Verify:

trial starts server-side

trial end stored server-side

trial cannot be reset through logout

trial cannot be reset through reinstall

trial cannot be bypassed through localStorage

trial cannot be bypassed through device date

trial cannot be bypassed through APK date

expired tenant receives expired experience

============================================================
217. FINAL RESERVATION AUDIT
============================================================

Verify:

table availability

time slot

capacity

reservation duration

conflict detection

transaction safety

concurrency

duplicate request protection

============================================================
218. FINAL PAYMENT AUDIT
============================================================

Verify:

provider abstraction

signature validation

idempotency

transaction state

reservation state

order state

secure credentials

============================================================
219. FINAL PROVISIONING AUDIT
============================================================

Verify:

tenant ID

tenant code

database

migration

admin

temporary password

storage

branding

Web

APK

package ID

configuration

trial

deployment

============================================================
220. FINAL DEFINITION OF DONE
============================================================

SiBangku is COMPLETE only when:

FUNCTIONAL COMPLETENESS

AND

ENGINEERING COMPLETENESS

are BOTH satisfied.

============================================================
221. FUNCTIONAL COMPLETENESS
============================================================

Required:

Tenant Management

Provisioning

Authentication

Authorization

Tenant Isolation

Trial

Subscription

Restaurant Profile

Branding

Image Management

Tables

Visual Table Layout

Reservations

Menu

Pre-order

Orders

Payment Architecture

Notifications where configured

Reports

Web Generation

APK Generation

Docker

Expired Experience

============================================================
222. ENGINEERING COMPLETENESS
============================================================

Required:

Readable code

Maintainable code

Modular architecture

Clear naming

Strict typing where available

Testable business logic

Structured errors

Structured logging

Security controls

Documentation

Architecture documentation

Deployment documentation

AI-readable repository

No critical TODO

No fake production implementation

No hardcoded production credentials

No duplicated business logic

============================================================
223. QUALITY GATES
============================================================

BUILD:

PASS

TYPECHECK:

PASS

LINT:

PASS

UNIT TEST:

PASS

INTEGRATION TEST:

PASS

E2E TEST:

PASS

SECURITY TEST:

PASS

TENANT ISOLATION:

PASS

PROVISIONING:

PASS

TRIAL:

PASS

SUBSCRIPTION:

PASS

RESERVATION:

PASS

PAYMENT:

PASS

WEB BUILD:

PASS

APK BUILD:

PASS

DOCKER BUILD:

PASS

DOCUMENTATION:

COMPLETE

CODE QUALITY:

PASS

PRODUCTION SECURITY:

PASS

============================================================
224. FINAL PRODUCTION READINESS
============================================================

Only after all required gates pass:

SYSTEM STATUS:

PRODUCTION READY

If any critical gate fails:

SYSTEM STATUS:

NOT PRODUCTION READY

The agent MUST report the exact failing gate.

============================================================
225. FINAL AGENT REPORT
============================================================

At the end of implementation, generate a final report containing:

1. Architecture
2. Technology Stack
3. Repository Structure
4. Control Plane
5. Tenant Plane
6. Database Architecture
7. Tenant Isolation
8. Authentication
9. Authorization
10. Provisioning
11. Trial
12. Subscription
13. Reservation
14. Table Layout
15. Menu
16. Pre-order
17. Payment
18. Branding
19. Image Management
20. Web Generation
21. APK Generation
22. Docker
23. Security
24. Testing
25. CI/CD
26. Deployment
27. Monitoring
28. Documentation
29. Code Quality
30. Known Limitations
31. Remaining Tasks
32. Production Readiness

============================================================
226. FINAL RULE
============================================================

DO NOT DECLARE THE PROJECT COMPLETE BECAUSE THE UI LOOKS GOOD.

DO NOT DECLARE THE PROJECT COMPLETE BECAUSE THE PROJECT BUILDS.

DO NOT DECLARE THE PROJECT COMPLETE BECAUSE THE API EXISTS.

DO NOT DECLARE THE PROJECT COMPLETE BECAUSE MOCK DATA WORKS.

DO NOT DECLARE THE PROJECT COMPLETE BECAUSE UNIT TESTS PASS.

THE COMPLETE SYSTEM MUST BE VERIFIED END-TO-END.

============================================================
227. MASTER PRINCIPLE
============================================================

SiBangku must be:

FUNCTIONALLY COMPLETE

SECURE

ISOLATED

SCALABLE

MAINTAINABLE

READABLE

TESTABLE

DEBUGGABLE

DOCUMENTED

AI-READABLE

DEVELOPER-READABLE

AND

PRODUCTION-READY.

============================================================
END OF MASTER PRD
============================================================