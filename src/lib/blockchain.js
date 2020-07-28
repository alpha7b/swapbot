const EventEmitter = require('events').EventEmitter;
const Web3 = require("web3");
const BigNumber = require("bignumber.js");
const Updater = require("./updater");


function initWeb3(config) {
    var provider;
    switch (config.providerType) {
        case "http":
            provider = new Web3.providers.HttpProvider(config.providerPath)
            break;
        case "websocket":
            provider = new Web3.providers.WebsocketProvider(config.providerPath)
            break;
        case "ipc":
            provider = new Web3.providers.IpcProvider(config.providerPath, require('net'))
            break;
        default:
            provider = config.providerPath;
            break;
    }
    return new Web3(provider)
}


class BlockChain extends EventEmitter {
    constructor(options) {
        super();
        this.options = options;
        this.web3 = initWeb3(options);
        this.token = new this.web3.eth.Contract(options.tokenAbi, options.tokenAddress)
        this.exchange = new this.web3.eth.Contract(options.exchangeAbi, options.exchangeAddress)
        this.account = this.web3.eth.accounts.privateKeyToAccount(options.privateKey);
        Updater.setOptions(options, this.web3, this);
    }

    async getBalanceOf(address) {
        var balance = {};
        balance.fsn = new BigNumber(this.web3.utils.numberToHex(await this.web3.eth.getBalance(address)))
        balance.token = new BigNumber(this.web3.utils.numberToHex(await this.token.methods.balanceOf(address).call()));
        return balance;
    }

    async getBalance() {
        return this.getBalanceOf(this.account.address);
    }

    async getExchangeBalance() {
        return this.getBalanceOf(this.options.exchangeAddress);
    }

    async sendTx(tx) {
        var signedTx = await this.account.signTransaction(tx);
        return this.web3.eth.sendSignedTransaction(signedTx.rawTransaction)
            .then(receipt => {
                return { hash: receipt.transactionHash, status: true };
            }).catch((err) => {
                return { hash: signedTx.transactionHash, status: false }
            })
    }

    async buyToken(fsn_amount, min_tokens, deadline) {
        var data = this.exchange.methods.ethToTokenSwapInput(min_tokens, deadline).encodeABI()
        var gas = 120000;
        var tx = {
            data: data,
            to: this.options.exchangeAddress,
            value: "0x" + fsn_amount.toString(16),
            gas: gas,
            gasPrice: this.web3.utils.toHex(this.web3.utils.toWei(this.options.gasPrice, 'gwei')),
            chainId: this.options.chainId
        }
        return this.sendTx(tx);
    }

    async sellToken(token_amount, min_eth, deadline) {
        var data = this.exchange.methods.tokenToEthSwapInput(token_amount, min_eth, deadline).encodeABI();
        var gas = 150000;
        var tx = {
            data: data,
            to: this.options.exchangeAddress,
            value: "0",
            gas: gas,
            gasPrice: this.web3.utils.toHex(this.web3.utils.toWei(this.options.gasPrice, 'gwei')),
            chainId: this.options.chainId
        }
        return this.sendTx(tx);
    }

    async init() {
        var bc = this;
        Updater.update(await bc.web3.eth.getBlockNumber());
        bc.web3.eth.subscribe('newBlockHeaders', function (err, block) {
            Updater.update(block.number);
        });
        return bc;
    }
}

module.exports = BlockChain;