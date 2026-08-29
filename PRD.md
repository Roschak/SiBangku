============================================================
PRODUCT REQUIREMENTS DOCUMENT
============================================================

PROJECT NAME:
SiBangku

PRODUCT TYPE:
Dedicated-Tenant White-Label Restaurant Reservation SaaS

VERSION:
2.0.0

DOCUMENT STATUS:
MASTER IMPLEMENTATION SPECIFICATION

PRIMARY OBJECTIVE:
Build a production-ready dedicated-tenant restaurant
reservation and food pre-order platform with Web + Android APK,
tenant isolation, configurable subscription/trial lifecycle,
visual table reservation, menu management, payment configuration,
and automated tenant provisioning.

============================================================
0. CRITICAL AGENT INSTRUCTIONS
============================================================

THIS DOCUMENT IS THE SOURCE OF TRUTH.

The implementation agent MUST follow this PRD.

The agent MUST NOT invent unspecified functionality.

The agent MUST NOT silently change architectural decisions.

The agent MUST NOT assume that "dedicated tenant" means
shared database tables.

The agent MUST NOT implement shared tenant data in one database
when the configuration specifies a dedicated database.

If an implementation detail is not defined:

1. Detect the ambiguity.
2. Choose the safest production-grade implementation.
3. Document the decision.
4. Do not invent business requirements.

If an external dependency is required:

- document it
- isolate it behind an adapter
- provide development/mock mode where appropriate
- never hardcode credentials

The application MUST NOT be considered complete merely because
the frontend renders.

Every feature must be connected through:

UI
↓
API
↓
Business Logic
↓
Database
↓
External Service where applicable

============================================================
1. PRODUCT VISION
============================================================

SiBangku is a white-label restaurant technology platform.

The platform allows the platform owner to provision a dedicated
digital restaurant system for each restaurant client.

Each restaurant receives:

1. Dedicated web application
2. Dedicated Android APK
3. Dedicated database
4. Dedicated tenant configuration
5. Dedicated branding
6. Dedicated restaurant admin account
7. Dedicated menu
8. Dedicated table layout
9. Dedicated reservation configuration
10. Dedicated payment configuration
11. Dedicated subscription/trial lifecycle

The customer interacts only with the restaurant's branded
application.

============================================================
2. CORE BUSINESS MODEL
============================================================

SiBangku operates using:

TRIAL
+
SUBSCRIPTION

Lifecycle:

PROVISIONED
    ↓
TRIAL
    ↓
SUBSCRIPTION
    ↓
ACTIVE
    ↓
RENEWAL
    ↓
EXPIRED / SUSPENDED

A tenant can exist before a paid subscription is activated.

============================================================
3. IMPORTANT TRIAL DECISION
============================================================

DO NOT USE A SHARED DEFAULT TRIAL ACCOUNT.

DO NOT USE:

username: admin
password: admin

for real clients.

DO NOT use a trial activation key as the primary mechanism.

Instead use:

AUTOMATED TENANT PROVISIONING.

Each generated tenant receives its own credentials.

Example:

Tenant:
tenant_8F4K2M

Admin:
admin@restaurant-domain.example

Temporary password:
GENERATED_RANDOM_PASSWORD

The temporary password MUST be changed on first login.

============================================================
4. DEVELOPMENT DEFAULT ACCOUNT
============================================================

For LOCAL DEVELOPMENT ONLY:

username:
admin

password:
admin

This account MUST:

- only exist in development mode
- never be generated into production tenant packages
- never be used by multiple real tenants
- never be included in production seed data

Production seed MUST NOT contain:

admin/admin

============================================================
5. TRIAL MODEL
============================================================

Default trial duration:

60 DAYS

This value MUST be configurable.

Possible values:

7 days
14 days
30 days
60 days
90 days
custom

Trial duration is controlled by the Platform Owner.

============================================================
6. TRIAL START
============================================================

Recommended rule:

Trial starts when the tenant is PROVISIONED.

Example:

Provisioned:
2026-08-28

Trial:
2026-08-28 → 2026-10-27

The trial MUST NOT reset simply because the client logs out,
reinstalls the APK, clears browser storage, or creates another
local session.

Trial state MUST be server-side.

============================================================
7. TRIAL EXPIRATION
============================================================

When:

currentTime >= trialEnd

the tenant becomes:

TRIAL_EXPIRED

The application MUST enforce expiration server-side.

Frontend-only expiration is NOT acceptable.

============================================================
8. EXPIRED EXPERIENCE
============================================================

When trial expires:

Customer application:

    ↓

EXPIRED EXPERIENCE

The normal restaurant application must no longer be usable
for customer transactions.

Display a professional expired/trial-ended page.

Example:

------------------------------------------------

TRIAL PERIOD ENDED

Terima kasih telah menggunakan SiBangku.

Masa uji coba sistem restoran ini telah berakhir.

Untuk melanjutkan penggunaan layanan,
silakan hubungi pengelola restoran / SiBangku.

[ WhatsApp ]

[ Instagram ]

[ TikTok ]

------------------------------------------------

This page may be hosted separately from the restaurant application.

============================================================
9. EXPIRED HOSTING ARCHITECTURE
============================================================

The expired experience MUST be deployable independently.

Example:

Restaurant application:

restaurant-a.example.com

Expired page:

expired.sibangku.example.com

OR:

expired-restaurant-a.example.com

When tenant is expired:

application redirects to:

EXPIRED EXPERIENCE

The expired experience MUST NOT depend on the restaurant
application being operational.

Recommended architecture:

Tenant Application
       |
       | tenant status check
       ↓
Subscription Middleware
       |
       ├── ACTIVE → Application
       |
       └── EXPIRED → External Expired Experience

