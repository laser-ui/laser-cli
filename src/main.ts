#!/usr/bin/env node

import { Command } from 'commander';
import { onCreate } from './commands/create';
import { onRoute } from './commands/route';

import { version } from '../package.json';

const program = new Command();

program.name('laser-cli').description('CLI to laser-admin').version(version);

program.command('create').description('Create a project using laser-admin as a template').action(onCreate);

program.command('route').description('Create a route for the laser-admin project').action(onRoute);

program.parse();
