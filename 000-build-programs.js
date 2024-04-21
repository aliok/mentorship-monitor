import fs from "fs";
import {dirname, join} from "path";
import {fileURLToPath} from "url";
import {parseDate} from "@opentr/cuttlecat/dist/utils.js";

import {startOfDay, addDays, isBefore, isAfter, startOfWeek, format} from "date-fns";

const __dirname = dirname(fileURLToPath(import.meta.url));

function main(){
    let programsListFile = join(__dirname, "programs.json");
    let programs = JSON.parse(fs.readFileSync(programsListFile, "utf8"));

    for (let program of programs) {
        const programName = program.term;
        const programFile = join(__dirname, "000-build-programs", `${programName}.json`);

        program.weeks = [];

        let startDate = parseDate(program.startDate);
        let currentWeek = startOfWeek(startDate, {weekStartsOn: 1});
        let endDate = parseDate(program.endDate);
        while(isBefore(currentWeek, endDate)){
            program.weeks.push(format(currentWeek, "yyyy-MM-dd"));
            currentWeek = addDays(currentWeek, 7);
        }

        fs.writeFileSync(programFile, JSON.stringify(program, null, 2));
    }

    const programNames = programs.map(p => p.term);
    fs.writeFileSync(join(__dirname, "000-build-programs", "programs-list.json"), JSON.stringify(programNames, null, 2));
}

main();
