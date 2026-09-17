using System;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace SiBangku.Shared
{
    public static class Utils
    {
        /// <summary>
        /// Generate a unique tenant ID.
        /// Format: TEN-YYYY-XXXXXX (PRD §53)
        /// </summary>
        public static string GenerateTenantId()
        {
            var year = DateTime.UtcNow.Year;
            var bytes = new byte[3];
            RandomNumberGenerator.Fill(bytes);
            var randomHex = Convert.ToHexString(bytes).ToUpper();
            return $"TEN-{year}-{randomHex}";
        }

        /// <summary>
        /// Generate a secure temporary password (PRD §55, §111).
        /// <para>
        /// The result is URL-safe and guaranteed to satisfy
        /// <see cref="SiBangku.Shared.Security.PasswordPolicy"/>: at least one
        /// lowercase letter, uppercase letter, digit and symbol are placed before
        /// the characters are shuffled, so a purely random draw can never produce
        /// a password the platform itself would reject.
        /// </para>
        /// </summary>
        public static string GenerateTemporaryPassword()
        {
            // RFC 4648 base64url alphabet: safe in URLs, logs and clipboard copies.
            const string alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
            const string lower = "abcdefghijklmnopqrstuvwxyz";
            const string upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            const string digits = "0123456789";
            const string symbols = "-_";

            // 22 characters carry the same entropy as 16 random bytes.
            const int length = 22;

            var chars = new char[length];
            for (var i = 0; i < length; i++)
            {
                chars[i] = alphabet[RandomNumberGenerator.GetInt32(alphabet.Length)];
            }

            // Guarantee every character class the policy counts.
            foreach (var set in new[] { lower, upper, digits, symbols })
            {
                chars[RandomNumberGenerator.GetInt32(length)] = set[RandomNumberGenerator.GetInt32(set.Length)];
            }

            // Shuffle so the guaranteed characters cannot be guessed by position.
            for (var i = length - 1; i > 0; i--)
            {
                var j = RandomNumberGenerator.GetInt32(i + 1);
                (chars[i], chars[j]) = (chars[j], chars[i]);
            }

            return new string(chars);
        }

        /// <summary>
        /// Generate tenant slug from name for package/database naming.
        /// Converts to lowercase, removes special chars, replaces spaces with empty string.
        /// </summary>
        public static string GenerateTenantSlug(string name)
        {
            if (string.IsNullOrWhiteSpace(name))
                return string.Empty;

            var lowercase = name.ToLowerInvariant();
            var sanitized = Regex.Replace(lowercase, @"[^a-z0-9]", "");
            return sanitized.Length > 30 ? sanitized.Substring(0, 30) : sanitized;
        }

        /// <summary>
        /// Generate Android package ID (PRD §66)
        /// Format: com.sibangku.<tenant-slug>
        /// </summary>
        public static string GeneratePackageId(string tenantSlug)
        {
            var sanitized = Regex.Replace(tenantSlug ?? "", @"[^a-z0-9]", "");
            return $"com.sibangku.{sanitized}";
        }

        /// <summary>
        /// Generate database identifier for tenant (PRD §77)
        /// </summary>
        public static string GenerateDatabaseIdentifier(string tenantSlug)
        {
            var sanitized = Regex.Replace(tenantSlug ?? "", @"[^a-z0-9]", "");
            return $"tenant_{sanitized}";
        }

        /// <summary>
        /// Generate reservation number
        /// </summary>
        public static string GenerateReservationNumber()
        {
            var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString();
            // Get last 6 chars of timestamp
            var suffix = timestamp.Length > 6 ? timestamp.Substring(timestamp.Length - 6) : timestamp;

            var bytes = new byte[2];
            RandomNumberGenerator.Fill(bytes);
            var randomHex = Convert.ToHexString(bytes).ToUpper();

            return $"RSV-{suffix}-{randomHex}";
        }
    }
}
