import {Task} from "@opentr/cuttlecat/dist/graphql/task.js";
import {parseDate} from "@opentr/cuttlecat/dist/utils.js";
import {startOfDay, addDays, isBefore, isAfter, startOfWeek, format, isMonday, endOfDay} from "date-fns";
import * as fs from "fs";
import {dirname, join} from "path";
import {fileURLToPath} from "url";
import {v4 as uuidv4} from "uuid";

const __dirname = dirname(fileURLToPath(import.meta.url));

// pass this env var, if you would like to fetch data for an older period.
// if not passed, the data for the previous week (of current week) will be fetched.
let startDate = !!process.env["START_DATE"] ? parseDate(process.env["START_DATE"]) : null;

// pass this env var, if you would like to change the end date of the fetched data.
// defaults to a week after the ref date.
let endDate = !!process.env["END_DATE"] ? parseDate(process.env["END_DATE"]) : null;

const termKeyToFetch = process.env["TERM_KEY"];

if (!startDate && !endDate) {
    // if neither start date nor end date is passed, we are fetching data for the previous week
    // of the current week.
    startDate = startOfDay(addDays(startOfWeek(startDate, {weekStartsOn: 1}), -7));
    endDate = startOfDay(addDays(startDate, 7));
} else if (!startDate || !endDate) {
    // if only one of the start date or end date is passed, throw an error
    throw new Error("Both START_DATE and END_DATE should be passed together.");
} else {
    // if both start date and end date are passed, we are fetching data for the specified period.
    startDate = startOfDay(startDate);
    endDate = startOfDay(addDays(endDate, 1));

    // for consistent data, make sure startDate is on a Monday and endDate is on a Sunday
    if (!isMonday(startDate)) {
        throw new Error("The START_DATE should be a Monday.");
    }
    if (!isMonday(endDate)) {
        throw new Error("The END_DATE should be a Sunday.");
    }
}

// language=GraphQL
const QUERY = `query GetSummary($username: String!, $since: DateTime!, $until: DateTime!) {
    rateLimit {
        cost
        limit
        nodeCount
        remaining
        resetAt
        used
    }
    user(login:$username){
        login
        name
        contributionsCollection(from:$since, to:$until){
            startedAt
            endedAt
            hasAnyContributions

            totalCommitContributions
            totalIssueContributions
            totalPullRequestContributions
            totalPullRequestReviewContributions

            totalRepositoriesWithContributedCommits
            totalRepositoriesWithContributedIssues


            commitContributionsByRepository(maxRepositories:100){
                repository{
                    owner{
                        login
                    }
                    nameWithOwner
                    url
                }
                url
                contributions(first:100){
                    pageInfo{
                        hasNextPage
                    }
                    totalCount
                }
            }
            issueContributionsByRepository(maxRepositories:100){
                repository{
                    owner{
                        login
                    }
                    nameWithOwner
                    url
                }
                contributions(first:100){
                    pageInfo{
                        hasNextPage
                    }
                    totalCount
                    nodes{
                        issue{
                            number
                        }
                    }
                }
            }
            pullRequestContributionsByRepository(maxRepositories:100){
                repository{
                    owner{
                        login
                    }
                    nameWithOwner
                    url
                }
                contributions(first:100){
                    pageInfo{
                        hasNextPage
                    }
                    totalCount
                    nodes{
                        pullRequest{
                            number
                        }
                    }
                }
            }
            pullRequestReviewContributionsByRepository(maxRepositories:100){
                repository{
                    owner{
                        login
                    }
                    nameWithOwner
                    url
                }
                contributions(first:100){
                    pageInfo{
                        hasNextPage
                    }
                    totalCount
                    nodes{
                        pullRequestReview{
                            url
                            pullRequest{
                                number
                            }
                        }
                    }
                }
            }
        }
    }
}`;

export default class FetchCohortActivitySummariesCommand {

    createTask(ctx, spec) {
        return new FetchCohortActivitySummariesTask(spec);
    }

