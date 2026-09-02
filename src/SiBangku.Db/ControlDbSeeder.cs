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
            // Database preparation / migrations validation without hardcoded default accounts or tenants
            await Task.CompletedTask;
        }
    }
}
