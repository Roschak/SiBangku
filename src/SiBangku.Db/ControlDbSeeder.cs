using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SiBangku.Shared.Models;

namespace SiBangku.Db
{
    public static class ControlDbSeeder
    {
        public static async Task SeedAsync(ControlDbContext context)
        {
            // Seed Super Admin if none exists (username/email is "admin")
            var adminUser = await context.PlatformUsers.FirstOrDefaultAsync(u => u.Email == "admin");
            if (adminUser == null)
            {
                // PRD §4, §113, §185: super admin developer account 'admin/admin'
                var passwordHash = BCrypt.Net.BCrypt.HashPassword("admin", 10);
                
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
                
                Console.WriteLine("[ControlDbSeeder] Platform Admin 'admin/admin' seeded successfully.");
            }
            else
            {
                Console.WriteLine("[ControlDbSeeder] Platform Admin already exists. Skipping seed.");
            }
        }
    }
}
