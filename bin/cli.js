#!/usr/bin/env node

const { program } = require('commander');
const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load existing environment variables
dotenv.config();

const requiredEnvVars = {
  GEMINI_API_KEY: {
    description: 'Gemini API Key',
    validate: value => value.length > 0
  }
};

const optionalEnvVars = {
  GEMINI_API_ENDPOINT: {
    description: 'Gemini API Endpoint',
    default: undefined
  },
  PORT: {
    description: 'Server Port',
    default: '7777',
    validate: value => !isNaN(parseInt(value))
  },
  CORS_ORIGINS: {
    description: 'CORS Origins (comma-separated)',
    default: '*'
  },
  CORS_CREDENTIALS: {
    description: 'Enable CORS Credentials',
    default: 'false',
    validate: value => ['true', 'false'].includes(value)
  },
  RATE_LIMIT_WINDOW: {
    description: 'Rate Limit Window (ms)',
    default: '900000',
    validate: value => !isNaN(parseInt(value))
  },
  RATE_LIMIT_MAX: {
    description: 'Rate Limit Max Requests',
    default: '100',
    validate: value => !isNaN(parseInt(value))
  }
};

async function promptForMissingConfig() {
  const questions = [];
  const config = {};

  // Check required variables
  for (const [key, settings] of Object.entries(requiredEnvVars)) {
    if (!process.env[key]) {
      questions.push({
        type: 'input',
        name: key,
        message: `Enter ${settings.description}:`,
        validate: settings.validate
      });
    } else {
      config[key] = process.env[key];
    }
  }

  // Check optional variables
  for (const [key, settings] of Object.entries(optionalEnvVars)) {
    if (!process.env[key]) {
      questions.push({
        type: 'input',
        name: key,
        message: `Enter ${settings.description} (default: ${settings.default}):`,
        default: settings.default,
        validate: settings.validate
      });
    } else {
      config[key] = process.env[key];
    }
  }

  const answers = await inquirer.prompt(questions);
  return { ...config, ...answers };
}

async function writeEnvFile(config) {
  const envContent = Object.entries(config)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  fs.writeFileSync(path.join(process.cwd(), '.env'), envContent);
  console.log('✅ Configuration saved to .env file');
}

async function validateEnvironment() {
  let valid = true;
  
  // Check required variables
  for (const [key, settings] of Object.entries(requiredEnvVars)) {
    if (!process.env[key] || !settings.validate(process.env[key])) {
      console.error(`❌ Missing or invalid required environment variable: ${key}`);
      valid = false;
    }
  }

  // Check optional variables with validation
  for (const [key, settings] of Object.entries(optionalEnvVars)) {
    if (process.env[key] && settings.validate && !settings.validate(process.env[key])) {
      console.error(`❌ Invalid optional environment variable: ${key}`);
      valid = false;
    }
  }

  return valid;
}

program
  .name('gemini-vqa-mcp')
  .description('Visual Question Answering MCP Server using Google Gemini Vision')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize server configuration')
  .action(async () => {
    try {
      const config = await promptForMissingConfig();
      await writeEnvFile(config);
      console.log('🚀 Configuration complete. Run "gemini-vqa-mcp start" to start the server.');
    } catch (error) {
      console.error('❌ Error during initialization:', error.message);
      process.exit(1);
    }
  });

program
  .command('start')
  .description('Start the VQA server')
  .action(async () => {
    try {
      const isValid = await validateEnvironment();
      if (!isValid) {
        console.error('❌ Invalid configuration. Run "gemini-vqa-mcp init" to set up the server.');
        process.exit(1);
      }

      console.log('🚀 Starting Gemini VQA MCP Server...');
      const { default: VQAMCPServer } = require(path.join(__dirname, '../dist/server.js'));
      const server = new VQAMCPServer();
      
      // Handle process signals for graceful shutdown
      const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
      signals.forEach(signal => {
        process.on(signal, async () => {
          console.log(`\n${signal} received. Starting graceful shutdown...`);
          try {
            await server.stop();
            console.log('Server stopped gracefully');
            process.exit(0);
          } catch (error) {
            console.error('Error during shutdown:', error);
            process.exit(1);
          }
        });
      });

      await server.start();
    } catch (error) {
      console.error('❌ Error starting server:', error.message);
      process.exit(1);
    }
  });

program.parse();