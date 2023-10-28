import fetch from "node-fetch";
import "dotenv/config";
import Projects, { fundersSchema } from "./projects/projects.js";
import User from "./theusers/theuser.js";
import { json } from "express";
// set some important variables
const { CLIENT_ID, APP_SECRET, MERCHANT_ID } = process.env;
const base = "https://api-m.sandbox.paypal.com";

// call the create order method
export async function createOrder(amount, projectid) {
  const accessToken = await generateAccessToken();
  const url = `${base}/v2/checkout/orders`;
  const response = await fetch(url, {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: amount,
          },
          payee: {
            merchant_id: MERCHANT_ID,
          },
        },
      ],
      projectid,
    }),
  });
  return handleResponse(response);
}

// capture payment for an order
export async function capturePayment(orderId, projectid, amount, email) {
  const accessToken = await generateAccessToken();
  const url = `${base}/v2/checkout/orders/${orderId}/capture`;
  const response = await fetch(url, {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const project = await Projects.findOne({ _id: projectid });
  if (project.collected + Number(amount) > project.funds) {
    return json("Can not add this amount it exceeds the total required funds");
  }
  for (let pe of project.funders) {
    if (pe["email"] === email) {
      project.collected += Number(amount);
      pe["amount"] += Number(amount);
      await project.save();
      return handleResponse(response);
    }
  }
  project.collected += Number(amount);
  const funder = {
    email: email,
    amount: amount,
  };
  project.funders.push(funder);
  await project.save();
  return handleResponse(response);
}

// generate access token
export async function generateAccessToken() {
  const auth = Buffer.from(CLIENT_ID + ":" + APP_SECRET).toString("base64");
  const response = await fetch(`${base}/v1/oauth2/token`, {
    method: "post",
    body: "grant_type=client_credentials",
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });
  const jsonData = await handleResponse(response);
  return jsonData.access_token;
}

// generate client token
export async function generateClientToken() {
  const accessToken = await generateAccessToken();
  const response = await fetch(`${base}/v1/identity/generate-token`, {
    method: "post",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Accept-Language": "en_US",
      "Content-Type": "application/json",
    },
  });
  console.log("response", response.status);
  const jsonData = await handleResponse(response);
  return jsonData.client_token;
}

async function handleResponse(response) {
  if (response.status === 200 || response.status === 201) {
    return response.json();
  }

  const errorMessage = await response.text();
  console.error("Error Response:", errorMessage); // Log the error message
  throw new Error(errorMessage);
}
