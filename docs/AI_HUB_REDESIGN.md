# AI Hub Redesign — Implementation Plan

> **Status:** Planning
> **Goal:** Replace broken scrape-based search with a reliable search-then-scrape pipeline,
> expand to multiple Indian real estate portals, and upgrade the frontend to match
> what an Indian buyer actually needs.

---

## Why We Are Rebuilding

### Current Architecture (Broken)
```
User fills form
      ↓
Backend builds a 99acres search-results URL
      ↓
Firecrawl scrapes that one page
      ↓
LLM extracts multiple listings from one mixed page
      ↓
Results: PG rooms, rentals, wrong prices
```

### Root Cause
99acres detects Firecrawl as a bot on their search-results pages (high-traffic,
heavily protected). The page served to bots contains mixed buy + rent + PG content.
The budget and property-type filters are ignored server-side for bot traffic.

### New Architecture (Reliable)
```
User fills richer form
      ↓
Backend builds a Google search query
      ↓
firecrawl.search() → returns 8-10 individual property listing URLs
      ↓
Scrape each URL in parallel → each page = exactly ONE property
      ↓
Code-side filter → reject wrong type / over budget
      ↓
AI Service → rank remaining, add per-property insight, return top 6
      ↓
Frontend displays rich cards
```

**Why this works:**
- Individual listing pages have light bot protection compared to search pages
- Google's index is the filter — query says "for sale" so only sale listings come back
- One page = one property = zero mixed-content problem
- URL of the page you scraped IS the property URL — always correct

---

## Phase 1 — Backend: Switch to firecrawl-search (99acres only) ✅ DONE

### 1.1 New `findProperties` flow in `firecrawlService.js`

**Replace:**
`build99acresURL()` → `scrapeUrl(search-results-page)`

**With:**
`buildSearchQuery()` → `firecrawl.search(query)` → `scrapeUrl(each listing URL)` in parallel

**Search query format:**
```
"{bhk} {propertyType} for sale in {locality} {city} under {budget} site:99acres.com"
```

**Examples:**
```
"2BHK flat for sale in Powai Mumbai under 2 crore site:99acres.com"
"3BHK independent house for sale in Koramangala Bangalore under 1.5 crore site:99acres.com"
"villa for sale in Jubilee Hills Hyderabad under 5 crore site:99acres.com"
```

### 1.2 New `findProperties` signature

**Old:**
```js
findProperties(city, maxPrice, propertyCategory, propertyType, limit)
```

**New:**
```js
findProperties({ city, locality, bhk, minPrice, maxPrice, propertyType, possession, limit })
```

New parameters:
- `locality` — specific area within city (optional but high impact)
- `bhk` — "1BHK", "2BHK", "3BHK", "4BHK", "Any"
- `possession` — "ready", "underconstruction", "any"
- `minPrice` — added for completeness

### 1.3 New property schema (richer fields)

Each individual listing page will be scraped for:

| Field | Description |
|-------|-------------|
| `building_name` | Society / project name |
| `builder_name` | Developer / builder |
| `property_type` | Flat / House / Villa etc. |
| `bhk_config` | 2 BHK, 3 BHK etc. |
| `location_address` | Full address with locality |
| `total_price` | Full purchase price (₹) |
| `price_per_sqft` | Per sqft rate |
| `carpet_area_sqft` | Carpet area |
| `superbuiltup_area_sqft` | Super built-up area |
| `floor_number` | Which floor |
| `total_floors` | Total floors in building |
| `possession_status` | Ready / Under Construction + date |
| `facing_direction` | East / West / North / South |
| `parking` | Covered / Open / None |
| `rera_number` | RERA registration (blank if none) |
| `age_of_property` | Years old or new construction |
| `amenities` | Top 5 amenities |
| `nearby_landmarks` | Metro, school, hospital, mall |
| `description` | Brief description |
| `property_url` | The 99acres listing URL (= page scraped) |

