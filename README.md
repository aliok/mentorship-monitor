#mentorship-monitor

This repository contains some scripts to monitor the mentorship programs.

## Scripts

- [000-build-programs.js](000-build-programs.js): Builds a list of mentorship programs from the configuration file (programs.json) as well as separate files for the programs.
- [100-fetch-cohort-activity-summaries.js](100-fetch-cohort-activity-summaries.js): Fetches activity summaries of the mentorship program cohorts from GitHub.
- [150-build-cohort-activity-summaries.js](150-build-cohort-activity-summaries.js): Builds a list of activity summaries of the mentorship program cohorts from the fetched data.

## How it works

This project uses [cuttlecat](https://github.com/OpenTRFoundation/cuttlecat) to fetch data from GitHub.
The good thing about cuttlecat is that it is designed to be run in a GitHub Actions workflow.
When there's a rate limit error, or when the process is interrupted, cuttlecat can continue from where it left off.

## Output

- `000-build-programs` directory contains the list of mentorship programs, including the old ones that ended. It also contains separate files for each program.
- `100-fetch-cohort-activity-summaries` directory contains the activity summaries of the mentorship program cohorts, fetched from GitHub with buckets of 7 days.
- `150-build-cohort-activity-summaries` directory contains the list of activity summaries of the mentorship program cohorts, built from the fetched data.

## Running locally

### `000-build-programs.js`
```shell
npm install

node 000-build-programs.js
```

### `100-fetch-cohort-activity-summaries.js`
```shell

npm install

# Following will fetch the data for the previous week from Monday to Sunday
node node_modules/@opentr/cuttlecat/dist/index.js execute \
    --command-file="$(pwd)/100-fetch-cohort-activity-summaries.js" \
    --github-token="$(gh auth token)" \
    --data-directory="$(pwd)/100-fetch-cohort-activity-summaries" \
    --interval-cap="7" \
    --renew-period-in-days="7" \
    --log-level="info"

# --------- fetching data for an older period and a particular program ----------
# Following will fetch the data for the period of 2024-03-04 (mon) to 2024-03-24 (sun) for the `lfx-2024-term1` program
# Caveats:
# -  renew-period-in-days="0" --> since we're not resuming from a previous run, nor we're gonna be able to resume from a this run later
# - --max-run-time-in-minutes="180" --> since we're fetching a longer period, it might take longer (default is 60 mins)
START_DATE="2024-03-04" END_DATE="2024-03-24" TERM_KEY="lfx-2024-term1" node node_modules/@opentr/cuttlecat/dist/index.js execute \
    --command-file="$(pwd)/100-fetch-cohort-activity-summaries.js" \
    --github-token="$(gh auth token)" \
    --data-directory="$(pwd)/100-fetch-cohort-activity-summaries" \
    --interval-cap="7" \
    --renew-period-in-days="0" \
    --max-run-time-in-minutes="180" \
    --log-level="info"
```

> Note: The fetch period shouldn't be longer than 3 months, as there will be lots of data to fetch. Currently, the manual execution doesn't handle the rate limit errors. (only scheduled runs handle them)

### `150-build-cohort-activity-summaries.js`
```shell
npm install

node 150-build-cohort-activity-summaries.js
```
