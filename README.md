#mentorship-monitor

This repository contains some scripts to monitor the mentorship programs.

## Scripts

- [100-fetch-cohort-activity-summaries.js](100-fetch-cohort-activity-summaries.js): Fetches activity summaries of the mentorship program cohorts from GitHub.

## How it works

This project uses [cuttlecat](https://github.com/OpenTRFoundation/cuttlecat) to fetch data from GitHub.
The good thing about cuttlecat is that it is designed to be run in a GitHub Actions workflow.
When there's a rate limit error, or when the process is interrupted, cuttlecat can continue from where it left off.

## Output

- `100-fetch-cohort-activity-summaries` directory contains the activity summaries of the mentorship program cohorts, fetched from GitHub with buckets of 7 days.

## Running locally

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

# --------- fetching data for an older week ----------
# Following will fetch the data for the week of 2024-03-04 (mon) to 2024-03-10 (sun)
REF_DATE="2024-03-11" node node_modules/@opentr/cuttlecat/dist/index.js execute \
    --command-file="$(pwd)/100-fetch-cohort-activity-summaries.js" \
    --github-token="$(gh auth token)" \
    --data-directory="$(pwd)/100-fetch-cohort-activity-summaries" \
    --interval-cap="7" \
    --renew-period-in-days="0" \  # 0 means ignore the renew period
    --log-level="info"
```
