const Config = require("../config");
const BlockChain = require("./lib/blockchain");

const BigNumber = require("bignumber.js");

const Big0 = new BigNumber(0);
const BIG_ONE_UTIL = new BigNumber(1000000000000000000);

var blockchain = new BlockChain(Config.blockchain);

async function calcBuyNumber(data) {
    var exchangeBalance = await blockchain.getExchangeBalance();
    var t = await blockchain.getBalance();
    var rate = exchangeBalance.fsn.dividedBy(exchangeBalance.token).toNumber();
    var top = Math.floor(250 * rate / Config.charge);
    var total = data.total.dividedBy(BIG_ONE_UTIL).decimalPlaces(0).toNumber();
    var balance = await blockchain.getBalance();
    var canUseBalance = balance.fsn.dividedBy(BIG_ONE_UTIL).decimalPlaces(0).toNumber() - 1;// some fsn for gas
    var maxUse = top - total;
    if (maxUse > canUseBalance) {
        maxUse = canUseBalance;
    }
    if (maxUse <= 0) {
        return Big0;
    }
    var profit = 0;
    var useNumber = 0;

    // clac max profit
    for (let number = 1; number < maxUse; number++) {
        var tempProfit = number / (number + total) * rate * 250 - number * Config.charge;
        if (tempProfit > profit) {
            useNumber = number;
            profit = tempProfit;
        }
    }
    if (profit <= 0) {
        return Big0
    }
    return BIG_ONE_UTIL.multipliedBy(useNumber);
}

async function buy(number, deadline) {
    var balance = await blockchain.getExchangeBalance();
    var rate = balance.fsn.plus(number).dividedBy(balance.token);
    var min_tokens = number.dividedBy(rate).multipliedBy(995).dividedBy(1000).decimalPlaces(0);  // more shill
    return blockchain.buyToken(number, min_tokens, deadline);
}

async function sell(number, deadline) {
    var balance = await blockchain.getExchangeBalance();
    var rate = balance.fsn.dividedBy(balance.token.plus(number));
    var min_eth = number.multipliedBy(rate.multipliedBy(1000).dividedBy(1005)).decimalPlaces(0); // more shill
    return blockchain.sellToken(number, min_eth, deadline);
}


async function handleBuy(data) {
    var buyNumber = calcBuyNumber(data);
    if (buyNumber.isGreaterThan(Big0)) {
        var deadline = data.cycle.blockTime + Config.delay
        console.log("buy", buyNumber.dividedBy(BIG_ONE_UTIL).toNumber(), deadline);
        buy(buyNumber, deadline).then(log => {
            console.log("buy", log.hash, log.status)
        })
    }
}

async function handleSell(data) {
    var balance = await blockchain.getBalance();
    if (balance.token.isGreaterThan(Big0)) {
        var deadline = data.cycle.blockTime + Config.delay
        console.log("sell", balance.token.dividedBy(BIG_ONE_UTIL).toNumber(), deadline)
        sell(balance.token, deadline).then(log => {
            console.log("sell", log.hash, log.status)
        })
    }
}

async function handleCycle(data) {
    if (data.cycle.index == 98) {
        await handleBuy(data);  // last block buy
    } else {
        console.log("handle sell");
        await handleSell(data);  // fast to sell any
    }
}

blockchain.on("cycle", data => {
    handleCycle(data);
})

blockchain.init();