============================================================
10. IMPORTANT SECURITY RULE
============================================================

Expiration MUST be enforced by backend/API middleware.

Do NOT rely only on:

JavaScript timer
localStorage
APK local date
browser date
frontend state

The backend is the authority.

============================================================
11. TENANT MODEL
============================================================

Each tenant has:

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

webIdentifier

apkIdentifier

brandingIdentifier

createdAt

updatedAt

============================================================
12. TENANT STATUS
============================================================

Possible states:

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
13. TENANT ISOLATION
============================================================

CRITICAL:

Each restaurant MUST have an isolated database.

Tenant A:

Database A

Tenant B:

Database B

Tenant C:

Database C

Data MUST NOT cross between tenants.

============================================================
14. DATABASE ARCHITECTURE
============================================================

Use:

DATABASE PER TENANT

NOT:

single database with tenant_id only.

The platform control plane may have its own database.

Architecture:

CONTROL PLANE DATABASE
        |
        ├── Tenant A metadata
        ├── Tenant B metadata
        └── Tenant C metadata


TENANT DATABASE A
        |
        ├── users
        ├── tables
        ├── menus
        ├── reservations
        ├── orders
        └── settings


TENANT DATABASE B
        |
        ├── users
        ├── tables
        ├── menus
        ├── reservations
        ├── orders
        └── settings

============================================================
15. CONTROL PLANE
============================================================

The Control Plane manages:

tenants

tenant status

trial

subscription

provisioning

deployment metadata

domain

APK metadata

database connection metadata

platform users

billing state

system configuration

audit logs

============================================================
16. TENANT PLANE
============================================================

Each tenant application manages:

restaurant users

customers

tables

table layouts

menus

categories

orders

reservations

payments

restaurant settings

branding

notifications

reports

============================================================
17. PLATFORM OWNER
============================================================

Role:

SUPER_ADMIN

Capabilities:

create tenant

provision tenant

suspend tenant

activate tenant

extend trial

change trial duration

activate subscription

expire subscription

view tenant status

view deployment status

regenerate tenant package

view tenant health

manage platform settings

============================================================
18. TENANT ADMIN
============================================================

Each restaurant receives its own:

TENANT_ADMIN

Capabilities:

manage restaurant

manage staff

manage menu

manage categories

manage tables

manage table layout

manage reservation rules

manage payment configuration

manage orders

manage customers

manage branding

view reports

============================================================
19. TENANT STAFF
============================================================

Optional roles:

MANAGER

CASHIER

KITCHEN

WAITER

HOST

Roles must be configurable.

============================================================
20. CUSTOMER
============================================================

Customer capabilities:

browse restaurant

view menu

view table availability

select date

select time

select table

reserve table

pre-order food

make payment where configured

view reservation

cancel according to policy

receive confirmation

============================================================
21. WHITE-LABEL
============================================================

Each tenant can customize:

restaurant name

logo

favicon

primary color

secondary color

background

font configuration

hero image

restaurant images

menu images

contact information

social media

address

phone

WhatsApp

opening hours

description

terms

reservation policy

============================================================
22. BRANDING STORAGE
============================================================

Branding configuration MUST be tenant-specific.

Never hardcode restaurant branding inside source code.

Use:

TenantBranding

Fields:

logo

favicon

primaryColor

secondaryColor

font

heroImage

gallery

socialLinks

contactInfo

============================================================
23. IMAGE MANAGEMENT
============================================================

Tenant Admin must be able to manage all restaurant images.

Categories:

logo

hero

gallery

menu

promotion

table

banner

favicon

Images can be:

uploaded

replaced

deleted

reordered

activated/deactivated

============================================================
24. IMAGE VALIDATION
============================================================

Validate:

file type

file size

dimensions where required

filename

content type

storage path

Prevent:

path traversal

malicious extensions

unsafe uploads

============================================================
25. RESTAURANT PROFILE
============================================================

Tenant Admin can configure:

name

description

address

phone

WhatsApp

email

Instagram

TikTok

Facebook

Google Maps

opening hours

holiday schedule

reservation rules

============================================================
26. TABLE MANAGEMENT
============================================================

Admin can create:

table number

table name

capacity

shape

position

rotation

section

status

minimum reservation time

maximum reservation time

============================================================
27. TABLE TYPES
============================================================

Support:

ROUND

SQUARE

RECTANGLE

BOOTH

BAR

CUSTOM

============================================================
28. VISUAL TABLE LAYOUT
============================================================

Customer sees a visual floor plan.

Example:

        TABLE 01

   ┌─────────────┐
   │             │
   └─────────────┘

       TABLE 02

The actual layout is controlled by tenant.

============================================================
29. TABLE BUILDER
============================================================

Tenant Admin can:

create table

drag table

move table

resize table

rotate table

rename

change capacity

change shape

delete

duplicate

group by section

save layout

============================================================
30. TABLE AVAILABILITY
============================================================

Availability depends on:

date

time

reservation duration

existing reservations

table status

capacity

reservation rules

============================================================
31. RESERVATION MODES
============================================================

MODE 1:

RESERVATION ONLY

Customer:

select date
select time
select table
confirm

MODE 2:

RESERVATION + PRE-ORDER

Customer:

select date
select time
select table
select menu
select quantity
checkout
payment
confirmation

============================================================
32. RESERVATION ENTITY
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
33. RESERVATION STATUS
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
34. RESERVATION CONFLICT PREVENTION
============================================================

The backend MUST prevent:

double booking

overlapping reservation

same table + same slot collision

race conditions

Client-side availability is NOT authoritative.

Use:

database transaction

row locking / appropriate concurrency control

unique constraints where possible

============================================================
35. TIME SLOT
============================================================

Tenant config:

