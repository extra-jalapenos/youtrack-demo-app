
// See https://www.jetbrains.com/help/youtrack/devportal-apps/apps-reference-http-handlers.html
const {search} = require("@jetbrains/youtrack-scripting-api/search.js");
const dates = require("@jetbrains/youtrack-scripting-api/date-time.js");

exports.httpHandler = {
  endpoints: [
    {
      scope: 'user',
      method: 'GET',
      path: 'demo',
      handle: function handle(ctx) {
        ctx.response.json({test: true, scope: 'user', userName: ctx.user.name});
      }
    },
    {
      method: 'GET',
      path: 'demo',
      handle: function handle(ctx) {
        const {demoString1, demoString2} = ctx.globalStorage.extensionProperties;
        const testQueryParam = ctx.request.getParameter('test');
        const {name} = ctx.settings;

        ctx.response.json({
          test: true,
          scope: 'global',
          name,
          testQueryParam,
          val1: demoString1,
          val2: demoString2
        });
      }
    },
    {
      method: 'GET',
      path: 'worklogs',
      handle: function handle(ctx) {
        const queryString = ctx.request.getParameter('query');

        const to = new Date(new Date().setHours(0, 0, 0, 0)); // the end of last Sunday
        const from = new Date(new Date().setFullYear(to.getFullYear() - 1));
        const foundIssues = search(null, `work date: ${dates.format(from, "yyyy-MM-dd")} .. ${dates.format(to, "yyyy-MM-dd")}`);
        // Get a list of assignees from the Assignee field in the project,
        // get a list of work items for each of them, and calculate sum of durations
        // for the work items reported by each assignee:
        const workitems = [];
        foundIssues.forEach(issue => {
          if (issue.workItems.size === 0)
            return;
          issue.workItems.forEach(workitem => {
            workitems.push(workitem);
          });
        });

        ctx.response.json({
          worklogs: workitems,
          queryString: queryString
        });
      }
    },
    {
      method: 'POST',
      path: 'demo',
      handle: function handle(ctx) {
        const {name} = ctx.settings;
        const body = ctx.request.json();
        ctx.globalStorage.extensionProperties.demoString1 = body.val1;
        ctx.globalStorage.extensionProperties.demoString2 = body.val2;
        // eslint-disable-next-line no-console
        console.log('Updated storage', body);

        ctx.response.json({test: true, name, scope: 'global', method: 'POST', receiveBody: body});
      }
    }
  ]
};