### 1.4 Code-side filter after scraping

After parallel scraping, before AI, reject any property where:
- Price contains "/Bed", "/Bedroom", "/Month", "/Day"  → rental/PG
- Price in plain number is below minPrice or above maxPrice
- `property_url` contains "paying-guest", "pg-for-rent", "for-rent"

This is a hard safety net — runs regardless of what LLM does.

### 1.5 Remove old dead code

Once Phase 1 is working, remove:
- `CITY_DATA` map (no longer needed)
- `CITY_ALIASES` map
- `BUDGET_THRESHOLDS` array
- `getBudgetMaxIndex()` function
- `build99acresURL()` function
- `resolveCityFromAPI()` function
- `slugFromLocUrl()` function
- `PROPERTY_TYPE_SLUGS` map
- `PROPERTY_TYPE_IDS` map

This removes ~150 lines of complex code that was fighting 99acres' bot protection.

### 1.6 Update `transformRequest.js` middleware

The frontend sends different fields now. Middleware needs to pass through:
`locality`, `bhk`, `possession` to the controller.

### 1.7 Update `propertyController.js`

- Pass new fields to `findProperties`
- Cache key must include locality + bhk + possession (not just city + price + type)

### 1.8 Debug logs

Keep the existing debug logs but update them to show:
- The search query string
- How many URLs firecrawl-search returned
- Which URLs were scraped
- How many passed the code-side filter

---

## Phase 2 — Backend: Multi-source (MagicBricks + Housing.com) ✅ DONE

### 2.1 Add parallel multi-source search

Run 3 searches in parallel:
```js
const [acres99Results, magicBricksResults, housingResults] = await Promise.allSettled([
  firecrawl.search(`${query} site:99acres.com`),
  firecrawl.search(`${query} site:magicbricks.com`),
  firecrawl.search(`${query} site:housing.com`),
])
```

Collect all URLs, flatten, deduplicate by address similarity.

### 2.2 Add NoBroker as optional toggle

NoBroker is a separate product — "owner direct, no brokerage". Add a toggle in the
frontend: **"Include NoBroker listings"**. When on, also search:
```
firecrawl.search(`${query} site:nobroker.in`)
```
Label NoBroker results with a "No Brokerage" badge.

### 2.3 Source tracking

Each scraped property gets a `source` field:
- `"99acres"`, `"magicbricks"`, `"housing"`, `"nobroker"`

Displayed as a small badge on the property card.

### 2.4 Deduplication logic

Properties from different portals can be the same listing. Deduplicate by:
1. Same building name + same BHK + price within 5% → same property
2. Same address + price within 5% → same property
Keep the one with more complete data (more fields filled).

---

## Phase 3 — AI Service: Upgraded Analysis

### 3.1 New AI prompt structure

Old prompt: "analyze these properties"

New prompt gives AI explicit ranking criteria aligned with Indian buyer priorities:

```
You are an expert Indian real estate advisor.
Rank these {n} properties for a buyer looking for:
{bhk} {type} in {locality}, {city}, budget ₹{min}–₹{max} Crores.

Rank them 1 to {n} based on:
1. Price vs locality average (value for money)
2. Builder reputation
3. Possession status (ready > near-possession > far future)
4. RERA registration (legal safety)
5. Connectivity (metro, schools, hospitals nearby)

For each property, provide:
- match_score (0-100)
- one_line_insight (max 20 words, specific — not generic)
- red_flags (array, empty if none)
- value_verdict: "good_deal" | "fair" | "overpriced"
```

### 3.2 Per-property insight — specific not generic

**Bad (current):** "Modern amenities and good location"
**Good (new):**
- "8% below Powai average, metro in 800m walking distance"
- "Builder delayed previous project by 14 months — possession risk"
- "Only RERA-verified property in this search — legally safest choice"

### 3.3 Red flags system

