# Dependency advisory snapshot

Collected 2026-11-02 using `npm audit --json` after `npm ci --ignore-scripts`. All dependencies included, including development/build dependencies. Counts are affected package entries per app, not unique CVEs or proven reachable exploits. Shared dependencies occur in multiple apps. Raw JSON sits beside this file.

| App | Critical | High | Moderate | Low | Total |
|---|---:|---:|---:|---:|---:|
| backend | 2 | 19 | 4 | 0 | 25 |
| admin | 1 | 16 | 7 | 3 | 27 |
| frontend | 1 | 12 | 2 | 1 | 16 |

## backend

| Package | Locked version(s) | Severity | Direct | npm fix suggestion |
|---|---|---|---|---|
| `@mapbox/node-pre-gyp` | 1.0.11 | high | False | bcrypt@6.0.0; breaking-range change: True |
| `@mendable/firecrawl-js` | 4.16.0 | high | True | @mendable/firecrawl-js@0.0.16; breaking-range change: True |
| `axios` | 1.13.5 | high | True | Available within declared ranges |
| `bcrypt` | 5.1.1 | high | True | bcrypt@6.0.0; breaking-range change: True |
| `body-parser` | 1.20.3 | high | True | Available within declared ranges |
| `brace-expansion` | 1.1.12 | high | False | Available within declared ranges |
| `compression` | 1.8.1 | high | True | Available within declared ranges |
| `express` | 4.21.2 | high | True | Available within declared ranges |
| `firecrawl` | 4.15.2 | high | False | @mendable/firecrawl-js@0.0.16; breaking-range change: True |
| `follow-redirects` | 1.15.11 | moderate | False | Available within declared ranges |
| `form-data` | 4.0.5 | high | False | Available within declared ranges |
| `imagekit` | 6.0.0 | moderate | True | imagekit@1.5.0; breaking-range change: True |
| `jws` | 3.2.2 | high | False | Available within declared ranges |
| `lodash` | 4.17.21 | high | False | Available within declared ranges |
| `minimatch` | 3.1.2 | high | False | Available within declared ranges |
| `mongoose` | 8.9.6 | high | True | Available within declared ranges |
| `nodemailer` | 6.9.16 | high | True | nodemailer@10.3.1; breaking-range change: True |
| `path-to-regexp` | 0.1.12 | high | False | Available within declared ranges |
| `picomatch` | 2.3.1 | high | False | Available within declared ranges |
| `proxy-addr` | 2.0.7 | critical | False | Available within declared ranges |
| `qs` | 6.13.0 | moderate | False | Available within declared ranges |
| `tar` | 6.2.1 | critical | False | bcrypt@6.0.0; breaking-range change: True |
| `uuid` | 13.0.0, 8.3.2 | moderate | True | imagekit@1.5.0; breaking-range change: True |
| `validator` | 13.12.0 | high | True | Available within declared ranges |
| `zod` | 3.25.76, 4.4.3 | high | False | @mendable/firecrawl-js@0.0.16; breaking-range change: True |

### Direct advisory records

