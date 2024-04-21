```shell

npm install

node node_modules/@opentr/cuttlecat/dist/index.js execute \
    --command-file="$(pwd)/100-fetch-cohort-activity-summaries.js" \
    --github-token="$(gh auth token)" \
    --data-directory="$(pwd)/100-fetch-cohort-activity-summaries" \
    --interval-cap="7" \
    --renew-period-in-days="7" \
    --log-level="info"
```
