// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

import Octokit from '@octokit/rest'
import { Context, Logger } from 'probot'

export class GitHub {
  private readonly client: Octokit
  private readonly log: Logger

  public constructor (
    context: Context
  ) {
    this.client = context.github
    this.log = context.log
  }

  public async getHeadSha(owner: string, repository_name: string, pull_request_number: number):Promise<string> {
    try {
      const payload = this.getPullRequestsGetCommitsParams(owner, repository_name, pull_request_number);
      const result = await this.client.pullRequests.getCommits(payload)
      this.log.info(result)
      return result.data[result.data.length - 1].sha
    } catch(e) {
      this.log.error(e, `Error occurred while getting Head SHA for PR ${pull_request_number}`)
    }

    return ""
  }

  public async postCheck(name: string, head_sha: string, status: any, owner: string, repo: string, completed_at: string, body: string, conclusion: string):Promise<string> {
    try {
      const payload = this.getChecksCreateParams(name, head_sha, status, owner, repo, completed_at, body, conclusion)
      const result = await this.client.checks.create(payload)
      this.log.info(result)
      return 'Post Check Done'
    } catch(e) {
      this.log.error(e, `Error occurred creating check for SHA ${head_sha}`)
    }
    return ""
  }

  private getPullRequestsGetCommitsParams(owner: string, repository_name: string, pull_request_number: number): Octokit.PullRequestsGetCommitsParams {
    return {
      number: pull_request_number,
      owner: owner,
      repo: repository_name
    }
  }

  private getChecksCreateParams(name: string, head_sha: string, status: any, owner: string, repo: string, completed_at: string, body: string, conclusion: any): Octokit.ChecksCreateParams {
    return {
      name: name,
      head_sha: head_sha,
      status: status,
      head_branch: "master",
      owner: owner,
      repo: repo,
      completed_at: completed_at,
      conclusion: conclusion,
      output: {
        summary: name,
        title: name,
        text: body
      }
    }
  }

  public async deleteComment(id: string, owner: string, repo: string): Promise<string | undefined> {
    try {
      const payload = this.getDeleteCommentParams(id, owner, repo)
      const result = await this.client.issues.deleteComment(payload)      
      this.log.info(result)
      return 'Deletion Done'
    } catch(e) {
      this.log.error(e, `Error occurred deletion comment ${id}`)
    }
    return undefined
  }

  private getDeleteCommentParams (id: string, owner: string, repo: string): Octokit.IssuesDeleteCommentParams {
    return {
      comment_id: id,
      id: id,
      owner: owner,
      repo: repo
    }
  }
}