AI explicitly looks for and flags:
- No RERA number
- Price significantly above area average
- Under-construction with far possession date (2027+)
- Unknown/small builder
- PG or rental that slipped through filter

### 3.4 AI model stays the same

`gpt-4.1-mini` primary, `gpt-4.1-nano` fallback — no changes here.

---

## Phase 4 — Frontend: Form Redesign

### 4.1 New search form fields

**Current fields:** City, Budget (min/max), Property Type, Category
**New fields to add:**

| Field | Type | Values |
|-------|------|--------|
| Locality / Area | Text input with suggestions | "Andheri West", "Powai" etc. |
| BHK Configuration | Pill selector | 1BHK / 2BHK / 3BHK / 4BHK+ / Any |
| Possession | Toggle group | Ready to Move / Under Construction / Any |

Locality is the highest-impact addition. Indians don't buy in "Mumbai",
they buy in "Powai" or "Andheri West". This single field improves result
relevance more than any other change.

### 4.2 Budget input improvement

Current: two plain number inputs
New: Slider + number input with Lakh/Crore formatting

```
Budget: ₹ [50 L] ─────●───────── [2 Cr]
```

Auto-format: type "150" and it shows "₹1.5 Cr", type "50" and it shows "₹50 L"

### 4.3 Form layout

```
┌─────────────────────────────────┐
│  Where?                         │
│  City [Mumbai ▼]                │
│  Area [Powai, Andheri...  ]     │
│                                 │
│  What?                          │
│  [Flat] [House] [Villa] [Plot]  │
│  [1BHK] [2BHK] [3BHK] [4BHK+] │
│                                 │
│  Budget                         │
│  ₹[50L] ────●──── ₹[2Cr]       │
│                                 │
│  Possession                     │
│  ○ Ready  ○ Under Const  ○ Any  │
│                                 │
│  [ Find Properties with AI ]    │
└─────────────────────────────────┘
```

---

## Phase 5 — Frontend: Loading State Redesign

Replace the current spinner with a 3-step progress display.
Each step activates when its backend stage starts.

```
┌─────────────────────────────────────┐
│                                     │
│  ● Searching listings...            │  ← firecrawl-search running
│  ○ Reading property details...      │  ← parallel scrapes
│  ○ Getting AI insights...           │  ← AI service
│                                     │
│  Looking for 2BHK flats in          │
│  Powai, Mumbai under ₹2 Cr          │
│                                     │
└─────────────────────────────────────┘
```

Each step animates to complete (checkmark) when done.
This communicates that the system is working hard — not frozen.

---

## Phase 6 — Frontend: Property Card Redesign

### 6.1 New card structure

```
┌──────────────────────────────────────────┐
│  [Source badge: 99acres / MagicBricks]   │
│                                          │
│  Lodha Amara                             │  ← building_name
│  Thane West, Mumbai                      │  ← locality
│                                          │
│  ₹1.85 Cr          ₹14,200/sqft         │  ← price + per sqft
│  2 BHK · 1,303 sq ft carpet             │  ← bhk + carpet area
│                                          │
│  ✓ Ready to Move   Floor 12 of 32       │  ← possession + floor
│  ✓ RERA Registered ✓ Covered Parking    │  ← trust signals
│                                          │
│  ┌──────────────────────────────────┐   │
│  │  AI: "8% below Powai avg, metro  │   │  ← ai insight
│  │  in 800m. Good value."           │   │
│  └──────────────────────────────────┘   │
│                                          │
│  [View on 99acres ↗]  [+ Compare]       │  ← action buttons
└──────────────────────────────────────────┘
```

### 6.2 Trust signal chips

Show at a glance:
- `✓ RERA` / `⚠ No RERA`
- `✓ Ready to Move` / `📅 Dec 2025` / `🚧 Under Construction`
- `✓ Covered Parking` / `Open Parking` / `No Parking`
- `✓ Verified Builder` (if known builder like Godrej, Lodha, Prestige)