**axios**
- [Axios has a NO_PROXY Hostname Normalization Bypass that Leads to SSRF](https://github.com/advisories/GHSA-3p68-rc4w-qgx5) — affected range `>=1.0.0 <1.15.0`.
- [Axios: Authentication Bypass via Prototype Pollution Gadget in `validateStatus` Merge Strategy](https://github.com/advisories/GHSA-w9j2-pvgh-6h63) — affected range `>=1.0.0 <1.15.1`.
- [Axios: Incomplete Fix for CVE-2025-62718 — NO_PROXY Protection Bypassed via RFC 1122 Loopback Subnet (127.0.0.0/8) in Axios 1.15.0](https://github.com/advisories/GHSA-pmwg-cvhr-8vh7) — affected range `>=1.0.0 <1.15.1`.
- [Axios: Invisible JSON Response Tampering via Prototype Pollution Gadget in `parseReviver`](https://github.com/advisories/GHSA-3w6x-2g7m-8v23) — affected range `>=1.0.0 <1.15.2`.
- [Axios: Null Byte Injection via Reverse-Encoding in AxiosURLSearchParams](https://github.com/advisories/GHSA-xhjh-pmcv-23jw) — affected range `>=1.0.0 <1.15.1`.
- [Axios: CRLF Injection in multipart/form-data body via unsanitized blob.type in formDataToStream](https://github.com/advisories/GHSA-445q-vr5w-6q77) — affected range `>=1.0.0 <1.15.1`.
- [Axios: no_proxy bypass via IP alias allows SSRF](https://github.com/advisories/GHSA-m7pr-hjqh-92cm) — affected range `>=1.0.0 <1.15.1`.
- [Axios' HTTP adapter-streamed uploads bypass maxBodyLength when maxRedirects: 0](https://github.com/advisories/GHSA-5c9x-8gcm-mpgx) — affected range `>=1.0.0 <1.15.1`.
- [Axios: HTTP adapter streamed responses bypass maxContentLength](https://github.com/advisories/GHSA-vf2m-468p-8v99) — affected range `>=1.0.0 <1.15.1`.
- [Axios: Prototype Pollution Gadgets - Response Tampering, Data Exfiltration, and Request Hijacking](https://github.com/advisories/GHSA-pf86-5x62-jrwf) — affected range `>=1.0.0 <1.15.1`.
- [Axios: Header Injection via Prototype Pollution](https://github.com/advisories/GHSA-6chq-wfr3-2hj9) — affected range `>=1.0.0 <1.15.1`.
- [Axios: XSRF Token Cross-Origin Leakage via Prototype Pollution Gadget in `withXSRFToken` Boolean Coercion](https://github.com/advisories/GHSA-xx6v-rp6x-q39c) — affected range `>=1.0.0 <1.15.1`.
- [Axios has prototype pollution read-side gadgets in HTTP adapter that allow credential injection and request hijacking](https://github.com/advisories/GHSA-q8qp-cvcw-x6jj) — affected range `>=1.0.0 <1.15.2`.
- [Axios has Unrestricted Cloud Metadata Exfiltration via Header Injection Chain](https://github.com/advisories/GHSA-fvcv-3m26-pcqx) — affected range `>=1.0.0 <1.15.0`.
- [Axios: unbounded recursion in toFormData causes DoS via deeply nested request data](https://github.com/advisories/GHSA-62hf-57xw-28j9) — affected range `>=1.0.0 <1.15.1`.
- [Axios: Regular Expression Denial of Service (ReDoS) via Cookie Name Injection](https://github.com/advisories/GHSA-hfxv-24rg-xrqf) — affected range `>=1.0.0 <1.16.0`.
- [Allocation of Resources Without Limits or Throttling in Axios](https://github.com/advisories/GHSA-777c-7fjr-54vf) — affected range `>=1.7.0 <1.16.0`.
- [Axios: Proxy-Authorization Credential Leak to Origin Server Across HTTP-to-HTTPS Redirect in Axios Node.js HTTP Adapter](https://github.com/advisories/GHSA-p92q-9vqr-4j8v) — affected range `>=1.0.0 <1.16.0`.
- [Axios: Proxy-Authorization header leaks to redirect target when proxy is re-evaluated to direct connection](https://github.com/advisories/GHSA-j5f8-grm9-p9fc) — affected range `>=1.0.0 <1.16.0`.
- [axios Vulnerable to Credential Theft and Response Hijacking via Prototype Pollution Gadget in Config Merge](https://github.com/advisories/GHSA-3g43-6gmg-66jw) — affected range `>=1.0.0 <1.15.2`.
- [axios Vulnerable to Full Man-in-the-Middle via Prototype Pollution Gadget in `config.proxy`](https://github.com/advisories/GHSA-35jp-ww65-95wh) — affected range `>=1.0.0 <1.16.0`.
- [axios has DoS & Header Injection via Prototype Pollution Read-Side Gadgets in axios merge functions](https://github.com/advisories/GHSA-898c-q2cr-xwhg) — affected range `>=1.0.0 <1.16.0`.
- [Axios: Prototype pollution gadgets can alter axios request construction](https://github.com/advisories/GHSA-mmx7-hfxf-jppx) — affected range `>=1.0.0 <1.18.0`.
- [Axios: Deep formToJSON Key Recursion Can Cause Denial of Service](https://github.com/advisories/GHSA-pmv8-rq9r-6j72) — affected range `>=1.0.0 <1.18.0`.
- [Axios: HTTP/2 streamed uploads bypass `maxBodyLength`](https://github.com/advisories/GHSA-mwf2-3pr3-8698) — affected range `>=1.13.0 <1.18.0`.
- [Axios: Nested axios option objects can consume polluted prototype values](https://github.com/advisories/GHSA-7q8q-rj6j-mhjq) — affected range `>=1.0.0 <1.18.0`.
- [Axios: Fetch adapter `ReadableStream` uploads bypass `maxBodyLength`](https://github.com/advisories/GHSA-jqh4-m9w3-8hp9) — affected range `>=1.7.0 <1.18.0`.
- [Axios: Excessive recursion in formDataToJSON can cause denial of service](https://github.com/advisories/GHSA-42h9-826w-cgv3) — affected range `>=1.0.0 <1.18.0`.
- [Axios: Prototype pollution gadget in fetch adapter can alter outbound requests](https://github.com/advisories/GHSA-vh66-26gq-q6x8) — affected range `>=1.7.0 <1.20.0`.
- [Axios: Prototype-Pollution Gadget in the Default Instance Allows Inherited Object.prototype.method to Override HTTP Method](https://github.com/advisories/GHSA-9fr6-4gfg-395g) — affected range `>=1.0.0 <1.20.0`.
- [Axios: HTTP/2 adapter bypasses configured DNS lookup and proxy controls](https://github.com/advisories/GHSA-3pq3-5fj3-cg6v) — affected range `>=1.13.0 <1.20.0`.
- [Axios: Denial of Service via Unhandled 'error' Event in HTTP/2 ClientHttp2Session Initialization](https://github.com/advisories/GHSA-542g-h47m-68v8) — affected range `>=1.13.0 <1.20.0`.
- [Axios: Header Injection via Inherited headers After Minimal Interceptor](https://github.com/advisories/GHSA-j8rh-479h-cp32) — affected range `>=1.0.0 <1.20.0`.
- [Axios: Fetch Adapter Header Injection via Inherited FormData getHeaders](https://github.com/advisories/GHSA-4hqw-qxg8-jxx2) — affected range `>=1.12.0 <1.20.0`.

**body-parser**
- [body-parser vulnerable to denial of service when invalid limit value silently disables size enforcement](https://github.com/advisories/GHSA-v422-hmwv-36x6) — affected range `<1.20.6`.
- [body-parser vulnerable to Denial of Service via trailing bytes after a compressed request body](https://github.com/advisories/GHSA-27r3-jxmh-p828) — affected range `<1.20.9`.

**brace-expansion**
- [brace-expansion: Zero-step sequence causes process hang and memory exhaustion](https://github.com/advisories/GHSA-f886-m6hf-6m8v) — affected range `<1.1.13`.
- [brace-expansion: DoS via exponential-time expansion of consecutive non-expanding {} groups](https://github.com/advisories/GHSA-3jxr-9vmj-r5cp) — affected range `<1.1.16`.
- [brace-expansion: DoS via unbounded expansion length causing an out-of-memory process crash](https://github.com/advisories/GHSA-mh99-v99m-4gvg) — affected range `<1.1.17`.
- [brace-expansion: DoS via unbounded intermediate arrays, bypassing the CVE-2026-14257 mitigation](https://github.com/advisories/GHSA-rgw5-rvv9-x895) — affected range `<1.1.18`.
- [brace-expansion: Quadratic-time expansion of the `{a},b}` rewrite causes CPU denial of service](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr) — affected range `<1.1.21`.
- [brace-expansion: DoS via uncontrolled recursion on nested brace groups causing stack exhaustion](https://github.com/advisories/GHSA-qhr7-859c-m2p7) — affected range `<1.1.20`.
- [brace-expansion: DoS via uncontrolled recursion in parseCommaParts causing stack exhaustion](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p) — affected range `<1.1.19`.

**compression**
- [compression vulnerable to Denial of Service via memory leak on premature response close](https://github.com/advisories/GHSA-vc2v-76pw-4v95) — affected range `<1.8.2`.

**follow-redirects**
- [follow-redirects leaks Custom Authentication Headers to Cross-Domain Redirect Targets](https://github.com/advisories/GHSA-r4q5-vmmm-2653) — affected range `<=1.15.11`.

**form-data**
- [form-data: CRLF injection in form-data via unescaped multipart field names and filenames](https://github.com/advisories/GHSA-hmw2-7cc7-3qxx) — affected range `>=4.0.0 <4.0.6`.

**jws**
- [auth0/node-jws Improperly Verifies HMAC Signature](https://github.com/advisories/GHSA-869p-cjfg-cm3x) — affected range `<3.2.3`.

**lodash**
- [lodash vulnerable to Code Injection via `_.template` imports key names](https://github.com/advisories/GHSA-r5fr-rjxr-66jc) — affected range `>=4.0.0 <=4.17.23`.
- [lodash vulnerable to Prototype Pollution via array path bypass in `_.unset` and `_.omit`](https://github.com/advisories/GHSA-f23m-r3pf-42rh) — affected range `<=4.17.23`.
- [Lodash has Prototype Pollution Vulnerability in `_.unset` and `_.omit` functions](https://github.com/advisories/GHSA-xxjr-mmjv-4gpg) — affected range `>=4.0.0 <=4.17.22`.

**minimatch**
- [minimatch has a ReDoS via repeated wildcards with non-matching literal in pattern](https://github.com/advisories/GHSA-3ppc-4f35-3m26) — affected range `<3.1.3`.
- [minimatch has ReDoS: matchOne() combinatorial backtracking via multiple non-adjacent GLOBSTAR segments](https://github.com/advisories/GHSA-7r86-cg39-jmmj) — affected range `<3.1.3`.
- [minimatch ReDoS: nested *() extglobs generate catastrophically backtracking regular expressions](https://github.com/advisories/GHSA-23c5-xmqv-rm74) — affected range `<3.1.4`.
- [minimatch has potential denial of service via globparts amplification](https://github.com/advisories/GHSA-g3hv-75wg-m249) — affected range `<11.0.1`.

**mongoose**
- [Mongoose's Improper Sanitization of $nor in sanitizeFilter May Allow NoSQL Injection](https://github.com/advisories/GHSA-wpg9-53fq-2r8h) — affected range `>=8.0.0 <=8.22.0`.
- [Mongoose: Prototype pollution in mongoose update casting via __proto__-prefixed dotted path (Schema._getSchema/path getter)](https://github.com/advisories/GHSA-664h-wqgq-64gw) — affected range `>=8.0.0 <8.24.1`.

**nodemailer**
- [Nodemailer: Email to an unintended domain can occur due to Interpretation Conflict](https://github.com/advisories/GHSA-mm7p-fcc7-pg87) — affected range `<7.0.7`.
- [Nodemailer has SMTP command injection due to unsanitized `envelope.size` parameter](https://github.com/advisories/GHSA-c7w3-x93f-qmm8) — affected range `<8.0.4`.
- [Nodemailer Vulnerable to SMTP Command Injection via CRLF in Transport name Option (EHLO/HELO) ](https://github.com/advisories/GHSA-vvjj-xcjg-gr5g) — affected range `<=8.0.4`.
- [Nodemailer: CRLF injection in Nodemailer List-* header comments allows arbitrary message header injection](https://github.com/advisories/GHSA-268h-hp4c-crq3) — affected range `<=8.0.8`.
- [Nodemailer jsonTransport bypasses disableFileAccess and disableUrlAccess during message normalization](https://github.com/advisories/GHSA-wqvq-jvpq-h66f) — affected range `<=8.0.8`.
- [Nodemailer’s addressparser is vulnerable to DoS caused by recursive calls](https://github.com/advisories/GHSA-rcmh-qjqh-p98v) — affected range `>=3.0.0 <=7.0.10`.
- [Nodemailer: Message-level raw option bypasses disableFileAccess/disableUrlAccess, enabling arbitrary file read and full-response SSRF in the delivered message](https://github.com/advisories/GHSA-p6gq-j5cr-w38f) — affected range `<=9.0.0`.
- [Nodemailer: resolveContent() on a MailMessage bypasses disableFileAccess/disableUrlAccess when called with the legacy signature](https://github.com/advisories/GHSA-8m3c-c648-2xjj) — affected range `<=9.1.0`.
- [Nodemailer: IDN/Punycode domain allow-list bypass leads to email delivery to an attacker-controlled domain](https://github.com/advisories/GHSA-wmmp-3585-3rmp) — affected range `<9.1.0`.
- [Nodemailer: Quadratic (O(n²)) time complexity in addressparser allows remote denial of service via a crafted address list](https://github.com/advisories/GHSA-2x7j-588g-ccc2) — affected range `<9.1.0`.
- [Nodemailer: Recipient-domain validation bypass via RFC 5322 comment mis-parsing leads to email delivery to an attacker-controlled domain](https://github.com/advisories/GHSA-cc9r-2j5m-2m83) — affected range `>=6.9.16 <9.1.0`.
- [Nodemailer: Process-global DNS cache reuses TLS `servername` across transports, enabling cross-tenant SMTP credential disclosure](https://github.com/advisories/GHSA-6vj9-mwq6-2f5v) — affected range `>=5.0.0 <10.0.2`.
- [Nodemailer: Nested structured recipient arrays bypass the parser depth limit and cause stack exhaustion DoS](https://github.com/advisories/GHSA-8vvx-rff5-p5rq) — affected range `<10.0.2`.
- [Nodemailer: Quadratic backtracking in the addressparser free-text fallback allows remote denial of service](https://github.com/advisories/GHSA-v53p-9fqp-m79j) — affected range `<=10.0.5`.
- [Nodemailer: Improper TLS Certificate Validation in OAuth2 Token Fetch Enables Credential Interception](https://github.com/advisories/GHSA-r7g4-qg5f-qqm2) — affected range `<=8.0.7`.
- [Nodemailer: Quadratic (O(n^2)) DKIM header unfolding lets a large folded header cause remote denial of service during signing](https://github.com/advisories/GHSA-39m8-27wv-hr27) — affected range `>=3.0.0 <=10.0.9`.
- [Nodemailer: A nested comment ends early in addressparser, releasing the rest of the comment as a recipient](https://github.com/advisories/GHSA-8c8m-p3m8-cjg8) — affected range `>=3.0.0 <10.1.4`.
- [Nodemailer: A ";" inside a quoted string or comment ends an address group early in addressparser, turning display text into a recipient](https://github.com/advisories/GHSA-m943-m63m-w62w) — affected range `>=3.0.0 <10.1.4`.
- [Nodemailer: A ">" inside a quoted local part ends an angle-addr early in addressparser, delivering to a domain the header does not name](https://github.com/advisories/GHSA-85x2-q946-cp5h) — affected range `>=3.0.0 <10.1.4`.
- [Nodemailer: Quadratic backtracking in SMTP AUTH mechanism detection regexes allows pre-auth remote denial of service](https://github.com/advisories/GHSA-4ffr-jq9g-5ffx) — affected range `>=3.0.0 <=10.0.12`.
- [Nodemailer: RFC 5322 comment inside an angle-bracket address is never stripped](https://github.com/advisories/GHSA-g73g-hqqh-jr95) — affected range `>=3.0.0 <=10.0.12`.
- [Nodemailer: Quadratic (O(n^2)) SMTP client reply parsing lets a malicious server or MITM cause a pre-auth remote denial of service](https://github.com/advisories/GHSA-4g23-2xm8-66gc) — affected range `>=3.0.0 <=10.0.9`.

**path-to-regexp**
- [path-to-regexp vulnerable to Regular Expression Denial of Service via multiple route parameters](https://github.com/advisories/GHSA-37ch-88jc-xwx2) — affected range `<0.1.13`.

**picomatch**
- [Picomatch: Method Injection in POSIX Character Classes causes incorrect Glob Matching](https://github.com/advisories/GHSA-3v7f-55p6-f55p) — affected range `<2.3.2`.
- [Picomatch has a ReDoS vulnerability via extglob quantifiers](https://github.com/advisories/GHSA-c2c7-rcm5-vvqj) — affected range `<2.3.2`.

**proxy-addr**
- [proxy-addr vulnerable to IP spoofing via IPv4-mapped IPv6 trust subnet](https://github.com/advisories/GHSA-jqcg-44mw-7w3h) — affected range `>=1.1.0 <2.0.8`.

**qs**
- [qs's arrayLimit bypass in comma parsing allows denial of service](https://github.com/advisories/GHSA-w7fw-mjwx-w883) — affected range `>=6.7.0 <=6.14.1`.
- [qs's arrayLimit bypass in its bracket notation allows DoS via memory exhaustion](https://github.com/advisories/GHSA-6rw7-vpxm-498p) — affected range `<6.14.1`.
- [qs has a remotely triggerable DoS: qs.stringify crashes with TypeError on null/undefined entries in comma-format arrays when encodeValuesOnly is set](https://github.com/advisories/GHSA-q8mj-m7cp-5q26) — affected range `>=6.11.1 <=6.15.1`.
- [qs: Denial of Service via Attacker Controlled isBuffer](https://github.com/advisories/GHSA-4mjr-xmp4-gh2g) — affected range `>=2.2.5 <6.16.0`.
- [qs : qs.stringify with arrayFormat 'comma' throws an uncaught TypeError on array elements carrying a non-callable own toString (DoS)](https://github.com/advisories/GHSA-6pq8-jhm2-2vcw) — affected range `>=6.7.0 <=6.16.0`.

**tar**
- [node-tar Vulnerable to Arbitrary File Creation/Overwrite via Hardlink Path Traversal](https://github.com/advisories/GHSA-34x7-hfp2-rc4v) — affected range `<7.5.7`.
- [node-tar is Vulnerable to Arbitrary File Overwrite and Symlink Poisoning via Insufficient Path Sanitization](https://github.com/advisories/GHSA-8qq5-rm4j-mr97) — affected range `<=7.5.2`.
- [Arbitrary File Read/Write via Hardlink Target Escape Through Symlink Chain in node-tar Extraction](https://github.com/advisories/GHSA-83g3-92jg-28cx) — affected range `<7.5.8`.
- [tar has Hardlink Path Traversal via Drive-Relative Linkpath](https://github.com/advisories/GHSA-qffp-2rhf-9h96) — affected range `<=7.5.9`.
- [node-tar Symlink Path Traversal via Drive-Relative Linkpath](https://github.com/advisories/GHSA-9ppj-qmqm-q256) — affected range `<=7.5.10`.
- [Race Condition in node-tar Path Reservations via Unicode Ligature Collisions on macOS APFS](https://github.com/advisories/GHSA-r6q2-hw4h-h46w) — affected range `<=7.5.3`.
- [node-tar applies PAX size override to intermediary GNU long-name/long-link headers, causing tar parser interpretation differential (file smuggling)](https://github.com/advisories/GHSA-vmf3-w455-68vh) — affected range `<=7.5.15`.
- [node-tar: Process crash via PAX numeric path type confusion](https://github.com/advisories/GHSA-w8wr-v893-vjvp) — affected range `<=7.5.17`.
- [node-tar: Decompression/parse DoS via unlimited input](https://github.com/advisories/GHSA-23hp-3jrh-7fpw) — affected range `<=7.5.18`.
- [node-tar: Negative tar entry size causes infinite loop in archive replace](https://github.com/advisories/GHSA-8x88-c5mf-7j5w) — affected range `<=7.5.17`.
- [node-tar: Uncaught Exception DoS via NUL byte in PAX path/linkpath records](https://github.com/advisories/GHSA-gvwx-54wh-qm9j) — affected range `<=7.5.16`.
- [node-tar: Uncontrolled recursion in mapHas/filesFilter allows uncatchable stack-overflow DoS via crafted long-path tar with member selection](https://github.com/advisories/GHSA-r292-9mhp-454m) — affected range `<=7.5.20`.

**uuid**
- [uuid: Missing buffer bounds check in v3/v5/v6 when buf is provided](https://github.com/advisories/GHSA-w5hq-g745-h8pq) — affected range `<11.1.1`.
- [uuid: Missing buffer bounds check in v3/v5/v6 when buf is provided](https://github.com/advisories/GHSA-w5hq-g745-h8pq) — affected range `>=13.0.0 <13.0.1`.

**validator**
- [validator.js has a URL validation bypass vulnerability in its isURL function](https://github.com/advisories/GHSA-9965-vmph-33xx) — affected range `<13.15.20`.
- [Validator is Vulnerable to Incomplete Filtering of One or More Instances of Special Elements](https://github.com/advisories/GHSA-vghf-hv5q-vc2g) — affected range `<13.15.22`.

**zod**
- [Zod can exhaust memory while validating oversized constrained collections](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) — affected range `<4.6.6`.


## admin

| Package | Locked version(s) | Severity | Direct | npm fix suggestion |
|---|---|---|---|---|
| `@babel/core` | 7.26.0 | low | False | Available within declared ranges |
| `@babel/helpers` | 7.26.0 | moderate | False | Available within declared ranges |
| `@babel/runtime` | 7.26.7 | moderate | False | Available within declared ranges |
| `@eslint/plugin-kit` | 0.2.4 | low | False | Available within declared ranges |
| `@humanfs/node` | 0.16.6 | moderate | False | Available within declared ranges |
| `ajv` | 6.12.6 | moderate | False | Available within declared ranges |
| `axios` | 1.7.9 | high | True | Available within declared ranges |
| `brace-expansion` | 1.1.11, 2.0.1 | high | False | Available within declared ranges |
| `browserslist` | 4.24.3 | high | False | Available within declared ranges |
| `eslint` | 9.17.0 | low | True | Available within declared ranges |
| `flatted` | 3.3.2 | high | False | Available within declared ranges |
| `follow-redirects` | 1.15.9 | moderate | False | Available within declared ranges |
| `form-data` | 4.0.1 | critical | False | Available within declared ranges |
| `glob` | 10.4.5 | high | False | Available within declared ranges |
| `js-yaml` | 4.1.0 | high | False | Available within declared ranges |
| `minimatch` | 3.1.2, 9.0.5 | high | False | Available within declared ranges |
| `nanoid` | 3.3.8 | high | False | Available within declared ranges |
| `picomatch` | 2.3.1 | high | False | Available within declared ranges |
| `postcss` | 8.5.3 | high | True | Available within declared ranges |
| `postcss-selector-parser` | 6.1.2 | moderate | False | Available within declared ranges |
| `react-router` | 7.1.1 | high | False | Available within declared ranges |
| `react-router-dom` | 7.1.1 | high | True | Available within declared ranges |
| `rollup` | 4.34.6 | high | False | Available within declared ranges |
| `source-map-js` | 1.2.1 | high | False | Available within declared ranges |
| `turbo-stream` | 2.4.0 | high | False | Available within declared ranges |
| `vite` | 6.2.1 | high | True | Available within declared ranges |
| `yaml` | 2.7.0 | moderate | False | Available within declared ranges |

### Direct advisory records

**@babel/core**
- [@babel/core: Arbitrary File Read via sourceMappingURL Comment](https://github.com/advisories/GHSA-4x5r-pxfx-6jf8) — affected range `<=7.29.0`.

**@babel/helpers**
- [Babel has inefficient RegExp complexity in generated code with .replace when transpiling named capturing groups](https://github.com/advisories/GHSA-968p-4wvh-cqc8) — affected range `<7.26.10`.

**@babel/runtime**
- [Babel has inefficient RegExp complexity in generated code with .replace when transpiling named capturing groups](https://github.com/advisories/GHSA-968p-4wvh-cqc8) — affected range `<7.26.10`.

**@eslint/plugin-kit**
- [@eslint/plugin-kit is vulnerable to Regular Expression Denial of Service attacks through ConfigCommentParser](https://github.com/advisories/GHSA-xffm-g5w8-qvg7) — affected range `<0.3.4`.

**@humanfs/node**
- [humanfs: Recursive copy follows symlinked files and copies data from outside the source tree](https://github.com/advisories/GHSA-p498-v437-472g) — affected range `<0.16.8`.

**ajv**
- [ajv has ReDoS when using `$data` option](https://github.com/advisories/GHSA-2g4f-4pwh-qvx6) — affected range `<6.14.0`.

**axios**
- [axios Requests Vulnerable To Possible SSRF and Credential Leakage via Absolute URL](https://github.com/advisories/GHSA-jr5f-v2jv-69x6) — affected range `>=1.0.0 <1.8.2`.
- [Axios is vulnerable to DoS attack through lack of data size check](https://github.com/advisories/GHSA-4hjh-wcwx-xvwj) — affected range `>=1.0.0 <1.12.0`.
- [Axios has a NO_PROXY Hostname Normalization Bypass that Leads to SSRF](https://github.com/advisories/GHSA-3p68-rc4w-qgx5) — affected range `>=1.0.0 <1.15.0`.
- [Axios: Authentication Bypass via Prototype Pollution Gadget in `validateStatus` Merge Strategy](https://github.com/advisories/GHSA-w9j2-pvgh-6h63) — affected range `>=1.0.0 <1.15.1`.
- [Axios: Incomplete Fix for CVE-2025-62718 — NO_PROXY Protection Bypassed via RFC 1122 Loopback Subnet (127.0.0.0/8) in Axios 1.15.0](https://github.com/advisories/GHSA-pmwg-cvhr-8vh7) — affected range `>=1.0.0 <1.15.1`.
- [Axios: Invisible JSON Response Tampering via Prototype Pollution Gadget in `parseReviver`](https://github.com/advisories/GHSA-3w6x-2g7m-8v23) — affected range `>=1.0.0 <1.15.2`.
- [Axios: Null Byte Injection via Reverse-Encoding in AxiosURLSearchParams](https://github.com/advisories/GHSA-xhjh-pmcv-23jw) — affected range `>=1.0.0 <1.15.1`.
- [Axios: CRLF Injection in multipart/form-data body via unsanitized blob.type in formDataToStream](https://github.com/advisories/GHSA-445q-vr5w-6q77) — affected range `>=1.0.0 <1.15.1`.
- [Axios: no_proxy bypass via IP alias allows SSRF](https://github.com/advisories/GHSA-m7pr-hjqh-92cm) — affected range `>=1.0.0 <1.15.1`.
- [Axios' HTTP adapter-streamed uploads bypass maxBodyLength when maxRedirects: 0](https://github.com/advisories/GHSA-5c9x-8gcm-mpgx) — affected range `>=1.0.0 <1.15.1`.
- [Axios: HTTP adapter streamed responses bypass maxContentLength](https://github.com/advisories/GHSA-vf2m-468p-8v99) — affected range `>=1.0.0 <1.15.1`.
- [Axios: Prototype Pollution Gadgets - Response Tampering, Data Exfiltration, and Request Hijacking](https://github.com/advisories/GHSA-pf86-5x62-jrwf) — affected range `>=1.0.0 <1.15.1`.
- [Axios: Header Injection via Prototype Pollution](https://github.com/advisories/GHSA-6chq-wfr3-2hj9) — affected range `>=1.0.0 <1.15.1`.
- [Axios: XSRF Token Cross-Origin Leakage via Prototype Pollution Gadget in `withXSRFToken` Boolean Coercion](https://github.com/advisories/GHSA-xx6v-rp6x-q39c) — affected range `>=1.0.0 <1.15.1`.
- [Axios is Vulnerable to Denial of Service via __proto__ Key in mergeConfig](https://github.com/advisories/GHSA-43fc-jf86-j433) — affected range `>=1.0.0 <=1.13.4`.
- [Axios has prototype pollution read-side gadgets in HTTP adapter that allow credential injection and request hijacking](https://github.com/advisories/GHSA-q8qp-cvcw-x6jj) — affected range `>=1.0.0 <1.15.2`.
- [Axios has Unrestricted Cloud Metadata Exfiltration via Header Injection Chain](https://github.com/advisories/GHSA-fvcv-3m26-pcqx) — affected range `>=1.0.0 <1.15.0`.
- [Axios: unbounded recursion in toFormData causes DoS via deeply nested request data](https://github.com/advisories/GHSA-62hf-57xw-28j9) — affected range `>=1.0.0 <1.15.1`.
- [Axios: Regular Expression Denial of Service (ReDoS) via Cookie Name Injection](https://github.com/advisories/GHSA-hfxv-24rg-xrqf) — affected range `>=1.0.0 <1.16.0`.
- [Allocation of Resources Without Limits or Throttling in Axios](https://github.com/advisories/GHSA-777c-7fjr-54vf) — affected range `>=1.7.0 <1.16.0`.
- [Axios: Proxy-Authorization Credential Leak to Origin Server Across HTTP-to-HTTPS Redirect in Axios Node.js HTTP Adapter](https://github.com/advisories/GHSA-p92q-9vqr-4j8v) — affected range `>=1.0.0 <1.16.0`.
- [Axios: Proxy-Authorization header leaks to redirect target when proxy is re-evaluated to direct connection](https://github.com/advisories/GHSA-j5f8-grm9-p9fc) — affected range `>=1.0.0 <1.16.0`.
- [axios Vulnerable to Credential Theft and Response Hijacking via Prototype Pollution Gadget in Config Merge](https://github.com/advisories/GHSA-3g43-6gmg-66jw) — affected range `>=1.0.0 <1.15.2`.
- [axios Vulnerable to Full Man-in-the-Middle via Prototype Pollution Gadget in `config.proxy`](https://github.com/advisories/GHSA-35jp-ww65-95wh) — affected range `>=1.0.0 <1.16.0`.
- [axios has DoS & Header Injection via Prototype Pollution Read-Side Gadgets in axios merge functions](https://github.com/advisories/GHSA-898c-q2cr-xwhg) — affected range `>=1.0.0 <1.16.0`.
- [Axios: Prototype pollution gadgets can alter axios request construction](https://github.com/advisories/GHSA-mmx7-hfxf-jppx) — affected range `>=1.0.0 <1.18.0`.
- [Axios: Deep formToJSON Key Recursion Can Cause Denial of Service](https://github.com/advisories/GHSA-pmv8-rq9r-6j72) — affected range `>=1.0.0 <1.18.0`.
- [Axios: Nested axios option objects can consume polluted prototype values](https://github.com/advisories/GHSA-7q8q-rj6j-mhjq) — affected range `>=1.0.0 <1.18.0`.
- [Axios: Fetch adapter `ReadableStream` uploads bypass `maxBodyLength`](https://github.com/advisories/GHSA-jqh4-m9w3-8hp9) — affected range `>=1.7.0 <1.18.0`.
- [Axios: Excessive recursion in formDataToJSON can cause denial of service](https://github.com/advisories/GHSA-42h9-826w-cgv3) — affected range `>=1.0.0 <1.18.0`.
- [Axios: Prototype pollution gadget in fetch adapter can alter outbound requests](https://github.com/advisories/GHSA-vh66-26gq-q6x8) — affected range `>=1.7.0 <1.20.0`.
- [Axios: Prototype-Pollution Gadget in the Default Instance Allows Inherited Object.prototype.method to Override HTTP Method](https://github.com/advisories/GHSA-9fr6-4gfg-395g) — affected range `>=1.0.0 <1.20.0`.
- [Axios: Header Injection via Inherited headers After Minimal Interceptor](https://github.com/advisories/GHSA-j8rh-479h-cp32) — affected range `>=1.0.0 <1.20.0`.

**brace-expansion**
- [brace-expansion Regular Expression Denial of Service vulnerability](https://github.com/advisories/GHSA-v6h2-p8h4-qcjw) — affected range `>=1.0.0 <=1.1.11`.
- [brace-expansion Regular Expression Denial of Service vulnerability](https://github.com/advisories/GHSA-v6h2-p8h4-qcjw) — affected range `>=2.0.0 <=2.0.1`.
- [brace-expansion: Zero-step sequence causes process hang and memory exhaustion](https://github.com/advisories/GHSA-f886-m6hf-6m8v) — affected range `<1.1.13`.
- [brace-expansion: Zero-step sequence causes process hang and memory exhaustion](https://github.com/advisories/GHSA-f886-m6hf-6m8v) — affected range `>=2.0.0 <2.0.3`.
- [brace-expansion: DoS via exponential-time expansion of consecutive non-expanding {} groups](https://github.com/advisories/GHSA-3jxr-9vmj-r5cp) — affected range `>=2.0.0 <2.1.2`.
- [brace-expansion: DoS via exponential-time expansion of consecutive non-expanding {} groups](https://github.com/advisories/GHSA-3jxr-9vmj-r5cp) — affected range `<1.1.16`.
- [brace-expansion: DoS via unbounded expansion length causing an out-of-memory process crash](https://github.com/advisories/GHSA-mh99-v99m-4gvg) — affected range `<1.1.17`.
- [brace-expansion: DoS via unbounded expansion length causing an out-of-memory process crash](https://github.com/advisories/GHSA-mh99-v99m-4gvg) — affected range `>=2.0.0 <2.1.3`.
- [brace-expansion: DoS via unbounded intermediate arrays, bypassing the CVE-2026-14257 mitigation](https://github.com/advisories/GHSA-rgw5-rvv9-x895) — affected range `>=2.0.0 <2.1.4`.
- [brace-expansion: DoS via unbounded intermediate arrays, bypassing the CVE-2026-14257 mitigation](https://github.com/advisories/GHSA-rgw5-rvv9-x895) — affected range `<1.1.18`.
- [brace-expansion: Quadratic-time expansion of the `{a},b}` rewrite causes CPU denial of service](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr) — affected range `<1.1.21`.
- [brace-expansion: Quadratic-time expansion of the `{a},b}` rewrite causes CPU denial of service](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr) — affected range `>=2.0.0 <2.1.7`.
- [brace-expansion: DoS via uncontrolled recursion on nested brace groups causing stack exhaustion](https://github.com/advisories/GHSA-qhr7-859c-m2p7) — affected range `<1.1.20`.
- [brace-expansion: DoS via uncontrolled recursion on nested brace groups causing stack exhaustion](https://github.com/advisories/GHSA-qhr7-859c-m2p7) — affected range `>=2.0.0 <2.1.6`.
- [brace-expansion: DoS via uncontrolled recursion in parseCommaParts causing stack exhaustion](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p) — affected range `<1.1.19`.
- [brace-expansion: DoS via uncontrolled recursion in parseCommaParts causing stack exhaustion](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p) — affected range `>=2.0.0 <2.1.5`.

**browserslist**
- [Browserslist: Unbounded memory growth (no cache eviction) via distinct query results, leading to eventual OOM](https://github.com/advisories/GHSA-c83g-rgw3-j3cx) — affected range `<=4.28.6`.
- [Browserslist: Uncaught crash / prototype write via untrusted browserslist-stats.json custom stats (normalizeStats)](https://github.com/advisories/GHSA-73wf-gq98-2v4g) — affected range `<=4.28.6`.

**flatted**
- [flatted vulnerable to unbounded recursion DoS in parse() revive phase](https://github.com/advisories/GHSA-25h7-pfq9-p65f) — affected range `<3.4.0`.
- [Prototype Pollution via parse() in NodeJS flatted](https://github.com/advisories/GHSA-rf6f-7fwh-wjgh) — affected range `<=3.4.1`.

**follow-redirects**
- [follow-redirects leaks Custom Authentication Headers to Cross-Domain Redirect Targets](https://github.com/advisories/GHSA-r4q5-vmmm-2653) — affected range `<=1.15.11`.

**form-data**
- [form-data uses unsafe random function in form-data for choosing boundary](https://github.com/advisories/GHSA-fjxv-7rqg-78g4) — affected range `>=4.0.0 <4.0.4`.
- [form-data: CRLF injection in form-data via unescaped multipart field names and filenames](https://github.com/advisories/GHSA-hmw2-7cc7-3qxx) — affected range `>=4.0.0 <4.0.6`.

**glob**
- [glob CLI: Command injection via -c/--cmd executes matches with shell:true](https://github.com/advisories/GHSA-5j98-mcp5-4vw2) — affected range `>=10.2.0 <10.5.0`.
- [Glob: AbortSignal cancellation bypass allows post-timeout filesystem traversal](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4) — affected range `>=9.0.0 <=14.0.1`.

**js-yaml**
- [js-yaml has prototype pollution in merge (<<)](https://github.com/advisories/GHSA-mh29-5h37-fv8m) — affected range `>=4.0.0 <4.1.1`.
- [JS-YAML: Quadratic-complexity DoS in merge key handling via repeated aliases](https://github.com/advisories/GHSA-h67p-54hq-rp68) — affected range `>=4.0.0 <=4.1.1`.
- [js-yaml: YAML merge-key chains can force quadratic CPU consumption](https://github.com/advisories/GHSA-52cp-r559-cp3m) — affected range `>=4.0.0 <4.3.0`.
- [JS-YAML: Quadratic CPU consumption in !!omap resolution (3.x and 4.x) — CVE-2026-59870 fix not backported](https://github.com/advisories/GHSA-5p4m-2wfm-xmqj) — affected range `>=4.0.0 <4.3.1`.
- [js-yaml: maxTotalMergeKeys does not limit CPU use for empty merge sources](https://github.com/advisories/GHSA-2883-xcg3-v3hh) — affected range `>=4.0.0 <4.3.2`.

**minimatch**
- [minimatch has a ReDoS via repeated wildcards with non-matching literal in pattern](https://github.com/advisories/GHSA-3ppc-4f35-3m26) — affected range `<3.1.3`.
- [minimatch has a ReDoS via repeated wildcards with non-matching literal in pattern](https://github.com/advisories/GHSA-3ppc-4f35-3m26) — affected range `>=9.0.0 <9.0.6`.
- [minimatch has ReDoS: matchOne() combinatorial backtracking via multiple non-adjacent GLOBSTAR segments](https://github.com/advisories/GHSA-7r86-cg39-jmmj) — affected range `<3.1.3`.
- [minimatch has ReDoS: matchOne() combinatorial backtracking via multiple non-adjacent GLOBSTAR segments](https://github.com/advisories/GHSA-7r86-cg39-jmmj) — affected range `>=9.0.0 <9.0.7`.
- [minimatch ReDoS: nested *() extglobs generate catastrophically backtracking regular expressions](https://github.com/advisories/GHSA-23c5-xmqv-rm74) — affected range `<3.1.4`.
- [minimatch ReDoS: nested *() extglobs generate catastrophically backtracking regular expressions](https://github.com/advisories/GHSA-23c5-xmqv-rm74) — affected range `>=9.0.0 <9.0.7`.
- [minimatch has potential denial of service via globparts amplification](https://github.com/advisories/GHSA-g3hv-75wg-m249) — affected range `<11.0.1`.

**nanoid**
- [nanoid: non-secure generators can loop indefinitely with negative size](https://github.com/advisories/GHSA-28wg-ghj8-5hjv) — affected range `<3.3.16`.
- [nanoid: custom generators can loop indefinitely when size is zero](https://github.com/advisories/GHSA-2v37-7h3g-55p8) — affected range `<3.3.18`.
- [nanoid: Integer Overflow or Wraparound](https://github.com/advisories/GHSA-xwg4-73v4-xw9w) — affected range `<3.3.12`.

**picomatch**
- [Picomatch: Method Injection in POSIX Character Classes causes incorrect Glob Matching](https://github.com/advisories/GHSA-3v7f-55p6-f55p) — affected range `<2.3.2`.
- [Picomatch has a ReDoS vulnerability via extglob quantifiers](https://github.com/advisories/GHSA-c2c7-rcm5-vvqj) — affected range `<2.3.2`.

**postcss**
- [PostCSS has XSS via Unescaped </style> in its CSS Stringify Output](https://github.com/advisories/GHSA-qx2v-qp2m-jg93) — affected range `<8.5.10`.
- [PostCSS: Arbitrary file read and information disclosure via attacker-controlled sourceMappingURL in CSS comments](https://github.com/advisories/GHSA-6g55-p6wh-862q) — affected range `<=8.5.11`.
- [PostCSS: incomplete fix of GHSA-6g55-p6wh-862q — attacker-controlled sourceMappingURL reads arbitrary .map files when `from` is unset](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp) — affected range `<=8.5.22`.
- [PostCSS: Path Traversal in Previous Source Map Auto-Loading (sourceMappingURL) leads to Arbitrary .map File Disclosure](https://github.com/advisories/GHSA-r28c-9q8g-f849) — affected range `<=8.5.17`.

**postcss-selector-parser**
- [postcss-selector-parser allows denial of service through uncontrolled AST recursion](https://github.com/advisories/GHSA-w9m9-85wc-3x92) — affected range `>=6.1.0 <6.1.3`.
- [PostCSS: Quadratic complexity in flat selector parsing allows CPU exhaustion](https://github.com/advisories/GHSA-rj75-hqrm-r3gf) — affected range `<6.1.5`.

**react-router**
- [React Router vulnerable to XSS via Open Redirects](https://github.com/advisories/GHSA-2w69-qvjg-hvjx) — affected range `>=7.0.0 <=7.11.0`.
- [React Router has unexpected external redirect via untrusted paths](https://github.com/advisories/GHSA-9jcx-v3wj-wh4m) — affected range `>=7.0.0 <7.9.6`.
- [React Router allows pre-render data spoofing on React-Router framework mode](https://github.com/advisories/GHSA-cpj6-fhp6-mr6j) — affected range `>=7.0.0-pre.0 <=7.5.1`.
- [React Router's vendored turbo-stream v2 allows arbitrary constructor invocation via TYPE_ERROR deserialization leading to Unauth RCE](https://github.com/advisories/GHSA-49rj-9fvp-4h2h) — affected range `>=7.0.0 <=7.14.1`.
- [React Router vulnerable to DoS via unbounded path expansion in __manifest endpoint](https://github.com/advisories/GHSA-8x6r-g9mw-2r78) — affected range `>=7.0.0 <7.15.0`.
- [React Router vulnerable to Denial of Service via reflected user input in single-fetch](https://github.com/advisories/GHSA-rxv8-25v2-qmq8) — affected range `>=7.0.0 <7.14.0`.
- [React Router has CSRF issue in Action/Server Action Request Processing](https://github.com/advisories/GHSA-h5cw-625j-3rxh) — affected range `>=7.0.0 <=7.11.0`.
- [React Router: Open redirect via backslash in <Link> and useNavigate (CVE-2025-68470 bypass)](https://github.com/advisories/GHSA-wrjc-x8rr-h8h6) — affected range `>=6.0.0 <7.18.0`.
- [React Router: Arbitrary Constructor Injection via deserializeErrors() in React Router SSR Hydration](https://github.com/advisories/GHSA-337j-9hxr-rhxg) — affected range `>=6.4.0 <7.18.0`.
- [React Router: Unauthenticated Denial of Service via Inefficient Route Matching](https://github.com/advisories/GHSA-chx6-hx7r-mcp5) — affected range `>=7.0.0 <7.18.0`.
- [React Router's same-origin redirect with path starting // causes open redirect via protocol-relative URL reinterpretation](https://github.com/advisories/GHSA-2j2x-hqr9-3h42) — affected range `>=7.0.0 <7.14.1`.
- [React Router SSR XSS in ScrollRestoration](https://github.com/advisories/GHSA-8v8x-cx79-35w7) — affected range `>=7.0.0 <7.12.0`.
- [React Router has XSS Vulnerability](https://github.com/advisories/GHSA-3cgp-3xvw-98x8) — affected range `>=7.0.0 <=7.8.2`.

**rollup**
- [Rollup 4 has Arbitrary File Write via Path Traversal](https://github.com/advisories/GHSA-mw96-cpmx-2vgc) — affected range `>=4.0.0 <4.59.0`.

**source-map-js**
- [source-map-js allows event-loop denial of service through indexed source-map section offsets](https://github.com/advisories/GHSA-68fv-2mgg-jv7q) — affected range `>=1.0.0 <1.2.2`.

**turbo-stream**
- [React Router vulnerable to Denial of Service via reflected user input in single-fetch](https://github.com/advisories/GHSA-rxv8-25v2-qmq8) — affected range `<3.0.0`.

**vite**
- [Vite bypasses server.fs.deny when using ?raw??](https://github.com/advisories/GHSA-x574-m823-4x7w) — affected range `>=6.2.0 <6.2.3`.
- [Vite has an `server.fs.deny` bypass with an invalid `request-target`](https://github.com/advisories/GHSA-356w-63v5-8wf4) — affected range `>=6.2.0 <6.2.6`.
- [Vite's server.fs.deny bypassed with /. for files under project root](https://github.com/advisories/GHSA-859w-5945-r5v3) — affected range `>=6.2.0 <=6.2.6`.
- [Vite allows server.fs.deny to be bypassed with .svg or relative paths](https://github.com/advisories/GHSA-xcj6-pq6g-qj4x) — affected range `>=6.2.0 <6.2.5`.
- [Vite middleware may serve files starting with the same name with the public directory](https://github.com/advisories/GHSA-g4jq-h2w9-997c) — affected range `>=6.0.0 <=6.3.5`.
- [Vite's `server.fs` settings were not applied to HTML files](https://github.com/advisories/GHSA-jqfw-vq24-v9c3) — affected range `>=6.0.0 <=6.3.5`.
- [vite allows server.fs.deny bypass via backslash on Windows](https://github.com/advisories/GHSA-93m4-6634-74q7) — affected range `>=6.0.0 <=6.4.0`.
- [Vite has a `server.fs.deny` bypassed for `inline` and `raw` with `?import` query](https://github.com/advisories/GHSA-4r4m-qw57-chr8) — affected range `>=6.2.0 <6.2.4`.
- [Vite Vulnerable to Path Traversal in Optimized Deps `.map` Handling](https://github.com/advisories/GHSA-4w7w-66w2-5vf9) — affected range `<=6.4.1`.
- [Vite Vulnerable to Arbitrary File Read via Vite Dev Server WebSocket](https://github.com/advisories/GHSA-p9ff-h696-f583) — affected range `>=6.0.0 <=6.4.1`.
- [launch-editor: NTLMv2 hash disclosure via UNC path handling on Windows](https://github.com/advisories/GHSA-v6wh-96g9-6wx3) — affected range `<=6.4.2`.
- [launch-editor: escapeCmdArgs() omits % escaping on Windows](https://github.com/advisories/GHSA-698v-4r3x-3vcv) — affected range `<=6.4.3`.
- [launch-editor: Editor CLI flag misinterpretation causing arbitrary command execution for some editors](https://github.com/advisories/GHSA-r825-w8mm-5pxw) — affected range `<=6.4.3`.
- [launch-editor: `fs.existsSync()` existence check can be bypassed on Windows](https://github.com/advisories/GHSA-587h-7wmj-h5pm) — affected range `<=6.4.3`.
- [Vite: Cross origin script execution through Vite custom middleware](https://github.com/advisories/GHSA-9jrq-w75r-8gcw) — affected range `<=6.4.3`.
- [Vite: Files outside `server.fs.allow` could be served when project paths match system paths on non-Windows machine](https://github.com/advisories/GHSA-rq7h-c2jc-7f22) — affected range `<=6.4.3`.
- [vite: `server.fs.deny` bypass on Windows alternate paths](https://github.com/advisories/GHSA-fx2h-pf6j-xcff) — affected range `<=6.4.2`.

**yaml**
- [yaml is vulnerable to Stack Overflow via deeply nested YAML collections](https://github.com/advisories/GHSA-48c2-rrv3-qjmp) — affected range `>=2.0.0 <2.8.3`.


## frontend

| Package | Locked version(s) | Severity | Direct | npm fix suggestion |
|---|---|---|---|---|
| `@babel/core` | 7.29.0 | low | False | Available within declared ranges |
| `axios` | 1.13.5 | high | True | Available within declared ranges |
| `baseline-browser-mapping` | 2.9.19 | moderate | False | Available within declared ranges |
| `browserslist` | 4.28.1 | high | False | Available within declared ranges |
| `follow-redirects` | 1.15.11 | moderate | False | Available within declared ranges |
| `form-data` | 4.0.5 | high | False | Available within declared ranges |
| `lodash` | 4.17.23 | high | False | Available within declared ranges |
| `nanoid` | 3.3.11 | high | False | Available within declared ranges |
| `picomatch` | 4.0.3 | high | False | Available within declared ranges |
| `postcss` | 8.5.6 | high | False | Available within declared ranges |
| `react-router` | 7.13.0 | high | True | react-router@7.18.5; breaking-range change: False |
| `react-router-dom` | 7.13.0 | high | True | Available within declared ranges |
| `rollup` | 4.57.1 | high | False | Available within declared ranges |
| `source-map-js` | 1.2.1 | high | False | Available within declared ranges |
| `tar` | 7.5.9 | critical | False | Available within declared ranges |
| `vite` | 6.3.5 | high | True | vite@6.4.5; breaking-range change: False |

### Direct advisory records

**@babel/core**
- [@babel/core: Arbitrary File Read via sourceMappingURL Comment](https://github.com/advisories/GHSA-4x5r-pxfx-6jf8) — affected range `<=7.29.0`.

**axios**
- [Axios has a NO_PROXY Hostname Normalization Bypass that Leads to SSRF](https://github.com/advisories/GHSA-3p68-rc4w-qgx5) — affected range `>=1.0.0 <1.15.0`.
- [Axios: Authentication Bypass via Prototype Pollution Gadget in `validateStatus` Merge Strategy](https://github.com/advisories/GHSA-w9j2-pvgh-6h63) — affected range `>=1.0.0 <1.15.1`.
- [Axios: Incomplete Fix for CVE-2025-62718 — NO_PROXY Protection Bypassed via RFC 1122 Loopback Subnet (127.0.0.0/8) in Axios 1.15.0](https://github.com/advisories/GHSA-pmwg-cvhr-8vh7) — affected range `>=1.0.0 <1.15.1`.
- [Axios: Invisible JSON Response Tampering via Prototype Pollution Gadget in `parseReviver`](https://github.com/advisories/GHSA-3w6x-2g7m-8v23) — affected range `>=1.0.0 <1.15.2`.
- [Axios: Null Byte Injection via Reverse-Encoding in AxiosURLSearchParams](https://github.com/advisories/GHSA-xhjh-pmcv-23jw) — affected range `>=1.0.0 <1.15.1`.
- [Axios: CRLF Injection in multipart/form-data body via unsanitized blob.type in formDataToStream](https://github.com/advisories/GHSA-445q-vr5w-6q77) — affected range `>=1.0.0 <1.15.1`.
- [Axios: no_proxy bypass via IP alias allows SSRF](https://github.com/advisories/GHSA-m7pr-hjqh-92cm) — affected range `>=1.0.0 <1.15.1`.
- [Axios' HTTP adapter-streamed uploads bypass maxBodyLength when maxRedirects: 0](https://github.com/advisories/GHSA-5c9x-8gcm-mpgx) — affected range `>=1.0.0 <1.15.1`.
- [Axios: HTTP adapter streamed responses bypass maxContentLength](https://github.com/advisories/GHSA-vf2m-468p-8v99) — affected range `>=1.0.0 <1.15.1`.
- [Axios: Prototype Pollution Gadgets - Response Tampering, Data Exfiltration, and Request Hijacking](https://github.com/advisories/GHSA-pf86-5x62-jrwf) — affected range `>=1.0.0 <1.15.1`.
- [Axios: Header Injection via Prototype Pollution](https://github.com/advisories/GHSA-6chq-wfr3-2hj9) — affected range `>=1.0.0 <1.15.1`.
- [Axios: XSRF Token Cross-Origin Leakage via Prototype Pollution Gadget in `withXSRFToken` Boolean Coercion](https://github.com/advisories/GHSA-xx6v-rp6x-q39c) — affected range `>=1.0.0 <1.15.1`.
- [Axios has prototype pollution read-side gadgets in HTTP adapter that allow credential injection and request hijacking](https://github.com/advisories/GHSA-q8qp-cvcw-x6jj) — affected range `>=1.0.0 <1.15.2`.
- [Axios has Unrestricted Cloud Metadata Exfiltration via Header Injection Chain](https://github.com/advisories/GHSA-fvcv-3m26-pcqx) — affected range `>=1.0.0 <1.15.0`.
- [Axios: unbounded recursion in toFormData causes DoS via deeply nested request data](https://github.com/advisories/GHSA-62hf-57xw-28j9) — affected range `>=1.0.0 <1.15.1`.
- [Axios: Regular Expression Denial of Service (ReDoS) via Cookie Name Injection](https://github.com/advisories/GHSA-hfxv-24rg-xrqf) — affected range `>=1.0.0 <1.16.0`.
- [Allocation of Resources Without Limits or Throttling in Axios](https://github.com/advisories/GHSA-777c-7fjr-54vf) — affected range `>=1.7.0 <1.16.0`.
- [Axios: Proxy-Authorization Credential Leak to Origin Server Across HTTP-to-HTTPS Redirect in Axios Node.js HTTP Adapter](https://github.com/advisories/GHSA-p92q-9vqr-4j8v) — affected range `>=1.0.0 <1.16.0`.
- [Axios: Proxy-Authorization header leaks to redirect target when proxy is re-evaluated to direct connection](https://github.com/advisories/GHSA-j5f8-grm9-p9fc) — affected range `>=1.0.0 <1.16.0`.
- [axios Vulnerable to Credential Theft and Response Hijacking via Prototype Pollution Gadget in Config Merge](https://github.com/advisories/GHSA-3g43-6gmg-66jw) — affected range `>=1.0.0 <1.15.2`.
- [axios Vulnerable to Full Man-in-the-Middle via Prototype Pollution Gadget in `config.proxy`](https://github.com/advisories/GHSA-35jp-ww65-95wh) — affected range `>=1.0.0 <1.16.0`.
- [axios has DoS & Header Injection via Prototype Pollution Read-Side Gadgets in axios merge functions](https://github.com/advisories/GHSA-898c-q2cr-xwhg) — affected range `>=1.0.0 <1.16.0`.
- [Axios: Prototype pollution gadgets can alter axios request construction](https://github.com/advisories/GHSA-mmx7-hfxf-jppx) — affected range `>=1.0.0 <1.18.0`.
- [Axios: Deep formToJSON Key Recursion Can Cause Denial of Service](https://github.com/advisories/GHSA-pmv8-rq9r-6j72) — affected range `>=1.0.0 <1.18.0`.
- [Axios: HTTP/2 streamed uploads bypass `maxBodyLength`](https://github.com/advisories/GHSA-mwf2-3pr3-8698) — affected range `>=1.13.0 <1.18.0`.
- [Axios: Nested axios option objects can consume polluted prototype values](https://github.com/advisories/GHSA-7q8q-rj6j-mhjq) — affected range `>=1.0.0 <1.18.0`.
- [Axios: Fetch adapter `ReadableStream` uploads bypass `maxBodyLength`](https://github.com/advisories/GHSA-jqh4-m9w3-8hp9) — affected range `>=1.7.0 <1.18.0`.
- [Axios: Excessive recursion in formDataToJSON can cause denial of service](https://github.com/advisories/GHSA-42h9-826w-cgv3) — affected range `>=1.0.0 <1.18.0`.
- [Axios: Prototype pollution gadget in fetch adapter can alter outbound requests](https://github.com/advisories/GHSA-vh66-26gq-q6x8) — affected range `>=1.7.0 <1.20.0`.
- [Axios: Prototype-Pollution Gadget in the Default Instance Allows Inherited Object.prototype.method to Override HTTP Method](https://github.com/advisories/GHSA-9fr6-4gfg-395g) — affected range `>=1.0.0 <1.20.0`.
- [Axios: HTTP/2 adapter bypasses configured DNS lookup and proxy controls](https://github.com/advisories/GHSA-3pq3-5fj3-cg6v) — affected range `>=1.13.0 <1.20.0`.
- [Axios: Denial of Service via Unhandled 'error' Event in HTTP/2 ClientHttp2Session Initialization](https://github.com/advisories/GHSA-542g-h47m-68v8) — affected range `>=1.13.0 <1.20.0`.
- [Axios: Header Injection via Inherited headers After Minimal Interceptor](https://github.com/advisories/GHSA-j8rh-479h-cp32) — affected range `>=1.0.0 <1.20.0`.
- [Axios: Fetch Adapter Header Injection via Inherited FormData getHeaders](https://github.com/advisories/GHSA-4hqw-qxg8-jxx2) — affected range `>=1.12.0 <1.20.0`.

**baseline-browser-mapping**
- [baseline-browser-mapping process termination on invalid input causes denial of service](https://github.com/advisories/GHSA-w5vr-8v7q-w6rv) — affected range `>=2.0.0 <2.11.0`.

**browserslist**
- [Browserslist: Unbounded memory growth (no cache eviction) via distinct query results, leading to eventual OOM](https://github.com/advisories/GHSA-c83g-rgw3-j3cx) — affected range `<=4.28.6`.
- [Browserslist: Uncaught crash / prototype write via untrusted browserslist-stats.json custom stats (normalizeStats)](https://github.com/advisories/GHSA-73wf-gq98-2v4g) — affected range `<=4.28.6`.

**follow-redirects**
- [follow-redirects leaks Custom Authentication Headers to Cross-Domain Redirect Targets](https://github.com/advisories/GHSA-r4q5-vmmm-2653) — affected range `<=1.15.11`.

**form-data**
- [form-data: CRLF injection in form-data via unescaped multipart field names and filenames](https://github.com/advisories/GHSA-hmw2-7cc7-3qxx) — affected range `>=4.0.0 <4.0.6`.

**lodash**
- [lodash vulnerable to Code Injection via `_.template` imports key names](https://github.com/advisories/GHSA-r5fr-rjxr-66jc) — affected range `>=4.0.0 <=4.17.23`.
- [lodash vulnerable to Prototype Pollution via array path bypass in `_.unset` and `_.omit`](https://github.com/advisories/GHSA-f23m-r3pf-42rh) — affected range `<=4.17.23`.

**nanoid**
- [nanoid: non-secure generators can loop indefinitely with negative size](https://github.com/advisories/GHSA-28wg-ghj8-5hjv) — affected range `<3.3.16`.
- [nanoid: custom generators can loop indefinitely when size is zero](https://github.com/advisories/GHSA-2v37-7h3g-55p8) — affected range `<3.3.18`.
- [nanoid: Integer Overflow or Wraparound](https://github.com/advisories/GHSA-xwg4-73v4-xw9w) — affected range `<3.3.12`.

**picomatch**
- [Picomatch: Method Injection in POSIX Character Classes causes incorrect Glob Matching](https://github.com/advisories/GHSA-3v7f-55p6-f55p) — affected range `>=4.0.0 <4.0.4`.
- [Picomatch has a ReDoS vulnerability via extglob quantifiers](https://github.com/advisories/GHSA-c2c7-rcm5-vvqj) — affected range `>=4.0.0 <4.0.4`.

**postcss**
- [PostCSS has XSS via Unescaped </style> in its CSS Stringify Output](https://github.com/advisories/GHSA-qx2v-qp2m-jg93) — affected range `<8.5.10`.
- [PostCSS: Arbitrary file read and information disclosure via attacker-controlled sourceMappingURL in CSS comments](https://github.com/advisories/GHSA-6g55-p6wh-862q) — affected range `<=8.5.11`.
- [PostCSS: incomplete fix of GHSA-6g55-p6wh-862q — attacker-controlled sourceMappingURL reads arbitrary .map files when `from` is unset](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp) — affected range `<=8.5.22`.
- [PostCSS: Path Traversal in Previous Source Map Auto-Loading (sourceMappingURL) leads to Arbitrary .map File Disclosure](https://github.com/advisories/GHSA-r28c-9q8g-f849) — affected range `<=8.5.17`.

**react-router**
- [React Router's vendored turbo-stream v2 allows arbitrary constructor invocation via TYPE_ERROR deserialization leading to Unauth RCE](https://github.com/advisories/GHSA-49rj-9fvp-4h2h) — affected range `>=7.0.0 <=7.14.1`.
- [React Router vulnerable to XSS in unstable RSC redirect handling via javascript: redirect targets](https://github.com/advisories/GHSA-8646-j5j9-6r62) — affected range `>=7.7.0 <7.13.2`.
- [React Router vulnerable to DoS via unbounded path expansion in __manifest endpoint](https://github.com/advisories/GHSA-8x6r-g9mw-2r78) — affected range `>=7.0.0 <7.15.0`.
- [React Router vulnerable to Denial of Service via reflected user input in single-fetch](https://github.com/advisories/GHSA-rxv8-25v2-qmq8) — affected range `>=7.0.0 <7.14.0`.
- [React Router: Potential CSRF via PUT/PATCH/DELETE document requests](https://github.com/advisories/GHSA-84g9-w2xq-vcv6) — affected range `>=7.12.0 <7.15.1`.
- [React Router: Open redirect via backslash in <Link> and useNavigate (CVE-2025-68470 bypass)](https://github.com/advisories/GHSA-wrjc-x8rr-h8h6) — affected range `>=6.0.0 <7.18.0`.
- [React Router: RSCErrorHandler Missing Protocol Validation (XSS)](https://github.com/advisories/GHSA-h8fp-f39c-q6mh) — affected range `>=7.11.0 <7.18.0`.
- [React Router: Arbitrary Constructor Injection via deserializeErrors() in React Router SSR Hydration](https://github.com/advisories/GHSA-337j-9hxr-rhxg) — affected range `>=6.4.0 <7.18.0`.
- [React Router: Unauthenticated Denial of Service via Inefficient Route Matching](https://github.com/advisories/GHSA-chx6-hx7r-mcp5) — affected range `>=7.0.0 <7.18.0`.
- [React Router's same-origin redirect with path starting // causes open redirect via protocol-relative URL reinterpretation](https://github.com/advisories/GHSA-2j2x-hqr9-3h42) — affected range `>=7.0.0 <7.14.1`.
- [React Router: RSC Mode CSRF Bypass Allows Action Execution Before 400 Response](https://github.com/advisories/GHSA-qwww-vcr4-c8h2) — affected range `>=7.12.0 <7.18.2`.
- [React Router has stored XSS via unescaped Location header in prerendered redirect HTML](https://github.com/advisories/GHSA-f22v-gfqf-p8f3) — affected range `>=7.5.1 <7.13.2`.

**rollup**
- [Rollup 4 has Arbitrary File Write via Path Traversal](https://github.com/advisories/GHSA-mw96-cpmx-2vgc) — affected range `>=4.0.0 <4.59.0`.

**source-map-js**
- [source-map-js allows event-loop denial of service through indexed source-map section offsets](https://github.com/advisories/GHSA-68fv-2mgg-jv7q) — affected range `>=1.0.0 <1.2.2`.

**tar**
- [tar has Hardlink Path Traversal via Drive-Relative Linkpath](https://github.com/advisories/GHSA-qffp-2rhf-9h96) — affected range `<=7.5.9`.
- [node-tar Symlink Path Traversal via Drive-Relative Linkpath](https://github.com/advisories/GHSA-9ppj-qmqm-q256) — affected range `<=7.5.10`.
- [node-tar applies PAX size override to intermediary GNU long-name/long-link headers, causing tar parser interpretation differential (file smuggling)](https://github.com/advisories/GHSA-vmf3-w455-68vh) — affected range `<=7.5.15`.
- [node-tar: Process crash via PAX numeric path type confusion](https://github.com/advisories/GHSA-w8wr-v893-vjvp) — affected range `<=7.5.17`.
- [node-tar: Decompression/parse DoS via unlimited input](https://github.com/advisories/GHSA-23hp-3jrh-7fpw) — affected range `<=7.5.18`.
- [node-tar: Negative tar entry size causes infinite loop in archive replace](https://github.com/advisories/GHSA-8x88-c5mf-7j5w) — affected range `<=7.5.17`.
- [node-tar: Uncaught Exception DoS via NUL byte in PAX path/linkpath records](https://github.com/advisories/GHSA-gvwx-54wh-qm9j) — affected range `<=7.5.16`.
- [node-tar: Uncontrolled recursion in mapHas/filesFilter allows uncatchable stack-overflow DoS via crafted long-path tar with member selection](https://github.com/advisories/GHSA-r292-9mhp-454m) — affected range `<=7.5.20`.

**vite**
- [Vite middleware may serve files starting with the same name with the public directory](https://github.com/advisories/GHSA-g4jq-h2w9-997c) — affected range `>=6.0.0 <=6.3.5`.
- [Vite's `server.fs` settings were not applied to HTML files](https://github.com/advisories/GHSA-jqfw-vq24-v9c3) — affected range `>=6.0.0 <=6.3.5`.
- [vite allows server.fs.deny bypass via backslash on Windows](https://github.com/advisories/GHSA-93m4-6634-74q7) — affected range `>=6.0.0 <=6.4.0`.
- [Vite Vulnerable to Path Traversal in Optimized Deps `.map` Handling](https://github.com/advisories/GHSA-4w7w-66w2-5vf9) — affected range `<=6.4.1`.
- [Vite Vulnerable to Arbitrary File Read via Vite Dev Server WebSocket](https://github.com/advisories/GHSA-p9ff-h696-f583) — affected range `>=6.0.0 <=6.4.1`.
- [launch-editor: NTLMv2 hash disclosure via UNC path handling on Windows](https://github.com/advisories/GHSA-v6wh-96g9-6wx3) — affected range `<=6.4.2`.
- [launch-editor: escapeCmdArgs() omits % escaping on Windows](https://github.com/advisories/GHSA-698v-4r3x-3vcv) — affected range `<=6.4.3`.
- [launch-editor: Editor CLI flag misinterpretation causing arbitrary command execution for some editors](https://github.com/advisories/GHSA-r825-w8mm-5pxw) — affected range `<=6.4.3`.
- [launch-editor: `fs.existsSync()` existence check can be bypassed on Windows](https://github.com/advisories/GHSA-587h-7wmj-h5pm) — affected range `<=6.4.3`.
- [Vite: Cross origin script execution through Vite custom middleware](https://github.com/advisories/GHSA-9jrq-w75r-8gcw) — affected range `<=6.4.3`.
- [Vite: Files outside `server.fs.allow` could be served when project paths match system paths on non-Windows machine](https://github.com/advisories/GHSA-rq7h-c2jc-7f22) — affected range `<=6.4.3`.
- [vite: `server.fs.deny` bypass on Windows alternate paths](https://github.com/advisories/GHSA-fx2h-pf6j-xcff) — affected range `<=6.4.2`.

## Independent advisory cross-check

Multer `1.4.5-lts.1` is locked and used by upload routes, but absent from the npm snapshot. The maintainer advisory [GHSA-44fp-w29j-9vj5](https://github.com/expressjs/multer/security/advisories/GHSA-44fp-w29j-9vj5) explicitly affects versions below 2.0.0. Review the [current complete maintainer list](https://github.com/expressjs/multer/security/advisories) before choosing an upgrade; 2.0.0 was the fix for that historical advisory, not a claim that it fixes every later advisory.

**Do not run `npm audit fix --force` blindly.** npm suggests downgrading Firecrawl to 0.0.16 and ImageKit to 1.5.0; these are not reviewed or acceptable automatic remediations. Upgrade or replace packages deliberately, inspect transitive trees, retest integrations, and regenerate lockfiles. Many SSR/RSC, Node HTTP adapter, archive extraction, or dev-server advisories need reachability analysis for this browser SPA/runtime.
