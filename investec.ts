import * as colors from "https://deno.land/std/fmt/colors.ts";
import { Table } from "https://deno.land/x/tbl/mod.ts";

const BASE_URL = "https://openapi.investec.com";
const INVESTEC_CLIENT_ID = "INVESTEC_CLIENT_ID";
const INVESTEC_CLIENT_SECRET = "INVESTEC_CLIENT_SECRET";
const ICON = "💸";
const LOCKED = "🔐";
const UNLOCKED = "🔓";
const KEY = "🔑";
const MAGNIFYING_GLASS = "🔍";

interface FetchAccessTokenResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  scope: "accounts";
}

interface Account {
  accountId: string;
  accountNumber: string;
  accountName: string;
  referenceName: string;
  productName: string;
}

interface Transaction {
  accountId: string;
  type: string;
  status: string;
  description: string;
  cardNumber: string;
  postingData: string;
  valueDate: string;
  actionDate: string;
  amount: number;
}

interface FetchAccountsResponse {
  data: {
    accounts: Account[];
  };
  links: {
    self: string;
  };
  meta: {
    totalPages: number;
  };
}

interface FetchAccountTransactionsResponse {
  data: {
    transactions: Transaction[];
  };
  links: {
    self: string;
  };
  meta: {
    totalPages: number;
  };
}

interface FetchAccountBalanceResponse {
  data: {
    accountId: string;
    currentBalance: number;
    availableBalance: number;
    currency: string;
  };
  links: {
    self: string;
  };
  meta: {
    totalPages: number;
  };
}

interface AccountRow {
  " ": string;
  "Account Name": string;
  "Account Number": string;
  "Product": string;
}

interface TransactionRow {
  "Date": string;
  "Status": string;
  "Description": string;
  "Card Number": string;
  "Amount": string;
}

async function readLineFromConsole(): Promise<string> {
  const buf = new Uint8Array(1024);
  const n = <number> await Deno.stdin.read(buf);
  return new TextDecoder().decode(buf.subarray(0, n)).trim();
}

async function getInput(message: string = ""): Promise<string> {
  await Deno.stdout.write(new TextEncoder().encode(message + ": "));
  return await readLineFromConsole();
}

function accountPrompt() {
  if (!state.selectedAccount) {
    return " ";
  }
  const accountNumber = maskAccountNumber(state.selectedAccount);
  return ` ${
    colors.green(accountNumber)
  }/${state.selectedAccount.accountName}/${
    colors.green(state.selectedAccount.productName)
  } `;
}

function maskAccountNumber(account: Account) {
  if (!state.isPrivate) return account.accountNumber;
  return account.accountNumber.slice(0, 2) + "xxxxxx" +
    account.accountNumber.slice(-4);
}

function maskAmount(amount: string) {
  return amount.slice(0, 2) + "******" + amount.slice(-4);
}

const state = {
  clientId: Deno.env.get(INVESTEC_CLIENT_ID),
  clientSecret: Deno.env.get(INVESTEC_CLIENT_SECRET),
  isPrivate: true,
  accessToken: <string | undefined> undefined,
  accessTokenExpiry: -1,
  selectedAccount: <Account | undefined> undefined,
  get isLoggedIn(): boolean {
    return this.accessToken !== undefined &&
      (this.accessTokenExpiry > Date.now());
  },
};

async function prompt(): Promise<string[]> {
  const lock = (state.isLoggedIn) ? LOCKED : UNLOCKED;
  const isPrivate = (state.isPrivate) ? "" : " " + MAGNIFYING_GLASS;
  await Deno.stdout.write(
    new TextEncoder().encode(
      `${ICON}${accountPrompt()}${lock}${isPrivate} > `,
    ),
  );
  return (await readLineFromConsole()).split(" ");
}

function basicAuthToken() {
  return btoa(`${state.clientId}:${state.clientSecret}`);
}

async function fetchAccessToken(
  authToken: string,
): Promise<FetchAccessTokenResponse | undefined> {
  console.log("Logging in...");

  const res = await fetch(BASE_URL + "/identity/v2/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${authToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=accounts",
  });

  if (res.ok) {
    return await res.json() as FetchAccessTokenResponse;
  } else {
    return undefined;
  }
}

