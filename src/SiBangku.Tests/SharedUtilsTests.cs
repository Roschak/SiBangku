using System;
using Xunit;
using SiBangku.Shared;

namespace SiBangku.Tests
{
    public class SharedUtilsTests
    {
        [Fact]
        public void GenerateTenantId_ShouldReturnValidFormat()
        {
            var id = Utils.GenerateTenantId();
            Assert.StartsWith("TEN-", id);
            Assert.Equal(15, id.Length);
            Assert.Contains(DateTime.UtcNow.Year.ToString(), id);
        }

        [Fact]
        public void GenerateTemporaryPassword_ShouldReturnValidLength()
        {
            var pwd = Utils.GenerateTemporaryPassword();
            Assert.NotNull(pwd);
            Assert.True(pwd.Length >= 16);
        }

        [Fact]
        public void GenerateTenantSlug_ShouldSanitizeSpacesAndCharacters()
        {
            var slug = Utils.GenerateTenantSlug("Distro Avenue! 2026");
            Assert.Equal("distroavenue2026", slug);
        }

        [Fact]
        public void GenerateTenantSlug_ShouldTruncateTo30Chars()
        {
            var longName = new string('A', 50);
            var slug = Utils.GenerateTenantSlug(longName);
            Assert.Equal(30, slug.Length);
            Assert.Equal(new string('a', 30), slug);
        }

        [Fact]
        public void GeneratePackageId_ShouldPrefixAndSanitize()
        {
            var packageId = Utils.GeneratePackageId("distro-avenue!");
            Assert.Equal("com.sibangku.distroavenue", packageId);
        }

        [Fact]
        public void GenerateDatabaseIdentifier_ShouldPrefixWithTenant()
        {
            var dbId = Utils.GenerateDatabaseIdentifier("distroavenue");
            Assert.Equal("tenant_distroavenue", dbId);
        }

        [Fact]
        public void GenerateReservationNumber_ShouldStartWithRsv()
        {
            var rsv = Utils.GenerateReservationNumber();
            Assert.StartsWith("RSV-", rsv);
        }
    }
}