    createNewQueueItems() {
        let programsListFile = join(__dirname, "programs.json");
        let programs = JSON.parse(fs.readFileSync(programsListFile, "utf8"));

        let programsToFetch = [];
        if(termKeyToFetch){
            const program = programs.find(p => p.term === termKeyToFetch);
            if(!program){
                throw new Error(`Program term with key ${termKeyToFetch} not found.`);
            }
            programsToFetch.push(program);
        } else {
            // if no term key is passed, fetch data for all programs
            programsToFetch = programs;
        }

        const newTaskSpecs = [];

        // create a task for each cohort in each program

        for (const program of programsToFetch) {
            const term = program.term;
            const termStartDate = parseDate(program.startDate);
            const termEndDate = startOfDay(addDays(parseDate(program.endDate), 1));

            if (isBefore(startDate, termStartDate) || isAfter(endDate, termEndDate)) {
                // skip if the fetch date range is outside the term
                console.log(`Skipping ${term} as the fetch date range is outside the term.`);
                continue;
            }

            let currentWeekStart = startDate;
            let currentWeekEnd = addDays(currentWeekStart, 7);

            // divide the period into weeks and fetch data for each week
            while (isBefore(currentWeekStart, endDate)) {
                for (const mentee of program.cohort) {
                    const username = mentee.username;
                    const newSpec = {
                        id: uuidv4(),
                        parentId: null,
                        originatingTaskId: null,
                        //
                        username: username,
                        since: currentWeekStart,
                        until: currentWeekEnd,
                        // to pass along to the output
                        term: term,
                        weekOf: format(currentWeekStart, "yyyy-MM-dd"),
                    };
                    console.log(`Creating task to fetch ${term} activities of ${username} for the week of ${currentWeekStart.toISOString()} to ${currentWeekEnd.toISOString()}`);
                    newTaskSpecs.push(newSpec);
                }
                currentWeekStart = addDays(currentWeekStart, 7);
                currentWeekEnd = addDays(currentWeekStart, 7);
            }
        }
        return newTaskSpecs;
    }
}

export class FetchCohortActivitySummariesTask extends Task {
    spec;

    constructor(spec) {
        super(spec);
        this.spec = spec;
    }

    getGraphqlQuery() {
        return QUERY;
    }

    buildQueryParameters() {
        return {
            "username": this.spec.username,
            "since": this.spec.since.toISOString(),
            "until": this.spec.until.toISOString(),
        };
    }

    nextTask(context, result) {
        // we don't care about next pages, at least for now
        // we need to handle next pages properly.
        // for that, we would need to run the sub-queries separately. We can't paginate the sub-queries at the same time.
        //
        // For now, if there's a next page in any of the collections, throw an error.
        // this is done that when there's lots of data, we fail the task to signal that the period is possibly too long.
        if(result.user.contributionsCollection?.commitContributionsByRepository?.contributions?.pageInfo?.hasNextPage){
            throw new Error("TODO: Not implemented: commitContributionsByRepository hasNextPage");
        }
        if(result.user.contributionsCollection?.issueContributionsByRepository?.contributions?.pageInfo?.hasNextPage){
            throw new Error("TODO: Not implemented: issueContributionsByRepository hasNextPage");
        }
        if(result.user.contributionsCollection?.pullRequestContributionsByRepository?.contributions?.pageInfo?.hasNextPage){
            throw new Error("TODO: Not implemented: pullRequestContributionsByRepository hasNextPage");
        }
        if(result.user.contributionsCollection?.pullRequestReviewContributionsByRepository?.contributions?.pageInfo?.hasNextPage){
            throw new Error("TODO: Not implemented: pullRequestReviewContributionsByRepository hasNextPage");
        }
        return null;
    }

    narrowedDownTasks(context) {
        // we don't care about narrowed down tasks, at least for now
        return null;
    }

    saveOutput(context, output) {
        context.currentRunOutput.push({
            taskId: this.getId(context), result: {
                mentee: output.user,
                term: this.spec.term,
                weekOf: this.spec.weekOf,
            },
        });
    }

}


