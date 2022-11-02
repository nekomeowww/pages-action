import { getInput, setOutput, setFailed, debug } from "@actions/core";
import { context, getOctokit } from "@actions/github";
import shellac from "shellac";
import { fetch } from "undici";
import { createOrUpdateDeploymentComment } from "./comments";
import { Deployment } from "./types";
import yaml from 'js-yaml'

try {
  debug(JSON.stringify(context))
  console.log(JSON.stringify(context))

  const apiToken = getInput("apiToken", { required: true });
  const accountId = getInput("accountId", { required: true });
  const projectName = getInput("projectName", { required: true });
  const directory = getInput("directory", { required: true });
  const gitHubToken = getInput("gitHubToken", { required: true });
  const branch = getInput("branch", { required: false });
  const skipGitHubEnvironment = getInput("skipGitHubEnvironment", {required: false}) === 'true';
  const githubEnvirnmentName = getInput("githubEnvirnmentName", {required: false}) || '';
  const commentTextReplacement = getInput("commentTextReplacement", {required: false}) || '';
  const commentTitleReplacement = getInput("commentTitleReplacement", {required: false}) || 'Cloudflare Pages Deployment';

  const octokit = getOctokit(gitHubToken);

  const createPagesDeployment = async () => {
    // TODO: Replace this with an API call to wrangler so we can get back a full deployment response object
    await shellac`
    $ export CLOUDFLARE_API_TOKEN="${apiToken}"
    if ${accountId} {
      $ export CLOUDFLARE_ACCOUNT_ID="${accountId}"
    }
  
    $$ npx wrangler@2 pages publish "${directory}" --project-name="${projectName}" --branch="${branch}"
    `;

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${projectName}/deployments`,
      { headers: { Authorization: `Bearer ${apiToken}` } }
    );
    const {
      result: [deployment],
    } = (await response.json()) as { result: Deployment[] };

    return deployment;
  };

  const createGitHubDeployment = async () => {
    const deployment = await octokit.rest.repos.createDeployment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      ref: context.ref,
      auto_merge: false,
      description: "Cloudflare Pages Deployments",
      required_contexts: [],
    });

    if (deployment.status === 201) {
      return deployment.data;
    }
  };

  const createGitHubDeploymentStatus = async ({
    id,
    url,
    environmentName,
    productionEnvironment,
  }: {
    id: number;
    url: string;
    environmentName: string;
    productionEnvironment: boolean;
  }) => {
    await octokit.rest.repos.createDeploymentStatus({
      owner: context.repo.owner,
      repo: context.repo.repo,
      deployment_id: id,
      // @ts-ignore
      environment: environmentName,
      environment_url: url,
      production_environment: productionEnvironment,
      log_url: `https://dash.cloudflare.com/${accountId}/pages/view/${projectName}/${id}`,
      description: "Cloudflare Pages",
      state: "success",
    });
  };

  (async () => {
    let gitHubDeployment;
    if (!skipGitHubEnvironment) {
      gitHubDeployment = await createGitHubDeployment();
    }

    const pagesDeployment = await createPagesDeployment();

    const deploymentUrl = pagesDeployment.url;
    const deploymentAliasUrl = pagesDeployment.aliases?.[0] || '';

    setOutput("id", pagesDeployment.id);
    setOutput("url", deploymentUrl);
    setOutput("alias_url", deploymentAliasUrl);
    setOutput("environment", pagesDeployment.environment);

    await createOrUpdateDeploymentComment(octokit, context, projectName, deploymentUrl, deploymentAliasUrl, yaml.load(commentTextReplacement) as Record<string, string>, commentTitleReplacement);

    const url = new URL(pagesDeployment.url);
    const productionEnvironment = pagesDeployment.environment === "production";
    const environmentName = githubEnvirnmentName !== '' 
      ? githubEnvirnmentName : 
        productionEnvironment
        ? "Production"
        : `Preview (${url.host.split(".")[0]})`;

    if (gitHubDeployment) {
      await createGitHubDeploymentStatus({
        id: gitHubDeployment.id,
        url: pagesDeployment.url,
        environmentName,
        productionEnvironment,
      });
    }
  })();
} catch (thrown) {
  setFailed(thrown.message);
}
