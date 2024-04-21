import {ProcessFileHelper} from "@opentr/cuttlecat/dist/processFileHelper.js";
import {readSlurpJsonFileSync} from "@opentr/cuttlecat/dist/utils.js";
import * as fs from "fs";
import {dirname, join} from "path";
import {fileURLToPath} from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function main() {
    const FETCH_COHORT_ACTIVITY_SUMMARIES_PROCESS_DIR = join(__dirname, "100-fetch-cohort-activity-summaries");

    const processFileHelper = new ProcessFileHelper(FETCH_COHORT_ACTIVITY_SUMMARIES_PROCESS_DIR);
    const dataDirs = processFileHelper.getProcessStateDirectories();

    const theMap = {};
    const terms = [];

    for (const dataDir of dataDirs) {
        // TODO: state is needed?
        const state = processFileHelper.readProcessStateFile(dataDir);
        if (state == null) {
            console.log(`Process state is null: ${commitDir}`);
            continue;
        }

        const outputFiles = processFileHelper.getProcessOutputFiles(dataDir);
        for (const outputFile of outputFiles) {
            const filePath = join(FETCH_COHORT_ACTIVITY_SUMMARIES_PROCESS_DIR, dataDir, outputFile);
            const fileEntries = readSlurpJsonFileSync(filePath);

            for(const entry of fileEntries){
                const term = entry.result.term;
                if(!theMap[term]){
                    theMap[term] = [];
                }
                theMap[term].push(entry.result);

                if(!terms.includes(term)){
                    terms.push(term);
                }
            }
        }
    }

    for(const term of terms) {
        const filePath = join(__dirname, "150-build-cohort-activity-summaries", `${term}.json`);
        fs.writeFileSync(filePath, JSON.stringify(theMap[term], null, 2));
    }
}

main();
