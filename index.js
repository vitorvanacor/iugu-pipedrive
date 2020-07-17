// Node modules
const express = require("express");
const axios = require("axios");
require("dotenv").config();

// Constants
const { PORT, NODE_ENV, API_TOKEN } = process.env;

// Express config
const app = express();
if (NODE_ENV === "production") {
  app.set("trust proxy", 1); // trust first proxy
}
app.use(express.json());
app.use(express.urlencoded());

function printReq(req) {
  console.log(`<-- ${req.method} ${req.path}
Query: ${JSON.stringify(req.query, null, 2)}
Body: ${JSON.stringify(req.body, null, 2)}
Params: ${JSON.stringify(req.params, null, 2)}`);
}

app.get("/", function (req, res) {
  printReq(req);
  res.send(`<pre>Iugu-Pipedrive integration
Make a POST with content-type application/x-www-form-urlencoded to with (ex.):
  event: subscription.created
  data[id]: 1757E1D7FD5E410A9C563024250015BF
  data[account_id]: 70CA234077134ED0BF2E0E46B0EDC36F
  data[customer_name]: John Doe
  data[customer_email]: johndoe@email.com
Your request:
  Query: ${JSON.stringify(req.query, null, 2)}
  Body: ${JSON.stringify(req.body, null, 2)}
  Params: ${JSON.stringify(req.params, null, 2)}
  </pre>`);
});

app.post("/", async function (req, res) {
  printReq(req);
  if (req.body.event !== "subscription.created") {
    return res.status(400).send("Event not supported:" + req.body.event);
  }
  if (!req.body.data) {
    return res.status(400).send("Missing body.data");
  }
  const { customer_name, customer_email } = req.body.data;
  if (!customer_name || !customer_email) {
    return res.status(400).send("Missing customer name or email");
  }
  let response;
  try {
    response = await axios.post(
      "https://api.pipedrive.com/v1/persons?api_token=" + API_TOKEN,
      {
        name: customer_name,
        email: customer_email,
      }
    );
  } catch (err) {
    if (err.response) {
      response = err.response;
    } else if (err.request) {
      response = { status: 500, data: "Pipedrive did not respond" };
    } else {
      response = {
        status: 500,
        data: "Error sending req to pipedrive: " + err.message,
      };
    }
  }
  const { data, status } = response;
  console.log(status, data);
  res.status(status).send(data);
});

// Ping pong for tests
app.get("/ping", function (req, res) {
  printReq(req);
  res.send("pong");
});

// Init
console.log("Initing server...");
const server = app.listen(PORT || 8080, function () {
  const { address, port } = server.address();
  console.log("Listening at http://%s:%s", address, port);
});

process.on("SIGINT", function onSigint() {
  process.exit();
});

process.on("SIGTERM", function onSigterm() {
  process.exit();
});
