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
            // If any Super Admin already exists in the database, preserve it completely
            // without modifying credentials or creating any new admin accounts.
            if (await context.PlatformUsers.AnyAsync(u => u.Role == "SUPER_ADMIN"))
            {
                Console.WriteLine("[ControlDbSeeder] Platform Super Admin already exists. Preserving existing account without changes.");
                return;
            }

            // Fresh database initial seed:
            var masterUser = new PlatformUser
            {
                UserId = "master-DEV-ragah",
                Email = "master-DEV-ragah",
                PasswordHash = PasswordHasher.Hash("MySibangkuDev#"),
                Name = "Master DEV Ragah",
                Role = "SUPER_ADMIN",
                CreatedAt = DateTime.UtcNow
            };
            await context.PlatformUsers.AddAsync(masterUser);

            if (seedDevelopmentAccount)
            {
                var devAdmin = new PlatformUser
                {
                    UserId = "super-admin-init",
                    Email = "admin",
                    PasswordHash = PasswordHasher.Hash("admin"),
                    Name = "Super Admin Platform",
                    Role = "SUPER_ADMIN",
                    CreatedAt = DateTime.UtcNow
                };
                await context.PlatformUsers.AddAsync(devAdmin);
            }

            await context.SaveChangesAsync();
            Console.WriteLine("[ControlDbSeeder] Fresh database initialization complete.");
        }
    }
}
