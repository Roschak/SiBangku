#!/usr/bin/env node
import { Command } from 'commander';

const program = new Command();

program
  .name('sibangku')
  .description('SiBangku - Restaurant Reservation SaaS CLI')
  .version('2.0.0');

// PRD §59-61: CLI Commands (to be implemented in FASE 9)
program
  .command('tenant')
  .description('Manage tenants')
  .addCommand(
    new Command('create').description('Create a new tenant').action(() => {
      console.info('Tenant creation will be implemented in FASE 9');
    }),
  )
  .addCommand(
    new Command('list').description('List all tenants').action(() => {
      console.info('Tenant listing will be implemented in FASE 9');
    }),
  );

program.parse();
