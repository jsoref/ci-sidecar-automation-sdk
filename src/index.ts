// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

import { IssueComment } from 'github-webhook-event-types'
import { Application } from 'probot'
import { GitHub } from './github'

const sdk_generated_comment_regex = new RegExp(/# Automation for azure-sdk-for-(.*)/i)
const sdk_not_generated_error_comment_regex = new RegExp(/Encountered a Subprocess error/i)

export = (app: Application) => {
  app.on('issue_comment.edited', async context => {
    // A comment has been created. 
    context.log(`Processing status update ${context.payload.installation.id}`)
    const issue_comment = (context.payload as any) as IssueComment
    context.log(`Issue comment user ${issue_comment.comment.user.login}`)
    context.log(`Comparison: ${issue_comment.comment.user.login === 'AutorestCI'}`)

    if(issue_comment.comment.user.login === 'AutorestCI'){
    // We know the comment has been created by AutorestCI
      const sdk_generation_comment = sdk_generated_comment_regex.exec(issue_comment.comment.body)
      const sdk_not_generation_error_comment = sdk_not_generated_error_comment_regex.exec(issue_comment.comment.body)    
      
      const github = new GitHub(context)
      context.log(`Issue Comment Body ${issue_comment.comment.body}`)
      context.log(`SDK Generation Comment ${sdk_generation_comment}`)
      context.log(`SDK Generation Error Comment ${sdk_not_generation_error_comment}`)

      if(sdk_generation_comment != null || sdk_not_generation_error_comment != null) {
      // The message is related to Automation for azure-sdk-for-* message. 
        let name = ""
        let conclusion = "success"
        if(sdk_generation_comment != null) {
        // The SDK Generation is successful and created a PR
          name = sdk_generation_comment[0]
        } else if (sdk_not_generation_error_comment != null) {
          name = sdk_not_generation_error_comment[0]
        }

        if (sdk_not_generation_error_comment != null) {
          conclusion = "failure"
        }

        // We need to get the head_sha value
        const owner = issue_comment.repository.owner.login
        const repository_name = issue_comment.repository.name
        const pull_request_number = issue_comment.issue.number
        const completed_at = issue_comment.comment.created_at
        const head_sha = await github.getHeadSha(owner, repository_name, pull_request_number)

        const result = await github.postCheck(
          name, 
          head_sha,
          "completed", 
          owner, 
          repository_name,
          completed_at,
          issue_comment.comment.body,
          conclusion
        )

        console.log(result)
      }
    }
  })
}