openingTime

closingTime

slotDuration

reservationDuration

bufferTime

Example:

Opening:
10:00

Closing:
22:00

Slot:
30 minutes

Reservation:
120 minutes

Buffer:
15 minutes

============================================================
36. MENU MANAGEMENT
============================================================

Admin can:

create category

create menu

edit menu

delete menu

activate/deactivate

set price

set description

upload image

set availability

set stock

set preparation time

============================================================
37. MENU CATEGORY
============================================================

Examples:

MAIN COURSE

DRINKS

DESSERT

SNACK

COFFEE

SPECIAL

============================================================
38. MENU ITEM
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
39. PRE-ORDER
============================================================

Customer can add:

menu item

quantity

notes

price

subtotal

============================================================
40. ORDER STATUS
============================================================

PENDING

CONFIRMED

PREPARING

READY

SERVED

COMPLETED

CANCELLED

============================================================
41. PAYMENT CONFIGURATION
============================================================

Payment configuration belongs to tenant.

Supported architecture:

PaymentProviderAdapter

Examples:

MIDTRANS

XENDIT

MANUAL_TRANSFER

CASH

OTHER_SUPPORTED_PROVIDER

============================================================
42. PAYMENT MODES
============================================================

FULL_PAYMENT

DEPOSIT

PAY_AT_RESTAURANT

MANUAL_CONFIRMATION

============================================================
43. PAYMENT ABSTRACTION
============================================================

Never hardcode one payment gateway into reservation logic.

Use:

PaymentProvider

createPayment()

getPaymentStatus()

cancelPayment()

refundPayment()

verifyWebhook()

============================================================
44. PAYMENT SECURITY
============================================================

Never store:

raw card number

CVV

payment credentials

in tenant database.

Store only:

provider transaction ID

status

amount

currency

timestamps

safe metadata

============================================================
45. WEBHOOK
============================================================

Payment webhook MUST:

verify signature

validate payload

be idempotent

prevent replay where applicable

update payment transaction

update reservation/order safely

============================================================
46. SUBSCRIPTION
============================================================

Platform-level subscription.

Subscription belongs to:

TENANT

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
47. BILLING CYCLE
============================================================

Support:

MONTHLY

YEARLY

CUSTOM

============================================================
48. SUBSCRIPTION STATUS
============================================================

TRIAL

ACTIVE

PAST_DUE

SUSPENDED

EXPIRED

CANCELLED

============================================================
49. TRIAL TO SUBSCRIPTION
============================================================

Flow:

TRIAL

↓

Client decides to subscribe

↓

Platform Owner activates subscription

↓

Tenant:

ACTIVE

↓

Subscription end date set

============================================================
50. TRIAL EXTENSION
============================================================

SUPER_ADMIN may extend trial.

Example:

Original:

60 days

Extension:

+14 days

All changes MUST be logged.

============================================================
51. TRIAL AUDIT
============================================================

Audit:

trial created

trial extended

trial shortened

trial expired

subscription activated

subscription cancelled

============================================================
52. ACCOUNT PROVISIONING
============================================================

When creating tenant:

Generate:

tenantId

tenantCode

admin user

temporary password

database

database credentials

storage namespace

deployment configuration

branding defaults

trial period

============================================================
53. TENANT ID
============================================================

Tenant ID must be globally unique.

Example:

TEN-2026-8F4K2M

Never use restaurant name alone as tenant identifier.

============================================================
54. TENANT CODE
============================================================

Human-readable code:

DISTRO-AVENUE

or:

RESTO-BOGOR-001

Must also be unique.

============================================================
55. ADMIN ACCOUNT GENERATION
============================================================

Recommended:

email:

owner@tenant-domain.com

OR:

admin email entered during provisioning.

Generate:

temporary password

The password MUST be random and cryptographically secure.

============================================================
56. FIRST LOGIN
============================================================

Tenant admin logs in.

System detects:

mustChangePassword = true

Admin MUST create a new password.

Temporary password becomes invalid.

============================================================
57. PASSWORD SECURITY
============================================================

Use:

Argon2id

or:

bcrypt with secure configuration.

Never store plaintext password.

============================================================
58. CREDENTIAL DELIVERY
============================================================

Provisioning generator may produce:

credentials.txt

BUT:

Do NOT store permanent passwords in logs.

Do NOT commit credentials to Git.

Prefer:

one-time credential display

or secure secret handoff.

============================================================
59. TENANT PROVISIONING GENERATOR
============================================================

Create a dedicated CLI tool:

sibangku tenant create

Example:

sibangku tenant create \
    --name "Distro Avenue Store" \
    --code "DISTRO-AVENUE" \
    --admin-email "owner@example.com" \
    --trial-days 60

============================================================
60. GENERATOR OUTPUT
============================================================

The generator must create:

tenant metadata

database

database migration

storage namespace

branding config

admin account

trial config

web config

APK config

deployment config

============================================================
61. GENERATOR COMMANDS
============================================================

Required:

tenant create

tenant list

tenant inspect

tenant suspend

tenant activate

tenant expire

tenant extend-trial

tenant reset-admin

tenant build

tenant build-web

tenant build-apk

tenant destroy

tenant backup

============================================================
62. TENANT BUILD
============================================================

Command:

sibangku tenant build TEN-2026-8F4K2M

Must generate:

Web

Android APK

configuration

deployment artifacts

============================================================
63. ONE-COMMAND BUILD
============================================================

Required:

sibangku tenant build --all TEN-2026-8F4K2M

Pipeline:

tenant config
      ↓
branding
      ↓
web build
      ↓
Android configuration
      ↓
APK build
      ↓
verification
      ↓
artifacts

============================================================
64. OUTPUT DIRECTORY
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

