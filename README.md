# JIRA Time Tracker

A web application built with Next.js to track and visualize time spent on JIRA tickets.

## Features

- Fetches worklogs from JIRA API based on username and date range
- Displays daily hours logged with breakdown by ticket
- Shows total hours by ticket with ticket summary
- Allows drilling down into daily breakdown for specific tickets
- Allows viewing ticket breakdown for specific days
- Interactive charts with tooltips and clickable bars

## Technical Details

- Built with Next.js and React
- Uses Recharts for data visualization
- Fetches data from JIRA REST API
- Implements responsive design with Tailwind CSS

## Setup

### Option 1: Running Locally

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file with JIRA configuration:
   ```
   JIRA_URL=https://your-jira-instance.atlassian.net
   JIRA_TOKEN=your-jira-api-token
   ```
4. Start the development server: `npm run dev`

### Option 2: Running with Docker

1. Pull the Docker image: `docker pull haseemisaac/jira-time-tracker:latest`
2. Run the container:
   ```bash
   docker run -p 3000:3000 \
     -e JIRA_URL=https://your-domain.atlassian.net \
     -e JIRA_TOKEN=your-token \
     haseemisaac/jira-time-tracker:latest
   ```
3. Access the application at `http://localhost:3000`

## Usage

1. Enter your JIRA username in the input field
2. Select a date range using the dropdown menu
3. Click "Refresh" to fetch worklogs
4. Navigate between tabs to view different visualizations
5. Click on bars to drill down into specific ticket or day details

## Notes

- Requires a valid JIRA API token with appropriate permissions
- Tested with JIRA Cloud instance
- Date range selection is limited to 7, 14, 30, 60, or 90 days
