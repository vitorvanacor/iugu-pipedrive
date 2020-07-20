// Load env variables from .env
require("dotenv").config();
// Node modules
const express = require("express");
const axios = require("axios");

// Constants
const { PORT, NODE_ENV, API_TOKEN, AUTH_TOKEN } = process.env;

// Express config
const app = express();
if (NODE_ENV === "production") {
  app.set("trust proxy", 1); // trust first proxy
}

// Middlewares
app.use(express.urlencoded({ extended: true }));

app.use(function printReq(req, res, next) {
  console.log(`<-- ${req.method} ${req.path}
Body: ${JSON.stringify(req.body, null, 2)}
Auth: ${req.header("Authorization")}`);
  next();
});

app.post("/", function validateReq(req, res, next) {
  if (req.headers.authorization !== AUTH_TOKEN) {
    return res.status(401).send(`Wrong Auth: ${req.headers.authorization}`);
  }
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
  next();
});

// Routes
app.post("/", async function (req, res) {
  try {
    const { customer_name, customer_email } = req.body.data;
    const response = await axios.post(
      "https://api.pipedrive.com/v1/persons?api_token=" + API_TOKEN,
      {
        name: customer_name,
        email: customer_email,
      }
    );
    const { data, status } = response;
    return res.status(status).send(data);
  } catch (err) {
    if (err.response) {
      const { status, data } = err.response;
      return res.status(status).send(data);
    } else if (err.request) {
      return res.status(500).send("Pipedrive did not respond");
    } else {
      return res
        .status(500)
        .send(`Error sending req to pipedrive: ${err.message}`);
    }
  }
});

app.get("/", function (req, res) {
  res.send(`<pre>Iugu-Pipedrive integration
Make a POST with content-type application/x-www-form-urlencoded with (ex.):
  event: subscription.created
  data[customer_name]: John Doe
  data[customer_email]: johndoe@email.com
Your request:
  Query: ${JSON.stringify(req.query, null, 2)}
  Body: ${JSON.stringify(req.body, null, 2)}
  Params: ${JSON.stringify(req.params, null, 2)}
</pre>`);
});

app.get("/health", function (req, res) {
  res.status(200).send("OK");
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
