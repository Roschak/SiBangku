using System;
using SiBangku.Shared.Security;
using Xunit;

namespace SiBangku.Tests
{
    public class PasswordHasherTests
    {
        private const string StrongPassword = "Rahasia#Kuliner2026!x";

        [Fact]
        public void Hash_ShouldProduceArgon2idPhcString()
        {
            // Act
            var hash = PasswordHasher.Hash(StrongPassword);

            // Assert - standard PHC envelope with the OWASP parameters.
            Assert.StartsWith("$argon2id$v=19$m=19456,t=2,p=1$", hash);
            Assert.True(hash.Length <= 255, "Encoded hash must fit the PasswordHash(255) column.");
        }

        [Fact]
        public void Hash_ShouldUseAUniqueSaltPerCall()
        {
            // Act
            var first = PasswordHasher.Hash(StrongPassword);
            var second = PasswordHasher.Hash(StrongPassword);

            // Assert - identical passwords must never produce identical hashes.
            Assert.NotEqual(first, second);
        }

        [Fact]
        public void Verify_ShouldAcceptCorrectPassword()
        {
            var hash = PasswordHasher.Hash(StrongPassword);

            Assert.True(PasswordHasher.Verify(StrongPassword, hash));
        }

        [Fact]
        public void Verify_ShouldRejectWrongPassword()
        {
            var hash = PasswordHasher.Hash(StrongPassword);

            Assert.False(PasswordHasher.Verify("DefinitelyNotThePassword1!", hash));
        }

        [Fact]
        public void Verify_ShouldStillAcceptLegacyBcryptHashes()
        {
            // Arrange - a hash produced by the previous BCrypt(10) implementation.
            var legacyHash = BCrypt.Net.BCrypt.HashPassword(StrongPassword, 10);

            // Act / Assert - existing accounts keep working during migration.
            Assert.True(PasswordHasher.Verify(StrongPassword, legacyHash));
            Assert.True(PasswordHasher.NeedsRehash(legacyHash));
        }

        [Fact]
        public void NeedsRehash_ShouldBeFalseOnlyForCurrentParameters()
        {
            var current = PasswordHasher.Hash(StrongPassword);
            var weakArgon2 = current.Replace("m=19456", "m=4096");

            Assert.False(PasswordHasher.NeedsRehash(current));
            Assert.True(PasswordHasher.NeedsRehash(weakArgon2));
            Assert.True(PasswordHasher.NeedsRehash(string.Empty));
            Assert.True(PasswordHasher.NeedsRehash("not-a-hash"));
        }

        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData("$argon2id$broken")]
        [InlineData("$2b$notreallyabcrypthash")]
        [InlineData("plaintext-password")]
        public void Verify_ShouldFailClosedOnMalformedHash(string? storedHash)
        {
            Assert.False(PasswordHasher.Verify(StrongPassword, storedHash));
        }

        [Fact]
        public void Hash_ShouldRejectOverlongInput()
        {
            var oversized = new string('a', PasswordHasher.MaxPasswordLength + 1);

            Assert.Throws<ArgumentException>(() => PasswordHasher.Hash(oversized));
            // Verification must never throw for the same input.
            Assert.False(PasswordHasher.Verify(oversized, PasswordHasher.Hash(StrongPassword)));
        }
    }

    public class PasswordPolicyTests
    {
        [Fact]
        public void Validate_ShouldAcceptAStrongPassword()
        {
            var result = PasswordPolicy.Validate("Meja#Makan2026ku");

            Assert.True(result.IsValid);
            Assert.Empty(result.Errors);
        }

        [Theory]
        [InlineData("")]
        [InlineData("       ")]
        [InlineData("Short1!")]
        [InlineData("nodigitsorsymbols")]
        [InlineData("PASSWORD1234")]
        [InlineData("Password123")]
        [InlineData("aaaaaaaaaaaaaa")]
        [InlineData("abcabcabcabcabc")]
        [InlineData("Password123!")]
        [InlineData("welcome123456")]
        [InlineData("sibangku2026!!")]
        public void Validate_ShouldRejectWeakPasswords(string password)
        {
            var result = PasswordPolicy.Validate(password);

            Assert.False(result.IsValid);
            Assert.NotEmpty(result.Errors);
        }

        [Fact]
        public void Validate_ShouldRejectPasswordContainingTheAccountName()
        {
            var result = PasswordPolicy.Validate("RahasiaAdmin2026#", "admin");

            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, e => e.Contains("nama pengguna", StringComparison.OrdinalIgnoreCase));
        }

        [Fact]
        public void Validate_ShouldRejectPasswordContainingTheEmailLocalPart()
        {
            var result = PasswordPolicy.Validate("Budi#Santoso2026x", "budi@resto.example");

            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, e => e.Contains("email", StringComparison.OrdinalIgnoreCase));
        }

        [Fact]
        public void Validate_ShouldRejectWhitespaceAndOverlongPasswords()
        {
            Assert.False(PasswordPolicy.Validate("Ada Spasi 2026#").IsValid);
            Assert.False(PasswordPolicy.Validate(new string('a', PasswordPolicy.MaximumLength + 1)).IsValid);
        }

        [Fact]
        public void Validate_ShouldReportEveryUnmetRequirement()
        {
            var result = PasswordPolicy.Validate("abc");

            // Too short, weak character mix, and a repeating pattern.
            Assert.True(result.Errors.Count >= 2);
            Assert.False(string.IsNullOrWhiteSpace(result.ErrorSummary));
        }

        [Fact]
        public void GeneratedTemporaryPasswords_ShouldSatisfyThePolicy()
        {
            // The provisioning fallback password must never violate the policy it
            // is subject to.
            for (var i = 0; i < 20; i++)
            {
                var generated = SiBangku.Shared.Utils.GenerateTemporaryPassword();
                Assert.True(PasswordPolicy.Validate(generated).IsValid,
                    $"Generated temporary password failed the policy: {generated}");
            }
        }
    }
}