============================================================
65. APK BRANDING
============================================================

APK should contain tenant-specific:

application name

icon

splash screen

colors

API endpoint

branding

package identifier

Example:

com.sibangku.tenant.distroavenue

Package ID MUST be unique.

============================================================
66. APK PACKAGE ID
============================================================

Never use the same Android package ID for every generated app.

Generate deterministic unique ID:

com.sibangku.<tenant-slug>

Validate Android package naming rules.

============================================================
67. APK SIGNING
============================================================

Production APK/AAB must be signed.

Signing keys MUST NOT be:

committed to Git

included in generated project

exposed in logs

For production:

use secure signing infrastructure.

============================================================
68. WEB DEPLOYMENT
============================================================

Each tenant web application may use:

Vercel

self-hosted

Docker

other supported hosting

Deployment configuration must be tenant-specific.

============================================================
69. DOMAIN
============================================================

Support:

tenant.sibangku.example

OR

custom restaurant domain.

Example:

distroavenue.sibangku.example

Later:

www.distroavenue.com

============================================================
70. API ENDPOINT
============================================================

Each generated web/APK configuration points to the correct
tenant API.

Never allow APK A to accidentally connect to Tenant B.

============================================================
71. TENANT ROUTING
============================================================

Tenant resolution can use:

subdomain

tenant domain

tenant identifier

API configuration

The tenant context MUST be validated server-side.

============================================================
72. TENANT SECURITY BOUNDARY
============================================================

Every request must resolve:

tenant

user

role

database connection

authorization

Never trust:

client-provided tenant ID

without server-side verification.

============================================================
73. DATABASE CONNECTION
============================================================

The tenant database connection must be resolved through the
trusted control plane configuration.

Do not allow a client to submit arbitrary database URLs.

============================================================
74. DATABASE PROVISIONING
============================================================

Provisioning service must:

create database

create credentials

run migrations

seed required defaults

verify connection

mark database READY

============================================================
75. DATABASE STATE
============================================================

PROVISIONING

READY

MIGRATION_FAILED

UNAVAILABLE

ARCHIVED

============================================================
76. DOCKER
============================================================

The platform MUST support Docker.

Recommended services:

control-api

tenant-api

worker

postgres-control

redis

clickhouse optional

web

nginx

For dedicated tenant databases:

each tenant database must have a distinct logical database
or isolated database service according to deployment strategy.

============================================================
77. DEDICATED DATABASE DEPLOYMENT
============================================================

Development:

PostgreSQL instance

    ├── sibangku_control
    ├── tenant_distroavenue
    ├── tenant_restaurant_b
    └── tenant_restaurant_c

Production can use:

separate database servers

or:

separate PostgreSQL clusters

depending on isolation requirements.

The architectural abstraction MUST allow this upgrade.

============================================================
78. CUSTOMER AUTHENTICATION
============================================================

Customers may optionally create accounts.

Support:

guest reservation

email

phone

OTP

account

according to tenant configuration.

============================================================
79. CUSTOMER DATA
============================================================

Tenant database stores only the customer's data belonging to
that restaurant.

Do not share customer profiles between unrelated tenants.

============================================================
80. ADMIN DASHBOARD
============================================================

Tenant Admin Dashboard:

Today

Reservations

Occupied tables

Upcoming reservations

Orders

Revenue

Popular menu

Table utilization

============================================================
81. RESERVATION DASHBOARD
============================================================

Display:

calendar

time slots

tables

reservation status

customer

guest count

order

payment

============================================================
82. TABLE MAP
============================================================

Interactive.

States:

AVAILABLE

SELECTED

RESERVED

OCCUPIED

BLOCKED

MAINTENANCE

============================================================
83. MENU UI
============================================================

Restaurant branded.

Display:

image

name

description

price

availability

category

============================================================
84. CHECKOUT
============================================================

Checkout:

reservation

table

date

time

guest count

pre-order

subtotal

deposit/full payment

fees if applicable

total

payment method

============================================================
85. CONFIRMATION
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

QR code optional

============================================================
86. QR CODE
============================================================

Optional feature.

QR can encode:

reservation ID

signed verification token

Do NOT put sensitive customer data directly into QR.

============================================================
87. NOTIFICATION
============================================================

Optional adapter architecture:

Email

WhatsApp provider

SMS

Push notification

Notifications must not be hardcoded to one provider.

============================================================
88. ADMIN NOTIFICATION
============================================================

Notify tenant admin when:

new reservation

payment received

reservation cancelled

pre-order created

trial approaching expiration

subscription expired

============================================================
89. TRIAL WARNING
============================================================

Example:

7 days remaining

3 days remaining

1 day remaining

Trial expired

Notifications are configurable.

============================================================
90. REPORTING
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
91. PLATFORM REPORTING
============================================================

SUPER_ADMIN:

total tenants

active tenants

trial tenants

expired trials

subscriptions

revenue metadata

provisioning failures

database health

deployment health

============================================================
92. TENANT CREATION FLOW
============================================================

SUPER_ADMIN:

Create Tenant

↓

Restaurant information

↓

Owner information

↓

Trial duration

↓

Branding

↓

Payment configuration

↓

Provision

↓

Database created

↓

Admin created

↓

Web generated

↓

APK generated

↓

Tenant READY

============================================================
93. PROVISIONING STATUS
============================================================

Show:

DATABASE

WEB

APK

STORAGE

AUTH

CONFIGURATION

Each:

PENDING

RUNNING

SUCCESS

FAILED

============================================================
94. PROVISIONING FAILURE
============================================================

If database creation succeeds but APK build fails:

Do NOT destroy everything automatically.

Record:

database SUCCESS

web SUCCESS

apk FAILED

Allow retry.

