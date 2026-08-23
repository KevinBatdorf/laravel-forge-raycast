# Laravel Forge Changelog

## [Fix] - {PR_MERGE_DATE}
- Show active deployments again in the menu bar: the Forge API reports "Deploying" while the extension compared against lowercase "deploying"
- Deployment questions in AI Chat read the site's latest deployment, so a failed deploy is still reported after it ends
- Deploying, restarting and rebooting now need an exact site or server name, or the id from list-sites: a partial name is refused with the candidates and their servers, since a site name can repeat on another server
- Deployment status covers Forge's whole status list: a deploy waiting at pending and a build that broke on failed-build were reported as neither deploying nor failed
- The site list reports the latest deployment's outcome, which Forge leaves blank on the site itself once a deploy has ended
- Services offer only the actions Forge accepts: there is no start for any of them, reload is php-only, stop is nginx, mysql and postgres, and postgres is now on the list

## [AI Tools] - 2026-08-20
- Ask Laravel Forge from AI Chat: what is deploying, why a deploy failed, a site's Nginx config or logs, whether a site is up
- Deploying a site, restarting a service and rebooting a server are AI tools too, each asking to confirm first and listing the sites it affects

## [Forge API v2] - 2026-08-18
- Move every request to the Forge API v2, which replaces v1 on August 31, 2026
- Servers are now listed per organization, across all organizations a token can see
- Asks for a new API token, since v2 tokens are scoped — see the README for which scopes to tick
- Add site logs, server events, and start/stop alongside reboot for services
- Show the last deployment's outcome on the deploy row
- Update dependencies to Raycast's current stack

## [Fix] - 2023-05-12
- Fixes bug in displaying the ssh:// protocol string
## [Fix] - 2023-05-04

- Fixes a bug in the launch command invocation.

## [Complete Rewrite] - 2023-04-17
- Rewrite from scratch using modern Raycast features
- Better caching with predictive pre-fetching
- Passive deployment checking via BG command
- Dynamic activity icons
- Trigger command from anywhere with arguments
- Shows system notification when deploy starts
- Add view into recent deployments

## [Cache optimization] - 2022-12-29
- Update initial view to show cached data immediately

## [Per-site SSH Command] - 2022-04-20
- Add “Open SSH connection” command to sites

## [Better search and updated UI] - 2022-04-02
- Update Raycast deprecated components
- Add new transition and error views
- Add server search by site and site alias
- Add positional breadcrumbs to show server/site relationship
- Various type improvements and code tweaks
