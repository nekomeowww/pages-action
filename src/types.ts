export interface Stage {
  name: string;
  started_on: null | string;
  ended_on: null | string;
  status: string;
}

export interface Deployment {
  id: string;
  short_id: string;
  project_id: string;
  project_name: string;
  environment: string;
  url: string;
  created_on: string;
  modified_on: string;
  latest_stage: Stage;
  deployment_trigger: {
    type: string;
    metadata: {
      branch: string;
      commit_hash: string;
      commit_message: string;
      commit_dirty: boolean;
    };
  };
  stages: Stage[];
  build_config: {
    build_command: null | string;
    destination_dir: null | string;
    root_dir: null | string;
    web_analytics_tag: null | string;
    web_analytics_token: null | string;
    fast_builds: boolean;
  };
  env_vars: unknown;
  kv_namespaces: Record<string, { namespace_id: string }>;
  aliases: null | string[];
  is_skipped: boolean;
  production_branch: string;
}