============================================================
95. IDEMPOTENT PROVISIONING
============================================================

Running provisioning twice must NOT create duplicate:

tenant

database

admin

storage

domain

package ID

============================================================
96. TENANT DELETION
============================================================

Destructive.

Require:

explicit confirmation

tenant code

optional confirmation phrase

Audit log.

Backup before destruction where configured.

============================================================
97. TENANT SUSPENSION
============================================================

Suspended tenant:

API access restricted.

Customer app:

suspended/expired experience.

Admin access:

policy-dependent.

============================================================
98. SUBSCRIPTION EXPIRATION
============================================================

When subscription expires:

ACTIVE

↓

SUBSCRIPTION_EXPIRED

↓

Expired Experience

No customer booking.

No new order.

============================================================
99. PAYMENT FAILURE
============================================================

PAST_DUE

↓

grace period

↓

SUSPENDED

according to configurable billing policy.

============================================================
100. GRACE PERIOD
============================================================

Configurable.

Example:

7 days.

Do not hardcode.

============================================================
101. ADMIN ACCESS AFTER EXPIRATION
============================================================

Default policy:

Tenant Admin can still log in to view billing/subscription
information.

Operational restaurant functions may be disabled.

This policy must be configurable.

============================================================
102. PLATFORM ADMIN ACCESS
============================================================

SUPER_ADMIN retains access to tenant management.

============================================================
103. AUDIT LOG
============================================================

Audit:

tenant created

database created

admin created

trial started

trial extended

trial expired

subscription activated

subscription expired

tenant suspended

tenant activated

APK generated

web generated

branding changed

payment settings changed

admin reset

tenant deleted

============================================================
104. SECURITY
============================================================

Implement:

RBAC

authentication

authorization

password hashing

secure sessions

rate limiting

CSRF where applicable

XSS protection

SQL injection protection

SSRF protection

secure file upload

audit logging

secure secrets

secure headers

============================================================
105. API SECURITY
============================================================

Every API request:

authenticate

resolve tenant

authorize

validate input

execute business logic

return safe response

============================================================
106. TENANT ISOLATION TEST
============================================================

Mandatory test:

User from Tenant A attempts to access Tenant B.

Expected:

403

or:

404

No Tenant B data may be returned.

============================================================
107. DATABASE ISOLATION TEST
============================================================

Tenant A database:

reservation A

Tenant B database:

reservation B

Query from Tenant A:

must never return reservation B.

============================================================
108. APK ISOLATION TEST
============================================================

APK A:

API A

APK B:

API B

Verify APK A cannot be configured by normal client input to
access Tenant B.

============================================================
109. TRIAL SECURITY TEST
============================================================

Manipulate:

localStorage

device date

APK date

browser date

Expected:

trial status remains controlled by server.

============================================================
110. PASSWORD RESET
============================================================

Tenant admin can request password reset.

Use:

one-time token

expiration

secure reset flow.

============================================================
111. ADMIN GENERATOR
============================================================

Create secure credential generation service.

It must generate:

username/email

temporary password

tenant identifier

first-login state

Never use predictable passwords.

============================================================
112. NO SHARED ACCOUNT
============================================================

NEVER:

client A → admin/admin

client B → admin/admin

client C → admin/admin

Instead:

client A → unique admin

client B → unique admin

client C → unique admin

============================================================
113. DEFAULT ACCOUNT POLICY
============================================================

Development:

admin/admin allowed.

Production:

FORBIDDEN.

CI/CD should fail if production seed contains default credentials.

============================================================
114. CONFIGURATION
============================================================

Use:

environment variables

tenant configuration

platform configuration

Never hardcode secrets.

============================================================
115. TENANT CONFIGURATION
============================================================

Example:

tenant.json

{

  "tenantId": "...",

  "name": "...",

  "branding": {

      "primaryColor": "...",

      "logo": "..."

  },

  "api": {

      "baseUrl": "..."

  }

}

No secrets in this file.

============================================================
116. IMAGE STORAGE
============================================================

Recommended:

S3-compatible storage.

Namespace:

tenants/{tenantId}/

Example:

tenants/TEN-2026-8F4K2M/logo.png

============================================================
117. BACKUP
============================================================

Each tenant database must have:

backup policy

retention

restore procedure

backup status.

============================================================
118. RESTORE
============================================================

SUPER_ADMIN can restore tenant database.

Must not overwrite production without confirmation.

============================================================
119. MIGRATIONS
============================================================

Tenant database migrations must be versioned.

Provisioning automatically runs migrations.

============================================================
120. VERSION COMPATIBILITY
============================================================

Every tenant has:

applicationVersion

databaseSchemaVersion

minimumSupportedVersion

============================================================
121. UPDATE STRATEGY
============================================================

Platform Owner can update tenant application.

Before update:

backup

migration check

compatibility check

deployment

health check

rollback if required.

============================================================
122. APK VERSION
============================================================

Store:

versionName

versionCode

tenantId

buildDate

gitCommit

============================================================
123. BUILD METADATA
============================================================

Every generated artifact must contain:

tenant ID

version

build timestamp

build commit

environment

============================================================
124. WEB BUILD
============================================================

Web build must use tenant configuration.

No source-code modification should be required for basic
branding differences.

============================================================
125. APK BUILD
============================================================

APK build must use:

tenant name

tenant icon

tenant package ID

tenant API endpoint

tenant branding

============================================================
126. BUILD CACHE
============================================================

Build system may cache dependencies.

Do not accidentally reuse tenant-specific assets between builds.

============================================================
127. ARTIFACT VALIDATION
============================================================

After build:

verify APK exists

verify package ID

verify application name

verify web build

verify configuration

verify API endpoint

