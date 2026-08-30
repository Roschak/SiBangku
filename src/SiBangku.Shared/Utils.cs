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
        /// Generate a secure temporary password (PRD §55, §111)
        /// </summary>
        public static string GenerateTemporaryPassword()
        {
            var bytes = new byte[16];
            RandomNumberGenerator.Fill(bytes);
            // URL-safe Base64 conversion
            return Convert.ToBase64String(bytes)
                .Replace("+", "-")
                .Replace("/", "_")
                .Replace("=", "");
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
