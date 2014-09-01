var Capsule = require('capsule-crm');
var capsule = Capsule.createConnection(process.env.CAPSULE_USER, process.env.CAPSULE_TOKEN);

var Slack = require('node-slack');
var slack = new Slack(process.env.SLACK_DOMAIN,process.env.SLACK_TOKEN);

var Redis = require("redis"),
    redis = Redis.createClient();

var async = require("async");

function saveOpp(opp, callback) {
  redis.set(opp.id, JSON.stringify(opp), callback);
}

function slackIt(text, callback) {
  // callback();
  slack.send({
    text: text,
    channel: '#general',
    username: 'CapsuleCRM'
  }, callback);
}
function processOpportunity(opp, callback) {
  redis.get(opp.id, function (err, reply) {
    if (reply) {
      // existing opportunity
      var oppJSON = JSON.parse(reply);
      // test if the
      if (oppJSON.milestoneId != opp.milestoneId) {
        saveOpp(opp, function () {
          capsule.partyById(opp.partyId, function (err, party) {
            slackIt(text = "Opportunity "+opp.name+" for "+party.organisation.name+" has been updated to milestone: "+milestone+". Link: <https://"+process.env.CAPSULE_USER+".capsulecrm.com/opportunity/"+opp.id+">", callback);
          });
        });
      } else {
        callback();
      }
    } else {
      // new opportunity
      console.log("Adding opportunity");
      saveOpp(opp, function (err, results) {
        capsule.partyById(opp.partyId, function (err, party) {
          slackIt(text = "A new opportunity "+opp.name+" for "+party.organisation.name+" has been added! Link: <https://"+process.env.CAPSULE_USER+".capsulecrm.com/opportunity/"+opp.id+">", callback);
        });
      });
    }
  });
}




function poll() {
  capsule.opportunity( function (err, data) {

    async.each(data.opportunities.opportunity, processOpportunity, function (err) {
      if (err) {
        console.error(err);
      } else {
        console.log("Completed");

      }
      redis.end();
    });
  });
}




poll();