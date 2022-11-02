import { context, getOctokit } from "@actions/github";

/** Comment */
interface Comment {
  id: number;
  body?: string;
  user: {
    login: string;
  } | null;
}

/**
 * findComment find a comment in a list of comments
 * Code originally written by peter-evans from [peter-evans/find-comment: A GitHub action to find an issue or pull request comment](https://github.com/peter-evans/find-comment)
 * @param octokit Octokit instance
 * @param ctx GitHub context
 * @param bodyIncludes text to search for in the comment body
 * @returns
 */
async function findComment(
  octokit: ReturnType<typeof getOctokit>,
  ctx: typeof context,
  bodyIncludes: string
): Promise<Comment | undefined> {
  const parameters = {
    owner: ctx.repo.owner,
    repo: ctx.repo.repo,
    issue_number: ctx.issue.number,
  };

  for await (const { data: comments } of octokit.paginate.iterator(
    octokit.rest.issues.listComments,
    parameters
  )) {
    // Search each page for the comment
    const comment = comments.find((comment) =>
      findCommentPredicate(ctx.repo.owner, bodyIncludes, comment)
    );
    if (comment) return comment;
  }

  return undefined;
}

/**
 * findCommentPredicate predicate function to find a comment
 * Code originally written by peter-evans from [peter-evans/find-comment: A GitHub action to find an issue or pull request comment](https://github.com/peter-evans/find-comment)
 * @param commentAuthor
 * @param bodyIncludes
 * @param comment
 * @returns
 */
function findCommentPredicate(
  commentAuthor: string,
  bodyIncludes: string,
  comment: Comment
): boolean {
  return (
    (commentAuthor && comment.user
      ? comment.user.login === commentAuthor
      : true) &&
    (bodyIncludes && comment.body ? comment.body.includes(bodyIncludes) : true)
  );
}



const cloudflarePagesDeploymentStatusCommentTemplate = (
  projectName: string,
  commit: string,
  url: string,
  aliasUrl: string,
  textReplacementMap: Record<string, string>,
  titleReplacement: string
) => {
  return `## &nbsp;<a href="https://pages.dev"><img alt="Cloudflare Pages" src="https://user-images.githubusercontent.com/23264/106598434-9e719e00-654f-11eb-9e59-6167043cfa01.png" width="16"></a> &nbsp;${titleReplacement || 'Cloudflare Pages Deployment'}

| ${textReplacementMap.latestCommit.trim() || 'Latest commit'} | ${commit} |
|:--------------|:----------|
| **${textReplacementMap.projectName.trim() || 'Project Name'}** | ${projectName} |
| **${textReplacementMap.status.trim() || 'Status'}** | ${textReplacementMap.deployStatusSuccess.trim() || '✅  Deploy successful!'} |
| **${textReplacementMap.previewUrl.trim() || 'Preview URL'}** | ${url} |
| **${textReplacementMap.branchPreviewUrl.trim() || 'Branch Preview URL'}** | ${aliasUrl} |`;
};

/**
 * createOrUpdateDeploymentComment create or update a comment on a pull request
 * Code originally written by peter-evans from [peter-evans/create-or-update-comment: A GitHub action to create or update an issue or pull request comment](https://github.com/peter-evans/create-or-update-comment)
 * @param octokit Octokit instance
 * @param ctx GitHub context
 * @param url preview URL to comment
 * @param aliasUrl branch preview URL to comment
 */
export async function createOrUpdateDeploymentComment(
  octokit: ReturnType<typeof getOctokit>,
  ctx: typeof context,
  projectName: string,
  url: string,
  aliasUrl: string,
  textReplacementMap: Record<string, string>,
  titleReplacement: string
) {
  const newComment = cloudflarePagesDeploymentStatusCommentTemplate(
    projectName,
    ctx.sha,
    url,
    aliasUrl,
    textReplacementMap, 
    titleReplacement,
  );

  const foundComment = await findComment(
    octokit,
    ctx,
    titleReplacement || 'Cloudflare Pages Deployment'
  );
  if (!foundComment) {
    await octokit.rest.issues.createComment({
      owner: ctx.repo.owner,
      repo: ctx.repo.repo,
      issue_number: ctx.issue.number,
      body: newComment,
    });
  } else {
    await octokit.rest.issues.updateComment({
      owner: ctx.repo.owner,
      repo: ctx.repo.repo,
      comment_id: foundComment.id,
      body: newComment,
    });
  }
}
