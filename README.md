# Cloudflare Pages GitHub Action

A better version of Cloudflare Pages GitHub Action for creating Cloudflare Pages deployments with Monorepo and matrix build supported, using the new [Direct Upload](https://developers.cloudflare.com/pages/platform/direct-upload/) feature and [Wrangler](https://developers.cloudflare.com/pages/platform/direct-upload/#wrangler-cli) integration.



## Features

- Optionally create and update GitHub Environment
- Optional customizable GitHub Environment names
- Support to create and update on the same comment about the deploy status and preview links just the same as the Cloudflare app that integrates your GitHub account
- Automatically obtain the correct branch name when it's not specified
- Automatically obtain the correct commit SHA when action triggered by Pull Request
- Allowing to replace the texts and title of status comments with i18n or translation
- Support to build Monorepo or build with complex matrix strategy

## Usage

1. Create an API token in the Cloudflare dashboard with the "Cloudflare Pages — Edit" permission.
1. Add that API token as a secret to your GitHub repository, `CLOUDFLARE_API_TOKEN`.
1. Create a `.github/workflows/cloudflare-pages.yml` file in your repository:

   ```yml
   on: [push]

   jobs:
     publish:
       runs-on: ubuntu-latest
       permissions:
         contents: read
         deployments: write
       name: Publish to Cloudflare Pages
       steps:
         - name: Checkout
           uses: actions/checkout@v3

         # Run a build step here if your project requires

         - name: Publish to Cloudflare Pages
           uses: nekomeowww/pages-action@1
           with:
             apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
             accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
             projectName: YOUR_PROJECT_NAME
             directory: YOUR_ASSET_DIRECTORY
             gitHubToken: ${{ secrets.ACCESS_TOKEN }}
             branch: YOUR_BRANCH_NAME # Optional, defaults to current branch
             skipGithubEnvironment: true # Optional, whether to disable the use of GitHub Environment
             githubEnvirnmentName: YOUR_ENVIRONMENT_NAME # Optional
             commentTitleReplacement: YOUR_COMMENT_TITLE # Optional
             commentTextReplacement: YOUR_COMMENT_TEXT # Optional
   ```

1. Replace `YOUR_PROJECT_NAME` and `YOUR_ASSET_DIRECTORY` with the appropriate values to your Pages project.

### Get account ID

To find your account ID, log in to the Cloudflare dashboard > select your zone in Account Home > find your account ID in Overview under **API** on the right-side menu. If you have not added a zone, add one by selecting **Add site** . You can purchase a domain from [Cloudflare’s registrar](https://developers.cloudflare.com/registrar/). 

If you do not have a zone registered to your account, you can also get your account ID from the `pages.dev` URL. E.g: `https://dash.cloudflare.com/<ACCOUNT_ID>/pages`

### Generate an API Token

To generate an API token:
1. Log in to the Cloudflare dashboard.
2. Select My Profile from the dropdown menu of your user icon on the top right of your dashboard.
3. Select API Tokens > Create Token.
4. Under Custom Token, select Get started.
5. Name your API Token in the Token name field.
6. Under Permissions, select Account, Cloudflare Pages and Edit:
7. Select Continue to summary > Create Token.

More information can be found on [our guide for making Direct Upload deployments with continous integration](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/#use-github-actions).

### How to Monorepo

Native Cloudflare Pages deployment by the Cloudflare app on Github is not supporting to build and deploy monorepo by default, however, we can hack it a little bit with the Wrangler CLI as a workaround.

Let's say you have a GitHub repo that connects to Cloudflare Pages, and you may have multiple web apps in the same repo to be deployed together (which we call a monorepo), now you want to build and deploy these web apps to Cloudflare Pages together.

First, you would want to create the other projects on Cloudflare Pages by using Wrangler CLI manually, you can learn more about the `wrangler pages` command on [Commands · Cloudflare Workers docs](https://developers.cloudflare.com/workers/wrangler/commands/#project-create):

- `<Your project name>`: This is the name of your project, and also the subdomain of your project, such as `<Your project name>.pages.dev`
- `<The production branch of your project>`: This is the branch you want to set for production deployment, it means once the branch that deploys matches the branch you set here, then Cloudflare Pages will consider this deployment to be a Production deployment.

```shell
wrangler pages project create <Your project name> --production-branch <The production branch of your project>
```

Once it's done, you are gonna setup the matrix to deploy multiple apps in GitHub Actions workflow file, such as:

```yaml
name: Cloudflare Pages CI/CD

concurrency: cloudflare-pages-${{ github.ref }}

on: [push]

jobs:
	build:
		runs-on: ubuntu-latest
    strategy:
      matrix: ["app1", "app2"]
     
    # Example to setup the GitHub Environment with matrix, this is optional, you can remove this section if you don't want to use this feature
    environment:
      name: Dev Preview of neve-${{ matrix.package }}
      url: ${{ steps.outputurl.outputs.url }}
      
    steps:
      - name: Checkout the source code
        uses: actions/checkout@v3

      - name: Setup pnpm
        uses: pnpm/action-setup@v2

      - name: Setup Node.js 16.x
        uses: actions/setup-node@v3
        with:
          node-version: 16.x
          cache: pnpm

      - name: Build projects
        id: build
        run: |
        	pnpm install
          pnpm -F "${{ matrix.package }}" run build # use the pnpm -F short-hand to filter out the app we want to build

      - name: Deploy to Cloudflare Pages
        uses: nekomeowww/pages-action@main
        id: deploy
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: someorganizationprefix-${{ matrix.package }}
          directory: packages/${{ matrix.package }}/dist
          gitHubToken: ${{ secrets.ACCESS_TOKEN }}
          skipGithubEnvironment: true
```

### Specifying a branch

The branch name is used by Cloudflare Pages to determine if the deployment is production or preview. Read more about
[git branch build controls](https://developers.cloudflare.com/pages/platform/branch-build-controls/#branch-build-controls).

If you are in a Git workspace, Wrangler will automatically pull the branch information for you. You can override this
manually by adding the argument `branch: YOUR_BRANCH_NAME`.

### Replace comment texts

By specifying `commentTitleReplacement` and `commentTextReplacement`, you can replace the default comment texts in the scenario where you need to translate the texts with i18n.

```yaml
on: [push]

    jobs:
      publish:
        runs-on: ubuntu-latest
        permissions:
          contents: read
          deployments: write
        name: Publish to Cloudflare Pages
        steps:
        - name: Deploy to Cloudflare Pages
          uses: nekomeowww/pages-action@main
          id: deploy
          with:
            apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
            accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
            projectName: example-project
            directory: dist
            gitHubToken: ${{ secrets.ACCESS_TOKEN }}
            skipGithubEnvironment: true
            commentTitleReplacement: Cloudflare Pages 部署
            commentTextReplacement: |
              latestCommit: 最新提交
              projectName: 项目名称
              status: 状态
              deployStatusSuccess: 🚀 部署成功
              previewUrl: 预览链接
              branchPreviewUrl: 分支预览链接
```

### Comments

#### Showcases

![Cloudflare Pages Deploy Status Comment](https://raw.githubusercontent.com/nekomeowww/pages-action/main/docs/comment-showcase-1.png)

![Cloudflare Pages Deploy Status Comment](https://raw.githubusercontent.com/nekomeowww/pages-action/main/docs/comment-showcase-2.png)

## Inputs

The following inputs can be used as `step.with` keys:

> `Yaml` type is a string that is valid YAML. It will be parsed into a JSON object when action runs.
> ```yaml
> commentTextReplacement: |
>     latestCommit: Latest commit
>     projectName: Project name
> ```

| Name                      | Type                                                     | Required | Description                                                  |
| ------------------------- | -------------------------------------------------------- | -------- | ------------------------------------------------------------ |
| `apiToken`                | String                                                   | `true`   | Cloudflare API Token with edit permission of Cloudflare Pages included |
| `accountId`               | String                                                   | `true`   | Cloudflare Account ID. Generally, the account ID is included in the link `https://dash.cloudflare.com/<ACCOUNT_ID>/pages` when you access your Cloudflare Pages project |
| `projectName`             | String                                                   | `true`   | The name of the Pages project to upload to                   |
| `directory`               | String                                                   | `true`   | The directory of static assets to upload                     |
| `gitHubToken`             | String                                                   | `true`   | The GitHub Token used to create GitHub Environment and create/update comments |
| `branch`                  | String                                                   | `false`  | The name of the branch you want to deploy to                 |
| `skipGithubEnvironment`   | Boolean                                                  | `false`  | Whether to disable the use of Github Environments. It's useful when you need to specify your Environment name or deploying with a complex matrix build |
| `githubEnvirnmentName`    | String                                                   | `false`  | Specifies the name of GitHub Environments, defaults to `Production` when deploying to the production branch (specified in wrangler or Cloudflare Pages dashboard), or `Preview ${random hash of deploy}` |
| `commentTitleReplacement` | String                                                   | `false`  | Replace title for comment title, defaults to `Cloudflare Pages Deployment` |
| `commentTextReplacement`  | [CommentTextReplacement](#inputs-commenttextreplacement) | `false`  | Replace texts for comment texts.                             |

#### Inputs CommentTextReplacement

| Name                  | Type   | Description                                                  |
| --------------------- | ------ | ------------------------------------------------------------ |
| `latestCommit`        | String | Text of the comment table column `Latest commit`, defaults to `Latest commit` |
| `projectName`         | String | Text of the comment table column `Project name`, defaults to `Project name` |
| `status`              | String | Text of the comment table column `Status`, defaults to `Status` |
| `deployStatusSuccess` | String | Text of the comment table column `✅  Deploy successful!`, defaults to `✅  Deploy successful!` |
| `previewUrl`          | String | Text of the comment table column `Preview URL`, defaults to `Preview URL` |
| `branchPreviewUrl`    | String | Text of the comment table coumn `Branch Preview URL`, defaults to `Branch Preview URL` |

## Outputs

| Name          | Description                                  |
| ------------- | ---------------------------------------------|
| `id`          | The ID of the pages deployment               |
| `url`         | The URL of the pages deployment              |
| `alias_url`   | The URL of the alias of the pages deployment |
| `environment` | The environment that was deployed to         |
