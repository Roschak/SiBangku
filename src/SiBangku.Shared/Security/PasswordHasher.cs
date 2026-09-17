using System;
using System.Security.Cryptography;
using System.Text;
using Konscious.Security.Cryptography;

namespace SiBangku.Shared.Security
{
    /// <summary>
    /// Password hashing for the whole platform.
    /// <para>
    /// New hashes use <c>Argon2id</c> with OWASP-recommended parameters and are
    /// stored in the standard PHC string format, e.g.
    /// <c>$argon2id$v=19$m=19456,t=2,p=1$&lt;salt&gt;$&lt;hash&gt;</c>.
    /// </para>
    /// <para>
    /// Legacy <c>BCrypt</c> hashes (<c>$2a$</c>/<c>$2b$</c>/<c>$2y$</c>) are still
    /// verified so existing accounts keep working; call
    /// <see cref="NeedsRehash"/> after a successful sign-in and store
    /// <see cref="Hash"/> to upgrade them transparently.
    /// </para>
    /// </summary>
    public static class PasswordHasher
    {
        private const string Argon2IdFingerprint = "$argon2id$";
        private const string AlgorithmName = "argon2id";
        private const int Version = 19;

        // OWASP 2024 minimum configuration for Argon2id (m=19 MiB, t=2, p=1).
        private const int MemorySizeKib = 19456;
        private const int Iterations = 2;
        private const int DegreeOfParallelism = 1;

        private const int SaltSize = 16;
        private const int HashSize = 32;

        /// <summary>
        /// Upper bound accepted by <see cref="Hash"/> and <see cref="Verify"/>.
        /// Guards against memory-exhaustion attempts via very large inputs.
        /// </summary>
        public const int MaxPasswordLength = 256;

        /// <summary>
        /// Hashes a password with Argon2id and returns the encoded PHC string.
        /// </summary>
        public static string Hash(string password)
        {
            ArgumentNullException.ThrowIfNull(password);

            if (password.Length > MaxPasswordLength)
            {
                throw new ArgumentException(
                    $"Password must not exceed {MaxPasswordLength} characters.",
                    nameof(password));
            }

            var salt = RandomNumberGenerator.GetBytes(SaltSize);
            var derived = DeriveKey(password, salt, MemorySizeKib, Iterations, DegreeOfParallelism, HashSize);

            return string.Join('$',
                string.Empty,
                AlgorithmName,
                $"v={Version}",
                $"m={MemorySizeKib},t={Iterations},p={DegreeOfParallelism}",
                ToBase64(salt),
                ToBase64(derived));
        }

        /// <summary>
        /// Verifies a password against a stored Argon2id or legacy BCrypt hash.
        /// Performs a constant-time comparison and never throws for malformed
        /// input (a corrupt hash simply fails verification).
        /// </summary>
        public static bool Verify(string? password, string? storedHash)
        {
            if (string.IsNullOrEmpty(password) || string.IsNullOrEmpty(storedHash))
            {
                return false;
            }

            if (password.Length > MaxPasswordLength)
            {
                return false;
            }

            try
            {
                return storedHash.StartsWith(Argon2IdFingerprint, StringComparison.Ordinal)
                    ? VerifyArgon2Id(password, storedHash)
                    : StoredHashLooksLikeBCrypt(storedHash) && BCrypt.Net.BCrypt.Verify(password, storedHash);
            }
            catch (Exception)
            {
                // A malformed or unsupported hash must fail closed.
                return false;
            }
        }

        /// <summary>
        /// True when the stored hash should be replaced with a fresh Argon2id
        /// hash (legacy BCrypt, unknown format, or weaker Argon2 parameters).
        /// </summary>
        public static bool NeedsRehash(string? storedHash)
        {
            if (string.IsNullOrEmpty(storedHash)) return true;
            if (!storedHash.StartsWith(Argon2IdFingerprint, StringComparison.Ordinal)) return true;

            var parts = storedHash.Split('$', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length != 5) return true;

            foreach (var parameter in parts[2].Split(','))
            {
                var pair = parameter.Split('=');
                if (pair.Length != 2 || !int.TryParse(pair[1], out var value)) return true;

                switch (pair[0])
                {
                    case "m" when value < MemorySizeKib:
                    case "t" when value < Iterations:
                    case "p" when value != DegreeOfParallelism:
                        return true;
                }
            }

            return false;
        }

        private static bool StoredHashLooksLikeBCrypt(string storedHash) =>
            storedHash.StartsWith("$2a$", StringComparison.Ordinal)
            || storedHash.StartsWith("$2b$", StringComparison.Ordinal)
            || storedHash.StartsWith("$2y$", StringComparison.Ordinal);

        private static bool VerifyArgon2Id(string password, string storedHash)
        {
            // $argon2id$v=19$m=..,t=..,p=..$<salt>$<hash>
            var parts = storedHash.Split('$', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length != 5)
            {
                return false;
            }

            var memory = 0;
            var iterations = 0;
            var parallelism = 0;

            foreach (var parameter in parts[2].Split(','))
            {
                var pair = parameter.Split('=');
                if (pair.Length != 2 || !int.TryParse(pair[1], out var value)) return false;

                switch (pair[0])
                {
                    case "m": memory = value; break;
                    case "t": iterations = value; break;
                    case "p": parallelism = value; break;
                }
            }

            if (memory <= 0 || iterations <= 0 || parallelism <= 0) return false;

            var salt = FromBase64(parts[3]);
            var expected = FromBase64(parts[4]);
            if (salt.Length == 0 || expected.Length == 0) return false;

            var actual = DeriveKey(password, salt, memory, iterations, parallelism, expected.Length);
            return CryptographicOperations.FixedTimeEquals(actual, expected);
        }

        private static byte[] DeriveKey(string password, byte[] salt, int memoryKib, int iterations, int parallelism, int length)
        {
            using var argon2 = new Argon2id(Encoding.UTF8.GetBytes(password))
            {
                Salt = salt,
                MemorySize = memoryKib,
                Iterations = iterations,
                DegreeOfParallelism = parallelism
            };

            return argon2.GetBytes(length);
        }

        private static string ToBase64(byte[] value) =>
            Convert.ToBase64String(value).TrimEnd('=');

        private static byte[] FromBase64(string value)
        {
            var padded = value.Replace('-', '+').Replace('_', '/');
            padded = (padded.Length % 4) switch
            {
                2 => padded + "==",
                3 => padded + "=",
                0 => padded,
                _ => string.Empty
            };

            return string.IsNullOrEmpty(padded) ? Array.Empty<byte>() : Convert.FromBase64String(padded);
        }
    }
}
