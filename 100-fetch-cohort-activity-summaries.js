import {Task} from "@opentr/cuttlecat/dist/graphql/task.js";
import {parseDate} from "@opentr/cuttlecat/dist/utils.js";
import {startOfDay, addDays, isBefore, isAfter, startOfWeek, format} from "date-fns";
import * as fs from "fs";
import {dirname, join} from "path";
import {fileURLToPath} from "url";
import {v4 as uuidv4} from "uuid";

const __dirname = dirname(fileURLToPath(import.meta.url));

// TODO: allow passing NOW as an env var

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
                contributions{
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

        const newTaskSpecs = [];

        // create a task for each cohort in each program

        for (const program of programs) {
            const term = program.term;
            const termStartDate = parseDate(program.startDate);
            const termEndDate = parseDate(program.endDate);

            const now = new Date();

            if(isBefore(now, termStartDate) || isAfter(now, termEndDate)) {
                // skip if the term is not active
                continue;
            }

            // fetch the data from the previous week
            const fetchWeekStart = startOfDay(addDays(startOfWeek(now, {weekStartsOn: 1}), -7));
            const fetchWeekEnd = startOfDay(addDays(fetchWeekStart, 7));

            if(isBefore(fetchWeekStart, termStartDate) || isAfter(fetchWeekEnd, termEndDate)) {
                // skip if the fetch date range is outside the term
                continue;
            }

            for(const mentee of program.cohort) {
                const username = mentee.username;
                const newSpec = {
                    id: uuidv4(),
                    parentId: null,
                    originatingTaskId: null,
                    //
                    username: username,
                    since: fetchWeekStart,
                    until: fetchWeekEnd,
                    // to pass along to the output
                    term: term,
                    mentors: mentee.mentors,
                    organizations: mentee.organizations,
                    weekOf: format(fetchWeekStart, "yyyy-MM-dd"),
                };
                console.log(`Creating task to fetch activities of ${username} for the week of ${fetchWeekStart.toISOString()} to ${fetchWeekEnd.toISOString()}`);
                newTaskSpecs.push(newSpec);
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
        return null;
    }

    narrowedDownTasks(context) {
        return null;
    }

    saveOutput(context, output) {
        context.currentRunOutput.push({
            taskId: this.getId(context), result: {
                mentee:output.user,
                term: this.spec.term,
                mentors: this.spec.mentors,
                organizations: this.spec.organizations,
                weekOf: this.spec.weekOf,
            },
        });
    }

}