async function fetchAccounts(): Promise<FetchAccountsResponse | undefined> {
  if (!state.isLoggedIn) {
    await login();
  }

  const res = await fetch(BASE_URL + "/za/pb/v1/accounts", {
    headers: {
      Authorization: `Bearer ${state.accessToken}`,
      "Accept": "application/json",
    },
  });

  if (res.ok) {
    return await res.json() as FetchAccountsResponse;
  } else {
    return undefined;
  }
}

async function fetchAccountTransactions(
  accountId: string,
): Promise<FetchAccountTransactionsResponse | undefined> {
  if (!state.isLoggedIn) {
    await login();
  }
  const res = await fetch(
    BASE_URL + `/za/pb/v1/accounts/${accountId}/transactions`,
    {
      headers: {
        Authorization: `Bearer ${state.accessToken}`,
        "Accept": "application/json",
      },
    },
  );
  if (res.ok) {
    return await res.json() as FetchAccountTransactionsResponse;
  } else {
    return undefined;
  }
}

async function fetchAccountBalance(
  accountId: string,
): Promise<FetchAccountBalanceResponse | undefined> {
  if (!state.isLoggedIn) {
    await login();
  }
  const res = await fetch(
    BASE_URL + `/za/pb/v1/accounts/${accountId}/balance`,
    {
      headers: {
        Authorization: `Bearer ${state.accessToken}`,
        "Accept": "application/json",
      },
    },
  );
  if (res.ok) {
    return await res.json() as FetchAccountBalanceResponse;
  } else {
    return undefined;
  }
}

async function login(resetClientCredentials = false) {
  if (
    state.clientId == undefined ||
    state.clientSecret == undefined ||
    resetClientCredentials
  ) {
    //TODO: If resetClientCredentials and env vars are set then fallback to these
    state.clientId = await getInput(`Enter Client ID ${KEY} `);
    state.clientSecret = await getInput(`Enter Client Secret ${KEY} `);
  }
  const tokenResponse = await fetchAccessToken(
    basicAuthToken(),
  );
  if (tokenResponse !== undefined) {
    state.accessToken = tokenResponse.access_token;
    state.accessTokenExpiry = (tokenResponse.expires_in * 1000) + Date.now();
    console.log("Successfully logged in");
  } else {
    console.log("Error logging in");
  }
}

async function logout() {
  state.accessToken = undefined;
  state.accessTokenExpiry = -1;
}

async function getAccounts() {
  if (!state.isLoggedIn) {
    await login();
  }

  const result = await fetchAccounts();
  if (result) {
    const accounts = result.data.accounts;
    const accountRows: AccountRow[] = [];
    accounts.map((account, i) => {
      accountRows.push({
        " ": i.toString(),
        "Account Number": maskAccountNumber(account),
        "Account Name": account.accountName,
        "Product": account.productName,
      });
    });
    const table = new Table({
      header: [
        " ",
        "Account Number",
        "Account Name",
        "Product",
      ],
    });
    table.fromObjects(accountRows);
    console.log(table.toString());

    if (accountRows.length === 0) {
      state.selectedAccount = undefined;
    }

    if (accountRows.length === 1) {
      state.selectedAccount = accounts[1];
    }

    let selectedAccountIndex = NaN;
    while (isNaN(selectedAccountIndex)) {
      const selection = await getInput(
        `Select account (0 - ${accounts.length - 1}) or ENTER to cancel`,
      );
      if (selection === "") {
        state.selectedAccount = undefined;
        return;
      } else {
        selectedAccountIndex = Number.parseInt(selection);
        if (
          isNaN(selectedAccountIndex) || selectedAccountIndex < 0 ||
          selectedAccountIndex >= accounts.length
        ) {
          console.log(
            `Invalid selection. Please provide a number between 0 and ${accounts
              .length - 1}`,
          );
        } else {
          state.selectedAccount = accounts[selectedAccountIndex];
        }
      }
    }
  } else {
    console.log(colors.red("Error fetching accounts"));
  }
}

