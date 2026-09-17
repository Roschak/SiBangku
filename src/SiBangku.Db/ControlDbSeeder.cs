using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SiBangku.Shared.Models;
using SiBangku.Shared.Security;

namespace SiBangku.Db
{
    public static class ControlDbSeeder
    {
        /// <summary>
        /// Seeds the platform's initial Super Admin.
        /// </summary>
        /// <param name="context">Control plane database context.</param>
        /// <param name="seedDevelopmentAccount">
        /// When true (local development only), creates the well-known
        /// "admin/admin" developer account described in PRD section 5.
        /// When false (any deployed environment), no default credentials are
        /// created: the first administrator must be provisioned explicitly
        /// through the CLI / master-key endpoint.
        /// </param>
        public static async Task SeedAsync(ControlDbContext context, bool seedDevelopmentAccount = false)
        {
            if (!seedDevelopmentAccount)
            {
                Console.WriteLine("[ControlDbSeeder] Skipping development account seed (non-development environment).");
                return;
            }

            // Seed Super Admin if none exists (username/email is "admin")
            var adminUser = await context.PlatformUsers.FirstOrDefaultAsync(u => u.Email == "admin");
            if (adminUser == null)
            {
                // PRD §4, §113, §185: super admin developer account 'admin/admin'.
                // This development-only convenience account is intentionally not
                // subject to the production password policy.
                var passwordHash = PasswordHasher.Hash("admin");

                var superAdmin = new PlatformUser
                {
                    UserId = "super-admin-init",
                    Email = "admin",
                    PasswordHash = passwordHash,
                    Name = "Super Admin Platform",
                    Role = "SUPER_ADMIN",
                    CreatedAt = DateTime.UtcNow
                };

                await context.PlatformUsers.AddAsync(superAdmin);
                await context.SaveChangesAsync();

                Console.WriteLine("[ControlDbSeeder] Development Platform Admin 'admin/admin' seeded successfully.");
            }
            else
            {
                Console.WriteLine("[ControlDbSeeder] Platform Admin already exists. Skipping seed.");
            }
        }
    }
}