### 6.3 Value verdict badge (from AI)

Small colored badge on card corner:
- 🟢 **Good Deal** — below area average
- 🟡 **Fair Price** — at area average
- 🔴 **Overpriced** — above area average

### 6.4 Red flags display

If AI found red flags, show a collapsible warning:
```
⚠ 1 concern  [▼]
  → Builder has history of delayed possession
```

---

## Phase 7 — Frontend: Property Comparison

### 7.1 Compare flow

- Each card has a `+ Compare` button
- User can select up to 3 properties
- Sticky bottom bar shows selected count: "2 properties selected · [Compare Now]"

### 7.2 Comparison table

```
┌────────────────┬─────────────────┬─────────────────┐
│                │ Lodha Amara     │ Hiranandani Park│
├────────────────┼─────────────────┼─────────────────┤
│ Price          │ ₹1.85 Cr        │ ₹1.92 Cr        │
│ Per sqft       │ ₹14,200         │ ₹16,800         │
│ Carpet area    │ 1,303 sqft      │ 1,140 sqft      │
│ Floor          │ 12 / 32         │ 8 / 18          │
│ Possession     │ Ready to Move   │ Dec 2025        │
│ Parking        │ Covered ✓       │ Open            │
│ RERA           │ ✓               │ ✓               │
│ Builder        │ Lodha           │ Hiranandani     │
│ AI Verdict     │ 🟢 Good Deal    │ 🟡 Fair         │
├────────────────┼─────────────────┼─────────────────┤
│ AI Insight     │ 8% below avg,   │ Premium brand,  │
│                │ metro 800m      │ slightly pricey │
└────────────────┴─────────────────┴─────────────────┘
```

---

## Phase Execution Order

| Phase | Area | Dependency | Effort |
|-------|------|-----------|--------|
| **1** | Backend: firecrawl-search for 99acres | None — start here | High |
| **2** | Backend: Multi-source (MagicBricks + Housing) | Phase 1 done | Medium |
| **3** | AI: Upgraded ranking + insights + red flags | Phase 1 done | Medium |
| **4** | Frontend: Form redesign (locality, BHK, possession) | Phase 1 done | Medium |
| **5** | Frontend: Multi-step loading state | Phase 1 done | Low |
| **6** | Frontend: Richer property cards | Phase 3 done | Medium |
| **7** | Frontend: Comparison table | Phase 6 done | Medium |

**Recommended start:** Phase 1 only. Validate that firecrawl-search returns clean
individual property URLs from 99acres. Test result quality before touching frontend.

---

## What We Are NOT Changing

- Authentication system (protect middleware, JWT)
- User listing CRUD (`/api/user/properties`)
- ImageKit integration
- MongoDB schema for user listings
- Admin panel
- Rate limiting (keep 10 req/IP/hour for AI endpoints)
- API key model (user supplies their own Firecrawl + GitHub Models keys)

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| firecrawl-search uses more credits | High | Medium | 10 req/hour limit already in place |
| Individual pages also get bot-blocked | Low | High | Individual pages have far lighter protection |
| Google search quality varies by city | Medium | Medium | Fall back to single-source if multi-source fails |
| AI hallucination on thin page data | Medium | Medium | Code-side schema validation already in place |
| Comparison UI is complex to build | Low | Low | Phase 7 is last — skip if timeline tight |

---

## Success Criteria

Phase 1 is successful when:
- A search for "2BHK flat Mumbai 2 crore" returns 6 properties
- All 6 have prices in Crores or Lakhs (no `/Bed`, `/Month`, `/Bedroom`)
- All 6 `property_url` links open a for-sale listing on 99acres
- At least 4 of 6 are within the requested budget

Full redesign is successful when an Indian first-time buyer can:
1. Enter city + locality + BHK + budget in under 60 seconds
2. See a loading screen that communicates progress
3. Compare 2-3 shortlisted properties in a table
4. Click a link and land on the exact listing they saw