============================================================
128. WEB VALIDATION
============================================================

Run:

build

lint

typecheck

tests

smoke test

============================================================
129. APK VALIDATION
============================================================

Run:

build

unit tests

package validation

manifest validation

API endpoint validation

============================================================
130. DATABASE VALIDATION
============================================================

Verify:

connection

migration

tables

indexes

constraints

seed

============================================================
131. PERFORMANCE
============================================================

Support:

many tenants

large reservations

large menu

large customer records

concurrent reservations

============================================================
132. CONCURRENCY
============================================================

Reservation booking must handle simultaneous requests.

Example:

Customer A selects Table 5.

Customer B selects Table 5.

Same slot.

Only one reservation succeeds.

============================================================
133. IDEMPOTENT PAYMENT
============================================================

Payment callback received twice.

Expected:

one payment state transition.

============================================================
134. IDEMPOTENT RESERVATION
============================================================

Client retries same request.

Expected:

no duplicate reservation.

============================================================
135. API OBSERVABILITY
============================================================

Use:

structured logs

request ID

tenant ID

user ID where safe

latency

error

status

Never log:

password

token

payment secret

API key

============================================================
136. HEALTH ENDPOINT
============================================================

/health

/readiness

/liveness

============================================================
137. TENANT HEALTH
============================================================

Platform Owner can see:

database

API

storage

web

subscription

APK version

last activity

============================================================
138. TESTING
============================================================

Unit tests:

reservation

table availability

pricing

lead/trial calculation

subscription

authentication

authorization

tenant resolution

============================================================
139. INTEGRATION TEST
============================================================

Test:

Tenant provisioning

Database creation

Migration

Admin creation

Trial creation

============================================================
140. E2E TEST
============================================================

Test:

Create tenant

↓

Login admin

↓

Change password

↓

Create table

↓

Create menu

↓

Configure branding

↓

Customer opens web

↓

Select table

↓

Reserve

↓

Pre-order

↓

Payment

↓

Confirmation

============================================================
141. TRIAL E2E
============================================================

Create:

trial = 1 day

Move system clock in test environment

Expected:

ACTIVE

↓

TRIAL_EXPIRED

↓

EXPIRED EXPERIENCE

============================================================
142. MULTI-TENANT E2E
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

different tables

different reservations

different API configuration.

============================================================
143. SECURITY TEST
============================================================

Attempt:

Tenant A token
→ Tenant B endpoint

Expected:

DENIED.

============================================================
144. IMPORTANCE OF SOURCE OF TRUTH
============================================================

The following must always come from server/control plane:

tenant status

trial start

trial end

subscription

database configuration

tenant identity

============================================================
145. CLIENT-SIDE DATA
============================================================

localStorage/AsyncStorage may store:

UI preferences

temporary cache

non-sensitive state

Never use it as the authority for:

trial

subscription

authorization

tenant identity

============================================================
146. MOBILE OFFLINE POLICY
============================================================

If offline:

Customer may see cached non-sensitive UI.

Reservation creation requires server confirmation.

Never confirm a reservation offline unless a future explicit
offline reservation architecture is implemented.

============================================================
147. ADMIN UI
============================================================

Platform Admin:

/platform

Tenant Admin:

/admin

Customer:

/

============================================================
148. PLATFORM ROUTES
============================================================

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
149. TENANT ADMIN ROUTES
============================================================

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
150. CUSTOMER ROUTES
============================================================

/

/menu

/reservation

/table

/checkout

/reservation/[id]

/account

============================================================
151. EXPIRED ROUTE
============================================================

/expired

However:

Prefer external expired experience when deployment architecture
allows it.

============================================================
152. PLATFORM DASHBOARD
============================================================

Metrics:

total tenants

trial

active

past due

suspended

expired

provisioning failures

============================================================
153. TENANT TABLE
============================================================

Columns:

Tenant

Code

Status

Trial

Subscription

Database

Web

APK

Created

Actions

============================================================
154. PROVISIONING UI
============================================================

Wizard:

Restaurant

↓

Owner

↓

Trial

↓

Branding

↓

Payment

↓

Review

↓

Provision

↓

Build

↓

Complete

============================================================
155. BUILD UI
============================================================

Show:

Configuration

Web Build

APK Build

Validation

Artifacts

Deployment

============================================================
156. TENANT ARTIFACT DOWNLOAD
============================================================

SUPER_ADMIN can obtain:

APK

web deployment artifact

configuration

metadata

No permanent credentials should be packaged.

============================================================
157. CUSTOMER APPLICATION DESIGN
============================================================

Each tenant application must visually represent the restaurant.

Do NOT display:

SiBangku platform branding prominently unless required.

White-label experience is primary.

============================================================
158. ADMIN DESIGN
============================================================

Tenant admin UI:

professional

clean

responsive

restaurant-oriented

not overly technical.

============================================================
159. PLATFORM ADMIN DESIGN
============================================================

Platform admin:

technical SaaS control center.

Display:

tenant health

database health

trial status

subscription

deployment

build

logs

============================================================
160. INTERNATIONALIZATION
============================================================

Initial:

Indonesian

English

Tenant may configure default language.

============================================================
161. CURRENCY
============================================================

Tenant configurable.

Default:

IDR

Support:

USD

SGD

MYR

etc.

Use proper currency formatting.

============================================================
162. TIMEZONE
============================================================

Tenant timezone configurable.

Default:

Asia/Jakarta

Store timestamps in UTC.

Render using tenant timezone.

============================================================
163. BUSINESS RULE ENGINE
============================================================

Do not hardcode:

trial duration

reservation duration

slot duration

deposit percentage

cancellation period

grace period

Lead-like business rules

All configurable values belong in configuration.

