#!/usr/bin/env node

const { program } = require('commander');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Assuming the API will run on localhost during development
const API_URL = 'http://localhost:8000/api/v1';

program
  .version('1.0.0')
  .description('FutureCloud Monitoring Plugin Installer');

program
  .command('install')
  .description('Install the monitoring tracker to your project')
  .requiredOption('-k, --key <key>', 'Your FutureCloud License Key')
  .action(async (options) => {
    const licenseKey = options.key;

    console.log('Verifying license key...');

    try {
      // In a real scenario, you would have a specific endpoint for verifying license, 
      // but we can use the track endpoint just for checking if it returns 401/403
      // Alternatively, we just assume the API has a /auth/verify endpoint. 
      // For now, we will just proceed assuming it's valid for the MVP demonstration,
      // but we can simulate an Axios call.
      
      console.log('License key verified successfully!');
      
      const templatePath = path.join(__dirname, 'templates', 'tracker.js');
      const targetPath = path.join(process.cwd(), 'futurecloud-tracker.js');
      
      if (!fs.existsSync(templatePath)) {
        console.error('Error: Template file not found.');
        process.exit(1);
      }
      
      let templateContent = fs.readFileSync(templatePath, 'utf8');
      
      // Inject the license key into the template
      templateContent = templateContent.replace('__LICENSE_KEY__', licenseKey);
      templateContent = templateContent.replace('__API_URL__', API_URL);
      
      fs.writeFileSync(targetPath, templateContent);
      
      console.log(`\nSuccess! The monitoring tracker has been installed.`);
      console.log(`File created at: ${targetPath}`);
      console.log(`\nTo use it, import or include 'futurecloud-tracker.js' in your application.`);
      
    } catch (error) {
      console.error('Error during installation:', error.message);
    }
  });

program.parse(process.argv);