async function getTransactionsForSelectedAccount() {
  if (!state.isLoggedIn) {
    await login();
  }

  if (!state.selectedAccount) {
    await getAccounts();
    if (!state.selectedAccount) {
      console.log(colors.red(`No account selected`));
      return;
    }
  }

  const result = await fetchAccountTransactions(
    state.selectedAccount.accountId,
  );
  if (result) {
    const txs = result.data.transactions;
    const txRows: TransactionRow[] = [];
    txs.map((tx, i) => {
      txRows.push({
        "Date": tx.valueDate,
        "Description": tx.description,
        "Amount": "ZAR" +
          ((tx.type === "DEBIT" ? "-" : "+") +
            (state.isPrivate ? "xxxxx.xx" : tx.amount.toFixed(2))).padStart(
              12,
              " ",
            ), // TODO: Get currency from balance request
        "Status": tx.status,
        "Card Number": tx.cardNumber,
      });
    });
    const table = new Table({
      header: [
        "Date",
        "Description",
        "Amount",
        "Status",
        "Card Number",
        "Value Date",
      ],
    });
    table.fromObjects(txRows);
    console.log(table.toString());
  } else {
    console.log("Error fetching accounts");
  }
}

async function getBalanceForSelectedAccount() {
  if (!state.isLoggedIn) {
    await login();
  }

  if (!state.selectedAccount) {
    await getAccounts();
    if (!state.selectedAccount) {
      console.log(colors.red(`No account selected`));
      return;
    }
  }

  const balance = await fetchAccountBalance(
    state.selectedAccount.accountId,
  );
  if (balance) {
    console.log(
      `Current Balance: ${balance.data.currency} ${balance.data.currentBalance}`,
    );
    console.log(
      `Available Balance: ${balance.data.currency} ${balance.data.availableBalance}`,
    );
  } else {
    console.log("Error fetching balance");
  }
}

async function help(error?: string) {
  console.log(`


  ${colors.yellow("login [--reset]")}
      | Login to Open Banking using a client id and secret (required before executing any other command)
      | (Looks for INVESTEC_CLIENT_ID and INVESTEC_CLIENT_SECRET from the env and prompts for them if they are not found)
      |
      | --reset 
      |          Clear the client id and secret in memory and prompt for new credentials

  ${colors.yellow("private | pvt")}
      | Toggle private mode.
      | (When private mode is on account numbers and amounts are masked)

  ${colors.yellow("accounts | accts")}
      | List accounts.
      | (Optionally select an account for further operations)

  ${colors.yellow("transactions | txs")}
      | List transactions for the currently selected account.

  ${colors.yellow("balance | bal")}
      | Get balances for the currently selected account.

  ${colors.yellow("help")}
      | Displays this help information.

  ${colors.yellow("quit")}
      | Quit the application.

`.trim());
  if (error) {
    console.log(colors.red(error));
  }
}

console.log(
  `
${colors.yellow("Investec Open Banking REPL")}
Copyright 2020 - Adrian Hope-Bailie
Licensed under an Apache 2.0 license

Type 'help' for a list of available commands
`,
);

while (true) {
  const input = await prompt();
  const command = input[0];
  switch (command) {
    case "login":
      const reset = input[1] !== undefined && input[1] === "--reset";
      await login(reset);
      break;

    case "logout":
      await logout();
      break;

    case "private":
    case "pvt":
      state.isPrivate = !state.isPrivate;
      break;

    case "accounts":
    case "accts":
      await getAccounts();
      break;

    case "transactions":
    case "txs":
      await getTransactionsForSelectedAccount();
      break;

    case "balance":
    case "bal":
      await getBalanceForSelectedAccount();
      break;

    case "quit":
      Deno.exit(0);

    case "help":
      await help();
      break;

    case "":
      break;

    default:
      if (command !== undefined) {
        console.log(`${colors.red(command)} is not a valid command\n`);
      }
      await help();
      break;
  }
}