============================================================
164. CONFIGURATION HIERARCHY
============================================================

Platform defaults

↓

Tenant overrides

↓

Reservation-specific overrides where applicable

============================================================
165. DATA VALIDATION
============================================================

Use strict schemas.

Reject:

invalid dates

invalid times

negative prices

invalid capacity

invalid URLs

invalid email

invalid currency

============================================================
166. API ERROR MODEL
============================================================

Standard:

code

message

requestId

details

timestamp

Do not expose stack traces.

============================================================
167. RATE LIMITING
============================================================

Protect:

login

reservation

payment

password reset

admin API

file upload

public endpoints

============================================================
168. FILE UPLOAD SECURITY
============================================================

Validate:

MIME

extension

size

content

storage path

Tenant isolation.

============================================================
169. CSRF
============================================================

Implement according to authentication architecture.

============================================================
170. XSS
============================================================

Sanitize user-generated:

restaurant description

menu description

notes

customer input

============================================================
171. SQL INJECTION
============================================================

Use parameterized queries/ORM.

Never concatenate raw SQL from user input.

============================================================
172. SECRET MANAGEMENT
============================================================

Never commit:

DATABASE_PASSWORD

JWT_SECRET

API keys

payment secret

APK signing key

storage secret

============================================================
173. ENVIRONMENT
============================================================

Create:

.env.example

Development:

.env.development

Production:

secure deployment secrets.

============================================================
174. DOCKER COMPOSE DEVELOPMENT
============================================================

Must allow:

docker compose up

and launch:

control database

Redis

API

worker

web

tenant database environment.

============================================================
175. CI/CD
============================================================

Pipeline:

install

lint

typecheck

unit tests

integration tests

E2E

build web

build API

build worker

Docker build

security scan

============================================================
176. BUILD ARTIFACT
============================================================

Every tenant build gets:

tenant metadata

web artifact

APK/AAB artifact

deployment configuration

build report

============================================================
177. BUILD REPORT
============================================================

Example:

TENANT BUILD

Tenant:
Distro Avenue Store

Tenant ID:
TEN-2026-8F4K2M

Web:
SUCCESS

APK:
SUCCESS

Database:
READY

Branding:
SUCCESS

Trial:
60 DAYS

Status:
READY

============================================================
178. FAILURE RECOVERY
============================================================

If:

APK fails

allow:

Retry APK

Do not recreate database.

If:

database migration fails

tenant remains:

MIGRATION_FAILED

and provisioning stops.

============================================================
179. ROLLBACK
============================================================

Deployment supports rollback.

At minimum:

previous web version

previous database migration strategy

previous APK version metadata.

============================================================
180. DATABASE MIGRATION SAFETY
============================================================

Before migration:

backup

verify

migrate

health check

============================================================
181. LOG RETENTION
============================================================

Configurable.

Do not retain sensitive credentials.

============================================================
182. DATA PRIVACY
============================================================

Each restaurant owns/control its operational customer data
according to applicable contractual/legal arrangements.

Platform must provide:

data isolation

data deletion

backup strategy

audit

export controls

============================================================
183. PLATFORM OWNER VS TENANT
============================================================

PLATFORM OWNER:

controls infrastructure and subscription.

TENANT:

controls restaurant operation.

CUSTOMER:

uses restaurant services.

============================================================
184. DO NOT MIX ROLES
============================================================

Tenant Admin must NOT automatically become:

Platform Super Admin.

Customer must NOT access:

Platform Admin.

============================================================
185. DEFAULT SEED
============================================================

Development only:

admin/admin

Production:

no default credentials.

============================================================
186. PRODUCTION BOOT
============================================================

Production startup MUST fail or require explicit setup if:

no secure admin

missing secret

invalid database

missing required configuration.

============================================================
187. MONITORING
============================================================

Monitor:

API

worker

database

Redis

tenant database

storage

payment adapter

build service

============================================================
188. TENANT PROVISIONING MONITOR
============================================================

Track:

provision duration

database duration

build duration

failure reason

retry count

============================================================
189. TEST DATA
============================================================

Development seed:

Restaurant A

Restaurant B

Restaurant C

Different:

branding

tables

menu

reservations

users

============================================================
190. NO CROSS-TENANT SEED
============================================================

Tenant A seed must never appear in Tenant B.

============================================================
191. DOCUMENTATION
============================================================

Generate:

README.md

ARCHITECTURE.md

TENANT_MODEL.md

PROVISIONING.md

TRIAL_AND_SUBSCRIPTION.md

DATABASE_ISOLATION.md

APK_BUILD.md

WEB_BUILD.md

DOCKER.md

SECURITY.md

PAYMENT.md

RESERVATION.md

TABLE_LAYOUT.md

DEPLOYMENT.md

TESTING.md

OPERATIONS.md

============================================================
192. CLI DOCUMENTATION
============================================================

Document:

tenant create

tenant list

tenant inspect

tenant build

tenant build-web

tenant build-apk

tenant activate

tenant suspend

tenant extend-trial

tenant expire

tenant reset-admin

tenant backup

tenant destroy

============================================================
193. FINAL ARCHITECTURE
============================================================

ARCHITECTURE:

                  PLATFORM OWNER
                        |
                        ↓
                 CONTROL PLANE
                        |
          ┌─────────────┼─────────────┐
          ↓             ↓             ↓
      TENANT A       TENANT B       TENANT C
          |             |             |
          ↓             ↓             ↓
       WEB A          WEB B          WEB C
          |             |             |
          ↓             ↓             ↓
       APK A          APK B          APK C
          |             |             |
          ↓             ↓             ↓
       DB A           DB B           DB C

Each tenant is isolated.

