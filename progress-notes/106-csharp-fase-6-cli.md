# C# FASE 6: Console CLI Administrative Client

**Status:** ✅ COMPLETED  
**Tanggal Mulai:** 2026-08-30  
**Terakhir Update:** 2026-08-30T19:08:00+07:00

## Yang Sudah Dikerjakan

### Console Admin CLI Client
- [x] Created [src/SiBangku.Cli/Program.cs](file:///D:/sertifikat/Apk_SiBangku/src/SiBangku.Cli/Program.cs):
  - Added support for loading JWT token and API URL configurations from the local user profile folder (`~/.sibangku-cli-config.json`).
  - Added parameter commands:
    - `login <email> <password>`: Logs in to the Control API and stores the session token.
    - `tenant list`: Retrieves and displays all tenant metadata in formatted console tables.
    - `tenant create <name> <resto> <email> [days]`: Dynamically provisions a new tenant.
    - `tenant extend <tenantId> <days>`: Extends tenant trial periods.
    - `tenant delete <tenantId>`: Warns and drops tenant databases and configurations.
    - `audit`: Lists recent system logs in a formatted table.
    - `help`: Explains usage guidelines.

### Verification
- [x] Verified full C# solution builds with 0 errors and 0 warnings.
- [x] Verified C# test suite runs and passes (14/14 tests passed).

## Yang Belum / Selanjutnya
- [ ] C# FASE 7: Blazor Web App (replacement of Next.js booking/admin portals using Blazor SSR/WASM).

## Keputusan Arsitektur
1. **Config Storage Location**: Saved settings inside `.sibangku-cli-config.json` in the user's special profile directory (`Environment.SpecialFolder.UserProfile`) to enable global executions on terminal consoles.
2. **Zero Dependency Args Parser**: Program arguments parsing is managed through native string routing arrays to keep binary compilation outputs lightweight.
3. **HttpClient Integration**: Leveraged `.PostAsJsonAsync()` and `.GetFromJsonAsync()` to handle fast JSON serialization without manual byte conversions.
