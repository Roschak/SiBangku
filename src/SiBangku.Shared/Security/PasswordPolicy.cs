using System;
using System.Collections.Generic;
using System.Linq;

namespace SiBangku.Shared.Security
{
    /// <summary>Outcome of a password policy check.</summary>
    public sealed record PasswordPolicyResult(bool IsValid, IReadOnlyList<string> Errors)
    {
        /// <summary>Errors joined into a single sentence suitable for an API message.</summary>
        public string ErrorSummary => string.Join(" ", Errors);
    }

    /// <summary>
    /// Single source of truth for password strength, applied server-side by every
    /// endpoint that sets or resets a credential. Client-side hints mirror these
    /// rules for UX only - the server is authoritative.
    /// </summary>
    public static class PasswordPolicy
    {
        public const int MinimumLength = 12;
        public const int MaximumLength = 128;

        /// <summary>Human-readable rule list, used verbatim in UI hints.</summary>
        public const string RequirementsSummary =
            "Minimal 12 karakter, maksimal 128 karakter, serta memuat minimal 3 dari 4 jenis karakter " +
            "(huruf kecil, huruf besar, angka, simbol).";

        /// <summary>
        /// Short, high-frequency passwords. This is deliberately small and
        /// focused: it stops the obvious guesses that survive a length/complexity
        /// check (e.g. "Password123!"), not a substitute for a breach-corpus check.
        /// </summary>
        private static readonly HashSet<string> Blocklist = new(StringComparer.OrdinalIgnoreCase)
        {
            "password", "password1", "password123", "password1234", "password12345",
            "passw0rd", "p@ssword", "p@ssw0rd", "passwords", "passwordpassword",
            "123456", "1234567", "12345678", "123456789", "1234567890", "12345678901",
            "123456789012", "11111111", "22222222", "00000000", "88888888",
            "qwerty", "qwerty123", "qwertyuiop", "qwertyuiop123",
            "iloveyou", "welcome", "welcome1", "welcome123", "admin", "admin123",
            "administrator", "administrator123", "letmein", "letmein123",
            "abc12345", "abcd1234", "a1b2c3d4", "changeme", "changeme123",
            "secret", "secret123", "default", "default123", "root", "toor",
            "monkey123", "dragon123", "sunshine1", "princess1", "football1",
            "sibangku", "sibangku123", "sibangkupassword", "restaurant1", "reservasi123"
        };

        /// <summary>
        /// Tokens that must never appear inside a password. These are the words a
        /// guesser tries first for this product (brand, role, and the usual
        /// "secure-looking" filler), so a password built around them is rejected
        /// no matter how many character classes it mixes.
        /// </summary>
        private static readonly string[] ReservedTokens =
        {
            "sibangku", "password", "passw0rd", "qwerty", "admin", "administrator",
            "welcome", "letmein", "changeme", "secret", "default", "iloveyou",
            "monkey", "dragon", "football", "princess", "sunshine",
            "reservasi", "restaurant", "restoran"
        };

        /// <summary>
        /// Validates a password against the platform policy.
        /// </summary>
        /// <param name="password">The candidate password.</param>
        /// <param name="userContext">
        /// Optional username/email of the account. When supplied, a password that
        /// simply repeats the account name is rejected.
        /// </param>
        public static PasswordPolicyResult Validate(string? password, string? userContext = null)
        {
            var errors = new List<string>();

            if (string.IsNullOrWhiteSpace(password))
            {
                return new PasswordPolicyResult(false, new[] { "Kata sandi wajib diisi." });
            }

            if (password.Length < MinimumLength)
            {
                errors.Add($"Kata sandi minimal {MinimumLength} karakter (saat ini {password.Length}).");
            }

            if (password.Length > MaximumLength)
            {
                errors.Add($"Kata sandi maksimal {MaximumLength} karakter.");
            }

            if (password.Length > PasswordHasher.MaxPasswordLength)
            {
                // Stop here: never send an unbounded value to the hasher.
                return new PasswordPolicyResult(false, errors);
            }

            if (password.Any(char.IsWhiteSpace))
            {
                errors.Add("Kata sandi tidak boleh mengandung spasi atau karakter kosong.");
            }

            var classes = 0;
            if (password.Any(char.IsLower)) classes++;
            if (password.Any(char.IsUpper)) classes++;
            if (password.Any(char.IsDigit)) classes++;
            if (password.Any(c => !char.IsLetterOrDigit(c))) classes++;

            if (classes < 3)
            {
                errors.Add("Kata sandi harus memuat minimal 3 dari 4 jenis karakter: huruf kecil, huruf besar, angka, simbol.");
            }

            // Compare both verbatim and with separators stripped, so variants such
            // as "Password123!" and "P-a-s-s-w-o-r-d-1-2-3" are still recognised.
            var condensed = Condense(password);
            if (Blocklist.Contains(password) || Blocklist.Contains(condensed))
            {
                errors.Add("Kata sandi terlalu umum dan mudah ditebak. Silakan pilih kata sandi lain.");
            }
            else if (ReservedTokens.Any(token => condensed.Contains(token, StringComparison.OrdinalIgnoreCase)))
            {
                errors.Add("Kata sandi tidak boleh memuat kata yang mudah ditebak (mis. nama platform, 'password', 'admin').");
            }

            if (IsRepetitive(password))
            {
                errors.Add("Kata sandi tidak boleh berupa karakter yang sama atau urutan berulang terus-menerus.");
            }

            if (ContainsUserContext(password, userContext))
            {
                errors.Add("Kata sandi tidak boleh mengandung nama pengguna atau email akun.");
            }

            return new PasswordPolicyResult(errors.Count == 0, errors);
        }

        /// <summary>Lowercases and strips everything that is not a letter or digit.</summary>
        private static string Condense(string value) =>
            new string(value.Where(char.IsLetterOrDigit).ToArray());

        private static bool IsRepetitive(string password)
        {
            if (password.Length < 4) return true;

            // Single repeated character, e.g. "aaaaaaaaaaaa".
            if (password.Distinct().Count() == 1) return true;

            // A short pattern repeated to fill the length, e.g. "abcabcabcabc".
            for (var period = 1; period <= password.Length / 3; period++)
            {
                var repeated = true;
                for (var i = period; i < password.Length; i++)
                {
                    if (password[i] != password[i % period])
                    {
                        repeated = false;
                        break;
                    }
                }

                if (repeated) return true;
            }

            return false;
        }

        private static bool ContainsUserContext(string password, string? userContext)
        {
            if (string.IsNullOrWhiteSpace(userContext)) return false;

            var normalized = userContext.Trim();

            // For an email address, also test the local part.
            var atIndex = normalized.IndexOf('@');
            var localPart = atIndex > 0 ? normalized[..atIndex] : normalized;

            return ContainsMeaningfully(password, normalized) || ContainsMeaningfully(password, localPart);
        }

        private static bool ContainsMeaningfully(string password, string token)
        {
            return token.Length >= 3
                && password.Contains(token, StringComparison.OrdinalIgnoreCase);
        }
    }
}