============================================================
194. PROVISIONING ARCHITECTURE
============================================================

                CREATE TENANT
                     |
                     ↓
              Tenant Generator
                     |
        ┌────────────┼────────────┐
        ↓            ↓            ↓
    Tenant ID    Database      Admin
        |            |            |
        └────────────┼────────────┘
                     ↓
                Trial Config
                     ↓
                  Branding
                     ↓
                Web Build
                     ↓
                APK Build
                     ↓
               Verification
                     ↓
                  READY

============================================================
195. TRIAL ARCHITECTURE
============================================================

Tenant Created

       ↓

Trial Start

       ↓

Trial Active

       ↓

Warning

       ↓

Trial End

       ↓

TRIAL_EXPIRED

       ↓

Expired Experience

============================================================
196. SUBSCRIPTION ARCHITECTURE
============================================================

TRIAL

  ↓

CLIENT AGREES

  ↓

SUBSCRIPTION ACTIVE

  ↓

RENEWAL

  ↓

ACTIVE

or

PAST_DUE

  ↓

GRACE PERIOD

  ↓

SUSPENDED

============================================================
197. CRITICAL DESIGN DECISION
============================================================

NO TRIAL KEY REQUIRED.

NO SHARED ADMIN ACCOUNT.

NO admin/admin FOR CLIENTS.

USE:

Tenant Provisioning

+

Unique Tenant

+

Unique Admin

+

Secure Temporary Password

+

Server-Side Trial

============================================================
198. EXAMPLE
============================================================

Restaurant:

Distro Avenue Store

Tenant:

TEN-2026-8F4K2M

Admin:

owner@distroavenue.example

Temporary password:

GENERATED SECURE VALUE

Trial:

60 days

Database:

tenant_distroavenue

Web:

distroavenue.sibangku.example

APK:

com.sibangku.distroavenue

============================================================
199. FINAL ACCEPTANCE TEST
============================================================

Create Tenant A.

Create Tenant B.

Verify:

A database != B database

A admin != B admin

A branding != B branding

A menu != B menu

A tables != B tables

A reservation != B reservation

A API configuration != B API configuration

============================================================
200. FINAL ACCEPTANCE TEST — TRIAL
============================================================

Create tenant with:

trialDays = 1

Verify:

DAY 0:

TRIAL

DAY 1:

TRIAL_EXPIRED

Customer:

EXPIRED EXPERIENCE

Admin:

billing/subscription access according to policy

============================================================
201. FINAL ACCEPTANCE TEST — PRODUCTION CREDENTIALS
============================================================

Build production tenant.

Verify:

admin/admin does not exist.

Temporary password is unique.

First login requires password change.

Password is hashed.

Password is not present in logs.

============================================================
202. FINAL ACCEPTANCE TEST — APK
============================================================

Generate:

Tenant A APK

Tenant B APK

Verify:

different package IDs

different app names

different icons

different API endpoints

============================================================
203. FINAL ACCEPTANCE TEST — WEBSITE
============================================================

Generate:

Tenant A Web

Tenant B Web

Verify:

different branding

different API configuration

different tenant data.

============================================================
204. FINAL ACCEPTANCE TEST — RESERVATION
============================================================

Two customers attempt:

same table

same date

same time

Expected:

one succeeds.

one receives:

TABLE NO LONGER AVAILABLE.

============================================================
205. FINAL ACCEPTANCE TEST — PAYMENT
============================================================

Send same payment webhook twice.

Expected:

one transaction state transition.

============================================================
206. FINAL ACCEPTANCE TEST — SECURITY
============================================================

Tenant A attempts:

Tenant B API

Tenant B database

Tenant B reservation

Expected:

DENIED.

============================================================
207. FINAL ACCEPTANCE TEST — EXPIRATION
============================================================

Change trial status server-side.

Customer opens application.

Expected:

redirect to expired experience.

Changing local browser date MUST NOT bypass.

============================================================
208. FINAL SYSTEM AUDIT
============================================================

Agent MUST inspect the entire repository.

Find:

TODO

FIXME

NotImplemented

placeholder

fake

dummy

mock

hardcoded

admin/admin

hardcoded tenant

hardcoded branding

hardcoded API

unused route

dead component

unused API

unused service

broken import

security bypass

============================================================
209. INTEGRATION AUDIT
============================================================

Trace:

Platform Admin

↓

Tenant Generator

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

Subscription

↓

Trial

↓

Expiration

↓

Expired Experience

Every path must actually work.

============================================================
210. FINAL REPORT
============================================================

At completion report:

Architecture

Technology Stack

Database Architecture

Tenant Isolation

Control Plane

Tenant Plane

Authentication

Authorization

Provisioning

Trial

Subscription

Reservation

Table Layout

Menu

Pre-order

Payment

Web Generation

APK Generation

Docker

Security

Testing

CI/CD

Deployment

Known Limitations

Remaining Tasks

Production Readiness

============================================================
211. FINAL RULE
============================================================

DO NOT DECLARE COMPLETE UNTIL:

APPLICATION BUILDS

DATABASE MIGRATES

TENANT PROVISIONING WORKS

WEB GENERATION WORKS

APK GENERATION WORKS

ADMIN AUTH WORKS

CUSTOMER AUTH/ACCESS WORKS

TABLE RESERVATION WORKS

MENU WORKS

PRE-ORDER WORKS

PAYMENT ABSTRACTION WORKS

TRIAL WORKS

SUBSCRIPTION WORKS

EXPIRATION WORKS

EXPIRED EXPERIENCE WORKS

DATABASE ISOLATION WORKS

SECURITY TESTS PASS

CROSS-TENANT TESTS PASS

E2E TESTS PASS

DOCKER STARTS

PRODUCTION BUILD PASSES

============================================================
END OF PRD
============================================================