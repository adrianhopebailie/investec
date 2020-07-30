# Investec Open Banking CLI

An interactive CLI application for communicating with the
[Investec Open Banking APIs](https://developer.investec.com/programmable-banking/#open-api).

Built with [Deno](https://deno.land/).

## Install

Assuming you already have deno [installed](https://deno.land/#installation).

```sh
deno install --allow-net=openapi.investec.com --allow-env https://raw.githubusercontent.com/adrianhopebailie/investec/master/investec.ts
```

## Usage

To use the application you'll need your client id and client secret from
Investec.

1.  Login to Investec Online.
2.  Navigate to the Programmable Banking landing page.
3.  Select the Open API tab.
4.  Select the Enroll button.

To run the application simply run:

```sh
$ investec
```

> If that doesn't work it's possible that your Deno `bin` folder is not in 
> your path (see the error that would have been logged when you did the install).
> Make sure you have something like `export PATH=$HOME/.deno/bin:$PATH` in your
> shell config.


You can type `help` to get a list of available commands or `quit` to... quit.

### Login

The application will try to create an authenticated session when running any
command if one doesn't already exist. However you can explicitly login using the
`login` command.

The provided credentials will be kept in memory as long as the application is
running.

To skip typing in the login credentials these can be provided as environment
variables called `INVESTEC_CLIENT_ID` and `INVESTEC_CLIENT_SECRET`.

```sh
$ INVESTEC_CLIENT_ID=uytfqwed76r5quwdtfo86twef INVESTEC_CLIENT_SECRET=98uy978y23ry8 investec
```

### Accounts

Using the `accounts` or `accts` command will list your accounts and prompt you
to select an account that will be used for further operations such as
transaction and balance enquiries. You can skip setting a selected account by
simply hitting ⏎ (Enter).

### Transactions

The `transactions` and `txs` command will get a list of transactions for the
currently selected account and prompt to select an account if one hasn't already
been selected.

### Balance

The `balance` and `bal` command will get the current balance for the currently
selected account and prompt to select an account if one hasn't already been
selected.

## TODO

- [ ] Auto-fetch balances when getting account list
- [ ] Better management of credential state (secure storage?)
- [ ] Use currency from balance query for tx list
