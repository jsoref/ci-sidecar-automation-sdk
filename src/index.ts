// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

import { IssueComment } from 'github-webhook-event-types'
import { Application } from 'probot'
import { GitHub } from './github'

const sdk_generated_comment_regex = new RegExp(/# Automation for azure-sdk-for-(.*)\nA .* has been created for you.*/gm)
const sdk_not_generated_comment_regex_1 = new RegExp(/# Automation for azure-sdk-for-(.*)\nNothing to generate for azure-sdk-for-(.*)/gm)
const sdk_not_generated_comment_regex_2 = new RegExp(/# Automation for azure-sdk-for-(.*)\nUnable to detect any generation context from this PR./gm)
const sdk_not_generated_error_comment_regex = new RegExp(/# Automation for azure-sdk-for-(.*)\n<details><summary>Encountered a Subprocess error:.*/gm)

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
      const sdk_not_generation_comment_1 = sdk_not_generated_comment_regex_1.exec(issue_comment.comment.body)
      const sdk_not_generation_comment_2 = sdk_not_generated_comment_regex_2.exec(issue_comment.comment.body)
      const sdk_not_generation_error_comment = sdk_not_generated_error_comment_regex.exec(issue_comment.comment.body)
      const github = new GitHub(context)
      context.log(`Issue Comment Body ${issue_comment.comment.body}`)
      context.log(`SDK Generation Comment ${sdk_generation_comment}`)

      if(sdk_generation_comment != null || sdk_not_generation_comment_1 != null || sdk_not_generation_comment_2 != null || sdk_not_generation_error_comment != null) {
      // The message is related to Automation for azure-sdk-for-* message. 
        let language = ""
        let conclusion = "success"
        if(sdk_generation_comment != null) {
        // The SDK Generation is successful and created a PR
          language = sdk_generation_comment[1]
        } else if (sdk_not_generation_comment_1 != null) {
        // The SDK Generation is successful but there is nothing to create
          language = sdk_not_generation_comment_1[1]
        } else if (sdk_not_generation_comment_2 != null) {
          // The SDK Generation is successful but there is nothing to create
          language = sdk_not_generation_comment_2[1]
        } else if (sdk_not_generation_error_comment != null) {
          language = sdk_not_generation_error_comment[1]
          conclusion = "failure"
        }

        // We need to get the head_sha value
        const owner = issue_comment.repository.owner.login
        const repository_name = issue_comment.repository.name
        const pull_request_number = issue_comment.issue.number
        const completed_at = issue_comment.comment.created_at
        const head_sha = await github.getHeadSha(owner, repository_name, pull_request_number)

        const result = await github.postCheck(
          "Automation for azure-sdk-for-" + language, 
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
